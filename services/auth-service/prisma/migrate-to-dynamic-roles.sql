-- Migration script: Transition from enum UserRole to dynamic Role table
-- This script safely migrates existing data

BEGIN;

-- Step 1: Create the roles table
CREATE TABLE IF NOT EXISTS "roles" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "code" VARCHAR(50) NOT NULL UNIQUE,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on is_active
CREATE INDEX IF NOT EXISTS "roles_is_active_idx" ON "roles"("is_active");

-- Step 2: Insert the 2 system roles
INSERT INTO "roles" ("name", "code", "description", "is_system", "is_active")
VALUES 
    ('Administrateur', 'ADMIN', 'Accès complet au système', true, true),
    ('Employé', 'EMPLOYEE', 'Utilisateur standard', true, true)
ON CONFLICT (code) DO NOTHING;

-- Step 3: Add role_id column to users table (nullable for migration)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role_id" INTEGER;

-- Step 4: Migrate existing user roles to role_id
-- Map old enum values to new role IDs
UPDATE "users" SET "role_id" = (SELECT id FROM "roles" WHERE code = 'ADMIN')
WHERE "role" = 'ADMIN';

UPDATE "users" SET "role_id" = (SELECT id FROM "roles" WHERE code = 'EMPLOYEE')
WHERE "role" IN ('EMPLOYEE', 'SERVICE_MANAGER', 'ACCOUNTANT', 'PURCHASING_MANAGER', 'GENERAL_DIRECTOR');

-- Step 5: Drop the old role enum column
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";

-- Step 6: Add foreign key constraint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" 
FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index on role_id
CREATE INDEX IF NOT EXISTS "users_role_id_idx" ON "users"("role_id");

-- Step 7: Update role_permissions table
-- Add role_id column
ALTER TABLE "role_permissions" ADD COLUMN IF NOT EXISTS "role_id" INTEGER;

-- Migrate existing role_permissions data
-- Map old enum values to new role IDs
UPDATE "role_permissions" SET "role_id" = (SELECT id FROM "roles" WHERE code = 'ADMIN')
WHERE "role" = 'ADMIN';

UPDATE "role_permissions" SET "role_id" = (SELECT id FROM "roles" WHERE code = 'EMPLOYEE')
WHERE "role" IN ('EMPLOYEE', 'SERVICE_MANAGER', 'ACCOUNTANT', 'PURCHASING_MANAGER', 'GENERAL_DIRECTOR');

-- Drop the old role enum column
ALTER TABLE "role_permissions" DROP COLUMN IF EXISTS "role";

-- Add foreign key constraint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" 
FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old unique constraint if exists
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_role_permission_id_key";

-- Add new unique constraint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_permission_id_key" 
UNIQUE ("role_id", "permission_id");

-- Create index
CREATE INDEX IF NOT EXISTS "role_permissions_role_id_idx" ON "role_permissions"("role_id");

-- Step 8: Drop the old UserRole enum type
DROP TYPE IF EXISTS "UserRole" CASCADE;

COMMIT;
