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
import { SecurityReviewDto } from "./dto/security-review.dto";
import { ManagerDecisionDto } from "./dto/manager-decision.dto";

import { Roles } from "../../common/decorators/roles.decorator";
import { CreatePatchDto } from "./dto/create-patch.dto";
import { FilterPatchDto } from "./dto/filter-patch.dto";
import { UpdatePatchDto } from "./dto/update-patch.dto";
import { PatchesService } from "./patches.service";

@Controller("patches")
export class PatchesController {
  constructor(
    private readonly service: PatchesService,
  ) {}

  // GET /api/patches
  @Get()
  findAll(
    @Query() filter: FilterPatchDto,
  ) {
    return this.service.findAll(filter);
  }

  // GET /api/patches/:id
  @Get(":id")
  findOne(
    @Param("id") id: string,
  ) {
    return this.service.findOne(id);
  }

  // POST /api/patches
  // Chỉ ADMIN được tạo patch
  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body() data: CreatePatchDto,
  ) {
    return this.service.create(data);
  }

  // PATCH /api/patches/:id
  // Chỉ ADMIN được sửa patch
  @Patch(":id")
  @Roles(Role.ADMIN)
  update(
    @Param("id") id: string,
    @Body() data: UpdatePatchDto,
  ) {
    return this.service.update(id, data);
  }

  // DELETE /api/patches/:id
  // Chỉ ADMIN được xóa patch
  @Delete(":id")
  @Roles(Role.ADMIN)
  remove(
    @Param("id") id: string,
  ) {
    return this.service.remove(id);
  }

  @Post(":id/security-review")
  @Roles(Role.SECURITY_ANALYST)
  @AuditAction("PATCH_SECURITY_REVIEWED", "Patch")
  securityReview(@Param("id") id: string, @Body() dto: SecurityReviewDto, @CurrentUser() user: { id: string }) {
    return this.service.securityReview(id, dto, user.id);
  }

  @Post(":id/manager-decision")
  @Roles(Role.MANAGER)
  @AuditAction("PATCH_MANAGER_DECISION", "Patch")
  managerDecision(@Param("id") id: string, @Body() dto: ManagerDecisionDto, @CurrentUser() user: { id: string }) {
    return this.service.managerDecision(id, dto, user.id);
  }
}
