-- DropForeignKey
ALTER TABLE "touch_schedules" DROP CONSTRAINT "touch_schedules_scene_key_fkey";

-- AlterTable
ALTER TABLE "touch_schedules" ALTER COLUMN "scene_key" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "touch_schedules" ADD CONSTRAINT "touch_schedules_scene_key_fkey" FOREIGN KEY ("scene_key") REFERENCES "touch_scenes"("key") ON DELETE SET NULL ON UPDATE CASCADE;
