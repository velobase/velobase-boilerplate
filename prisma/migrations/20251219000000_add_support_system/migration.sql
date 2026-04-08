-- AI Customer Support System
-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'NEEDS_APPROVAL', 'WAITING', 'SOLVED');

-- CreateEnum
CREATE TYPE "SupportActorType" AS ENUM ('USER', 'AI', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SupportEventType" AS ENUM ('MESSAGE', 'DRAFT', 'ACTION', 'NOTE', 'SYSTEM');

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "contact" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to" "SupportActorType" NOT NULL DEFAULT 'AI',
    "subject" TEXT,
    "summary" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_timeline" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "actor" "SupportActorType" NOT NULL,
    "actor_id" TEXT,
    "type" "SupportEventType" NOT NULL,
    "content" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_sync_cursors" (
    "id" TEXT NOT NULL,
    "last_uid" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_sync_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_tickets_status_assigned_to_idx" ON "support_tickets"("status", "assigned_to");

-- CreateIndex
CREATE INDEX "support_tickets_contact_idx" ON "support_tickets"("contact");

-- CreateIndex
CREATE INDEX "support_timeline_ticket_id_created_at_idx" ON "support_timeline"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "support_timeline_ticket_id_type_idx" ON "support_timeline"("ticket_id", "type");

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_timeline" ADD CONSTRAINT "support_timeline_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

