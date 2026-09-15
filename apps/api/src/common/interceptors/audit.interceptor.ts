import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, mergeMap } from "rxjs";
import { AUDIT_ACTION_KEY, AuditActionOptions } from "../decorators/audit-action.decorator";
import { AuditLogsService } from "../../modules/audit-logs/audit-logs.service";

type AuditedRequest = {
  user?: { id: string };
  params?: { id?: string };
  method: string;
  route?: { path?: string };
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly reflector: Reflector, private readonly logs: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.getAllAndOverride<AuditActionOptions>(AUDIT_ACTION_KEY, [context.getHandler(), context.getClass()]);
    if (!action) return next.handle();

    const request = context.switchToHttp().getRequest<AuditedRequest>();
    return next.handle().pipe(mergeMap(async (result: { id?: string } | null) => {
      if (!request.user?.id) return result;
      try {
        await this.logs.record({
          ...action,
          entityId: request.params?.id ?? result?.id ?? (action.action === "USER_LOGGED_OUT" ? request.user.id : null),
          userId: request.user.id,
          // Never persist request/response bodies: they may contain passwords or tokens.
          metadata: { method: request.method, route: request.route?.path ?? null },
        });
      } catch {
        this.logger.warn(`Không ghi được audit log cho ${action.action}`);
      }
      return result;
    }));
  }
}
