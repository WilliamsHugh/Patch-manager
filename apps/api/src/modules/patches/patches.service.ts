import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { CreatePatchDto } from "./dto/create-patch.dto";
import { FilterPatchDto } from "./dto/filter-patch.dto";
import { UpdatePatchDto } from "./dto/update-patch.dto";
import { SecurityReviewDto } from "./dto/security-review.dto";
import { ManagerDecisionDto } from "./dto/manager-decision.dto";

@Injectable()
export class PatchesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // GET /api/patches
  findAll(filter: FilterPatchDto) {
    return this.prisma.patch.findMany({
      where: {
        ...(filter.severity !== undefined && {
          severity: filter.severity,
        }),

        ...(filter.softwareId !== undefined && {
          softwareId: filter.softwareId,
        }),
      },

      include: {
        software: true,
      },

      orderBy: {
        releasedAt: "desc",
      },
    });
  }

  // GET /api/patches/:id
  async findOne(id: string) {
    const patch =
      await this.prisma.patch.findUnique({
        where: {
          id,
        },

        include: {
          software: true,
        },
      });

    if (!patch) {
      throw new NotFoundException(
        "Patch not found",
      );
    }

    return patch;
  }

  // POST /api/patches
  async create(data: CreatePatchDto) {
    const existingPatch =
      await this.prisma.patch.findUnique({
        where: {
          code: data.code,
        },
      });

    if (existingPatch) {
      throw new ConflictException(
        "Patch with this code already exists",
      );
    }

    const software =
      await this.prisma.software.findUnique({
        where: {
          id: data.softwareId,
        },
      });

    if (!software) {
      throw new NotFoundException(
        "Software not found",
      );
    }

    return this.prisma.patch.create({
      data: {
        code: data.code,
        title: data.title,
        description:
          data.description ?? null,
        version:
          data.version ?? null,
        severity: data.severity,
        releasedAt: new Date(
          data.releasedAt,
        ),
        requiresRestart:
          data.requiresRestart ?? false,
        softwareId: data.softwareId,
      },

      include: {
        software: true,
      },
    });
  }

  // PATCH /api/patches/:id
  async update(
    id: string,
    data: UpdatePatchDto,
  ) {
    const patch =
      await this.prisma.patch.findUnique({
        where: {
          id,
        },
      });

    if (!patch) {
      throw new NotFoundException(
        "Patch not found",
      );
    }

    // Kiểm tra code bị trùng khi thay đổi
    if (
      data.code !== undefined &&
      data.code !== patch.code
    ) {
      const existingPatch =
        await this.prisma.patch.findUnique({
          where: {
            code: data.code,
          },
        });

      if (
        existingPatch &&
        existingPatch.id !== id
      ) {
        throw new ConflictException(
          "Patch with this code already exists",
        );
      }
    }

    // Kiểm tra software tồn tại nếu thay đổi softwareId
    if (
      data.softwareId !== undefined &&
      data.softwareId !== patch.softwareId
    ) {
      const software =
        await this.prisma.software.findUnique({
          where: {
            id: data.softwareId,
          },
        });

      if (!software) {
        throw new NotFoundException(
          "Software not found",
        );
      }
    }

    return this.prisma.patch.update({
      where: {
        id,
      },

      data: {
        ...(data.code !== undefined && {
          code: data.code,
        }),

        ...(data.title !== undefined && {
          title: data.title,
        }),

        ...(data.description !== undefined && {
          description: data.description,
        }),

        ...(data.version !== undefined && {
          version: data.version,
        }),

        ...(data.severity !== undefined && {
          severity: data.severity,
        }),

        ...(data.releasedAt !== undefined && {
          releasedAt: new Date(
            data.releasedAt,
          ),
        }),

        ...(data.requiresRestart !==
          undefined && {
          requiresRestart:
            data.requiresRestart,
        }),

        ...(data.softwareId !== undefined && {
          softwareId: data.softwareId,
        }),
        patchStatus: "PENDING_REVIEW",
        securityNote: null,
        securityDecision: null,
        securityReviewedAt: null,
        securityReviewedById: null,
        managerDecision: null,
        managerReviewedAt: null,
        managerReviewedById: null,
      },

      include: {
        software: true,
      },
    });
  }

  // DELETE /api/patches/:id
  async remove(id: string) {
    const patch =
      await this.prisma.patch.findUnique({
        where: {
          id,
        },
      });

    if (!patch) {
      throw new NotFoundException(
        "Patch not found",
      );
    }

    await this.prisma.patch.delete({
      where: {
        id,
      },
    });

    return {
      id,
      deleted: true,
    };
  }

  async securityReview(id: string, dto: SecurityReviewDto, reviewerId: string) {
    const note = dto.securityNote.trim();
    if (note.length < 10) throw new BadRequestException("Security report must contain at least 10 characters");
    const result = await this.prisma.patch.updateMany({
      where: { id, patchStatus: "PENDING_REVIEW" },
      data: {
        securityNote: note,
        securityDecision: dto.securityDecision,
        securityReviewedAt: new Date(),
        securityReviewedById: reviewerId,
        patchStatus: dto.securityDecision === "SKIP" ? "SKIPPED" : "UNDER_REVIEW",
      },
    });
    if (!result.count) await this.assertReviewTransition(id, "Only pending patches can be reviewed by Security Analyst");
    return this.findOne(id);
  }

  async managerDecision(id: string, dto: ManagerDecisionDto, reviewerId: string) {
    const result = await this.prisma.patch.updateMany({
      where: { id, patchStatus: "UNDER_REVIEW", securityDecision: "DEPLOY" },
      data: {
        managerDecision: dto.managerDecision,
        managerReviewedAt: new Date(),
        managerReviewedById: reviewerId,
        patchStatus: dto.managerDecision,
      },
    });
    if (!result.count) await this.assertReviewTransition(id, "Only patches recommended for deployment can be decided by Manager");
    return this.findOne(id);
  }

  private async assertReviewTransition(id: string, message: string): Promise<never> {
    const patch = await this.prisma.patch.findUnique({ where: { id }, select: { id: true } });
    if (!patch) throw new NotFoundException("Patch not found");
    throw new BadRequestException(message);
  }
}
