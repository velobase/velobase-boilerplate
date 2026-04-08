-- CreateEnum
CREATE TYPE "UserOfferType" AS ENUM ('NEW_USER_UNLOCK');

-- CreateEnum
CREATE TYPE "UserOfferState" AS ENUM ('ACTIVE', 'EXPIRED', 'CONSUMED', 'INELIGIBLE');

-- CreateTable
CREATE TABLE "user_offers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "UserOfferType" NOT NULL,
    "state" "UserOfferState" NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT,
    "variant" TEXT,
    "started_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_offers_type_state_idx" ON "user_offers"("type", "state");

-- CreateIndex
CREATE INDEX "user_offers_user_id_idx" ON "user_offers"("user_id");

-- CreateIndex
CREATE INDEX "user_offers_ends_at_idx" ON "user_offers"("ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_offers_user_id_type_key" ON "user_offers"("user_id", "type");

-- AddForeignKey
ALTER TABLE "user_offers" ADD CONSTRAINT "user_offers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
