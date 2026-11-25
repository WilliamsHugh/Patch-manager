import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { PlanStatus, TaskStatus } from "@prisma/client";
import { DeploymentPlansService } from "../src/modules/deployment-plans/deployment-plans.service";

test("simulation progresses through task states and finishes FAILED when configured", async () => {
  const states: TaskStatus[] = [];
  let planStatus = PlanStatus.APPROVED;
  const task = { id: "task-1", planId: "plan-1", forceFailure: true };
  const prisma = {
    deploymentPlan: {
      findUnique: async () => ({ id: "plan-1", status: planStatus, tasks: [task] }),
      updateMany: async () => { planStatus = PlanStatus.DEPLOYING; return { count: 1 }; },
      update: async ({ data }: { data: { status: PlanStatus } }) => { planStatus = data.status; return { id: "plan-1", status: planStatus }; },
    },
    deploymentTask: {
      updateMany: async () => ({ count: 1 }),
      update: async ({ data }: { data: { status: TaskStatus } }) => { states.push(data.status); return task; },
      count: async () => 1,
      findMany: async () => [{ ...task, status: states.at(-1) }],
    },
  };
  const service = new DeploymentPlansService(prisma as never);
  (service as unknown as { wait: (milliseconds: number) => Promise<void> }).wait = async () => {};
  const response = await service.deploy("plan-1");
  assert.equal(response.status, PlanStatus.DEPLOYING);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(states, [TaskStatus.DOWNLOADING, TaskStatus.INSTALLING, TaskStatus.FAILED]);
  assert.equal(planStatus, PlanStatus.FAILED);
  const snapshot = await service.findTasks("plan-1");
  assert.equal(snapshot.simulation, true);
  assert.equal(snapshot.tasks[0].status, TaskStatus.FAILED);
});

test("only approved plans with tasks can start a simulation", async () => {
  const service = new DeploymentPlansService({ deploymentPlan: { findUnique: async () => ({ id: "plan-1", status: PlanStatus.DRAFT, tasks: [] }) } } as never);
  await assert.rejects(service.deploy("plan-1"), /Only approved plans/);
});
