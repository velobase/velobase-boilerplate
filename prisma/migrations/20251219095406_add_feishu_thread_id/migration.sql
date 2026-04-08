-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "feishu_thread_id" TEXT;

-- CreateIndex
CREATE INDEX "support_tickets_feishu_thread_id_idx" ON "support_tickets"("feishu_thread_id");
