-- CreateIndex
CREATE INDEX "users_utm_source_idx" ON "users"("utm_source");

-- CreateIndex
CREATE INDEX "users_is_blocked_idx" ON "users"("is_blocked");

-- CreateIndex
CREATE INDEX "users_is_primary_device_account_idx" ON "users"("is_primary_device_account");

-- CreateIndex
CREATE INDEX "users_has_purchased_idx" ON "users"("has_purchased");
