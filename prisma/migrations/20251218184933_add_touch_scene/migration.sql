-- AlterTable
ALTER TABLE "touch_schedules" ADD COLUMN     "scene_key" TEXT;

-- CreateTable
CREATE TABLE "touch_scenes" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" "TouchChannel" NOT NULL DEFAULT 'EMAIL',
    "subject" TEXT,
    "body_text" TEXT,
    "body_html" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "touch_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "touch_scenes_key_key" ON "touch_scenes"("key");

-- CreateIndex
CREATE INDEX "touch_scenes_key_is_active_idx" ON "touch_scenes"("key", "is_active");

-- AddForeignKey
ALTER TABLE "touch_schedules" ADD CONSTRAINT "touch_schedules_scene_key_fkey" FOREIGN KEY ("scene_key") REFERENCES "touch_scenes"("key") ON DELETE SET NULL ON UPDATE CASCADE;
