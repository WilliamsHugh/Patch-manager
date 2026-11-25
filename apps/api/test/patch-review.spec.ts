import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Role } from "@prisma/client";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "../src/common/guards/roles.guard";
import { PatchesController } from "../src/modules/patches/patches.controller";
import { PatchesService } from "../src/modules/patches/patches.service";

test("only Security Analyst reviews and only Manager decides", () => {
  const guard = new RolesGuard(new Reflector());
  const permitted = (name: "securityReview" | "managerDecision", role: Role) => guard.canActivate({
    getHandler: () => PatchesController.prototype[name], getClass: () => PatchesController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as never);
  assert.equal(permitted("securityReview", Role.SECURITY_ANALYST), true);
  assert.equal(permitted("securityReview", Role.ADMIN), false);
  assert.equal(permitted("managerDecision", Role.MANAGER), true);
  assert.equal(permitted("managerDecision", Role.SECURITY_ANALYST), false);
});

test("review transitions require pending, then deploy recommendation", async () => {
  let state = "PENDING_REVIEW";
  const prisma = { patch: {
    updateMany: async (args: { where: { patchStatus: string; securityDecision?: string }; data: { patchStatus: string } }) => {
      if (state !== args.where.patchStatus) return { count: 0 };
      state = args.data.patchStatus;
      return { count: 1 };
    },
    findUnique: async () => ({ id: "patch-1", patchStatus: state }),
  } };
  const service = new PatchesService(prisma as never);
  await assert.rejects(service.managerDecision("patch-1", { managerDecision: "APPROVED" }, "manager-1"), /Only patches recommended/);
  assert.equal((await service.securityReview("patch-1", { securityNote: "Investigated affected build", securityDecision: "DEPLOY" }, "security-1")).patchStatus, "UNDER_REVIEW");
  await assert.rejects(service.securityReview("patch-1", { securityNote: "Investigated affected build", securityDecision: "SKIP" }, "security-1"), /Only pending patches/);
  assert.equal((await service.managerDecision("patch-1", { managerDecision: "APPROVED" }, "manager-1")).patchStatus, "APPROVED");
});
