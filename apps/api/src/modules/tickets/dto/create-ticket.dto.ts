import { PatchSeverity } from "@prisma/client"; import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";
export class CreateTicketDto { @IsString() @MinLength(3) title: string; @IsString() @MinLength(5) description: string; @IsOptional() @IsEnum(PatchSeverity) priority?: PatchSeverity; }
