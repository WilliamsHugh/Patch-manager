import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Role } from "@prisma/client";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { AuthService } from "../src/modules/auth/auth.service";

test("refresh rotation rejects the previous complete token", async () => {
  const user = {
    id: "user-1", email: "user@example.com", name: "User", role: Role.USER,
    isActive: true, passwordHash: await bcrypt.hash("password123", 4),
    refreshTokenHash: null as string | null,
    refreshTokenExpiresAt: null as Date | null,
    createdAt: new Date(), updatedAt: new Date(),
  };
  const prisma = { user: {
    findUnique: async () => user,
    update: async ({ data }: { data: Partial<typeof user> }) => Object.assign(user, data),
  } };
  let issued = 0;
  const jwt = {
    signAsync: async (payload: { type: string }) => `${payload.type}:user-1:${++issued}`,
    verifyAsync: async (token: string) => ({ sub: "user-1", type: token.split(":")[0] }),
    decode: () => ({ exp: Math.floor(Date.now() / 1000) + 3600 }),
  };
  const config = { get: () => undefined, getOrThrow: () => "test-secret" };
  const service = new AuthService(prisma as never, jwt as never, config as never);

  const first = await service.login({ email: user.email, password: "password123" });
  const second = await service.refresh(first.refreshToken);
  assert.notEqual(first.refreshToken, second.refreshToken);
  assert.match(user.refreshTokenHash!, /^[a-f0-9]{64}$/);
  await assert.rejects(() => service.refresh(first.refreshToken), UnauthorizedException);
  await service.logout(user.id);
  await assert.rejects(() => service.refresh(second.refreshToken), UnauthorizedException);
});
