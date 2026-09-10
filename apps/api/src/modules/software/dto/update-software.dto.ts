import { IsOptional, IsString } from "class-validator";

export class UpdateSoftwareDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  currentVersion?: string | null;
}