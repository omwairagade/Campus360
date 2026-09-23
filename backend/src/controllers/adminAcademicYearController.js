import prisma from "../lib/prisma.js";

const parseId = (value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const parseYear = (value) => {
  const year = Number(value);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return null;
  }

  return year;
};

// =====================================================
// GET ALL ACADEMIC YEARS
// GET /api/admin/academic-years
// =====================================================
export const getAdminAcademicYears = async (req, res) => {
  try {
    const { search = "", active } = req.query;

    const where = {};

    if (String(search).trim()) {
      const searchText = String(search).trim();

      where.name = {
        contains: searchText,
        mode: "insensitive",
      };
    }

    if (active !== undefined && active !== "") {
      if (active === "true") {
        where.isActive = true;
      } else if (active === "false") {
        where.isActive = false;
      }
    }

    const academicYears = await prisma.academicYear.findMany({
      where,

      include: {
        _count: {
          select: {
            feeStructures: true,
          },
        },
      },

      orderBy: [
        {
          startYear: "desc",
        },
        {
          id: "desc",
        },
      ],
    });

    return res.status(200).json({
      success: true,
      academicYears,
      data: academicYears,
    });
  } catch (error) {
    console.error("Get admin academic years error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch academic years.",
      error: error?.message,
    });
  }
};

// =====================================================
// GET SINGLE ACADEMIC YEAR
// GET /api/admin/academic-years/:id
// =====================================================
export const getAdminAcademicYearById = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid academic year ID.",
      });
    }

    const academicYear = await prisma.academicYear.findUnique({
      where: {
        id,
      },

      include: {
        feeStructures: {
          orderBy: [
            {
              programId: "asc",
            },
            {
              semester: "asc",
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

            program: {
              select: {
                id: true,
                name: true,
                code: true,
                durationYears: true,
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
            feeStructures: true,
          },
        },
      },
    });

    if (!academicYear) {
      return res.status(404).json({
        success: false,
        message: "Academic year not found.",
      });
    }

    return res.status(200).json({
      success: true,
      academicYear,
      data: academicYear,
    });
  } catch (error) {
    console.error("Get admin academic year details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch academic year details.",
      error: error?.message,
    });
  }
};

// =====================================================
// CREATE ACADEMIC YEAR
// POST /api/admin/academic-years
// =====================================================
export const createAdminAcademicYear = async (req, res) => {
  try {
    const {
      name,
      startYear,
      endYear,
      isActive = false,
    } = req.body;

    const academicYearName = String(name || "").trim();

    if (!academicYearName) {
      return res.status(400).json({
        success: false,
        message: "Academic year name is required.",
      });
    }

    const parsedStartYear = parseYear(startYear);
    const parsedEndYear = parseYear(endYear);

    if (!parsedStartYear || !parsedEndYear) {
      return res.status(400).json({
        success: false,
        message:
          "Start year and end year must be valid years between 2000 and 2100.",
      });
    }

    if (parsedEndYear !== parsedStartYear + 1) {
      return res.status(400).json({
        success: false,
        message:
          "Academic year must cover two consecutive years, for example 2026-27.",
      });
    }

    const existingAcademicYear =
      await prisma.academicYear.findFirst({
        where: {
          OR: [
            {
              name: {
                equals: academicYearName,
                mode: "insensitive",
              },
            },
            {
              AND: [
                {
                  startYear: parsedStartYear,
                },
                {
                  endYear: parsedEndYear,
                },
              ],
            },
          ],
        },
      });

    if (existingAcademicYear) {
      return res.status(409).json({
        success: false,
        message:
          "An academic year with the same name or year range already exists.",
      });
    }

    const shouldBeActive = Boolean(isActive);

    // Only one academic year should normally be active at a time.
    if (shouldBeActive) {
      await prisma.academicYear.updateMany({
        where: {
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        name: academicYearName,
        startYear: parsedStartYear,
        endYear: parsedEndYear,
        isActive: shouldBeActive,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Academic year created successfully.",
      academicYear,
      data: academicYear,
    });
  } catch (error) {
    console.error("Create admin academic year error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create academic year.",
      error: error?.message,
    });
  }
};

// =====================================================
// UPDATE ACADEMIC YEAR
// PATCH /api/admin/academic-years/:id
// =====================================================
export const updateAdminAcademicYear = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid academic year ID.",
      });
    }

    const {
      name,
      startYear,
      endYear,
      isActive,
    } = req.body;

    const existingAcademicYear =
      await prisma.academicYear.findUnique({
        where: {
          id,
        },
      });

    if (!existingAcademicYear) {
      return res.status(404).json({
        success: false,
        message: "Academic year not found.",
      });
    }

    const data = {};

    const updatedStartYear =
      startYear !== undefined
        ? parseYear(startYear)
        : existingAcademicYear.startYear;

    const updatedEndYear =
      endYear !== undefined
        ? parseYear(endYear)
        : existingAcademicYear.endYear;

    if (!updatedStartYear || !updatedEndYear) {
      return res.status(400).json({
        success: false,
        message:
          "Start year and end year must be valid years between 2000 and 2100.",
      });
    }

    if (updatedEndYear !== updatedStartYear + 1) {
      return res.status(400).json({
        success: false,
        message:
          "Academic year must cover two consecutive years, for example 2026-27.",
      });
    }

    if (name !== undefined) {
      const academicYearName = String(name).trim();

      if (!academicYearName) {
        return res.status(400).json({
          success: false,
          message: "Academic year name cannot be empty.",
        });
      }

      data.name = academicYearName;
    }

    if (
      startYear !== undefined ||
      endYear !== undefined
    ) {
      data.startYear = updatedStartYear;
      data.endYear = updatedEndYear;
    }

    if (isActive !== undefined) {
      data.isActive = Boolean(isActive);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided for update.",
      });
    }

    const duplicateConditions = [];

    if (data.name) {
      duplicateConditions.push({
        name: {
          equals: data.name,
          mode: "insensitive",
        },
      });
    }

    if (
      data.startYear !== undefined &&
      data.endYear !== undefined
    ) {
      duplicateConditions.push({
        AND: [
          {
            startYear: data.startYear,
          },
          {
            endYear: data.endYear,
          },
        ],
      });
    }

    if (duplicateConditions.length > 0) {
      const duplicate =
        await prisma.academicYear.findFirst({
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
            "Another academic year already uses that name or year range.",
        });
      }
    }

    // If activating this academic year, deactivate the others.
    if (data.isActive === true) {
      await prisma.academicYear.updateMany({
        where: {
          id: {
            not: id,
          },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    }

    const academicYear =
      await prisma.academicYear.update({
        where: {
          id,
        },
        data,
      });

    return res.status(200).json({
      success: true,
      message: "Academic year updated successfully.",
      academicYear,
      data: academicYear,
    });
  } catch (error) {
    console.error("Update admin academic year error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update academic year.",
      error: error?.message,
    });
  }
};

// =====================================================
// DELETE ACADEMIC YEAR
// DELETE /api/admin/academic-years/:id
// =====================================================
export const deleteAdminAcademicYear = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid academic year ID.",
      });
    }

    const academicYear =
      await prisma.academicYear.findUnique({
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

    if (!academicYear) {
      return res.status(404).json({
        success: false,
        message: "Academic year not found.",
      });
    }

    if (academicYear._count.feeStructures > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This academic year cannot be deleted because it is linked to existing fee structures.",
      });
    }

    await prisma.academicYear.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Academic year deleted successfully.",
      data: null,
    });
  } catch (error) {
    console.error("Delete admin academic year error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete academic year.",
      error: error?.message,
    });
  }
};