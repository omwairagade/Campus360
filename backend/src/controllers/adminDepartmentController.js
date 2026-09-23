import prisma from "../lib/prisma.js";

const parseId = (value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

// GET /api/admin/departments
export const getAdminDepartments = async (req, res) => {
  try {
    const { search = "" } = req.query;

    const departments = await prisma.department.findMany({
      where: search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                code: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : undefined,

      include: {
        _count: {
          select: {
            faculty: true,
            courses: true,
            programs: true,
            students: true,
            feeStructures: true,
          },
        },
      },

      orderBy: {
        id: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error("Get admin departments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch departments.",
      error: error?.message,
    });
  }
};

// GET /api/admin/departments/:id
export const getAdminDepartmentById = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID.",
      });
    }

    const department = await prisma.department.findUnique({
      where: {
        id,
      },

      include: {
        faculty: true,
        courses: true,
        programs: true,
        students: true,

        feeStructures: {
          include: {
            program: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            academicYear: {
              select: {
                id: true,
                name: true,
                startYear: true,
                endYear: true,
                isActive: true,
              },
            },
            components: {
              orderBy: {
                id: "asc",
              },
            },
          },
          orderBy: {
            id: "asc",
          },
        },

        _count: {
          select: {
            faculty: true,
            courses: true,
            programs: true,
            students: true,
            feeStructures: true,
          },
        },
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    console.error("Get admin department details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch department details.",
      error: error?.message,
    });
  }
};

// POST /api/admin/departments
export const createAdminDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    const departmentName = String(name || "").trim();
    const departmentCode = String(code || "").trim().toUpperCase();
    const departmentDescription = String(description || "").trim();

    if (!departmentName || !departmentCode) {
      return res.status(400).json({
        success: false,
        message: "Department name and code are required.",
      });
    }

    const existingDepartment = await prisma.department.findFirst({
      where: {
        OR: [
          {
            name: {
              equals: departmentName,
              mode: "insensitive",
            },
          },
          {
            code: {
              equals: departmentCode,
              mode: "insensitive",
            },
          },
        ],
      },
    });

    if (existingDepartment) {
      return res.status(409).json({
        success: false,
        message: "A department with the same name or code already exists.",
      });
    }

    const department = await prisma.department.create({
      data: {
        name: departmentName,
        code: departmentCode,
        description: departmentDescription || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Department created successfully.",
      data: department,
    });
  } catch (error) {
    console.error("Create admin department error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create department.",
      error: error?.message,
    });
  }
};

// PATCH /api/admin/departments/:id
export const updateAdminDepartment = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID.",
      });
    }

    const { name, code, description } = req.body;

    const existingDepartment = await prisma.department.findUnique({
      where: {
        id,
      },
    });

    if (!existingDepartment) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    if (name === undefined && code === undefined && description === undefined) {
      return res.status(400).json({
        success: false,
        message: "No fields provided for update.",
      });
    }

    const trimmedName =
      name !== undefined ? String(name).trim() : undefined;

    const normalizedCode =
      code !== undefined
        ? String(code).trim().toUpperCase()
        : undefined;

    const trimmedDescription =
      description !== undefined
        ? String(description).trim()
        : undefined;

    if (name !== undefined && !trimmedName) {
      return res.status(400).json({
        success: false,
        message: "Department name cannot be empty.",
      });
    }

    if (code !== undefined && !normalizedCode) {
      return res.status(400).json({
        success: false,
        message: "Department code cannot be empty.",
      });
    }

    if (name !== undefined || code !== undefined) {
      const duplicateConditions = [];

      if (name !== undefined) {
        duplicateConditions.push({
          name: {
            equals: trimmedName,
            mode: "insensitive",
          },
        });
      }

      if (code !== undefined) {
        duplicateConditions.push({
          code: {
            equals: normalizedCode,
            mode: "insensitive",
          },
        });
      }

      const duplicate = await prisma.department.findFirst({
        where: {
          id: {
            not: id,
          },
          OR: duplicateConditions,
        },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another department already uses that name or code.",
        });
      }
    }

    const data = {};

    if (name !== undefined) {
      data.name = trimmedName;
    }

    if (code !== undefined) {
      data.code = normalizedCode;
    }

    if (description !== undefined) {
      data.description = trimmedDescription || null;
    }

    const department = await prisma.department.update({
      where: {
        id,
      },
      data,
    });

    return res.status(200).json({
      success: true,
      message: "Department updated successfully.",
      data: department,
    });
  } catch (error) {
    console.error("Update admin department error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update department.",
      error: error?.message,
    });
  }
};

// DELETE /api/admin/departments/:id
export const deleteAdminDepartment = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID.",
      });
    }

    const department = await prisma.department.findUnique({
      where: {
        id,
      },

      include: {
        _count: {
          select: {
            faculty: true,
            courses: true,
            programs: true,
            students: true,
            feeStructures: true,
          },
        },
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    const linkedRecords =
      department._count.faculty +
      department._count.courses +
      department._count.programs +
      department._count.students +
      department._count.feeStructures;

    if (linkedRecords > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This department cannot be deleted because it is linked to existing faculty, courses, programs, students, or fee structures.",
      });
    }

    await prisma.department.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Department deleted successfully.",
    });
  } catch (error) {
    console.error("Delete admin department error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete department.",
      error: error?.message,
    });
  }
};