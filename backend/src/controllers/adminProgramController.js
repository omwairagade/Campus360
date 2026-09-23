import prisma from "../lib/prisma.js";

const parseId = (value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

// =====================================================
// GET ALL PROGRAMS
// GET /api/admin/programs
// =====================================================
export const getAdminPrograms = async (req, res) => {
  try {
    const { search = "", departmentId } = req.query;

    const where = {};

    if (String(search).trim()) {
      const searchText = String(search).trim();

      where.OR = [
        {
          name: {
            contains: searchText,
            mode: "insensitive",
          },
        },
        {
          code: {
            contains: searchText,
            mode: "insensitive",
          },
        },
      ];
    }

    if (departmentId !== undefined && departmentId !== "") {
      const parsedDepartmentId = parseId(departmentId);

      if (!parsedDepartmentId) {
        return res.status(400).json({
          success: false,
          message: "Invalid department ID.",
        });
      }

      where.departmentId = parsedDepartmentId;
    }

    const programs = await prisma.program.findMany({
      where,

      orderBy: {
        id: "asc",
      },

      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        _count: {
          select: {
            students: true,
            courses: true,
            feeStructures: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,

      // Primary response
      programs,

      // Compatibility with existing frontend versions
      data: programs,
    });
  } catch (error) {
    console.error("Get admin programs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch programs.",
      error: error?.message,
    });
  }
};

// =====================================================
// GET SINGLE PROGRAM
// GET /api/admin/programs/:id
// =====================================================
export const getAdminProgramById = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid program ID.",
      });
    }

    const program = await prisma.program.findUnique({
      where: {
        id,
      },

      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        courses: {
          orderBy: {
            id: "asc",
          },

          include: {
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
        },

        students: {
          orderBy: {
            id: "asc",
          },

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
          },
        },

        feeStructures: {
          orderBy: [
            {
              academicYearId: "desc",
            },
            {
              semester: "asc",
            },
            {
              id: "asc",
            },
          ],

          include: {
            department: {
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
        },

        _count: {
          select: {
            students: true,
            courses: true,
            feeStructures: true,
          },
        },
      },
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found.",
      });
    }

    return res.status(200).json({
      success: true,

      // Primary response
      program,

      // Compatibility with existing frontend versions
      data: program,
    });
  } catch (error) {
    console.error("Get admin program details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch program details.",
      error: error?.message,
    });
  }
};

// =====================================================
// CREATE PROGRAM
// POST /api/admin/programs
// =====================================================
export const createAdminProgram = async (req, res) => {
  try {
    const {
      name,
      code,
      durationYears,
      departmentId,
    } = req.body;

    const programName = String(name || "").trim();
    const programCode = String(code || "").trim().toUpperCase();

    if (
      !programName ||
      !programCode ||
      durationYears === undefined ||
      !departmentId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Program name, code, duration and department are required.",
      });
    }

    const parsedDepartmentId = parseId(departmentId);
    const parsedDurationYears = Number(durationYears);

    if (!parsedDepartmentId) {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID.",
      });
    }

    if (
      !Number.isInteger(parsedDurationYears) ||
      parsedDurationYears <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Duration must be a positive whole number.",
      });
    }

    const department = await prisma.department.findUnique({
      where: {
        id: parsedDepartmentId,
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    const existingProgram = await prisma.program.findFirst({
      where: {
        OR: [
          {
            name: {
              equals: programName,
              mode: "insensitive",
            },
          },
          {
            code: {
              equals: programCode,
              mode: "insensitive",
            },
          },
        ],
      },
    });

    if (existingProgram) {
      return res.status(409).json({
        success: false,
        message:
          "A program with the same name or code already exists.",
      });
    }

    const program = await prisma.program.create({
      data: {
        name: programName,
        code: programCode,
        durationYears: parsedDurationYears,
        departmentId: parsedDepartmentId,
      },

      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Program created successfully.",
      program,
      data: program,
    });
  } catch (error) {
    console.error("Create admin program error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create program.",
      error: error?.message,
    });
  }
};

// =====================================================
// UPDATE PROGRAM
// PATCH /api/admin/programs/:id
// =====================================================
export const updateAdminProgram = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid program ID.",
      });
    }

    const {
      name,
      code,
      durationYears,
      departmentId,
    } = req.body;

    const existingProgram = await prisma.program.findUnique({
      where: {
        id,
      },

      include: {
        _count: {
          select: {
            feeStructures: true,
          },
        },
      },
    });

    if (!existingProgram) {
      return res.status(404).json({
        success: false,
        message: "Program not found.",
      });
    }

    const data = {};

    if (name !== undefined) {
      const programName = String(name).trim();

      if (!programName) {
        return res.status(400).json({
          success: false,
          message: "Program name cannot be empty.",
        });
      }

      data.name = programName;
    }

    if (code !== undefined) {
      const programCode = String(code).trim().toUpperCase();

      if (!programCode) {
        return res.status(400).json({
          success: false,
          message: "Program code cannot be empty.",
        });
      }

      data.code = programCode;
    }

    if (durationYears !== undefined) {
      const parsedDurationYears = Number(durationYears);

      if (
        !Number.isInteger(parsedDurationYears) ||
        parsedDurationYears <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Duration must be a positive whole number.",
        });
      }

      data.durationYears = parsedDurationYears;
    }

    if (departmentId !== undefined) {
      const parsedDepartmentId = parseId(departmentId);

      if (!parsedDepartmentId) {
        return res.status(400).json({
          success: false,
          message: "Invalid department ID.",
        });
      }

      const department = await prisma.department.findUnique({
        where: {
          id: parsedDepartmentId,
        },
      });

      if (!department) {
        return res.status(404).json({
          success: false,
          message: "Department not found.",
        });
      }

      data.departmentId = parsedDepartmentId;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided for update.",
      });
    }

    // If the program already has fee structures, changing its
    // department can make the fee structures inconsistent.
    if (
      data.departmentId !== undefined &&
      data.departmentId !== existingProgram.departmentId &&
      existingProgram._count.feeStructures > 0
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This program cannot be moved to another department because it already has fee structures.",
      });
    }

    if (data.name || data.code) {
      const duplicateConditions = [];

      if (data.name) {
        duplicateConditions.push({
          name: {
            equals: data.name,
            mode: "insensitive",
          },
        });
      }

      if (data.code) {
        duplicateConditions.push({
          code: {
            equals: data.code,
            mode: "insensitive",
          },
        });
      }

      const duplicate = await prisma.program.findFirst({
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
          message:
            "Another program already uses that name or code.",
        });
      }
    }

    const program = await prisma.program.update({
      where: {
        id,
      },

      data,

      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Program updated successfully.",
      program,
      data: program,
    });
  } catch (error) {
    console.error("Update admin program error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update program.",
      error: error?.message,
    });
  }
};

// =====================================================
// DELETE PROGRAM
// DELETE /api/admin/programs/:id
// =====================================================
export const deleteAdminProgram = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid program ID.",
      });
    }

    const program = await prisma.program.findUnique({
      where: {
        id,
      },

      include: {
        _count: {
          select: {
            students: true,
            courses: true,
            feeStructures: true,
          },
        },
      },
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found.",
      });
    }

    const linkedRecords =
      program._count.students +
      program._count.courses +
      program._count.feeStructures;

    if (linkedRecords > 0) {
      const reasons = [];

      if (program._count.students > 0) {
        reasons.push("students");
      }

      if (program._count.courses > 0) {
        reasons.push("courses");
      }

      if (program._count.feeStructures > 0) {
        reasons.push("fee structures");
      }

      return res.status(409).json({
        success: false,
        message:
          `This program cannot be deleted because it is linked to existing ${reasons.join(
            ", "
          )}.`,
      });
    }

    await prisma.program.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Program deleted successfully.",
      data: null,
    });
  } catch (error) {
    console.error("Delete admin program error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete program.",
      error: error?.message,
    });
  }
};