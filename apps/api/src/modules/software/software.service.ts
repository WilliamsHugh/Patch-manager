import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { CreateSoftwareDto } from "./dto/create-software.dto";
import { UpdateSoftwareDto } from "./dto/update-software.dto";

@Injectable()
export class SoftwareService {
  constructor(private prisma: PrismaService) {}

  // GET /api/software
  findAll() {
    return this.prisma.software.findMany({
      include: {
        _count: {
          select: {
            patches: true,
            installations: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  // POST /api/software
  async create(data: CreateSoftwareDto) {
    const existing = await this.prisma.software.findUnique({
      where: {
        name_vendor: {
          name: data.name,
          vendor: data.vendor,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        "Software with this name and vendor already exists",
      );
    }

    return this.prisma.software.create({
      data: {
        name: data.name,
        vendor: data.vendor,
        currentVersion: data.currentVersion ?? null,
      },
    });
  }

  // PATCH /api/software/:id
  async update(id: string, data: UpdateSoftwareDto) {
    const software = await this.prisma.software.findUnique({
      where: {
        id,
      },
    });

    if (!software) {
      throw new NotFoundException("Software not found");
    }

    // Nếu đổi name hoặc vendor thì kiểm tra unique (name + vendor)
    if (data.name !== undefined || data.vendor !== undefined) {
      const name = data.name ?? software.name;
      const vendor = data.vendor ?? software.vendor;

      const existing = await this.prisma.software.findUnique({
        where: {
          name_vendor: {
            name,
            vendor,
          },
        },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          "Software with this name and vendor already exists",
        );
      }
    }

    return this.prisma.software.update({
      where: {
        id,
      },
      data: {
        ...(data.name !== undefined && {
          name: data.name,
        }),

        ...(data.vendor !== undefined && {
          vendor: data.vendor,
        }),

        ...(data.currentVersion !== undefined && {
          currentVersion: data.currentVersion,
        }),
      },
    });
  }
}