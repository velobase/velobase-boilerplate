-- AlterTable
ALTER TABLE "user_stats" ADD COLUMN     "can_bypass_blur" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "user_id" TEXT,
    "order_id" TEXT,
    "payment_id" TEXT,
    "gateway_subscription_id" TEXT,
    "gateway_invoice_id" TEXT,
    "gateway_charge_id" TEXT,
    "gateway_payment_intent_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "source_event_id" TEXT,
    "source_event_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_transactions_user_id_idx" ON "payment_transactions"("user_id");

-- CreateIndex
CREATE INDEX "payment_transactions_occurred_at_idx" ON "payment_transactions"("occurred_at");

-- CreateIndex
CREATE INDEX "payment_transactions_gateway_subscription_id_idx" ON "payment_transactions"("gateway_subscription_id");

-- CreateIndex
CREATE INDEX "payment_transactions_gateway_invoice_id_idx" ON "payment_transactions"("gateway_invoice_id");

-- CreateIndex
CREATE INDEX "payment_transactions_gateway_charge_id_idx" ON "payment_transactions"("gateway_charge_id");

-- CreateIndex
CREATE INDEX "payment_transactions_gateway_payment_intent_id_idx" ON "payment_transactions"("gateway_payment_intent_id");

-- CreateIndex
CREATE INDEX "payment_transactions_order_id_idx" ON "payment_transactions"("order_id");

-- CreateIndex
CREATE INDEX "payment_transactions_payment_id_idx" ON "payment_transactions"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_gateway_external_id_key" ON "payment_transactions"("gateway", "external_id");
