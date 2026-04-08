-- AlterTable
ALTER TABLE "users" ADD COLUMN     "device_key_at_signup" TEXT,
ADD COLUMN     "is_primary_device_account" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "video_generation_tasks" ADD COLUMN     "processed_input_url" TEXT,
ADD COLUMN     "remove_watermark" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "products_status_is_available_deleted_at_idx" ON "products"("status", "is_available", "deleted_at");

-- CreateIndex
CREATE INDEX "products_type_status_deleted_at_idx" ON "products"("type", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_device_key_at_signup_created_at_idx" ON "users"("device_key_at_signup", "created_at");
