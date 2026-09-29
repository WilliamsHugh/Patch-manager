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

export class UpdatePatchDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  version?: string | null;

  @IsOptional()
  @IsEnum(PatchSeverity)
  severity?: PatchSeverity;

  @IsOptional()
  @IsDateString()
  releasedAt?: string;

  @IsOptional()
  @IsBoolean()
  requiresRestart?: boolean;

  @IsOptional()
  @IsUUID()
  softwareId?: string;
}