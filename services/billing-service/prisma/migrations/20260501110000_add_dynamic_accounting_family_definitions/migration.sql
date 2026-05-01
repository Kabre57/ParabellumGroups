CREATE TABLE "accounting_family_definitions" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "displayType" TEXT NOT NULL,
  "accountType" "AccountingAccountType" NOT NULL,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "createdByUserId" TEXT,
  "createdByEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "accounting_family_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accounting_family_definitions_code_key"
ON "accounting_family_definitions"("code");

CREATE INDEX "accounting_family_definitions_displayType_idx"
ON "accounting_family_definitions"("displayType");

CREATE INDEX "accounting_family_definitions_accountType_idx"
ON "accounting_family_definitions"("accountType");

CREATE INDEX "accounting_family_definitions_isSystem_idx"
ON "accounting_family_definitions"("isSystem");

INSERT INTO "accounting_family_definitions" (
  "id",
  "code",
  "label",
  "description",
  "displayType",
  "accountType",
  "isSystem",
  "sortOrder"
)
VALUES
  ('family_customer_receivable', 'CUSTOMER_RECEIVABLE', 'Clients', 'Créances clients utilisées dans les encaissements et les factures.', 'Créance', 'ASSET', true, 10),
  ('family_supplier_payable', 'SUPPLIER_PAYABLE', 'Fournisseurs', 'Dettes fournisseurs utilisées dans les achats et les décaissements.', 'Dette', 'LIABILITY', true, 20),
  ('family_purchase_expense', 'PURCHASE_EXPENSE', 'Achats de marchandises', 'Charges principales liées aux achats, approvisionnements et engagements.', 'Charge', 'EXPENSE', true, 30),
  ('family_misc_expense', 'MISC_EXPENSE', 'Charges diverses', 'Charges hors achats principaux.', 'Charge', 'EXPENSE', true, 40),
  ('family_revenue', 'REVENUE', 'Ventes et prestations', 'Produits de ventes et prestations.', 'Produit', 'REVENUE', true, 50),
  ('family_treasury_bank', 'TREASURY_BANK', 'Banque', 'Comptes de trésorerie bancaire.', 'Trésorerie', 'ASSET', true, 60),
  ('family_treasury_cash', 'TREASURY_CASH', 'Caisse', 'Comptes de caisse pour les espèces.', 'Trésorerie', 'ASSET', true, 70)
ON CONFLICT ("code") DO NOTHING;

ALTER TABLE "accounting_family_rules"
ALTER COLUMN "family" TYPE TEXT USING "family"::text;

ALTER TABLE "accounting_family_rules"
ADD CONSTRAINT "accounting_family_rules_family_fkey"
FOREIGN KEY ("family") REFERENCES "accounting_family_definitions"("code")
ON DELETE CASCADE ON UPDATE CASCADE;
