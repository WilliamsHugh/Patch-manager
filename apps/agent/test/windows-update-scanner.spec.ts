import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWindowsUpdateOutput } from "../src/windows-update-scanner";

test("parses bounded Windows Update observations", () => {
  const updates = parseWindowsUpdateOutput(JSON.stringify({ updates: [{ updateId: "f3d58835-4f45-4a1c-b0d2-b8589e9d8e85", title: "Security Update", kbArticleIds: ["KB5035853"], categories: ["Security Updates"], rebootRequired: true }] }));
  assert.deepEqual(updates, [{ updateId: "f3d58835-4f45-4a1c-b0d2-b8589e9d8e85", title: "Security Update", kbArticleIds: ["KB5035853"], categories: ["Security Updates"], rebootRequired: true }]);
});

test("rejects malformed Windows Update output", () => {
  assert.throws(() => parseWindowsUpdateOutput("{}"), /invalid response/);
  assert.throws(() => parseWindowsUpdateOutput(JSON.stringify({ updates: [{ updateId: "", title: "Update", kbArticleIds: [], categories: [], rebootRequired: false }] })), /invalid update ID/);
});
