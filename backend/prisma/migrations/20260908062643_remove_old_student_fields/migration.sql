-- Remove the old text-based department and program fields.
-- The new departmentId and programId fields are already populated
-- for the existing student records.

ALTER TABLE "Student"
DROP COLUMN "department",
DROP COLUMN "program";