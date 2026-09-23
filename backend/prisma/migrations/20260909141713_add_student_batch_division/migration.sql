-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "batch" TEXT,
ADD COLUMN     "division" TEXT;

-- CreateIndex
CREATE INDEX "Student_batch_idx" ON "Student"("batch");

-- CreateIndex
CREATE INDEX "Student_division_idx" ON "Student"("division");

-- CreateIndex
CREATE INDEX "Student_semester_idx" ON "Student"("semester");

-- CreateIndex
CREATE INDEX "Student_programId_idx" ON "Student"("programId");

-- CreateIndex
CREATE INDEX "Student_departmentId_idx" ON "Student"("departmentId");
