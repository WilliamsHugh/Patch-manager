import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { DeploymentPlansService } from "./deployment-plans.service";
import { CreateDeploymentPlanDto } from "./dto/create-deployment-plan.dto";
import { ReviewDeploymentPlanDto } from "./dto/review-deployment-plan.dto";
import { UpdateDeploymentPlanDto } from "./dto/update-deployment-plan.dto";

@Controller("deployment-plans")
export class DeploymentPlansController {
  constructor(private service: DeploymentPlansService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK, Role.SECURITY_ANALYST)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK, Role.SECURITY_ANALYST)
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Roles(Role.IT_HELPDESK)
  @Post()
  create(@Body() dto: CreateDeploymentPlanDto, @CurrentUser() user: { id: string }) {
    return this.service.create(dto, user.id);
  }

  @Roles(Role.IT_HELPDESK)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateDeploymentPlanDto) {
    return this.service.update(id, dto);
  }

  @Roles(Role.IT_HELPDESK)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }

  @Roles(Role.MANAGER)
  @Patch(":id/review")
  review(@Param("id") id: string, @Body() dto: ReviewDeploymentPlanDto, @CurrentUser() user: { id: string }) {
    return this.service.review(id, dto, user.id);
  }

  @Roles(Role.IT_HELPDESK)
  @Post(":id/deploy")
  deploy(@Param("id") id: string) {
    return this.service.deploy(id);
  }
}
