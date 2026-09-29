import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { DevicesService } from "../src/modules/devices/devices.service";

function createPrismaMock(device: unknown) {
  return {
    device: {
      findUnique: async () => device,
    },
  };
}

const outdatedDevice = {
  id: "device-1",
  hostname: "ACC-PC-012",
  installedSoftware: [
    {
      id: "installation-1",
      version: "127.0.0",
      software: {
        id: "software-1",
        name: "Google Chrome",
        vendor: "Google",
        currentVersion: "128.0.6613",
        patches: [
          {
            id: "patch-1",
            code: "CVE-2026-2115",
            title: "Chrome security update",
            severity: "CRITICAL",
            releasedAt: new Date("2026-08-20"),
            requiresRestart: false,
          },
        ],
      },
    },
  ],
};

const upToDateDevice = {
  id: "device-2",
  hostname: "DEV-WS-028",
  installedSoftware: [
    {
      id: "installation-2",
      version: "128.0.6613",
      software: {
        id: "software-1",
        name: "Google Chrome",
        vendor: "Google",
        currentVersion: "128.0.6613",
        patches: [
          {
            id: "patch-1",
            code: "CVE-2026-2115",
            title: "Chrome security update",
            severity: "CRITICAL",
            releasedAt: new Date("2026-08-20"),
            requiresRestart: false,
          },
        ],
      },
    },
  ],
};

test("returns missing patches for an outdated device", async () => {
  const service = new DevicesService(
    createPrismaMock(outdatedDevice) as never,
  );

  const result = await service.findCompliance("device-1");

  assert.equal(result.deviceId, "device-1");
  assert.equal(result.hostname, "ACC-PC-012");
  assert.equal(result.totalMissing, 1);
  assert.equal(result.missingPatches.length, 1);
  assert.equal(result.missingPatches[0].patchCode, "CVE-2026-2115");
  assert.equal(result.missingPatches[0].softwareName, "Google Chrome");
  assert.equal(result.missingPatches[0].installedVersion, "127.0.0");
  assert.equal(result.missingPatches[0].currentVersion, "128.0.6613");
});

test("returns no missing patches for an up-to-date device", async () => {
  const service = new DevicesService(
    createPrismaMock(upToDateDevice) as never,
  );

  const result = await service.findCompliance("device-2");

  assert.equal(result.deviceId, "device-2");
  assert.equal(result.hostname, "DEV-WS-028");
  assert.equal(result.totalMissing, 0);
  assert.deepEqual(result.missingPatches, []);
});

test("throws when the device does not exist", async () => {
  const service = new DevicesService(
    createPrismaMock(null) as never,
  );

  await assert.rejects(
    service.findCompliance("unknown-device"),
    /Device not found/,
  );
});