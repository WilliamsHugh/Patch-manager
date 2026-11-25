import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class SecurityReviewDto {
  @IsString() @MinLength(10) @MaxLength(4000)
  securityNote!: string;

  @IsIn(["DEPLOY", "SKIP"])
  securityDecision!: "DEPLOY" | "SKIP";
}
