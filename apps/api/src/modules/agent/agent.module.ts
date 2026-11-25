import { Module } from "@nestjs/common";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { AgentTokenGuard } from "./agent-token.guard";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [AgentController],
  providers: [AgentService, AgentTokenGuard],
})
export class AgentModule {}
