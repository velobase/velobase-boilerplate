-- CreateEnum
CREATE TYPE "VideoTaskType" AS ENUM ('GENERATE', 'EXTEND', 'UPSCALE');

-- AlterEnum
ALTER TYPE "AffiliateLedgerKind" ADD VALUE 'EARNING_RESTORED';

-- AlterTable
ALTER TABLE "video_generation_tasks" ADD COLUMN     "task_type" "VideoTaskType" NOT NULL DEFAULT 'GENERATE';
