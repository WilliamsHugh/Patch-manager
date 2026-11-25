import assert from "node:assert/strict";
import { after, test } from "node:test";
import { apiClient, clearApiCache, getCachedApiData, setApiCacheScope } from "./api";

const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; setApiCacheScope(null); });

test("notification reads are shared within a user and isolated across users", async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return Response.json([{ id: `notification-${requests}` }]);
  };
  setApiCacheScope({ id: "user-1", role: "ADMIN" });
  const [first, second] = await Promise.all([apiClient<{ id: string }[]>("/notifications"), apiClient<{ id: string }[]>("/notifications")]);
  assert.deepEqual(first, second);
  assert.equal(requests, 1);
  assert.deepEqual(await apiClient("/notifications"), first);
  assert.equal(requests, 1);

  setApiCacheScope({ id: "user-2", role: "USER" });
  assert.equal(getCachedApiData("/notifications"), undefined);
  await apiClient("/notifications");
  assert.equal(requests, 2);
  setApiCacheScope(null);
});

test("user account reads are cached briefly and cleared after an account write", async () => {
  let reads = 0;
  const realNow = Date.now;
  let now = 100_000;
  Date.now = () => now;
  globalThis.fetch = async (_input, init) => {
    if (init?.method === "PATCH") return Response.json({ id: "account-1" });
    reads += 1;
    return Response.json([{ id: `account-${reads}` }]);
  };
  try {
    setApiCacheScope({ id: "admin", role: "ADMIN" });
    await apiClient("/users");
    await apiClient("/users");
    assert.equal(reads, 1);
    now += 30_001;
    await apiClient("/users");
    assert.equal(reads, 2);
    await apiClient("/users/account-1", { method: "PATCH", body: "{}" });
    assert.equal(getCachedApiData("/users"), undefined);
    await apiClient("/users");
    assert.equal(reads, 3);
    setApiCacheScope({ id: "another-admin", role: "ADMIN" });
    assert.equal(getCachedApiData("/users"), undefined);
  } finally {
    Date.now = realNow;
    setApiCacheScope(null);
  }
});

test("refresh and successful writes invalidate cached lists", async () => {
  let reads = 0;
  globalThis.fetch = async (_input, init) => {
    if (init?.method === "POST") return Response.json({ id: "new-patch" });
    reads += 1;
    return Response.json([{ id: `patch-${reads}` }]);
  };
  setApiCacheScope({ id: "admin", role: "ADMIN" });
  await apiClient("/patches");
  await apiClient("/patches", { cache: "reload" });
  assert.equal(reads, 2);
  await apiClient("/patches", { method: "POST", body: "{}" });
  assert.equal(getCachedApiData("/patches"), undefined);
  await apiClient("/patches");
  assert.equal(reads, 3);
  clearApiCache();
  setApiCacheScope(null);
});

test("short-lived notification and report reads expire", async () => {
  let requests = 0;
  const realNow = Date.now;
  let now = 100_000;
  Date.now = () => now;
  globalThis.fetch = async () => { requests += 1; return Response.json([]); };
  try {
    setApiCacheScope({ id: "user-1", role: "USER" });
    await apiClient("/notifications");
    await apiClient("/notifications");
    assert.equal(requests, 1);
    now += 15_001;
    await apiClient("/notifications");
    assert.equal(requests, 2);
    await apiClient("/reports/overview");
    await apiClient("/reports/overview");
    assert.equal(requests, 3);
    now += 15_001;
    await apiClient("/reports/overview");
    assert.equal(requests, 4);
  } finally {
    Date.now = realNow;
    setApiCacheScope(null);
  }
});

test("refreshing one list keeps other cached routes and account changes clear all", async () => {
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    requests.push(String(input));
    return Response.json([]);
  };
  setApiCacheScope({ id: "admin", role: "ADMIN" });
  try {
    await Promise.all([apiClient("/users"), apiClient("/patches")]);
    await apiClient("/users", { cache: "reload" });
    assert.deepEqual(getCachedApiData("/patches"), []);
    assert.equal(requests.length, 3);
    setApiCacheScope({ id: "user", role: "USER" });
    assert.equal(getCachedApiData("/users"), undefined);
    assert.equal(getCachedApiData("/patches"), undefined);
  } finally {
    setApiCacheScope(null);
  }
});

test("a pending read cannot populate another account's cache", async () => {
  let finishRequest!: (response: Response) => void;
  globalThis.fetch = () => new Promise<Response>((resolve) => { finishRequest = resolve; });
  setApiCacheScope({ id: "admin", role: "ADMIN" });
  try {
    const oldRead = apiClient("/users");
    setApiCacheScope({ id: "another-admin", role: "ADMIN" });
    finishRequest(Response.json([{ id: "old-account" }]));
    await oldRead;
    assert.equal(getCachedApiData("/users"), undefined);
  } finally {
    setApiCacheScope(null);
  }
});

test("failed reads are retried instead of cached", async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return requests === 1 ? Response.json({ message: "Unavailable" }, { status: 500 }) : Response.json([]);
  };
  setApiCacheScope({ id: "user-1", role: "USER" });
  await assert.rejects(apiClient("/notifications"), /Unavailable/);
  await apiClient("/notifications");
  assert.equal(requests, 2);
  setApiCacheScope(null);
});
