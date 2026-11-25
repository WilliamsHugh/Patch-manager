ALTER TABLE "Patch" ADD COLUMN "securityNote" TEXT,
ADD COLUMN "securityDecision" TEXT,
ADD COLUMN "securityReviewedAt" TIMESTAMP(3),
ADD COLUMN "securityReviewedById" TEXT,
ADD COLUMN "managerDecision" TEXT,
ADD COLUMN "managerReviewedAt" TIMESTAMP(3),
ADD COLUMN "managerReviewedById" TEXT,
ADD COLUMN "patchStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW';

ALTER TABLE "Patch" ADD CONSTRAINT "Patch_securityReviewedById_fkey" FOREIGN KEY ("securityReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Patch" ADD CONSTRAINT "Patch_managerReviewedById_fkey" FOREIGN KEY ("managerReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
