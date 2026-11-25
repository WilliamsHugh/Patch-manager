import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { NotificationStatus } from "@prisma/client";
import { NotificationsService } from "../src/modules/notifications/notifications.service";

test("notification list is restricted to the current user", async () => {
  let query: unknown;
  const prisma = { notification: { findMany: async (args: unknown) => { query = args; return []; } } };
  await new NotificationsService(prisma as never).findForUser("user-1");
  assert.deepEqual((query as { where: unknown }).where, { userId: "user-1" });
});

test("markRead uses owner and ID in the same update condition", async () => {
  let query: unknown;
  const prisma = { notification: {
    updateMany: async (args: unknown) => { query = args; return { count: 1 }; },
    findUniqueOrThrow: async () => ({ id: "notification-1", status: NotificationStatus.READ }),
  } };
  const result = await new NotificationsService(prisma as never).markRead("notification-1", "user-1");
  assert.deepEqual((query as { where: unknown }).where, { id: "notification-1", userId: "user-1" });
  assert.equal(result.status, NotificationStatus.READ);
});

test("markRead does not reveal another user's notification", async () => {
  let fetched = false;
  const prisma = { notification: {
    updateMany: async () => ({ count: 0 }),
    findUniqueOrThrow: async () => { fetched = true; return {}; },
  } };
  await assert.rejects(new NotificationsService(prisma as never).markRead("foreign-id", "user-1"), /Notification not found/);
  assert.equal(fetched, false);
});

test("markAllRead updates only unread notifications owned by the current user", async () => {
  let query: unknown;
  const prisma = { notification: { updateMany: async (args: unknown) => { query = args; return { count: 2 }; } } };
  assert.deepEqual(await new NotificationsService(prisma as never).markAllRead("user-1"), { updated: 2 });
  assert.deepEqual((query as { where: unknown }).where, { userId: "user-1", status: NotificationStatus.UNREAD });
});
