import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { PlanStatus, TaskStatus } from "@prisma/client";
import { ReportsService } from "./reports.service";

test("overview counts fresh connected agents and successful scan findings", async () => {
  const now = new Date();
  const old = new Date(now.getTime() - 10 * 60_000);
  const agents = [
    { isConnected: true, lastHeartbeatAt: now, lastScanResult: { outcome: "SUCCESS", updates: [{ updateId: "u1" }] } },
    { isConnected: true, lastHeartbeatAt: old, lastScanResult: { outcome: "FAILED", updates: [{ updateId: "u2" }] } },
    { isConnected: false, lastHeartbeatAt: now, lastScanResult: null },
  ];
  const prisma = {
    device: { count: async (args?: { where?: object }) => args?.where ? 2 : 5 },
    deploymentPlan: { count: async () => 1 },
    deploymentTask: { count: async () => 3 },
    ticket: { count: async () => 4 },
    agentStatus: { findMany: async () => agents },
  };
  const result = await new ReportsService(prisma as never).overview();
  assert.equal(result.totalAgentsConnected, 1);
  assert.equal(result.agentsWithMissingPatches, 1);
  assert.equal(result.agentsNeverScanned, 3);
  assert.equal(result.pendingPlans, 1);
});

test("deployment summary keeps simulated outcomes separate from scanned inventory", async () => {
  const prisma = { deploymentPlan: { findMany: async () => [{
    id: "plan-1", name: "Pilot", status: PlanStatus.DEPLOYING,
    tasks: [{ status: TaskStatus.SUCCESS }, { status: TaskStatus.FAILED }, { status: TaskStatus.WAITING_RESTART }],
  }] } };
  const result = await new ReportsService(prisma as never).deploymentSummary();
  assert.deepEqual(result, [{ planId: "plan-1", name: "Pilot", status: PlanStatus.DEPLOYING, total: 3, success: 1, failed: 1, pending: 1, simulation: true }]);
});
