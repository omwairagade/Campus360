import prisma from "../lib/prisma.js";

const parseId = (value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const buildEnrollmentInclude = () => ({
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
  },

  course: {
    include: {
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      program: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      faculty: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  },
});

// =====================================================
// GET ALL ENROLLMENTS
// GET /api/admin/enrollments
// =====================================================

export const getAdminEnrollments = async (req, res) => {
  try {
    const {
      search = "",
      studentId,
      courseId,
      departmentId,
      programId,
      semester,
    } = req.query;

    const where = {};

    // ---------------------------------------------------
    // STUDENT FILTER
    // ---------------------------------------------------

    if (studentId) {
      const parsedStudentId = parseId(studentId);

      if (parsedStudentId) {
        where.studentId = parsedStudentId;
      }
    }

    // ---------------------------------------------------
    // COURSE FILTER
    // ---------------------------------------------------

    if (courseId) {
      const parsedCourseId = parseId(courseId);

      if (parsedCourseId) {
        where.courseId = parsedCourseId;
      }
    }

    // ---------------------------------------------------
    // SEMESTER FILTER
    // ---------------------------------------------------

    if (semester) {
      const parsedSemester = Number(semester);

      if (Number.isInteger(parsedSemester)) {
        where.course = {
          semester: parsedSemester,
        };
      }
    }

    // ---------------------------------------------------
    // DEPARTMENT / PROGRAM FILTERS
    // ---------------------------------------------------

    if (departmentId || programId) {
      const existingCourseFilter = where.course || {};

      if (departmentId) {
        const parsedDepartmentId = parseId(departmentId);

        if (parsedDepartmentId) {
          existingCourseFilter.departmentId =
            parsedDepartmentId;
        }
      }

      if (programId) {
        const parsedProgramId = parseId(programId);

        if (parsedProgramId) {
          existingCourseFilter.programId =
            parsedProgramId;
        }
      }

      where.course = existingCourseFilter;
    }

    // ---------------------------------------------------
    // SEARCH
    // ---------------------------------------------------

    if (search.trim()) {
      const searchText = search.trim();

      where.OR = [
        // Student first name
        {
          student: {
            user: {
              firstName: {
                contains: searchText,
                mode: "insensitive",
              },
            },
          },
        },

        // Student last name
        {
          student: {
            user: {
              lastName: {
                contains: searchText,
                mode: "insensitive",
              },
            },
          },
        },

        // Student email
        {
          student: {
            user: {
              email: {
                contains: searchText,
                mode: "insensitive",
              },
            },
          },
        },

        // Student enrollment number
        {
          student: {
            enrollmentNumber: {
              contains: searchText,
              mode: "insensitive",
            },
          },
        },

        // Course code
        {
          course: {
            code: {
              contains: searchText,
              mode: "insensitive",
            },
          },
        },

        // Course name
        {
          course: {
            name: {
              contains: searchText,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    // ---------------------------------------------------
    // FETCH
    // ---------------------------------------------------

    const enrollments =
      await prisma.courseEnrollment.findMany({
        where,

        orderBy: {
          id: "asc",
        },

        include: buildEnrollmentInclude(),
      });

    // ---------------------------------------------------
    // RETURN
    // ---------------------------------------------------

    return res.status(200).json({
      success: true,
      count: enrollments.length,
      enrollments,
      data: enrollments,
    });
  } catch (error) {
    console.error(
      "Get admin enrollments error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrollments.",
      error: error?.message,
    });
  }
};

// =====================================================
// GET SINGLE ENROLLMENT
// GET /api/admin/enrollments/:id
// =====================================================

export const getAdminEnrollmentById = async (
  req,
  res
) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid enrollment ID.",
      });
    }

    const enrollment =
      await prisma.courseEnrollment.findUnique({
        where: {
          id,
        },

        include: buildEnrollmentInclude(),
      });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      enrollment,
      data: enrollment,
    });
  } catch (error) {
    console.error(
      "Get admin enrollment details error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrollment details.",
      error: error?.message,
    });
  }
};

// =====================================================
// CREATE ENROLLMENT
// POST /api/admin/enrollments
// =====================================================

export const createAdminEnrollment = async (
  req,
  res
) => {
  try {
    const {
      studentId,
      courseId,
      progressPercent,
    } = req.body;

    const parsedStudentId =
      parseId(studentId);

    const parsedCourseId =
      parseId(courseId);

    if (
      !parsedStudentId ||
      !parsedCourseId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid student and course are required.",
      });
    }

    const student =
      await prisma.student.findUnique({
        where: {
          id: parsedStudentId,
        },

        select: {
          id: true,
          enrollmentNumber: true,
          semester: true,
          programId: true,
          departmentId: true,

          user: {
            select: {
              isActive: true,
            },
          },
        },
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const course =
      await prisma.course.findUnique({
        where: {
          id: parsedCourseId,
        },

        select: {
          id: true,
          code: true,
          name: true,
          semester: true,
          credits: true,
          programId: true,
          departmentId: true,
        },
      });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    // ---------------------------------------------------
    // OPTIONAL SAFETY CHECKS
    // ---------------------------------------------------

    if (
      student.programId &&
      course.programId &&
      student.programId !== course.programId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "The selected course does not belong to the student's program.",
      });
    }

    if (
      student.semester &&
      course.semester &&
      student.semester !== course.semester
    ) {
      return res.status(400).json({
        success: false,
        message:
          "The selected course does not belong to the student's semester.",
      });
    }

    // ---------------------------------------------------
    // DUPLICATE CHECK
    // ---------------------------------------------------

    const existingEnrollment =
      await prisma.courseEnrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: parsedStudentId,
            courseId: parsedCourseId,
          },
        },
      });

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message:
          "Student is already enrolled in this course.",
      });
    }

    // ---------------------------------------------------
    // PROGRESS
    // ---------------------------------------------------

    const parsedProgress =
      progressPercent === undefined ||
      progressPercent === null ||
      progressPercent === ""
        ? 0
        : Number(progressPercent);

    if (
      !Number.isInteger(parsedProgress) ||
      parsedProgress < 0 ||
      parsedProgress > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Progress must be an integer between 0 and 100.",
      });
    }

    // ---------------------------------------------------
    // CREATE
    // ---------------------------------------------------

    const enrollment =
      await prisma.courseEnrollment.create({
        data: {
          studentId: parsedStudentId,
          courseId: parsedCourseId,
          progressPercent: parsedProgress,
        },

        include: buildEnrollmentInclude(),
      });

    return res.status(201).json({
      success: true,
      message:
        "Student enrolled successfully.",
      enrollment,
      data: enrollment,
    });
  } catch (error) {
    console.error(
      "Create admin enrollment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create enrollment.",
      error: error?.message,
    });
  }
};

// =====================================================
// UPDATE ENROLLMENT
// PATCH /api/admin/enrollments/:id
// =====================================================

export const updateAdminEnrollment = async (
  req,
  res
) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid enrollment ID.",
      });
    }

    const existingEnrollment =
      await prisma.courseEnrollment.findUnique({
        where: {
          id,
        },
      });

    if (!existingEnrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found.",
      });
    }

    const {
      progressPercent,
    } = req.body;

    if (
      progressPercent === undefined ||
      progressPercent === null ||
      progressPercent === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Progress percentage is required.",
      });
    }

    const parsedProgress =
      Number(progressPercent);

    if (
      !Number.isInteger(parsedProgress) ||
      parsedProgress < 0 ||
      parsedProgress > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Progress must be an integer between 0 and 100.",
      });
    }

    const enrollment =
      await prisma.courseEnrollment.update({
        where: {
          id,
        },

        data: {
          progressPercent:
            parsedProgress,
        },

        include: buildEnrollmentInclude(),
      });

    return res.status(200).json({
      success: true,
      message:
        "Enrollment progress updated successfully.",
      enrollment,
      data: enrollment,
    });
  } catch (error) {
    console.error(
      "Update admin enrollment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update enrollment.",
      error: error?.message,
    });
  }
};

// =====================================================
// DELETE ENROLLMENT
// DELETE /api/admin/enrollments/:id
// =====================================================

export const deleteAdminEnrollment = async (
  req,
  res
) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid enrollment ID.",
      });
    }

    const enrollment =
      await prisma.courseEnrollment.findUnique({
        where: {
          id,
        },
      });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found.",
      });
    }

    await prisma.courseEnrollment.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Enrollment removed successfully.",
      data: null,
    });
  } catch (error) {
    console.error(
      "Delete admin enrollment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to remove enrollment.",
      error: error?.message,
    });
  }
};