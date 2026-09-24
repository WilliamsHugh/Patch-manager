import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateDeviceDto } from "./dto/create-device.dto";
import { FilterDeviceDto } from "./dto/filter-device.dto";
import { UpdateDeviceDto } from "./dto/update-device.dto";

const deviceInclude = {
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  installedSoftware: {
    include: {
      software: true,
    },
  },
  agentStatus: true,
} as const;

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: FilterDeviceDto = {}) {
    const keyword = filter.q?.trim();

    const where: Prisma.DeviceWhereInput = keyword
      ? {
          OR: [
            {
              hostname: {
                contains: keyword,
                mode: "insensitive",
              },
            },
            {
              ipAddress: {
                contains: keyword,
                mode: "insensitive",
              },
            },
            {
              department: {
                contains: keyword,
                mode: "insensitive",
              },
            },
            {
              owner: {
                OR: [
                  {
                    name: {
                      contains: keyword,
                      mode: "insensitive",
                    },
                  },
                  {
                    email: {
                      contains: keyword,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            },
          ],
        }
      : {};

    return this.prisma.device.findMany({
      where,
      include: deviceInclude,
      orderBy: {
        hostname: "asc",
      },
    });
  }

  async findOne(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: deviceInclude,
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    return device;
  }

  async findCompliance(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        installedSoftware: {
          include: {
            software: {
              include: {
                patches: {
                  select: {
                    id: true,
                    code: true,
                    title: true,
                    severity: true,
                    releasedAt: true,
                    requiresRestart: true,
                  },
                  orderBy: {
                    releasedAt: "desc",
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    const missingPatches = device.installedSoftware.flatMap((installation) => {
      const currentVersion = installation.software.currentVersion;

      if (
        !currentVersion ||
        !isOlderVersion(installation.version, currentVersion)
      ) {
        return [];
      }

      return installation.software.patches.map((patch) => ({
        patchId: patch.id,
        patchCode: patch.code,
        title: patch.title,
        severity: patch.severity,
        releasedAt: patch.releasedAt,
        requiresRestart: patch.requiresRestart,
        softwareId: installation.software.id,
        softwareName: installation.software.name,
        vendor: installation.software.vendor,
        installedVersion: installation.version,
        currentVersion,
      }));
    });

    return {
      deviceId: device.id,
      hostname: device.hostname,
      totalMissing: missingPatches.length,
      missingPatches,
    };
  }

  async create(dto: CreateDeviceDto) {
    const hostname = dto.hostname.trim();
    const operatingSystem = dto.operatingSystem.trim();

    if (!hostname || !operatingSystem) {
      throw new BadRequestException(
        "Hostname and operating system are required",
      );
    }

    if (dto.ownerId) {
      await this.assertOwnerExists(dto.ownerId);
    }

    try {
      return await this.prisma.device.create({
        data: {
          hostname,
          operatingSystem,
          ipAddress: dto.ipAddress?.trim() || null,
          department: dto.department?.trim() || null,
          status: dto.status,
          ownerId: dto.ownerId || null,
        },
        include: deviceInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(id: string, dto: UpdateDeviceDto) {
    const data: Prisma.DeviceUpdateInput = {};

    if (dto.hostname !== undefined) {
      const hostname = dto.hostname.trim();

      if (!hostname) {
        throw new BadRequestException("Hostname is required");
      }

      data.hostname = hostname;
    }

    if (dto.operatingSystem !== undefined) {
      const operatingSystem = dto.operatingSystem.trim();

      if (!operatingSystem) {
        throw new BadRequestException("Operating system is required");
      }

      data.operatingSystem = operatingSystem;
    }

    if (dto.ipAddress !== undefined) {
      data.ipAddress = dto.ipAddress?.trim() || null;
    }

    if (dto.department !== undefined) {
      data.department = dto.department?.trim() || null;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (dto.ownerId !== undefined) {
      if (dto.ownerId) {
        await this.assertOwnerExists(dto.ownerId);

        data.owner = {
          connect: { id: dto.ownerId },
        };
      } else {
        data.owner = {
          disconnect: true,
        };
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("No device fields provided");
    }

    try {
      return await this.prisma.device.update({
        where: { id },
        data,
        include: deviceInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.device.delete({
        where: { id },
      });

      return {
        id,
        deleted: true,
      };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  findMine(ownerId: string) {
    return this.prisma.device.findMany({
      where: { ownerId },
      include: deviceInclude,
      orderBy: {
        hostname: "asc",
      },
    });
  }

  private async assertOwnerExists(ownerId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true },
    });

    if (!owner) {
      throw new NotFoundException("Owner not found");
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ConflictException("Hostname already exists");
      }

      if (error.code === "P2025") {
        throw new NotFoundException("Device not found");
      }
    }

    throw error;
  }
}

function isOlderVersion(
  installedVersion: string,
  currentVersion: string,
): boolean {
  const installed = extractVersionNumbers(installedVersion);
  const current = extractVersionNumbers(currentVersion);

  const length = Math.max(installed.length, current.length);

  for (let index = 0; index < length; index += 1) {
    const installedPart = installed[index] ?? 0;
    const currentPart = current[index] ?? 0;

    if (installedPart < currentPart) {
      return true;
    }

    if (installedPart > currentPart) {
      return false;
    }
  }

  return false;
}

function extractVersionNumbers(version: string): number[] {
  return (version.match(/\d+/g) ?? []).map(Number);
}