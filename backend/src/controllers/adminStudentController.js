import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import prisma from "../lib/prisma.js";

// ============================================================
// LOAD ENVIRONMENT VARIABLES
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

// ============================================================
// CONFIGURATION
// ============================================================

const COLLEGE_EMAIL_DOMAIN = (
  process.env.COLLEGE_EMAIL_DOMAIN || "campus360.in"
)
  .trim()
  .toLowerCase()
  .replace(/^@/, "");

// ============================================================
// STUDENT ENROLLMENT CONFIGURATION
// ============================================================

const STUDENT_ENROLLMENT_PREFIX =
  process.env.STUDENT_ENROLLMENT_PREFIX ||
  "2235801";

const STUDENT_ENROLLMENT_SEQUENCE_LENGTH = 4;

// ============================================================
// HELPER — GENERATE TEMPORARY PASSWORD
// ============================================================

const generateTemporaryPassword = () => {
  return "Campus@123";
};

// ============================================================
// HELPER — GENERATE NEXT ENROLLMENT NUMBER
// ============================================================

const generateNextEnrollmentNumber = async (
  transaction = prisma
) => {
  const students =
    await transaction.student.findMany({
      where: {
        enrollmentNumber: {
          startsWith:
            STUDENT_ENROLLMENT_PREFIX,
        },
      },

      select: {
        enrollmentNumber: true,
      },
    });

  let highestSequence = 0;

  for (const student of students) {
    const enrollmentNumber =
      String(
        student.enrollmentNumber || ""
      ).trim();

    if (
      !enrollmentNumber.startsWith(
        STUDENT_ENROLLMENT_PREFIX
      )
    ) {
      continue;
    }

    const sequencePart =
      enrollmentNumber.slice(
        STUDENT_ENROLLMENT_PREFIX.length
      );

    if (
      !/^\d+$/.test(sequencePart)
    ) {
      continue;
    }

    const sequence =
      Number(sequencePart);

    if (
      Number.isInteger(sequence) &&
      sequence > highestSequence
    ) {
      highestSequence = sequence;
    }
  }

  const nextSequence =
    highestSequence + 1;

  const maximumSequence =
    10 **
      STUDENT_ENROLLMENT_SEQUENCE_LENGTH -
    1;

  if (
    nextSequence >
    maximumSequence
  ) {
    throw new Error(
      "Student enrollment number limit has been reached."
    );
  }

  const sequenceString =
    String(nextSequence).padStart(
      STUDENT_ENROLLMENT_SEQUENCE_LENGTH,
      "0"
    );

  return `${STUDENT_ENROLLMENT_PREFIX}${sequenceString}`;
};

// ============================================================
// HELPER — GENERATE UNIQUE CAMPUS EMAIL
// ============================================================

const generateUniqueCollegeEmail = async (
  enrollmentNumber,
  transaction = prisma
) => {
  const cleanEnrollmentNumber =
    String(enrollmentNumber)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  let email =
    `${cleanEnrollmentNumber}@${COLLEGE_EMAIL_DOMAIN}`;

  const existingUser =
    await transaction.user.findUnique({
      where: {
        email,
      },

      select: {
        id: true,
      },
    });

  if (!existingUser) {
    return email;
  }

  let counter = 2;

  while (true) {
    email =
      `${cleanEnrollmentNumber}${counter}@${COLLEGE_EMAIL_DOMAIN}`;

    const existing =
      await transaction.user.findUnique({
        where: {
          email,
        },

        select: {
          id: true,
        },
      });

    if (!existing) {
      return email;
    }

    counter += 1;
  }
};

/* =========================================================
   CREATE STUDENT
   POST /api/admin/students
   ========================================================= */

export const createAdminStudent =
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        semester,
        admissionYear,
        phone,
        dateOfBirth,
        batch,
        division,
        departmentId,
        programId,
      } = req.body;

      // ------------------------------------------------------
      // REQUIRED FIELDS
      // ------------------------------------------------------

      if (
        !firstName ||
        !lastName ||
        semester === undefined ||
        semester === null ||
        admissionYear === undefined ||
        admissionYear === null ||
        !departmentId ||
        !programId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "First name, last name, semester, admission year, department and program are required.",
        });
      }

      // ------------------------------------------------------
      // NORMALIZE BASIC DATA
      // ------------------------------------------------------

      const normalizedFirstName =
        String(firstName).trim();

      const normalizedLastName =
        String(lastName).trim();

      const normalizedBatch =
        batch !== undefined &&
        batch !== null &&
        String(batch).trim() !== ""
          ? String(batch).trim()
          : null;

      const normalizedDivision =
        division !== undefined &&
        division !== null &&
        String(division).trim() !== ""
          ? String(division)
              .trim()
              .toUpperCase()
          : null;

      const normalizedPhone =
        phone !== undefined &&
        phone !== null &&
        String(phone).trim() !== ""
          ? String(phone).trim()
          : null;

      // ------------------------------------------------------
      // VALIDATE NAMES
      // ------------------------------------------------------

      if (
        normalizedFirstName.length < 2 ||
        normalizedLastName.length < 2
      ) {
        return res.status(400).json({
          success: false,
          message:
            "First name and last name must contain at least 2 characters.",
        });
      }

      // ------------------------------------------------------
      // VALIDATE SEMESTER
      // ------------------------------------------------------

      const normalizedSemester =
        Number(semester);

      if (
        !Number.isInteger(
          normalizedSemester
        ) ||
        normalizedSemester < 1 ||
        normalizedSemester > 12
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Semester must be a valid number between 1 and 12.",
        });
      }

      // ------------------------------------------------------
      // VALIDATE ADMISSION YEAR
      // ------------------------------------------------------

      const normalizedAdmissionYear =
        Number(admissionYear);

      if (
        !Number.isInteger(
          normalizedAdmissionYear
        ) ||
        normalizedAdmissionYear < 2000 ||
        normalizedAdmissionYear > 2100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Admission year is invalid.",
        });
      }

      // ------------------------------------------------------
      // VALIDATE DEPARTMENT ID
      // ------------------------------------------------------

      const normalizedDepartmentId =
        Number(departmentId);

      if (
        !Number.isInteger(
          normalizedDepartmentId
        ) ||
        normalizedDepartmentId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid department ID.",
        });
      }

      // ------------------------------------------------------
      // VALIDATE PROGRAM ID
      // ------------------------------------------------------

      const normalizedProgramId =
        Number(programId);

      if (
        !Number.isInteger(
          normalizedProgramId
        ) ||
        normalizedProgramId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid program ID.",
        });
      }

      // ------------------------------------------------------
      // VALIDATE BATCH
      // ------------------------------------------------------

      if (
        normalizedBatch &&
        !/^[A-Za-z0-9]+$/.test(
          normalizedBatch
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Batch can contain only letters and numbers.",
        });
      }

      // ------------------------------------------------------
      // VALIDATE DIVISION
      // ------------------------------------------------------

      if (
        normalizedDivision &&
        !/^[A-Za-z0-9]+$/.test(
          normalizedDivision
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Division can contain only letters and numbers.",
        });
      }

      // ------------------------------------------------------
      // VALIDATE PHONE
      // ------------------------------------------------------

      if (
        normalizedPhone &&
        !/^[0-9+\-\s()]{7,20}$/.test(
          normalizedPhone
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid phone number.",
        });
      }

      // ------------------------------------------------------
      // VALIDATE DATE OF BIRTH
      // ------------------------------------------------------

      let normalizedDateOfBirth = null;

      if (
        dateOfBirth !== undefined &&
        dateOfBirth !== null &&
        String(dateOfBirth).trim() !== ""
      ) {
        const parsedDate =
          new Date(dateOfBirth);

        if (
          Number.isNaN(
            parsedDate.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid date of birth.",
          });
        }

        normalizedDateOfBirth =
          parsedDate;
      }

      // ------------------------------------------------------
      // CHECK DEPARTMENT
      // ------------------------------------------------------

      const department =
        await prisma.department.findUnique({
          where: {
            id: normalizedDepartmentId,
          },

          select: {
            id: true,
            name: true,
            code: true,
          },
        });

      if (!department) {
        return res.status(404).json({
          success: false,
          message:
            "Department not found.",
        });
      }

      // ------------------------------------------------------
      // CHECK PROGRAM
      // ------------------------------------------------------

      const program =
        await prisma.program.findUnique({
          where: {
            id: normalizedProgramId,
          },

          select: {
            id: true,
            name: true,
            code: true,
            departmentId: true,
          },
        });

      if (!program) {
        return res.status(404).json({
          success: false,
          message:
            "Program not found.",
        });
      }

      // ------------------------------------------------------
      // ENSURE PROGRAM BELONGS TO DEPARTMENT
      // ------------------------------------------------------

      if (
        program.departmentId !==
        normalizedDepartmentId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selected program does not belong to the selected department.",
        });
      }

      // ------------------------------------------------------
      // CREATE USER + STUDENT
      // ------------------------------------------------------

      const result =
        await prisma.$transaction(
          async (transaction) => {
            // ----------------------------------------------
            // GENERATE ENROLLMENT NUMBER
            // ----------------------------------------------

            const enrollmentNumber =
              await generateNextEnrollmentNumber(
                transaction
              );

            // ----------------------------------------------
            // GENERATE COLLEGE EMAIL
            // ----------------------------------------------

            const collegeEmail =
              await generateUniqueCollegeEmail(
                enrollmentNumber,
                transaction
              );

            // ----------------------------------------------
            // GENERATE TEMPORARY PASSWORD
            // ----------------------------------------------

            const temporaryPassword =
              generateTemporaryPassword();

            const passwordHash =
              await bcrypt.hash(
                temporaryPassword,
                10
              );

            // ----------------------------------------------
            // CREATE USER
            // ----------------------------------------------

            const user =
              await transaction.user.create({
                data: {
                  firstName:
                    normalizedFirstName,

                  lastName:
                    normalizedLastName,

                  email:
                    collegeEmail,

                  passwordHash,

                  role: "STUDENT",

                  isActive: true,
                },

                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                  isActive: true,
                  createdAt: true,
                },
              });

            // ----------------------------------------------
            // CREATE STUDENT
            // ----------------------------------------------

            const student =
              await transaction.student.create({
                data: {
                  userId: user.id,

                  enrollmentNumber,

                  semester:
                    normalizedSemester,

                  admissionYear:
                    normalizedAdmissionYear,

                  phone:
                    normalizedPhone,

                  dateOfBirth:
                    normalizedDateOfBirth,

                  batch:
                    normalizedBatch,

                  division:
                    normalizedDivision,

                  departmentId:
                    normalizedDepartmentId,

                  programId:
                    normalizedProgramId,
                },

                select: {
                  id: true,
                  enrollmentNumber: true,
                  semester: true,
                  admissionYear: true,
                  phone: true,
                  dateOfBirth: true,
                  batch: true,
                  division: true,
                  departmentId: true,
                  programId: true,
                },
              });

            return {
              user,
              student,
              temporaryPassword,
            };
          }
        );

      // ------------------------------------------------------
      // RESPONSE
      // ------------------------------------------------------

      return res.status(201).json({
        success: true,

        message:
          "Student account created successfully.",

        data: {
          student:
            result.student,

          user:
            result.user,

          credentials: {
            enrollmentNumber:
              result.student
                .enrollmentNumber,

            email:
              result.user.email,

            temporaryPassword:
              result.temporaryPassword,
          },

          department: {
            id:
              department.id,

            name:
              department.name,

            code:
              department.code,
          },

          program: {
            id:
              program.id,

            name:
              program.name,

            code:
              program.code,
          },
        },
      });
    } catch (error) {
      console.error(
        "Create admin student error:",
        error
      );

      // ------------------------------------------------------
      // PRISMA UNIQUE CONSTRAINT ERROR
      // ------------------------------------------------------

      if (
        error?.code === "P2002"
      ) {
        return res.status(409).json({
          success: false,

          message:
            "A student or account with the generated information already exists. Please try again.",

          error:
            error?.meta?.target ||
            undefined,
        });
      }

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to create student account.",
      });
    }
  };

/* =========================================================
   GET ALL STUDENTS
   GET /api/admin/students
   ========================================================= */

export const getAdminStudents = async (
  req,
  res
) => {
  try {
    const {
      search = "",
      departmentId,
      programId,
      semester,
      batch,
      division,
      isActive,
    } = req.query;

    const where = {};

    if (departmentId) {
      const value =
        Number(departmentId);

      if (
        !Number.isInteger(value) ||
        value <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid department ID.",
        });
      }

      where.departmentId = value;
    }

    if (programId) {
      const value =
        Number(programId);

      if (
        !Number.isInteger(value) ||
        value <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid program ID.",
        });
      }

      where.programId = value;
    }

    if (semester) {
      const value =
        Number(semester);

      if (
        !Number.isInteger(value)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid semester.",
        });
      }

      where.semester = value;
    }

    if (batch) {
      where.batch =
        String(batch).trim();
    }

    if (division) {
      where.division =
        String(division)
          .trim()
          .toUpperCase();
    }

    if (
      isActive !== undefined
    ) {
      if (
        isActive !== "true" &&
        isActive !== "false"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "isActive must be true or false.",
        });
      }

      where.user = {
        isActive:
          isActive === "true",
      };
    }

    if (
      String(search).trim()
    ) {
      const searchText =
        String(search).trim();

      where.OR = [
        {
          enrollmentNumber: {
            contains:
              searchText,
            mode:
              "insensitive",
          },
        },

        {
          user: {
            firstName: {
              contains:
                searchText,
              mode:
                "insensitive",
            },
          },
        },

        {
          user: {
            lastName: {
              contains:
                searchText,
              mode:
                "insensitive",
            },
          },
        },

        {
          user: {
            email: {
              contains:
                searchText,
              mode:
                "insensitive",
            },
          },
        },
      ];
    }

    const students =
      await prisma.student.findMany({
        where,

        orderBy: {
          id: "asc",
        },

        select: {
          id: true,
          enrollmentNumber: true,
          semester: true,
          admissionYear: true,
          batch: true,
          division: true,
          phone: true,
          dateOfBirth: true,

          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          },

          departmentRel: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },

          programRel: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

    return res.status(200).json({
      success: true,

      message:
        "Students fetched successfully.",

      count:
        students.length,

      data:
        students,
    });
  } catch (error) {
    console.error(
      "Get admin students error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch students.",

      error:
        error?.message,
    });
  }
};

/* =========================================================
   GET STUDENT DETAILS
   GET /api/admin/students/:id
   ========================================================= */

export const getAdminStudentById =
  async (req, res) => {
    try {
      const studentId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          studentId
        ) ||
        studentId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student ID.",
        });
      }

      const student =
        await prisma.student.findUnique({
          where: {
            id: studentId,
          },

          select: {
            id: true,
            enrollmentNumber: true,
            semester: true,
            admissionYear: true,
            batch: true,
            division: true,
            phone: true,
            dateOfBirth: true,

            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
              },
            },

            departmentRel: {
              select: {
                id: true,
                name: true,
                code: true,
                description: true,
              },
            },

            programRel: {
              select: {
                id: true,
                name: true,
                code: true,
                durationYears: true,
              },
            },
          },
        });

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      let enrollments = [];

      try {
        enrollments =
          await prisma.courseEnrollment.findMany(
            {
              where: {
                studentId:
                  studentId,
              },

              orderBy: {
                id: "asc",
              },

              select: {
                id: true,
                progressPercent: true,

                course: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    type: true,
                    credits: true,
                    semester: true,
                  },
                },
              },
            }
          );
      } catch (enrollmentError) {
        console.error(
          "Student enrollment query error:",
          enrollmentError
        );

        enrollments = [];
      }

      return res.status(200).json({
        success: true,

        message:
          "Student details fetched successfully.",

        data: {
          ...student,
          enrollments,
        },
      });
    } catch (error) {
      console.error(
        "Get admin student by ID error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to fetch student details.",

        error:
          error?.message ||
          "Unknown server error.",
      });
    }
  };

/* =========================================================
   UPDATE STUDENT
   PATCH /api/admin/students/:id
   ========================================================= */

export const updateAdminStudent =
  async (req, res) => {
    try {
      const studentId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          studentId
        ) ||
        studentId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student ID.",
        });
      }

      const {
        batch,
        division,
      } = req.body;

      let normalizedBatch =
        null;

      if (
        batch !== undefined &&
        batch !== null &&
        String(batch).trim() !== ""
      ) {
        normalizedBatch =
          String(batch).trim();

        if (
          !/^[A-Za-z0-9]+$/.test(
            normalizedBatch
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Batch can contain only letters and numbers.",
          });
        }
      }

      let normalizedDivision =
        null;

      if (
        division !== undefined &&
        division !== null &&
        String(division).trim() !== ""
      ) {
        normalizedDivision =
          String(division)
            .trim()
            .toUpperCase();

        if (
          !/^[A-Za-z0-9]+$/.test(
            normalizedDivision
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Division can contain only letters and numbers.",
          });
        }
      }

      const existingStudent =
        await prisma.student.findUnique({
          where: {
            id: studentId,
          },

          select: {
            id: true,
            enrollmentNumber: true,
            batch: true,
            division: true,
          },
        });

      if (!existingStudent) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      const updatedStudent =
        await prisma.student.update({
          where: {
            id: studentId,
          },

          data: {
            batch:
              normalizedBatch,

            division:
              normalizedDivision,
          },

          select: {
            id: true,
            enrollmentNumber: true,
            semester: true,
            admissionYear: true,
            batch: true,
            division: true,
            phone: true,
            dateOfBirth: true,

            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                isActive: true,
              },
            },

            departmentRel: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },

            programRel: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        });

      return res.status(200).json({
        success: true,

        message:
          "Student information updated successfully.",

        data:
          updatedStudent,
      });
    } catch (error) {
      console.error(
        "Update admin student error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to update student information.",
      });
    }
  };

/* =========================================================
   UPDATE STUDENT ACCOUNT STATUS
   PATCH /api/admin/students/:id/status
   ========================================================= */

export const updateAdminStudentStatus =
  async (req, res) => {
    try {
      const studentId =
        Number(req.params.id);

      const {
        isActive,
      } = req.body;

      if (
        !Number.isInteger(
          studentId
        ) ||
        studentId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student ID.",
        });
      }

      if (
        typeof isActive !==
        "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "isActive must be true or false.",
        });
      }

      const student =
        await prisma.student.findUnique({
          where: {
            id: studentId,
          },

          select: {
            id: true,
            userId: true,

            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                isActive: true,
              },
            },
          },
        });

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      if (
        student.userId ===
          req.user?.userId &&
        !isActive
      ) {
        return res.status(400).json({
          success: false,
          message:
            "You cannot deactivate your own account.",
        });
      }

      const updatedUser =
        await prisma.user.update({
          where: {
            id:
              student.userId,
          },

          data: {
            isActive,
          },

          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true,
            updatedAt: true,
          },
        });

      return res.status(200).json({
        success: true,

        message:
          isActive
            ? "Student account activated successfully."
            : "Student account deactivated successfully.",

        data: {
          studentId:
            student.id,

          user:
            updatedUser,
        },
      });
    } catch (error) {
      console.error(
        "Update admin student status error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to update student account status.",
      });
    }
  };