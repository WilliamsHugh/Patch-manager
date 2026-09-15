import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { Role } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get("me")
  me(@CurrentUser() user: { id: string }) {
    return this.service.findMe(user.id);
  }

  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles(Role.ADMIN)
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: { id: string }) {
    return this.service.update(id, dto, actor.id);
  }

  @Roles(Role.ADMIN)
  @Delete(":id")
  deactivate(@Param("id") id: string, @CurrentUser() actor: { id: string }) {
    return this.service.deactivate(id, actor.id);
  }
}
