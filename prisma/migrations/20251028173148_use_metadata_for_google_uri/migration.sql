/*
  Warnings:

  - You are about to drop the column `google_uri_expires_at` on the `video_assets` table. All the data in the column will be lost.
  - You are about to drop the column `google_video_uri` on the `video_assets` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."video_assets_google_video_uri_idx";

-- AlterTable
ALTER TABLE "video_assets" DROP COLUMN "google_uri_expires_at",
DROP COLUMN "google_video_uri";
