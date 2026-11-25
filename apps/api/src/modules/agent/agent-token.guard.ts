import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";

type AgentRequest = {
  headers: Record<string, string | string[] | undefined>;
  params: { deviceId?: string };
  agentDeviceId?: string;
};

@Injectable()
export class AgentTokenGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AgentRequest>();
    const receivedToken = request.headers["x-agent-token"];
    const token = Array.isArray(receivedToken)
      ? receivedToken[0]
      : receivedToken;

    if (!token || !request.params.deviceId) {
      throw new UnauthorizedException("Invalid agent credential");
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const credential = await this.prisma.agentCredential.findUnique({
      where: { tokenHash },
      select: { tokenHash: true, deviceId: true, revokedAt: true },
    });
    if (!credential || credential.revokedAt || credential.deviceId !== request.params.deviceId || !sameHash(credential.tokenHash, tokenHash)) {
      throw new UnauthorizedException("Invalid agent credential");
    }

    request.agentDeviceId = credential.deviceId;

    return true;
  }
}

function sameHash(left: string, right: string) {
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}
