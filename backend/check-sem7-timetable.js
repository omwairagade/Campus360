import prisma from "./src/lib/prisma.js";

try {
  const rows =
    await prisma.timetableEntry.findMany({
      where: {
        course: {
          semester: 7,
        },
      },

      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        batch: true,
        room: true,
        classType: true,

        course: {
          select: {
            code: true,
            name: true,
          },
        },
      },

      orderBy: [
        {
          dayOfWeek: "asc",
        },
        {
          startTime: "asc",
        },
      ],
    });

  const displayRows = rows.map(
    (row) => ({
      id: row.id,
      day: row.dayOfWeek,
      time: `${row.startTime}-${row.endTime}`,
      course: row.course.code,
      batch:
        row.batch ?? "COMMON",
      room: row.room,
      type: row.classType,
    })
  );

  console.table(displayRows);

  console.log(
    `Total Semester VII timetable entries: ${rows.length}`
  );

  console.log(
    `Common: ${
      rows.filter(
        (row) => row.batch == null
      ).length
    }`
  );

  console.log(
    `Batch 1: ${
      rows.filter(
        (row) => row.batch === "1"
      ).length
    }`
  );

  console.log(
    `Batch 2: ${
      rows.filter(
        (row) => row.batch === "2"
      ).length
    }`
  );

  console.log(
    `Batch 3: ${
      rows.filter(
        (row) => row.batch === "3"
      ).length
    }`
  );
} catch (error) {
  console.error(
    "Failed to check Semester VII timetable:",
    error
  );
} finally {
  await prisma.$disconnect();
}