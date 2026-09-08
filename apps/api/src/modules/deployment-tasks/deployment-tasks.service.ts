import { Injectable } from "@nestjs/common"; import { PrismaService } from "../../prisma/prisma.service";
@Injectable() export class DeploymentTasksService { constructor(private prisma: PrismaService) {} findAll() { return this.prisma.deploymentTask.findMany({ include: { device: true, patch: true, plan: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } }); } }
