import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { Role } from "@prisma/client";
import { AuditAction } from "../../common/decorators/audit-action.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { CreateSoftwareDto } from "./dto/create-software.dto";
import { UpdateSoftwareDto } from "./dto/update-software.dto";
import { SoftwareService } from "./software.service";

@Controller("software")
export class SoftwareController {
  constructor(private readonly service: SoftwareService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @AuditAction("SOFTWARE_CREATED", "Software")
  create(@Body() dto: CreateSoftwareDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  @AuditAction("SOFTWARE_UPDATED", "Software")
  update(@Param("id") id: string, @Body() dto: UpdateSoftwareDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @AuditAction("SOFTWARE_DELETED", "Software")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
