-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MARKETING_PROMO', 'PRODUCT_UPDATE', 'NEWSLETTER', 'BILLING_ALERT', 'SYSTEM_NOTICE');

-- CreateTable
CREATE TABLE "user_notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_notification_preferences_type_email_enabled_idx" ON "user_notification_preferences"("type", "email_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preferences_user_id_type_key" ON "user_notification_preferences"("user_id", "type");

-- AddForeignKey
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
