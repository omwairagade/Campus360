import prisma from "../lib/prisma.js";

// ============================================================
// HELPERS
// ============================================================

const parseId = (value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();

  return text || null;
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

const timeToMinutes = (value) => {
  if (!value) {
    return null;
  }

  const time = String(value).trim();

  if (!/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
};

// Frontend:
// Sunday = 0
// Monday = 1
// Tuesday = 2
// ...
// Saturday = 6
//
// Database:
// Monday = 1
// Tuesday = 2
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

const normalizeBatch = (value) => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const batch = String(value).trim();

  if (!["1", "2", "3"].includes(batch)) {
    return "__INVALID_BATCH__";
  }

  return batch;
};

// ============================================================
// PRISMA INCLUDE
// ============================================================

const timetableInclude = {
  course: {
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      credits: true,
      semester: true,
      type: true,
      departmentId: true,
      programId: true,

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
          departmentId: true,
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

// ============================================================
// FORMAT ENTRY
// ============================================================

const formatTimetableEntry = (entry) => {
  if (!entry) {
    return entry;
  }

  const frontendDay = formatDayForFrontend(
    entry.dayOfWeek
  );

  return {
    ...entry,

    dayOfWeek: frontendDay,

    dayName:
      DAY_NAMES[frontendDay] ||
      String(frontendDay),

    classType:
      entry.classType || "Lecture",
  };
};

// ============================================================
// CHECK TIME OVERLAP
// ============================================================

const hasTimeOverlap = (
  newStart,
  newEnd,
  existingStart,
  existingEnd
) => {
  const startA = timeToMinutes(newStart);
  const endA = timeToMinutes(newEnd);
  const startB = timeToMinutes(existingStart);
  const endB = timeToMinutes(existingEnd);

  if (
    startA === null ||
    endA === null ||
    startB === null ||
    endB === null
  ) {
    return false;
  }

  return (
    startA < endB &&
    endA > startB
  );
};

// ============================================================
// CHECK TIMETABLE CONFLICTS
// ============================================================

const findConflicts = async ({
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
        dayOfWeek,

        ...(excludeId
          ? {
              id: {
                not: excludeId,
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

      orderBy: {
        startTime: "asc",
      },
    });

  const normalizedRoom =
    room
      ? String(room)
          .trim()
          .toLowerCase()
      : null;

  const normalizedBatch =
    batch === null ||
    batch === undefined ||
    String(batch).trim() === ""
      ? null
      : String(batch).trim();

  for (const entry of entries) {
    if (
      !hasTimeOverlap(
        startTime,
        endTime,
        entry.startTime,
        entry.endTime
      )
    ) {
      continue;
    }

    // --------------------------------------------------------
    // FACULTY CONFLICT
    // --------------------------------------------------------

    if (
      facultyId &&
      entry.facultyId &&
      Number(entry.facultyId) ===
        Number(facultyId)
    ) {
      return {
        type: "faculty",
        entry,
        message:
          `Faculty already has "${entry.course?.code || "another course"}" ` +
          `scheduled from ${entry.startTime} to ${entry.endTime}.`,
      };
    }

    // --------------------------------------------------------
    // ROOM CONFLICT
    // --------------------------------------------------------

    if (
      normalizedRoom &&
      entry.room &&
      String(entry.room)
        .trim()
        .toLowerCase() ===
        normalizedRoom
    ) {
      return {
        type: "room",
        entry,
        message:
          `Room ${entry.room} is already occupied ` +
          `from ${entry.startTime} to ${entry.endTime}.`,
      };
    }

    // --------------------------------------------------------
    // BATCH CONFLICT
    //
    // Common entry conflicts with every batch.
    // Batch 1 conflicts with Batch 1.
    // Batch 2 conflicts with Batch 2.
    // Batch 3 conflicts with Batch 3.
    // Different batches may run simultaneously.
    // --------------------------------------------------------

    const existingBatch =
      entry.batch === null ||
      entry.batch === undefined ||
      String(entry.batch).trim() === ""
        ? null
        : String(entry.batch).trim();

    const batchConflict =
      existingBatch === null ||
      normalizedBatch === null ||
      existingBatch === normalizedBatch;

    if (batchConflict) {
      return {
        type: "batch",
        entry,
        message:
          `Another timetable entry for the same batch/common group ` +
          `already exists from ${entry.startTime} to ${entry.endTime}.`,
      };
    }
  }

  return null;
};

// ============================================================
// VALIDATE COURSE + FACULTY
// ============================================================

const validateCourseFaculty = async ({
  courseId,
  facultyId,
}) => {
  const course =
    await prisma.course.findUnique({
      where: {
        id: courseId,
      },
    });

  if (!course) {
    return {
      error: {
        status: 404,
        message: "Course not found.",
      },
    };
  }

  const faculty =
    await prisma.faculty.findUnique({
      where: {
        id: facultyId,
      },
    });

  if (!faculty) {
    return {
      error: {
        status: 404,
        message: "Faculty not found.",
      },
    };
  }

  // A course with an assigned faculty must use
  // that faculty in the timetable.

  if (
    course.facultyId !== null &&
    Number(course.facultyId) !==
      Number(faculty.id)
  ) {
    return {
      error: {
        status: 409,
        message:
          "Selected faculty is not assigned to this course.",
      },
    };
  }

  // Faculty and course should belong
  // to the same department.

  if (
    Number(course.departmentId) !==
    Number(faculty.departmentId)
  ) {
    return {
      error: {
        status: 409,
        message:
          "Faculty and course belong to different departments.",
      },
    };
  }

  return {
    course,
    faculty,
  };
};

// ============================================================
// GET ADMIN TIMETABLE
// GET /api/admin/timetable
// ============================================================

export const getAdminTimetable = async (
  req,
  res
) => {
  try {
    const {
      search = "",
      departmentId,
      programId,
      semester,
      dayOfWeek,
      courseId,
      facultyId,
      batch,
      classType,
    } = req.query;

    const where = {};

    // --------------------------------------------------------
    // COURSE FILTERS
    // Department → Program → Semester
    // --------------------------------------------------------

    const courseWhere = {};

    if (departmentId) {
      const parsedDepartmentId =
        parseId(departmentId);

      if (parsedDepartmentId) {
        courseWhere.departmentId =
          parsedDepartmentId;
      }
    }

    if (programId) {
      const parsedProgramId =
        parseId(programId);

      if (parsedProgramId) {
        courseWhere.programId =
          parsedProgramId;
      }
    }

    if (semester) {
      const parsedSemester =
        Number(semester);

      if (
        Number.isInteger(
          parsedSemester
        ) &&
        parsedSemester > 0
      ) {
        courseWhere.semester =
          parsedSemester;
      }
    }

    if (
      Object.keys(courseWhere)
        .length > 0
    ) {
      where.course = courseWhere;
    }

    // --------------------------------------------------------
    // DAY
    // --------------------------------------------------------

    if (
      dayOfWeek !== undefined &&
      dayOfWeek !== ""
    ) {
      const parsedDay =
        normalizeDayForDatabase(
          dayOfWeek
        );

      if (parsedDay !== null) {
        where.dayOfWeek =
          parsedDay;
      }
    }

    // --------------------------------------------------------
    // COURSE
    // --------------------------------------------------------

    if (courseId) {
      const parsedCourseId =
        parseId(courseId);

      if (parsedCourseId) {
        where.courseId =
          parsedCourseId;
      }
    }

    // --------------------------------------------------------
    // FACULTY
    // --------------------------------------------------------

    if (facultyId) {
      const parsedFacultyId =
        parseId(facultyId);

      if (parsedFacultyId) {
        where.facultyId =
          parsedFacultyId;
      }
    }

    // --------------------------------------------------------
    // BATCH
    // --------------------------------------------------------

    if (
      batch !== undefined &&
      batch !== "ALL"
    ) {
      if (
        String(batch).trim() === ""
      ) {
        where.batch = null;
      } else {
        where.batch =
          String(batch).trim();
      }
    }

    // --------------------------------------------------------
    // CLASS TYPE
    // --------------------------------------------------------

    if (
      classType &&
      classType !== "ALL"
    ) {
      where.classType =
        String(classType).trim();
    }

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (String(search).trim()) {
      const searchText =
        String(search).trim();

      const searchConditions = [
        {
          room: {
            contains: searchText,
            mode: "insensitive",
          },
        },

        {
          classType: {
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
          course: {
            department: {
              name: {
                contains: searchText,
                mode: "insensitive",
              },
            },
          },
        },

        {
          course: {
            department: {
              code: {
                contains: searchText,
                mode: "insensitive",
              },
            },
          },
        },

        {
          course: {
            program: {
              name: {
                contains: searchText,
                mode: "insensitive",
              },
            },
          },
        },

        {
          course: {
            program: {
              code: {
                contains: searchText,
                mode: "insensitive",
              },
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

      where.OR =
        searchConditions;
    }

    // --------------------------------------------------------
    // FETCH
    // --------------------------------------------------------

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

        include:
          timetableInclude,
      });

    const formattedTimetable =
      timetable.map(
        formatTimetableEntry
      );

    return res.status(200).json({
      success: true,
      count:
        formattedTimetable.length,
      timetable:
        formattedTimetable,
      data:
        formattedTimetable,
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
      error:
        error?.message,
    });
  }
};

// ============================================================
// GET SINGLE ENTRY
// GET /api/admin/timetable/:id
// ============================================================

export const getAdminTimetableById =
  async (req, res) => {
    try {
      const id =
        parseId(req.params.id);

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid timetable entry ID.",
        });
      }

      const entry =
        await prisma.timetableEntry.findUnique(
          {
            where: {
              id,
            },
            include:
              timetableInclude,
          }
        );

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
        timetable:
          formattedEntry,
        data:
          formattedEntry,
      });
    } catch (error) {
      console.error(
        "Get timetable details error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch timetable entry details.",
        error:
          error?.message,
      });
    }
  };

// ============================================================
// CREATE ENTRY
// POST /api/admin/timetable
// ============================================================

export const createAdminTimetable =
  async (req, res) => {
    try {
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

      const parsedCourseId =
        parseId(courseId);

      if (!parsedCourseId) {
        return res.status(400).json({
          success: false,
          message:
            "Valid course is required.",
        });
      }

      // Faculty is required because timetable
      // entries represent an assigned class.

      const parsedFacultyId =
        parseId(facultyId);

      if (!parsedFacultyId) {
        return res.status(400).json({
          success: false,
          message:
            "Faculty is required for a timetable entry.",
        });
      }

      const parsedDay =
        normalizeDayForDatabase(
          dayOfWeek
        );

      if (parsedDay === null) {
        return res.status(400).json({
          success: false,
          message:
            "Day of week must be between 0 and 6.",
        });
      }

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
        timeToMinutes(
          normalizedStartTime
        ) >=
        timeToMinutes(
          normalizedEndTime
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "End time must be later than start time.",
        });
      }

      const finalRoom =
        normalizeText(room);

      if (!finalRoom) {
        return res.status(400).json({
          success: false,
          message:
            "Room is required.",
        });
      }

      const finalClassType =
        normalizeText(classType) ||
        "Lecture";

      const finalBatch =
        normalizeBatch(batch);

      if (
        finalBatch ===
        "__INVALID_BATCH__"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Batch must be 1, 2, 3, or empty for common/all-batch entries.",
        });
      }

      const validation =
        await validateCourseFaculty({
          courseId:
            parsedCourseId,
          facultyId:
            parsedFacultyId,
        });

      if (validation.error) {
        return res.status(
          validation.error.status
        ).json({
          success: false,
          message:
            validation.error.message,
        });
      }

      const conflict =
        await findConflicts({
          dayOfWeek:
            parsedDay,
          startTime:
            normalizedStartTime,
          endTime:
            normalizedEndTime,
          facultyId:
            parsedFacultyId,
          room:
            finalRoom,
          batch:
            finalBatch,
        });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message:
            conflict.message,
          conflictType:
            conflict.type,
          conflictingEntry:
            formatTimetableEntry(
              conflict.entry
            ),
        });
      }

      const entry =
        await prisma.timetableEntry.create(
          {
            data: {
              courseId:
                parsedCourseId,

              facultyId:
                parsedFacultyId,

              dayOfWeek:
                parsedDay,

              startTime:
                normalizedStartTime,

              endTime:
                normalizedEndTime,

              room:
                finalRoom,

              classType:
                finalClassType,

              batch:
                finalBatch,
            },

            include:
              timetableInclude,
          }
        );

      const formattedEntry =
        formatTimetableEntry(entry);

      return res.status(201).json({
        success: true,
        message:
          "Timetable entry created successfully.",
        timetable:
          formattedEntry,
        data:
          formattedEntry,
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

// ============================================================
// UPDATE ENTRY
// PATCH /api/admin/timetable/:id
// ============================================================

export const updateAdminTimetable =
  async (req, res) => {
    try {
      const id =
        parseId(req.params.id);

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid timetable entry ID.",
        });
      }

      const existingEntry =
        await prisma.timetableEntry.findUnique(
          {
            where: {
              id,
            },
          }
        );

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
        classType,
        batch,
      } = req.body;

      let finalCourseId =
        existingEntry.courseId;

      let finalFacultyId =
        existingEntry.facultyId;

      let finalDayOfWeek =
        existingEntry.dayOfWeek;

      let finalStartTime =
        existingEntry.startTime;

      let finalEndTime =
        existingEntry.endTime;

      let finalRoom =
        existingEntry.room;

      let finalClassType =
        existingEntry.classType ||
        "Lecture";

      let finalBatch =
        existingEntry.batch;

      const updateData = {};

      // --------------------------------------------------------
      // COURSE
      // --------------------------------------------------------

      if (
        courseId !== undefined
      ) {
        const parsedCourseId =
          parseId(courseId);

        if (!parsedCourseId) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid course ID.",
          });
        }

        finalCourseId =
          parsedCourseId;

        updateData.courseId =
          parsedCourseId;
      }

      // --------------------------------------------------------
      // FACULTY
      // --------------------------------------------------------

      if (
        facultyId !== undefined
      ) {
        const parsedFacultyId =
          parseId(facultyId);

        if (!parsedFacultyId) {
          return res.status(400).json({
            success: false,
            message:
              "Faculty is required.",
          });
        }

        finalFacultyId =
          parsedFacultyId;

        updateData.facultyId =
          parsedFacultyId;
      }

      if (!finalFacultyId) {
        return res.status(400).json({
          success: false,
          message:
            "Faculty is required for a timetable entry.",
        });
      }

      // --------------------------------------------------------
      // DAY
      // --------------------------------------------------------

      if (
        dayOfWeek !== undefined
      ) {
        const parsedDay =
          normalizeDayForDatabase(
            dayOfWeek
          );

        if (parsedDay === null) {
          return res.status(400).json({
            success: false,
            message:
              "Day of week must be between 0 and 6.",
          });
        }

        finalDayOfWeek =
          parsedDay;

        updateData.dayOfWeek =
          parsedDay;
      }

      // --------------------------------------------------------
      // START TIME
      // --------------------------------------------------------

      if (
        startTime !== undefined
      ) {
        const normalized =
          normalizeTime(
            startTime
          );

        if (!normalized) {
          return res.status(400).json({
            success: false,
            message:
              "Start time must be in HH:MM format.",
          });
        }

        finalStartTime =
          normalized;

        updateData.startTime =
          normalized;
      }

      // --------------------------------------------------------
      // END TIME
      // --------------------------------------------------------

      if (
        endTime !== undefined
      ) {
        const normalized =
          normalizeTime(
            endTime
          );

        if (!normalized) {
          return res.status(400).json({
            success: false,
            message:
              "End time must be in HH:MM format.",
          });
        }

        finalEndTime =
          normalized;

        updateData.endTime =
          normalized;
      }

      // --------------------------------------------------------
      // TIME VALIDATION
      // --------------------------------------------------------

      if (
        timeToMinutes(
          finalStartTime
        ) >=
        timeToMinutes(
          finalEndTime
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "End time must be later than start time.",
        });
      }

      // --------------------------------------------------------
      // ROOM
      // --------------------------------------------------------

      if (
        room !== undefined
      ) {
        const normalizedRoom =
          normalizeText(room);

        if (!normalizedRoom) {
          return res.status(400).json({
            success: false,
            message:
              "Room is required.",
          });
        }

        finalRoom =
          normalizedRoom;

        updateData.room =
          normalizedRoom;
      }

      if (!finalRoom) {
        return res.status(400).json({
          success: false,
          message:
            "Room is required.",
        });
      }

      // --------------------------------------------------------
      // CLASS TYPE
      // --------------------------------------------------------

      if (
        classType !== undefined
      ) {
        const normalizedClassType =
          normalizeText(
            classType
          );

        if (!normalizedClassType) {
          return res.status(400).json({
            success: false,
            message:
              "Class type is required.",
          });
        }

        finalClassType =
          normalizedClassType;

        updateData.classType =
          normalizedClassType;
      }

      // --------------------------------------------------------
      // BATCH
      // --------------------------------------------------------

      if (
        batch !== undefined
      ) {
        const normalizedBatch =
          normalizeBatch(batch);

        if (
          normalizedBatch ===
          "__INVALID_BATCH__"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Batch must be 1, 2, 3, or empty for common/all-batch entries.",
          });
        }

        finalBatch =
          normalizedBatch;

        updateData.batch =
          normalizedBatch;
      }

      // --------------------------------------------------------
      // VALIDATE COURSE + FACULTY
      // --------------------------------------------------------

      const validation =
        await validateCourseFaculty({
          courseId:
            finalCourseId,
          facultyId:
            finalFacultyId,
        });

      if (validation.error) {
        return res.status(
          validation.error.status
        ).json({
          success: false,
          message:
            validation.error.message,
        });
      }

      // --------------------------------------------------------
      // CHECK CONFLICT
      // --------------------------------------------------------

      const conflict =
        await findConflicts({
          dayOfWeek:
            finalDayOfWeek,

          startTime:
            finalStartTime,

          endTime:
            finalEndTime,

          facultyId:
            finalFacultyId,

          room:
            finalRoom,

          batch:
            finalBatch,

          excludeId:
            id,
        });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message:
            conflict.message,
          conflictType:
            conflict.type,
          conflictingEntry:
            formatTimetableEntry(
              conflict.entry
            ),
        });
      }

      // --------------------------------------------------------
      // UPDATE
      // --------------------------------------------------------

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

      const updatedEntry =
        await prisma.timetableEntry.update(
          {
            where: {
              id,
            },

            data: updateData,

            include:
              timetableInclude,
          }
        );

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
          error?.message ||
          "Failed to update timetable entry.",
        error:
          error?.stack ||
          error?.message ||
          String(error),
      });
    }
  };

// ============================================================
// DELETE ENTRY
// DELETE /api/admin/timetable/:id
// ============================================================

export const deleteAdminTimetable =
  async (req, res) => {
    try {
      const id =
        parseId(req.params.id);

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid timetable entry ID.",
        });
      }

      const existingEntry =
        await prisma.timetableEntry.findUnique(
          {
            where: {
              id,
            },
          }
        );

      if (!existingEntry) {
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
        error:
          error?.message,
      });
    }
  };