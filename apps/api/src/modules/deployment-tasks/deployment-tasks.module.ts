import { Module } from "@nestjs/common"; import { DeploymentTasksController } from "./deployment-tasks.controller"; import { DeploymentTasksService } from "./deployment-tasks.service";
@Module({ controllers: [DeploymentTasksController], providers: [DeploymentTasksService] }) export class DeploymentTasksModule {}
