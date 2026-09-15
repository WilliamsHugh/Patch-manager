import { Controller, Get } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { DevicesService } from "./devices.service";

@Controller("devices")
export class DevicesController {
  constructor(private readonly service: DevicesService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK, Role.SECURITY_ANALYST)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles(Role.USER)
  @Get("me")
  findMine(@CurrentUser() user: { id: string }) {
    return this.service.findMine(user.id);
  }
}
