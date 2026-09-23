import prisma from "../lib/prisma.js";

const parseId = (value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const parsePositiveAmount = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Math.round(amount);
};

const parseSemester = (value) => {
  const semester = Number(value);

  if (!Number.isInteger(semester) || semester < 1 || semester > 20) {
    return null;
  }

  return semester;
};

const normalizeComponents = (components) => {
  if (!Array.isArray(components)) {
    return null;
  }

  return components.map((component) => {
    const name = String(component?.name || "").trim();
    const description = String(component?.description || "").trim();
    const amount = parsePositiveAmount(component?.amount);

    if (!name || amount === null) {
      return null;
    }

    return {
      name,
      description: description || null,
      amount,
    };
  });
};

// =====================================================
// GET ALL FEE STRUCTURES
// GET /api/admin/fee-structures
// =====================================================
export const getAdminFeeStructures = async (req, res) => {
  try {
    const {
      search = "",
      departmentId,
      programId,
      academicYearId,
      semester,
      active,
    } = req.query;

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
          description: {
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

    if (programId !== undefined && programId !== "") {
      const parsedProgramId = parseId(programId);

      if (!parsedProgramId) {
        return res.status(400).json({
          success: false,
          message: "Invalid program ID.",
        });
      }

      where.programId = parsedProgramId;
    }

    if (academicYearId !== undefined && academicYearId !== "") {
      const parsedAcademicYearId = parseId(academicYearId);

      if (!parsedAcademicYearId) {
        return res.status(400).json({
          success: false,
          message: "Invalid academic year ID.",
        });
      }

      where.academicYearId = parsedAcademicYearId;
    }

    if (semester !== undefined && semester !== "") {
      const parsedSemester = parseSemester(semester);

      if (!parsedSemester) {
        return res.status(400).json({
          success: false,
          message: "Invalid semester.",
        });
      }

      where.semester = parsedSemester;
    }

    if (active !== undefined && active !== "") {
      if (active === "true") {
        where.isActive = true;
      } else if (active === "false") {
        where.isActive = false;
      }
    }

    const feeStructures = await prisma.feeStructure.findMany({
      where,

      include: {
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
            durationYears: true,
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

        _count: {
          select: {
            components: true,
            fees: true,
          },
        },
      },

      orderBy: [
        {
          academicYearId: "desc",
        },
        {
          programId: "asc",
        },
        {
          semester: "asc",
        },
      ],
    });

    return res.status(200).json({
      success: true,
      feeStructures,
      data: feeStructures,
    });
  } catch (error) {
    console.error("Get admin fee structures error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch fee structures.",
      error: error?.message,
    });
  }
};

// =====================================================
// GET SINGLE FEE STRUCTURE
// GET /api/admin/fee-structures/:id
// =====================================================
export const getAdminFeeStructureById = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid fee structure ID.",
      });
    }

    const feeStructure = await prisma.feeStructure.findUnique({
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

        program: {
          select: {
            id: true,
            name: true,
            code: true,
            durationYears: true,
            departmentId: true,
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

        fees: {
          select: {
            id: true,
            studentId: true,
            title: true,
            totalAmount: true,
            paidAmount: true,
            dueDate: true,
            status: true,
          },
          orderBy: {
            id: "asc",
          },
        },

        _count: {
          select: {
            components: true,
            fees: true,
          },
        },
      },
    });

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found.",
      });
    }

    return res.status(200).json({
      success: true,
      feeStructure,
      data: feeStructure,
    });
  } catch (error) {
    console.error("Get admin fee structure details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch fee structure details.",
      error: error?.message,
    });
  }
};

// =====================================================
// CREATE FEE STRUCTURE
// POST /api/admin/fee-structures
// =====================================================
export const createAdminFeeStructure = async (req, res) => {
  try {
    const {
      departmentId,
      programId,
      academicYearId,
      semester,
      name,
      description,
      totalAmount,
      dueDate,
      isActive = true,
      components = [],
    } = req.body;

    const parsedDepartmentId = parseId(departmentId);
    const parsedProgramId = parseId(programId);
    const parsedAcademicYearId = parseId(academicYearId);
    const parsedSemester = parseSemester(semester);

    const feeStructureName = String(name || "").trim();
    const feeStructureDescription = String(description || "").trim();

    if (
      !parsedDepartmentId ||
      !parsedProgramId ||
      !parsedAcademicYearId ||
      !parsedSemester ||
      !feeStructureName
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Department, program, academic year, semester and fee structure name are required.",
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

    const program = await prisma.program.findUnique({
      where: {
        id: parsedProgramId,
      },
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found.",
      });
    }

    // Important:
    // A program must belong to the selected department.
    if (program.departmentId !== parsedDepartmentId) {
      return res.status(400).json({
        success: false,
        message:
          "The selected program does not belong to the selected department.",
      });
    }

    const academicYear = await prisma.academicYear.findUnique({
      where: {
        id: parsedAcademicYearId,
      },
    });

    if (!academicYear) {
      return res.status(404).json({
        success: false,
        message: "Academic year not found.",
      });
    }

    const normalizedComponents = normalizeComponents(components);

    if (normalizedComponents === null) {
      return res.status(400).json({
        success: false,
        message: "Components must be provided as an array.",
      });
    }

    if (normalizedComponents.some((component) => component === null)) {
      return res.status(400).json({
        success: false,
        message:
          "Every fee component must have a name and a valid amount.",
      });
    }

    const componentTotal = normalizedComponents.reduce(
      (sum, component) => sum + component.amount,
      0
    );

    let parsedTotalAmount;

    if (totalAmount !== undefined && totalAmount !== null && totalAmount !== "") {
      parsedTotalAmount = parsePositiveAmount(totalAmount);

      if (parsedTotalAmount === null) {
        return res.status(400).json({
          success: false,
          message: "Total amount must be a valid non-negative amount.",
        });
      }

      if (
        normalizedComponents.length > 0 &&
        parsedTotalAmount !== componentTotal
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Total amount (${parsedTotalAmount}) must equal the sum of fee components (${componentTotal}).`,
        });
      }
    } else {
      parsedTotalAmount = componentTotal;
    }

    let parsedDueDate = null;

    if (dueDate) {
      const date = new Date(dueDate);

      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date.",
        });
      }

      parsedDueDate = date;
    }

    const existingFeeStructure =
      await prisma.feeStructure.findUnique({
        where: {
          programId_academicYearId_semester: {
            programId: parsedProgramId,
            academicYearId: parsedAcademicYearId,
            semester: parsedSemester,
          },
        },
      });

    if (existingFeeStructure) {
      return res.status(409).json({
        success: false,
        message:
          "A fee structure already exists for this program, academic year and semester.",
      });
    }

    const feeStructure = await prisma.feeStructure.create({
      data: {
        departmentId: parsedDepartmentId,
        programId: parsedProgramId,
        academicYearId: parsedAcademicYearId,
        semester: parsedSemester,
        name: feeStructureName,
        description: feeStructureDescription || null,
        totalAmount: parsedTotalAmount,
        dueDate: parsedDueDate,
        isActive: Boolean(isActive),

        components: {
          create: normalizedComponents.map((component) => ({
            name: component.name,
            description: component.description,
            amount: component.amount,
          })),
        },
      },

      include: {
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

        academicYear: {
          select: {
            id: true,
            name: true,
            startYear: true,
            endYear: true,
          },
        },

        components: {
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Fee structure created successfully.",
      feeStructure,
      data: feeStructure,
    });
  } catch (error) {
    console.error("Create admin fee structure error:", error);

    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "A fee structure already exists for this program, academic year and semester.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create fee structure.",
      error: error?.message,
    });
  }
};

// =====================================================
// UPDATE FEE STRUCTURE
// PATCH /api/admin/fee-structures/:id
// =====================================================
export const updateAdminFeeStructure = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid fee structure ID.",
      });
    }

    const existingFeeStructure =
      await prisma.feeStructure.findUnique({
        where: {
          id,
        },
        include: {
          components: true,
        },
      });

    if (!existingFeeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found.",
      });
    }

    const {
      departmentId,
      programId,
      academicYearId,
      semester,
      name,
      description,
      totalAmount,
      dueDate,
      isActive,
      components,
    } = req.body;

    const data = {};

    const finalDepartmentId =
      departmentId !== undefined
        ? parseId(departmentId)
        : existingFeeStructure.departmentId;

    const finalProgramId =
      programId !== undefined
        ? parseId(programId)
        : existingFeeStructure.programId;

    const finalAcademicYearId =
      academicYearId !== undefined
        ? parseId(academicYearId)
        : existingFeeStructure.academicYearId;

    const finalSemester =
      semester !== undefined
        ? parseSemester(semester)
        : existingFeeStructure.semester;

    if (
      !finalDepartmentId ||
      !finalProgramId ||
      !finalAcademicYearId ||
      !finalSemester
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Department, program, academic year and semester must be valid.",
      });
    }

    const department = await prisma.department.findUnique({
      where: {
        id: finalDepartmentId,
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    const program = await prisma.program.findUnique({
      where: {
        id: finalProgramId,
      },
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found.",
      });
    }

    if (program.departmentId !== finalDepartmentId) {
      return res.status(400).json({
        success: false,
        message:
          "The selected program does not belong to the selected department.",
      });
    }

    const academicYear = await prisma.academicYear.findUnique({
      where: {
        id: finalAcademicYearId,
      },
    });

    if (!academicYear) {
      return res.status(404).json({
        success: false,
        message: "Academic year not found.",
      });
    }

    if (name !== undefined) {
      const feeStructureName = String(name).trim();

      if (!feeStructureName) {
        return res.status(400).json({
          success: false,
          message: "Fee structure name cannot be empty.",
        });
      }

      data.name = feeStructureName;
    }

    if (description !== undefined) {
      const feeStructureDescription =
        String(description || "").trim();

      data.description = feeStructureDescription || null;
    }

    if (departmentId !== undefined) {
      data.departmentId = finalDepartmentId;
    }

    if (programId !== undefined) {
      data.programId = finalProgramId;
    }

    if (academicYearId !== undefined) {
      data.academicYearId = finalAcademicYearId;
    }

    if (semester !== undefined) {
      data.semester = finalSemester;
    }

    if (dueDate !== undefined) {
      if (!dueDate) {
        data.dueDate = null;
      } else {
        const date = new Date(dueDate);

        if (Number.isNaN(date.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid due date.",
          });
        }

        data.dueDate = date;
      }
    }

    if (isActive !== undefined) {
      data.isActive = Boolean(isActive);
    }

    let normalizedComponents = null;
    let finalTotalAmount = existingFeeStructure.totalAmount;

    if (components !== undefined) {
      normalizedComponents = normalizeComponents(components);

      if (normalizedComponents === null) {
        return res.status(400).json({
          success: false,
          message: "Components must be provided as an array.",
        });
      }

      if (normalizedComponents.some((component) => component === null)) {
        return res.status(400).json({
          success: false,
          message:
            "Every fee component must have a name and a valid amount.",
        });
      }

      finalTotalAmount = normalizedComponents.reduce(
        (sum, component) => sum + component.amount,
        0
      );
    }

    if (totalAmount !== undefined) {
      const parsedTotalAmount = parsePositiveAmount(totalAmount);

      if (parsedTotalAmount === null) {
        return res.status(400).json({
          success: false,
          message: "Total amount must be a valid non-negative amount.",
        });
      }

      if (
        normalizedComponents &&
        parsedTotalAmount !== finalTotalAmount
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Total amount (${parsedTotalAmount}) must equal the sum of fee components (${finalTotalAmount}).`,
        });
      }

      finalTotalAmount = parsedTotalAmount;
    }

    if (
      components !== undefined ||
      totalAmount !== undefined
    ) {
      data.totalAmount = finalTotalAmount;
    }

    const uniqueCombinationChanged =
      finalProgramId !== existingFeeStructure.programId ||
      finalAcademicYearId !== existingFeeStructure.academicYearId ||
      finalSemester !== existingFeeStructure.semester;

    if (uniqueCombinationChanged) {
      const duplicate =
        await prisma.feeStructure.findUnique({
          where: {
            programId_academicYearId_semester: {
              programId: finalProgramId,
              academicYearId: finalAcademicYearId,
              semester: finalSemester,
            },
          },
        });

      if (duplicate && duplicate.id !== id) {
        return res.status(409).json({
          success: false,
          message:
            "Another fee structure already exists for this program, academic year and semester.",
        });
      }
    }

    const feeStructure = await prisma.$transaction(
      async (transaction) => {
        if (normalizedComponents !== null) {
          await transaction.feeComponent.deleteMany({
            where: {
              feeStructureId: id,
            },
          });
        }

        return transaction.feeStructure.update({
          where: {
            id,
          },

          data: {
            ...data,

            ...(normalizedComponents !== null
              ? {
                  components: {
                    create: normalizedComponents.map(
                      (component) => ({
                        name: component.name,
                        description: component.description,
                        amount: component.amount,
                      })
                    ),
                  },
                }
              : {}),
          },

          include: {
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

            academicYear: {
              select: {
                id: true,
                name: true,
                startYear: true,
                endYear: true,
              },
            },

            components: {
              orderBy: {
                id: "asc",
              },
            },
          },
        });
      }
    );

    return res.status(200).json({
      success: true,
      message: "Fee structure updated successfully.",
      feeStructure,
      data: feeStructure,
    });
  } catch (error) {
    console.error("Update admin fee structure error:", error);

    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "A fee structure already exists for this program, academic year and semester.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update fee structure.",
      error: error?.message,
    });
  }
};

// =====================================================
// DELETE FEE STRUCTURE
// DELETE /api/admin/fee-structures/:id
// =====================================================
export const deleteAdminFeeStructure = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid fee structure ID.",
      });
    }

    const feeStructure = await prisma.feeStructure.findUnique({
      where: {
        id,
      },

      include: {
        _count: {
          select: {
            fees: true,
          },
        },
      },
    });

    if (!feeStructure) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found.",
      });
    }

    if (feeStructure._count.fees > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This fee structure cannot be deleted because student fee records are already linked to it.",
      });
    }

    await prisma.feeStructure.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Fee structure deleted successfully.",
      data: null,
    });
  } catch (error) {
    console.error("Delete admin fee structure error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete fee structure.",
      error: error?.message,
    });
  }
};