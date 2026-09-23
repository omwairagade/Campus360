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

const normalizeTime = (value) => {
  if (!value) {
    return null;
  }

  const time = String(value).trim();

  if (!/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return time;
};

// Frontend currently uses:
// Sunday = 0
// Monday = 1
// ...
// Saturday = 6
//
// Database uses:
// Monday = 1
// ...
// Saturday = 6
// Sunday = 7

const normalizeDayForDatabase = (value) => {
  const day = Number(value);

  if (!Number.isInteger(day)) {
    return null;
  }

  if (day === 0) {
    return 7;
  }

  if (day >= 1 && day <= 7) {
    return day;
  }

  return null;
};

const formatDayForFrontend = (value) => {
  const day = Number(value);

  // Convert database Sunday 7 -> frontend Sunday 0
  if (day === 7) {
    return 0;
  }

  return day;
};

const DAY_NAMES = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();

  return text || null;
};

const formatTimetableEntry = (entry) => {
  if (!entry) {
    return entry;
  }

  const frontendDay = formatDayForFrontend(
    entry.dayOfWeek
  );

  return {
    ...entry,

    // Keep frontend-compatible numbering
    dayOfWeek: frontendDay,

    dayName:
      DAY_NAMES[frontendDay] ||
      String(frontendDay),

    // Frontend uses classType
    // Database uses sessionType
    classType:
      entry.sessionType || "",
  };
};

const timetableInclude = {
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
};

// =====================================================
// GET ALL TIMETABLE ENTRIES
// GET /api/admin/timetable
// =====================================================

export const getAdminTimetable = async (
  req,
  res
) => {
  try {
    const {
      search = "",
      semester,
      dayOfWeek,
      courseId,
      facultyId,
      batch,
      division,
      classType,
      sessionType,
    } = req.query;

    const where = {};

    // -------------------------------------------------
    // Semester filter
    // -------------------------------------------------

    if (semester) {
      const parsedSemester = Number(semester);

      if (Number.isInteger(parsedSemester)) {
        where.course = {
          semester: parsedSemester,
        };
      }
    }

    // -------------------------------------------------
    // Day filter
    // -------------------------------------------------

    if (
      dayOfWeek !== undefined &&
      dayOfWeek !== ""
    ) {
      const parsedDay =
        normalizeDayForDatabase(dayOfWeek);

      if (parsedDay !== null) {
        where.dayOfWeek = parsedDay;
      }
    }

    // -------------------------------------------------
    // Course filter
    // -------------------------------------------------

    if (courseId) {
      const parsedCourseId = parseId(courseId);

      if (parsedCourseId) {
        where.courseId = parsedCourseId;
      }
    }

    // -------------------------------------------------
    // Faculty filter
    // -------------------------------------------------

    if (facultyId) {
      const parsedFacultyId = parseId(facultyId);

      if (parsedFacultyId) {
        where.facultyId = parsedFacultyId;
      }
    }

    // -------------------------------------------------
    // Batch filter
    // -------------------------------------------------

    if (batch !== undefined && batch !== "ALL") {
      if (String(batch).trim() === "") {
        where.batch = null;
      } else {
        where.batch = String(batch).trim();
      }
    }

    // -------------------------------------------------
    // Division filter
    // -------------------------------------------------

    if (
      division !== undefined &&
      division !== "" &&
      division !== "ALL"
    ) {
      where.division = String(division).trim();
    }

    // -------------------------------------------------
    // Class type filter
    // Frontend sends classType
    // Database stores sessionType
    // -------------------------------------------------

    const requestedClassType =
      classType || sessionType;

    if (
      requestedClassType &&
      requestedClassType !== "ALL"
    ) {
      where.sessionType = String(
        requestedClassType
      ).trim();
    }

    // -------------------------------------------------
    // Search
    // -------------------------------------------------

    if (search.trim()) {
      const searchText = search.trim();

      where.OR = [
        {
          room: {
            contains: searchText,
            mode: "insensitive",
          },
        },

        {
          sessionType: {
            contains: searchText,
            mode: "insensitive",
          },
        },

        {
          batch: {
            contains: searchText,
            mode: "insensitive",
          },
        },

        {
          division: {
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

    const timetable =
      await prisma.timetableEntry.findMany({
        where,

        orderBy: [
          {
            dayOfWeek: "asc",
          },
          {
            startTime: "asc",
          },
          {
            id: "asc",
          },
        ],

        include: timetableInclude,
      });

    const formattedTimetable =
      timetable.map(formatTimetableEntry);

    return res.status(200).json({
      success: true,
      count: formattedTimetable.length,
      timetable: formattedTimetable,
      data: formattedTimetable,
    });
  } catch (error) {
    console.error(
      "Get admin timetable error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch timetable.",
      error: error?.message,
    });
  }
};

// =====================================================
// GET SINGLE TIMETABLE ENTRY
// GET /api/admin/timetable/:id
// =====================================================

export const getAdminTimetableById = async (
  req,
  res
) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid timetable entry ID.",
      });
    }

    const entry =
      await prisma.timetableEntry.findUnique({
        where: {
          id,
        },

        include: timetableInclude,
      });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message:
          "Timetable entry not found.",
      });
    }

    const formattedEntry =
      formatTimetableEntry(entry);

    return res.status(200).json({
      success: true,
      timetable: formattedEntry,
      data: formattedEntry,
    });
  } catch (error) {
    console.error(
      "Get admin timetable details error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch timetable entry details.",
      error: error?.message,
    });
  }
};

// =====================================================
// CREATE TIMETABLE ENTRY
// POST /api/admin/timetable
// =====================================================

export const createAdminTimetable = async (
  req,
  res
) => {
  try {
    const {
      courseId,
      facultyId,
      dayOfWeek,
      startTime,
      endTime,
      room,

      // Support both names
      sessionType,
      classType,

      batch,
      division,
    } = req.body;

    // -------------------------------------------------
    // Required course
    // -------------------------------------------------

    const parsedCourseId =
      parseId(courseId);

    if (!parsedCourseId) {
      return res.status(400).json({
        success: false,
        message:
          "Valid course is required.",
      });
    }

    // -------------------------------------------------
    // Required faculty
    // -------------------------------------------------

    const parsedFacultyId =
      parseId(facultyId);

    if (!parsedFacultyId) {
      return res.status(400).json({
        success: false,
        message:
          "Valid faculty is required.",
      });
    }

    // -------------------------------------------------
    // Day
    // -------------------------------------------------

    const parsedDay =
      normalizeDayForDatabase(dayOfWeek);

    if (parsedDay === null) {
      return res.status(400).json({
        success: false,
        message:
          "Day of week must be between 0 and 7.",
      });
    }

    // -------------------------------------------------
    // Time
    // -------------------------------------------------

    const normalizedStartTime =
      normalizeTime(startTime);

    const normalizedEndTime =
      normalizeTime(endTime);

    if (!normalizedStartTime) {
      return res.status(400).json({
        success: false,
        message:
          "Start time must be in HH:MM format.",
      });
    }

    if (!normalizedEndTime) {
      return res.status(400).json({
        success: false,
        message:
          "End time must be in HH:MM format.",
      });
    }

    if (
      normalizedStartTime >=
      normalizedEndTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "End time must be later than start time.",
      });
    }

    // -------------------------------------------------
    // Room
    // -------------------------------------------------

    const finalRoom =
      normalizeText(room);

    if (!finalRoom) {
      return res.status(400).json({
        success: false,
        message: "Room is required.",
      });
    }

    // -------------------------------------------------
    // Session type
    // -------------------------------------------------

    const finalSessionType =
      normalizeText(
        sessionType || classType
      );

    if (!finalSessionType) {
      return res.status(400).json({
        success: false,
        message:
          "Session type is required.",
      });
    }

    // -------------------------------------------------
    // Batch / division
    // -------------------------------------------------

    const finalBatch =
      normalizeText(batch);

    const finalDivision =
      normalizeText(division);

    // -------------------------------------------------
    // Verify course
    // -------------------------------------------------

    const course =
      await prisma.course.findUnique({
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

    // -------------------------------------------------
    // Verify faculty
    // -------------------------------------------------

    const faculty =
      await prisma.faculty.findUnique({
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

    // -------------------------------------------------
    // Course/faculty relationship
    // -------------------------------------------------

    if (
      course.facultyId !== null &&
      course.facultyId !==
        parsedFacultyId
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Selected faculty is not assigned to this course.",
      });
    }

    // -------------------------------------------------
    // Exact duplicate
    // -------------------------------------------------

    const duplicate =
      await prisma.timetableEntry.findFirst({
        where: {
          courseId: parsedCourseId,
          facultyId: parsedFacultyId,
          dayOfWeek: parsedDay,
          startTime:
            normalizedStartTime,
          endTime:
            normalizedEndTime,
          room: finalRoom,
          classType:
            finalSessionType,
          batch: finalBatch,
         
        },
      });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "An identical timetable entry already exists.",
      });
    }

    // -------------------------------------------------
    // Faculty conflict
    // -------------------------------------------------

    const facultyEntries =
      await prisma.timetableEntry.findMany({
        where: {
          dayOfWeek: parsedDay,
          facultyId: parsedFacultyId,
        },
      });

    const hasFacultyConflict =
      facultyEntries.some(
        (entry) =>
          entry.startTime <
            normalizedEndTime &&
          entry.endTime >
            normalizedStartTime
      );

    if (hasFacultyConflict) {
      return res.status(409).json({
        success: false,
        message:
          "Faculty already has another timetable entry during this time.",
      });
    }

    // -------------------------------------------------
    // Room conflict
    // -------------------------------------------------

    const roomEntries =
      await prisma.timetableEntry.findMany({
        where: {
          dayOfWeek: parsedDay,
          room: finalRoom,
        },
      });

    const hasRoomConflict =
      roomEntries.some(
        (entry) =>
          entry.startTime <
            normalizedEndTime &&
          entry.endTime >
            normalizedStartTime
      );

    if (hasRoomConflict) {
      return res.status(409).json({
        success: false,
        message:
          "The selected room is already occupied during this time.",
      });
    }

    // -------------------------------------------------
    // Create entry
    // -------------------------------------------------

    const entry =
      await prisma.timetableEntry.create({
        data: {
          courseId: parsedCourseId,
          facultyId: parsedFacultyId,
          dayOfWeek: parsedDay,

          startTime:
            normalizedStartTime,

          endTime:
            normalizedEndTime,

          room: finalRoom,

          classType:
            finalSessionType,

          batch: finalBatch,
        },

        include: timetableInclude,
      });

    const formattedEntry =
      formatTimetableEntry(entry);

    return res.status(201).json({
      success: true,
      message:
        "Timetable entry created successfully.",
      timetable: formattedEntry,
      data: formattedEntry,
    });
} catch (error) {
  console.error(
    "Create admin timetable error:",
    error
  );

  return res.status(500).json({
    success: false,
    message:
      error?.message ||
      "Failed to create timetable entry.",
    error:
      error?.stack ||
      error?.message ||
      String(error),
  });
}
};

// =====================================================
// UPDATE TIMETABLE ENTRY
// PATCH /api/admin/timetable/:id
// =====================================================

export const updateAdminTimetable = async (
  req,
  res
) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid timetable entry ID.",
      });
    }

    const existingEntry =
      await prisma.timetableEntry.findUnique({
        where: {
          id,
        },
      });

    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        message:
          "Timetable entry not found.",
      });
    }

    const {
      courseId,
      facultyId,
      dayOfWeek,
      startTime,
      endTime,
      room,
      sessionType,
      classType,
      batch,
      division,
    } = req.body;

    const updateData = {};

    // -------------------------------------------------
    // Course
    // -------------------------------------------------

    let finalCourseId =
      existingEntry.courseId;

    if (courseId !== undefined) {
      const parsedCourseId =
        parseId(courseId);

      if (!parsedCourseId) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid course ID.",
        });
      }

      const course =
        await prisma.course.findUnique({
          where: {
            id: parsedCourseId,
          },
        });

      if (!course) {
        return res.status(404).json({
          success: false,
          message:
            "Course not found.",
        });
      }

      finalCourseId =
        parsedCourseId;

      updateData.courseId =
        parsedCourseId;
    }

    // -------------------------------------------------
    // Faculty
    // -------------------------------------------------

    let finalFacultyId =
      existingEntry.facultyId;

    if (facultyId !== undefined) {
      const parsedFacultyId =
        parseId(facultyId);

      if (!parsedFacultyId) {
        return res.status(400).json({
          success: false,
          message:
            "Valid faculty is required.",
        });
      }

      const faculty =
        await prisma.faculty.findUnique({
          where: {
            id: parsedFacultyId,
          },
        });

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message:
            "Faculty not found.",
        });
      }

      finalFacultyId =
        parsedFacultyId;

      updateData.facultyId =
        parsedFacultyId;
    }

    // -------------------------------------------------
    // Day
    // -------------------------------------------------

    let finalDayOfWeek =
      existingEntry.dayOfWeek;

    if (dayOfWeek !== undefined) {
      const parsedDay =
        normalizeDayForDatabase(
          dayOfWeek
        );

      if (parsedDay === null) {
        return res.status(400).json({
          success: false,
          message:
            "Day of week must be between 0 and 7.",
        });
      }

      finalDayOfWeek =
        parsedDay;

      updateData.dayOfWeek =
        parsedDay;
    }

    // -------------------------------------------------
    // Start time
    // -------------------------------------------------

    let finalStartTime =
      existingEntry.startTime;

    if (startTime !== undefined) {
      const normalizedStartTime =
        normalizeTime(startTime);

      if (!normalizedStartTime) {
        return res.status(400).json({
          success: false,
          message:
            "Start time must be in HH:MM format.",
        });
      }

      finalStartTime =
        normalizedStartTime;

      updateData.startTime =
        normalizedStartTime;
    }

    // -------------------------------------------------
    // End time
    // -------------------------------------------------

    let finalEndTime =
      existingEntry.endTime;

    if (endTime !== undefined) {
      const normalizedEndTime =
        normalizeTime(endTime);

      if (!normalizedEndTime) {
        return res.status(400).json({
          success: false,
          message:
            "End time must be in HH:MM format.",
        });
      }

      finalEndTime =
        normalizedEndTime;

      updateData.endTime =
        normalizedEndTime;
    }

    // -------------------------------------------------
    // Time validation
    // -------------------------------------------------

    if (
      finalStartTime >=
      finalEndTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "End time must be later than start time.",
      });
    }

    // -------------------------------------------------
    // Room
    // -------------------------------------------------

    let finalRoom =
      existingEntry.room;

    if (room !== undefined) {
      const normalizedRoom =
        normalizeText(room);

      if (!normalizedRoom) {
        return res.status(400).json({
          success: false,
          message:
            "Room cannot be empty.",
        });
      }

      finalRoom =
        normalizedRoom;

      updateData.room =
        normalizedRoom;
    }

    // -------------------------------------------------
    // Session type
    // -------------------------------------------------

    const requestedSessionType =
      sessionType !== undefined
        ? sessionType
        : classType;

    let finalSessionType =
      existingEntry.sessionType;

    if (
      requestedSessionType !==
      undefined
    ) {
      const normalizedSessionType =
        normalizeText(
          requestedSessionType
        );

      if (!normalizedSessionType) {
        return res.status(400).json({
          success: false,
          message:
            "Session type cannot be empty.",
        });
      }

      finalSessionType =
        normalizedSessionType;

      updateData.sessionType =
        normalizedSessionType;
    }

    // -------------------------------------------------
    // Batch
    // -------------------------------------------------

    let finalBatch =
      existingEntry.batch;

    if (batch !== undefined) {
      finalBatch =
        normalizeText(batch);

      updateData.batch =
        finalBatch;
    }

    // -------------------------------------------------
    // Division
    // -------------------------------------------------

    let finalDivision =
      existingEntry.division;

    if (division !== undefined) {
      finalDivision =
        normalizeText(division);

      updateData.division =
        finalDivision;
    }

    // -------------------------------------------------
    // Verify final course
    // -------------------------------------------------

    const finalCourse =
      await prisma.course.findUnique({
        where: {
          id: finalCourseId,
        },
      });

    if (!finalCourse) {
      return res.status(404).json({
        success: false,
        message:
          "Course not found.",
      });
    }

    // -------------------------------------------------
    // Course/faculty relationship
    // -------------------------------------------------

    if (
      finalCourse.facultyId !== null &&
      finalCourse.facultyId !==
        finalFacultyId
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Selected faculty is not assigned to this course.",
      });
    }

    // -------------------------------------------------
    // Faculty conflict
    // -------------------------------------------------

    const facultyEntries =
      await prisma.timetableEntry.findMany({
        where: {
          id: {
            not: id,
          },

          dayOfWeek:
            finalDayOfWeek,

          facultyId:
            finalFacultyId,
        },
      });

    const hasFacultyConflict =
      facultyEntries.some(
        (entry) =>
          entry.startTime <
            finalEndTime &&
          entry.endTime >
            finalStartTime
      );

    if (hasFacultyConflict) {
      return res.status(409).json({
        success: false,
        message:
          "Faculty already has another timetable entry during this time.",
      });
    }

    // -------------------------------------------------
    // Room conflict
    // -------------------------------------------------

    const roomEntries =
      await prisma.timetableEntry.findMany({
        where: {
          id: {
            not: id,
          },

          dayOfWeek:
            finalDayOfWeek,

          room: finalRoom,
        },
      });

    const hasRoomConflict =
      roomEntries.some(
        (entry) =>
          entry.startTime <
            finalEndTime &&
          entry.endTime >
            finalStartTime
      );

    if (hasRoomConflict) {
      return res.status(409).json({
        success: false,
        message:
          "The selected room is already occupied during this time.",
      });
    }

    // -------------------------------------------------
    // Exact duplicate after update
    // -------------------------------------------------

    const duplicate =
      await prisma.timetableEntry.findFirst({
        where: {
          id: {
            not: id,
          },

          courseId:
            finalCourseId,

          facultyId:
            finalFacultyId,

          dayOfWeek:
            finalDayOfWeek,

          startTime:
            finalStartTime,

          endTime:
            finalEndTime,

          room:
            finalRoom,

          sessionType:
            finalSessionType,

          batch:
            finalBatch,

          division:
            finalDivision,
        },
      });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "An identical timetable entry already exists.",
      });
    }

    // -------------------------------------------------
    // No update fields
    // -------------------------------------------------

    if (
      Object.keys(updateData)
        .length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No fields provided for update.",
      });
    }

    // -------------------------------------------------
    // Update
    // -------------------------------------------------

    const updatedEntry =
      await prisma.timetableEntry.update({
        where: {
          id,
        },

        data: updateData,

        include: timetableInclude,
      });

    const formattedEntry =
      formatTimetableEntry(
        updatedEntry
      );

    return res.status(200).json({
      success: true,
      message:
        "Timetable entry updated successfully.",
      timetable:
        formattedEntry,
      data:
        formattedEntry,
    });
  } catch (error) {
    console.error(
      "Update admin timetable error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update timetable entry.",
      error: error?.message,
    });
  }
};

// =====================================================
// DELETE TIMETABLE ENTRY
// DELETE /api/admin/timetable/:id
// =====================================================

export const deleteAdminTimetable = async (
  req,
  res
) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid timetable entry ID.",
      });
    }

    const entry =
      await prisma.timetableEntry.findUnique({
        where: {
          id,
        },
      });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message:
          "Timetable entry not found.",
      });
    }

    await prisma.timetableEntry.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Timetable entry deleted successfully.",
      data: null,
    });
  } catch (error) {
    console.error(
      "Delete admin timetable error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete timetable entry.",
      error: error?.message,
    });
  }
};