import { Controller, Get } from "@nestjs/common"; import { Role } from "@prisma/client"; import { Roles } from "../../common/decorators/roles.decorator"; import { AuditLogsService } from "./audit-logs.service";
@Roles(Role.ADMIN) @Controller("audit-logs") export class AuditLogsController { constructor(private service: AuditLogsService) {} @Get() findAll() { return this.service.findAll(); } }
