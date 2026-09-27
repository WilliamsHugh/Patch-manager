import { IsOptional, IsString, IsUUID } from "class-validator";

export class AssignTicketDto {
  // Omit assignedToId (or send null) to unassign.
  @IsOptional()
  @IsUUID()
  @IsString()
  assignedToId?: string | null;
}
