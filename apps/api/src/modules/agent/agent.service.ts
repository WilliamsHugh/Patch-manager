import { Injectable } from "@nestjs/common"; import { PrismaService } from "../../prisma/prisma.service";
@Injectable() export class AgentService { constructor(private prisma: PrismaService) {} findAllStatus() { return this.prisma.agentStatus.findMany({ include: { device: { select: { id: true, hostname: true, status: true } } }, orderBy: { updatedAt: "desc" } }); } }
