-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserSubscriptionStatus" ADD VALUE 'INCOMPLETE';
ALTER TYPE "UserSubscriptionStatus" ADD VALUE 'INCOMPLETE_EXPIRED';
ALTER TYPE "UserSubscriptionStatus" ADD VALUE 'TRIALING';
ALTER TYPE "UserSubscriptionStatus" ADD VALUE 'UNPAID';
ALTER TYPE "UserSubscriptionStatus" ADD VALUE 'PAUSED';
