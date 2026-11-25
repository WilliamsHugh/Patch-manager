import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { AgentScanOutcome } from "@patch-management/shared";

export class AgentHeartbeatDto {
  @IsString()
  @MaxLength(50)
  version!: string;
}

class AgentOperatingSystemDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(100)
  version!: string;

  @IsString()
  @MaxLength(50)
  architecture!: string;
}

class WindowsUpdateFindingDto {
  @IsString()
  @MaxLength(100)
  updateId!: string;

  @IsString()
  @MaxLength(500)
  title!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  kbArticleIds!: string[];

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  categories!: string[];

  @IsBoolean()
  rebootRequired!: boolean;
}

export class AgentScanDto extends AgentHeartbeatDto {
  @IsInt()
  @Min(1)
  @Max(1)
  protocolVersion!: number;

  @IsUUID()
  scanId!: string;

  @ValidateNested()
  @Type(() => AgentOperatingSystemDto)
  os!: AgentOperatingSystemDto;

  @IsDateString()
  startedAt!: string;

  @IsDateString()
  completedAt!: string;

  @IsEnum(AgentScanOutcome)
  outcome!: AgentScanOutcome;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => WindowsUpdateFindingDto)
  updates!: WindowsUpdateFindingDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  error?: string;
}
