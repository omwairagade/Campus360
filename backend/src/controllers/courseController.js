import prisma from "../lib/prisma.js";

// =====================================================
// CREATE COURSE
// =====================================================

export const createCourse = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      credits,
      semester,
      type,
      departmentId,
      programId,
      facultyId,
    } = req.body;

    if (
      !code ||
      !name ||
      !credits ||
      !semester ||
      !type ||
      !departmentId ||
      !programId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Code, name, credits, semester, type, department and program are required",
      });
    }

    const normalizedCode = String(code).trim();

    const existingCourse = await prisma.course.findUnique({
      where: {
        code: normalizedCode,
      },
    });

    if (existingCourse) {
      return res.status(409).json({
        success: false,
        message: "Course code already exists",
      });
    }

    const finalDepartmentId = Number(departmentId);
    const finalProgramId = Number(programId);

    const department = await prisma.department.findUnique({
      where: {
        id: finalDepartmentId,
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    const program = await prisma.program.findUnique({
      where: {
        id: finalProgramId,
      },
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    if (program.departmentId !== finalDepartmentId) {
      return res.status(400).json({
        success: false,
        message:
          "Program does not belong to the selected department",
      });
    }

    let finalFacultyId = null;

    if (facultyId !== undefined && facultyId !== null && facultyId !== "") {
      finalFacultyId = Number(facultyId);

      const faculty = await prisma.faculty.findUnique({
        where: {
          id: finalFacultyId,
        },
      });

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: "Faculty not found",
        });
      }

      if (faculty.departmentId !== finalDepartmentId) {
        return res.status(400).json({
          success: false,
          message:
            "Faculty does not belong to the selected department",
        });
      }
    }

    const course = await prisma.course.create({
      data: {
        code: normalizedCode,
        name: String(name).trim(),
        description:
          description !== undefined && description !== null
            ? String(description).trim() || null
            : null,
        credits: Number(credits),
        semester: Number(semester),
        type: String(type).trim(),
        departmentId: finalDepartmentId,
        programId: finalProgramId,
        facultyId: finalFacultyId,
      },
      include: {
        department: true,
        program: true,
        faculty: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      course,
    });
  } catch (error) {
    console.error("Create course error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create course",
    });
  }
};

// =====================================================
// GET ALL COURSES
// =====================================================

export const getCourses = async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        department: true,
        program: true,
        faculty: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        enrollments: {
          select: {
            id: true,
            studentId: true,
            progressPercent: true,
            enrolledAt: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error("Get courses error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch courses",
    });
  }
};

// =====================================================
// GET COURSES FOR LOGGED-IN STUDENT
// =====================================================

export const getMyCourses = async (req, res) => {
  try {
    const userId = req.user.userId;

    const student = await prisma.student.findUnique({
      where: {
        userId,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const enrollments = await prisma.courseEnrollment.findMany({
      where: {
        studentId: student.id,
      },
      include: {
        course: {
          include: {
            department: true,
            program: true,
            faculty: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        course: {
          name: "asc",
        },
      },
    });

    return res.status(200).json({
      success: true,
      courses: enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        enrolledAt: enrollment.enrolledAt,
        progressPercent: enrollment.progressPercent,
        ...enrollment.course,
      })),
    });
  } catch (error) {
    console.error("Get my courses error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your courses",
    });
  }
};

// =====================================================
// GET SINGLE COURSE
// =====================================================

export const getCourseById = async (req, res) => {
  try {
    const courseId = Number(req.params.id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
      include: {
        department: true,
        program: true,
        faculty: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        enrollments: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    return res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    console.error("Get course error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch course",
    });
  }
};

// =====================================================
// UPDATE COURSE
// =====================================================

export const updateCourse = async (req, res) => {
  try {
    const courseId = Number(req.params.id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const existingCourse = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const {
      code,
      name,
      description,
      credits,
      semester,
      type,
      departmentId,
      programId,
      facultyId,
    } = req.body;

    if (code !== undefined) {
      const normalizedCode = String(code).trim();

      if (!normalizedCode) {
        return res.status(400).json({
          success: false,
          message: "Course code cannot be empty",
        });
      }

      if (normalizedCode !== existingCourse.code) {
        const duplicateCourse = await prisma.course.findUnique({
          where: {
            code: normalizedCode,
          },
        });

        if (duplicateCourse) {
          return res.status(409).json({
            success: false,
            message: "Course code already exists",
          });
        }
      }
    }

    const finalDepartmentId =
      departmentId !== undefined
        ? Number(departmentId)
        : existingCourse.departmentId;

    const finalProgramId =
      programId !== undefined
        ? Number(programId)
        : existingCourse.programId;

    const department = await prisma.department.findUnique({
      where: {
        id: finalDepartmentId,
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    const program = await prisma.program.findUnique({
      where: {
        id: finalProgramId,
      },
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    if (program.departmentId !== finalDepartmentId) {
      return res.status(400).json({
        success: false,
        message:
          "Program does not belong to the selected department",
      });
    }

    let finalFacultyId = existingCourse.facultyId;

    if (facultyId !== undefined) {
      if (
        facultyId === null ||
        facultyId === ""
      ) {
        finalFacultyId = null;
      } else {
        finalFacultyId = Number(facultyId);

        const faculty = await prisma.faculty.findUnique({
          where: {
            id: finalFacultyId,
          },
        });

        if (!faculty) {
          return res.status(404).json({
            success: false,
            message: "Faculty not found",
          });
        }

        if (faculty.departmentId !== finalDepartmentId) {
          return res.status(400).json({
            success: false,
            message:
              "Faculty does not belong to the selected department",
          });
        }
      }
    }

    const course = await prisma.course.update({
      where: {
        id: courseId,
      },
      data: {
        ...(code !== undefined && {
          code: String(code).trim(),
        }),

        ...(name !== undefined && {
          name: String(name).trim(),
        }),

        ...(description !== undefined && {
          description:
            description === null
              ? null
              : String(description).trim() || null,
        }),

        ...(credits !== undefined && {
          credits: Number(credits),
        }),

        ...(semester !== undefined && {
          semester: Number(semester),
        }),

        ...(type !== undefined && {
          type: String(type).trim(),
        }),

        ...(departmentId !== undefined && {
          departmentId: finalDepartmentId,
        }),

        ...(programId !== undefined && {
          programId: finalProgramId,
        }),

        ...(facultyId !== undefined && {
          facultyId: finalFacultyId,
        }),
      },
      include: {
        department: true,
        program: true,
        faculty: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Course updated successfully",
      course,
    });
  } catch (error) {
    console.error("Update course error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update course",
    });
  }
};

// =====================================================
// DELETE COURSE
// =====================================================

export const deleteCourse = async (req, res) => {
  try {
    const courseId = Number(req.params.id);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const existingCourse = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
      include: {
        enrollments: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const enrollmentCount =
      existingCourse.enrollments?.length || 0;

    if (enrollmentCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This course cannot be deleted because students are enrolled in it.",
        enrollmentCount,
      });
    }

    await prisma.course.delete({
      where: {
        id: courseId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Delete course error:", error);

    /*
     * PostgreSQL/Prisma foreign-key protection.
     * This prevents accidental deletion when another
     * Campus360 module still depends on the course.
     */
    if (
      error?.code === "P2003" ||
      error?.code === "P2014"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This course cannot be deleted because other Campus360 records depend on it.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete course",
    });
  }
};

// =====================================================
// DEFAULT EXPORT
// =====================================================

export default {
  createCourse,
  getCourses,
  getMyCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
};