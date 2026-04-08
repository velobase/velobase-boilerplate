/*
  Warnings:

  - You are about to drop the column `body_html` on the `touch_scenes` table. All the data in the column will be lost.
  - You are about to drop the column `body_text` on the `touch_scenes` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `touch_scenes` table. All the data in the column will be lost.
  - You are about to drop the column `touch_type` on the `touch_schedules` table. All the data in the column will be lost.
  - Made the column `scene_key` on table `touch_schedules` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "TouchTriggerType" AS ENUM ('SCHEDULED', 'EVENT', 'MANUAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TouchChannel" ADD VALUE 'SMS';
ALTER TYPE "TouchChannel" ADD VALUE 'PUSH';

-- DropForeignKey
ALTER TABLE "touch_schedules" DROP CONSTRAINT "touch_schedules_scene_key_fkey";

-- AlterTable
ALTER TABLE "touch_records" ADD COLUMN     "template_id" TEXT;

-- AlterTable
ALTER TABLE "touch_scenes" DROP COLUMN "body_html",
DROP COLUMN "body_text",
DROP COLUMN "subject",
ADD COLUMN     "trigger_type" "TouchTriggerType" NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable: First set default value for existing NULL records, then make NOT NULL
UPDATE "touch_schedules" SET "scene_key" = 'sub_renewal_reminder_d1' WHERE "scene_key" IS NULL;

ALTER TABLE "touch_schedules" DROP COLUMN "touch_type",
ALTER COLUMN "scene_key" SET NOT NULL;

-- DropEnum
DROP TYPE "TouchType";

-- CreateTable
CREATE TABLE "touch_templates" (
    "id" TEXT NOT NULL,
    "scene_key" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "version" TEXT NOT NULL DEFAULT 'default',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "subject" TEXT,
    "body_text" TEXT,
    "body_html" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "touch_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "touch_templates_scene_key_is_active_is_default_idx" ON "touch_templates"("scene_key", "is_active", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "touch_templates_scene_key_locale_version_key" ON "touch_templates"("scene_key", "locale", "version");

-- CreateIndex
CREATE INDEX "touch_records_template_id_idx" ON "touch_records"("template_id");

-- CreateIndex
CREATE INDEX "touch_schedules_scene_key_idx" ON "touch_schedules"("scene_key");

-- AddForeignKey
ALTER TABLE "touch_templates" ADD CONSTRAINT "touch_templates_scene_key_fkey" FOREIGN KEY ("scene_key") REFERENCES "touch_scenes"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "touch_schedules" ADD CONSTRAINT "touch_schedules_scene_key_fkey" FOREIGN KEY ("scene_key") REFERENCES "touch_scenes"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "touch_records" ADD CONSTRAINT "touch_records_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "touch_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
