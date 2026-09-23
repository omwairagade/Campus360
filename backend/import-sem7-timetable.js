import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client.ts";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

/*
  ============================================================
  CAMPUS360 - SEMESTER VII DIVISION B TIMETABLE IMPORTER
  ============================================================

  Source:
  FY_(R)_Div-B_TT.pdf

  Academic Year : 2026-27
  Program       : B.Tech CSE
  Semester      : VII
  Division      : B

  Day numbering used by Admin timetable:
    Sunday    = 0
    Monday    = 1
    Tuesday   = 2
    Wednesday = 3
    Thursday  = 4
    Friday    = 5
    Saturday  = 6

  Batch values:
    null = Common / All Batches
    "1"  = Batch 1
    "2"  = Batch 2
    "3"  = Batch 3
*/

/* ============================================================
   COURSE CODES
   ============================================================ */

const COURSE_CODES = {
  TOC: "230GCSB102_07",
  CT: "231GCSB42_07",
  RMMT: "230IRMB02_07",
  IOC: "230GMEB61_07",
  MMC1: "230GETB09_07",

  INDUSTRIAL_ROBOT: "230GRAB55_07",
  SENSORS_ACTUATORS: "230GMTB01_07",

  DSH: "230GCSB67_07",
  PPL: "230GAIB88_07",
  PROJ: "230GCSB90_07",
  IIC: "230UPOB02_07",
};

/* ============================================================
   FACULTY EMPLOYEE IDs CREATED BY SEMESTER VII IMPORT
   ============================================================ */

const FACULTY_EMPLOYEE_IDS = {
  KP: "SEM7-KP-001",
  SH: "SEM7-SH-001",
  NL: "SEM7-NL-001",
  OP: "SEM7-OP-001",
  PB: "SEM7-PB-001",
  AP: "SEM7-AP-001",
  PC: "SEM7-PC-001",
  AW: "SEM7-AW-001",
};

/* ============================================================
   COMMON WEEKLY SCHEDULE
   ============================================================ */

/*
  The PDF identifies these regular course slots.

  The 02:00 - 05:00 T&P sessions are not imported because
  the PDF does not provide a corresponding course code for
  T&P and the application requires a Course relation.
*/

const commonSchedule = [
  {
    dayOfWeek: 1,
    startTime: "08:15",
    endTime: "09:15",
    courseCode: COURSE_CODES.CT,
    facultyKey: "SH",
    room: "GD 103",
    classType: "Lecture",
  },

  {
    dayOfWeek: 1,
    startTime: "09:15",
    endTime: "10:15",
    courseCode: COURSE_CODES.DSH,
    facultyKey: "AP",
    room: "GD 103",
    classType: "Lecture",
  },

  {
    dayOfWeek: 2,
    startTime: "08:15",
    endTime: "09:15",
    courseCode: COURSE_CODES.CT,
    facultyKey: "SH",
    room: "GD 103",
    classType: "Lecture",
  },

  {
    dayOfWeek: 2,
    startTime: "09:15",
    endTime: "10:15",
    courseCode: COURSE_CODES.IOC,
    facultyKey: "OP",
    room: "GD 103",
    classType: "Lecture",
  },

  {
    dayOfWeek: 3,
    startTime: "08:15",
    endTime: "09:15",
    courseCode: COURSE_CODES.RMMT,
    facultyKey: "NL",
    room: "GD 103",
    classType: "Lecture",
  },

  {
    dayOfWeek: 3,
    startTime: "09:15",
    endTime: "10:15",
    courseCode: COURSE_CODES.CT,
    facultyKey: "SH",
    room: "GD 103",
    classType: "Lecture",
  },

  {
    dayOfWeek: 3,
    startTime: "10:30",
    endTime: "11:30",
    courseCode: COURSE_CODES.TOC,
    facultyKey: "KP",
    room: "GD 401",
    classType: "Lecture",
  },

  {
    dayOfWeek: 3,
    startTime: "11:30",
    endTime: "12:30",
    courseCode: COURSE_CODES.RMMT,
    facultyKey: "NL",
    room: "GD 401",
    classType: "Lecture",
  },

  {
    dayOfWeek: 4,
    startTime: "08:15",
    endTime: "09:15",
    courseCode: COURSE_CODES.RMMT,
    facultyKey: "NL",
    room: "GD 420",
    classType: "Lecture",
  },

  {
    dayOfWeek: 4,
    startTime: "09:15",
    endTime: "10:15",
    courseCode: COURSE_CODES.MMC1,
    facultyKey: "PB",
    room: "GD 420",
    classType: "Lecture",
  },

  {
    dayOfWeek: 4,
    startTime: "10:30",
    endTime: "11:30",
    courseCode: COURSE_CODES.SENSORS_ACTUATORS,
    facultyKey: null,
    room: "GD 103",
    classType: "Lecture",
    batch: "2",
  },

  {
    dayOfWeek: 4,
    startTime: "11:30",
    endTime: "12:30",
    courseCode: COURSE_CODES.IOC,
    facultyKey: "OP",
    room: "GD 103",
    classType: "Lecture",
  },

  {
    dayOfWeek: 5,
    startTime: "08:15",
    endTime: "09:15",
    courseCode: COURSE_CODES.IIC,
    facultyKey: "AW",
    room: "GD 103",
    classType: "Lecture",
  },

  {
    dayOfWeek: 5,
    startTime: "09:15",
    endTime: "10:15",
    courseCode: COURSE_CODES.IIC,
    facultyKey: "AW",
    room: "GD 103",
    classType: "Lecture",
  },
];

/* ============================================================
   BATCH-WISE CONDUCTION
   ============================================================ */

/*
  PDF:

  Monday:
    B1 - MMC1
    B2 - MMC2
    B3 - PPL

  Tuesday:
    B1 - PPL
    B2 - MMC1
    B3 - MMC2

  Friday:
    B1 - MMC2
    B2 - PPL
    B3 - MMC1

  The PDF explicitly provides rooms for these combinations
  where shown.
*/

const batchSchedule = [
  /* ================= MONDAY ================= */

  {
    dayOfWeek: 1,
    startTime: "10:30",
    endTime: "12:30",
    batch: "1",
    courseCode: COURSE_CODES.MMC1,
    facultyKey: "PB",
    room: "GD-405",
    classType: "Practical",
  },

  {
    dayOfWeek: 1,
    startTime: "10:30",
    endTime: "12:30",
    batch: "3",
    courseCode: COURSE_CODES.PPL,
    facultyKey: "PC",
    room: "SS2 LAB",
    classType: "Practical",
  },

  /*
    B2-MMC2 is shown in the PDF but the source does not
    uniquely identify which MMC2 course row should be used
    for this slot beyond the MMC2 abbreviation.
    We therefore do not invent a course mapping here.
  */

  /* ================= TUESDAY ================= */

  {
    dayOfWeek: 2,
    startTime: "10:30",
    endTime: "12:30",
    batch: "1",
    courseCode: COURSE_CODES.PPL,
    facultyKey: "PC",
    room: "SS2 LAB",
    classType: "Practical",
  },

  {
    dayOfWeek: 2,
    startTime: "10:30",
    endTime: "12:30",
    batch: "2",
    courseCode: COURSE_CODES.MMC1,
    facultyKey: "PB",
    room: "GD-405",
    classType: "Practical",
  },

  /*
    B3-MMC2 is shown in the PDF but no third MMC2 course
    is specified in the course-details section.
  */

  /* ================= FRIDAY ================= */

  {
    dayOfWeek: 5,
    startTime: "08:15",
    endTime: "10:15",
    batch: "2",
    courseCode: COURSE_CODES.PPL,
    facultyKey: "PC",
    room: "SS2 LAB",
    classType: "Practical",
  },

  {
    dayOfWeek: 5,
    startTime: "08:15",
    endTime: "10:15",
    batch: "3",
    courseCode: COURSE_CODES.MMC1,
    facultyKey: "PB",
    room: "GD-405",
    classType: "Practical",
  },

  /*
    B1-MMC2 is explicitly listed as:

      B1-MMC2 (GD-409)

    and MMC2 course details identify Industrial Robot
    as Batch-1.
  */

  {
    dayOfWeek: 5,
    startTime: "08:15",
    endTime: "10:15",
    batch: "1",
    courseCode: COURSE_CODES.INDUSTRIAL_ROBOT,
    facultyKey: null,
    room: "GD-409",
    classType: "Practical",
  },
];

/* ============================================================
   SATURDAY SPECIAL SESSION
   ============================================================ */

/*
  The PDF explicitly identifies:

    MMC 2 (IR)
    Batch-1
    CC Lab
    1:15 - 3:15

  Therefore this is imported as the Industrial Robot
  course for Batch 1.
*/

const specialSchedule = [
  {
    dayOfWeek: 6,
    startTime: "13:15",
    endTime: "15:15",
    batch: "1",
    courseCode: COURSE_CODES.INDUSTRIAL_ROBOT,
    facultyKey: null,
    room: "CC Lab",
    classType: "Practical",
  },
];

/* ============================================================
   HELPERS
   ============================================================ */

async function getCourseMap() {
  const codes = Object.values(
    COURSE_CODES
  );

  const courses =
    await prisma.course.findMany({
      where: {
        code: {
          in: codes,
        },
      },

      select: {
        id: true,
        code: true,
        name: true,
        semester: true,
      },
    });

  const courseMap = new Map();

  for (const course of courses) {
    courseMap.set(
      course.code,
      course
    );
  }

  return courseMap;
}

async function getFacultyMap() {
  const employeeIds =
    Object.values(
      FACULTY_EMPLOYEE_IDS
    );

  const faculty =
    await prisma.faculty.findMany({
      where: {
        employeeId: {
          in: employeeIds,
        },
      },

      select: {
        id: true,
        employeeId: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

  const facultyMap = new Map();

  for (const facultyRecord of faculty) {
    facultyMap.set(
      facultyRecord.employeeId,
      facultyRecord
    );
  }

  return facultyMap;
}

function resolveFaculty(
  facultyKey,
  facultyMap
) {
  if (!facultyKey) {
    return null;
  }

  const employeeId =
    FACULTY_EMPLOYEE_IDS[
      facultyKey
    ];

  if (!employeeId) {
    return null;
  }

  return (
    facultyMap.get(employeeId)
      ?.id || null
  );
}

function timetableSignature({
  courseId,
  facultyId,
  dayOfWeek,
  startTime,
  endTime,
  room,
  classType,
  batch,
}) {
  return [
    courseId,
    facultyId ?? "NULL",
    dayOfWeek,
    startTime,
    endTime,
    room ?? "NULL",
    classType,
    batch ?? "COMMON",
  ].join("|");
}

async function deleteExistingSemester7Entries(
  courseMap
) {
  const courseIds =
    Array.from(
      courseMap.values()
    ).map(
      (course) => course.id
    );

  if (courseIds.length === 0) {
    return 0;
  }

  const result =
    await prisma.timetableEntry.deleteMany(
      {
        where: {
          courseId: {
            in: courseIds,
          },
        },
      }
    );

  return result.count;
}

async function prepareEntries(
  schedule,
  courseMap,
  facultyMap
) {
  const result = [];

  for (const entry of schedule) {
    const course =
      courseMap.get(
        entry.courseCode
      );

    if (!course) {
      console.warn(
        `WARNING: Course not found for ${entry.courseCode}. Skipping timetable row.`
      );

      continue;
    }

    const facultyId =
      resolveFaculty(
        entry.facultyKey,
        facultyMap
      );

    if (
      entry.facultyKey &&
      !facultyId
    ) {
      console.warn(
        `WARNING: Faculty ${entry.facultyKey} not found for ${entry.courseCode}. Importing without faculty.`
      );
    }

    result.push({
      courseId: course.id,
      facultyId,
      dayOfWeek:
        entry.dayOfWeek,
      startTime:
        entry.startTime,
      endTime:
        entry.endTime,
      room:
        entry.room ?? null,
      classType:
        entry.classType ||
        "Lecture",
      batch:
        entry.batch ?? null,
    });
  }

  return result;
}

/* ============================================================
   IMPORT
   ============================================================ */

async function main() {
  console.log(
    "================================================"
  );

  console.log(
    "CAMPUS360 SEMESTER VII TIMETABLE IMPORT"
  );

  console.log(
    "Academic Year: 2026-27"
  );

  console.log(
    "Program: B.Tech CSE"
  );

  console.log(
    "Semester: VII"
  );

  console.log(
    "Division: B"
  );

  console.log(
    "================================================"
  );

  const courseMap =
    await getCourseMap();

  console.log(
    `Semester VII course records found: ${courseMap.size}`
  );

  for (const code of Object.values(
    COURSE_CODES
  )) {
    const course =
      courseMap.get(code);

    if (!course) {
      console.warn(
        `MISSING COURSE: ${code}`
      );
    }
  }

  if (
    courseMap.size <
    Object.values(COURSE_CODES).length
  ) {
    console.warn(
      "Some Semester VII courses are missing. Missing timetable rows will be skipped."
    );
  }

  const facultyMap =
    await getFacultyMap();

  console.log(
    `Semester VII faculty records found: ${facultyMap.size}`
  );

  /* ========================================================
     PREPARE DATA
     ======================================================== */

  const commonEntries =
    await prepareEntries(
      commonSchedule,
      courseMap,
      facultyMap
    );

  const batchEntries =
    await prepareEntries(
      batchSchedule,
      courseMap,
      facultyMap
    );

  const specialEntries =
    await prepareEntries(
      specialSchedule,
      courseMap,
      facultyMap
    );

  const allEntries = [
    ...commonEntries,
    ...batchEntries,
    ...specialEntries,
  ];

  /* ========================================================
     REMOVE PREVIOUS SEMESTER VII TIMETABLE
     ======================================================== */

  const deletedCount =
    await deleteExistingSemester7Entries(
      courseMap
    );

  console.log(
    `Removed existing Semester VII timetable entries: ${deletedCount}`
  );

  /* ========================================================
     REMOVE DUPLICATE ROWS FROM IMPORT LIST
     ======================================================== */

  const uniqueEntries =
    new Map();

  for (const entry of allEntries) {
    const signature =
      timetableSignature(
        entry
      );

    if (
      !uniqueEntries.has(
        signature
      )
    ) {
      uniqueEntries.set(
        signature,
        entry
      );
    }
  }

  const entriesToCreate =
    Array.from(
      uniqueEntries.values()
    );

  /* ========================================================
     CREATE NEW ENTRIES
     ======================================================== */

  let createdCount = 0;

  for (const entry of entriesToCreate) {
    await prisma.timetableEntry.create(
      {
        data: entry,
      }
    );

    createdCount++;
  }

  /* ========================================================
     SUMMARY
     ======================================================== */

  const commonCount =
    entriesToCreate.filter(
      (entry) =>
        entry.batch === null
    ).length;

  const batch1Count =
    entriesToCreate.filter(
      (entry) =>
        entry.batch === "1"
    ).length;

  const batch2Count =
    entriesToCreate.filter(
      (entry) =>
        entry.batch === "2"
    ).length;

  const batch3Count =
    entriesToCreate.filter(
      (entry) =>
        entry.batch === "3"
    ).length;

  console.log(
    "================================================"
  );

  console.log(
    "SEMESTER VII TIMETABLE IMPORT COMPLETED"
  );

  console.log(
    `Total entries created : ${createdCount}`
  );

  console.log(
    `Common entries        : ${commonCount}`
  );

  console.log(
    `Batch 1 entries       : ${batch1Count}`
  );

  console.log(
    `Batch 2 entries       : ${batch2Count}`
  );

  console.log(
    `Batch 3 entries       : ${batch3Count}`
  );

  console.log(
    "================================================"
  );

  console.log(
    "NOTE:"
  );

  console.log(
    "The PDF contains B2-MMC2 and B3-MMC2 in the batch-conduction section, but does not uniquely provide course mappings for those rows."
  );

  console.log(
    "Those ambiguous MMC2 rows were intentionally not invented/imported."
  );

  console.log(
    "T&P sessions were also not imported because the PDF does not provide a course code for T&P."
  );

  console.log(
    "================================================"
  );
}

try {
  await main();
} catch (error) {
  console.error(
    "Semester VII timetable import failed:"
  );

  console.error(error);
} finally {
  await prisma.$disconnect();
}