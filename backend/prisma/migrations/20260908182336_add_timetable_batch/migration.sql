-- AlterTable
ALTER TABLE "TimetableEntry" ADD COLUMN     "batch" TEXT;

-- CreateIndex
CREATE INDEX "TimetableEntry_batch_idx" ON "TimetableEntry"("batch");
