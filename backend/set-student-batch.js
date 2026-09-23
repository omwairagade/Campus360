import prisma from "./src/lib/prisma.js";

try {
  const student = await prisma.student.update({
    where: {
      id: 2,
    },
    data: {
      batch: "1",
      division: "B",
    },
    select: {
      id: true,
      enrollmentNumber: true,
      semester: true,
      batch: true,
      division: true,
    },
  });

  console.log("Student updated successfully:");
  console.log(student);
} catch (error) {
  console.error("Update failed:");
  console.error(error);
} finally {
  await prisma.$disconnect();
}