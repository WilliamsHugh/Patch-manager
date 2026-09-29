import { DeviceStatus } from "@prisma/client";
import {
  IsEnum,
  IsIP,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreateDeviceDto {
  @IsString()
  @MaxLength(100)
  hostname!: string;

  @IsString()
  @MaxLength(120)
  operatingSystem!: string;

  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}