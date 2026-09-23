import bcrypt from "bcrypt";
import prisma from "./src/lib/prisma.js";

const TEST_EMAIL = "sem7.student@campus360.com";
const TEST_PASSWORD = "Campus360@2026";

try {
  // ----------------------------------------------------------
  // Check department
  // ----------------------------------------------------------
  const department = await prisma.department.findUnique({
    where: {
      id: 1,
    },
  });

  if (!department) {
    throw new Error(
      "Department ID 1 was not found."
    );
  }

  // ----------------------------------------------------------
  // Check program
  // ----------------------------------------------------------
  const program = await prisma.program.findUnique({
    where: {
      id: 1,
    },
  });

  if (!program) {
    throw new Error(
      "Program ID 1 was not found."
    );
  }

  // ----------------------------------------------------------
  // Check if test user already exists
  // ----------------------------------------------------------
  let user = await prisma.user.findUnique({
    where: {
      email: TEST_EMAIL,
    },
  });

  // ----------------------------------------------------------
  // Create user when needed
  // ----------------------------------------------------------
  if (!user) {
    const passwordHash = await bcrypt.hash(
      TEST_PASSWORD,
      10
    );

    user = await prisma.user.create({
      data: {
        firstName: "Semester",
        lastName: "Seven Student",
        email: TEST_EMAIL,
        passwordHash,
        role: "STUDENT",
        isActive: true,
      },
    });

    console.log(
      "Test user created:",
      user.id
    );
  } else {
    console.log(
      "Test user already exists:",
      user.id
    );
  }

  // ----------------------------------------------------------
  // Check if student profile already exists
  // ----------------------------------------------------------
  let student = await prisma.student.findUnique({
    where: {
      userId: user.id,
    },
  });

  // ----------------------------------------------------------
  // Create Semester VII student profile
  // ----------------------------------------------------------
  if (!student) {
    student = await prisma.student.create({
      data: {
        userId: user.id,
        enrollmentNumber:
          "CAMPUS2026007",
        semester: 7,
        admissionYear: 2023,
        phone: null,
        dateOfBirth: null,
        batch: "1",
        division: "B",
        departmentId: department.id,
        programId: program.id,
      },
    });

    console.log(
      "Semester VII student profile created:",
      student.id
    );
  } else {
    // Make sure the existing test student has
    // the required Semester VII grouping.
    student = await prisma.student.update({
      where: {
        id: student.id,
      },
      data: {
        semester: 7,
        batch: "1",
        division: "B",
        departmentId: department.id,
        programId: program.id,
      },
    });

    console.log(
      "Existing test student updated:",
      student.id
    );
  }

  // ----------------------------------------------------------
  // Enroll student in Semester VII courses
  // ----------------------------------------------------------
  const semester7Courses =
    await prisma.course.findMany({
      where: {
        semester: 7,
        programId: program.id,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: {
        id: "asc",
      },
    });

  if (
    semester7Courses.length === 0
  ) {
    throw new Error(
      "No Semester VII courses were found."
    );
  }

  for (const course of semester7Courses) {
    await prisma.courseEnrollment.upsert({
      where: {
        studentId_courseId: {
          studentId: student.id,
          courseId: course.id,
        },
      },

      update: {},

      create: {
        studentId: student.id,
        courseId: course.id,
        progressPercent: 0,
      },
    });
  }

  console.log(
    `Enrolled student in ${semester7Courses.length} Semester VII courses.`
  );

  console.log("");
  console.log(
    "=============================================="
  );
  console.log(
    "SEMESTER VII TEST STUDENT READY"
  );
  console.log(
    "=============================================="
  );
  console.log(
    "Email:",
    TEST_EMAIL
  );
  console.log(
    "Password:",
    TEST_PASSWORD
  );
  console.log(
    "Enrollment:",
    student.enrollmentNumber
  );
  console.log(
    "Semester:",
    student.semester
  );
  console.log(
    "Batch:",
    student.batch
  );
  console.log(
    "Division:",
    student.division
  );
  console.log(
    "Courses:",
    semester7Courses.length
  );
  console.log(
    "=============================================="
  );
} catch (error) {
  console.error(
    "Semester VII student creation failed:"
  );
  console.error(error);
} finally {
  await prisma.$disconnect();
}