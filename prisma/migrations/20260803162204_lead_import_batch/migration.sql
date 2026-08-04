-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "importBatchId" TEXT;

-- CreateIndex
CREATE INDEX "Lead_accountId_importBatchId_idx" ON "Lead"("accountId", "importBatchId");
