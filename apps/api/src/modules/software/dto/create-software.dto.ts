import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateSoftwareDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(120)
  vendor!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  currentVersion?: string;
}
