import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PlanStatus, Role, TicketStatus } from "@prisma/client";
import { DeploymentPlansService } from "../src/modules/deployment-plans/deployment-plans.service";
import { TICKET_TRANSITIONS, TicketsService } from "../src/modules/tickets/tickets.service";

function ticketPrismaMock(ticket: Record<string, unknown> | null, queries: unknown[] = []) {
  return {
    ticket: {
      findUnique: async (query: unknown) => {
        queries.push(query);
        return ticket;
      },
      update: async ({ data }: { data: unknown }) => ({ id: "t1", ...data }),
    },
    notification: {
      createMany: async () => ({ count: 1 }),
      create: async () => ({}),
    },
    $transaction: async (operations: Promise<unknown>[]) => {
      const results = await Promise.all(operations);
      return [results[0]];
    },
  };
}

test("ticket transitions only follow the approved workflow graph", () => {
  assert.deepEqual(TICKET_TRANSITIONS[TicketStatus.OPEN], [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED]);
  assert.deepEqual(TICKET_TRANSITIONS[TicketStatus.IN_PROGRESS], [
    TicketStatus.WAITING_USER,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ]);
  assert.deepEqual(TICKET_TRANSITIONS[TicketStatus.WAITING_USER], [
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ]);
  assert.deepEqual(TICKET_TRANSITIONS[TicketStatus.RESOLVED], [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS]);
  assert.deepEqual(TICKET_TRANSITIONS[TicketStatus.CLOSED], []);
});

test("ticket status changes validate transitions and reject closed tickets", async () => {
  const service = new TicketsService(ticketPrismaMock({ id: "t1", title: "T", status: TicketStatus.CLOSED, createdById: "u1", assignedToId: null }) as never);
  await assert.rejects(
    service.updateStatus("t1", { status: TicketStatus.IN_PROGRESS }, { id: "h1", role: Role.IT_HELPDESK }),
    BadRequestException,
  );
});

test("helpdesk can move OPEN ticket to IN_PROGRESS", async () => {
  const service = new TicketsService(
    ticketPrismaMock({ id: "t1", title: "T", status: TicketStatus.OPEN, createdById: "u1", assignedToId: null }) as never,
  );
  const updated = await service.updateStatus("t1", { status: TicketStatus.IN_PROGRESS }, { id: "h1", role: Role.IT_HELPDESK });
  assert.equal((updated as { status: TicketStatus }).status, TicketStatus.IN_PROGRESS);
});

test("USER cannot change ticket status even on a valid transition", async () => {
  const service = new TicketsService(
    ticketPrismaMock({ id: "t1", title: "T", status: TicketStatus.OPEN, createdById: "u1", assignedToId: null }) as never,
  );
  await assert.rejects(
    service.updateStatus("t1", { status: TicketStatus.CLOSED }, { id: "u1", role: Role.USER }),
    ForbiddenException,
  );
});

test("status changes notify creator and assignee but never the actor", async () => {
  const calls: unknown[] = [];
  const prisma = ticketPrismaMock(
    { id: "t1", title: "T", status: TicketStatus.OPEN, createdById: "creator", assignedToId: "assignee" },
  ) as never as Record<string, unknown>;
  (prisma.notification as Record<string, unknown>).createMany = async (args: unknown) => {
    calls.push(args);
    return { count: 2 };
  };
  const service = new TicketsService(prisma as never);
  await service.updateStatus("t1", { status: TicketStatus.IN_PROGRESS }, { id: "creator", role: Role.IT_HELPDESK });
  const data = (calls[0] as { data: { userId: string }[] }).data.map((row) => row.userId).sort();
  assert.deepEqual(data, ["assignee"]);
});

test("only operations roles can assign tickets", async () => {
  const service = new TicketsService(
    ticketPrismaMock({ id: "t1", title: "T", status: TicketStatus.OPEN }) as never,
  );
  await assert.rejects(service.assign("t1", { assignedToId: "h2" }, { id: "u1", role: Role.USER }), ForbiddenException);
});

test("closed tickets cannot be reassigned", async () => {
  const service = new TicketsService(
    ticketPrismaMock({ id: "t1", title: "T", status: TicketStatus.CLOSED }) as never,
  );
  await assert.rejects(
    service.assign("t1", { assignedToId: "h2" }, { id: "h1", role: Role.IT_HELPDESK }),
    BadRequestException,
  );
});

function planPrismaMock(plan: Record<string, unknown> | null) {
  return {
    deploymentPlan: {
      findUnique: async () => plan,
      update: async ({ data }: { data: unknown }) => ({ id: "p1", ...data }),
    },
    user: { findMany: async () => [{ id: "mgr1" }, { id: "mgr2" }] },
    notification: {
      createMany: async () => ({ count: 2 }),
      create: async () => ({}),
    },
    $transaction: async (operations: unknown[]) => {
      const results = await Promise.all(operations as Promise<unknown>[]);
      return [results[0], results[1]];
    },
  };
}

test("plans can only be submitted from DRAFT or CHANGES_REQUESTED", async () => {
  const service = new DeploymentPlansService(
    planPrismaMock({ id: "p1", name: "P", status: PlanStatus.PENDING_APPROVAL, createdById: "h1" }) as never,
  );
  await assert.rejects(
    service.submitForApproval("p1", { id: "h1", role: Role.IT_HELPDESK }),
    BadRequestException,
  );
});

test("only the plan creator (or admin) can submit for approval", async () => {
  const service = new DeploymentPlansService(
    planPrismaMock({ id: "p1", name: "P", status: PlanStatus.DRAFT, createdById: "h1" }) as never,
  );
  await assert.rejects(service.submitForApproval("p1", { id: "h2", role: Role.IT_HELPDESK }), ForbiddenException);
  const updated = (await service.submitForApproval("p1", { id: "admin", role: Role.ADMIN })) as { status: PlanStatus };
  assert.equal(updated.status, PlanStatus.PENDING_APPROVAL);
});

test("managers only review PENDING_APPROVAL plans", async () => {
  const service = new DeploymentPlansService(
    planPrismaMock({ id: "p1", name: "P", status: PlanStatus.DRAFT, createdById: "h1" }) as never,
  );
  await assert.rejects(
    service.review("p1", { status: PlanStatus.APPROVED }, "mgr1"),
    BadRequestException,
  );
});

test("managers cannot review their own plans and approval resets review metadata on resubmit", async () => {
  const service = new DeploymentPlansService(
    planPrismaMock({ id: "p1", name: "P", status: PlanStatus.PENDING_APPROVAL, createdById: "mgr1" }) as never,
  );
  await assert.rejects(service.review("p1", { status: PlanStatus.APPROVED }, "mgr1"), ForbiddenException);

  const editable = new DeploymentPlansService(
    planPrismaMock({ id: "p1", name: "P", status: PlanStatus.DRAFT, createdById: "h1" }) as never,
  );
  const submitted = (await editable.submitForApproval("p1", { id: "h1", role: Role.IT_HELPDESK })) as {
    status: PlanStatus;
    reviewNote: string | null;
    reviewedAt: null;
    reviewedById: null;
  };
  assert.equal(submitted.status, PlanStatus.PENDING_APPROVAL);
  assert.equal(submitted.reviewNote, null);
  assert.equal(submitted.reviewedAt, null);
  assert.equal(submitted.reviewedById, null);
});

test("missing tickets and plans surface NotFoundException", async () => {
  const tickets = new TicketsService(ticketPrismaMock(null) as never);
  await assert.rejects(
    tickets.updateStatus("missing", { status: TicketStatus.CLOSED }, { id: "h1", role: Role.IT_HELPDESK }),
    NotFoundException,
  );
  const plans = new DeploymentPlansService(planPrismaMock(null) as never);
  await assert.rejects(plans.review("missing", { status: PlanStatus.APPROVED }, "mgr1"), NotFoundException);
});
