-- Add the plan review stages already represented in schema.prisma.
ALTER TYPE "PlanStatus" ADD VALUE 'TESTING';
ALTER TYPE "PlanStatus" ADD VALUE 'PENDING_SECURITY_REVIEW';
ALTER TYPE "PlanStatus" ADD VALUE 'PENDING_MANAGER_APPROVAL';

-- Keep existing plans intact; review metadata is optional.
ALTER TABLE "DeploymentPlan"
  ADD COLUMN "testNote" TEXT,
  ADD COLUMN "testedAt" TIMESTAMP(3),
  ADD COLUMN "testedById" TEXT,
  ADD COLUMN "securityReviewNote" TEXT,
  ADD COLUMN "securityReviewedAt" TIMESTAMP(3),
  ADD COLUMN "securityReviewedById" TEXT;

ALTER TABLE "DeploymentPlan"
  ADD CONSTRAINT "DeploymentPlan_testedById_fkey"
    FOREIGN KEY ("testedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "DeploymentPlan_securityReviewedById_fkey"
    FOREIGN KEY ("securityReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
