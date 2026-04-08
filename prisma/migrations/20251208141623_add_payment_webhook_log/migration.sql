-- CreateTable
CREATE TABLE "payment_webhook_logs" (
    "id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_webhook_logs_gateway_idx" ON "payment_webhook_logs"("gateway");

-- CreateIndex
CREATE INDEX "payment_webhook_logs_event_type_idx" ON "payment_webhook_logs"("event_type");

-- CreateIndex
CREATE INDEX "payment_webhook_logs_status_idx" ON "payment_webhook_logs"("status");

-- CreateIndex
CREATE INDEX "payment_webhook_logs_created_at_idx" ON "payment_webhook_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_logs_gateway_event_id_key" ON "payment_webhook_logs"("gateway", "event_id");
