-- Add idempotency unique key for subscription cycles
ALTER TABLE "membership_user_subscription_cycles" ADD COLUMN IF NOT EXISTS "unique_key" TEXT;

-- UNIQUE allows multiple NULLs in Postgres, which is desired for legacy rows
CREATE UNIQUE INDEX IF NOT EXISTS "membership_user_subscription_cycles_unique_key_key"
  ON "membership_user_subscription_cycles"("unique_key");

CREATE INDEX IF NOT EXISTS "membership_user_subscription_cycles_unique_key_idx"
  ON "membership_user_subscription_cycles"("unique_key");
