-- AuditLog: add oldValue and level
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "old_value" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "level" TEXT NOT NULL DEFAULT 'INFO';
CREATE INDEX IF NOT EXISTS "audit_logs_level_idx" ON "audit_logs"("level");

-- Service: add imageUrl
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
