import prisma from "../lib/prisma.js";

// ============================================================
// CREATE EXAM
// ============================================================
export const createExam = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const {
      title,
      examType,
      examDate,
      maxMarks,
      courseId,
    } = req.body;

    if (
      !title ||
      !examType ||
      !examDate ||
      !courseId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title, exam type, exam date and course are required",
      });
    }

    const parsedExamDate =
      new Date(examDate);

    if (
      Number.isNaN(
        parsedExamDate.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam date",
      });
    }

    const faculty =
      await prisma.faculty.findUnique({
        where: {
          userId: Number(userId),
        },
      });

    if (!faculty) {
      return res.status(403).json({
        success: false,
        message:
          "Only faculty can create exams",
      });
    }

    const course =
      await prisma.course.findUnique({
        where: {
          id: Number(courseId),
        },
      });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (
      course.facultyId !==
      faculty.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not assigned to this course",
      });
    }

    const parsedMaxMarks =
      maxMarks === undefined ||
      maxMarks === null ||
      maxMarks === ""
        ? 100
        : Number(maxMarks);

    if (
      Number.isNaN(
        parsedMaxMarks
      ) ||
      parsedMaxMarks <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Maximum marks must be greater than 0",
      });
    }

    const exam =
      await prisma.exam.create({
        data: {
          title: title.trim(),
          examType: examType.trim(),
          examDate:
            parsedExamDate,
          maxMarks:
            parsedMaxMarks,
          courseId:
            course.id,
          facultyId:
            faculty.id,
        },

        include: {
          course: true,

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
      message:
        "Exam created successfully",
      exam,
    });
  } catch (error) {
    console.error(
      "Create exam error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create exam",
      error: error.message,
    });
  }
};

// ============================================================
// GET EXAMS FOR LOGGED-IN FACULTY
// ============================================================
export const getMyFacultyExams =
  async (req, res) => {
    try {
      const userId =
        req.user?.userId;

      const faculty =
        await prisma.faculty.findUnique({
          where: {
            userId: Number(userId),
          },
        });

      if (!faculty) {
        return res.status(403).json({
          success: false,
          message:
            "Faculty profile not found",
        });
      }

      const exams =
        await prisma.exam.findMany({
          where: {
            facultyId:
              faculty.id,
          },

          include: {
            course: {
              select: {
                id: true,
                code: true,
                name: true,
                credits: true,
                semester: true,
              },
            },

            results: {
              select: {
                id: true,
                studentId: true,
                marksObtained: true,
                grade: true,
                gradePoint: true,
              },
            },
          },

          orderBy: {
            examDate: "asc",
          },
        });

      const formattedExams =
        exams.map((exam) => ({
          ...exam,

          totalResults:
            exam.results.length,

          publishedResults:
            exam.results.length,
        }));

      return res.status(200).json({
        success: true,

        faculty: {
          id: faculty.id,
          employeeId:
            faculty.employeeId,
        },

        exams:
          formattedExams,
      });
    } catch (error) {
      console.error(
        "Get faculty exams error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch faculty exams",
        error: error.message,
      });
    }
  };

// ============================================================
// GET ONE FACULTY EXAM WITH STUDENTS + RESULTS
// ============================================================
export const getFacultyExamById =
  async (req, res) => {
    try {
      const userId =
        req.user?.userId;

      const examId = Number(
        req.params.id
      );

      if (
        !Number.isInteger(examId) ||
        examId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid exam ID",
        });
      }

      const faculty =
        await prisma.faculty.findUnique({
          where: {
            userId: Number(userId),
          },
        });

      if (!faculty) {
        return res.status(403).json({
          success: false,
          message:
            "Faculty profile not found",
        });
      }

      const exam =
        await prisma.exam.findUnique({
          where: {
            id: examId,
          },

          include: {
            course: true,

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

            results: {
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

              orderBy: {
                studentId: "asc",
              },
            },
          },
        });

      if (!exam) {
        return res.status(404).json({
          success: false,
          message:
            "Exam not found",
        });
      }

      if (
        exam.facultyId !==
        faculty.id
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to access this exam",
        });
      }

      const enrollments =
        await prisma.courseEnrollment.findMany({
          where: {
            courseId:
              exam.courseId,
          },

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

          orderBy: {
            studentId: "asc",
          },
        });

      const resultMap =
        new Map(
          exam.results.map(
            (result) => [
              result.studentId,
              result,
            ]
          )
        );

      const students =
        enrollments.map(
          (enrollment) => ({
            ...enrollment.student,

            user:
              enrollment.student
                .user,

            result:
              resultMap.get(
                enrollment.studentId
              ) || null,
          })
        );

      return res.status(200).json({
        success: true,

        exam,

        students,
      });
    } catch (error) {
      console.error(
        "Get faculty exam error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch faculty exam",
        error: error.message,
      });
    }
  };

// ============================================================
// GET EXAMS FOR LOGGED-IN STUDENT
// ============================================================
export const getMyExams = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.userId;

    const student =
      await prisma.student.findUnique({
        where: {
          userId,
        },
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student profile not found",
      });
    }

    const exams =
      await prisma.exam.findMany({
        where: {
          course: {
            programId:
              student.programId,

            semester:
              student.semester,

            enrollments: {
              some: {
                studentId:
                  student.id,
              },
            },
          },
        },

        include: {
          course: {
            select: {
              id: true,
              code: true,
              name: true,
              credits: true,
              semester: true,
            },
          },

          faculty: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },

          results: {
            where: {
              studentId:
                student.id,
            },

            select: {
              id: true,
              marksObtained: true,
              grade: true,
              gradePoint: true,
            },
          },
        },

        orderBy: {
          examDate: "asc",
        },
      });

    const formattedExams =
      exams.map((exam) => ({
        id: exam.id,
        title:
          exam.title,
        examType:
          exam.examType,
        examDate:
          exam.examDate,
        maxMarks:
          exam.maxMarks,
        course:
          exam.course,
        faculty:
          exam.faculty,
        result:
          exam.results[0] ||
          null,
      }));

    return res.status(200).json({
      success: true,
      exams:
        formattedExams,
    });
  } catch (error) {
    console.error(
      "Get student exams error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch exams",
    });
  }
};

// ============================================================
// GET STUDENT RESULTS
// ============================================================
export const getMyResults = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.userId;

    const student =
      await prisma.student.findUnique({
        where: {
          userId,
        },
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student profile not found",
      });
    }

    const results =
      await prisma.examResult.findMany({
        where: {
          studentId:
            student.id,
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
            },
          },
        },

        orderBy: [
          {
            course: {
              name: "asc",
            },
          },

          {
            exam: {
              examDate:
                "desc",
            },
          },
        ],
      });

    return res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    console.error(
      "Get student results error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch results",
    });
  }
};

// ============================================================
// ADD / UPDATE RESULT
// ============================================================
export const saveExamResult = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.userId;

    const examId = Number(
      req.params.examId
    );

    const {
      studentId,
      marksObtained,
      grade,
      gradePoint,
    } = req.body;

    if (
      !examId ||
      !studentId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Exam ID and student ID are required",
      });
    }

    if (
      marksObtained ===
        undefined ||
      marksObtained === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Marks obtained are required",
      });
    }

    const faculty =
      await prisma.faculty.findUnique({
        where: {
          userId: Number(userId),
        },
      });

    if (!faculty) {
      return res.status(403).json({
        success: false,
        message:
          "Only faculty can save exam results",
      });
    }

    const exam =
      await prisma.exam.findUnique({
        where: {
          id: examId,
        },
      });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message:
          "Exam not found",
      });
    }

    if (
      exam.facultyId !==
      faculty.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to save results for this exam",
      });
    }

    const student =
      await prisma.student.findUnique({
        where: {
          id: Number(studentId),
        },
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student not found",
      });
    }

    const enrolled =
      await prisma.courseEnrollment.findUnique(
        {
          where: {
            studentId_courseId: {
              studentId:
                student.id,

              courseId:
                exam.courseId,
            },
          },
        }
      );

    if (!enrolled) {
      return res.status(400).json({
        success: false,
        message:
          "Student is not enrolled in this course",
      });
    }

    const marks =
      Number(marksObtained);

    if (
      Number.isNaN(marks) ||
      marks < 0 ||
      marks > exam.maxMarks
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Marks must be between 0 and ${exam.maxMarks}`,
      });
    }

    const parsedGradePoint =
      gradePoint !==
        undefined &&
      gradePoint !== null &&
      gradePoint !== ""
        ? Number(gradePoint)
        : null;

    if (
      parsedGradePoint !== null &&
      Number.isNaN(
        parsedGradePoint
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid grade point",
      });
    }

    const result =
      await prisma.examResult.upsert({
        where: {
          examId_studentId: {
            examId,
            studentId:
              student.id,
          },
        },

        update: {
          courseId:
            exam.courseId,
          marksObtained:
            marks,

          grade:
            grade?.trim() ||
            null,

          gradePoint:
            parsedGradePoint,
        },

        create: {
          examId,
          studentId:
            student.id,
          courseId:
            exam.courseId,

          marksObtained:
            marks,

          grade:
            grade?.trim() ||
            null,

          gradePoint:
            parsedGradePoint,
        },

        include: {
          exam: true,
          course: true,

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
      });

    return res.status(200).json({
      success: true,
      message:
        "Exam result saved successfully",
      result,
    });
  } catch (error) {
    console.error(
      "Save exam result error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to save exam result",
      error: error.message,
    });
  }
};

// ============================================================
// CALCULATE STUDENT CGPA
// ============================================================
export const getMyCGPA = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.userId;

    const student =
      await prisma.student.findUnique({
        where: {
          userId,
        },
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student profile not found",
      });
    }

    const results =
      await prisma.examResult.findMany({
        where: {
          studentId:
            student.id,

          gradePoint: {
            not: null,
          },
        },

        include: {
          course: {
            select: {
              credits: true,
            },
          },
        },
      });

    if (results.length === 0) {
      return res.status(200).json({
        success: true,
        cgpa: 0,
        totalCredits: 0,
        resultsCount: 0,
      });
    }

    let totalWeightedPoints = 0;
    let totalCredits = 0;

    for (const result of results) {
      const credits =
        Number(
          result.course.credits
        );

      const gradePoint =
        Number(
          result.gradePoint
        );

      totalWeightedPoints +=
        credits *
        gradePoint;

      totalCredits +=
        credits;
    }

    const cgpa =
      totalCredits === 0
        ? 0
        : Number(
            (
              totalWeightedPoints /
              totalCredits
            ).toFixed(2)
          );

    return res.status(200).json({
      success: true,
      cgpa,
      totalCredits,
      resultsCount:
        results.length,
    });
  } catch (error) {
    console.error(
      "Get CGPA error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to calculate CGPA",
    });
  }
};

export default {
  createExam,
  getMyFacultyExams,
  getFacultyExamById,
  getMyExams,
  getMyResults,
  saveExamResult,
  getMyCGPA,
};