import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { AgentService } from "../src/modules/agent/agent.service";

function createPrismaMock() {
  const calls = {
    findMany: [] as unknown[],
    deviceFindUnique: [] as unknown[],
    deviceUpdate: [] as unknown[],
    upsert: [] as unknown[],
  };

  const prisma = {
    agentStatus: {
      findMany: async (args: unknown) => {
        calls.findMany.push(args);

        return [
          {
            id: "agent-1",
            version: "agent-1.0.0",
            isConnected: true,
            lastHeartbeatAt: new Date(),
            lastScanAt: null,
            deviceId: "device-1",
            updatedAt: new Date(),

            device: {
              id: "device-1",
              hostname: "ACC-PC-012",
              status: "ONLINE",
            },
          },

          {
            id: "agent-2",
            version: "agent-1.0.0",
            isConnected: false,
            lastHeartbeatAt: null,
            lastScanAt: null,
            deviceId: "device-2",
            updatedAt: new Date(),

            device: {
              id: "device-2",
              hostname: "DEV-WS-028",
              status: "OFFLINE",
            },
          },
        ];
      },


      upsert: async (args: unknown) => {
        calls.upsert.push(args);

        return {
          id: "agent-1",
          deviceId: "device-1",
          version: "agent-1.0.0",
          isConnected: true,
          lastHeartbeatAt: new Date(),
          lastScanAt: new Date(),

          device: {
            id: "device-1",
            hostname: "ACC-PC-012",
            status: "ONLINE",
          },
        };
      },
    },


    device: {
      findUnique: async (
        args: unknown,
      ): Promise<{ id: string } | null> => {

        calls.deviceFindUnique.push(args);

        return {
          id: "device-1",
        };
      },


      update: async (
        args: unknown,
      ) => {

        calls.deviceUpdate.push(args);

        return {
          id: "device-1",
          status: "ONLINE",
        };
      },
    },
  };


  return {
    prisma,
    calls,
  };
}



test("returns connected and offline agent states", async () => {

  const { prisma } = createPrismaMock();

  const service =
    new AgentService(prisma as never);


  const result =
    await service.findAllStatus();


  assert.equal(result.length, 2);

  assert.equal(
    result[0].connectionState,
    "CONNECTED",
  );

  assert.equal(
    result[1].connectionState,
    "OFFLINE",
  );

  assert.equal(
    result[0].device.hostname,
    "ACC-PC-012",
  );

});



test("heartbeat creates or updates agent status", async () => {

  const { prisma, calls } =
    createPrismaMock();


  const service =
    new AgentService(prisma as never);



  const result =
    await service.heartbeat(
      "device-1",
      "agent-2.0.0",
    );


  assert.equal(
    result.deviceId,
    "device-1",
  );


  assert.equal(
    result.isConnected,
    true,
  );



  const query =
    calls.upsert[0] as {

      where:{
        deviceId:string;
      };

      update:{
        version:string;
        isConnected:boolean;
        lastHeartbeatAt:Date;
      };

      create:{
        deviceId:string;
        version:string;
        isConnected:boolean;
      };

    };



  assert.deepEqual(
    query.where,
    {
      deviceId:"device-1",
    },
  );


  assert.equal(
    query.update.version,
    "agent-2.0.0",
  );


  assert.equal(
    query.update.isConnected,
    true,
  );


  assert.equal(
    query.create.deviceId,
    "device-1",
  );


  assert.equal(
    query.create.version,
    "agent-2.0.0",
  );


  // kiểm tra heartbeat cập nhật Device ONLINE
  assert.equal(
    calls.deviceUpdate.length,
    1,
  );

});



test("scan updates last scan and heartbeat timestamps", async () => {

  const { prisma, calls } =
    createPrismaMock();


  const service =
    new AgentService(prisma as never);



  const result =
    await service.recordScan(
      "device-1",
    );


  assert.equal(
    result.deviceId,
    "device-1",
  );



  const query =
    calls.upsert[0] as {

      where:{
        deviceId:string;
      };

      update:{
        isConnected:boolean;
        lastScanAt:Date;
        lastHeartbeatAt:Date;
      };

    };



  assert.deepEqual(
    query.where,
    {
      deviceId:"device-1",
    },
  );


  assert.equal(
    query.update.isConnected,
    true,
  );


  assert.ok(
    query.update.lastScanAt instanceof Date,
  );


  assert.ok(
    query.update.lastHeartbeatAt instanceof Date,
  );

});



test("heartbeat rejects an unknown device", async () => {

  const { prisma } =
    createPrismaMock();



  prisma.device.findUnique =
    async (): Promise<{id:string}|null> => {

      return null;

    };



  const service =
    new AgentService(prisma as never);



  await assert.rejects(
    service.heartbeat(
      "unknown-device",
      "agent-1.0.0",
    ),
    /Device not found/,
  );

});



test("scan rejects an unknown device", async () => {

  const { prisma } =
    createPrismaMock();



  prisma.device.findUnique =
    async (): Promise<{id:string}|null> => {

      return null;

    };



  const service =
    new AgentService(prisma as never);



  await assert.rejects(
    service.recordScan(
      "unknown-device",
    ),
    /Device not found/,
  );

});

test("returns offline when heartbeat is older than five minutes", async () => {
  const { prisma } = createPrismaMock();

  prisma.agentStatus.findMany = async () => [
    {
      id: "agent-stale",
      version: "agent-1.0.0",
      isConnected: true,
      lastHeartbeatAt: new Date(Date.now() - 6 * 60 * 1000),
      lastScanAt: null,
      deviceId: "device-stale",
      updatedAt: new Date(),
      device: {
        id: "device-stale",
        hostname: "STALE-DEVICE",
        status: "ONLINE",
      },
    },
  ];

  const service = new AgentService(prisma as never);
  const result = await service.findAllStatus();

  assert.equal(result[0].connectionState, "OFFLINE");
});
