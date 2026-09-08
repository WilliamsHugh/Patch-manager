import { Controller, Get } from "@nestjs/common"; import { PatchesService } from "./patches.service";
@Controller("patches") export class PatchesController { constructor(private service: PatchesService) {} @Get() findAll() { return this.service.findAll(); } }
