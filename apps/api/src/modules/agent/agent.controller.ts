import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { AgentService } from "./agent.service";
import { AgentTokenGuard } from "./agent-token.guard";
import { AgentHeartbeatDto, AgentScanDto } from "./dto/agent-event.dto";
import { AuditAction } from "../../common/decorators/audit-action.decorator";

@Controller("agent")
export class AgentController {
  constructor(private readonly service: AgentService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK, Role.SECURITY_ANALYST)
  @Get("status")
  status() {
    return this.service.findAllStatus();
  }

  @Roles(Role.ADMIN)
  @AuditAction("AGENT_CREDENTIAL_ROTATED", "Device")
  @Post("devices/:deviceId/credentials")
  issueCredential(@Param("deviceId") deviceId: string) {
    return this.service.issueCredential(deviceId);
  }

  @Public()
  @UseGuards(AgentTokenGuard)
  @Post(":deviceId/heartbeat")
  heartbeat(
    @Param("deviceId") deviceId: string,
    @Body() dto: AgentHeartbeatDto,
  ) {
    return this.service.heartbeat(deviceId, dto.version);
  }

  @Public()
  @UseGuards(AgentTokenGuard)
  @Post(":deviceId/scan")
  scan(@Param("deviceId") deviceId: string, @Body() dto: AgentScanDto) {
    return this.service.recordScan(deviceId, dto);
  }
}
