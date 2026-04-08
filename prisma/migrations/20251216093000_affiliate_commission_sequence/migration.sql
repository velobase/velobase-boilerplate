-- AlterTable
ALTER TABLE "affiliate_commissions"
  ADD COLUMN "source_sequence" INTEGER NOT NULL DEFAULT 0;

-- DropIndex (old unique)
DROP INDEX IF EXISTS "affiliate_commissions_source_type_source_external_id_key";

-- CreateIndex (new unique)
CREATE UNIQUE INDEX "affiliate_commissions_source_type_source_external_id_source_sequence_key"
  ON "affiliate_commissions"("source_type", "source_external_id", "source_sequence");



