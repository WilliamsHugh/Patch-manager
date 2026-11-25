import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PlanStatus, TaskStatus } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DeploymentPlansService } from "../src/modules/deployment-plans/deployment-plans.service";
import { CreateDeploymentPlanDto } from "../src/modules/deployment-plans/dto/create-deployment-plan.dto";
import { UpdateDeploymentPlanDto } from "../src/modules/deployment-plans/dto/update-deployment-plan.dto";

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

test("CreateDeploymentPlanDto and UpdateDeploymentPlanDto validate forceFailureTaskIds", async () => {
  const dev1 = "11111111-1111-4111-8111-111111111111";
  const patch1 = "22222222-2222-4222-8222-222222222222";

  const validCreate = plainToInstance(CreateDeploymentPlanDto, {
    name: "Simulation plan",
    deviceIds: [dev1],
    patchIds: [patch1],
    forceFailureTaskIds: [`${dev1}:${patch1}`, patch1, dev1],
  });
  assert.equal((await validate(validCreate)).length, 0);

  const invalidCreate = plainToInstance(CreateDeploymentPlanDto, {
    name: "Simulation plan",
    deviceIds: [dev1],
    patchIds: [patch1],
    forceFailureTaskIds: [123],
  });
  assert.ok((await validate(invalidCreate)).length > 0);

  const validUpdate = plainToInstance(UpdateDeploymentPlanDto, {
    forceFailureTaskIds: [`${dev1}:${patch1}`],
  });
  assert.equal((await validate(validUpdate)).length, 0);
});

test("create() marks forceFailure from deviceId:patchId, patchId, and deviceId selectors", async () => {
  const createdPayloads: unknown[] = [];
  const prisma = {
    device: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => ({ id })),
    },
    patch: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => ({ id })),
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
      fn({
        deploymentPlan: {
          create: async (args: unknown) => {
            createdPayloads.push(args);
            return { id: "plan-1", status: PlanStatus.DRAFT };
          },
        },
      }),
  };

  const service = new DeploymentPlansService(prisma as never);
  await service.create(
    {
      name: "Failure Matrix Plan",
      deviceIds: ["dev-1", "dev-2", "dev-3"],
      patchIds: ["patch-1", "patch-2"],
      forceFailureTaskIds: ["dev-1:patch-1", "patch-2", "dev-3"],
    },
    "admin-1",
  );

  const payload = createdPayloads[0] as {
    data: { tasks: { create: Array<{ deviceId: string; patchId: string; forceFailure: boolean }> } };
  };
  assert.deepEqual(payload.data.tasks.create, [
    { deviceId: "dev-1", patchId: "patch-1", forceFailure: true },
    { deviceId: "dev-1", patchId: "patch-2", forceFailure: true },
    { deviceId: "dev-2", patchId: "patch-1", forceFailure: false },
    { deviceId: "dev-2", patchId: "patch-2", forceFailure: true },
    { deviceId: "dev-3", patchId: "patch-1", forceFailure: true },
    { deviceId: "dev-3", patchId: "patch-2", forceFailure: true },
  ]);

  await service.create(
    {
      name: "Default No-Failure Plan",
      deviceIds: ["dev-1"],
      patchIds: ["patch-1"],
    },
    "admin-1",
  );
  const defaultPayload = createdPayloads[1] as {
    data: { tasks: { create: Array<{ deviceId: string; patchId: string; forceFailure: boolean }> } };
  };
  assert.deepEqual(defaultPayload.data.tasks.create, [
    { deviceId: "dev-1", patchId: "patch-1", forceFailure: false },
  ]);
});

test("update() applies forceFailureTaskIds on task recreation and direct flag updates", async () => {
  const updatedPayloads: unknown[] = [];
  const taskUpdates: unknown[] = [];

  const prisma = {
    deploymentPlan: {
      findUnique: async () => ({
        id: "plan-1",
        status: PlanStatus.DRAFT,
        createdById: "admin-1",
        devices: [{ deviceId: "dev-1" }],
        tasks: [
          { id: "task-1", deviceId: "dev-1", patchId: "patch-1", forceFailure: true },
          { id: "task-2", deviceId: "dev-1", patchId: "patch-2", forceFailure: false },
        ],
      }),
    },
    device: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => ({ id })),
    },
    patch: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => ({ id })),
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
      fn({
        deploymentTask: {
          deleteMany: async () => ({ count: 2 }),
          update: async (args: unknown) => {
            taskUpdates.push(args);
            return args;
          },
        },
        deploymentPlanDevice: {
          deleteMany: async () => ({ count: 1 }),
        },
        deploymentPlan: {
          update: async (args: unknown) => {
            updatedPayloads.push(args);
            return { id: "plan-1", status: PlanStatus.DRAFT };
          },
        },
      }),
  };

  const service = new DeploymentPlansService(prisma as never);

  // Recreating tasks with explicit forceFailureTaskIds overrides previous flags
  await service.update(
    "plan-1",
    { deviceIds: ["dev-1", "dev-2"], patchIds: ["patch-1"], forceFailureTaskIds: ["dev-2:patch-1"] },
    "admin-1",
  );
  const recreated = updatedPayloads[0] as {
    data: { tasks: { create: Array<{ deviceId: string; patchId: string; forceFailure: boolean }> } };
  };
  assert.deepEqual(recreated.data.tasks.create, [
    { deviceId: "dev-1", patchId: "patch-1", forceFailure: false },
    { deviceId: "dev-2", patchId: "patch-1", forceFailure: true },
  ]);

  // Passing forceFailureTaskIds alone updates existing tasks in-place
  await service.update("plan-1", { forceFailureTaskIds: ["patch-2"] }, "admin-1");
  assert.deepEqual(taskUpdates, [
    { where: { id: "task-1" }, data: { forceFailure: false } },
    { where: { id: "task-2" }, data: { forceFailure: true } },
  ]);
});

test("deploy() enforces APPROVED status and simulates FAILED vs SUCCESS tasks", async () => {
  const missingPrisma = {
    deploymentPlan: { findUnique: async () => null },
  };
  await assert.rejects(
    new DeploymentPlansService(missingPrisma as never).deploy("missing"),
    NotFoundException,
  );

  const draftPrisma = {
    deploymentPlan: { findUnique: async () => ({ id: "plan-1", status: PlanStatus.DRAFT, tasks: [] }) },
  };
  await assert.rejects(
    new DeploymentPlansService(draftPrisma as never).deploy("plan-1"),
    BadRequestException,
  );

  const mixedTaskUpdates: Array<{ where: { id: string }; data: Record<string, unknown> }> = [];
  const mixedPlanUpdates: Array<{ where: { id: string }; data: { status: PlanStatus }; include: unknown }> = [];
  const mixedPrisma = {
    deploymentPlan: {
      findUnique: async () => ({
        id: "plan-fail",
        status: PlanStatus.APPROVED,
        tasks: [
          { id: "task-ok", deviceId: "dev-1", patchId: "patch-1", forceFailure: false },
          { id: "task-bad", deviceId: "dev-2", patchId: "patch-1", forceFailure: true },
        ],
      }),
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
      fn({
        deploymentTask: {
          update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
            mixedTaskUpdates.push(args);
            return args;
          },
        },
        deploymentPlan: {
          update: async (args: { where: { id: string }; data: { status: PlanStatus }; include: unknown }) => {
            mixedPlanUpdates.push(args);
            return { id: "plan-fail", status: args.data.status };
          },
        },
      }),
  };

  const failedResult = await new DeploymentPlansService(mixedPrisma as never).deploy("plan-fail");
  assert.equal(failedResult.status, PlanStatus.FAILED);
  assert.equal(mixedTaskUpdates.length, 2);
  assert.equal(mixedTaskUpdates[0].where.id, "task-ok");
  assert.equal(mixedTaskUpdates[0].data.status, TaskStatus.SUCCESS);
  assert.ok(mixedTaskUpdates[0].data.startedAt instanceof Date);
  assert.ok(mixedTaskUpdates[0].data.completedAt instanceof Date);
  assert.equal(mixedTaskUpdates[1].where.id, "task-bad");
  assert.equal(mixedTaskUpdates[1].data.status, TaskStatus.FAILED);
  assert.equal(mixedTaskUpdates[1].data.errorCode, "SIMULATED_FAILURE");
  assert.equal(mixedTaskUpdates[1].data.errorLog, "Task marked forceFailure=true for testing.");
  assert.ok(mixedTaskUpdates[1].data.startedAt instanceof Date);
  assert.ok(mixedTaskUpdates[1].data.completedAt instanceof Date);
  assert.equal(mixedPlanUpdates[0].data.status, PlanStatus.FAILED);
  assert.ok(mixedPlanUpdates[0].include);

  const successPlanUpdates: Array<{ data: { status: PlanStatus } }> = [];
  const successTaskUpdates: Array<{ data: Record<string, unknown> }> = [];
  const successPrisma = {
    deploymentPlan: {
      findUnique: async () => ({
        id: "plan-ok",
        status: PlanStatus.APPROVED,
        tasks: [
          { id: "task-1", deviceId: "dev-1", patchId: "patch-1", forceFailure: false },
          { id: "task-2", deviceId: "dev-1", patchId: "patch-2", forceFailure: false },
        ],
      }),
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
      fn({
        deploymentTask: {
          update: async (args: { data: Record<string, unknown> }) => {
            successTaskUpdates.push(args);
            return args;
          },
        },
        deploymentPlan: {
          update: async (args: { data: { status: PlanStatus } }) => {
            successPlanUpdates.push(args);
            return { id: "plan-ok", status: args.data.status };
          },
        },
      }),
  };

  const completedResult = await new DeploymentPlansService(successPrisma as never).deploy("plan-ok");
  assert.equal(completedResult.status, PlanStatus.COMPLETED);
  assert.equal(successTaskUpdates.length, 2);
  assert.ok(successTaskUpdates.every((u) => u.data.status === TaskStatus.SUCCESS));
  assert.equal(successPlanUpdates[0].data.status, PlanStatus.COMPLETED);
});
