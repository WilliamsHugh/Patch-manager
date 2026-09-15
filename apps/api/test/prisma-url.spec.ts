import assert from "node:assert/strict";
import { test } from "node:test";
import { resolvePrismaDatabaseUrl } from "../src/prisma/prisma-url";

test("local and explicit database URLs are preserved", () => {
  const local = "postgresql://postgres:password@localhost:5432/patch_management?schema=public";
  assert.equal(resolvePrismaDatabaseUrl(local), local);
  assert.equal(resolvePrismaDatabaseUrl(undefined), undefined);
});

test("Supabase transaction pooler gets SSL, longer timeout and limited connections", () => {
  const raw = "postgresql://postgres.ref:password@aws-0-region.pooler.supabase.com:6543/postgres";
  const url = new URL(resolvePrismaDatabaseUrl(raw)!);
  assert.equal(url.searchParams.get("sslmode"), "require");
  assert.equal(url.searchParams.get("connect_timeout"), "30");
  assert.equal(url.searchParams.get("connection_limit"), "5");
});

test("explicit Supabase URL settings are never overwritten", () => {
  const raw = "postgresql://postgres.ref:password@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=verify-full&connect_timeout=60&connection_limit=2";
  assert.equal(resolvePrismaDatabaseUrl(raw), raw);
});

test("session pooler does not get transaction-pool connection limit", () => {
  const raw = "postgresql://postgres.ref:password@aws-0-region.pooler.supabase.com:5432/postgres";
  const url = new URL(resolvePrismaDatabaseUrl(raw)!);
  assert.equal(url.searchParams.get("sslmode"), "require");
  assert.equal(url.searchParams.get("connect_timeout"), "30");
  assert.equal(url.searchParams.get("connection_limit"), null);
});
