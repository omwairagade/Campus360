import prisma from "./src/lib/prisma.js";

try {
  const migrations = await prisma.$queryRaw`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    ORDER BY started_at;
  `;

  const students = await prisma.$queryRaw`
    SELECT *
    FROM "Student"
    ORDER BY id;
  `;

  console.log("\n=== MIGRATIONS ===");
  console.table(migrations);

  console.log("\n=== STUDENTS ===");
  console.table(students);
} catch (error) {
  console.error("Database inspection failed:");
  console.error(error);
} finally {
  await prisma.$disconnect();
}