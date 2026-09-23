-- AlterTable
ALTER TABLE "Notice" ADD COLUMN     "createdByFacultyId" INTEGER,
ADD COLUMN     "targetBatch" TEXT,
ADD COLUMN     "targetCourseId" INTEGER,
ADD COLUMN     "targetDivision" TEXT,
ADD COLUMN     "targetSemester" INTEGER;

-- CreateIndex
CREATE INDEX "Notice_targetSemester_idx" ON "Notice"("targetSemester");

-- CreateIndex
CREATE INDEX "Notice_targetCourseId_idx" ON "Notice"("targetCourseId");

-- CreateIndex
CREATE INDEX "Notice_targetBatch_idx" ON "Notice"("targetBatch");

-- CreateIndex
CREATE INDEX "Notice_targetDivision_idx" ON "Notice"("targetDivision");

-- CreateIndex
CREATE INDEX "Notice_createdByFacultyId_idx" ON "Notice"("createdByFacultyId");

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_targetCourseId_fkey" FOREIGN KEY ("targetCourseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_createdByFacultyId_fkey" FOREIGN KEY ("createdByFacultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
