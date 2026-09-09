import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PlanStatus, Prisma, TaskStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateDeploymentPlanDto } from "./dto/create-deployment-plan.dto";
import { ReviewDeploymentPlanDto } from "./dto/review-deployment-plan.dto";
import { UpdateDeploymentPlanDto } from "./dto/update-deployment-plan.dto";

const planInclude = {
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  reviewedBy: { select: { id: true, name: true, email: true, role: true } },
  devices: { include: { device: true } },
  tasks: { include: { device: true, patch: { include: { software: true } } } },
} satisfies Prisma.DeploymentPlanInclude;

const editableStatuses: PlanStatus[] = [PlanStatus.DRAFT, PlanStatus.CHANGES_REQUESTED];

@Injectable()
export class DeploymentPlansService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.deploymentPlan.findMany({
      include: planInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.deploymentPlan.findUnique({
      where: { id },
      include: planInclude,
    });
    if (!plan) throw new NotFoundException("Không tìm thấy kế hoạch triển khai");
    return plan;
  }

  async create(dto: CreateDeploymentPlanDto, userId: string) {
    const deviceIds = [...new Set(dto.deviceIds)];
    const patchIds = [...new Set(dto.patchIds)];
    await this.assertDevicesAndPatchesExist(deviceIds, patchIds);

    return this.prisma.$transaction((tx) =>
      tx.deploymentPlan.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
          status: PlanStatus.DRAFT,
          createdById: userId,
          devices: { create: deviceIds.map((deviceId) => ({ deviceId })) },
          tasks: {
            create: deviceIds.flatMap((deviceId) =>
              patchIds.map((patchId) => ({
                deviceId,
                patchId,
              })),
            ),
          },
        },
        include: planInclude,
      }),
    );
  }

  async update(id: string, dto: UpdateDeploymentPlanDto) {
    const plan = await this.prisma.deploymentPlan.findUnique({
      where: { id },
      include: {
        devices: true,
        tasks: { select: { patchId: true } },
      },
    });
    if (!plan) throw new NotFoundException("Không tìm thấy kế hoạch triển khai");
    if (!editableStatuses.includes(plan.status)) {
      throw new BadRequestException("Chỉ được chỉnh sửa kế hoạch ở trạng thái DRAFT hoặc CHANGES_REQUESTED");
    }

    const deviceIds = dto.deviceIds ? [...new Set(dto.deviceIds)] : plan.devices.map((device) => device.deviceId);
    const patchIds = dto.patchIds ? [...new Set(dto.patchIds)] : [...new Set(plan.tasks.map((task) => task.patchId))];
    await this.assertDevicesAndPatchesExist(deviceIds, patchIds);

    return this.prisma.$transaction(async (tx) => {
      if (dto.deviceIds || dto.patchIds) {
        await tx.deploymentTask.deleteMany({ where: { planId: id } });
        await tx.deploymentPlanDevice.deleteMany({ where: { planId: id } });
      }

      return tx.deploymentPlan.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description === undefined ? undefined : dto.description.trim() || null,
          scheduledAt: dto.scheduledAt === undefined ? undefined : new Date(dto.scheduledAt),
          ...(dto.deviceIds || dto.patchIds
            ? {
                devices: { create: deviceIds.map((deviceId) => ({ deviceId })) },
                tasks: {
                  create: deviceIds.flatMap((deviceId) =>
                    patchIds.map((patchId) => ({
                      deviceId,
                      patchId,
                    })),
                  ),
                },
              }
            : {}),
        },
        include: planInclude,
      });
    });
  }

  async remove(id: string) {
    const plan = await this.prisma.deploymentPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException("Không tìm thấy kế hoạch triển khai");
    if (plan.status !== PlanStatus.DRAFT) {
      throw new BadRequestException("Chỉ được xóa kế hoạch ở trạng thái DRAFT");
    }

    await this.prisma.deploymentPlan.delete({ where: { id } });
    return { deleted: true };
  }

  async review(id: string, dto: ReviewDeploymentPlanDto, reviewerId: string) {
    const plan = await this.prisma.deploymentPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException("Không tìm thấy kế hoạch triển khai");

    return this.prisma.deploymentPlan.update({
      where: { id },
      data: { status: dto.status, reviewNote: dto.reviewNote, reviewedAt: new Date(), reviewedById: reviewerId },
    });
  }

  async deploy(id: string) {
    const plan = await this.prisma.deploymentPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException("Không tìm thấy kế hoạch");
    if (plan.status !== PlanStatus.APPROVED) throw new BadRequestException("Chỉ kế hoạch đã duyệt mới được triển khai");
    return this.prisma
      .$transaction([
        this.prisma.deploymentPlan.update({ where: { id }, data: { status: PlanStatus.DEPLOYING } }),
        this.prisma.deploymentTask.updateMany({ where: { planId: id }, data: { status: TaskStatus.PENDING } }),
      ])
      .then(([result]) => result);
  }

  private async assertDevicesAndPatchesExist(deviceIds: string[], patchIds: string[]) {
    const [devices, patches] = await Promise.all([
      this.prisma.device.findMany({ where: { id: { in: deviceIds } }, select: { id: true } }),
      this.prisma.patch.findMany({ where: { id: { in: patchIds } }, select: { id: true } }),
    ]);

    const foundDeviceIds = new Set(devices.map((device) => device.id));
    const foundPatchIds = new Set(patches.map((patch) => patch.id));
    const missingDeviceIds = deviceIds.filter((deviceId) => !foundDeviceIds.has(deviceId));
    const missingPatchIds = patchIds.filter((patchId) => !foundPatchIds.has(patchId));

    if (missingDeviceIds.length) {
      throw new NotFoundException(`Không tìm thấy thiết bị: ${missingDeviceIds.join(", ")}`);
    }
    if (missingPatchIds.length) {
      throw new NotFoundException(`Không tìm thấy bản vá: ${missingPatchIds.join(", ")}`);
    }
  }
}
