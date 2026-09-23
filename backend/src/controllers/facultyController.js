import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";

// CREATE FACULTY
export const createFaculty = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      employeeId,
      designation,
      departmentId,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !employeeId ||
      !departmentId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "First name, last name, email, password, employee ID and department are required",
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

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const existingFaculty = await prisma.faculty.findUnique({
      where: {
        employeeId,
      },
    });

    if (existingFaculty) {
      return res.status(409).json({
        success: false,
        message: "Employee ID is already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const faculty = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          email,
          passwordHash,
          role: "FACULTY",
        },
      });

      return tx.faculty.create({
        data: {
          userId: user.id,
          employeeId,
          designation: designation || null,
          departmentId: Number(departmentId),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
          department: true,
        },
      });
    });

    return res.status(201).json({
      success: true,
      message: "Faculty created successfully",
      faculty,
    });
  } catch (error) {
    console.error("Create faculty error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create faculty",
    });
  }
};

// GET ALL FACULTY
export const getFaculty = async (req, res) => {
  try {
    const faculty = await prisma.faculty.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        department: true,
        courses: true,
      },
      orderBy: {
        employeeId: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      faculty,
    });
  } catch (error) {
    console.error("Get faculty error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch faculty",
    });
  }
};

// GET LOGGED-IN FACULTY
export const getMyFacultyProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication data",
      });
    }

    const faculty = await prisma.faculty.findUnique({
      where: {
        userId: Number(userId),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        department: true,
      },
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      faculty,
    });
  } catch (error) {
    console.error(
      "Get my faculty profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch faculty profile",
    });
  }
};

// GET COURSES FOR LOGGED-IN FACULTY
export const getMyFacultyCourses = async (
  req,
  res
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication data",
      });
    }

    const faculty = await prisma.faculty.findUnique({
      where: {
        userId: Number(userId),
      },
      select: {
        id: true,
        employeeId: true,
        designation: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        department: true,
      },
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    const courses = await prisma.course.findMany({
      where: {
        facultyId: faculty.id,
      },
      include: {
        department: true,
        program: true,
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const formattedCourses = courses.map(
      (course) => ({
        ...course,
        studentCount:
          course._count?.enrollments || 0,
      })
    );

    return res.status(200).json({
      success: true,

      faculty: {
        id: faculty.id,
        employeeId: faculty.employeeId,
        designation: faculty.designation,
        user: faculty.user,
        department: faculty.department,
      },

      courses: formattedCourses,
    });
  } catch (error) {
    console.error(
      "Get my faculty courses error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch faculty courses",
      error: error.message,
    });
  }
};

// GET SINGLE FACULTY BY ID
export const getFacultyById = async (
  req,
  res
) => {
  try {
    const facultyId = Number(req.params.id);

    if (!Number.isInteger(facultyId) || facultyId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid faculty ID",
      });
    }

    const faculty = await prisma.faculty.findUnique({
      where: {
        id: facultyId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        department: true,
        courses: {
          include: {
            program: true,
            department: true,
          },
          orderBy: {
            name: "asc",
          },
        },
      },
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
      });
    }

    return res.status(200).json({
      success: true,
      faculty,
    });
  } catch (error) {
    console.error(
      "Get faculty by ID error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch faculty",
    });
  }
};

export default {
  createFaculty,
  getFaculty,
  getMyFacultyProfile,
  getMyFacultyCourses,
  getFacultyById,
};