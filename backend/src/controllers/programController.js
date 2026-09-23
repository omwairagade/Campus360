import prisma from "../lib/prisma.js";

// CREATE PROGRAM
export const createProgram = async (req, res) => {
  try {
    const {
      name,
      code,
      durationYears,
      departmentId,
    } = req.body;

    if (!name || !code || !durationYears || !departmentId) {
      return res.status(400).json({
        success: false,
        message:
          "Program name, code, duration and department are required",
      });
    }

    const department = await prisma.department.findUnique({
      where: {
        id: Number(departmentId),
      },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    const existingProgram = await prisma.program.findUnique({
      where: {
        code,
      },
    });

    if (existingProgram) {
      return res.status(409).json({
        success: false,
        message: "Program code already exists",
      });
    }

    const program = await prisma.program.create({
      data: {
        name,
        code,
        durationYears: Number(durationYears),
        departmentId: Number(departmentId),
      },
      include: {
        department: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Program created successfully",
      program,
    });
  } catch (error) {
    console.error("Create program error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create program",
    });
  }
};

// GET ALL PROGRAMS
export const getPrograms = async (req, res) => {
  try {
    const programs = await prisma.program.findMany({
      include: {
        department: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      programs,
    });
  } catch (error) {
    console.error("Get programs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch programs",
    });
  }
};