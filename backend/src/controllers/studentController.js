import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";

// ============================================================
// CREATE STUDENT PROFILE
// ============================================================

export const createStudentProfile = async (req, res) => {
  try {
    const {
      userId,
      enrollmentNumber,
      departmentId,
      programId,
      semester,
      admissionYear,
      batch,
      division,
      phone,
      dateOfBirth,
    } = req.body;

    if (
      !userId ||
      !enrollmentNumber ||
      !departmentId ||
      !programId ||
      !semester ||
      !admissionYear
    ) {
      return res.status(400).json({
        success: false,
        message: "Required student fields are missing",
      });
    }

    const existingStudent = await prisma.student.findFirst({
      where: {
        OR: [
          { userId: Number(userId) },
          { enrollmentNumber },
        ],
      },
    });

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "Student profile already exists",
      });
    }

    const student = await prisma.student.create({
      data: {
        userId: Number(userId),
        enrollmentNumber,
        departmentId: Number(departmentId),
        programId: Number(programId),
        semester: Number(semester),
        admissionYear: Number(admissionYear),
        batch: batch ? String(batch) : null,
        division: division ? String(division) : null,
        phone: phone || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
      include: {
        user: true,
        departmentRel: true,
        programRel: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Student profile created successfully",
      student,
    });
  } catch (error) {
    console.error("Create student profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create student profile",
    });
  }
};

// ============================================================
// GET MY STUDENT PROFILE
// ============================================================

export const getStudentProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const student = await prisma.student.findUnique({
      where: {
        userId,
      },
      include: {
        user: true,
        departmentRel: true,
        programRel: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    return res.json({
      success: true,
      student,
    });
  } catch (error) {
    console.error("Get student profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student profile",
    });
  }
};

// ============================================================
// UPDATE MY STUDENT PROFILE
// PATCH /api/student/profile
// ============================================================

export const updateStudentProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      batch,
      division,
    } = req.body;

    // --------------------------------------------------------
    // Find student
    // --------------------------------------------------------

    const student = await prisma.student.findUnique({
      where: {
        userId,
      },
      include: {
        user: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // --------------------------------------------------------
    // Validate names
    // --------------------------------------------------------

    if (firstName !== undefined) {
      if (!String(firstName).trim() || String(firstName).trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "First name must contain at least 2 characters",
        });
      }
    }

    if (lastName !== undefined) {
      if (!String(lastName).trim() || String(lastName).trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Last name must contain at least 2 characters",
        });
      }
    }

    // --------------------------------------------------------
    // Validate batch
    // --------------------------------------------------------

    if (
      batch !== undefined &&
      batch !== null &&
      !["1", "2", "3"].includes(String(batch))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch",
      });
    }

    // --------------------------------------------------------
    // Validate division
    // --------------------------------------------------------

    if (
      division !== undefined &&
      division !== null &&
      !/^[A-Za-z0-9]+$/.test(String(division))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid division",
      });
    }

    // --------------------------------------------------------
    // Validate date
    // --------------------------------------------------------

    let parsedDateOfBirth = undefined;

    if (dateOfBirth !== undefined) {
      if (dateOfBirth === null || dateOfBirth === "") {
        parsedDateOfBirth = null;
      } else {
        const date = new Date(dateOfBirth);

        if (Number.isNaN(date.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid date of birth",
          });
        }

        parsedDateOfBirth = date;
      }
    }

    // --------------------------------------------------------
    // Update user + student
    // --------------------------------------------------------

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          ...(firstName !== undefined && {
            firstName: String(firstName).trim(),
          }),
          ...(lastName !== undefined && {
            lastName: String(lastName).trim(),
          }),
        },
      });

      const updatedStudent = await tx.student.update({
        where: {
          userId,
        },
        data: {
          ...(phone !== undefined && {
            phone: phone ? String(phone).trim() : null,
          }),
          ...(parsedDateOfBirth !== undefined && {
            dateOfBirth: parsedDateOfBirth,
          }),
          ...(batch !== undefined && {
            batch: batch ? String(batch) : null,
          }),
          ...(division !== undefined && {
            division: division ? String(division) : null,
          }),
        },
        include: {
          departmentRel: true,
          programRel: true,
        },
      });

      return {
        updatedUser,
        updatedStudent,
      };
    });

    return res.json({
      success: true,
      message: "Student profile updated successfully",
      student: {
        ...result.updatedStudent,
        user: result.updatedUser,
      },
    });
  } catch (error) {
    console.error("Update student profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update student profile",
    });
  }
};

// ============================================================
// CHANGE STUDENT PASSWORD
// POST /api/student/change-password
// ============================================================

export const changeStudentPassword = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    // --------------------------------------------------------
    // Required fields
    // --------------------------------------------------------

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }

    // --------------------------------------------------------
    // Confirm password
    // --------------------------------------------------------

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }

    // --------------------------------------------------------
    // Password length
    // --------------------------------------------------------

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    // --------------------------------------------------------
    // Get user
    // --------------------------------------------------------

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // --------------------------------------------------------
    // Verify current password
    // --------------------------------------------------------

    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // --------------------------------------------------------
    // Prevent same password
    // --------------------------------------------------------

    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.passwordHash
    );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    // --------------------------------------------------------
    // Hash new password
    // --------------------------------------------------------

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // --------------------------------------------------------
    // Update password
    // --------------------------------------------------------

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    });

    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change student password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};

// ============================================================
// FACULTY STUDENTS
// GET /api/student/faculty/students
// ============================================================

export const getFacultyStudents = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication data",
      });
    }

    // --------------------------------------------------------
    // Find logged-in faculty
    // --------------------------------------------------------

    const faculty = await prisma.faculty.findUnique({
      where: {
        userId: Number(userId),
      },
      select: {
        id: true,
        employeeId: true,
        designation: true,

        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!faculty) {
      return res.status(403).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    // --------------------------------------------------------
    // Find courses assigned to this faculty
    // --------------------------------------------------------

    const courses = await prisma.course.findMany({
      where: {
        facultyId: faculty.id,
      },

      select: {
        id: true,
        code: true,
        name: true,
        credits: true,
        semester: true,
      },

      orderBy: {
        name: "asc",
      },
    });

    const courseIds = courses.map((course) => course.id);

    // --------------------------------------------------------
    // No assigned courses
    // --------------------------------------------------------

    if (courseIds.length === 0) {
      return res.status(200).json({
        success: true,

        faculty: {
          id: faculty.id,
          employeeId: faculty.employeeId,
          designation: faculty.designation,
          user: faculty.user,
        },

        courses: [],
        students: [],
      });
    }

    // --------------------------------------------------------
    // Get students enrolled in faculty courses
    // --------------------------------------------------------

    const enrollments = await prisma.courseEnrollment.findMany({
      where: {
        courseId: {
          in: courseIds,
        },
      },

      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                isActive: true,
              },
            },

            departmentRel: true,
            programRel: true,
          },
        },

        course: {
          select: {
            id: true,
            code: true,
            name: true,
            credits: true,
            semester: true,
          },
        },
      },

      orderBy: {
        studentId: "asc",
      },
    });

    // --------------------------------------------------------
    // Group courses for each student
    // --------------------------------------------------------

    const studentMap = new Map();

    for (const enrollment of enrollments) {
      const student = enrollment.student;

      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          id: student.id,

          enrollmentNumber: student.enrollmentNumber,

          semester: student.semester,

          admissionYear: student.admissionYear,

          phone: student.phone,

          dateOfBirth: student.dateOfBirth,

          batch: student.batch,

          division: student.division,

          user: student.user,

          department: student.departmentRel,

          departmentRel: student.departmentRel,

          program: student.programRel,

          programRel: student.programRel,

          courses: [],
        });
      }

      const studentData = studentMap.get(student.id);

      studentData.courses.push(enrollment.course);
    }

    const students = Array.from(studentMap.values());

    // --------------------------------------------------------
    // Return response
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,

      faculty: {
        id: faculty.id,
        employeeId: faculty.employeeId,
        designation: faculty.designation,
        user: faculty.user,
      },

      courses,

      students,
    });
  } catch (error) {
    console.error("Get faculty students error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch faculty students",
      error: error.message,
      code: error.code || null,
    });
  }
};

// ============================================================
// STUDENT RESULTS
// GET /api/student/results
// ============================================================

export const getMyResults = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication data",
      });
    }

    // --------------------------------------------------------
    // Find logged-in student
    // --------------------------------------------------------

    const student = await prisma.student.findUnique({
      where: {
        userId: Number(userId),
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // --------------------------------------------------------
    // Get student's results
    // --------------------------------------------------------

    const results = await prisma.examResult.findMany({
      where: {
        studentId: student.id,
      },

      include: {
        exam: {
          select: {
            id: true,
            title: true,
            examType: true,
            examDate: true,
            maxMarks: true,
          },
        },

        course: {
          select: {
            id: true,
            code: true,
            name: true,
            credits: true,
            semester: true,
            type: true,
          },
        },
      },

      orderBy: {
        id: "desc",
      },
    });

    // --------------------------------------------------------
    // Return results
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Get student results error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student results",
    });
  }
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  createStudentProfile,
  getStudentProfile,
  updateStudentProfile,
  changeStudentPassword,
  getFacultyStudents,
  getMyResults,
};