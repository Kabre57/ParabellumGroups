-- CreateTable
CREATE TABLE "bon_commande_validation_logs" (
    "id" TEXT NOT NULL,
    "bonCommandeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "StatusBonCommande" NOT NULL,
    "toStatus" "StatusBonCommande" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "bon_commande_validation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bon_commande_validation_logs_bonCommandeId_idx" ON "bon_commande_validation_logs"("bonCommandeId");

-- AddForeignKey
ALTER TABLE "bon_commande_validation_logs" ADD CONSTRAINT "bon_commande_validation_logs_bonCommandeId_fkey" FOREIGN KEY ("bonCommandeId") REFERENCES "bons_commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;
