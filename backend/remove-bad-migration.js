import prisma from "./src/lib/prisma.js";

try {
  const result = await prisma.$executeRaw`
    DELETE FROM "_prisma_migrations"
    WHERE migration_name = 'link_student_department_program';
  `;

  console.log(
    `Removed ${result} incorrect migration-history record(s).`
  );
} catch (error) {
  console.error("Failed to remove migration-history record:");
  console.error(error);
} finally {
  await prisma.$disconnect();
}