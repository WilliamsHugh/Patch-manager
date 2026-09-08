import { Controller, Get } from "@nestjs/common"; import { AgentService } from "./agent.service";
@Controller("agent") export class AgentController { constructor(private service: AgentService) {} @Get("status") status() { return this.service.findAllStatus(); } }
