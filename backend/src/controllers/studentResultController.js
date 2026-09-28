import prisma from "../lib/prisma.js";

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
};

export const getMyResults = async (req, res) => {
  try {
    const userId = Number(req.user?.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid authenticated user.",
      });
    }

    const student = await prisma.student.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        enrollmentNumber: true,
        semester: true,
        admissionYear: true,
        batch: true,
        division: true,
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

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found.",
      });
    }

    const results = await prisma.examResult.findMany({
      where: {
        studentId: student.id,
      },
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
      student,
      results,
      data: results,
    });
  } catch (error) {
    console.error("getMyResults error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student results.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};