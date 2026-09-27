import { IsString, MinLength } from "class-validator";

export class CreateTicketCommentDto {
  @IsString()
  @MinLength(1)
  content: string;
}
