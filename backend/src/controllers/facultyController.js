import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";

// ============================================================
// FACULTY ACCOUNT SETTINGS
// ============================================================

const STAFF_EMAIL_DOMAIN = "campus360.com";
const TEMPORARY_PASSWORD = "Campus@123";

// ============================================================
// CREATE FACULTY
// ============================================================

export const createFaculty = async (req, res) => {
try {
const {
firstName,
lastName,
employeeId,
designation,
departmentId,
} = req.body;


// --------------------------------------------------------
// BASIC VALIDATION
// --------------------------------------------------------

if (
  !firstName ||
  !lastName ||
  !employeeId ||
  !departmentId
) {
  return res.status(400).json({
    success: false,
    message:
      "First name, last name, employee ID and department are required",
  });
}

// --------------------------------------------------------
// NORMALIZE FACULTY DATA
// --------------------------------------------------------

const cleanFirstName = String(firstName).trim();
const cleanLastName = String(lastName).trim();

const cleanEmployeeId = String(employeeId)
  .trim()
  .toLowerCase();

const numericDepartmentId =
  Number(departmentId);

if (
  !Number.isInteger(numericDepartmentId) ||
  numericDepartmentId <= 0
) {
  return res.status(400).json({
    success: false,
    message: "Invalid department ID",
  });
}

// --------------------------------------------------------
// GENERATE COLLEGE EMAIL
// --------------------------------------------------------

const collegeEmail =
  cleanEmployeeId +
  "@" +
  STAFF_EMAIL_DOMAIN;

// --------------------------------------------------------
// CHECK DEPARTMENT
// --------------------------------------------------------

const department =
  await prisma.department.findUnique({
    where: {
      id: numericDepartmentId,
    },
  });

if (!department) {
  return res.status(404).json({
    success: false,
    message: "Department not found",
  });
}

// --------------------------------------------------------
// CHECK EMPLOYEE ID
// --------------------------------------------------------

const existingFaculty =
  await prisma.faculty.findUnique({
    where: {
      employeeId: cleanEmployeeId,
    },
  });

if (existingFaculty) {
  return res.status(409).json({
    success: false,
    message:
      "Employee ID is already registered",
  });
}

// --------------------------------------------------------
// CHECK GENERATED EMAIL
// --------------------------------------------------------

const existingUser =
  await prisma.user.findUnique({
    where: {
      email: collegeEmail,
    },
  });

if (existingUser) {
  return res.status(409).json({
    success: false,
    message:
      "The generated faculty college email is already registered",
  });
}

// --------------------------------------------------------
// HASH TEMPORARY PASSWORD
// --------------------------------------------------------

const passwordHash =
  await bcrypt.hash(
    TEMPORARY_PASSWORD,
    10
  );

// ========================================================
// CREATE USER + FACULTY PROFILE
// ========================================================

const faculty =
  await prisma.$transaction(
    async (tx) => {
      const user =
        await tx.user.create({
          data: {
            firstName: cleanFirstName,
            lastName: cleanLastName,
            email: collegeEmail,
            passwordHash,
            role: "FACULTY",

            // Faculty must change the temporary
            // password during first login.
            mustChangePassword: true,
          },
        });

      return tx.faculty.create({
        data: {
          userId: user.id,
          employeeId: cleanEmployeeId,
          designation:
            designation
              ? String(designation).trim()
              : null,
          departmentId:
            numericDepartmentId,
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
              mustChangePassword: true,
            },
          },

          department: true,
        },
      });
    }
  );

// ========================================================
// SUCCESS RESPONSE
// ========================================================

return res.status(201).json({
  success: true,

  message:
    "Faculty account created successfully",

  faculty,

  credentials: {
    collegeEmail,
    temporaryPassword:
      TEMPORARY_PASSWORD,
  },
});


} catch (error) {
console.error(
"Create faculty error:",
error
);


return res.status(500).json({
  success: false,
  message:
    "Failed to create faculty",
});


}
};

// ============================================================
// GET ALL FACULTY
// ============================================================

export const getFaculty = async (req, res) => {
try {
const faculty =
await prisma.faculty.findMany({
include: {
user: {
select: {
id: true,
firstName: true,
lastName: true,
email: true,
role: true,
isActive: true,
mustChangePassword: true,
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
console.error(
"Get faculty error:",
error
);


return res.status(500).json({
  success: false,
  message:
    "Failed to fetch faculty",
});


}
};

// ============================================================
// GET LOGGED-IN FACULTY
// ============================================================

export const getMyFacultyProfile = async (
req,
res
) => {
try {
const userId = req.user?.userId;


if (!userId) {
  return res.status(401).json({
    success: false,
    message:
      "Invalid authentication data",
  });
}

const faculty =
  await prisma.faculty.findUnique({
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
          mustChangePassword: true,
        },
      },

      department: true,
    },
  });

if (!faculty) {
  return res.status(404).json({
    success: false,
    message:
      "Faculty profile not found",
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
  message:
    "Failed to fetch faculty profile",
});


}
};

// ============================================================
// GET COURSES FOR LOGGED-IN FACULTY
// ============================================================

export const getMyFacultyCourses = async (
req,
res
) => {
try {
const userId = req.user?.userId;


if (!userId) {
  return res.status(401).json({
    success: false,
    message:
      "Invalid authentication data",
  });
}

const faculty =
  await prisma.faculty.findUnique({
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
          mustChangePassword: true,
        },
      },

      department: true,
    },
  });

if (!faculty) {
  return res.status(404).json({
    success: false,
    message:
      "Faculty profile not found",
  });
}

const courses =
  await prisma.course.findMany({
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

const formattedCourses =
  courses.map((course) => ({
    ...course,

    studentCount:
      course._count?.enrollments || 0,
  }));

return res.status(200).json({
  success: true,

  faculty: {
    id: faculty.id,
    employeeId:
      faculty.employeeId,
    designation:
      faculty.designation,
    user: faculty.user,
    department:
      faculty.department,
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
  message:
    "Failed to fetch faculty courses",
  error: error.message,
});


}
};

// ============================================================
// GET SINGLE FACULTY BY ID
// ============================================================

export const getFacultyById = async (
req,
res
) => {
try {
const facultyId =
Number(req.params.id);


if (
  !Number.isInteger(facultyId) ||
  facultyId <= 0
) {
  return res.status(400).json({
    success: false,
    message:
      "Invalid faculty ID",
  });
}

const faculty =
  await prisma.faculty.findUnique({
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
          mustChangePassword: true,
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
    message:
      "Faculty not found",
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
  message:
    "Failed to fetch faculty",
});


}
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
createFaculty,
getFaculty,
getMyFacultyProfile,
getMyFacultyCourses,
getFacultyById,
};
