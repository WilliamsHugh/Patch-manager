import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AgentService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}


  async findAllStatus() {

    const statuses =
      await this.prisma.agentStatus.findMany({

        include:{
          device:{
            select:{
              id:true,
              hostname:true,
              operatingSystem:true,
              status:true,
            },
          },
        },

        orderBy:{
          updatedAt:"desc",
        },

      });


    return statuses.map((status)=>({

      ...status,

      connectionState:
        this.getConnectionState(
          status.isConnected,
          status.lastHeartbeatAt,
        ),

    }));

  }



  async heartbeat(
    deviceId:string,
    version="unknown",
  ){

    await this.assertDeviceExists(deviceId);


    const now = new Date();



    const agent =
      await this.prisma.agentStatus.upsert({

        where:{
          deviceId,
        },


        update:{

          version,

          isConnected:true,

          lastHeartbeatAt:now,

        },


        create:{

          deviceId,

          version,

          isConnected:true,

          lastHeartbeatAt:now,

        },


        include:{
          device:{
            select:{
              id:true,
              hostname:true,
              status:true,
            },
          },
        },

      });



    // đồng bộ trạng thái device
    await this.prisma.device.update({

      where:{
        id:deviceId,
      },

      data:{
        status:"ONLINE",
      },

    });



    return agent;

  }




  async recordScan(deviceId:string){

    await this.assertDeviceExists(deviceId);


    const now = new Date();


    return this.prisma.agentStatus.upsert({

      where:{
        deviceId,
      },


      update:{

        isConnected:true,

        lastScanAt:now,

        lastHeartbeatAt:now,

      },


      create:{

        deviceId,

        version:"unknown",

        isConnected:true,

        lastHeartbeatAt:now,

        lastScanAt:now,

      },


      include:{
        device:{
          select:{
            id:true,
            hostname:true,
            status:true,
          },
        },
      },

    });

  }





  private async assertDeviceExists(
    deviceId:string,
  ){

    const device =
      await this.prisma.device.findUnique({

        where:{
          id:deviceId,
        },

        select:{
          id:true,
        },

      });



    if(!device){

      throw new NotFoundException(
        "Device not found",
      );

    }

  }





  private getConnectionState(
    isConnected:boolean,
    lastHeartbeatAt:Date|null,
  ){

    if(
      !isConnected ||
      !lastHeartbeatAt
    ){

      return "OFFLINE";

    }


    const timeout =
      5 * 60 * 1000;


    const elapsed =
      Date.now()
      -
      lastHeartbeatAt.getTime();



    return elapsed <= timeout
      ? "CONNECTED"
      : "OFFLINE";

  }

}