import assert from "node:assert/strict";
import { after, test } from "node:test";
import { Role } from "@patch-management/shared";
import { apiClient, setApiCacheScope } from "./api";
import { prefetchRouteData, routeDataPaths } from "./route-prefetch";

const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; setApiCacheScope(null); });

test("prefetch routes respect the visible role scope", () => {
  assert.deepEqual(routeDataPaths("/dashboard", Role.USER), ["/devices/me", "/patches"]);
  assert.deepEqual(routeDataPaths("/users", Role.USER), []);
  assert.deepEqual(routeDataPaths("/audit-logs", Role.IT_HELPDESK), []);
  assert.deepEqual(routeDataPaths("/tickets", Role.SECURITY_ANALYST), []);
  assert.deepEqual(routeDataPaths("/users", Role.ADMIN), ["/users"]);
  assert.deepEqual(routeDataPaths("/audit-logs", Role.SECURITY_ANALYST), ["/audit-logs?limit=25"]);
});

test("prefetched ticket list and first detail are reused on navigation", async () => {
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    const path = String(input);
    requests.push(path);
    return Response.json(path.endsWith("/tickets") ? [{ id: "ticket-1" }] : { id: "ticket-1" });
  };
  setApiCacheScope({ id: "user", role: Role.USER });
  try {
    await prefetchRouteData("/tickets", Role.USER);
    await apiClient("/tickets");
    await apiClient("/tickets/ticket-1");
    assert.deepEqual(requests, ["/api/tickets", "/api/tickets/ticket-1"]);
  } finally {
    setApiCacheScope(null);
  }
});
