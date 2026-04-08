-- AlterTable
ALTER TABLE "video_generation_tasks" ADD COLUMN     "input_image_hash" TEXT;

-- CreateIndex
CREATE INDEX "video_generation_tasks_input_image_hash_idx" ON "video_generation_tasks"("input_image_hash");
