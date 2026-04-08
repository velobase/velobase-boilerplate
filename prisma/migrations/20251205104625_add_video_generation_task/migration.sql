-- CreateTable
CREATE TABLE "video_generation_tasks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "external_id" TEXT,
    "input_type" TEXT NOT NULL DEFAULT 'image',
    "input_url" TEXT,
    "prompt" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 5,
    "resolution" TEXT NOT NULL DEFAULT '720p',
    "seed" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER,
    "error" TEXT,
    "output_url" TEXT,
    "credits_cost" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "video_generation_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_generation_tasks_user_id_status_idx" ON "video_generation_tasks"("user_id", "status");

-- CreateIndex
CREATE INDEX "video_generation_tasks_external_id_idx" ON "video_generation_tasks"("external_id");

-- CreateIndex
CREATE INDEX "video_generation_tasks_user_id_created_at_idx" ON "video_generation_tasks"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "video_generation_tasks" ADD CONSTRAINT "video_generation_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
