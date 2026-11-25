import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { AuditLogsService } from "./audit-logs.service";

test("audit query applies entity, dates, cursor and bounded page size", async () => {
  let query: Record<string, unknown> | undefined;
  const prisma = { auditLog: { findMany: async (args: Record<string, unknown>) => { query = args; return []; } } };
  await new AuditLogsService(prisma as never).findAll({ entityType: "Policy", from: "2026-01-01", to: "2026-01-31", cursor: "log-1", limit: 20 });
  assert.equal(query?.take, 20);
  assert.deepEqual(query?.cursor, { id: "log-1" });
  assert.equal(query?.skip, 1);
  assert.equal((query?.where as { entityType: string }).entityType, "Policy");
});

test("audit query rejects invalid ranges and page sizes", () => {
  const service = new AuditLogsService({} as never);
  assert.throws(() => service.findAll({ from: "not-a-date" }), /Invalid audit log date range/);
  assert.throws(() => service.findAll({ from: "2026-02-01", to: "2026-01-01" }), /Invalid audit log date range/);
  assert.throws(() => service.findAll({ limit: 101 }), /Limit must be an integer/);
});
