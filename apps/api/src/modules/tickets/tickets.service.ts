import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Role, TicketStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

const ticketInclude = {
  createdBy: { select: safeUserSelect },
  assignedTo: { select: safeUserSelect },
  comments: {
    include: {
      author: { select: safeUserSelect },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: { id: string; role: Role }) {
    return this.prisma.ticket.findMany({
      where: user.role === Role.USER ? { createdById: user.id } : undefined,
      include: ticketInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, user: { id: string; role: Role }) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: ticketInclude,
    });
    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }
    if (user.role === Role.USER && ticket.createdById !== user.id) {
      throw new ForbiddenException("You can only view your own tickets");
    }
    return ticket;
  }

  create(dto: CreateTicketDto, userId: string) {
    return this.prisma.ticket.create({
      data: { ...dto, createdById: userId },
      include: ticketInclude,
    });
  }

  async addComment(id: string, content: string, user: { id: string; role: Role }) {
    const trimmed = content?.trim() ?? "";
    if (!trimmed) {
      throw new BadRequestException("Comment content cannot be empty");
    }

    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }
    if (user.role === Role.USER && ticket.createdById !== user.id) {
      throw new ForbiddenException("You can only comment on your own tickets");
    }

    return this.prisma.ticketComment.create({
      data: {
        content: trimmed,
        ticketId: id,
        authorId: user.id,
      },
      include: {
        author: { select: safeUserSelect },
      },
    });
  }

  async assign(id: string, assignedToId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    const assignee = await this.prisma.user.findUnique({
      where: { id: assignedToId },
      select: { id: true, role: true, isActive: true },
    });
    if (!assignee) {
      throw new NotFoundException("Assignee user not found");
    }
    if (!assignee.isActive || assignee.role !== Role.IT_HELPDESK) {
      throw new BadRequestException("Ticket can only be assigned to an active IT Helpdesk user");
    }

    return this.prisma.ticket.update({
      where: { id },
      data: { assignedToId },
      include: ticketInclude,
    });
  }

  async updateStatus(id: string, dto: UpdateTicketStatusDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }
    return this.prisma.ticket.update({
      where: { id },
      data: { status: dto.status },
      include: ticketInclude,
    });
  }

  async close(id: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }
    if (ticket.createdById !== userId) {
      throw new ForbiddenException("Only the ticket creator can confirm resolution");
    }
    if (ticket.status !== TicketStatus.RESOLVED) {
      throw new BadRequestException("Ticket must be RESOLVED before closing");
    }

    return this.prisma.ticket.update({
      where: { id },
      data: { status: TicketStatus.CLOSED },
      include: ticketInclude,
    });
  }
}
