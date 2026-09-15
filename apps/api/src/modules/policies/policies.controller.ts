import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { Role } from "@prisma/client";
import { AuditAction } from "../../common/decorators/audit-action.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UpdatePolicyDto } from "./dto/update-policy.dto";
import { PoliciesService } from "./policies.service";

@Controller("policies")
export class PoliciesController {
  constructor(private readonly service: PoliciesService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK, Role.SECURITY_ANALYST)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles(Role.ADMIN)
  @AuditAction("POLICY_UPDATED", "Policy")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdatePolicyDto, @CurrentUser() user: { id: string }) {
    return this.service.update(id, dto, user.id);
  }
}
