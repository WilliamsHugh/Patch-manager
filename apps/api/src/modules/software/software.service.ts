import { Injectable } from "@nestjs/common"; import { PrismaService } from "../../prisma/prisma.service";
@Injectable() export class SoftwareService { constructor(private prisma: PrismaService) {} findAll() { return this.prisma.software.findMany({ include: { _count: { select: { patches: true, installations: true } } }, orderBy: { name: "asc" } }); } }
