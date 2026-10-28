ALTER TABLE "notifications" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "notifications_idempotencyKey_key" ON "notifications"("idempotencyKey");
