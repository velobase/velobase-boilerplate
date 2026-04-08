-- CreateEnum
CREATE TYPE "BlockReason" AS ENUM ('ABUSE_PROMPT', 'ABUSE_IMAGE', 'FRAUD_EFW', 'USER_REQUESTED', 'ADMIN_MANUAL');

-- AlterTable
ALTER TABLE "user_notification_preferences" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "blocked_at" TIMESTAMP(3),
ADD COLUMN     "blocked_reason" "BlockReason";
