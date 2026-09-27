import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Role, TicketStatus } from "@prisma/client";
import { TICKET_TRANSITIONS } from "@patch-management/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { AssignTicketDto } from "./dto/assign-ticket.dto";
import { CreateTicketCommentDto } from "./dto/create-ticket-comment.dto";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";

const OPERATION_ROLES: Role[] = [Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK];

type StatusActor = { id: string; role: Role };

const commentInclude = { author: { select: { id: true, name: true } } } satisfies Prisma.TicketCommentInclude;

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: { id: string; role: Role }, options?: { assignedToMe?: boolean }) {
    const where: Prisma.TicketWhereInput | undefined =
      user.role === Role.USER
        ? { createdById: user.id }
        : options?.assignedToMe
          ? { assignedToId: user.id }
          : undefined;

    return this.prisma.ticket.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true } },
        comments: { include: commentInclude, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  create(dto: CreateTicketDto, userId: string) {
    return this.prisma.ticket.create({ data: { ...dto, createdById: userId } });
  }

  async updateStatus(id: string, dto: UpdateTicketStatusDto, actor: StatusActor) {
    if (actor.role === Role.USER) {
      throw new ForbiddenException("Requesters cannot change ticket status");
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, createdById: true, assignedToId: true },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");

    const allowedTargets = TICKET_TRANSITIONS[ticket.status] ?? [];
    if (!allowedTargets.includes(dto.status)) {
      const nextSteps = allowedTargets.length ? allowedTargets.join(", ") : "none (the ticket is closed)";
      throw new BadRequestException(`Cannot move ticket from ${ticket.status} to ${dto.status}. Allowed next states: ${nextSteps}`);
    }

    const recipients = [...new Set([ticket.createdById, ticket.assignedToId].filter((value): value is string => Boolean(value)))]
      .filter((userId) => userId !== actor.id);

    const operations: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.ticket.update({ where: { id }, data: { status: dto.status } }),
    ];
    if (recipients.length) {
      operations.push(
        this.prisma.notification.createMany({
          data: recipients.map((userId) => ({
            userId,
            title: "Ticket status updated",
            message: `"${ticket.title}" moved from ${ticket.status} to ${dto.status}.`,
          })),
        }),
      );
    }

    const [updated] = await this.prisma.$transaction(operations);
    return updated;
  }

  async assign(id: string, dto: AssignTicketDto, actor: StatusActor) {
    if (!OPERATION_ROLES.includes(actor.role)) {
      throw new ForbiddenException("Only operations roles can assign tickets");
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { id: true, title: true, status: true },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException("Closed tickets cannot be reassigned");
    }

    if (dto.assignedToId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assignedToId },
        select: { isActive: true },
      });
      if (!assignee?.isActive) throw new BadRequestException("Assignee must be an active user");
    }

    const operations: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.ticket.update({ where: { id }, data: { assignedToId: dto.assignedToId } }),
    ];
    if (dto.assignedToId && dto.assignedToId !== actor.id) {
      operations.push(
        this.prisma.notification.create({
          data: {
            userId: dto.assignedToId,
            title: "Ticket assigned to you",
            message: `You were assigned to "${ticket.title}".`,
          },
        }),
      );
    }

    const [updated] = await this.prisma.$transaction(operations);
    return updated;
  }

  async addComment(id: string, dto: CreateTicketCommentDto, author: { id: string; role: Role }) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { id: true, createdById: true, assignedToId: true, status: true },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");

    const isRequester = ticket.createdById === author.id;
    const isAssignee = ticket.assignedToId === author.id;
    if (author.role === Role.USER && !isRequester) {
      throw new ForbiddenException("You can only comment on your own tickets");
    }
    if (!OPERATION_ROLES.includes(author.role) && !isRequester && !isAssignee) {
      throw new ForbiddenException("Only requesters, assignees, and operations roles can comment");
    }
    if (ticket.status === TicketStatus.CLOSED && !OPERATION_ROLES.includes(author.role)) {
      throw new ForbiddenException("Closed tickets are read-only");
    }

    return this.prisma.ticketComment.create({
      data: { ticketId: id, authorId: author.id, content: dto.content.trim() },
      include: commentInclude,
    });
  }

  listAssignables() {
    return this.prisma.user.findMany({
      where: { role: { in: [Role.IT_HELPDESK, Role.MANAGER, Role.ADMIN] }, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
  }
}
