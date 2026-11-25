import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import type { ExecutionContext } from "@nestjs/common";
import { AgentTokenGuard } from "../src/modules/agent/agent-token.guard";

function context(deviceId: string, token: string): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ params: { deviceId }, headers: { "x-agent-token": token } }) }),
  } as unknown as ExecutionContext;
}

test("accepts an active credential only for its bound device", async () => {
  const token = "pma_test_credential";
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const prisma = { agentCredential: { findUnique: async () => ({ tokenHash, deviceId: "device-a", revokedAt: null }) } };
  const guard = new AgentTokenGuard(prisma as never);
  assert.equal(await guard.canActivate(context("device-a", token)), true);
  await assert.rejects(guard.canActivate(context("device-b", token)), /Invalid agent credential/);
});

test("rejects a revoked or unknown agent credential", async () => {
  const token = "pma_test_credential";
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const revoked = { agentCredential: { findUnique: async () => ({ tokenHash, deviceId: "device-a", revokedAt: new Date() }) } };
  await assert.rejects(new AgentTokenGuard(revoked as never).canActivate(context("device-a", token)), /Invalid agent credential/);
  const absent = { agentCredential: { findUnique: async () => null } };
  await assert.rejects(new AgentTokenGuard(absent as never).canActivate(context("device-a", token)), /Invalid agent credential/);
});
