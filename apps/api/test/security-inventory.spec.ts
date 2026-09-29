import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { SecurityInventoryService } from "../src/modules/security-inventory/security-inventory.service";

function createPrismaMock() {
  return {
    patch: {
      findMany: async () => [
        {
          id: "patch-1",
          code: "CVE-2026-2115",
          title: "Chrome security update",
          severity: "CRITICAL",
          releasedAt: new Date("2026-08-20"),
          requiresRestart: false,
          version: "128.0.6613",
          software: {
            id: "software-1",
            name: "Google Chrome",
            vendor: "Google",
            currentVersion: "128.0.6613",
            installations: [
              {
                version: "127.0.0",
                device: {
                  id: "device-1",
                  hostname: "ACC-PC-012",
                  department: "Accounting",
                  status: "ONLINE",
                },
              },
              {
                version: "128.0.6613",
                device: {
                  id: "device-2",
                  hostname: "DEV-WS-028",
                  department: "Engineering",
                  status: "ONLINE",
                },
              },
            ],
          },
        },
      ],
    },
  };
}

test("returns risk summary and affected devices", async () => {
  const service = new SecurityInventoryService(createPrismaMock() as never);
  const result = await service.findAll({ q: "CVE-2026-2115" });

  assert.equal(result.summary.total, 1);
  assert.equal(result.summary.critical, 1);
  assert.equal(result.summary.affectedDevices, 1);
  assert.equal(result.items[0].affectedDeviceCount, 1);
  assert.equal(result.items[0].affectedDevices[0].hostname, "ACC-PC-012");
});
