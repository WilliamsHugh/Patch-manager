import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateSoftwareDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  vendor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  currentVersion?: string;
}
