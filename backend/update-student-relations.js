import prisma from "./src/lib/prisma.js";

try {
  await prisma.student.updateMany({
    data: {
      departmentId: 1,
      programId: 1,
    },
  });

  const students = await prisma.student.findMany({
    select: {
      id: true,
      enrollmentNumber: true,
      departmentId: true,
      programId: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  console.table(students);
} catch (error) {
  console.error("Failed to update student relationships:");
  console.error(error);
} finally {
  await prisma.$disconnect();
}