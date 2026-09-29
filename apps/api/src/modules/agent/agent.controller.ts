import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AgentTokenGuard } from "./agent-token.guard";
import { AgentService } from "./agent.service";
import {
  AgentHeartbeatDto,
  AgentScanDto,
} from "./dto/agent-event.dto";

@Controller("agent")
export class AgentController {
  constructor(private readonly service: AgentService) {}

  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.IT_HELPDESK,
    Role.SECURITY_ANALYST,
  )
  @Get("status")
  status() {
    return this.service.findAllStatus();
  }

  @Public()
  @UseGuards(AgentTokenGuard)
  @Post(":deviceId/heartbeat")
  heartbeat(
    @Param("deviceId") deviceId: string,
    @Body() dto: AgentHeartbeatDto,
  ) {
    return this.service.heartbeat(deviceId, dto);
  }

  @Public()
  @UseGuards(AgentTokenGuard)
  @Post(":deviceId/scan")
  scan(
    @Param("deviceId") deviceId: string,
    @Body() dto: AgentScanDto,
  ) {
    return this.service.scan(deviceId, dto);
  }
}