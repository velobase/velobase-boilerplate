/*
  Warnings:

  - A unique constraint covering the columns `[promo_code_id,user_id]` on the table `promo_code_redemptions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "promo_code_redemptions_promo_code_id_user_id_key" ON "promo_code_redemptions"("promo_code_id", "user_id");
