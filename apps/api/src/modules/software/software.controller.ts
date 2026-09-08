import { Controller, Get } from "@nestjs/common"; import { SoftwareService } from "./software.service";
@Controller("software") export class SoftwareController { constructor(private service: SoftwareService) {} @Get() findAll() { return this.service.findAll(); } }
