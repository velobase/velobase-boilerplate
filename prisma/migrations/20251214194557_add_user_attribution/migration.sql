-- CreateTable
CREATE TABLE "user_attributions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "first_touch_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "landing_path" TEXT,
    "ref_host" TEXT,
    "ref_type" TEXT,
    "channel" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,
    "ad_click_id" TEXT,
    "ad_click_provider" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_attributions_user_id_key" ON "user_attributions"("user_id");

-- CreateIndex
CREATE INDEX "user_attributions_first_touch_at_idx" ON "user_attributions"("first_touch_at");

-- CreateIndex
CREATE INDEX "user_attributions_channel_idx" ON "user_attributions"("channel");

-- CreateIndex
CREATE INDEX "user_attributions_ref_host_idx" ON "user_attributions"("ref_host");

-- AddForeignKey
ALTER TABLE "user_attributions" ADD CONSTRAINT "user_attributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
