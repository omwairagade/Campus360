import prisma from "../lib/prisma.js";

/*
  ==========================================
  ADMIN ASSIGNMENTS CONTROLLER
  ==========================================
*/

/* =========================================================
   GET ALL ASSIGNMENTS
   GET /api/admin/assignments
   ========================================================= */

export const getAdminAssignments = async (req, res) => {
  try {
    const {
      search,
      courseId,
      facultyId,
    } = req.query;

    const where = {};

    if (courseId) {
      const parsedCourseId = Number(courseId);

      if (
        !Number.isInteger(parsedCourseId) ||
        parsedCourseId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid courseId",
        });
      }

      where.courseId = parsedCourseId;
    }

    if (facultyId) {
      const parsedFacultyId = Number(facultyId);

      if (
        !Number.isInteger(parsedFacultyId) ||
        parsedFacultyId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid facultyId",
        });
      }

      where.facultyId = parsedFacultyId;
    }

    if (search) {
      const searchText = String(search).trim();

      where.OR = [
        {
          title: {
            contains: searchText,
            mode: "insensitive",
          },
        },
        {
          description: {
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

    const assignments =
      await prisma.assignment.findMany({
        where,
        include: {
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
                  isActive: true,
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

          _count: {
            select: {
              submissions: true,
            },
          },
        },

        orderBy: {
          dueDate: "asc",
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Assignments fetched successfully",
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error(
      "Get admin assignments error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch assignments",
      error: error.message,
    });
  }
};


/* =========================================================
   GET ASSIGNMENT BY ID
   GET /api/admin/assignments/:id
   ========================================================= */

export const getAdminAssignmentById =
  async (req, res) => {
    try {
      const assignmentId =
        Number(req.params.id);

      if (
        !Number.isInteger(assignmentId) ||
        assignmentId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment ID",
        });
      }

      const assignment =
        await prisma.assignment.findUnique({
          where: {
            id: assignmentId,
          },

          include: {
            course: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
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
                    isActive: true,
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

            submissions: {
              include: {
                student: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        isActive: true,
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

              orderBy: [
                {
                  submittedAt: "desc",
                },
                {
                  createdAt: "desc",
                },
              ],
            },
          },
        });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Assignment details fetched successfully",
        assignment,
      });
    } catch (error) {
      console.error(
        "Get admin assignment by ID error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch assignment details",
        error: error.message,
      });
    }
  };


/* =========================================================
   CREATE ASSIGNMENT
   POST /api/admin/assignments
   ========================================================= */

export const createAdminAssignment =
  async (req, res) => {
    try {
      const {
        title,
        description,
        dueDate,
        maxMarks,
        courseId,
        facultyId,
      } = req.body;

      if (
        !title ||
        !dueDate ||
        maxMarks === undefined ||
        !courseId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "title, dueDate, maxMarks and courseId are required",
        });
      }

      const parsedCourseId =
        Number(courseId);

      const parsedMaxMarks =
        Number(maxMarks);

      if (
        !Number.isInteger(parsedCourseId) ||
        parsedCourseId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid courseId",
        });
      }

      if (
        !Number.isFinite(parsedMaxMarks) ||
        parsedMaxMarks <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "maxMarks must be greater than zero",
        });
      }

      const parsedDueDate =
        new Date(dueDate);

      if (
        Number.isNaN(
          parsedDueDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date",
        });
      }

      let parsedFacultyId = null;

      if (
        facultyId !== undefined &&
        facultyId !== null &&
        facultyId !== ""
      ) {
        parsedFacultyId =
          Number(facultyId);

        if (
          !Number.isInteger(
            parsedFacultyId
          ) ||
          parsedFacultyId <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid facultyId",
          });
        }
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
          message: "Course not found",
        });
      }

      if (parsedFacultyId !== null) {
        const faculty =
          await prisma.faculty.findUnique({
            where: {
              id: parsedFacultyId,
            },
          });

        if (!faculty) {
          return res.status(404).json({
            success: false,
            message: "Faculty not found",
          });
        }
      }

      const assignment =
        await prisma.assignment.create({
          data: {
            title: String(title).trim(),

            description:
              description !== undefined &&
              description !== null
                ? String(description).trim()
                : null,

            dueDate: parsedDueDate,

            maxMarks:
              Math.round(parsedMaxMarks),

            courseId: parsedCourseId,

            facultyId: parsedFacultyId,
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
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },

            _count: {
              select: {
                submissions: true,
              },
            },
          },
        });

      return res.status(201).json({
        success: true,
        message:
          "Assignment created successfully",
        assignment,
      });
    } catch (error) {
      console.error(
        "Create admin assignment error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to create assignment",
        error: error.message,
      });
    }
  };


/* =========================================================
   UPDATE ASSIGNMENT
   PATCH /api/admin/assignments/:id
   ========================================================= */

export const updateAdminAssignment =
  async (req, res) => {
    try {
      const assignmentId =
        Number(req.params.id);

      if (
        !Number.isInteger(assignmentId) ||
        assignmentId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment ID",
        });
      }

      const existingAssignment =
        await prisma.assignment.findUnique({
          where: {
            id: assignmentId,
          },
        });

      if (!existingAssignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      const {
        title,
        description,
        dueDate,
        maxMarks,
        courseId,
        facultyId,
      } = req.body;

      const data = {};

      if (title !== undefined) {
        const trimmedTitle =
          String(title).trim();

        if (!trimmedTitle) {
          return res.status(400).json({
            success: false,
            message:
              "Assignment title cannot be empty",
          });
        }

        data.title = trimmedTitle;
      }

      if (description !== undefined) {
        data.description =
          description === null
            ? null
            : String(description).trim();
      }

      if (dueDate !== undefined) {
        const parsedDueDate =
          new Date(dueDate);

        if (
          Number.isNaN(
            parsedDueDate.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid due date",
          });
        }

        data.dueDate = parsedDueDate;
      }

      if (maxMarks !== undefined) {
        const parsedMaxMarks =
          Number(maxMarks);

        if (
          !Number.isFinite(
            parsedMaxMarks
          ) ||
          parsedMaxMarks <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "maxMarks must be greater than zero",
          });
        }

        data.maxMarks =
          Math.round(parsedMaxMarks);
      }

      if (courseId !== undefined) {
        const parsedCourseId =
          Number(courseId);

        if (
          !Number.isInteger(
            parsedCourseId
          ) ||
          parsedCourseId <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid courseId",
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
            message: "Course not found",
          });
        }

        data.courseId =
          parsedCourseId;
      }

      if (facultyId !== undefined) {
        if (
          facultyId === null ||
          facultyId === ""
        ) {
          data.facultyId = null;
        } else {
          const parsedFacultyId =
            Number(facultyId);

          if (
            !Number.isInteger(
              parsedFacultyId
            ) ||
            parsedFacultyId <= 0
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid facultyId",
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
                "Faculty not found",
            });
          }

          data.facultyId =
            parsedFacultyId;
        }
      }

      const updatedAssignment =
        await prisma.assignment.update({
          where: {
            id: assignmentId,
          },

          data,

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
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },

            _count: {
              select: {
                submissions: true,
              },
            },
          },
        });

      return res.status(200).json({
        success: true,
        message:
          "Assignment updated successfully",
        assignment: updatedAssignment,
      });
    } catch (error) {
      console.error(
        "Update admin assignment error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update assignment",
        error: error.message,
      });
    }
  };


/* =========================================================
   DELETE ASSIGNMENT
   DELETE /api/admin/assignments/:id
   ========================================================= */

export const deleteAdminAssignment =
  async (req, res) => {
    try {
      const assignmentId =
        Number(req.params.id);

      if (
        !Number.isInteger(assignmentId) ||
        assignmentId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignment ID",
        });
      }

      const existingAssignment =
        await prisma.assignment.findUnique({
          where: {
            id: assignmentId,
          },

          include: {
            _count: {
              select: {
                submissions: true,
              },
            },
          },
        });

      if (!existingAssignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      /*
        AssignmentSubmission has
        onDelete: Cascade in the current
        Prisma schema.

        Therefore deleting an assignment
        also removes its submissions.
      */

      const deletedAssignment =
        await prisma.assignment.delete({
          where: {
            id: assignmentId,
          },
        });

      return res.status(200).json({
        success: true,
        message:
          "Assignment deleted successfully",

        deletedAssignmentId:
          deletedAssignment.id,

        deletedSubmissions:
          existingAssignment._count.submissions,
      });
    } catch (error) {
      console.error(
        "Delete admin assignment error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete assignment",
        error: error.message,
      });
    }
  };