import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";

import { SoftwareService } from "./software.service";
import { CreateSoftwareDto } from "./dto/create-software.dto";
import { UpdateSoftwareDto } from "./dto/update-software.dto";

@Controller("software")
export class SoftwareController {
  constructor(private service: SoftwareService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() data: CreateSoftwareDto) {
    return this.service.create(data);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() data: UpdateSoftwareDto,
  ) {
    return this.service.update(id, data);
  }
}