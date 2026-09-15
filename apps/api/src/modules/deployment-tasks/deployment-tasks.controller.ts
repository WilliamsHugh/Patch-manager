import { Controller, Get } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { DeploymentTasksService } from "./deployment-tasks.service";

@Roles(Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK, Role.SECURITY_ANALYST)
@Controller("deployment-tasks")
export class DeploymentTasksController {
  constructor(private readonly service: DeploymentTasksService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
