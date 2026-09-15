import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Role } from "@prisma/client";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
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
  assert.equal(allowed(DeploymentPlansController.prototype, "deploy", Role.MANAGER), false);
  assert.equal(allowed(DeploymentPlansController.prototype, "review", Role.IT_HELPDESK), false);
  assert.equal(allowed(DeploymentPlansController.prototype, "deploy", Role.IT_HELPDESK), true);
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
