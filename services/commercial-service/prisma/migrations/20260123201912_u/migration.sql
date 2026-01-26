-- CreateTable
CREATE TABLE "prospects" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "position" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "sector" TEXT,
    "employees" INTEGER,
    "revenue" DOUBLE PRECISION,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'France',
    "stage" TEXT NOT NULL DEFAULT 'preparation',
    "priority" TEXT NOT NULL DEFAULT 'C',
    "score" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "assignedToId" TEXT,
    "potentialValue" DOUBLE PRECISION,
    "closingProbability" DOUBLE PRECISION,
    "estimatedCloseDate" TIMESTAMP(3),
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isConverted" BOOLEAN NOT NULL DEFAULT false,
    "convertedAt" TIMESTAMP(3),
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prospect_activities" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "outcome" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospect_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prospection_stats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalProspects" INTEGER NOT NULL DEFAULT 0,
    "newProspects" INTEGER NOT NULL DEFAULT 0,
    "qualifiedProspects" INTEGER NOT NULL DEFAULT 0,
    "convertedProspects" INTEGER NOT NULL DEFAULT 0,
    "byStagePreparation" INTEGER NOT NULL DEFAULT 0,
    "byStageResearch" INTEGER NOT NULL DEFAULT 0,
    "byStageContact" INTEGER NOT NULL DEFAULT 0,
    "byStageDiscovery" INTEGER NOT NULL DEFAULT 0,
    "byStageProposal" INTEGER NOT NULL DEFAULT 0,
    "byStageWon" INTEGER NOT NULL DEFAULT 0,
    "byStageLost" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospection_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prospects_stage_idx" ON "prospects"("stage");

-- CreateIndex
CREATE INDEX "prospects_assignedToId_idx" ON "prospects"("assignedToId");

-- CreateIndex
CREATE INDEX "prospects_isConverted_idx" ON "prospects"("isConverted");

-- CreateIndex
CREATE INDEX "prospect_activities_prospectId_idx" ON "prospect_activities"("prospectId");

-- CreateIndex
CREATE INDEX "prospect_activities_type_idx" ON "prospect_activities"("type");

-- CreateIndex
CREATE INDEX "prospect_activities_scheduledAt_idx" ON "prospect_activities"("scheduledAt");

-- CreateIndex
CREATE INDEX "prospection_stats_date_idx" ON "prospection_stats"("date");

-- AddForeignKey
ALTER TABLE "prospect_activities" ADD CONSTRAINT "prospect_activities_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
