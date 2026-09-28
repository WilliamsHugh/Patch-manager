import { Injectable } from "@nestjs/common";
import { PatchSeverity, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { FilterSecurityRiskDto } from "./dto/filter-security-risk.dto";

const riskInclude = {
  software: {
    select: {
      id: true,
      name: true,
      vendor: true,
      currentVersion: true,
      installations: {
        select: {
          version: true,
          device: {
            select: {
              id: true,
              hostname: true,
              department: true,
              status: true,
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class SecurityInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: FilterSecurityRiskDto = {}) {
    const keyword = filter.q?.trim();
    const where: Prisma.PatchWhereInput = {
      ...(filter.severity ? { severity: filter.severity } : {}),
      ...(filter.softwareId ? { softwareId: filter.softwareId } : {}),
      ...(keyword
        ? {
            OR: [
              { code: { contains: keyword, mode: "insensitive" } },
              { title: { contains: keyword, mode: "insensitive" } },
              {
                software: {
                  name: { contains: keyword, mode: "insensitive" },
                },
              },
              {
                software: {
                  vendor: { contains: keyword, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };

    const patches = await this.prisma.patch.findMany({
      where,
      include: riskInclude,
      orderBy: [{ severity: "desc" }, { releasedAt: "desc" }],
    });

    const items: SecurityRiskItem[] = patches.map((patch) => {
      const targetVersion = patch.software.currentVersion ?? patch.version;
      const affectedDevices = targetVersion
        ? patch.software.installations
            .filter((installation) =>
              isOlderVersion(installation.version, targetVersion),
            )
            .map((installation) => installation.device)
        : [];

      return {
        id: patch.id,
        code: patch.code,
        title: patch.title,
        severity: patch.severity,
        releasedAt: patch.releasedAt,
        requiresRestart: patch.requiresRestart,
        software: {
          id: patch.software.id,
          name: patch.software.name,
          vendor: patch.software.vendor,
          currentVersion: patch.software.currentVersion,
        },
        targetVersion,
        affectedDeviceCount: affectedDevices.length,
        affectedDevices,
      };
    });

    const affectedDeviceIds = new Set(
      items.flatMap((item) => item.affectedDevices.map((device) => device.id)),
    );

    return {
      summary: {
        total: items.length,
        critical: countSeverity(items, PatchSeverity.CRITICAL),
        high: countSeverity(items, PatchSeverity.HIGH),
        medium: countSeverity(items, PatchSeverity.MEDIUM),
        low: countSeverity(items, PatchSeverity.LOW),
        affectedDevices: affectedDeviceIds.size,
      },
      items,
    };
  }
}

type SecurityRiskDevice = {
  id: string;
  hostname: string;
  department: string | null;
  status: string;
};

type SecurityRiskItem = {
  id: string;
  code: string;
  title: string;
  severity: PatchSeverity;
  releasedAt: Date;
  requiresRestart: boolean;
  targetVersion: string | null;
  software: {
    id: string;
    name: string;
    vendor: string;
    currentVersion: string | null;
  };
  affectedDeviceCount: number;
  affectedDevices: SecurityRiskDevice[];
};

function countSeverity(items: SecurityRiskItem[], severity: PatchSeverity) {
  return items.filter((item) => item.severity === severity).length;
}

function isOlderVersion(installedVersion: string, targetVersion: string) {
  const installed = extractVersionNumbers(installedVersion);
  const target = extractVersionNumbers(targetVersion);
  const length = Math.max(installed.length, target.length);

  for (let index = 0; index < length; index += 1) {
    const installedPart = installed[index] ?? 0;
    const targetPart = target[index] ?? 0;

    if (installedPart < targetPart) return true;
    if (installedPart > targetPart) return false;
  }

  return false;
}

function extractVersionNumbers(version: string) {
  return (version.match(/\d+/g) ?? []).map(Number);
}
