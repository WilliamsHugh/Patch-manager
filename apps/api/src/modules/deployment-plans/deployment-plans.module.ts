import { Module } from "@nestjs/common"; import { DeploymentPlansController } from "./deployment-plans.controller"; import { DeploymentPlansService } from "./deployment-plans.service";
@Module({ controllers: [DeploymentPlansController], providers: [DeploymentPlansService] }) export class DeploymentPlansModule {}
