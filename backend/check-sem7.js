import prisma from "./src/lib/prisma.js";

try {
  const courses =
    await prisma.course.findMany({
      where: {
        semester: 7,
      },
      select: {
        id: true,
        code: true,
        name: true,
        facultyId: true,
      },
      orderBy: {
        id: "asc",
      },
    });

  console.table(courses);

  console.log(
    `Semester VII course count: ${courses.length}`
  );
} catch (error) {
  console.error(
    "Failed to check Semester VII courses:",
    error
  );
} finally {
  await prisma.$disconnect();
}