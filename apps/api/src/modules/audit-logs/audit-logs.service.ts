import { Injectable } from "@nestjs/common"; import { PrismaService } from "../../prisma/prisma.service";
@Injectable() export class AuditLogsService { constructor(private prisma: PrismaService) {} findAll() { return this.prisma.auditLog.findMany({ include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 100 }); } }
