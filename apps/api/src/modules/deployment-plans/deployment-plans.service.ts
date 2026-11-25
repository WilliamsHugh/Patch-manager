import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
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
  private readonly logger = new Logger(DeploymentPlansService.name);
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
    if (!plan) throw new NotFoundException("Deployment plan not found");
    return plan;
  }

  async create(dto: CreateDeploymentPlanDto, userId: string) {
    const deviceIds = [...new Set(dto.deviceIds)];
    const patchIds = [...new Set(dto.patchIds)];
    const failSet = new Set(dto.forceFailureTaskIds ?? []);
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
                forceFailure: this.shouldForceFailure(failSet, deviceId, patchId),
              })),
            ),
          },
        },
        include: planInclude,
      }),
    );
  }

  async update(id: string, dto: UpdateDeploymentPlanDto, actorId: string) {
    const plan = await this.prisma.deploymentPlan.findUnique({
      where: { id },
      include: {
        devices: true,
        tasks: { select: { id: true, deviceId: true, patchId: true, forceFailure: true } },
      },
    });
    if (!plan) throw new NotFoundException("Deployment plan not found");
    if (plan.createdById !== actorId) throw new BadRequestException("You can only edit plans you created");
    if (!editableStatuses.includes(plan.status)) {
      throw new BadRequestException("Only plans with DRAFT or CHANGES_REQUESTED status can be edited");
    }

    const deviceIds = dto.deviceIds ? [...new Set(dto.deviceIds)] : plan.devices.map((device) => device.deviceId);
    const patchIds = dto.patchIds ? [...new Set(dto.patchIds)] : [...new Set(plan.tasks.map((task) => task.patchId))];
    const hasFailOverride = dto.forceFailureTaskIds !== undefined;
    const failSet = new Set(dto.forceFailureTaskIds ?? []);
    const existingFailPairs = new Set(
      plan.tasks.filter((task) => task.forceFailure).map((task) => `${task.deviceId}:${task.patchId}`),
    );
    await this.assertDevicesAndPatchesExist(deviceIds, patchIds);

    return this.prisma.$transaction(async (tx) => {
      if (dto.deviceIds || dto.patchIds) {
        await tx.deploymentTask.deleteMany({ where: { planId: id } });
        await tx.deploymentPlanDevice.deleteMany({ where: { planId: id } });
      } else if (hasFailOverride) {
        for (const task of plan.tasks) {
          await tx.deploymentTask.update({
            where: { id: task.id },
            data: { forceFailure: this.shouldForceFailure(failSet, task.deviceId, task.patchId) },
          });
        }
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
                      forceFailure: hasFailOverride
                        ? this.shouldForceFailure(failSet, deviceId, patchId)
                        : existingFailPairs.has(`${deviceId}:${patchId}`),
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

  async remove(id: string, actorId: string) {
    const plan = await this.prisma.deploymentPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException("Deployment plan not found");
    if (plan.createdById !== actorId) throw new BadRequestException("You can only delete plans you created");
    if (plan.status !== PlanStatus.DRAFT) {
      throw new BadRequestException("Only plans with DRAFT status can be deleted");
    }

    await this.prisma.deploymentPlan.delete({ where: { id } });
    return { deleted: true };
  }

  async submit(id: string, actorId: string) {
    const plan = await this.prisma.deploymentPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException("Deployment plan not found");
    if (plan.createdById !== actorId) throw new BadRequestException("You can only submit plans you created");
    if (!editableStatuses.includes(plan.status)) throw new BadRequestException("Only draft or changed plans can be submitted");
    return this.prisma.deploymentPlan.update({
      where: { id },
      data: { status: PlanStatus.PENDING_APPROVAL, reviewNote: null, reviewedAt: null, reviewedById: null },
      include: planInclude,
    });
  }

  async review(id: string, dto: ReviewDeploymentPlanDto, reviewerId: string) {
    const plan = await this.prisma.deploymentPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException("Deployment plan not found");
    if (plan.status !== PlanStatus.PENDING_APPROVAL) throw new BadRequestException("Only submitted plans can be reviewed");
    if ((dto.status === PlanStatus.REJECTED || dto.status === PlanStatus.CHANGES_REQUESTED) && !dto.reviewNote?.trim()) {
      throw new BadRequestException("A review reason is required when rejecting or requesting changes");
    }

    return this.prisma.deploymentPlan.update({
      where: { id },
      data: { status: dto.status, reviewNote: dto.reviewNote?.trim() || null, reviewedAt: new Date(), reviewedById: reviewerId },
      include: planInclude,
    });
  }

  async deploy(id: string) {
    const plan = await this.prisma.deploymentPlan.findUnique({
      where: { id },
      include: { tasks: true },
    });
    if (!plan) throw new NotFoundException("Deployment plan not found");
    if (plan.status !== PlanStatus.APPROVED) throw new BadRequestException("Only approved plans can be deployed");
    if (!plan.tasks.length) throw new BadRequestException("A deployment plan needs at least one task");
    const claimed = await this.prisma.deploymentPlan.updateMany({ where: { id, status: PlanStatus.APPROVED }, data: { status: PlanStatus.DEPLOYING } });
    if (!claimed.count) throw new ConflictException("Deployment already started");
    await this.prisma.deploymentTask.updateMany({ where: { planId: id }, data: { status: TaskStatus.PENDING, errorCode: null, errorLog: null, startedAt: null, completedAt: null } });
    void this.simulateTasksAsync(id, plan.tasks).catch(async (error: unknown) => {
      this.logger.error(`Simulation interrupted for plan ${id}`, error instanceof Error ? error.stack : String(error));
      try {
        await this.prisma.deploymentPlan.update({ where: { id }, data: { status: PlanStatus.FAILED } });
      } catch (recordError) {
        this.logger.error(`Could not record simulation failure for plan ${id}`, recordError instanceof Error ? recordError.stack : String(recordError));
      }
    });
    return { planId: id, status: PlanStatus.DEPLOYING, simulation: true };
  }

  async findTasks(id: string) {
    const plan = await this.prisma.deploymentPlan.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!plan) throw new NotFoundException("Deployment plan not found");
    const tasks = await this.prisma.deploymentTask.findMany({ where: { planId: id }, include: { device: { select: { id: true, hostname: true } }, patch: { select: { id: true, code: true, title: true } } }, orderBy: { createdAt: "asc" } });
    return { planId: id, status: plan.status, simulation: true, tasks };
  }

  private async simulateTasksAsync(planId: string, tasks: { id: string; forceFailure: boolean }[]) {
    for (const task of tasks) {
      await this.wait(2_000);
      await this.prisma.deploymentTask.update({ where: { id: task.id }, data: { status: TaskStatus.DOWNLOADING, startedAt: new Date() } });
      await this.wait(2_000);
      await this.prisma.deploymentTask.update({ where: { id: task.id }, data: { status: TaskStatus.INSTALLING } });
      await this.wait(2_000);
      await this.prisma.deploymentTask.update({ where: { id: task.id }, data: task.forceFailure
        ? { status: TaskStatus.FAILED, errorCode: "SIMULATED_FAILURE", errorLog: "This task was configured to fail in the simulation.", completedAt: new Date() }
        : { status: TaskStatus.SUCCESS, completedAt: new Date() } });
    }
    const failed = await this.prisma.deploymentTask.count({ where: { planId, status: TaskStatus.FAILED } });
    await this.prisma.deploymentPlan.update({ where: { id: planId }, data: { status: failed ? PlanStatus.FAILED : PlanStatus.COMPLETED } });
  }

  private wait(milliseconds: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
  }

  private shouldForceFailure(failSet: Set<string>, deviceId: string, patchId: string) {
    return failSet.has(`${deviceId}:${patchId}`) || failSet.has(patchId) || failSet.has(deviceId);
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
      throw new NotFoundException(`Devices not found: ${missingDeviceIds.join(", ")}`);
    }
    if (missingPatchIds.length) {
      throw new NotFoundException(`Patches not found: ${missingPatchIds.join(", ")}`);
    }
  }
}
