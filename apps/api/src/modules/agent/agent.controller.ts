import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { AgentService } from "./agent.service";

@Roles(
  Role.ADMIN,
  Role.MANAGER,
  Role.IT_HELPDESK,
  Role.SECURITY_ANALYST,
)
@Controller("agent")
export class AgentController {
  constructor(private readonly service: AgentService) {}

  @Get("status")
  status() {
    return this.service.findAllStatus();
  }

  @Post(":deviceId/heartbeat")
  heartbeat(
    @Param("deviceId") deviceId: string,
    @Body("version") version?: string,
  ) {
    return this.service.heartbeat(deviceId, version);
  }

  @Post(":deviceId/scan")
  scan(@Param("deviceId") deviceId: string) {
    return this.service.recordScan(deviceId);
  }
}