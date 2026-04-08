-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_hash" TEXT;

-- CreateIndex
CREATE INDEX "users_referral_code_idx" ON "users"("referral_code");

-- RenameIndex
ALTER INDEX "affiliate_commissions_source_type_source_external_id_source_seq" RENAME TO "affiliate_commissions_source_type_source_external_id_source_key";
