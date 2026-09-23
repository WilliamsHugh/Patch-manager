import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { AuditAction } from "../../common/decorators/audit-action.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { FilterDeviceDto } from "./dto/filter-device.dto";
import { UpdateDeviceDto } from "./dto/update-device.dto";
import { DevicesService } from "./devices.service";

@Controller("devices")
export class DevicesController {
  constructor(private readonly service: DevicesService) {}

  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.IT_HELPDESK,
    Role.SECURITY_ANALYST,
  )
  @Get()
  findAll(@Query() filter: FilterDeviceDto) {
    return this.service.findAll(filter);
  }

  @Roles(Role.USER)
  @Get("me")
  findMine(@CurrentUser() user: { id: string }) {
    return this.service.findMine(user.id);
  }

  @Roles(
    Role.ADMIN,
    Role.MANAGER,
    Role.IT_HELPDESK,
    Role.SECURITY_ANALYST,
  )
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  @AuditAction("DEVICE_CREATED", "Device")
  create(@Body() dto: CreateDeviceDto) {
    return this.service.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(":id")
  @AuditAction("DEVICE_UPDATED", "Device")
  update(@Param("id") id: string, @Body() dto: UpdateDeviceDto) {
    return this.service.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(":id")
  @AuditAction("DEVICE_DELETED", "Device")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}