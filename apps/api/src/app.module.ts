import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { UsersModule } from "./modules/users/users.module";
import { RolesModule } from "./modules/roles/roles.module";
import { SoftwareModule } from "./modules/software/software.module";
import { PatchesModule } from "./modules/patches/patches.module";
import { DevicesModule } from "./modules/devices/devices.module";
import { DeploymentPlansModule } from "./modules/deployment-plans/deployment-plans.module";
import { DeploymentTasksModule } from "./modules/deployment-tasks/deployment-tasks.module";
import { TicketsModule } from "./modules/tickets/tickets.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { AuditLogsModule } from "./modules/audit-logs/audit-logs.module";
import { PoliciesModule } from "./modules/policies/policies.module";
import { AgentModule } from "./modules/agent/agent.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, UsersModule, RolesModule, SoftwareModule,
    PatchesModule, DevicesModule, DeploymentPlansModule, DeploymentTasksModule, TicketsModule, NotificationsModule,
    ReportsModule, AuditLogsModule, PoliciesModule, AgentModule],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }, { provide: APP_GUARD, useClass: RolesGuard }],
})
export class AppModule {}
