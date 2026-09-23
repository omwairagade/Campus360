import prisma from "../lib/prisma.js";

const parseId = (value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const parseMarks = (value) => {
  const marks = Number(value);

  if (!Number.isFinite(marks) || marks < 0) {
    return null;
  }

  return marks;
};

const resultInclude = {
  exam: {
    select: {
      id: true,
      title: true,
      examType: true,
      examDate: true,
      maxMarks: true,
      courseId: true,
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
};

const getStudentName = (student) => {
  if (!student) return "Unknown Student";

  if (student.user) {
    const name = `${student.user.firstName || ""} ${
      student.user.lastName || ""
    }`.trim();

    if (name) {
      return name;
    }

    if (student.user.email) {
      return student.user.email;
    }
  }

  const name = `${student.firstName || ""} ${
    student.lastName || ""
  }`.trim();

  return name || `Student #${student.id}`;
};

/*
|--------------------------------------------------------------------------
| GET ALL ADMIN RESULTS
|--------------------------------------------------------------------------
| GET /api/admin/results
|
| Query parameters:
| search
| examId
| courseId
| studentId
| grade
|--------------------------------------------------------------------------
*/

export const getAdminResults = async (req, res) => {
  try {
    const {
      search,
      examId,
      courseId,
      studentId,
      grade,
    } = req.query;

    const parsedExamId = examId ? parseId(examId) : null;
    const parsedCourseId = courseId ? parseId(courseId) : null;
    const parsedStudentId = studentId ? parseId(studentId) : null;

    if (examId && !parsedExamId) {
      return res.status(400).json({
        success: false,
        message: "Invalid examId.",
      });
    }

    if (courseId && !parsedCourseId) {
      return res.status(400).json({
        success: false,
        message: "Invalid courseId.",
      });
    }

    if (studentId && !parsedStudentId) {
      return res.status(400).json({
        success: false,
        message: "Invalid studentId.",
      });
    }

    const where = {};

    if (parsedExamId) {
      where.examId = parsedExamId;
    }

    if (parsedCourseId) {
      where.courseId = parsedCourseId;
    }

    if (parsedStudentId) {
      where.studentId = parsedStudentId;
    }

    if (grade?.trim()) {
      where.grade = {
        contains: grade.trim(),
        mode: "insensitive",
      };
    }

    if (search?.trim()) {
      const searchTerm = search.trim();

      const numericSearch = Number(searchTerm);
      const isNumericSearch =
        Number.isInteger(numericSearch) && numericSearch > 0;

      where.OR = [
        {
          grade: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          exam: {
            title: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          exam: {
            examType: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          course: {
            code: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          course: {
            name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          student: {
            user: {
              firstName: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
        },
        {
          student: {
            user: {
              lastName: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
        },
        {
          student: {
            user: {
              email: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
        },
      ];

      if (isNumericSearch) {
        where.OR.push({
          id: numericSearch,
        });

        where.OR.push({
          studentId: numericSearch,
        });

        where.OR.push({
          examId: numericSearch,
        });

        where.OR.push({
          courseId: numericSearch,
        });
      }
    }

    const results = await prisma.examResult.findMany({
      where,

      include: resultInclude,

      orderBy: [
        {
          exam: {
            examDate: "desc",
          },
        },
        {
          id: "desc",
        },
      ],
    });

    return res.status(200).json({
      success: true,
      count: results.length,
      results,
      data: results,
    });
  } catch (error) {
    console.error("getAdminResults error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch exam results.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET RESULT BY ID
|--------------------------------------------------------------------------
| GET /api/admin/results/:id
|--------------------------------------------------------------------------
*/

export const getAdminResultById = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid result ID.",
      });
    }

    const result = await prisma.examResult.findUnique({
      where: {
        id,
      },
      include: resultInclude,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Exam result not found.",
      });
    }

    return res.status(200).json({
      success: true,
      result,
      data: result,
    });
  } catch (error) {
    console.error("getAdminResultById error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch exam result.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE RESULT
|--------------------------------------------------------------------------
| POST /api/admin/results
|
| Body:
| {
|   examId,
|   studentId,
|   courseId,
|   marksObtained,
|   grade,
|   gradePoint
| }
|--------------------------------------------------------------------------
*/

export const createAdminResult = async (req, res) => {
  try {
    const {
      examId,
      studentId,
      courseId,
      marksObtained,
      grade,
      gradePoint,
    } = req.body;

    const parsedExamId = parseId(examId);
    const parsedStudentId = parseId(studentId);
    const parsedCourseId = parseId(courseId);
    const parsedMarks = parseMarks(marksObtained);

    if (!parsedExamId) {
      return res.status(400).json({
        success: false,
        message: "Valid examId is required.",
      });
    }

    if (!parsedStudentId) {
      return res.status(400).json({
        success: false,
        message: "Valid studentId is required.",
      });
    }

    if (!parsedCourseId) {
      return res.status(400).json({
        success: false,
        message: "Valid courseId is required.",
      });
    }

    if (parsedMarks === null) {
      return res.status(400).json({
        success: false,
        message: "marksObtained must be a valid non-negative number.",
      });
    }

    const parsedGradePoint =
      gradePoint === null ||
      gradePoint === undefined ||
      gradePoint === ""
        ? null
        : Number(gradePoint);

    if (
      parsedGradePoint !== null &&
      (!Number.isFinite(parsedGradePoint) || parsedGradePoint < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "gradePoint must be a valid non-negative number.",
      });
    }

    const exam = await prisma.exam.findUnique({
      where: {
        id: parsedExamId,
      },
      select: {
        id: true,
        title: true,
        maxMarks: true,
        courseId: true,
      },
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found.",
      });
    }

    if (exam.courseId !== parsedCourseId) {
      return res.status(400).json({
        success: false,
        message:
          "The selected course does not belong to the selected exam.",
      });
    }

    if (parsedMarks > exam.maxMarks) {
      return res.status(400).json({
        success: false,
        message: `Marks obtained cannot exceed the maximum marks of ${exam.maxMarks}.`,
      });
    }

    const student = await prisma.student.findUnique({
      where: {
        id: parsedStudentId,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const course = await prisma.course.findUnique({
      where: {
        id: parsedCourseId,
      },
      select: {
        id: true,
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const existingResult = await prisma.examResult.findUnique({
      where: {
        examId_studentId: {
          examId: parsedExamId,
          studentId: parsedStudentId,
        },
      },
    });

    if (existingResult) {
      return res.status(409).json({
        success: false,
        message:
          "A result already exists for this student in this exam.",
        result: existingResult,
      });
    }

    const result = await prisma.examResult.create({
      data: {
        examId: parsedExamId,
        studentId: parsedStudentId,
        courseId: parsedCourseId,
        marksObtained: parsedMarks,
        grade:
          grade === undefined ||
          grade === null ||
          grade === ""
            ? null
            : String(grade).trim(),
        gradePoint: parsedGradePoint,
      },
      include: resultInclude,
    });

    return res.status(201).json({
      success: true,
      message: "Exam result created successfully.",
      result,
      data: result,
    });
  } catch (error) {
    console.error("createAdminResult error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "A result already exists for this student in this exam.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create exam result.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE RESULT
|--------------------------------------------------------------------------
| PATCH /api/admin/results/:id
|--------------------------------------------------------------------------
*/

export const updateAdminResult = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid result ID.",
      });
    }

    const existingResult = await prisma.examResult.findUnique({
      where: {
        id,
      },
      include: {
        exam: {
          select: {
            id: true,
            maxMarks: true,
            courseId: true,
          },
        },
      },
    });

    if (!existingResult) {
      return res.status(404).json({
        success: false,
        message: "Exam result not found.",
      });
    }

    const {
      examId,
      studentId,
      courseId,
      marksObtained,
      grade,
      gradePoint,
    } = req.body;

    const data = {};

    const finalExamId =
      examId !== undefined
        ? parseId(examId)
        : existingResult.examId;

    const finalStudentId =
      studentId !== undefined
        ? parseId(studentId)
        : existingResult.studentId;

    const finalCourseId =
      courseId !== undefined
        ? parseId(courseId)
        : existingResult.courseId;

    if (!finalExamId) {
      return res.status(400).json({
        success: false,
        message: "Invalid examId.",
      });
    }

    if (!finalStudentId) {
      return res.status(400).json({
        success: false,
        message: "Invalid studentId.",
      });
    }

    if (!finalCourseId) {
      return res.status(400).json({
        success: false,
        message: "Invalid courseId.",
      });
    }

    const exam = await prisma.exam.findUnique({
      where: {
        id: finalExamId,
      },
      select: {
        id: true,
        maxMarks: true,
        courseId: true,
      },
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found.",
      });
    }

    if (exam.courseId !== finalCourseId) {
      return res.status(400).json({
        success: false,
        message:
          "The selected course does not belong to the selected exam.",
      });
    }

    const student = await prisma.student.findUnique({
      where: {
        id: finalStudentId,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const course = await prisma.course.findUnique({
      where: {
        id: finalCourseId,
      },
      select: {
        id: true,
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    if (marksObtained !== undefined) {
      const parsedMarks = parseMarks(marksObtained);

      if (parsedMarks === null) {
        return res.status(400).json({
          success: false,
          message:
            "marksObtained must be a valid non-negative number.",
        });
      }

      if (parsedMarks > exam.maxMarks) {
        return res.status(400).json({
          success: false,
          message: `Marks obtained cannot exceed the maximum marks of ${exam.maxMarks}.`,
        });
      }

      data.marksObtained = parsedMarks;
    }

    if (examId !== undefined) {
      data.examId = finalExamId;
    }

    if (studentId !== undefined) {
      data.studentId = finalStudentId;
    }

    if (courseId !== undefined) {
      data.courseId = finalCourseId;
    }

    if (grade !== undefined) {
      data.grade =
        grade === null || grade === ""
          ? null
          : String(grade).trim();
    }

    if (gradePoint !== undefined) {
      if (gradePoint === null || gradePoint === "") {
        data.gradePoint = null;
      } else {
        const parsedGradePoint = Number(gradePoint);

        if (
          !Number.isFinite(parsedGradePoint) ||
          parsedGradePoint < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "gradePoint must be a valid non-negative number.",
          });
        }

        data.gradePoint = parsedGradePoint;
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided for update.",
      });
    }

    const duplicateResult = await prisma.examResult.findFirst({
      where: {
        examId: finalExamId,
        studentId: finalStudentId,
        NOT: {
          id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateResult) {
      return res.status(409).json({
        success: false,
        message:
          "Another result already exists for this student in this exam.",
      });
    }

    const result = await prisma.examResult.update({
      where: {
        id,
      },
      data,
      include: resultInclude,
    });

    return res.status(200).json({
      success: true,
      message: "Exam result updated successfully.",
      result,
      data: result,
    });
  } catch (error) {
    console.error("updateAdminResult error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "A result already exists for this student in this exam.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update exam result.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE RESULT
|--------------------------------------------------------------------------
| DELETE /api/admin/results/:id
|--------------------------------------------------------------------------
*/

export const deleteAdminResult = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid result ID.",
      });
    }

    const existingResult = await prisma.examResult.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existingResult) {
      return res.status(404).json({
        success: false,
        message: "Exam result not found.",
      });
    }

    await prisma.examResult.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Exam result deleted successfully.",
      data: null,
    });
  } catch (error) {
    console.error("deleteAdminResult error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete exam result.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};