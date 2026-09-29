import { IsOptional, IsString, MaxLength } from "class-validator";

export class FilterDeviceDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}