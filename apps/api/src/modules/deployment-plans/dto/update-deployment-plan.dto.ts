import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class UpdateDeploymentPlanDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  deviceIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  patchIds?: string[];
}
