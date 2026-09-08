import { PlanStatus } from "@prisma/client"; import { IsIn, IsOptional, IsString } from "class-validator";
export class ReviewDeploymentPlanDto { @IsIn([PlanStatus.APPROVED, PlanStatus.REJECTED, PlanStatus.CHANGES_REQUESTED]) status: PlanStatus; @IsOptional() @IsString() reviewNote?: string; }
