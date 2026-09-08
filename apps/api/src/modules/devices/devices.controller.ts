import { Controller, Get } from "@nestjs/common"; import { DevicesService } from "./devices.service";
@Controller("devices") export class DevicesController { constructor(private service: DevicesService) {} @Get() findAll() { return this.service.findAll(); } }
