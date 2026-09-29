import {
  IsEnum,
  IsOptional,
  IsUUID,
} from "class-validator";

import { PatchSeverity } from "@prisma/client";

export class FilterPatchDto {
  @IsOptional()
  @IsEnum(PatchSeverity)
  severity?: PatchSeverity;

  @IsOptional()
  @IsUUID()
  softwareId?: string;
}