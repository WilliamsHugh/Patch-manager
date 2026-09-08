import { IsArray, IsDateString, IsOptional, IsString, MinLength } from "class-validator";
export class CreateDeploymentPlanDto { @IsString() @MinLength(3) name: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsDateString() scheduledAt?: string; @IsArray() @IsString({ each: true }) deviceIds: string[]; @IsArray() @IsString({ each: true }) patchIds: string[]; }
