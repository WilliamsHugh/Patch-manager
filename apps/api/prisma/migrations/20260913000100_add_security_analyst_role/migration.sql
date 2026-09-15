-- Add the security analyst role without introducing a separate RBAC schema.
ALTER TYPE "Role" ADD VALUE 'SECURITY_ANALYST';
