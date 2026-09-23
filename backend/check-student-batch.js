import prisma from "./src/lib/prisma.js";

try {
  const student = await prisma.student.findUnique({
    where: {
      id: 2,
    },
    select: {
      id: true,
      enrollmentNumber: true,
      batch: true,
      division: true,
    },
  });

  console.log(student);
} catch (error) {
  console.error("Error:", error);
} finally {
  await prisma.$disconnect();
}