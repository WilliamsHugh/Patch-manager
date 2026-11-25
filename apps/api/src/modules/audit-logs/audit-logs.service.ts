import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type AuditRecord = {
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string;
  metadata: Prisma.InputJsonValue;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  record(entry: AuditRecord) {
    return this.prisma.auditLog.create({ data: entry });
  }

  findAll(filter: { entityType?: string; from?: string; to?: string; cursor?: string; limit?: number } = {}) {
    if (filter.limit !== undefined && (!Number.isInteger(filter.limit) || filter.limit < 1 || filter.limit > 100)) {
      throw new BadRequestException("Limit must be an integer between 1 and 100.");
    }
    const limit = filter.limit ?? 25;
    const from = filter.from ? new Date(filter.from) : undefined;
    const to = filter.to ? new Date(filter.to) : undefined;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || (from && to && from > to)) {
      throw new BadRequestException("Invalid audit log date range.");
    }
    return this.prisma.auditLog.findMany({
      where: { entityType: filter.entityType || undefined, createdAt: from || to ? { gte: from, lte: to } : undefined },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      cursor: filter.cursor ? { id: filter.cursor } : undefined,
      skip: filter.cursor ? 1 : 0,
      take: limit,
    });
  }
}
