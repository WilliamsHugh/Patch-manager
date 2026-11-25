import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateDeploymentPlanDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  deviceIds: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  patchIds: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  forceFailureTaskIds?: string[];
}
