import { Controller, Get } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { AgentService } from "./agent.service";

@Roles(Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK, Role.SECURITY_ANALYST)
@Controller("agent")
export class AgentController {
  constructor(private readonly service: AgentService) {}

  @Get("status")
  status() {
    return this.service.findAllStatus();
  }
}
