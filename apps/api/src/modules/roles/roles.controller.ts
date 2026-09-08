import { Controller, Get } from "@nestjs/common"; import { Role } from "@prisma/client"; import { Roles } from "../../common/decorators/roles.decorator"; import { RolesService } from "./roles.service";
@Roles(Role.ADMIN) @Controller("roles") export class RolesController { constructor(private service: RolesService) {} @Get() findAll() { return this.service.findAll(); } }
