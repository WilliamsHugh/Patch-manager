import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateSoftwareDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  vendor!: string;

  @IsOptional()
  @IsString()
  currentVersion?: string | null;
}