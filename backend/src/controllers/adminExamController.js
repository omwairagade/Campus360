import prisma from "../lib/prisma.js";

// =====================================================
// HELPERS
// =====================================================

const parseId = (value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const parseDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const examInclude = {
  course: {
    select: {
      id: true,
      code: true,
      name: true,
      credits: true,
      semester: true,
      type: true,
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
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  },

  _count: {
    select: {
      results: true,
    },
  },
};

// =====================================================
// GET ALL ADMIN EXAMS
// GET /api/admin/exams
// =====================================================
export const getAdminExams = async (req, res) => {
  try {
    const {
      search = "",
      courseId,
      facultyId,
      semester,
      examType,
      fromDate,
      toDate,
    } = req.query;

    const where = {};

    // -----------------------------------------
    // Course filter
    // -----------------------------------------
    if (courseId) {
      const parsedCourseId = parseId(courseId);

      if (parsedCourseId) {
        where.courseId = parsedCourseId;
      }
    }

    // -----------------------------------------
    // Faculty filter
    // -----------------------------------------
    if (facultyId) {
      const parsedFacultyId = parseId(facultyId);

      if (parsedFacultyId) {
        where.facultyId = parsedFacultyId;
      }
    }

    // -----------------------------------------
    // Semester filter
    // -----------------------------------------
    if (semester) {
      const parsedSemester = Number(semester);

      if (Number.isInteger(parsedSemester)) {
        where.course = {
          ...(where.course || {}),
          semester: parsedSemester,
        };
      }
    }

    // -----------------------------------------
    // Exam type filter
    // -----------------------------------------
    if (examType && examType !== "ALL") {
      where.examType = examType;
    }

    // -----------------------------------------
    // Search
    // -----------------------------------------
    if (search.trim()) {
      const searchText = search.trim();

      where.OR = [
        {
          title: {
            contains: searchText,
            mode: "insensitive",
          },
        },
        {
          examType: {
            contains: searchText,
            mode: "insensitive",
          },
        },
        {
          course: {
            code: {
              contains: searchText,
              mode: "insensitive",
            },
          },
        },
        {
          course: {
            name: {
              contains: searchText,
              mode: "insensitive",
            },
          },
        },
        {
          faculty: {
            user: {
              firstName: {
                contains: searchText,
                mode: "insensitive",
              },
            },
          },
        },
        {
          faculty: {
            user: {
              lastName: {
                contains: searchText,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }

    // -----------------------------------------
    // Date range
    // -----------------------------------------
    if (fromDate || toDate) {
      where.examDate = {};

      if (fromDate) {
        const startDate = parseDate(fromDate);

        if (startDate) {
          where.examDate.gte = startDate;
        }
      }

      if (toDate) {
        const endDate = parseDate(toDate);

        if (endDate) {
          endDate.setHours(23, 59, 59, 999);
          where.examDate.lte = endDate;
        }
      }

      if (Object.keys(where.examDate).length === 0) {
        delete where.examDate;
      }
    }

    const exams = await prisma.exam.findMany({
      where,
      orderBy: [
        {
          examDate: "asc",
        },
        {
          id: "asc",
        },
      ],
      include: examInclude,
    });

    return res.status(200).json({
      success: true,
      count: exams.length,
      exams,
      data: exams,
    });
  } catch (error) {
    console.error("Get admin exams error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch exams.",
      error: error?.message,
    });
  }
};

// =====================================================
// GET SINGLE ADMIN EXAM
// GET /api/admin/exams/:id
// =====================================================
export const getAdminExamById = async (req, res) => {
  try {
    const examId = parseId(req.params.id);

    if (!examId) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam ID.",
      });
    }

    const exam = await prisma.exam.findUnique({
      where: {
        id: examId,
      },
      include: {
        ...examInclude,

        results: {
          orderBy: {
            id: "asc",
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
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found.",
      });
    }

    return res.status(200).json({
      success: true,
      exam,
      data: exam,
    });
  } catch (error) {
    console.error("Get admin exam details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch exam details.",
      error: error?.message,
    });
  }
};

// =====================================================
// CREATE ADMIN EXAM
// POST /api/admin/exams
// =====================================================
export const createAdminExam = async (req, res) => {
  try {
    const {
      title,
      examType,
      examDate,
      maxMarks,
      courseId,
      facultyId,
    } = req.body;

    // -----------------------------------------
    // Validation
    // -----------------------------------------
    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Exam title is required.",
      });
    }

    if (!examType?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Exam type is required.",
      });
    }

    if (!examDate) {
      return res.status(400).json({
        success: false,
        message: "Exam date is required.",
      });
    }

    const parsedCourseId = parseId(courseId);
    const parsedFacultyId = parseId(facultyId);

    if (!parsedCourseId) {
      return res.status(400).json({
        success: false,
        message: "Valid course is required.",
      });
    }

    if (!parsedFacultyId) {
      return res.status(400).json({
        success: false,
        message: "Valid faculty is required.",
      });
    }

    const parsedExamDate = parseDate(examDate);

    if (!parsedExamDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam date.",
      });
    }

    const parsedMaxMarks =
      maxMarks === undefined ||
      maxMarks === null ||
      maxMarks === ""
        ? 100
        : Number(maxMarks);

    if (
      !Number.isFinite(parsedMaxMarks) ||
      parsedMaxMarks <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Maximum marks must be greater than 0.",
      });
    }

    // -----------------------------------------
    // Check course
    // -----------------------------------------
    const course = await prisma.course.findUnique({
      where: {
        id: parsedCourseId,
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    // -----------------------------------------
    // Check faculty
    // -----------------------------------------
    const faculty = await prisma.faculty.findUnique({
      where: {
        id: parsedFacultyId,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found.",
      });
    }

    // -----------------------------------------
    // Check faculty belongs to course
    // Admin can intentionally assign faculty,
    // but if course has an assigned faculty,
    // prevent accidental mismatch.
    // -----------------------------------------
    if (
      course.facultyId !== null &&
      course.facultyId !== parsedFacultyId
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Selected faculty is not assigned to this course.",
      });
    }

    // -----------------------------------------
    // Create
    // -----------------------------------------
    const exam = await prisma.exam.create({
      data: {
        title: title.trim(),
        examType: examType.trim(),
        examDate: parsedExamDate,
        maxMarks: parsedMaxMarks,
        courseId: parsedCourseId,
        facultyId: parsedFacultyId,
      },
      include: examInclude,
    });

    return res.status(201).json({
      success: true,
      message: "Exam created successfully.",
      exam,
      data: exam,
    });
  } catch (error) {
    console.error("Create admin exam error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create exam.",
      error: error?.message,
    });
  }
};

// =====================================================
// UPDATE ADMIN EXAM
// PATCH /api/admin/exams/:id
// =====================================================
export const updateAdminExam = async (req, res) => {
  try {
    const examId = parseId(req.params.id);

    if (!examId) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam ID.",
      });
    }

    const existingExam = await prisma.exam.findUnique({
      where: {
        id: examId,
      },
    });

    if (!existingExam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found.",
      });
    }

    const {
      title,
      examType,
      examDate,
      maxMarks,
      courseId,
      facultyId,
    } = req.body;

    const updateData = {};

    // -----------------------------------------
    // Title
    // -----------------------------------------
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Exam title cannot be empty.",
        });
      }

      updateData.title = title.trim();
    }

    // -----------------------------------------
    // Exam type
    // -----------------------------------------
    if (examType !== undefined) {
      if (!examType.trim()) {
        return res.status(400).json({
          success: false,
          message: "Exam type cannot be empty.",
        });
      }

      updateData.examType = examType.trim();
    }

    // -----------------------------------------
    // Exam date
    // -----------------------------------------
    if (examDate !== undefined) {
      const parsedExamDate = parseDate(examDate);

      if (!parsedExamDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid exam date.",
        });
      }

      updateData.examDate = parsedExamDate;
    }

    // -----------------------------------------
    // Maximum marks
    // -----------------------------------------
    if (maxMarks !== undefined) {
      const parsedMaxMarks = Number(maxMarks);

      if (
        !Number.isFinite(parsedMaxMarks) ||
        parsedMaxMarks <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Maximum marks must be greater than 0.",
        });
      }

      updateData.maxMarks = parsedMaxMarks;
    }

    // -----------------------------------------
    // Course
    // -----------------------------------------
    let finalCourseId = existingExam.courseId;

    if (courseId !== undefined) {
      const parsedCourseId = parseId(courseId);

      if (!parsedCourseId) {
        return res.status(400).json({
          success: false,
          message: "Invalid course ID.",
        });
      }

      const course = await prisma.course.findUnique({
        where: {
          id: parsedCourseId,
        },
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found.",
        });
      }

      finalCourseId = parsedCourseId;
      updateData.courseId = parsedCourseId;
    }

    // -----------------------------------------
    // Faculty
    // -----------------------------------------
    let finalFacultyId = existingExam.facultyId;

    if (facultyId !== undefined) {
      const parsedFacultyId = parseId(facultyId);

      if (!parsedFacultyId) {
        return res.status(400).json({
          success: false,
          message: "Invalid faculty ID.",
        });
      }

      const faculty = await prisma.faculty.findUnique({
        where: {
          id: parsedFacultyId,
        },
      });

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: "Faculty not found.",
        });
      }

      finalFacultyId = parsedFacultyId;
      updateData.facultyId = parsedFacultyId;
    }

    // -----------------------------------------
    // Validate final course/faculty relationship
    // -----------------------------------------
    const finalCourse = await prisma.course.findUnique({
      where: {
        id: finalCourseId,
      },
    });

    if (!finalCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    if (
      finalCourse.facultyId !== null &&
      finalCourse.facultyId !== finalFacultyId
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Selected faculty is not assigned to this course.",
      });
    }

    // -----------------------------------------
    // Check whether anything changed
    // -----------------------------------------
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided for update.",
      });
    }

    const updatedExam = await prisma.exam.update({
      where: {
        id: examId,
      },
      data: updateData,
      include: examInclude,
    });

    return res.status(200).json({
      success: true,
      message: "Exam updated successfully.",
      exam: updatedExam,
      data: updatedExam,
    });
  } catch (error) {
    console.error("Update admin exam error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update exam.",
      error: error?.message,
    });
  }
};

// =====================================================
// DELETE ADMIN EXAM
// DELETE /api/admin/exams/:id
// =====================================================
export const deleteAdminExam = async (req, res) => {
  try {
    const examId = parseId(req.params.id);

    if (!examId) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam ID.",
      });
    }

    const exam = await prisma.exam.findUnique({
      where: {
        id: examId,
      },
      include: {
        _count: {
          select: {
            results: true,
          },
        },
      },
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found.",
      });
    }

    // Do not remove an exam if marks/results already exist.
    if (exam._count.results > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This exam cannot be deleted because exam results already exist for it.",
      });
    }

    await prisma.exam.delete({
      where: {
        id: examId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Exam deleted successfully.",
      data: null,
    });
  } catch (error) {
    console.error("Delete admin exam error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete exam.",
      error: error?.message,
    });
  }
};