import prisma from "../lib/prisma.js";

// =====================================================
// ADMIN DASHBOARD STATISTICS
// GET /api/admin/dashboard/stats
// =====================================================

export const getAdminDashboardStats = async (req, res) => {
  try {
    const [
      totalStudents,
      totalFaculty,
      totalCourses,
      totalDepartments,
      totalPrograms,
      totalEnrollments,
      totalAssignments,
      totalExams,
      upcomingExams,
      feeTotals,
      pendingFees,
      partialFees,
      totalNotices,
      publishedNotices,
    ] = await Promise.all([
      // Students
      prisma.student.count(),

      // Faculty
      prisma.faculty.count(),

      // Courses
      prisma.course.count(),

      // Departments
      prisma.department.count(),

      // Programs
      prisma.program.count(),

      // Enrollments
      prisma.courseEnrollment.count(),

      // Assignments
      prisma.assignment.count(),

      // All exams
      prisma.exam.count(),

      // Upcoming exams
      prisma.exam.count({
        where: {
          examDate: {
            gte: new Date(),
          },
        },
      }),

      // Fee totals
      prisma.fee.aggregate({
        _sum: {
          totalAmount: true,
          paidAmount: true,
        },
      }),

      // Pending fee records
      prisma.fee.count({
        where: {
          status: "PENDING",
        },
      }),

      // Partial fee records
      prisma.fee.count({
        where: {
          status: "PARTIAL",
        },
      }),

      // All notices
      prisma.notice.count(),

      // Published notices
      prisma.notice.count({
        where: {
          isPublished: true,
        },
      }),
    ]);

    const totalFeeAmount = Number(
      feeTotals?._sum?.totalAmount || 0
    );

    const totalPaidAmount = Number(
      feeTotals?._sum?.paidAmount || 0
    );

    const pendingFeeAmount = Math.max(
      totalFeeAmount - totalPaidAmount,
      0
    );

    return res.status(200).json({
      success: true,

      data: {
        students: totalStudents,
        faculty: totalFaculty,
        courses: totalCourses,
        departments: totalDepartments,
        programs: totalPrograms,
        enrollments: totalEnrollments,

        assignments: totalAssignments,

        exams: totalExams,
        activeExams: upcomingExams,

        fees: {
          totalAmount: totalFeeAmount,
          paidAmount: totalPaidAmount,
          pendingAmount: pendingFeeAmount,
          pendingCount: pendingFees,
          partialCount: partialFees,
        },

        notices: {
          total: totalNotices,
          published: publishedNotices,
        },
      },
    });
  } catch (error) {
    console.error(
      "Admin dashboard stats error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch admin dashboard statistics.",
      error: error?.message,
    });
  }
};

// =====================================================
// NOTICE HELPERS
// =====================================================

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();

  return trimmed === "" ? null : trimmed;
};

const normalizeOptionalInt = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) ? parsed : null;
};

const getTargetData = (body) => ({
  targetSemester: normalizeOptionalInt(
    body.targetSemester
  ),

  targetCourseId: normalizeOptionalInt(
    body.targetCourseId
  ),

  targetBatch: normalizeOptionalString(
    body.targetBatch
  ),

  targetDivision: normalizeOptionalString(
    body.targetDivision
  ),
});

const validateTargetData = async (targetData) => {
  if (
    targetData.targetSemester !== null &&
    (targetData.targetSemester < 1 ||
      targetData.targetSemester > 8)
  ) {
    return "Target semester must be between 1 and 8.";
  }

  if (targetData.targetCourseId !== null) {
    const course = await prisma.course.findUnique({
      where: {
        id: targetData.targetCourseId,
      },
      select: {
        id: true,
        semester: true,
      },
    });

    if (!course) {
      return "Selected course does not exist.";
    }

    if (
      targetData.targetSemester !== null &&
      Number(course.semester) !==
        Number(targetData.targetSemester)
    ) {
      return "Selected course does not belong to the selected semester.";
    }
  }

  return null;
};

const noticeInclude = {
  targetCourse: {
    select: {
      id: true,
      code: true,
      name: true,
      semester: true,
    },
  },
};

const formatNotice = (notice) => ({
  id: notice.id,
  title: notice.title,
  message: notice.message,
  category: notice.category,
  priority: notice.priority,
  isPublished: notice.isPublished,
  publishedAt: notice.publishedAt,
  expiresAt: notice.expiresAt,
  createdAt: notice.createdAt,
  updatedAt: notice.updatedAt,

  targetSemester: notice.targetSemester,
  targetCourseId: notice.targetCourseId,
  targetBatch: notice.targetBatch,
  targetDivision: notice.targetDivision,

  createdByFacultyId: notice.createdByFacultyId,

  targetCourse: notice.targetCourse || null,
});

// =====================================================
// GET ALL ADMIN NOTICES
// =====================================================

export const getAllAdminNotices = async (req, res) => {
  try {
    const notices = await prisma.notice.findMany({
      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      include: noticeInclude,
    });

    return res.json({
      success: true,
      notices: notices.map(formatNotice),
    });
  } catch (error) {
    console.error(
      "Get admin notices error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notices.",
    });
  }
};

// =====================================================
// GET SINGLE NOTICE
// =====================================================

export const getAdminNoticeById = async (req, res) => {
  try {
    const noticeId = Number(req.params.id);

    if (!Number.isInteger(noticeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID.",
      });
    }

    const notice = await prisma.notice.findUnique({
      where: {
        id: noticeId,
      },
      include: noticeInclude,
    });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found.",
      });
    }

    return res.json({
      success: true,
      notice: formatNotice(notice),
    });
  } catch (error) {
    console.error(
      "Get admin notice error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notice.",
    });
  }
};

// =====================================================
// CREATE NOTICE
// =====================================================

export const createAdminNotice = async (req, res) => {
  try {
    console.log(
      "Incoming create notice body:",
      req.body
    );

    const {
      title,
      message,
      category,
      priority,
      isPublished,
      publishedAt,
      expiresAt,
    } = req.body;

    if (
      !title ||
      !String(title).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Notice title is required.",
      });
    }

    if (
      !message ||
      !String(message).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Notice message is required.",
      });
    }

    const targetData = getTargetData(req.body);

    const targetError =
      await validateTargetData(targetData);

    if (targetError) {
      return res.status(400).json({
        success: false,
        message: targetError,
      });
    }

    let createdByFacultyId = null;

    if (
      req.user?.role === "FACULTY" ||
      req.user?.role === "TEACHER"
    ) {
      const faculty = await prisma.faculty.findUnique({
        where: {
          userId: req.user.userId,
        },
        select: {
          id: true,
        },
      });

      if (faculty) {
        createdByFacultyId = faculty.id;
      }
    }

    const parsedPublishedAt = publishedAt
      ? new Date(publishedAt)
      : new Date();

    const parsedExpiresAt = expiresAt
      ? new Date(expiresAt)
      : null;

    if (Number.isNaN(parsedPublishedAt.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid published date.",
      });
    }

    if (
      parsedExpiresAt &&
      Number.isNaN(parsedExpiresAt.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid expiry date.",
      });
    }

    const data = {
      title: String(title).trim(),
      message: String(message).trim(),

      category: category || "GENERAL",
      priority: priority || "NORMAL",

      isPublished:
        typeof isPublished === "boolean"
          ? isPublished
          : true,

      publishedAt: parsedPublishedAt,
      expiresAt: parsedExpiresAt,

      targetSemester:
        targetData.targetSemester,

      targetCourseId:
        targetData.targetCourseId,

      targetBatch:
        targetData.targetBatch,

      targetDivision:
        targetData.targetDivision,

      createdByFacultyId,
    };

    console.log(
      "Creating notice with data:",
      data
    );

    const notice = await prisma.notice.create({
      data,
      include: noticeInclude,
    });

    console.log(
      "Notice created successfully:",
      {
        id: notice.id,
        targetSemester:
          notice.targetSemester,
        targetCourseId:
          notice.targetCourseId,
        targetBatch:
          notice.targetBatch,
        targetDivision:
          notice.targetDivision,
      }
    );

    return res.status(201).json({
      success: true,
      message: "Notice created successfully.",
      notice: formatNotice(notice),
    });
  } catch (error) {
    console.error(
      "Create admin notice error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to create notice.",
    });
  }
};

// =====================================================
// UPDATE NOTICE
// =====================================================

export const updateAdminNotice = async (req, res) => {
  try {
    const noticeId = Number(req.params.id);

    if (!Number.isInteger(noticeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID.",
      });
    }

    const existingNotice =
      await prisma.notice.findUnique({
        where: {
          id: noticeId,
        },
      });

    if (!existingNotice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found.",
      });
    }

    const {
      title,
      message,
      category,
      priority,
      isPublished,
      publishedAt,
      expiresAt,
    } = req.body;

    if (
      title !== undefined &&
      !String(title).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Notice title cannot be empty.",
      });
    }

    if (
      message !== undefined &&
      !String(message).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Notice message cannot be empty.",
      });
    }

    const targetData =
      getTargetData(req.body);

    const targetError =
      await validateTargetData(targetData);

    if (targetError) {
      return res.status(400).json({
        success: false,
        message: targetError,
      });
    }

    const data = {
      ...(title !== undefined && {
        title: String(title).trim(),
      }),

      ...(message !== undefined && {
        message: String(message).trim(),
      }),

      ...(category !== undefined && {
        category,
      }),

      ...(priority !== undefined && {
        priority,
      }),

      ...(isPublished !== undefined && {
        isPublished:
          typeof isPublished === "boolean"
            ? isPublished
            : String(isPublished).toLowerCase() ===
              "true",
      }),

      ...(publishedAt !== undefined && {
        publishedAt: publishedAt
          ? new Date(publishedAt)
          : existingNotice.publishedAt,
      }),

      ...(expiresAt !== undefined && {
        expiresAt: expiresAt
          ? new Date(expiresAt)
          : null,
      }),

      targetSemester:
        targetData.targetSemester,

      targetCourseId:
        targetData.targetCourseId,

      targetBatch:
        targetData.targetBatch,

      targetDivision:
        targetData.targetDivision,
    };

    if (
      data.publishedAt &&
      Number.isNaN(data.publishedAt.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid published date.",
      });
    }

    if (
      data.expiresAt &&
      Number.isNaN(data.expiresAt.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid expiry date.",
      });
    }

    const notice = await prisma.notice.update({
      where: {
        id: noticeId,
      },

      data,

      include: noticeInclude,
    });

    return res.json({
      success: true,
      message:
        "Notice updated successfully.",
      notice: formatNotice(notice),
    });
  } catch (error) {
    console.error(
      "Update admin notice error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to update notice.",
    });
  }
};

// =====================================================
// UPDATE PUBLISH STATUS
// =====================================================

export const updateAdminNoticeStatus = async (
  req,
  res
) => {
  try {
    const noticeId = Number(req.params.id);

    if (!Number.isInteger(noticeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID.",
      });
    }

    const { isPublished } = req.body;

    if (isPublished === undefined) {
      return res.status(400).json({
        success: false,
        message: "isPublished is required.",
      });
    }

    const normalizedStatus =
      typeof isPublished === "boolean"
        ? isPublished
        : String(isPublished).toLowerCase() ===
          "true";

    const notice = await prisma.notice.update({
      where: {
        id: noticeId,
      },

      data: {
        isPublished: normalizedStatus,
      },

      include: noticeInclude,
    });

    return res.json({
      success: true,
      message:
        "Notice status updated successfully.",
      notice: formatNotice(notice),
    });
  } catch (error) {
    console.error(
      "Update notice status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to update notice status.",
    });
  }
};

// =====================================================
// DELETE NOTICE
// =====================================================

export const deleteAdminNotice = async (
  req,
  res
) => {
  try {
    const noticeId = Number(req.params.id);

    if (!Number.isInteger(noticeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID.",
      });
    }

    const existingNotice =
      await prisma.notice.findUnique({
        where: {
          id: noticeId,
        },
      });

    if (!existingNotice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found.",
      });
    }

    await prisma.notice.delete({
      where: {
        id: noticeId,
      },
    });

    return res.json({
      success: true,
      message:
        "Notice deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete notice error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to delete notice.",
    });
  }
};