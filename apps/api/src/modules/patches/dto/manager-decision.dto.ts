import { IsIn } from "class-validator";

export class ManagerDecisionDto {
  @IsIn(["APPROVED", "REJECTED"])
  managerDecision!: "APPROVED" | "REJECTED";
}
