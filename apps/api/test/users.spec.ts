import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Role } from "@prisma/client";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { RolesGuard } from "../src/common/guards/roles.guard";
import { UsersController } from "../src/modules/users/users.controller";
import { UsersService } from "../src/modules/users/users.service";

const guard = new RolesGuard(new Reflector());

function allowed(method: string, role: Role) {
  const handler = (UsersController.prototype as unknown as Record<string, Function>)[method];
  const context = {
    getHandler: () => handler,
    getClass: () => UsersController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as unknown as ExecutionContext;
  return guard.canActivate(context);
}

test("only ADMIN can manage accounts; all authenticated roles can view own profile", () => {
  for (const method of ["findAll", "findOne", "create", "update", "deactivate"]) {
    assert.equal(allowed(method, Role.ADMIN), true);
    assert.equal(allowed(method, Role.MANAGER), false);
    assert.equal(allowed(method, Role.IT_HELPDESK), false);
    assert.equal(allowed(method, Role.SECURITY_ANALYST), false);
    assert.equal(allowed(method, Role.USER), false);
  }
  assert.equal(allowed("me", Role.USER), true);
});

test("account list returns only safe fields", async () => {
  let query: { select: Record<string, unknown> } | undefined;
  const prisma = { user: { findMany: async (args: typeof query) => { query = args; return []; } } };
  await new UsersService(prisma as never).findAll();
  assert.equal(query?.select.passwordHash, undefined);
  assert.equal(query?.select.refreshTokenHash, undefined);
  assert.equal(query?.select.refreshTokenExpiresAt, undefined);
  assert.deepEqual(query?.select._count, { select: { devices: true } });
});

test("creating an account normalizes email and hashes password", async () => {
  let query: { data: { email: string; passwordHash: string }; select: Record<string, unknown> } | undefined;
  const prisma = { user: { create: async (args: typeof query) => { query = args; return { id: "u1" }; } } };
  await new UsersService(prisma as never).create({ email: " Admin@EXAMPLE.com ", name: " New Admin ", role: Role.ADMIN, password: "password123" });
  assert.equal(query?.data.email, "admin@example.com");
  assert.equal(await bcrypt.compare("password123", query!.data.passwordHash), true);
  assert.equal(query?.select.passwordHash, undefined);
});

test("role and status changes revoke refresh sessions", async () => {
  let query: { data: Record<string, unknown> } | undefined;
  const prisma = { user: { update: async (args: typeof query) => { query = args; return { id: "u2" }; } } };
  const service = new UsersService(prisma as never);
  await service.update("u2", { role: Role.MANAGER }, "u1");
  assert.equal(query?.data.refreshTokenHash, null);
  assert.equal(query?.data.refreshTokenExpiresAt, null);
  await service.deactivate("u2", "u1");
  assert.equal(query?.data.isActive, false);
  assert.equal(query?.data.refreshTokenHash, null);
});

test("admin cannot demote or deactivate own account", async () => {
  const service = new UsersService({ user: {} } as never);
  await assert.rejects(service.update("u1", { role: Role.USER }, "u1"), /Không thể tự đổi role/);
  await assert.rejects(service.update("u1", { isActive: false }, "u1"), /Không thể tự đổi role/);
  await assert.rejects(service.deactivate("u1", "u1"), /Không thể tự khóa/);
});
