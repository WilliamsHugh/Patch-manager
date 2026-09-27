import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, Role, TicketStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AssignTicketDto } from "./dto/assign-ticket.dto";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";

// Linear workflow from the delivery plan: OPEN -> IN_PROGRESS -> WAITING_USER -> RESOLVED -> CLOSED.
// Forward moves may skip intermediate states; only RESOLVED can be reopened; CLOSED is terminal.
export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.WAITING_USER, TicketStatus.RESOLVED, TicketStatus.CLOSED],
  [TicketStatus.WAITING_USER]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  [TicketStatus.CLOSED]: [],
};

const OPERATION_ROLES: Role[] = [Role.ADMIN, Role.MANAGER, Role.IT_HELPDESK];

type StatusActor = { id: string; role: Role };

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
        comments: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
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
}
