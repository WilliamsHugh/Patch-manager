import { Controller, Get, Query } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { FilterSecurityRiskDto } from "./dto/filter-security-risk.dto";
import { SecurityInventoryService } from "./security-inventory.service";

@Controller("security-inventory")
export class SecurityInventoryController {
  constructor(private readonly service: SecurityInventoryService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK, Role.SECURITY_ANALYST)
  @Get()
  findAll(@Query() filter: FilterSecurityRiskDto) {
    return this.service.findAll(filter);
  }
}
