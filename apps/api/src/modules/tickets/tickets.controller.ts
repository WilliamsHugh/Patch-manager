import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { Role } from "@prisma/client";
import { AuditAction } from "../../common/decorators/audit-action.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { TicketsService } from "./tickets.service";

@Controller("tickets")
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK, Role.USER)
  @Get()
  findAll(@CurrentUser() user: { id: string; role: Role }) {
    return this.service.findAll(user);
  }

  @Roles(Role.USER, Role.IT_HELPDESK)
  @AuditAction("TICKET_CREATED", "Ticket")
  @Post()
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: { id: string }) {
    return this.service.create(dto, user.id);
  }

  @Roles(Role.IT_HELPDESK, Role.MANAGER, Role.ADMIN)
  @AuditAction("TICKET_STATUS_CHANGED", "Ticket")
  @Patch(":id/status")
  update(@Param("id") id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.service.updateStatus(id, dto);
  }
}
