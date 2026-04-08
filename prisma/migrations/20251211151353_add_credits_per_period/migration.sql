-- AlterTable
ALTER TABLE "product_subscription_plans" ADD COLUMN     "credits_per_period" INTEGER NOT NULL DEFAULT 0;

-- Migrate existing data: copy credits_per_month to credits_per_period
UPDATE "product_subscription_plans" SET "credits_per_period" = "credits_per_month";
