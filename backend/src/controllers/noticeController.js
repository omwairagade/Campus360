import prisma from "../lib/prisma.js";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();

  return text === "" ? null : text;
}

function parseOptionalInt(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

function isNoticeVisibleToStudent(notice, student) {
  // Global notice
  const isGlobal =
    notice.targetSemester === null &&
    notice.targetCourseId === null &&
    notice.targetBatch === null &&
    notice.targetDivision === null;

  if (isGlobal) {
    return true;
  }

  // Every specified target condition must match.
  if (
    notice.targetSemester !== null &&
    notice.targetSemester !== student.semester
  ) {
    return false;
  }

  if (
    notice.targetBatch !== null &&
    notice.targetBatch !== student.batch
  ) {
    return false;
  }

  if (
    notice.targetDivision !== null &&
    notice.targetDivision !== student.division
  ) {
    return false;
  }

  if (notice.targetCourseId !== null) {
    const enrolledInCourse = student.enrollments.some(
      (enrollment) =>
        enrollment.courseId === notice.targetCourseId
    );

    if (!enrolledInCourse) {
      return false;
    }
  }

  return true;
}

function validateTargetCombination({
  targetSemester,
  targetCourseId,
  targetBatch,
  targetDivision,
}) {
  const hasAnyTarget =
    targetSemester !== null ||
    targetCourseId !== null ||
    targetBatch !== null ||
    targetDivision !== null;

  if (!hasAnyTarget) {
    return {
      valid: true,
      message: "",
    };
  }

  if (
    targetSemester !== null &&
    (targetSemester < 1 || targetSemester > 8)
  ) {
    return {
      valid: false,
      message: "Target semester must be between 1 and 8.",
    };
  }

  if (
    targetBatch !== null &&
    !/^[1-5]$/.test(String(targetBatch))
  ) {
    return {
      valid: false,
      message: "Target batch must be between 1 and 5.",
    };
  }

  if (
    targetDivision !== null &&
    !/^[A-E]$/i.test(String(targetDivision))
  ) {
    return {
      valid: false,
      message: "Target division must be between A and E.",
    };
  }

  return {
    valid: true,
    message: "",
  };
}

/*
|--------------------------------------------------------------------------
| GET PUBLISHED NOTICES FOR STUDENT
|--------------------------------------------------------------------------
*/

export const getPublishedNotices = async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const student = await prisma.student.findUnique({
      where: {
        userId: Number(req.user.userId),
      },
      select: {
        id: true,
        semester: true,
        batch: true,
        division: true,

        enrollments: {
          select: {
            courseId: true,
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

    const now = new Date();

    /*
     * Fetch published and currently active notices first.
     * Target filtering is intentionally done in JavaScript so
     * global and targeted notices remain easy to reason about.
     */
    const notices = await prisma.notice.findMany({
      where: {
        isPublished: true,
        publishedAt: {
          lte: now,
        },
        OR: [
          {
            expiresAt: null,
          },
          {
            expiresAt: {
              gte: now,
            },
          },
        ],
      },
      orderBy: [
        {
          priority: "desc",
        },
        {
          publishedAt: "desc",
        },
      ],
    });

    const visibleNotices = notices.filter((notice) =>
      isNoticeVisibleToStudent(notice, student)
    );

    return res.status(200).json({
      success: true,
      notices: visibleNotices,
    });
  } catch (error) {
    console.error("Get published notices error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notices.",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL NOTICES
|--------------------------------------------------------------------------
| ADMIN + FACULTY
|--------------------------------------------------------------------------
*/

export const getAllNotices = async (req, res) => {
  try {
    const notices = await prisma.notice.findMany({
      include: {
        targetCourse: {
          select: {
            id: true,
            code: true,
            name: true,
            semester: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            employeeId: true,
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
      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return res.status(200).json({
      success: true,
      count: notices.length,
      notices,
    });
  } catch (error) {
    console.error("Get all notices error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notices.",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE NOTICE
|--------------------------------------------------------------------------
| ADMIN + FACULTY
|--------------------------------------------------------------------------
*/

export const createNotice = async (req, res) => {
  try {
    const {
      title,
      message,
      category = "GENERAL",
      priority = "NORMAL",
      isPublished = true,
      publishedAt,
      expiresAt,
      targetSemester,
      targetCourseId,
      targetBatch,
      targetDivision,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: "Notice title is required.",
      });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: "Notice message is required.",
      });
    }

    const parsedSemester = parseOptionalInt(targetSemester);
    const parsedCourseId = parseOptionalInt(targetCourseId);
    const parsedBatch = normalizeOptionalString(targetBatch);
    const parsedDivision = normalizeOptionalString(
      targetDivision
    );

    const targetValidation = validateTargetCombination({
      targetSemester: parsedSemester,
      targetCourseId: parsedCourseId,
      targetBatch: parsedBatch,
      targetDivision: parsedDivision,
    });

    if (!targetValidation.valid) {
      return res.status(400).json({
        success: false,
        message: targetValidation.message,
      });
    }

    // Validate target course when supplied.
    if (parsedCourseId !== null) {
      const course = await prisma.course.findUnique({
        where: {
          id: parsedCourseId,
        },
        select: {
          id: true,
          semester: true,
        },
      });

      if (!course) {
        return res.status(400).json({
          success: false,
          message: "Target course not found.",
        });
      }

      if (
        parsedSemester !== null &&
        course.semester !== parsedSemester
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Target course does not belong to the selected semester.",
        });
      }
    }

    // Resolve faculty creator for faculty-created notices.
    let createdByFacultyId = null;

    if (
      req.user?.role === "FACULTY" ||
      req.user?.role === "TEACHER"
    ) {
      const faculty = await prisma.faculty.findUnique({
        where: {
          userId: Number(req.user.userId),
        },
        select: {
          id: true,
        },
      });

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: "Faculty profile not found.",
        });
      }

      createdByFacultyId = faculty.id;
    }

    const notice = await prisma.notice.create({
      data: {
        title: String(title).trim(),
        message: String(message).trim(),
        category: String(category || "GENERAL").toUpperCase(),
        priority: String(priority || "NORMAL").toUpperCase(),
        isPublished: Boolean(isPublished),
        publishedAt: publishedAt
          ? new Date(publishedAt)
          : new Date(),
        expiresAt: expiresAt
          ? new Date(expiresAt)
          : null,

        targetSemester: parsedSemester,
        targetCourseId: parsedCourseId,
        targetBatch: parsedBatch,
        targetDivision: parsedDivision,
        createdByFacultyId,
      },

      include: {
        targetCourse: {
          select: {
            id: true,
            code: true,
            name: true,
            semester: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            employeeId: true,
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
      message: "Notice created successfully.",
      notice,
    });
  } catch (error) {
    console.error("Create notice error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create notice.",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE NOTICE
|--------------------------------------------------------------------------
| ADMIN + FACULTY
|--------------------------------------------------------------------------
*/

export const updateNotice = async (req, res) => {
  try {
    const noticeId = Number(req.params.id);

    if (!Number.isInteger(noticeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID.",
      });
    }

    const existingNotice = await prisma.notice.findUnique({
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

    // Faculty can edit only notices they created.
    if (
      req.user?.role === "FACULTY" ||
      req.user?.role === "TEACHER"
    ) {
      const faculty = await prisma.faculty.findUnique({
        where: {
          userId: Number(req.user.userId),
        },
        select: {
          id: true,
        },
      });

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: "Faculty profile not found.",
        });
      }

      if (existingNotice.createdByFacultyId !== faculty.id) {
        return res.status(403).json({
          success: false,
          message:
            "You can update only notices created by you.",
        });
      }
    }

    const {
      title,
      message,
      category,
      priority,
      isPublished,
      publishedAt,
      expiresAt,
      targetSemester,
      targetCourseId,
      targetBatch,
      targetDivision,
    } = req.body;

    const updateData = {};

    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({
          success: false,
          message: "Notice title cannot be empty.",
        });
      }

      updateData.title = String(title).trim();
    }

    if (message !== undefined) {
      if (!String(message).trim()) {
        return res.status(400).json({
          success: false,
          message: "Notice message cannot be empty.",
        });
      }

      updateData.message = String(message).trim();
    }

    if (category !== undefined) {
      updateData.category = String(category).toUpperCase();
    }

    if (priority !== undefined) {
      updateData.priority = String(priority).toUpperCase();
    }

    if (isPublished !== undefined) {
      updateData.isPublished = Boolean(isPublished);
    }

    if (publishedAt !== undefined) {
      updateData.publishedAt = publishedAt
        ? new Date(publishedAt)
        : new Date();
    }

    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt
        ? new Date(expiresAt)
        : null;
    }

    const hasTargetField =
      targetSemester !== undefined ||
      targetCourseId !== undefined ||
      targetBatch !== undefined ||
      targetDivision !== undefined;

    if (hasTargetField) {
      const parsedSemester =
        targetSemester === undefined
          ? existingNotice.targetSemester
          : parseOptionalInt(targetSemester);

      const parsedCourseId =
        targetCourseId === undefined
          ? existingNotice.targetCourseId
          : parseOptionalInt(targetCourseId);

      const parsedBatch =
        targetBatch === undefined
          ? existingNotice.targetBatch
          : normalizeOptionalString(targetBatch);

      const parsedDivision =
        targetDivision === undefined
          ? existingNotice.targetDivision
          : normalizeOptionalString(targetDivision);

      const targetValidation = validateTargetCombination({
        targetSemester: parsedSemester,
        targetCourseId: parsedCourseId,
        targetBatch: parsedBatch,
        targetDivision: parsedDivision,
      });

      if (!targetValidation.valid) {
        return res.status(400).json({
          success: false,
          message: targetValidation.message,
        });
      }

      if (parsedCourseId !== null) {
        const course = await prisma.course.findUnique({
          where: {
            id: parsedCourseId,
          },
          select: {
            id: true,
            semester: true,
          },
        });

        if (!course) {
          return res.status(400).json({
            success: false,
            message: "Target course not found.",
          });
        }

        if (
          parsedSemester !== null &&
          course.semester !== parsedSemester
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Target course does not belong to the selected semester.",
          });
        }
      }

      updateData.targetSemester = parsedSemester;
      updateData.targetCourseId = parsedCourseId;
      updateData.targetBatch = parsedBatch;
      updateData.targetDivision = parsedDivision;
    }

    const notice = await prisma.notice.update({
      where: {
        id: noticeId,
      },

      data: updateData,

      include: {
        targetCourse: {
          select: {
            id: true,
            code: true,
            name: true,
            semester: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            employeeId: true,
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
      message: "Notice updated successfully.",
      notice,
    });
  } catch (error) {
    console.error("Update notice error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notice.",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE NOTICE
|--------------------------------------------------------------------------
| ADMIN ONLY
|--------------------------------------------------------------------------
*/

export const deleteNotice = async (req, res) => {
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
    });

    if (!notice) {
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

    return res.status(200).json({
      success: true,
      message: "Notice deleted successfully.",
    });
  } catch (error) {
    console.error("Delete notice error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete notice.",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message,
    });
  }
};