import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { validate } from "class-validator";
import { UpdatePolicyDto } from "./update-policy.dto";

test("policy update requires a positive maximum deferral and allows clearing severity", async () => {
  const invalid = Object.assign(new UpdatePolicyDto(), { maxDeferralHours: 0 });
  assert.notEqual((await validate(invalid)).length, 0);

  const valid = Object.assign(new UpdatePolicyDto(), { maxDeferralHours: 1, autoApproveSeverity: null });
  assert.equal((await validate(valid)).length, 0);
});
