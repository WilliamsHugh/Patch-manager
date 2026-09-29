import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { AgentService } from "../src/modules/agent/agent.service";


function createPrismaMock() {

  const calls = {
    agentFindMany: [] as unknown[],
    agentUpsert: [] as unknown[],
    deviceFindUnique: [] as unknown[],
  };


  const prisma = {

    agentStatus: {

      findMany: async (args: unknown) => {

        calls.agentFindMany.push(args);

        return [
          {
            id: "agent-1",
            version: "agent-1.0.0",
            isConnected: true,
            lastHeartbeatAt: new Date(),
            lastScanAt: new Date(),
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

        calls.agentUpsert.push(args);


        return {
          id: "agent-1",
          deviceId: "device-1",
          version: "agent-2.0.0",
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

      findUnique: async (args: unknown) => {

        calls.deviceFindUnique.push(args);


        return {
          id: "device-1",
        };
      },

    },

  };


  return {
    prisma,
    calls,
  };
}



/*
|--------------------------------------------------------------------------
| Test 1
| Lấy trạng thái agent
|--------------------------------------------------------------------------
*/

test(
"GET agent status returns connected/offline states",
async () => {


  const { prisma } = createPrismaMock();


  const service =
    new AgentService(prisma as never);



  const result =
    await service.findAllStatus();



  assert.equal(
    result.length,
    2
  );


  assert.equal(
    result[0].connectionState,
    "CONNECTED"
  );


  assert.equal(
    result[1].connectionState,
    "OFFLINE"
  );


  assert.equal(
    result[0].device.hostname,
    "ACC-PC-012"
  );

});





/*
|--------------------------------------------------------------------------
| Test 2
| Heartbeat tạo hoặc update agent
|--------------------------------------------------------------------------
*/

test(
"heartbeat creates or updates agent status",
async()=>{


 const {
   prisma,
   calls
 } = createPrismaMock();



 const service =
   new AgentService(prisma as never);



 const result =
   await service.heartbeat(
     "device-1",
     "agent-2.0.0"
   );



 assert.equal(
   result.deviceId,
   "device-1"
 );


 assert.equal(
   result.isConnected,
   true
 );



 const query =
   calls.agentUpsert[0] as any;



 assert.deepEqual(
   query.where,
   {
     deviceId:"device-1"
   }
 );



 assert.equal(
   query.update.version,
   "agent-2.0.0"
 );


 assert.equal(
   query.update.isConnected,
   true
 );


});





/*
|--------------------------------------------------------------------------
| Test 3
| Scan cập nhật thời gian scan
|--------------------------------------------------------------------------
*/

test(
"scan updates lastScanAt and heartbeat",
async()=>{


 const {
   prisma,
   calls
 } = createPrismaMock();



 const service =
   new AgentService(prisma as never);



 const result =
   await service.recordScan(
     "device-1"
   );



 assert.equal(
   result.deviceId,
   "device-1"
 );



 const query =
   calls.agentUpsert[0] as any;



 assert.equal(
   query.update.isConnected,
   true
 );


 assert.ok(
   query.update.lastScanAt instanceof Date
 );


 assert.ok(
   query.update.lastHeartbeatAt instanceof Date
 );


});






/*
|--------------------------------------------------------------------------
| Test 4
| Device không tồn tại
|--------------------------------------------------------------------------
*/

test(
"heartbeat rejects unknown device",
async()=>{


 const {
   prisma
 } = createPrismaMock();



 prisma.device.findUnique =
 async()=>null;



 const service =
 new AgentService(prisma as never);



 await assert.rejects(

   service.heartbeat(
     "unknown-device",
     "agent-1"
   ),

   /Device not found/

 );


});






/*
|--------------------------------------------------------------------------
| Test 5
| Scan device không tồn tại
|--------------------------------------------------------------------------
*/

test(
"scan rejects unknown device",
async()=>{


 const {
   prisma
 } = createPrismaMock();



 prisma.device.findUnique =
 async()=>null;



 const service =
 new AgentService(prisma as never);



 await assert.rejects(

   service.recordScan(
     "unknown-device"
   ),

   /Device not found/

 );

});





/*
|--------------------------------------------------------------------------
| Test 6
| Agent version được lưu
|--------------------------------------------------------------------------
*/

test(
"heartbeat stores agent version",
async()=>{


 const {
   prisma,
   calls
 } = createPrismaMock();



 const service =
 new AgentService(prisma as never);



 await service.heartbeat(
   "device-1",
   "v3.1.0"
 );



 const query =
 calls.agentUpsert[0] as any;



 assert.equal(
   query.update.version,
   "v3.1.0"
 );


});
