ALTER TABLE "clients"
ADD COLUMN IF NOT EXISTS "rccm" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "clients_rccm_key"
ON "clients" ("rccm");

ALTER TABLE "adresse_clients"
ALTER COLUMN "codePostal" DROP NOT NULL;

ALTER TABLE "adresse_clients"
ALTER COLUMN "pays" SET DEFAULT 'Cote d''Ivoire';

ALTER TABLE "preferences_clients"
ALTER COLUMN "fuseauHoraire" SET DEFAULT 'Africa/Abidjan';

ALTER TABLE "preferences_clients"
ALTER COLUMN "devise" SET DEFAULT 'XOF';
