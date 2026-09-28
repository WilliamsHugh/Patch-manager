import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { AgentService } from "./agent.service";
import { AgentTokenGuard } from "./agent-token.guard";

@Controller("agent")
export class AgentController {
  constructor(private readonly service: AgentService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK, Role.SECURITY_ANALYST)
  @Get("status")
  status() {
    return this.service.findAllStatus();
  }

  @Public()
  @UseGuards(AgentTokenGuard)
  @Post(":deviceId/heartbeat")
  heartbeat(
    @Param("deviceId") deviceId: string,
    @Body("version") version?: string,
  ) {
    return this.service.heartbeat(deviceId, version);
  }

  @Public()
  @UseGuards(AgentTokenGuard)
  @Post(":deviceId/scan")
  scan(@Param("deviceId") deviceId: string) {
    return this.service.recordScan(deviceId);
  }
}
