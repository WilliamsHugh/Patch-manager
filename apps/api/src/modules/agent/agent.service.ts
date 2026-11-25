import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AgentScanOutcome, type AgentScanResult } from "@patch-management/shared";
import { Prisma } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { AgentScanDto } from "./dto/agent-event.dto";

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

@Injectable()
export class AgentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllStatus() {
    const statuses = await this.prisma.agentStatus.findMany({
      include: { device: { select: { id: true, hostname: true, operatingSystem: true, status: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return statuses.map((status) => ({ ...status, connectionState: this.getConnectionState(status.isConnected, status.lastHeartbeatAt) }));
  }

  async issueCredential(deviceId: string) {
    await this.assertDeviceExists(deviceId);
    const token = `pma_${randomBytes(32).toString("base64url")}`;
    const tokenHash = hashCredential(token);
    const tokenHint = token.slice(-6);
    await this.prisma.$transaction([
      this.prisma.agentCredential.updateMany({ where: { deviceId, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.agentCredential.create({ data: { deviceId, tokenHash, tokenHint } }),
    ]);
    return { deviceId, token, tokenHint };
  }

  async heartbeat(deviceId: string, version = "unknown") {
    await this.assertDeviceExists(deviceId);
    const now = new Date();
    const agent = await this.prisma.agentStatus.upsert({
      where: { deviceId },
      update: { version, isConnected: true, lastHeartbeatAt: now },
      create: { deviceId, version, isConnected: true, lastHeartbeatAt: now },
      include: { device: { select: { id: true, hostname: true, status: true } } },
    });
    await this.prisma.device.update({ where: { id: deviceId }, data: { status: "ONLINE" } });
    return agent;
  }

  async recordScan(deviceId: string, dto: AgentScanDto) {
    await this.assertDeviceExists(deviceId);
    const startedAt = new Date(dto.startedAt);
    const completedAt = new Date(dto.completedAt);
    this.assertValidScan(dto, startedAt, completedAt);

    const current = await this.prisma.agentStatus.findUnique({
      where: { deviceId },
      select: { lastScanResult: true },
    });
    const stored = parseStoredScan(current?.lastScanResult);
    if (stored?.scanId === dto.scanId) return { delivery: "DUPLICATE" as const, agent: current };
    if (stored && new Date(stored.completedAt).getTime() >= completedAt.getTime()) {
      return { delivery: "IGNORED_STALE" as const, agent: current };
    }

    const result: AgentScanResult = {
      protocolVersion: 1,
      scanId: dto.scanId,
      agentVersion: dto.version,
      os: dto.os,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      outcome: dto.outcome,
      updates: dto.updates,
      ...(dto.error ? { error: dto.error.trim() } : {}),
    };
    const agent = await this.prisma.agentStatus.upsert({
      where: { deviceId },
      update: { version: dto.version, isConnected: true, lastHeartbeatAt: new Date(), lastScanAt: completedAt, lastScanResult: result as unknown as Prisma.InputJsonValue },
      create: { deviceId, version: dto.version, isConnected: true, lastHeartbeatAt: new Date(), lastScanAt: completedAt, lastScanResult: result as unknown as Prisma.InputJsonValue },
      include: { device: { select: { id: true, hostname: true, status: true } } },
    });
    await this.prisma.device.update({ where: { id: deviceId }, data: { status: "ONLINE" } });
    return { delivery: "STORED" as const, agent };
  }

  private assertValidScan(dto: AgentScanDto, startedAt: Date, completedAt: Date) {
    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(completedAt.getTime()) || startedAt > completedAt || completedAt.getTime() > Date.now() + MAX_CLOCK_SKEW_MS) {
      throw new BadRequestException("Invalid scan timestamps");
    }
    if (dto.outcome === AgentScanOutcome.NO_UPDATES && dto.updates.length) throw new BadRequestException("NO_UPDATES scans cannot include updates");
    if (dto.outcome === AgentScanOutcome.ERROR && !dto.error?.trim()) throw new BadRequestException("ERROR scans require an error summary");
    if (dto.outcome !== AgentScanOutcome.ERROR && dto.error?.trim()) throw new BadRequestException("Only ERROR scans can include an error summary");
  }

  private async assertDeviceExists(deviceId: string) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId }, select: { id: true } });
    if (!device) throw new NotFoundException("Device not found");
  }

  private getConnectionState(isConnected: boolean, lastHeartbeatAt: Date | null) {
    if (!isConnected || !lastHeartbeatAt) return "OFFLINE";
    return Date.now() - lastHeartbeatAt.getTime() <= 5 * 60 * 1000 ? "CONNECTED" : "OFFLINE";
  }
}

function hashCredential(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function parseStoredScan(value: unknown): Pick<AgentScanResult, "scanId" | "completedAt"> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as { scanId?: unknown; completedAt?: unknown };
  return typeof candidate.scanId === "string" && typeof candidate.completedAt === "string" ? { scanId: candidate.scanId, completedAt: candidate.completedAt } : null;
}
