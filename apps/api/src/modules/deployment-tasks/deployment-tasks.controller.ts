import { Controller, Get } from "@nestjs/common"; import { DeploymentTasksService } from "./deployment-tasks.service";
@Controller("deployment-tasks") export class DeploymentTasksController { constructor(private service: DeploymentTasksService) {} @Get() findAll() { return this.service.findAll(); } }
