ALTER TABLE "demandes_achat"
ADD COLUMN "demandeurEmail" TEXT,
ADD COLUMN "serviceId" INTEGER,
ADD COLUMN "serviceName" TEXT,
ADD COLUMN "fournisseurId" TEXT,
ADD COLUMN "objet" TEXT,
ADD COLUMN "devise" TEXT NOT NULL DEFAULT 'XOF',
ADD COLUMN "dateBesoin" TIMESTAMP(3),
ADD COLUMN "montantHT" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "montantTVA" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "montantTTC" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "notes" TEXT,
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedByUserId" TEXT,
ADD COLUMN "approvedByServiceId" INTEGER,
ADD COLUMN "approvedByServiceName" TEXT,
ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "demandes_achat"
ADD CONSTRAINT "demandes_achat_fournisseurId_fkey"
FOREIGN KEY ("fournisseurId") REFERENCES "fournisseurs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bons_commande"
ADD COLUMN "serviceId" INTEGER,
ADD COLUMN "serviceName" TEXT,
ADD COLUMN "montantHT" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "montantTVA" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "createdFromApproval" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "lignes_commande"
ADD COLUMN "articleId" TEXT,
ADD COLUMN "referenceArticle" TEXT,
ADD COLUMN "categorie" TEXT;

CREATE TABLE "lignes_demande_achat" (
    "id" TEXT NOT NULL,
    "demandeAchatId" TEXT NOT NULL,
    "articleId" TEXT,
    "referenceArticle" TEXT,
    "designation" TEXT NOT NULL,
    "categorie" TEXT,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" DECIMAL(10,2) NOT NULL,
    "tva" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "montantHT" DECIMAL(12,2) NOT NULL,
    "montantTTC" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lignes_demande_achat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "demande_achat_approval_logs" (
    "id" TEXT NOT NULL,
    "demandeAchatId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "StatusDemandeAchat" NOT NULL,
    "toStatus" "StatusDemandeAchat" NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "actorServiceId" INTEGER,
    "actorServiceName" TEXT,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demande_achat_approval_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lignes_demande_achat_demandeAchatId_idx" ON "lignes_demande_achat"("demandeAchatId");
CREATE INDEX "demande_achat_approval_logs_demandeAchatId_idx" ON "demande_achat_approval_logs"("demandeAchatId");
CREATE INDEX "demandes_achat_serviceId_idx" ON "demandes_achat"("serviceId");
CREATE INDEX "demandes_achat_fournisseurId_idx" ON "demandes_achat"("fournisseurId");
CREATE INDEX "bons_commande_serviceId_idx" ON "bons_commande"("serviceId");

ALTER TABLE "lignes_demande_achat"
ADD CONSTRAINT "lignes_demande_achat_demandeAchatId_fkey"
FOREIGN KEY ("demandeAchatId") REFERENCES "demandes_achat"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "demande_achat_approval_logs"
ADD CONSTRAINT "demande_achat_approval_logs_demandeAchatId_fkey"
FOREIGN KEY ("demandeAchatId") REFERENCES "demandes_achat"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "procurement_outbox_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "correlationId" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "procurement_outbox_events_status_nextAttemptAt_idx" ON "procurement_outbox_events"("status", "nextAttemptAt");
CREATE INDEX "procurement_outbox_events_aggregateType_aggregateId_idx" ON "procurement_outbox_events"("aggregateType", "aggregateId");
