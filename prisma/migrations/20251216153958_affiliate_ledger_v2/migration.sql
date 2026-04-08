/*
  Warnings:

  - You are about to drop the `affiliate_commissions` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AffiliateEarningSourceType" AS ENUM ('ORDER_PAYMENT', 'SUBSCRIPTION_RENEWAL');

-- CreateEnum
CREATE TYPE "AffiliateEarningState" AS ENUM ('PENDING', 'AVAILABLE', 'VOIDED');

-- CreateEnum
CREATE TYPE "AffiliateCurrency" AS ENUM ('USD');

-- CreateEnum
CREATE TYPE "AffiliateLedgerKind" AS ENUM ('EARNING_CREATED', 'EARNING_MATURED', 'PAYOUT_REQUESTED', 'PAYOUT_RELEASED', 'PAYOUT_COMPLETED', 'EXCHANGE_CREDITS', 'EARNING_VOIDED', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "AffiliateLedgerReferenceType" AS ENUM ('EARNING', 'PAYOUT_REQUEST', 'PAYMENT', 'INVOICE', 'ADMIN');

-- DropForeignKey
ALTER TABLE "affiliate_commissions" DROP CONSTRAINT "affiliate_commissions_affiliate_user_id_fkey";

-- DropForeignKey
ALTER TABLE "affiliate_commissions" DROP CONSTRAINT "affiliate_commissions_payout_request_id_fkey";

-- DropForeignKey
ALTER TABLE "affiliate_commissions" DROP CONSTRAINT "affiliate_commissions_referred_user_id_fkey";

-- AlterTable
ALTER TABLE "affiliate_payout_requests" ADD COLUMN     "currency" "AffiliateCurrency" NOT NULL DEFAULT 'USD';

-- DropTable
DROP TABLE "affiliate_commissions";

-- DropEnum
DROP TYPE "AffiliateCommissionSourceType";

-- DropEnum
DROP TYPE "AffiliateCommissionStatus";

-- CreateTable
CREATE TABLE "affiliate_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "currency" "AffiliateCurrency" NOT NULL DEFAULT 'USD',
    "pending_cents" INTEGER NOT NULL DEFAULT 0,
    "available_cents" INTEGER NOT NULL DEFAULT 0,
    "locked_cents" INTEGER NOT NULL DEFAULT 0,
    "debt_cents" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_ledger_entries" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "currency" "AffiliateCurrency" NOT NULL DEFAULT 'USD',
    "kind" "AffiliateLedgerKind" NOT NULL,
    "reference_type" "AffiliateLedgerReferenceType" NOT NULL,
    "reference_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "delta_pending_cents" INTEGER NOT NULL DEFAULT 0,
    "delta_available_cents" INTEGER NOT NULL DEFAULT 0,
    "delta_locked_cents" INTEGER NOT NULL DEFAULT 0,
    "delta_debt_cents" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_earnings" (
    "id" TEXT NOT NULL,
    "source_type" "AffiliateEarningSourceType" NOT NULL,
    "source_external_id" TEXT NOT NULL,
    "source_sequence" INTEGER NOT NULL DEFAULT 0,
    "affiliate_user_id" TEXT NOT NULL,
    "referred_user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "payment_id" TEXT,
    "subscription_id" TEXT,
    "payment_gateway" TEXT,
    "currency" "AffiliateCurrency" NOT NULL DEFAULT 'USD',
    "gross_amount_cents" INTEGER NOT NULL,
    "commission_rate_bps" INTEGER NOT NULL DEFAULT 3000,
    "commission_cents" INTEGER NOT NULL,
    "state" "AffiliateEarningState" NOT NULL DEFAULT 'PENDING',
    "available_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_accounts_user_id_key" ON "affiliate_accounts"("user_id");

-- CreateIndex
CREATE INDEX "affiliate_accounts_updated_at_idx" ON "affiliate_accounts"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_ledger_entries_idempotency_key_key" ON "affiliate_ledger_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "affiliate_ledger_entries_account_id_created_at_idx" ON "affiliate_ledger_entries"("account_id", "created_at");

-- CreateIndex
CREATE INDEX "affiliate_ledger_entries_user_id_created_at_idx" ON "affiliate_ledger_entries"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "affiliate_ledger_entries_reference_type_reference_id_idx" ON "affiliate_ledger_entries"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "affiliate_earnings_affiliate_user_id_state_idx" ON "affiliate_earnings"("affiliate_user_id", "state");

-- CreateIndex
CREATE INDEX "affiliate_earnings_affiliate_user_id_available_at_idx" ON "affiliate_earnings"("affiliate_user_id", "available_at");

-- CreateIndex
CREATE INDEX "affiliate_earnings_referred_user_id_idx" ON "affiliate_earnings"("referred_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_earnings_source_type_source_external_id_source_se_key" ON "affiliate_earnings"("source_type", "source_external_id", "source_sequence");

-- CreateIndex
CREATE INDEX "affiliate_payout_requests_affiliate_user_id_type_status_idx" ON "affiliate_payout_requests"("affiliate_user_id", "type", "status");

-- AddForeignKey
ALTER TABLE "affiliate_accounts" ADD CONSTRAINT "affiliate_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_ledger_entries" ADD CONSTRAINT "affiliate_ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "affiliate_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_ledger_entries" ADD CONSTRAINT "affiliate_ledger_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_earnings" ADD CONSTRAINT "affiliate_earnings_affiliate_user_id_fkey" FOREIGN KEY ("affiliate_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_earnings" ADD CONSTRAINT "affiliate_earnings_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
