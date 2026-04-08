-- CreateEnum
CREATE TYPE "AffiliateCommissionSourceType" AS ENUM ('ORDER_PAYMENT', 'SUBSCRIPTION_RENEWAL');

-- CreateEnum
CREATE TYPE "AffiliateCommissionStatus" AS ENUM ('PENDING', 'AVAILABLE', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "AffiliatePayoutType" AS ENUM ('CASHOUT_USDT', 'EXCHANGE_CREDITS');

-- CreateEnum
CREATE TYPE "AffiliatePayoutStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "referral_code" TEXT,
  ADD COLUMN "referred_by_id" TEXT,
  ADD COLUMN "payout_wallet" TEXT,
  ADD COLUMN "affiliate_enabled_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_referred_by_id_idx" ON "users"("referred_by_id");

-- AddForeignKey
ALTER TABLE "users"
  ADD CONSTRAINT "users_referred_by_id_fkey"
  FOREIGN KEY ("referred_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "affiliate_payout_requests" (
  "id" TEXT NOT NULL,
  "affiliate_user_id" TEXT NOT NULL,
  "type" "AffiliatePayoutType" NOT NULL,
  "status" "AffiliatePayoutStatus" NOT NULL DEFAULT 'REQUESTED',
  "amount_cents" INTEGER NOT NULL,
  "wallet_address" TEXT,
  "chain" TEXT NOT NULL DEFAULT 'polygon',
  "token" TEXT NOT NULL DEFAULT 'usdt',
  "tx_hash" TEXT,
  "admin_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "affiliate_payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "affiliate_payout_requests_affiliate_user_id_status_idx"
  ON "affiliate_payout_requests"("affiliate_user_id", "status");

-- AddForeignKey
ALTER TABLE "affiliate_payout_requests"
  ADD CONSTRAINT "affiliate_payout_requests_affiliate_user_id_fkey"
  FOREIGN KEY ("affiliate_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "affiliate_commissions" (
  "id" TEXT NOT NULL,
  "source_type" "AffiliateCommissionSourceType" NOT NULL,
  "source_external_id" TEXT NOT NULL,
  "affiliate_user_id" TEXT NOT NULL,
  "referred_user_id" TEXT NOT NULL,
  "order_id" TEXT,
  "payment_id" TEXT,
  "subscription_id" TEXT,
  "payment_gateway" TEXT,
  "gross_amount_cents" INTEGER NOT NULL,
  "commission_rate_bps" INTEGER NOT NULL DEFAULT 3000,
  "commission_cents" INTEGER NOT NULL,
  "status" "AffiliateCommissionStatus" NOT NULL DEFAULT 'PENDING',
  "matures_at" TIMESTAMP(3) NOT NULL,
  "payout_request_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "affiliate_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_commissions_source_type_source_external_id_key"
  ON "affiliate_commissions"("source_type", "source_external_id");

-- CreateIndex
CREATE INDEX "affiliate_commissions_affiliate_user_id_status_idx"
  ON "affiliate_commissions"("affiliate_user_id", "status");

-- CreateIndex
CREATE INDEX "affiliate_commissions_referred_user_id_idx"
  ON "affiliate_commissions"("referred_user_id");

-- CreateIndex
CREATE INDEX "affiliate_commissions_matures_at_idx"
  ON "affiliate_commissions"("matures_at");

-- AddForeignKey
ALTER TABLE "affiliate_commissions"
  ADD CONSTRAINT "affiliate_commissions_affiliate_user_id_fkey"
  FOREIGN KEY ("affiliate_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commissions"
  ADD CONSTRAINT "affiliate_commissions_referred_user_id_fkey"
  FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commissions"
  ADD CONSTRAINT "affiliate_commissions_payout_request_id_fkey"
  FOREIGN KEY ("payout_request_id") REFERENCES "affiliate_payout_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;


