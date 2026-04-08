-- AlterTable
ALTER TABLE "users" ADD COLUMN     "ad_click_id" TEXT,
ADD COLUMN     "ad_click_provider" TEXT,
ADD COLUMN     "ad_click_time" TIMESTAMP(3);
