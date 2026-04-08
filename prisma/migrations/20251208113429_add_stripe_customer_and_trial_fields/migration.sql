-- AlterTable
ALTER TABLE "products" ADD COLUMN     "has_trial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trial_credits_amount" INTEGER,
ADD COLUMN     "trial_days" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripe_customer_id" TEXT;
