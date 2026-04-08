-- AlterTable
ALTER TABLE "video_assets" ADD COLUMN     "google_uri_expires_at" TIMESTAMP(3),
ADD COLUMN     "google_video_uri" TEXT;

-- CreateIndex
CREATE INDEX "video_assets_google_video_uri_idx" ON "video_assets"("google_video_uri");
