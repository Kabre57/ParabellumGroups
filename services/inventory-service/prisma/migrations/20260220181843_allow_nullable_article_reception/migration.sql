-- DropForeignKey
ALTER TABLE "LigneReception" DROP CONSTRAINT "LigneReception_articleId_fkey";

-- AlterTable
ALTER TABLE "LigneReception" ALTER COLUMN "articleId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "LigneReception" ADD CONSTRAINT "LigneReception_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
