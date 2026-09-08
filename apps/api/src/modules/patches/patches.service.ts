import { Injectable } from "@nestjs/common"; import { PrismaService } from "../../prisma/prisma.service";
@Injectable() export class PatchesService { constructor(private prisma: PrismaService) {} findAll() { return this.prisma.patch.findMany({ include: { software: true }, orderBy: { releasedAt: "desc" } }); } }
