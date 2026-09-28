import { PatchSeverity } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class FilterSecurityRiskDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsEnum(PatchSeverity)
  severity?: PatchSeverity;

  @IsOptional()
  @IsUUID()
  softwareId?: string;
}
