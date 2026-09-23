import prisma from "../lib/prisma.js";

// CREATE DEPARTMENT
export const createDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Department name and code are required",
      });
    }

    const existingDepartment = await prisma.department.findFirst({
      where: {
        OR: [
          { name },
          { code },
        ],
      },
    });

    if (existingDepartment) {
      return res.status(409).json({
        success: false,
        message: "Department name or code already exists",
      });
    }

    const department = await prisma.department.create({
      data: {
        name,
        code,
        description: description || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      department,
    });
  } catch (error) {
    console.error("Create department error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create department",
    });
  }
};

// GET ALL DEPARTMENTS
export const getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        programs: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      departments,
    });
  } catch (error) {
    console.error("Get departments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch departments",
    });
  }
};