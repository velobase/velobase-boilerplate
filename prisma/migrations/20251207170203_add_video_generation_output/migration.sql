-- AlterTable
ALTER TABLE "video_generation_tasks" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "video_generation_outputs" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "index" INTEGER NOT NULL DEFAULT 0,
    "external_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER,
    "error" TEXT,
    "output_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "video_generation_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_generation_outputs_task_id_idx" ON "video_generation_outputs"("task_id");

-- CreateIndex
CREATE INDEX "video_generation_outputs_external_id_idx" ON "video_generation_outputs"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_generation_outputs_task_id_index_key" ON "video_generation_outputs"("task_id", "index");

-- AddForeignKey
ALTER TABLE "video_generation_outputs" ADD CONSTRAINT "video_generation_outputs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "video_generation_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
