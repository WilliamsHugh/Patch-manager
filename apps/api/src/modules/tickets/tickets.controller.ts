import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { Role } from "@prisma/client";
import { AuditAction } from "../../common/decorators/audit-action.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { AssignTicketDto } from "./dto/assign-ticket.dto";
import { CreateTicketCommentDto } from "./dto/create-ticket-comment.dto";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { TicketsService } from "./tickets.service";

@Controller("tickets")
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK, Role.USER)
  @Get()
  findAll(
    @CurrentUser() user: { id: string; role: Role },
    @Query("assignedToMe") assignedToMe?: string,
  ) {
    return this.service.findAll(user, { assignedToMe: assignedToMe === "true" });
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK)
  @Get("assignables")
  listAssignables() {
    return this.service.listAssignables();
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
  updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.updateStatus(id, dto, user);
  }

  @Roles(Role.IT_HELPDESK, Role.MANAGER, Role.ADMIN)
  @AuditAction("TICKET_ASSIGNED", "Ticket")
  @Patch(":id/assign")
  assign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignTicketDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.assign(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK, Role.USER)
  @AuditAction("TICKET_COMMENTED", "Ticket")
  @Post(":id/comments")
  addComment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateTicketCommentDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.service.addComment(id, dto, user);
  }
}
