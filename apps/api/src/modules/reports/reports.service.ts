import { Injectable } from "@nestjs/common";
import { DeviceStatus, PlanStatus, TaskStatus, TicketStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [devices, needsAttention, pendingPlans, failedTasks, openTickets, agents, neverScanned] = await Promise.all([
      this.prisma.device.count(),
      this.prisma.device.count({ where: { status: DeviceStatus.NEEDS_ATTENTION } }),
      this.prisma.deploymentPlan.count({ where: { status: PlanStatus.PENDING_APPROVAL } }),
      this.prisma.deploymentTask.count({ where: { status: TaskStatus.FAILED } }),
      this.prisma.ticket.count({ where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } } }),
      this.prisma.agentStatus.findMany({ select: { lastHeartbeatAt: true, isConnected: true, lastScanAt: true, lastScanResult: true } }),
      this.prisma.device.count({ where: { agentStatus: null } }),
    ]);
    const cutoff = Date.now() - 5 * 60_000;
    return {
      devices, needsAttention, pendingPlans, failedTasks, openTickets,
      totalAgentsConnected: agents.filter((agent) => agent.isConnected && agent.lastHeartbeatAt && agent.lastHeartbeatAt.getTime() >= cutoff).length,
      agentsWithMissingPatches: agents.filter((agent) => {
        const result = agent.lastScanResult;
        return result && typeof result === "object" && !Array.isArray(result) && result.outcome === "SUCCESS" && Array.isArray(result.updates) && result.updates.length > 0;
      }).length,
      agentsNeverScanned: neverScanned + agents.filter((agent) => !agent.lastScanAt).length,
    };
  }

  async deploymentSummary() {
    const plans = await this.prisma.deploymentPlan.findMany({
      select: { id: true, name: true, status: true, tasks: { select: { status: true } } },
      orderBy: { createdAt: "desc" }, take: 100,
    });
    return plans.map((plan) => ({
      planId: plan.id, name: plan.name, status: plan.status, total: plan.tasks.length,
      success: plan.tasks.filter((task) => task.status === TaskStatus.SUCCESS).length,
      failed: plan.tasks.filter((task) => task.status === TaskStatus.FAILED).length,
      pending: plan.tasks.filter((task) => task.status !== TaskStatus.SUCCESS && task.status !== TaskStatus.FAILED).length,
      simulation: true,
    }));
  }
}
