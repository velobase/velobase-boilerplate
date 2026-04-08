-- CreateEnum
CREATE TYPE "TouchChannel" AS ENUM ('EMAIL');

-- CreateEnum
CREATE TYPE "TouchType" AS ENUM ('SUB_RENEWAL_REMINDER_D1');

-- CreateEnum
CREATE TYPE "TouchScheduleStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'CANCELLED', 'SUPERSEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "TouchRecordStatus" AS ENUM ('SENT', 'DELIVERED', 'DELIVERY_DELAYED', 'BOUNCED', 'COMPLAINED', 'OPENED', 'CLICKED', 'FAILED');

-- CreateTable
CREATE TABLE "touch_schedules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" "TouchChannel" NOT NULL,
    "touch_type" "TouchType" NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "timezone" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "next_attempt_at" TIMESTAMP(3) NOT NULL,
    "status" "TouchScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "locked_at" TIMESTAMP(3),
    "lock_id" TEXT,
    "last_error" TEXT,
    "payload" JSONB,
    "sent_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "superseded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "touch_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "touch_records" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'resend',
    "provider_message_id" TEXT,
    "to_email" TEXT NOT NULL,
    "subject" TEXT,
    "status" "TouchRecordStatus" NOT NULL,
    "error" TEXT,
    "meta" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "touch_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "touch_schedules_dedupe_key_key" ON "touch_schedules"("dedupe_key");

-- CreateIndex
CREATE INDEX "touch_schedules_status_next_attempt_at_idx" ON "touch_schedules"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "touch_schedules_reference_type_reference_id_idx" ON "touch_schedules"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "touch_schedules_user_id_created_at_idx" ON "touch_schedules"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "touch_records_schedule_id_occurred_at_idx" ON "touch_records"("schedule_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "touch_records_schedule_id_attempt_number_key" ON "touch_records"("schedule_id", "attempt_number");

-- CreateIndex
CREATE UNIQUE INDEX "touch_records_provider_provider_message_id_key" ON "touch_records"("provider", "provider_message_id");

-- AddForeignKey
ALTER TABLE "touch_schedules" ADD CONSTRAINT "touch_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "touch_records" ADD CONSTRAINT "touch_records_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "touch_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
