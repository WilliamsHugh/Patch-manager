import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

import { PatchSeverity } from "@prisma/client";

export class CreatePatchDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  version?: string | null;

  @IsEnum(PatchSeverity)
  severity!: PatchSeverity;

  @IsDateString()
  releasedAt!: string;

  @IsOptional()
  @IsBoolean()
  requiresRestart?: boolean;

  @IsUUID()
  softwareId!: string;
}