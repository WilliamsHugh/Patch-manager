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
}