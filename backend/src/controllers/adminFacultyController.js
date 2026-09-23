import prisma from "../lib/prisma.js";

/*
  ==========================================
  ADMIN FACULTY CONTROLLER
  ==========================================
*/


/* =========================================================
   GET ALL FACULTY
   GET /api/admin/faculty
   ========================================================= */

export const getAdminFaculty = async (
  req,
  res
) => {
  try {
    const {
      search = "",
      departmentId,
    } = req.query;

    const where = {};

    /*
      -----------------------------------------
      DEPARTMENT FILTER
      -----------------------------------------
    */

    if (departmentId) {
      const parsedDepartmentId =
        Number(departmentId);

      if (
        !Number.isInteger(
          parsedDepartmentId
        ) ||
        parsedDepartmentId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid department ID.",
        });
      }

      where.departmentId =
        parsedDepartmentId;
    }

    /*
      -----------------------------------------
      SEARCH
      -----------------------------------------
    */

    if (search.trim()) {
      const searchText =
        search.trim();

      where.OR = [
        {
          employeeId: {
            contains: searchText,
            mode: "insensitive",
          },
        },
        {
          user: {
            firstName: {
              contains: searchText,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            lastName: {
              contains: searchText,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            email: {
              contains: searchText,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    /*
      -----------------------------------------
      FETCH FACULTY
      -----------------------------------------
    */

    const faculty =
      await prisma.faculty.findMany({
        where,

        orderBy: {
          employeeId: "asc",
        },

        select: {
          id: true,
          employeeId: true,
          designation: true,
          departmentId: true,
          createdAt: true,
          updatedAt: true,

          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          },

          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },

          courses: {
            select: {
              id: true,
              code: true,
              name: true,
              semester: true,
              type: true,
              credits: true,
            },

            orderBy: {
              code: "asc",
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Faculty fetched successfully.",
      count: faculty.length,
      data: faculty,
    });
  } catch (error) {
    console.error(
      "Get admin faculty error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch faculty.",
      error: error?.message,
    });
  }
};


/* =========================================================
   GET FACULTY BY ID
   GET /api/admin/faculty/:id
   ========================================================= */

export const getAdminFacultyById =
  async (req, res) => {
    try {
      const facultyId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          facultyId
        ) ||
        facultyId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid faculty ID.",
        });
      }

      const faculty =
        await prisma.faculty.findUnique({
          where: {
            id: facultyId,
          },

          select: {
            id: true,
            employeeId: true,
            designation: true,
            departmentId: true,
            createdAt: true,
            updatedAt: true,

            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
              },
            },

            department: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },

            courses: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                credits: true,
                semester: true,
                type: true,

                program: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    durationYears: true,
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

              orderBy: {
                code: "asc",
              },
            },
          },
        });

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message:
            "Faculty not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Faculty details fetched successfully.",
        data: faculty,
      });
    } catch (error) {
      console.error(
        "Get admin faculty by ID error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch faculty details.",
        error: error?.message,
      });
    }
  };


/* =========================================================
   UPDATE FACULTY ACCOUNT STATUS
   PATCH /api/admin/faculty/:id/status
   ========================================================= */

export const updateAdminFacultyStatus =
  async (req, res) => {
    try {
      const facultyId =
        Number(req.params.id);

      const {
        isActive,
      } = req.body;

      if (
        !Number.isInteger(
          facultyId
        ) ||
        facultyId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid faculty ID.",
        });
      }

      if (
        typeof isActive !==
        "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "isActive must be true or false.",
        });
      }

      const faculty =
        await prisma.faculty.findUnique({
          where: {
            id: facultyId,
          },

          select: {
            id: true,
            userId: true,

            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                isActive: true,
              },
            },
          },
        });

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message:
            "Faculty not found.",
        });
      }

      /*
        Prevent the logged-in admin from
        disabling their own account if the
        records ever overlap.
      */

      if (
        faculty.userId ===
          req.user?.userId &&
        !isActive
      ) {
        return res.status(400).json({
          success: false,
          message:
            "You cannot deactivate your own account.",
        });
      }

      const updatedUser =
        await prisma.user.update({
          where: {
            id: faculty.userId,
          },

          data: {
            isActive,
          },

          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true,
            updatedAt: true,
          },
        });

      return res.status(200).json({
        success: true,
        message: isActive
          ? "Faculty account activated successfully."
          : "Faculty account deactivated successfully.",
        data: {
          facultyId:
            faculty.id,
          user: updatedUser,
        },
      });
    } catch (error) {
      console.error(
        "Update admin faculty status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update faculty account status.",
        error: error?.message,
      });
    }
  };