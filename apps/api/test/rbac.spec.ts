import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { BadRequestException, ForbiddenException, NotFoundException, type ExecutionContext } from "@nestjs/common";
import { Role, TicketStatus } from "@prisma/client";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "../src/common/guards/roles.guard";
import { DevicesController } from "../src/modules/devices/devices.controller";
import { DeploymentPlansController } from "../src/modules/deployment-plans/deployment-plans.controller";
import { PoliciesController } from "../src/modules/policies/policies.controller";
import { SoftwareController } from "../src/modules/software/software.controller";
import { TicketsController } from "../src/modules/tickets/tickets.controller";
import { TicketsService } from "../src/modules/tickets/tickets.service";
import { UsersService } from "../src/modules/users/users.service";
import { DevicesService } from "../src/modules/devices/devices.service";
import { JwtStrategy } from "../src/modules/auth/jwt.strategy";

const rolesGuard = new RolesGuard(new Reflector());

function allowed(controller: object, method: string, role: Role) {
  const handler = (controller as Record<string, unknown>)[method] as Function;
  const context = {
    getHandler: () => handler,
    getClass: () => controller.constructor,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext;
  return rolesGuard.canActivate(context);
}

test("SECURITY_ANALYST can read operational data but cannot mutate it", () => {
  const role = Role.SECURITY_ANALYST;
  assert.equal(allowed(DeploymentPlansController.prototype, "findAll", role), true);
  assert.equal(allowed(SoftwareController.prototype, "findAll", role), true);
  assert.equal(allowed(PoliciesController.prototype, "findAll", role), true);
  assert.equal(allowed(SoftwareController.prototype, "create", role), false);
  assert.equal(allowed(DeploymentPlansController.prototype, "create", role), false);
  assert.equal(allowed(DeploymentPlansController.prototype, "submit", role), false);
  assert.equal(allowed(DeploymentPlansController.prototype, "review", role), false);
  assert.equal(allowed(DeploymentPlansController.prototype, "deploy", role), false);
  assert.equal(allowed(PoliciesController.prototype, "update", role), false);
  assert.equal(allowed(TicketsController.prototype, "create", role), false);
  assert.equal(allowed(TicketsController.prototype, "findAll", role), false);
});

test("USER sees personal devices and tickets, not global operations", () => {
  const role = Role.USER;
  assert.equal(allowed(DevicesController.prototype, "findMine", role), true);
  assert.equal(allowed(DevicesController.prototype, "findAll", role), false);
  assert.equal(allowed(DeploymentPlansController.prototype, "findAll", role), false);
  assert.equal(allowed(TicketsController.prototype, "findAll", role), true);
  assert.equal(allowed(TicketsController.prototype, "create", role), true);
});

test("manager and helpdesk retain their distinct plan permissions", () => {
  assert.equal(allowed(DeploymentPlansController.prototype, "review", Role.MANAGER), true);
  assert.equal(allowed(DeploymentPlansController.prototype, "submit", Role.MANAGER), false);
  assert.equal(allowed(DeploymentPlansController.prototype, "deploy", Role.MANAGER), false);
  assert.equal(allowed(DeploymentPlansController.prototype, "review", Role.IT_HELPDESK), false);
  assert.equal(allowed(DeploymentPlansController.prototype, "submit", Role.IT_HELPDESK), false);
  assert.equal(allowed(DeploymentPlansController.prototype, "deploy", Role.IT_HELPDESK), true);
});

test("deployment plans enforce five-role RBAC across all endpoints", () => {
  const expected: Record<string, Role[]> = {
    findAll: [Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK, Role.SECURITY_ANALYST],
    findOne: [Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK, Role.SECURITY_ANALYST],
    create: [Role.ADMIN],
    update: [Role.ADMIN],
    remove: [Role.ADMIN],
    submit: [Role.ADMIN],
    review: [Role.MANAGER],
    deploy: [Role.ADMIN, Role.IT_HELPDESK],
  };

  for (const [method, allowedRoles] of Object.entries(expected)) {
    for (const role of Object.values(Role)) {
      assert.equal(
        allowed(DeploymentPlansController.prototype, method, role),
        allowedRoles.includes(role),
        `Expected ${method} for ${role} to be ${allowedRoles.includes(role)}`,
      );
    }
  }
});

test("user profile never selects password or refresh-session fields", async () => {
  let args: unknown;
  const prisma = {
    user: { findUnique: async (query: unknown) => { args = query; return { id: "u1", email: "u@example.com", name: "U", role: Role.USER, devices: [] }; } },
  };
  const service = new UsersService(prisma as never);
  await service.findMe("u1");
  const select = (args as { select: Record<string, boolean> }).select;
  assert.equal(select.passwordHash, undefined);
  assert.equal(select.refreshTokenHash, undefined);
  assert.equal(select.refreshTokenExpiresAt, undefined);
  assert.equal(select.id, true);
  assert.equal(select.devices, true);
});

test("device list only selects safe owner fields", async () => {
  let args: unknown;
  const prisma = { device: { findMany: async (query: unknown) => { args = query; return []; } } };
  await new DevicesService(prisma as never).findAll();
  const owner = (args as { include: { owner: { select: Record<string, boolean> } } }).include.owner.select;
  assert.equal(owner.passwordHash, undefined);
  assert.equal(owner.refreshTokenHash, undefined);
  assert.equal(owner.email, true);
});

test("tickets are filtered for USER but not for operations roles", async () => {
  const queries: unknown[] = [];
  const prisma = { ticket: { findMany: async (query: unknown) => { queries.push(query); return []; } } };
  const service = new TicketsService(prisma as never);
  await service.findAll({ id: "u1", role: Role.USER });
  await service.findAll({ id: "h1", role: Role.IT_HELPDESK });
  assert.deepEqual((queries[0] as { where: unknown }).where, { createdById: "u1" });
  assert.equal((queries[1] as { where: unknown }).where, undefined);
});

test("access token uses current role and rejects inactive users", async () => {
  let active = true;
  const prisma = {
    user: { findUnique: async () => ({ id: "u1", email: "u@example.com", role: Role.MANAGER, isActive: active }) },
  };
  const config = { getOrThrow: () => "unit-test-only-secret" };
  const strategy = new JwtStrategy(config as never, prisma as never);
  const payload = { sub: "u1", email: "old@example.com", role: Role.USER, type: "access" };
  assert.deepEqual(await strategy.validate(payload), { id: "u1", email: "u@example.com", role: Role.MANAGER });
  active = false;
  assert.equal(await strategy.validate(payload), null);
});

test("tickets controller enforces RBAC across all 5 roles for full lifecycle endpoints", () => {
  const cases: Array<{
    method: string;
    expected: Record<Role, boolean>;
  }> = [
    {
      method: "findAll",
      expected: {
        [Role.ADMIN]: true,
        [Role.MANAGER]: true,
        [Role.IT_HELPDESK]: true,
        [Role.SECURITY_ANALYST]: false,
        [Role.USER]: true,
      },
    },
    {
      method: "findOne",
      expected: {
        [Role.ADMIN]: true,
        [Role.MANAGER]: true,
        [Role.IT_HELPDESK]: true,
        [Role.SECURITY_ANALYST]: false,
        [Role.USER]: true,
      },
    },
    {
      method: "create",
      expected: {
        [Role.ADMIN]: false,
        [Role.MANAGER]: false,
        [Role.IT_HELPDESK]: true,
        [Role.SECURITY_ANALYST]: false,
        [Role.USER]: true,
      },
    },
    {
      method: "addComment",
      expected: {
        [Role.ADMIN]: false,
        [Role.MANAGER]: false,
        [Role.IT_HELPDESK]: true,
        [Role.SECURITY_ANALYST]: false,
        [Role.USER]: true,
      },
    },
    {
      method: "assign",
      expected: {
        [Role.ADMIN]: false,
        [Role.MANAGER]: false,
        [Role.IT_HELPDESK]: true,
        [Role.SECURITY_ANALYST]: false,
        [Role.USER]: false,
      },
    },
    {
      method: "update",
      expected: {
        [Role.ADMIN]: true,
        [Role.MANAGER]: true,
        [Role.IT_HELPDESK]: true,
        [Role.SECURITY_ANALYST]: false,
        [Role.USER]: false,
      },
    },
    {
      method: "close",
      expected: {
        [Role.ADMIN]: false,
        [Role.MANAGER]: false,
        [Role.IT_HELPDESK]: false,
        [Role.SECURITY_ANALYST]: false,
        [Role.USER]: true,
      },
    },
  ];

  for (const { method, expected } of cases) {
    for (const role of Object.values(Role)) {
      assert.equal(
        allowed(TicketsController.prototype, method, role),
        expected[role],
        `Expected ${method} for ${role} to be ${expected[role]}`,
      );
    }
  }
});

test("TicketsService.findOne enforces ownership for USER and uses safe user selects", async () => {
  let capturedQuery: unknown;
  const prisma = {
    ticket: {
      findUnique: async (query: unknown) => {
        capturedQuery = query;
        const id = (query as { where: { id: string } }).where.id;
        if (id === "missing") return null;
        return { id, createdById: "owner-1", status: TicketStatus.OPEN };
      },
    },
  };
  const service = new TicketsService(prisma as never);

  await assert.rejects(() => service.findOne("missing", { id: "owner-1", role: Role.USER }), NotFoundException);
  await assert.rejects(() => service.findOne("t1", { id: "other-user", role: Role.USER }), ForbiddenException);

  const ownTicket = await service.findOne("t1", { id: "owner-1", role: Role.USER });
  assert.equal(ownTicket.id, "t1");

  const helpdeskTicket = await service.findOne("t1", { id: "hd-1", role: Role.IT_HELPDESK });
  assert.equal(helpdeskTicket.id, "t1");

  const include = (capturedQuery as {
    include: {
      createdBy: { select: Record<string, boolean> };
      assignedTo: { select: Record<string, boolean> };
      comments: { include: { author: { select: Record<string, boolean> } }; orderBy: Record<string, string> };
    };
  }).include;
  assert.equal(include.createdBy.select.passwordHash, undefined);
  assert.equal(include.createdBy.select.refreshTokenHash, undefined);
  assert.equal(include.assignedTo.select.passwordHash, undefined);
  assert.equal(include.comments.include.author.select.passwordHash, undefined);
  assert.equal(include.comments.include.author.select.role, true);
  assert.deepEqual(include.comments.orderBy, { createdAt: "asc" });
});

test("TicketsService.addComment validates non-empty content and USER ownership", async () => {
  const createdComments: unknown[] = [];
  const prisma = {
    ticket: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === "missing" ? null : { id: where.id, createdById: "owner-1" },
    },
    ticketComment: {
      create: async (args: unknown) => {
        createdComments.push(args);
        return { id: "c1", ...(args as { data: Record<string, unknown> }).data };
      },
    },
  };
  const service = new TicketsService(prisma as never);

  await assert.rejects(() => service.addComment("t1", "", { id: "owner-1", role: Role.USER }), BadRequestException);
  await assert.rejects(() => service.addComment("t1", "   \n\t ", { id: "owner-1", role: Role.USER }), BadRequestException);
  await assert.rejects(() => service.addComment("missing", "hello", { id: "owner-1", role: Role.USER }), NotFoundException);
  await assert.rejects(() => service.addComment("t1", "hello", { id: "other-user", role: Role.USER }), ForbiddenException);

  await service.addComment("t1", "  Need help with KB5034441  ", { id: "owner-1", role: Role.USER });
  await service.addComment("t1", "Investigating now", { id: "hd-1", role: Role.IT_HELPDESK });

  assert.equal(createdComments.length, 2);
  assert.equal((createdComments[0] as { data: { content: string } }).data.content, "Need help with KB5034441");
  assert.equal((createdComments[1] as { data: { authorId: string } }).data.authorId, "hd-1");
});

test("TicketsService.assign verifies ticket, active status, and IT_HELPDESK role", async () => {
  const updates: unknown[] = [];
  const users: Record<string, { id: string; role: Role; isActive: boolean }> = {
    hdActive: { id: "hdActive", role: Role.IT_HELPDESK, isActive: true },
    hdInactive: { id: "hdInactive", role: Role.IT_HELPDESK, isActive: false },
    normalUser: { id: "normalUser", role: Role.USER, isActive: true },
    adminUser: { id: "adminUser", role: Role.ADMIN, isActive: true },
  };
  const prisma = {
    ticket: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === "missing" ? null : { id: where.id, createdById: "owner-1" },
      update: async (args: unknown) => {
        updates.push(args);
        return { id: "t1", assignedToId: (args as { data: { assignedToId: string } }).data.assignedToId };
      },
    },
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => users[where.id] ?? null,
    },
  };
  const service = new TicketsService(prisma as never);

  await assert.rejects(() => service.assign("missing", "hdActive"), NotFoundException);
  await assert.rejects(() => service.assign("t1", "missingUser"), NotFoundException);
  await assert.rejects(() => service.assign("t1", "hdInactive"), BadRequestException);
  await assert.rejects(() => service.assign("t1", "normalUser"), BadRequestException);
  await assert.rejects(() => service.assign("t1", "adminUser"), BadRequestException);

  const assigned = await service.assign("t1", "hdActive");
  assert.equal(assigned.assignedToId, "hdActive");
  assert.equal(updates.length, 1);
});

test("TicketsService.close and updateStatus enforce existence, creator ownership, and RESOLVED state", async () => {
  let currentStatus: TicketStatus = TicketStatus.OPEN;
  const prisma = {
    ticket: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === "missing" ? null : { id: where.id, createdById: "owner-1", status: currentStatus },
      update: async ({ data }: { data: { status: TicketStatus } }) => {
        currentStatus = data.status;
        return { id: "t1", status: currentStatus };
      },
    },
  };
  const service = new TicketsService(prisma as never);

  await assert.rejects(() => service.updateStatus("missing", { status: TicketStatus.IN_PROGRESS }), NotFoundException);
  const inProgress = await service.updateStatus("t1", { status: TicketStatus.IN_PROGRESS });
  assert.equal(inProgress.status, TicketStatus.IN_PROGRESS);

  await assert.rejects(() => service.close("missing", "owner-1"), NotFoundException);
  await assert.rejects(() => service.close("t1", "other-user"), ForbiddenException);
  await assert.rejects(() => service.close("t1", "owner-1"), BadRequestException);

  currentStatus = TicketStatus.RESOLVED;
  const closed = await service.close("t1", "owner-1");
  assert.equal(closed.status, TicketStatus.CLOSED);
});
