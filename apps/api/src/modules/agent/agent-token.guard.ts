import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AgentTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const expectedToken = this.config.get<string>("AGENT_API_TOKEN");
    const receivedToken = request.headers["x-agent-token"];
    const token = Array.isArray(receivedToken)
      ? receivedToken[0]
      : receivedToken;

    if (!expectedToken || !token || token !== expectedToken) {
      throw new UnauthorizedException("Invalid agent token");
    }

    return true;
  }
}
