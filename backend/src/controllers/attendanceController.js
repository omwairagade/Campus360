import prisma from "../lib/prisma.js";

/*
|--------------------------------------------------------------------------
| Helper: Get Faculty From Logged-In User
|--------------------------------------------------------------------------
*/
const getFacultyFromUser = async (userId) => {
  if (!userId) {
    return null;
  }

  return prisma.faculty.findUnique({
    where: {
      userId: Number(userId),
    },
  });
};

/*
|--------------------------------------------------------------------------
| Helper: Normalize Attendance Date
|--------------------------------------------------------------------------
*/
const normalizeDate = (date) => {
  if (!date) {
    return null;
  }

  const attendanceDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(attendanceDate.getTime())) {
    return null;
  }

  attendanceDate.setHours(0, 0, 0, 0);

  return attendanceDate;
};

/*
|--------------------------------------------------------------------------
| Helper: Get Timetable Day Number
|--------------------------------------------------------------------------
|
| 1 = Monday
| 2 = Tuesday
| 3 = Wednesday
| 4 = Thursday
| 5 = Friday
| 6 = Saturday
| 7 = Sunday
|
|--------------------------------------------------------------------------
*/
const getTimetableDayNumber = (attendanceDate) => {
  const jsDay = attendanceDate.getDay();

  return jsDay === 0 ? 7 : jsDay;
};

/*
|--------------------------------------------------------------------------
| Helper: Normalize Batch
|--------------------------------------------------------------------------
*/
const normalizeBatch = (batch) => {
  if (
    batch === undefined ||
    batch === null ||
    String(batch).trim() === ""
  ) {
    return null;
  }

  const value = String(batch).trim();

  if (!["1", "2", "3"].includes(value)) {
    return "__INVALID_BATCH__";
  }

  return value;
};

/*
|--------------------------------------------------------------------------
| Helper: Check Admin
|--------------------------------------------------------------------------
*/
const isAdmin = (req) => {
  const role = String(
    req.user?.role ||
      req.user?.userRole ||
      ""
  ).toUpperCase();

  return role === "ADMIN";
};

/*
|--------------------------------------------------------------------------
| Helper: Get Attendance Eligibility
|--------------------------------------------------------------------------
*/
const getAttendanceEligibility = async (
  courseId,
  attendanceDate
) => {
  const dayOfWeek = getTimetableDayNumber(
    attendanceDate
  );

  const timetableEntries =
    await prisma.timetableEntry.findMany({
      where: {
        courseId: Number(courseId),
        dayOfWeek,
      },

      select: {
        id: true,
        batch: true,
      },

      orderBy: {
        startTime: "asc",
      },
    });

  if (timetableEntries.length === 0) {
    return {
      mode: "ALL",
      batches: [],
      timetableEntries: [],
    };
  }

  const hasCommonEntry =
    timetableEntries.some(
      (entry) =>
        entry.batch === null ||
        entry.batch === undefined ||
        String(entry.batch).trim() === ""
    );

  if (hasCommonEntry) {
    return {
      mode: "ALL",
      batches: [],
      timetableEntries,
    };
  }

  const batches = [
    ...new Set(
      timetableEntries
        .map((entry) =>
          normalizeBatch(entry.batch)
        )
        .filter(
          (batch) =>
            batch !== null &&
            batch !== "__INVALID_BATCH__"
        )
    ),
  ];

  if (batches.length === 0) {
    return {
      mode: "ALL",
      batches: [],
      timetableEntries,
    };
  }

  return {
    mode: "BATCH",
    batches,
    timetableEntries,
  };
};

/*
|--------------------------------------------------------------------------
| Helper: Validate Whether Student Is Eligible For Attendance
|--------------------------------------------------------------------------
*/
const isStudentEligibleForAttendance = (
  student,
  eligibility
) => {
  if (eligibility.mode === "ALL") {
    return true;
  }

  if (eligibility.mode === "BATCH") {
    return (
      student.batch !== null &&
      student.batch !== undefined &&
      eligibility.batches.includes(
        String(student.batch)
      )
    );
  }

  return true;
};

/*
|--------------------------------------------------------------------------
| MARK / UPDATE SINGLE STUDENT ATTENDANCE
|--------------------------------------------------------------------------
*/
export const markAttendance = async (
  req,
  res
) => {
  try {
    const userId = req.user?.userId;

    const {
      studentId,
      courseId,
      date,
      status,
    } = req.body;

    if (
      !studentId ||
      !courseId ||
      !date ||
      !status
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Student ID, course ID, date and attendance status are required",
      });
    }

    const allowedStatuses = [
      "PRESENT",
      "ABSENT",
      "LATE",
    ];

    const normalizedStatus =
      String(status).toUpperCase();

    if (
      !allowedStatuses.includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid attendance status. Use PRESENT, ABSENT or LATE",
      });
    }

    const faculty =
      await getFacultyFromUser(userId);

    if (!faculty) {
      return res.status(403).json({
        success: false,
        message:
          "Only faculty can mark attendance",
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

    const student =
      await prisma.student.findUnique({
        where: {
          id: Number(studentId),
        },
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const enrolled =
      await prisma.courseEnrollment.findUnique(
        {
          where: {
            studentId_courseId: {
              studentId: student.id,
              courseId: course.id,
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

    const attendanceDate =
      normalizeDate(date);

    if (!attendanceDate) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid attendance date",
      });
    }

    const eligibility =
      await getAttendanceEligibility(
        course.id,
        attendanceDate
      );

    if (
      !isStudentEligibleForAttendance(
        student,
        eligibility
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Student is not assigned to the batch scheduled for this course on ${date}`,
      });
    }

    const existingAttendance =
      await prisma.attendanceRecord.findUnique(
        {
          where: {
            studentId_courseId_date: {
              studentId: student.id,
              courseId: course.id,
              date: attendanceDate,
            },
          },
        }
      );

    let attendance;

    if (existingAttendance) {
      attendance =
        await prisma.attendanceRecord.update({
          where: {
            id: existingAttendance.id,
          },

          data: {
            status: normalizedStatus,
          },
        });
    } else {
      attendance =
        await prisma.attendanceRecord.create({
          data: {
            studentId: student.id,
            courseId: course.id,
            date: attendanceDate,
            status: normalizedStatus,
          },
        });
    }

    return res.status(200).json({
      success: true,
      message:
        "Attendance marked successfully",
      attendance,
    });
  } catch (error) {
    console.error(
      "Mark attendance error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to mark attendance",
    });
  }
};

/*
|--------------------------------------------------------------------------
| FACULTY - GET STUDENTS + ATTENDANCE FOR A COURSE
|--------------------------------------------------------------------------
*/
export const getFacultyCourseAttendance =
  async (req, res) => {
    try {
      const userId =
        req.user?.userId;

      const courseId =
        Number(req.params.courseId);

      const { date } = req.query;

      if (
        !Number.isInteger(courseId) ||
        courseId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid course ID",
        });
      }

      if (!date) {
        return res.status(400).json({
          success: false,
          message:
            "Attendance date is required",
        });
      }

      const faculty =
        await getFacultyFromUser(
          userId
        );

      if (!faculty) {
        return res.status(403).json({
          success: false,
          message:
            "Invalid faculty ID",
        });
      }

      const course =
        await prisma.course.findUnique({
          where: {
            id: courseId,
          },

          select: {
            id: true,
            code: true,
            name: true,
            credits: true,
            facultyId: true,
            semester: true,
            programId: true,
          },
        });

      if (!course) {
        return res.status(404).json({
          success: false,
          message:
            "Course not found",
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

      const attendanceDate =
        normalizeDate(date);

      if (!attendanceDate) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid attendance date",
        });
      }

      const eligibility =
        await getAttendanceEligibility(
          course.id,
          attendanceDate
        );

      const enrollments =
        await prisma.courseEnrollment.findMany(
          {
            where: {
              courseId,
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
                },
              },
            },

            orderBy: {
              studentId: "asc",
            },
          }
        );

      const eligibleEnrollments =
        enrollments.filter(
          (enrollment) =>
            isStudentEligibleForAttendance(
              enrollment.student,
              eligibility
            )
        );

      const attendance =
        await prisma.attendanceRecord.findMany(
          {
            where: {
              courseId,
              date: attendanceDate,
            },

            orderBy: {
              studentId: "asc",
            },
          }
        );

      const eligibleStudentIds =
        new Set(
          eligibleEnrollments.map(
            (enrollment) =>
              enrollment.studentId
          )
        );

      const eligibleAttendance =
        attendance.filter(
          (record) =>
            eligibleStudentIds.has(
              record.studentId
            )
        );

      const students =
        eligibleEnrollments.map(
          (enrollment) => ({
            ...enrollment.student,
            user:
              enrollment.student.user,
          })
        );

      return res.status(200).json({
        success: true,

        faculty: {
          id: faculty.id,
          employeeId:
            faculty.employeeId,
        },

        course,

        attendanceScope: {
          mode:
            eligibility.mode,

          batches:
            eligibility.batches,

          dayOfWeek:
            getTimetableDayNumber(
              attendanceDate
            ),

          timetableEntries:
            eligibility.timetableEntries,
        },

        students,

        attendance:
          eligibleAttendance,
      });
    } catch (error) {
      console.error(
        "Get faculty course attendance error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch faculty course attendance",
        error: error.message,
      });
    }
  };

/*
|--------------------------------------------------------------------------
| FACULTY - MARK ATTENDANCE FOR MULTIPLE STUDENTS
|--------------------------------------------------------------------------
*/
export const markFacultyAttendance =
  async (req, res) => {
    try {
      const userId =
        req.user?.userId;

      const {
        courseId,
        date,
        records,
      } = req.body;

      if (
        !courseId ||
        !date ||
        !Array.isArray(records)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Course ID, date and attendance records are required",
        });
      }

      if (records.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "At least one attendance record is required",
        });
      }

      const allowedStatuses = [
        "PRESENT",
        "ABSENT",
        "LATE",
      ];

      const faculty =
        await getFacultyFromUser(
          userId
        );

      if (!faculty) {
        return res.status(403).json({
          success: false,
          message:
            "Invalid faculty ID",
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
          message:
            "Course not found",
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

      const attendanceDate =
        normalizeDate(date);

      if (!attendanceDate) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid attendance date",
        });
      }

      const eligibility =
        await getAttendanceEligibility(
          course.id,
          attendanceDate
        );

      const studentIds =
        records.map(
          (record) =>
            Number(record.studentId)
        );

      const uniqueStudentIds = [
        ...new Set(studentIds),
      ];

      const enrolledStudents =
        await prisma.courseEnrollment.findMany(
          {
            where: {
              courseId: course.id,

              studentId: {
                in: uniqueStudentIds,
              },
            },

            select: {
              studentId: true,

              student: {
                select: {
                  id: true,
                  batch: true,
                  division: true,
                },
              },
            },
          }
        );

      const enrolledStudentMap =
        new Map(
          enrolledStudents.map(
            (enrollment) => [
              enrollment.studentId,
              enrollment.student,
            ]
          )
        );

      for (const record of records) {
        const studentId =
          Number(record.studentId);

        const status =
          String(
            record.status || ""
          ).toUpperCase();

        if (!studentId) {
          return res.status(400).json({
            success: false,
            message:
              "Every attendance record must contain a valid student ID",
          });
        }

        if (
          !allowedStatuses.includes(
            status
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Invalid attendance status for student ${studentId}`,
          });
        }

        const student =
          enrolledStudentMap.get(
            studentId
          );

        if (!student) {
          return res.status(400).json({
            success: false,
            message:
              `Student ${studentId} is not enrolled in this course`,
          });
        }

        if (
          !isStudentEligibleForAttendance(
            student,
            eligibility
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Student ${studentId} is not assigned to the batch scheduled for this course on ${date}`,
          });
        }
      }

      const savedAttendance =
        await prisma.$transaction(
          records.map(
            (record) => {
              const studentId =
                Number(
                  record.studentId
                );

              const status =
                String(
                  record.status
                ).toUpperCase();

              return prisma.attendanceRecord.upsert(
                {
                  where: {
                    studentId_courseId_date: {
                      studentId,
                      courseId:
                        course.id,
                      date:
                        attendanceDate,
                    },
                  },

                  update: {
                    status,
                  },

                  create: {
                    studentId,
                    courseId:
                      course.id,
                    date:
                      attendanceDate,
                    status,
                  },
                }
              );
            }
          )
        );

      return res.status(200).json({
        success: true,
        message:
          "Faculty attendance saved successfully",
        count:
          savedAttendance.length,
        attendance:
          savedAttendance,

        attendanceScope: {
          mode:
            eligibility.mode,

          batches:
            eligibility.batches,
        },
      });
    } catch (error) {
      console.error(
        "Mark faculty attendance error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to save faculty attendance",
        error: error.message,
      });
    }
  };

/*
|--------------------------------------------------------------------------
| STUDENT - GET LOGGED-IN ATTENDANCE
|--------------------------------------------------------------------------
*/
export const getMyAttendance = async (
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

    const records =
      await prisma.attendanceRecord.findMany(
        {
          where: {
            studentId:
              student.id,
          },

          include: {
            course: {
              select: {
                id: true,
                code: true,
                name: true,
                credits: true,
              },
            },
          },

          orderBy: {
            date: "desc",
          },
        }
      );

    const totalClasses =
      records.length;

    const attendedClasses =
      records.filter(
        (record) =>
          record.status === "PRESENT" ||
          record.status === "LATE"
      ).length;

    const absentClasses =
      records.filter(
        (record) =>
          record.status === "ABSENT"
      ).length;

    const attendancePercentage =
      totalClasses === 0
        ? 0
        : Number(
            (
              (attendedClasses /
                totalClasses) *
              100
            ).toFixed(1)
          );

    return res.status(200).json({
      success: true,

      summary: {
        totalClasses,
        attendedClasses,
        absentClasses,
        attendancePercentage,
      },

      studentGroup: {
        semester:
          student.semester,

        batch:
          student.batch,

        division:
          student.division,
      },

      records,
    });
  } catch (error) {
    console.error(
      "Get my attendance error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch attendance",
    });
  }
};

/*
|--------------------------------------------------------------------------
| STUDENT - GET COURSE-WISE ATTENDANCE
|--------------------------------------------------------------------------
*/
export const getMyCourseAttendance =
  async (req, res) => {
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

      const courses =
        await prisma.courseEnrollment.findMany(
          {
            where: {
              studentId:
                student.id,
            },

            include: {
              course: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  credits: true,
                },
              },
            },

            orderBy: {
              course: {
                name: "asc",
              },
            },
          }
        );

      const result =
        await Promise.all(
          courses.map(
            async (enrollment) => {
              const records =
                await prisma.attendanceRecord.findMany(
                  {
                    where: {
                      studentId:
                        student.id,

                      courseId:
                        enrollment.courseId,
                    },
                  }
                );

              const totalClasses =
                records.length;

              const attendedClasses =
                records.filter(
                  (record) =>
                    record.status ===
                      "PRESENT" ||
                    record.status ===
                      "LATE"
                ).length;

              const percentage =
                totalClasses === 0
                  ? 0
                  : Number(
                      (
                        (attendedClasses /
                          totalClasses) *
                        100
                      ).toFixed(1)
                    );

              return {
                course:
                  enrollment.course,

                totalClasses,

                attendedClasses,

                percentage,
              };
            }
          )
        );

      return res.status(200).json({
        success: true,

        studentGroup: {
          semester:
            student.semester,

          batch:
            student.batch,

          division:
            student.division,
        },

        courses: result,
      });
    } catch (error) {
      console.error(
        "Get course attendance error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch course attendance",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| ADMIN - GET ATTENDANCE
|--------------------------------------------------------------------------
|
| Supported query parameters:
|
| ?date=2026-09-12
| ?courseId=1
| ?facultyId=1
| ?studentId=1
|
| Any combination can be used.
|
|--------------------------------------------------------------------------
*/
export const getAdminAttendance = async (
  req,
  res
) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        message:
          "Only admin can access attendance records",
      });
    }

    const {
      date,
      courseId,
      facultyId,
      studentId,
    } = req.query;

    const parsedCourseId =
      courseId
        ? Number(courseId)
        : null;

    const parsedFacultyId =
      facultyId
        ? Number(facultyId)
        : null;

    const parsedStudentId =
      studentId
        ? Number(studentId)
        : null;

    if (
      parsedCourseId !== null &&
      (!Number.isInteger(
        parsedCourseId
      ) ||
        parsedCourseId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid course ID",
      });
    }

    if (
      parsedFacultyId !== null &&
      (!Number.isInteger(
        parsedFacultyId
      ) ||
        parsedFacultyId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid faculty ID",
      });
    }

    if (
      parsedStudentId !== null &&
      (!Number.isInteger(
        parsedStudentId
      ) ||
        parsedStudentId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid student ID",
      });
    }

    let attendanceDate = null;

    if (date) {
      attendanceDate =
        normalizeDate(date);

      if (!attendanceDate) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid attendance date",
        });
      }
    }

    /*
     * ----------------------------------------------------------
     * Find courses matching faculty/course filters
     * ----------------------------------------------------------
     */
    const courseWhere = {};

    if (parsedCourseId !== null) {
      courseWhere.id =
        parsedCourseId;
    }

    if (parsedFacultyId !== null) {
      courseWhere.facultyId =
        parsedFacultyId;
    }

    const courses =
      await prisma.course.findMany({
        where: courseWhere,

        select: {
          id: true,
          code: true,
          name: true,
          credits: true,
          facultyId: true,
          semester: true,
          programId: true,
        },

        orderBy: {
          name: "asc",
        },
      });

    const courseIds =
      courses.map(
        (course) => course.id
      );

    /*
     * If course/faculty filtering gives no courses,
     * return an empty result instead of querying
     * unrelated attendance records.
     */
    if (courseIds.length === 0) {
      return res.status(200).json({
        success: true,

        filters: {
          date: date || null,
          courseId:
            parsedCourseId,
          facultyId:
            parsedFacultyId,
          studentId:
            parsedStudentId,
        },

        summary: {
          totalRecords: 0,
          present: 0,
          absent: 0,
          late: 0,
          attended: 0,
          attendancePercentage: 0,
        },

        records: [],
      });
    }

    /*
     * ----------------------------------------------------------
     * Build attendance query
     * ----------------------------------------------------------
     */
    const attendanceWhere = {
      courseId: {
        in: courseIds,
      },
    };

    if (attendanceDate) {
      attendanceWhere.date =
        attendanceDate;
    }

    if (parsedStudentId !== null) {
      attendanceWhere.studentId =
        parsedStudentId;
    }

    const attendance =
      await prisma.attendanceRecord.findMany(
        {
          where: attendanceWhere,

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

            course: {
              select: {
                id: true,
                code: true,
                name: true,
                credits: true,
                facultyId: true,
                semester: true,
                programId: true,
              },
            },
          },

          orderBy: [
            {
              date: "desc",
            },
            {
              courseId: "asc",
            },
            {
              studentId: "asc",
            },
          ],
        }
      );

    /*
     * ----------------------------------------------------------
     * Get faculty information
     * ----------------------------------------------------------
     */
    const facultyIds = [
      ...new Set(
        courses
          .map(
            (course) =>
              course.facultyId
          )
          .filter(
            (id) =>
              id !== null &&
              id !== undefined
          )
      ),
    ];

    const facultyRecords =
      facultyIds.length > 0
        ? await prisma.faculty.findMany({
            where: {
              id: {
                in: facultyIds,
              },
            },

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
          })
        : [];

    const facultyMap =
      new Map(
        facultyRecords.map(
          (faculty) => [
            faculty.id,
            faculty,
          ]
        )
      );

    /*
     * ----------------------------------------------------------
     * Calculate summary
     * ----------------------------------------------------------
     */
    const totalRecords =
      attendance.length;

    const present =
      attendance.filter(
        (record) =>
          String(record.status)
            .toUpperCase() ===
          "PRESENT"
      ).length;

    const absent =
      attendance.filter(
        (record) =>
          String(record.status)
            .toUpperCase() ===
          "ABSENT"
      ).length;

    const late =
      attendance.filter(
        (record) =>
          String(record.status)
            .toUpperCase() ===
          "LATE"
      ).length;

    const attended =
      present + late;

    const attendancePercentage =
      totalRecords === 0
        ? 0
        : Number(
            (
              (attended /
                totalRecords) *
              100
            ).toFixed(1)
          );

    /*
     * ----------------------------------------------------------
     * Format records for Admin Dashboard
     * ----------------------------------------------------------
     */
    const formattedRecords =
      attendance.map(
        (record) => {
          const faculty =
            facultyMap.get(
              record.course.facultyId
            );

          return {
            id: record.id,

            date: record.date,

            status: record.status,

            createdAt:
              record.createdAt,

            updatedAt:
              record.updatedAt,

            student: {
              id:
                record.student.id,

              firstName:
                record.student.user
                  ?.firstName || "",

              lastName:
                record.student.user
                  ?.lastName || "",

              email:
                record.student.user
                  ?.email || "",

              batch:
                record.student.batch,

              division:
                record.student.division,

              semester:
                record.student.semester,
            },

            course: {
              id:
                record.course.id,

              code:
                record.course.code,

              name:
                record.course.name,

              credits:
                record.course.credits,

              semester:
                record.course.semester,

              programId:
                record.course.programId,
            },

            faculty: faculty
              ? {
                  id:
                    faculty.id,

                  employeeId:
                    faculty.employeeId,

                  firstName:
                    faculty.user
                      ?.firstName || "",

                  lastName:
                    faculty.user
                      ?.lastName || "",

                  email:
                    faculty.user
                      ?.email || "",
                }
              : null,
          };
        }
      );

    return res.status(200).json({
      success: true,

      filters: {
        date: date || null,
        courseId:
          parsedCourseId,
        facultyId:
          parsedFacultyId,
        studentId:
          parsedStudentId,
      },

      summary: {
        totalRecords,
        present,
        absent,
        late,
        attended,
        attendancePercentage,
      },

      records:
        formattedRecords,
    });
  } catch (error) {
    console.error(
      "Get admin attendance error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch admin attendance",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| ADMIN - GET ATTENDANCE SUMMARY
|--------------------------------------------------------------------------
|
| Returns overall attendance statistics without requiring
| the frontend to process every individual record.
|
| Supported query parameters:
|
| ?date=2026-09-12
| ?courseId=1
| ?facultyId=1
| ?studentId=1
|
|--------------------------------------------------------------------------
*/
export const getAdminAttendanceSummary =
  async (req, res) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message:
            "Only admin can access attendance summary",
        });
      }

      const {
        date,
        courseId,
        facultyId,
        studentId,
      } = req.query;

      const parsedCourseId =
        courseId
          ? Number(courseId)
          : null;

      const parsedFacultyId =
        facultyId
          ? Number(facultyId)
          : null;

      const parsedStudentId =
        studentId
          ? Number(studentId)
          : null;

      if (
        parsedCourseId !== null &&
        (!Number.isInteger(
          parsedCourseId
        ) ||
          parsedCourseId <= 0)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid course ID",
        });
      }

      if (
        parsedFacultyId !== null &&
        (!Number.isInteger(
          parsedFacultyId
        ) ||
        parsedFacultyId <= 0)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid faculty ID",
        });
      }

      if (
        parsedStudentId !== null &&
        (!Number.isInteger(
          parsedStudentId
        ) ||
        parsedStudentId <= 0)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student ID",
        });
      }

      let attendanceDate = null;

      if (date) {
        attendanceDate =
          normalizeDate(date);

        if (!attendanceDate) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid attendance date",
          });
        }
      }

      const courseWhere = {};

      if (parsedCourseId !== null) {
        courseWhere.id =
          parsedCourseId;
      }

      if (parsedFacultyId !== null) {
        courseWhere.facultyId =
          parsedFacultyId;
      }

      const courses =
        await prisma.course.findMany({
          where: courseWhere,

          select: {
            id: true,
          },
        });

      const courseIds =
        courses.map(
          (course) => course.id
        );

      if (courseIds.length === 0) {
        return res.status(200).json({
          success: true,

          summary: {
            totalRecords: 0,
            present: 0,
            absent: 0,
            late: 0,
            attended: 0,
            attendancePercentage: 0,
          },
        });
      }

      const where = {
        courseId: {
          in: courseIds,
        },
      };

      if (attendanceDate) {
        where.date =
          attendanceDate;
      }

      if (parsedStudentId !== null) {
        where.studentId =
          parsedStudentId;
      }

      const records =
        await prisma.attendanceRecord.findMany(
          {
            where,

            select: {
              status: true,
            },
          }
        );

      const totalRecords =
        records.length;

      const present =
        records.filter(
          (record) =>
            String(record.status)
              .toUpperCase() ===
            "PRESENT"
        ).length;

      const absent =
        records.filter(
          (record) =>
            String(record.status)
              .toUpperCase() ===
            "ABSENT"
        ).length;

      const late =
        records.filter(
          (record) =>
            String(record.status)
              .toUpperCase() ===
            "LATE"
        ).length;

      const attended =
        present + late;

      const attendancePercentage =
        totalRecords === 0
          ? 0
          : Number(
              (
                (attended /
                  totalRecords) *
                100
              ).toFixed(1)
            );

      return res.status(200).json({
        success: true,

        summary: {
          totalRecords,
          present,
          absent,
          late,
          attended,
          attendancePercentage,
        },
      });
    } catch (error) {
      console.error(
        "Get admin attendance summary error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch admin attendance summary",
        error: error.message,
      });
    }
  };

export default {
  markAttendance,
  getFacultyCourseAttendance,
  markFacultyAttendance,
  getMyAttendance,
  getMyCourseAttendance,
  getAdminAttendance,
  getAdminAttendanceSummary,
};