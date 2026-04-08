-- AlterTable
ALTER TABLE "users" ADD COLUMN     "signup_ip" TEXT;

-- CreateIndex
CREATE INDEX "users_signup_ip_idx" ON "users"("signup_ip");
