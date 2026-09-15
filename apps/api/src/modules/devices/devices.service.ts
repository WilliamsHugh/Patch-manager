import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.device.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        installedSoftware: { include: { software: true } },
        agentStatus: true,
      },
      orderBy: { hostname: "asc" },
    });
  }

  findMine(ownerId: string) {
    return this.prisma.device.findMany({
      where: { ownerId },
      include: {
        installedSoftware: { include: { software: true } },
        agentStatus: true,
      },
      orderBy: { hostname: "asc" },
    });
  }
}
