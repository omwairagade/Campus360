import prisma from "../lib/prisma.js";

const VALID_CATEGORIES = [
  "GENERAL",
  "ACADEMIC",
  "EXAMINATION",
  "FEES",
  "HOLIDAY",
  "EVENT",
  "URGENT",
];

const VALID_PRIORITIES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
];

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;

  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;

  return undefined;
};

const parseDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const cleanString = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const parseOptionalInt = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isInteger(number) ? number : null;
};

/* =========================================================
   NOTICE INCLUDE
========================================================= */

const noticeInclude = {
  targetCourse: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },

  createdBy: {
    select: {
      id: true,
      employeeId: true,

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

/* =========================================================
   VALIDATE TARGET
========================================================= */

const validateTarget = async (
  targetSemester,
  targetCourseId
) => {
  if (
    targetSemester !== null &&
    targetSemester !== undefined &&
    (targetSemester < 1 ||
      targetSemester > 8)
  ) {
    return "Target semester must be between 1 and 8";
  }

  if (
    targetCourseId !== null &&
    targetCourseId !== undefined
  ) {
    const course =
      await prisma.course.findUnique({
        where: {
          id: targetCourseId,
        },
        select: {
          id: true,
        },
      });

    if (!course) {
      return "Target course not found";
    }
  }

  return null;
};

/* =========================================================
   GET ALL ADMIN NOTICES
========================================================= */

export const getAllAdminNotices = async (
  req,
  res
) => {
  try {
    const {
      search,
      category,
      priority,
      isPublished,
    } = req.query;

    const where = {};

    if (
      search &&
      cleanString(search)
    ) {
      const searchText =
        cleanString(search);

      where.OR = [
        {
          title: {
            contains: searchText,
            mode: "insensitive",
          },
        },
        {
          message: {
            contains: searchText,
            mode: "insensitive",
          },
        },
      ];
    }

    if (category) {
      const value =
        cleanString(category).toUpperCase();

      if (
        !VALID_CATEGORIES.includes(value)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        });
      }

      where.category = value;
    }

    if (priority) {
      const value =
        cleanString(priority).toUpperCase();

      if (
        !VALID_PRIORITIES.includes(value)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid priority",
        });
      }

      where.priority = value;
    }

    if (isPublished !== undefined) {
      const value =
        parseBoolean(isPublished);

      if (value === undefined) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid isPublished value",
        });
      }

      where.isPublished = value;
    }

    const notices =
      await prisma.notice.findMany({
        where,

        include: noticeInclude,

        orderBy: {
          createdAt: "desc",
        },
      });

    return res.status(200).json({
      success: true,
      notices,
      data: notices,
    });
  } catch (error) {
    console.error(
      "Get admin notices error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch notices",
      error: error.message,
    });
  }
};

/* =========================================================
   GET ADMIN NOTICE BY ID
========================================================= */

export const getAdminNoticeById = async (
  req,
  res
) => {
  try {
    const id = parseId(
      req.params.id
    );

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID",
      });
    }

    const notice =
      await prisma.notice.findUnique({
        where: {
          id,
        },

        include: noticeInclude,
      });

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    return res.status(200).json({
      success: true,
      notice,
      data: notice,
    });
  } catch (error) {
    console.error(
      "Get admin notice error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch notice",
      error: error.message,
    });
  }
};

/* =========================================================
   CREATE ADMIN NOTICE
========================================================= */

export const createAdminNotice = async (
  req,
  res
) => {
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

    const cleanTitle =
      cleanString(title);

    const cleanMessage =
      cleanString(message);

    const cleanCategory =
      cleanString(category).toUpperCase();

    const cleanPriority =
      cleanString(priority).toUpperCase();

    if (!cleanTitle) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!cleanMessage) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    if (
      !VALID_CATEGORIES.includes(
        cleanCategory
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid category",
      });
    }

    if (
      !VALID_PRIORITIES.includes(
        cleanPriority
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid priority",
      });
    }

    const published =
      parseBoolean(isPublished);

    if (published === undefined) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid isPublished value",
      });
    }

    const finalPublishedAt =
      publishedAt
        ? parseDate(publishedAt)
        : new Date();

    if (!finalPublishedAt) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid publishedAt date",
      });
    }

    const finalExpiresAt =
      expiresAt
        ? parseDate(expiresAt)
        : null;

    if (
      expiresAt &&
      !finalExpiresAt
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid expiresAt date",
      });
    }

    if (
      finalExpiresAt &&
      finalExpiresAt <
        finalPublishedAt
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Expiry date cannot be before published date",
      });
    }

    const semester =
      parseOptionalInt(
        targetSemester
      );

    const courseId =
      parseOptionalInt(
        targetCourseId
      );

    const targetError =
      await validateTarget(
        semester,
        courseId
      );

    if (targetError) {
      return res.status(400).json({
        success: false,
        message: targetError,
      });
    }

    const notice =
      await prisma.notice.create({
        data: {
          title: cleanTitle,
          message: cleanMessage,
          category: cleanCategory,
          priority: cleanPriority,
          isPublished: published,
          publishedAt:
            finalPublishedAt,
          expiresAt:
            finalExpiresAt,
          targetSemester:
            semester,
          targetCourseId:
            courseId,
          targetBatch:
            cleanString(
              targetBatch
            ) || null,
          targetDivision:
            cleanString(
              targetDivision
            ) || null,
        },

        include: noticeInclude,
      });

    return res.status(201).json({
      success: true,
      message:
        "Notice created successfully",
      notice,
      data: notice,
    });
  } catch (error) {
    console.error(
      "Create admin notice error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create notice",
      error: error.message,
    });
  }
};

/* =========================================================
   UPDATE ADMIN NOTICE
========================================================= */

export const updateAdminNotice = async (
  req,
  res
) => {
  try {
    const id = parseId(
      req.params.id
    );

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid notice ID",
      });
    }

    const existingNotice =
      await prisma.notice.findUnique({
        where: {
          id,
        },
      });

    if (!existingNotice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
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
      targetSemester,
      targetCourseId,
      targetBatch,
      targetDivision,
    } = req.body;

    const data = {};

    if (title !== undefined) {
      const value =
        cleanString(title);

      if (!value) {
        return res.status(400).json({
          success: false,
          message:
            "Title cannot be empty",
        });
      }

      data.title = value;
    }

    if (message !== undefined) {
      const value =
        cleanString(message);

      if (!value) {
        return res.status(400).json({
          success: false,
          message:
            "Message cannot be empty",
        });
      }

      data.message = value;
    }

    if (category !== undefined) {
      const value =
        cleanString(category).toUpperCase();

      if (
        !VALID_CATEGORIES.includes(
          value
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        });
      }

      data.category = value;
    }

    if (priority !== undefined) {
      const value =
        cleanString(priority).toUpperCase();

      if (
        !VALID_PRIORITIES.includes(
          value
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid priority",
        });
      }

      data.priority = value;
    }

    if (isPublished !== undefined) {
      const value =
        parseBoolean(isPublished);

      if (value === undefined) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid isPublished value",
        });
      }

      data.isPublished = value;
    }

    if (publishedAt !== undefined) {
      const value =
        parseDate(publishedAt);

      if (!value) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid publishedAt date",
        });
      }

      data.publishedAt = value;
    }

    if (expiresAt !== undefined) {
      if (
        expiresAt === null ||
        expiresAt === ""
      ) {
        data.expiresAt = null;
      } else {
        const value =
          parseDate(expiresAt);

        if (!value) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid expiresAt date",
          });
        }

        data.expiresAt = value;
      }
    }

    if (
      targetSemester !== undefined
    ) {
      data.targetSemester =
        parseOptionalInt(
          targetSemester
        );
    }

    if (
      targetCourseId !== undefined
    ) {
      data.targetCourseId =
        parseOptionalInt(
          targetCourseId
        );
    }

    if (
      targetBatch !== undefined
    ) {
      data.targetBatch =
        cleanString(
          targetBatch
        ) || null;
    }

    if (
      targetDivision !== undefined
    ) {
      data.targetDivision =
        cleanString(
          targetDivision
        ) || null;
    }

    const finalPublishedAt =
      data.publishedAt ??
      existingNotice.publishedAt;

    const finalExpiresAt =
      data.expiresAt !== undefined
        ? data.expiresAt
        : existingNotice.expiresAt;

    if (
      finalExpiresAt &&
      finalExpiresAt <
        finalPublishedAt
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Expiry date cannot be before published date",
      });
    }

    const finalSemester =
      data.targetSemester !==
      undefined
        ? data.targetSemester
        : existingNotice.targetSemester;

    const finalCourseId =
      data.targetCourseId !==
      undefined
        ? data.targetCourseId
        : existingNotice.targetCourseId;

    const targetError =
      await validateTarget(
        finalSemester,
        finalCourseId
      );

    if (targetError) {
      return res.status(400).json({
        success: false,
        message: targetError,
      });
    }

    const notice =
      await prisma.notice.update({
        where: {
          id,
        },

        data,

        include: noticeInclude,
      });

    return res.status(200).json({
      success: true,
      message:
        "Notice updated successfully",
      notice,
      data: notice,
    });
  } catch (error) {
    console.error(
      "Update admin notice error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update notice",
      error: error.message,
    });
  }
};

/* =========================================================
   UPDATE ADMIN NOTICE STATUS
========================================================= */

export const updateAdminNoticeStatus =
  async (req, res) => {
    try {
      const id = parseId(
        req.params.id
      );

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid notice ID",
        });
      }

      const published =
        parseBoolean(
          req.body?.isPublished
        );

      if (published === undefined) {
        return res.status(400).json({
          success: false,
          message:
            "isPublished must be true or false",
        });
      }

      const existingNotice =
        await prisma.notice.findUnique({
          where: {
            id,
          },

          select: {
            id: true,
          },
        });

      if (!existingNotice) {
        return res.status(404).json({
          success: false,
          message:
            "Notice not found",
        });
      }

      const notice =
        await prisma.notice.update({
          where: {
            id,
          },

          data: {
            isPublished: published,

            ...(published
              ? {
                  publishedAt:
                    new Date(),
                }
              : {}),
          },

          include: noticeInclude,
        });

      return res.status(200).json({
        success: true,

        message: published
          ? "Notice published successfully"
          : "Notice unpublished successfully",

        notice,
        data: notice,
      });
    } catch (error) {
      console.error(
        "Update admin notice status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update notice status",
        error: error.message,
      });
    }
  };

/* =========================================================
   DELETE ADMIN NOTICE
========================================================= */

export const deleteAdminNotice = async (
  req,
  res
) => {
  try {
    const id = parseId(
      req.params.id
    );

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid notice ID",
      });
    }

    const existingNotice =
      await prisma.notice.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
        },
      });

    if (!existingNotice) {
      return res.status(404).json({
        success: false,
        message:
          "Notice not found",
      });
    }

    await prisma.notice.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Notice deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete admin notice error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete notice",
      error: error.message,
    });
  }
};