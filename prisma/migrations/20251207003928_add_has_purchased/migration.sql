/*
  Warnings:

  - A unique constraint covering the columns `[canonical_email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "canonical_email" TEXT,
ADD COLUMN     "has_purchased" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "users_canonical_email_key" ON "users"("canonical_email");
