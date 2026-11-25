import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { AgentScanOutcome } from "@patch-management/shared";
import { AgentService } from "../src/modules/agent/agent.service";

const now = new Date();

function scan(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    protocolVersion: 1,
    scanId: "ce34c70d-c788-4c0f-8c25-1e0c8ac5f0c3",
    version: "agent-1.0.0",
    os: { name: "win32", version: "10.0.22631", architecture: "x64" },
    startedAt: new Date(now.getTime() - 60_000).toISOString(),
    completedAt: now.toISOString(),
    outcome: AgentScanOutcome.SUCCESS,
    updates: [{ updateId: "b748cdfe-e75f-4e66-a8db-e824c2cc1a08", title: "Windows security update", kbArticleIds: ["KB5035853"], categories: ["Security Updates"], rebootRequired: true }],
    ...overrides,
  };
}

function createPrismaMock(lastScanResult: unknown = null) {
  const calls = { statusUpsert: [] as unknown[], credentialCreate: [] as unknown[], credentialRevocations: [] as unknown[], deviceUpdate: [] as unknown[] };
  const prisma = {
    $transaction: async (operations: unknown[]) => Promise.all(operations as Promise<unknown>[]),
    agentStatus: {
      findMany: async () => [{ id: "agent-1", version: "agent-1.0.0", isConnected: true, lastHeartbeatAt: new Date(), lastScanAt: null, deviceId: "device-1", updatedAt: new Date(), device: { id: "device-1", hostname: "USER-PC-01", status: "ONLINE" } }],
      findUnique: async () => ({ lastScanResult }),
      upsert: async (args: unknown) => {
        calls.statusUpsert.push(args);
        return { id: "agent-1", deviceId: "device-1", version: "agent-1.0.0", isConnected: true, lastHeartbeatAt: new Date(), lastScanAt: now, device: { id: "device-1", hostname: "USER-PC-01", status: "ONLINE" } };
      },
    },
    agentCredential: {
      updateMany: async (args: unknown) => { calls.credentialRevocations.push(args); return { count: 1 }; },
      create: async (args: unknown) => { calls.credentialCreate.push(args); return { id: "credential-1" }; },
    },
    device: {
      findUnique: async () => ({ id: "device-1" }),
      update: async (args: unknown) => { calls.deviceUpdate.push(args); return { id: "device-1", status: "ONLINE" }; },
    },
  };
  return { prisma, calls };
}

test("issues a hashed, device-bound credential and revokes its predecessor", async () => {
  const { prisma, calls } = createPrismaMock();
  const result = await new AgentService(prisma as never).issueCredential("device-1");
  assert.match(result.token, /^pma_/);
  assert.equal(result.tokenHint, result.token.slice(-6));
  const revocation = calls.credentialRevocations[0] as { where: { deviceId: string; revokedAt: null } };
  assert.deepEqual(revocation.where, { deviceId: "device-1", revokedAt: null });
  const create = calls.credentialCreate[0] as { data: { deviceId: string; tokenHash: string; tokenHint: string } };
  assert.equal(create.data.deviceId, "device-1");
  assert.notEqual(create.data.tokenHash, result.token);
  assert.equal(create.data.tokenHash.length, 64);
});

test("stores a structured successful scan", async () => {
  const { prisma, calls } = createPrismaMock();
  const result = await new AgentService(prisma as never).recordScan("device-1", scan() as never);
  assert.equal(result.delivery, "STORED");
  const upsert = calls.statusUpsert[0] as { update: { lastScanResult: { scanId: string; outcome: AgentScanOutcome }; lastScanAt: Date } };
  assert.equal(upsert.update.lastScanResult.scanId, "ce34c70d-c788-4c0f-8c25-1e0c8ac5f0c3");
  assert.equal(upsert.update.lastScanResult.outcome, AgentScanOutcome.SUCCESS);
  assert.equal(upsert.update.lastScanAt.toISOString(), now.toISOString());
});

test("does not overwrite a repeated or stale scan", async () => {
  const repeated = scan();
  const duplicateMock = createPrismaMock({ scanId: repeated.scanId, completedAt: repeated.completedAt });
  const duplicate = await new AgentService(duplicateMock.prisma as never).recordScan("device-1", repeated as never);
  assert.equal(duplicate.delivery, "DUPLICATE");
  assert.equal(duplicateMock.calls.statusUpsert.length, 0);

  const staleMock = createPrismaMock({ scanId: "a9c5c21a-70bc-4983-8db5-72ff4e4a3569", completedAt: new Date(now.getTime() + 1_000).toISOString() });
  const stale = await new AgentService(staleMock.prisma as never).recordScan("device-1", repeated as never);
  assert.equal(stale.delivery, "IGNORED_STALE");
  assert.equal(staleMock.calls.statusUpsert.length, 0);
});

test("rejects invalid result combinations", async () => {
  const { prisma } = createPrismaMock();
  const service = new AgentService(prisma as never);
  await assert.rejects(service.recordScan("device-1", scan({ outcome: AgentScanOutcome.NO_UPDATES }) as never), /NO_UPDATES scans cannot include updates/);
  await assert.rejects(service.recordScan("device-1", scan({ outcome: AgentScanOutcome.ERROR, updates: [] }) as never), /ERROR scans require an error summary/);
});
