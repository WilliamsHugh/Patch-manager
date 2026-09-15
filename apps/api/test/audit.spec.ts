import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { firstValueFrom, of, throwError } from "rxjs";
import { AuditInterceptor } from "../src/common/interceptors/audit.interceptor";
import { UsersController } from "../src/modules/users/users.controller";
import { DeploymentPlansController } from "../src/modules/deployment-plans/deployment-plans.controller";
import { PoliciesController } from "../src/modules/policies/policies.controller";
import { AuthController } from "../src/modules/auth/auth.controller";

function context(controller: Function, method: string, request: object): ExecutionContext {
  const handler = (controller.prototype as Record<string, Function>)[method];
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

test("successful account mutation creates a minimal audit entry", async () => {
  const entries: object[] = [];
  const interceptor = new AuditInterceptor(new Reflector(), { record: async (entry: object) => { entries.push(entry); } } as never);
  const request = { user: { id: "admin1" }, method: "POST", route: { path: "/users" }, body: { password: "top-secret" } };
  const result = { id: "new1", passwordHash: "never-log-this" };
  const response = await firstValueFrom(interceptor.intercept(context(UsersController, "create", request), { handle: () => of(result) } as CallHandler));
  assert.deepEqual(response, result);
  assert.deepEqual(entries, [{ action: "USER_CREATED", entityType: "User", entityId: "new1", userId: "admin1", metadata: { method: "POST", route: "/users" } }]);
  assert.equal(JSON.stringify(entries).includes("top-secret"), false);
  assert.equal(JSON.stringify(entries).includes("never-log-this"), false);
});

test("review and policy update use route ID instead of response body", async () => {
  const entries: { action: string; entityId: string }[] = [];
  const interceptor = new AuditInterceptor(new Reflector(), { record: async (entry: { action: string; entityId: string }) => { entries.push(entry); } } as never);
  for (const [controller, method, id] of [
    [DeploymentPlansController, "review", "plan1"],
    [PoliciesController, "update", "policy1"],
  ] as const) {
    const request = { user: { id: "actor1" }, params: { id }, method: "PATCH", route: { path: "/:id" } };
    await firstValueFrom(interceptor.intercept(context(controller, method, request), { handle: () => of({ id: "ignored" }) } as CallHandler));
  }
  assert.deepEqual(entries.map(({ action, entityId }) => ({ action, entityId })), [
    { action: "PLAN_REVIEWED", entityId: "plan1" },
    { action: "POLICY_UPDATED", entityId: "policy1" },
  ]);
});

test("failed mutation does not create a success audit entry", async () => {
  let called = false;
  const interceptor = new AuditInterceptor(new Reflector(), { record: async () => { called = true; } } as never);
  const request = { user: { id: "admin1" }, method: "POST" };
  await assert.rejects(firstValueFrom(interceptor.intercept(context(UsersController, "create", request), { handle: () => throwError(() => new Error("failed")) } as CallHandler)), /failed/);
  assert.equal(called, false);
});

test("audit storage failure does not turn a successful action into a false failure", async () => {
  const interceptor = new AuditInterceptor(new Reflector(), { record: async () => { throw new Error("database unavailable"); } } as never);
  const request = { user: { id: "admin1" }, method: "POST" };
  const result = await firstValueFrom(interceptor.intercept(context(AuthController, "logout", request), { handle: () => of(null) } as CallHandler));
  assert.equal(result, null);
});
