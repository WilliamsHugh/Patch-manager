import { Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: { id: string; role: Role }) {
    return this.prisma.ticket.findMany({
      where: user.role === Role.USER ? { createdById: user.id } : undefined,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true } },
        comments: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  create(dto: CreateTicketDto, userId: string) {
    return this.prisma.ticket.create({ data: { ...dto, createdById: userId } });
  }

  updateStatus(id: string, dto: UpdateTicketStatusDto) {
    return this.prisma.ticket.update({ where: { id }, data: { status: dto.status } });
  }
}
