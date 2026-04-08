-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_bounced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "email_complained" BOOLEAN NOT NULL DEFAULT false;
