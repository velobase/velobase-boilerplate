-- CreateEnum
CREATE TYPE "VideoPurchaseType" AS ENUM ('UNDEFINED', 'SINGLE_DOWNLOAD', 'SUBSCRIPTION_BENEFIT');

-- CreateEnum
CREATE TYPE "VideoPurchaseStatus" AS ENUM ('UNDEFINED', 'ACTIVE', 'EXPIRED', 'REFUNDED');

-- CreateTable
CREATE TABLE "user_stats" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "total_paid_cents" INTEGER NOT NULL DEFAULT 0,
    "orders_count" INTEGER NOT NULL DEFAULT 0,
    "first_paid_at" TIMESTAMP(3),
    "last_paid_at" TIMESTAMP(3),
    "has_used_pro_trial" BOOLEAN NOT NULL DEFAULT false,
    "pro_trial_source" TEXT,
    "pro_trial_converted" BOOLEAN NOT NULL DEFAULT false,
    "generated_videos_count" INTEGER NOT NULL DEFAULT 0,
    "hit_paywall_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_purchases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "type" "VideoPurchaseType" NOT NULL DEFAULT 'UNDEFINED',
    "status" "VideoPurchaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "order_id" TEXT,
    "payment_id" TEXT,
    "source" TEXT,
    "metadata" JSONB,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "video_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_stats_user_id_key" ON "user_stats"("user_id");

-- CreateIndex
CREATE INDEX "video_purchases_user_id_idx" ON "video_purchases"("user_id");

-- CreateIndex
CREATE INDEX "video_purchases_task_id_idx" ON "video_purchases"("task_id");

-- CreateIndex
CREATE INDEX "video_purchases_order_id_idx" ON "video_purchases"("order_id");

-- CreateIndex
CREATE INDEX "video_purchases_status_idx" ON "video_purchases"("status");

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_purchases" ADD CONSTRAINT "video_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_purchases" ADD CONSTRAINT "video_purchases_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "video_generation_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
