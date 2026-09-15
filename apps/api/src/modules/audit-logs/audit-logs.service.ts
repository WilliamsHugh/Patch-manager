import { Injectable } from "@nestjs/common";
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

  findAll() {
    return this.prisma.auditLog.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}
