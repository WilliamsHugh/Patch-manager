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
    const request = context.switchToHttp().getRequest();
    const expectedToken = this.config.get<string>("AGENT_API_TOKEN");
    const receivedToken = request.headers["x-agent-token"];

    if (!expectedToken || receivedToken !== expectedToken) {
      throw new UnauthorizedException("Invalid agent token");
    }

    return true;
  }
}