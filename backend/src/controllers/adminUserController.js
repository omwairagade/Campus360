import prisma from "../lib/prisma.js";

/*
  ==========================================
  ADMIN USERS CONTROLLER
  ==========================================
*/


/* =========================================================
   GET ALL USERS
   GET /api/admin/users
   ========================================================= */

export const getAdminUsers = async (req, res) => {
  try {
    const {
      search = "",
      role,
      isActive,
    } = req.query;

    const where = {};

    /* -----------------------------
       ROLE FILTER
    ----------------------------- */

    if (role) {
      const normalizedRole =
        String(role).trim().toUpperCase();

      const validRoles = [
        "STUDENT",
        "FACULTY",
        "ADMIN",
        "PARENT",
      ];

      if (!validRoles.includes(normalizedRole)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user role.",
        });
      }

      where.role = normalizedRole;
    }

    /* -----------------------------
       ACTIVE STATUS FILTER
    ----------------------------- */

    if (isActive !== undefined) {
      if (
        isActive !== "true" &&
        isActive !== "false"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "isActive must be true or false.",
        });
      }

      where.isActive =
        isActive === "true";
    }

    /* -----------------------------
       SEARCH
    ----------------------------- */

    if (search.trim()) {
      const searchText = search.trim();

      where.OR = [
        {
          firstName: {
            contains: searchText,
            mode: "insensitive",
          },
        },

        {
          lastName: {
            contains: searchText,
            mode: "insensitive",
          },
        },

        {
          email: {
            contains: searchText,
            mode: "insensitive",
          },
        },
      ];
    }

    const users = await prisma.user.findMany({
      where,

      orderBy: {
        id: "asc",
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,

        student: {
          select: {
            id: true,
            enrollmentNumber: true,
            semester: true,
            admissionYear: true,

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

        faculty: {
          select: {
            id: true,
            employeeId: true,
            designation: true,

            department: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully.",
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(
      "Get admin users error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
      error: error.message,
    });
  }
};


/* =========================================================
   GET USER BY ID
   GET /api/admin/users/:id
   ========================================================= */

export const getAdminUserById = async (
  req,
  res
) => {
  try {
    const userId = Number(req.params.id);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,

        student: {
          select: {
            id: true,
            enrollmentNumber: true,
            semester: true,
            admissionYear: true,
            phone: true,
            dateOfBirth: true,

            departmentRel: {
              select: {
                id: true,
                name: true,
                code: true,
                description: true,
              },
            },

            programRel: {
              select: {
                id: true,
                name: true,
                code: true,
                durationYears: true,
              },
            },
          },
        },

        faculty: {
          select: {
            id: true,
            employeeId: true,
            designation: true,

            department: {
              select: {
                id: true,
                name: true,
                code: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "User details fetched successfully.",
      user,
    });
  } catch (error) {
    console.error(
      "Get admin user by ID error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch user details.",
      error: error.message,
    });
  }
};


/* =========================================================
   UPDATE USER STATUS
   PATCH /api/admin/users/:id/status
   ========================================================= */

export const updateAdminUserStatus = async (
  req,
  res
) => {
  try {
    const userId = Number(req.params.id);
    const { isActive } = req.body;

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message:
          "isActive must be true or false.",
      });
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          role: true,
          isActive: true,
        },
      });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    /*
      Prevent an admin from accidentally
      disabling the currently logged-in
      admin account.
    */

    if (
      existingUser.id === req.user?.userId &&
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
          id: userId,
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
        ? "User account activated successfully."
        : "User account deactivated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "Update admin user status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update user account status.",
      error: error.message,
    });
  }
};


/* =========================================================
   GET USER COUNTS
   GET /api/admin/users/stats
   ========================================================= */

export const getAdminUserStats = async (
  req,
  res
) => {
  try {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalStudents,
      totalFaculty,
      totalAdmins,
      totalParents,
    ] = await Promise.all([
      prisma.user.count(),

      prisma.user.count({
        where: {
          isActive: true,
        },
      }),

      prisma.user.count({
        where: {
          isActive: false,
        },
      }),

      prisma.user.count({
        where: {
          role: "STUDENT",
        },
      }),

      prisma.user.count({
        where: {
          role: "FACULTY",
        },
      }),

      prisma.user.count({
        where: {
          role: "ADMIN",
        },
      }),

      prisma.user.count({
        where: {
          role: "PARENT",
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message:
        "User statistics fetched successfully.",
      stats: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,

        roles: {
          students: totalStudents,
          faculty: totalFaculty,
          admins: totalAdmins,
          parents: totalParents,
        },
      },
    });
  } catch (error) {
    console.error(
      "Get admin user stats error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch user statistics.",
      error: error.message,
    });
  }
};