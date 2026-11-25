import assert from "node:assert/strict";
import { test } from "node:test";
import { PlanStatus } from "@prisma/client";
import { DeploymentPlansService } from "../src/modules/deployment-plans/deployment-plans.service";

function plan(status: PlanStatus, createdById = "helpdesk-1") {
  return { id: "plan-1", status, createdById };
}

test("only the creator can submit an editable proposal", async () => {
  const updates: unknown[] = [];
  const prisma = {
    deploymentPlan: {
      findUnique: async () => plan(PlanStatus.DRAFT),
      update: async (args: unknown) => { updates.push(args); return { id: "plan-1", status: PlanStatus.PENDING_APPROVAL }; },
    },
  };
  const service = new DeploymentPlansService(prisma as never);
  const submitted = await service.submit("plan-1", "helpdesk-1");
  assert.equal(submitted.status, PlanStatus.PENDING_APPROVAL);
  assert.equal((updates[0] as { data: { status: PlanStatus } }).data.status, PlanStatus.PENDING_APPROVAL);
  await assert.rejects(service.submit("plan-1", "helpdesk-2"), /only submit plans you created/i);
});

test("manager review requires a pending proposal and a reason for rejection", async () => {
  const prisma = {
    deploymentPlan: {
      findUnique: async () => plan(PlanStatus.PENDING_APPROVAL),
      update: async () => ({ id: "plan-1", status: PlanStatus.APPROVED }),
    },
  };
  const service = new DeploymentPlansService(prisma as never);
  await assert.rejects(service.review("plan-1", { status: PlanStatus.REJECTED } as never, "manager-1"), /review reason is required/i);
  const approved = await service.review("plan-1", { status: PlanStatus.APPROVED } as never, "manager-1");
  assert.equal(approved.status, PlanStatus.APPROVED);
});
