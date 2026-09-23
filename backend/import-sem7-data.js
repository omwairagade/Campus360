import "dotenv/config";
import bcrypt from "bcrypt";
import crypto from "crypto";

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
  CAMPUS360 - SEMESTER VII DATA IMPORTER
  Based on:
  FY_(R)_Div-B_TT.pdf
  Academic Year: 2026-27
  Program: B.Tech CSE
  Semester: VII
  Division: B
  ============================================================
*/

const SEMESTER = 7;
const PROGRAM_CODE = "BTECH-CSE";
const DEPARTMENT_CODE = "CSE";

/*
  Faculty employee IDs below are INTERNAL Campus360 IDs.
  The supplied PDF does not provide official employee IDs
  for these faculty members.
*/
const facultyData = [
  {
    abbreviation: "KP",
    firstName: "Kshitija",
    lastName: "Potdar",
    employeeId: "SEM7-KP-001",
    designation: "Faculty",
    email: "kshitija.potdar.sem7@campus360.local",
  },
  {
    abbreviation: "SH",
    firstName: "Shailesh",
    lastName: "Hulke",
    employeeId: "SEM7-SH-001",
    designation: "Faculty",
    email: "shailesh.hulke.sem7@campus360.local",
  },
  {
    abbreviation: "NL",
    firstName: "Nehal",
    lastName: "Lamture",
    employeeId: "SEM7-NL-001",
    designation: "Faculty",
    email: "nehal.lamture.sem7@campus360.local",
  },
  {
    abbreviation: "OP",
    firstName: "Omprakash",
    lastName: "Patil",
    employeeId: "SEM7-OP-001",
    designation: "Faculty",
    email: "omprakash.patil.sem7@campus360.local",
  },
  {
    abbreviation: "PB",
    firstName: "Prachi",
    lastName: "Brahmankar",
    employeeId: "SEM7-PB-001",
    designation: "Faculty",
    email: "prachi.brahmankar.sem7@campus360.local",
  },
  {
    abbreviation: "AP",
    firstName: "Akshada",
    lastName: "Pande",
    employeeId: "SEM7-AP-001",
    designation: "Faculty",
    email: "akshada.pande.sem7@campus360.local",
  },
  {
    abbreviation: "PC",
    firstName: "Pinky",
    lastName: "Choudhary",
    employeeId: "SEM7-PC-001",
    designation: "Faculty",
    email: "pinky.choudhary.sem7@campus360.local",
  },
  {
    abbreviation: "AW",
    firstName: "Arif",
    lastName: "Waza",
    employeeId: "SEM7-AW-001",
    designation: "Faculty",
    email: "arif.waza.sem7@campus360.local",
  },
];

/*
  Exact course names and course codes from the PDF.
  Type is marked as SEM7-IMPORT because the PDF does not
  explicitly classify every course as theory/lab/etc.
*/
const courseData = [
  {
    code: "230GCSB102_07",
    name: "Theory of Computation",
    abbreviation: "TOC",
    faculty: "KP",
  },
  {
    code: "231GCSB42_07",
    name: "Cloud Technology",
    abbreviation: "CT",
    faculty: "SH",
  },
  {
    code: "230IRMB02_07",
    name: "Research Methodology",
    abbreviation: "RMMT",
    faculty: "NL",
  },
  {
    code: "230GMEB61_07",
    name: "Industry 4.0 and IIOT",
    abbreviation: "IOC",
    faculty: "OP",
  },
  {
    code: "230GETB09_07",
    name: "Wireless Sensor Network",
    abbreviation: "MMC1",
    faculty: "PB",
  },
  {
    code: "230GRAB55_07",
    name: "Industrial Robot (Batch-1)",
    abbreviation: "MMC2",
    faculty: null,
  },
  {
    code: "230GMTB01_07",
    name: "Sensors and Actuators (Batch-2)",
    abbreviation: "MMC2",
    faculty: null,
  },
  {
    code: "230GCSB67_07",
    name: "Information Security Audit Monitoring and Governance",
    abbreviation: "DSH",
    faculty: "AP",
  },
  {
    code: "230GAIB88_07",
    name: "Python Programming Lab",
    abbreviation: "PPL",
    faculty: "PC",
  },
  {
    code: "230GCSB90_07",
    name: "Project Phase I",
    abbreviation: "PROJ",
    faculty: null,
  },
  {
    code: "230UPOB02_07",
    name: "Introduction to Indian Constitution",
    abbreviation: "IIC",
    faculty: "AW",
  },
];

async function getOrCreateDepartment() {
  let department =
    await prisma.department.findUnique({
      where: {
        code: DEPARTMENT_CODE,
      },
    });

  if (!department) {
    department =
      await prisma.department.create({
        data: {
          name: "Computer Science and Engineering",
          code: DEPARTMENT_CODE,
          description:
            "School of Computational Sciences",
        },
      });

    console.log(
      "Created CSE department."
    );
  } else {
    console.log(
      `Using existing department: ${department.name}`
    );
  }

  return department;
}

async function getOrCreateProgram(
  departmentId
) {
  let program =
    await prisma.program.findUnique({
      where: {
        code: PROGRAM_CODE,
      },
    });

  if (!program) {
    program =
      await prisma.program.create({
        data: {
          name: "B.Tech Computer Science and Engineering",
          code: PROGRAM_CODE,
          durationYears: 4,
          departmentId,
        },
      });

    console.log(
      "Created B.Tech CSE program."
    );
  } else {
    console.log(
      `Using existing program: ${program.name}`
    );
  }

  return program;
}

async function createInternalFaculty(
  faculty,
  departmentId
) {
  let user =
    await prisma.user.findUnique({
      where: {
        email: faculty.email,
      },
    });

  if (!user) {
    const internalPassword =
      crypto
        .randomBytes(32)
        .toString("hex");

    const passwordHash =
      await bcrypt.hash(
        internalPassword,
        10
      );

    user =
      await prisma.user.create({
        data: {
          firstName: faculty.firstName,
          lastName: faculty.lastName,
          email: faculty.email,
          passwordHash,
          role: "FACULTY",
          isActive: true,
        },
      });

    console.log(
      `Created faculty user: ${faculty.firstName} ${faculty.lastName}`
    );
  }

  let facultyRecord =
    await prisma.faculty.findUnique({
      where: {
        userId: user.id,
      },
    });

  if (!facultyRecord) {
    facultyRecord =
      await prisma.faculty.create({
        data: {
          userId: user.id,
          employeeId: faculty.employeeId,
          designation:
            faculty.designation,
          departmentId,
        },
      });

    console.log(
      `Created faculty profile: ${faculty.employeeId}`
    );
  }

  return facultyRecord;
}

async function importCourses(
  program,
  department,
  facultyMap
) {
  const importedCourses = [];

  for (const course of courseData) {
    const facultyId =
      course.faculty &&
      facultyMap.has(course.faculty)
        ? facultyMap.get(
            course.faculty
          ).id
        : null;

    const existingCourse =
      await prisma.course.findUnique({
        where: {
          code: course.code,
        },
      });

    const courseValues = {
      name: course.name,
      description: `Semester VII Division B course imported from the official 2026-27 timetable.`,
      credits: 0,
      semester: SEMESTER,
      type: "SEM7-IMPORT",
      departmentId:
        department.id,
      programId:
        program.id,
      facultyId,
    };

    let record;

    if (existingCourse) {
      record =
        await prisma.course.update({
          where: {
            id: existingCourse.id,
          },
          data: courseValues,
        });

      console.log(
        `Updated course: ${course.code} - ${course.name}`
      );
    } else {
      record =
        await prisma.course.create({
          data: {
            code: course.code,
            ...courseValues,
          },
        });

      console.log(
        `Created course: ${course.code} - ${course.name}`
      );
    }

    importedCourses.push({
      ...course,
      id: record.id,
      facultyId:
        record.facultyId,
    });
  }

  return importedCourses;
}

async function main() {
  console.log(
    "================================================"
  );

  console.log(
    "CAMPUS360 SEMESTER VII IMPORT"
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

  const department =
    await getOrCreateDepartment();

  const program =
    await getOrCreateProgram(
      department.id
    );

  const facultyMap = new Map();

  for (const faculty of facultyData) {
    const facultyRecord =
      await createInternalFaculty(
        faculty,
        department.id
      );

    facultyMap.set(
      faculty.abbreviation,
      facultyRecord
    );
  }

  const importedCourses =
    await importCourses(
      program,
      department,
      facultyMap
    );

  console.log(
    "================================================"
  );

  console.log(
    "SEMESTER VII IMPORT COMPLETED"
  );

  console.log(
    `Courses processed: ${importedCourses.length}`
  );

  console.log(
    `Faculty processed: ${facultyMap.size}`
  );

  console.log(
    "================================================"
  );

  console.log(
    "Course summary:"
  );

  for (const course of importedCourses) {
    const facultyName =
      course.faculty &&
      facultyMap.has(
        course.faculty
      )
        ? `${facultyMap.get(course.faculty).id}`
        : "Not assigned";

    console.log(
      `${course.abbreviation} | ${course.code} | ${course.name} | Faculty: ${facultyName}`
    );
  }
}

try {
  await main();
} catch (error) {
  console.error(
    "Semester VII import failed:"
  );

  console.error(error);
} finally {
  await prisma.$disconnect();
}