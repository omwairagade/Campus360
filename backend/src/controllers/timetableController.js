import prisma from "../lib/prisma.js";

// ============================================================
// BATCH VALIDATION
// ============================================================

const normalizeBatch = (batch) => {
  if (
    batch === undefined ||
    batch === null ||
    String(batch).trim() === ""
  ) {
    return null;
  }

  const normalizedBatch = String(batch).trim();

  if (!["1", "2", "3"].includes(normalizedBatch)) {
    return "__INVALID_BATCH__";
  }

  return normalizedBatch;
};

// ============================================================
// TIME HELPERS
// ============================================================

const timeToMinutes = (time) => {
  if (
    typeof time !== "string" ||
    !/^\d{2}:\d{2}$/.test(time)
  ) {
    return null;
  }

  const [hours, minutes] = time
    .split(":")
    .map(Number);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
};

// ============================================================
// VALIDATE TIME RANGE
// ============================================================

const validateTimeRange = (
  startTime,
  endTime
) => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start === null || end === null) {
    return {
      valid: false,
      message:
        "Start time and end time must be in HH:MM format",
    };
  }

  if (start >= end) {
    return {
      valid: false,
      message:
        "End time must be later than start time",
    };
  }

  return {
    valid: true,
    start,
    end,
  };
};

// ============================================================
// CHECK TIMETABLE CONFLICT
// ============================================================

const findTimetableConflict = async ({
  dayOfWeek,
  startTime,
  endTime,
  facultyId,
  room,
  batch,
  excludeId = null,
}) => {
  const entries =
    await prisma.timetableEntry.findMany({
      where: {
        dayOfWeek: Number(dayOfWeek),

        ...(excludeId
          ? {
              id: {
                not: Number(excludeId),
              },
            }
          : {}),
      },

      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
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
      },
    });

  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  if (
    newStart === null ||
    newEnd === null
  ) {
    return null;
  }

  for (const entry of entries) {
    const existingStart =
      timeToMinutes(entry.startTime);

    const existingEnd =
      timeToMinutes(entry.endTime);

    if (
      existingStart === null ||
      existingEnd === null
    ) {
      continue;
    }

    const overlaps =
      newStart < existingEnd &&
      newEnd > existingStart;

    if (!overlaps) {
      continue;
    }

    // --------------------------------------------------------
    // FACULTY CONFLICT
    // --------------------------------------------------------

    if (
      Number(entry.facultyId) ===
      Number(facultyId)
    ) {
      return {
        type: "faculty",
        entry,
        message:
          `Faculty already has "${entry.course.code}" ` +
          `scheduled from ${entry.startTime} to ${entry.endTime}`,
      };
    }

    // --------------------------------------------------------
    // ROOM CONFLICT
    // --------------------------------------------------------

    if (
      room &&
      entry.room &&
      String(entry.room).trim().toLowerCase() ===
        String(room).trim().toLowerCase()
    ) {
      return {
        type: "room",
        entry,
        message:
          `Room ${entry.room} is already occupied ` +
          `from ${entry.startTime} to ${entry.endTime}`,
      };
    }

    // --------------------------------------------------------
    // BATCH CONFLICT
    //
    // Common entry conflicts with every batch.
    // Same batch conflicts with same batch.
    // Different batches can run simultaneously.
    // --------------------------------------------------------

    const existingBatch =
      entry.batch === null ||
      entry.batch === undefined ||
      String(entry.batch).trim() === ""
        ? null
        : String(entry.batch);

    const newBatch =
      batch === null ||
      batch === undefined ||
      String(batch).trim() === ""
        ? null
        : String(batch);

    const batchConflict =
      existingBatch === null ||
      newBatch === null ||
      existingBatch === newBatch;

    if (batchConflict) {
      return {
        type: "batch",
        entry,
        message:
          `A timetable entry for the same batch/common group ` +
          `already exists from ${entry.startTime} to ${entry.endTime}`,
      };
    }
  }

  return null;
};

// ============================================================
// CREATE TIMETABLE ENTRY
// ============================================================

export const createTimetableEntry = async (
  req,
  res
) => {
  try {
    const userId = req.user?.userId;

    const {
      courseId,
      facultyId,
      dayOfWeek,
      startTime,
      endTime,
      room,
      classType,
      batch,
    } = req.body;

    if (
      !courseId ||
      !dayOfWeek ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Course, day, start time and end time are required",
      });
    }

    if (
      Number(dayOfWeek) < 1 ||
      Number(dayOfWeek) > 7
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Day of week must be between 1 and 7",
      });
    }

    // ========================================================
    // VALIDATE TIME
    // ========================================================

    const timeValidation =
      validateTimeRange(
        startTime,
        endTime
      );

    if (!timeValidation.valid) {
      return res.status(400).json({
        success: false,
        message:
          timeValidation.message,
      });
    }

    // ========================================================
    // VALIDATE BATCH
    // ========================================================

    const normalizedBatch =
      normalizeBatch(batch);

    if (
      normalizedBatch ===
      "__INVALID_BATCH__"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Batch must be 1, 2, 3, or empty for common/all-batch entries",
      });
    }

    // ========================================================
    // VERIFY COURSE
    // ========================================================

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

    // ========================================================
    // VERIFY LOGGED-IN FACULTY
    // ========================================================

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
          "Only faculty can create timetable entries",
      });
    }

    const selectedFacultyId =
      facultyId !== undefined &&
      facultyId !== null
        ? Number(facultyId)
        : faculty.id;

    const selectedFaculty =
      await prisma.faculty.findUnique({
        where: {
          id: selectedFacultyId,
        },
      });

    if (!selectedFaculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
      });
    }

    // ========================================================
    // VERIFY COURSE-FACULTY ASSIGNMENT
    // ========================================================

    if (
      course.facultyId !==
      selectedFaculty.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Faculty is not assigned to this course",
      });
    }

    if (
      selectedFaculty.departmentId !==
      course.departmentId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Faculty and course belong to different departments",
      });
    }

    // ========================================================
    // CHECK CONFLICT
    // ========================================================

    const conflict =
      await findTimetableConflict({
        dayOfWeek,
        startTime,
        endTime,
        facultyId:
          selectedFaculty.id,
        room,
        batch: normalizedBatch,
      });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message:
          conflict.message,
        conflictType:
          conflict.type,
        conflictingEntry:
          conflict.entry,
      });
    }

    // ========================================================
    // CREATE ENTRY
    // ========================================================

    const timetableEntry =
      await prisma.timetableEntry.create({
        data: {
          courseId: course.id,
          facultyId:
            selectedFaculty.id,
          dayOfWeek:
            Number(dayOfWeek),
          startTime,
          endTime,
          room: room || null,
          classType:
            classType || "Lecture",
          batch: normalizedBatch,
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
        "Timetable entry created successfully",
      timetableEntry,
    });
  } catch (error) {
    console.error(
      "Create timetable entry error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create timetable entry",
      error: error.message,
    });
  }
};

// ============================================================
// GET LOGGED-IN STUDENT TIMETABLE
// ============================================================

export const getMyTimetable = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication data",
      });
    }

    const student =
      await prisma.student.findUnique({
        where: {
          userId: Number(userId),
        },

        select: {
          id: true,
          programId: true,
          semester: true,
          batch: true,
          division: true,
          enrollmentNumber: true,
        },
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student profile not found",
      });
    }

    // ========================================================
    // BUILD TIMETABLE FILTER
    // ========================================================

    const batchFilter = [
      {
        batch: null,
      },
    ];

    if (
      student.batch !== null &&
      student.batch !== undefined &&
      String(student.batch).trim() !== ""
    ) {
      batchFilter.push({
        batch: String(student.batch),
      });
    }

    // ========================================================
    // FETCH TIMETABLE
    // ========================================================

    const timetable =
      await prisma.timetableEntry.findMany({
        where: {
          course: {
            programId:
              student.programId,

            semester:
              student.semester,
          },

          OR: batchFilter,
        },

        include: {
          course: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
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
                  email: true,
                },
              },
            },
          },
        },

        orderBy: [
          {
            dayOfWeek: "asc",
          },
          {
            startTime: "asc",
          },
          {
            batch: "asc",
          },
        ],
      });

    return res.status(200).json({
      success: true,

      student: {
        id: student.id,
        enrollmentNumber:
          student.enrollmentNumber,
        semester:
          student.semester,
        batch:
          student.batch,
        division:
          student.division,
      },

      timetable,
    });
  } catch (error) {
    console.error(
      "Get student timetable error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch timetable",
      error: error.message,
    });
  }
};

// ============================================================
// GET LOGGED-IN FACULTY TIMETABLE
// ============================================================

export const getMyFacultyTimetable =
  async (req, res) => {
    try {
      const userId =
        req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid authentication data",
        });
      }

      const faculty =
        await prisma.faculty.findUnique({
          where: {
            userId: Number(userId),
          },

          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },

            department: true,
          },
        });

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message:
            "Faculty profile not found",
        });
      }

      const timetable =
        await prisma.timetableEntry.findMany({
          where: {
            facultyId: faculty.id,
          },

          include: {
            course: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                credits: true,
                semester: true,
                department: true,
                program: true,
              },
            },
          },

          orderBy: [
            {
              dayOfWeek: "asc",
            },
            {
              startTime: "asc",
            },
            {
              batch: "asc",
            },
          ],
        });

      return res.status(200).json({
        success: true,

        faculty: {
          id: faculty.id,
          employeeId:
            faculty.employeeId,
          designation:
            faculty.designation,

          user: faculty.user,

          department:
            faculty.department,
        },

        timetable,
      });
    } catch (error) {
      console.error(
        "Get faculty timetable error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch faculty timetable",
        error: error.message,
      });
    }
  };

// ============================================================
// GET ALL TIMETABLE ENTRIES
// ============================================================

export const getTimetable = async (
  req,
  res
) => {
  try {
    const timetable =
      await prisma.timetableEntry.findMany({
        include: {
          course: {
            include: {
              department: true,
              program: true,
            },
          },

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

        orderBy: [
          {
            dayOfWeek: "asc",
          },
          {
            startTime: "asc",
          },
          {
            batch: "asc",
          },
        ],
      });

    return res.status(200).json({
      success: true,
      timetable,
    });
  } catch (error) {
    console.error(
      "Get timetable error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch timetable",
      error: error.message,
    });
  }
};

// ============================================================
// UPDATE TIMETABLE ENTRY
// ============================================================

export const updateTimetableEntry =
  async (req, res) => {
    try {
      const userId =
        req.user?.userId;

      const timetableId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          timetableId
        ) ||
        timetableId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid timetable ID",
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
            "Only faculty can update timetable entries",
        });
      }

      const existingEntry =
        await prisma.timetableEntry.findUnique({
          where: {
            id: timetableId,
          },
        });

      if (!existingEntry) {
        return res.status(404).json({
          success: false,
          message:
            "Timetable entry not found",
        });
      }

      if (
        existingEntry.facultyId !==
        faculty.id
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only update your own timetable entries",
        });
      }

      const {
        courseId,
        facultyId,
        dayOfWeek,
        startTime,
        endTime,
        room,
        classType,
        batch,
      } = req.body;

      const finalCourseId =
        courseId !== undefined
          ? Number(courseId)
          : existingEntry.courseId;

      const finalFacultyId =
        facultyId !== undefined &&
        facultyId !== null
          ? Number(facultyId)
          : existingEntry.facultyId;

      const finalDayOfWeek =
        dayOfWeek !== undefined
          ? Number(dayOfWeek)
          : existingEntry.dayOfWeek;

      const finalStartTime =
        startTime !== undefined
          ? startTime
          : existingEntry.startTime;

      const finalEndTime =
        endTime !== undefined
          ? endTime
          : existingEntry.endTime;

      const finalRoom =
        room !== undefined
          ? room
          : existingEntry.room;

      const finalClassType =
        classType !== undefined
          ? classType
          : existingEntry.classType;

      const finalBatch =
        batch !== undefined
          ? normalizeBatch(batch)
          : existingEntry.batch;

      // ========================================================
      // VALIDATE COURSE
      // ========================================================

      const course =
        await prisma.course.findUnique({
          where: {
            id: finalCourseId,
          },
        });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // ========================================================
      // VALIDATE FACULTY
      // ========================================================

      const selectedFaculty =
        await prisma.faculty.findUnique({
          where: {
            id: finalFacultyId,
          },
        });

      if (!selectedFaculty) {
        return res.status(404).json({
          success: false,
          message:
            "Faculty not found",
        });
      }

      if (
        course.facultyId !==
        selectedFaculty.id
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Faculty is not assigned to this course",
        });
      }

      if (
        selectedFaculty.departmentId !==
        course.departmentId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Faculty and course belong to different departments",
        });
      }

      // ========================================================
      // VALIDATE DAY
      // ========================================================

      if (
        finalDayOfWeek < 1 ||
        finalDayOfWeek > 7
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Day of week must be between 1 and 7",
        });
      }

      // ========================================================
      // VALIDATE TIME
      // ========================================================

      const timeValidation =
        validateTimeRange(
          finalStartTime,
          finalEndTime
        );

      if (!timeValidation.valid) {
        return res.status(400).json({
          success: false,
          message:
            timeValidation.message,
        });
      }

      // ========================================================
      // VALIDATE BATCH
      // ========================================================

      if (
        finalBatch ===
        "__INVALID_BATCH__"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Batch must be 1, 2, 3, or empty for common/all-batch entries",
        });
      }

      // ========================================================
      // CHECK CONFLICT
      // ========================================================

      const conflict =
        await findTimetableConflict({
          dayOfWeek:
            finalDayOfWeek,
          startTime:
            finalStartTime,
          endTime:
            finalEndTime,
          facultyId:
            selectedFaculty.id,
          room: finalRoom,
          batch: finalBatch,
          excludeId:
            timetableId,
        });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message:
            conflict.message,
          conflictType:
            conflict.type,
          conflictingEntry:
            conflict.entry,
        });
      }

      // ========================================================
      // UPDATE
      // ========================================================

      const updatedEntry =
        await prisma.timetableEntry.update({
          where: {
            id: timetableId,
          },

          data: {
            courseId:
              finalCourseId,
            facultyId:
              selectedFaculty.id,
            dayOfWeek:
              finalDayOfWeek,
            startTime:
              finalStartTime,
            endTime:
              finalEndTime,
            room:
              finalRoom || null,
            classType:
              finalClassType ||
              "Lecture",
            batch:
              finalBatch,
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

      return res.status(200).json({
        success: true,
        message:
          "Timetable entry updated successfully",
        timetableEntry:
          updatedEntry,
      });
    } catch (error) {
      console.error(
        "Update timetable entry error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update timetable entry",
        error: error.message,
      });
    }
  };

// ============================================================
// DELETE TIMETABLE ENTRY
// ============================================================

export const deleteTimetableEntry =
  async (req, res) => {
    try {
      const userId =
        req.user.userId;

      const timetableId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          timetableId
        ) ||
        timetableId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid timetable ID",
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
            "Only faculty can delete timetable entries",
        });
      }

      const entry =
        await prisma.timetableEntry.findUnique({
          where: {
            id: timetableId,
          },
        });

      if (!entry) {
        return res.status(404).json({
          success: false,
          message:
            "Timetable entry not found",
        });
      }

      if (
        entry.facultyId !==
        faculty.id
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You can only delete your own timetable entries",
        });
      }

      await prisma.timetableEntry.delete({
        where: {
          id: timetableId,
        },
      });

      return res.status(200).json({
        success: true,
        message:
          "Timetable entry deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete timetable entry error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete timetable entry",
        error: error.message,
      });
    }
  };

export default {
  createTimetableEntry,
  getMyTimetable,
  getMyFacultyTimetable,
  getTimetable,
  updateTimetableEntry,
  deleteTimetableEntry,
};