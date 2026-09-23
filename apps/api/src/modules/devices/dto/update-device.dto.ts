import { DeviceStatus } from "@prisma/client";
import {
  IsEnum,
  IsIP,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  hostname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  operatingSystem?: string;

  @IsOptional()
  @IsIP()
  ipAddress?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string | null;

  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @IsOptional()
  @IsUUID()
  ownerId?: string | null;
}