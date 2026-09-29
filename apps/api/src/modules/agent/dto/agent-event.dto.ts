import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class AgentHeartbeatDto {
  @IsString()
  @MaxLength(50)
  version: string;
}

export class AgentScanDto extends AgentHeartbeatDto {
  @IsOptional()
  @IsObject()
  result?: Record<string, unknown>;
}