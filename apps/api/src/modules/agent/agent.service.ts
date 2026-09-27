import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  AgentHeartbeatDto,
  AgentScanDto,
} from "./dto/agent-event.dto";

@Injectable()
export class AgentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllStatus() {
    const statuses = await this.prisma.agentStatus.findMany({
      include: {
        device: {
          select: {
            id: true,
            hostname: true,
            status: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return statuses.map((status) => ({
      ...status,
      connectionState: this.getConnectionState(
        status.isConnected,
        status.lastHeartbeatAt,
      ),
    }));
  }

  async heartbeat(
    deviceId: string,
    input: AgentHeartbeatDto | string,
  ) {
    await this.ensureDeviceExists(deviceId);

    const version = this.getVersion(input);
    const now = new Date();

    const agent = await this.prisma.agentStatus.upsert({
      where: { deviceId },
      create: {
        deviceId,
        version,
        isConnected: true,
        lastHeartbeatAt: now,
      },
      update: {
        version,
        isConnected: true,
        lastHeartbeatAt: now,
      },
    });

    await this.markDeviceOnline(deviceId);
    return agent;
  }

  async scan(
    deviceId: string,
    dto: AgentScanDto = { version: "unknown" },
  ) {
    await this.ensureDeviceExists(deviceId);

    const now = new Date();

    const agent = await this.prisma.agentStatus.upsert({
      where: { deviceId },
      create: {
        deviceId,
        version: dto.version,
        isConnected: true,
        lastHeartbeatAt: now,
        lastScanAt: now,
        lastScanResult: this.toJsonValue(dto.result),
      },
      update: {
        version: dto.version,
        isConnected: true,
        lastHeartbeatAt: now,
        lastScanAt: now,
        lastScanResult: this.toJsonValue(dto.result),
      },
    });

    await this.markDeviceOnline(deviceId);
    return agent;
  }

  recordScan(deviceId: string) {
    return this.scan(deviceId);
  }

  private async ensureDeviceExists(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true },
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }
  }

  private markDeviceOnline(deviceId: string) {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: { status: "ONLINE" },
    });
  }

  private toJsonValue(
    value: Record<string, unknown> | undefined,
  ): Prisma.InputJsonValue | undefined {
    if (!value) {
      return undefined;
    }

    return JSON.parse(
      JSON.stringify(value),
    ) as Prisma.InputJsonValue;
  }

  private getVersion(input: AgentHeartbeatDto | string) {
    return typeof input === "string" ? input : input.version;
  }

  private getConnectionState(
    isConnected: boolean,
    lastHeartbeatAt: Date | null,
  ) {
    if (!isConnected || !lastHeartbeatAt) {
      return "OFFLINE" as const;
    }

    const elapsed = Date.now() - lastHeartbeatAt.getTime();
    return elapsed <= 5 * 60 * 1000
      ? ("CONNECTED" as const)
      : ("OFFLINE" as const);
  }
}
