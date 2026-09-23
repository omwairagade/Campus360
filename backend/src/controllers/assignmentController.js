import prisma from "../lib/prisma.js";
import fs from "fs";

// ============================================================
// CREATE ASSIGNMENT
// ============================================================
export const createAssignment = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const {
      title,
      description,
      dueDate,
      maxMarks,
      courseId,
    } = req.body;

    if (!title || !dueDate || !courseId) {
      return res.status(400).json({
        success: false,
        message:
          "Title, due date and course are required",
      });
    }

    const parsedDueDate = new Date(dueDate);

    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date",
      });
    }

    const faculty = await prisma.faculty.findUnique({
      where: {
        userId: Number(userId),
      },
    });

    if (!faculty) {
      return res.status(403).json({
        success: false,
        message:
          "Only faculty can create assignments",
      });
    }

    const course = await prisma.course.findUnique({
      where: {
        id: Number(courseId),
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (course.facultyId !== faculty.id) {
      return res.status(403).json({
        success: false,
        message:
          "You are not assigned to this course",
      });
    }

    const parsedMaxMarks =
      maxMarks === undefined ||
      maxMarks === null ||
      maxMarks === ""
        ? 100
        : Number(maxMarks);

    if (
      Number.isNaN(parsedMaxMarks) ||
      parsedMaxMarks <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Maximum marks must be greater than 0",
      });
    }

    const assignment =
      await prisma.assignment.create({
        data: {
          title: title.trim(),
          description:
            description?.trim() || null,
          dueDate: parsedDueDate,
          maxMarks: parsedMaxMarks,
          courseId: course.id,
          facultyId: faculty.id,
        },

        include: {
          course: true,

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
      });

    return res.status(201).json({
      success: true,
      message:
        "Assignment created successfully",
      assignment,
    });
  } catch (error) {
    console.error(
      "Create assignment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create assignment",
      error: error.message,
    });
  }
};

// ============================================================
// GET ASSIGNMENTS FOR LOGGED-IN FACULTY
// ============================================================
export const getMyFacultyAssignments =
  async (req, res) => {
    try {
      const userId = req.user?.userId;

      const faculty =
        await prisma.faculty.findUnique({
          where: {
            userId: Number(userId),
          },
        });

      if (!faculty) {
        return res.status(403).json({
          success: false,
          message: "Faculty profile not found",
        });
      }

      const assignments =
        await prisma.assignment.findMany({
          where: {
            facultyId: faculty.id,
          },

          include: {
            course: {
              select: {
                id: true,
                code: true,
                name: true,
                credits: true,
              },
            },

            submissions: {
              select: {
                id: true,
                studentId: true,
                submittedAt: true,
                status: true,
                marksObtained: true,
                remarks: true,
                fileName: true,
                fileUrl: true,
                fileSize: true,
                fileType: true,

                student: {
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

              orderBy: {
                submittedAt: "desc",
              },
            },

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

          orderBy: {
            dueDate: "asc",
          },
        });

      const formattedAssignments =
        assignments.map((assignment) => {
          const totalSubmissions =
            assignment.submissions.length;

          const gradedSubmissions =
            assignment.submissions.filter(
              (submission) =>
                submission.status ===
                "GRADED"
            ).length;

          return {
            ...assignment,
            totalSubmissions,
            gradedSubmissions,
            pendingGrading:
              totalSubmissions -
              gradedSubmissions,
          };
        });

      return res.status(200).json({
        success: true,

        faculty: {
          id: faculty.id,
          employeeId:
            faculty.employeeId,
        },

        assignments:
          formattedAssignments,
      });
    } catch (error) {
      console.error(
        "Get faculty assignments error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch faculty assignments",
        error: error.message,
      });
    }
  };

// ============================================================
// GET SINGLE FACULTY ASSIGNMENT WITH SUBMISSIONS
// ============================================================
export const getFacultyAssignmentById =
  async (req, res) => {
    try {
      const userId = req.user?.userId;

      const assignmentId = Number(
        req.params.id
      );

      if (
        !Number.isInteger(assignmentId) ||
        assignmentId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid assignment ID",
        });
      }

      const faculty =
        await prisma.faculty.findUnique({
          where: {
            userId: Number(userId),
          },
        });

      if (!faculty) {
        return res.status(403).json({
          success: false,
          message:
            "Only faculty can access this assignment",
        });
      }

      const assignment =
        await prisma.assignment.findUnique({
          where: {
            id: assignmentId,
          },

          include: {
            course: true,

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

            submissions: {
              include: {
                student: {
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

              orderBy: {
                submittedAt: "desc",
              },
            },
          },
        });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found",
        });
      }

      if (
        assignment.facultyId !==
        faculty.id
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to access this assignment",
        });
      }

      return res.status(200).json({
        success: true,
        assignment,
      });
    } catch (error) {
      console.error(
        "Get faculty assignment by ID error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch faculty assignment",
        error: error.message,
      });
    }
  };

// ============================================================
// GET ALL ASSIGNMENTS FOR LOGGED-IN STUDENT
// ============================================================
export const getMyAssignments = async (
  req,
  res
) => {
  try {
    const userId = req.user.userId;

    const student =
      await prisma.student.findUnique({
        where: {
          userId,
        },
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student profile not found",
      });
    }

    const assignments =
      await prisma.assignment.findMany({
        where: {
          course: {
            programId: student.programId,
            semester: student.semester,
            enrollments: {
              some: {
                studentId:
                  student.id,
              },
            },
          },
        },

        include: {
          course: {
            select: {
              id: true,
              code: true,
              name: true,
              credits: true,
            },
          },

          faculty: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },

          submissions: {
            where: {
              studentId:
                student.id,
            },

            select: {
              id: true,
              submittedAt: true,
              status: true,
              marksObtained: true,
              remarks: true,
              fileName: true,
              fileUrl: true,
              fileSize: true,
              fileType: true,
            },
          },
        },

        orderBy: {
          dueDate: "asc",
        },
      });

    const formattedAssignments =
      assignments.map(
        (assignment) => ({
          id: assignment.id,
          title: assignment.title,
          description:
            assignment.description,
          dueDate:
            assignment.dueDate,
          maxMarks:
            assignment.maxMarks,
          course:
            assignment.course,
          faculty:
            assignment.faculty,
          submission:
            assignment.submissions[0] ||
            null,
        })
      );

    return res.status(200).json({
      success: true,
      assignments:
        formattedAssignments,
    });
  } catch (error) {
    console.error(
      "Get student assignments error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch assignments",
    });
  }
};

// ============================================================
// SUBMIT ASSIGNMENT WITH FILE
// ============================================================
export const submitAssignment = async (
  req,
  res
) => {
  try {
    const userId = req.user.userId;

    const assignmentId = Number(
      req.params.id
    );

    if (
      !Number.isInteger(assignmentId) ||
      assignmentId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid assignment ID",
      });
    }

    const student =
      await prisma.student.findUnique({
        where: {
          userId,
        },
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student profile not found",
      });
    }

    const assignment =
      await prisma.assignment.findUnique({
        where: {
          id: assignmentId,
        },
      });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message:
          "Assignment not found",
      });
    }

    const enrolled =
      await prisma.courseEnrollment.findUnique(
        {
          where: {
            studentId_courseId: {
              studentId: student.id,
              courseId:
                assignment.courseId,
            },
          },
        }
      );

    if (!enrolled) {
      return res.status(403).json({
        success: false,
        message:
          "You are not enrolled in this course",
      });
    }

    // A file is required for submission.
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Please select a file before submitting the assignment",
      });
    }

    const now = new Date();

    const dueDate =
      new Date(assignment.dueDate);

    const status =
      now > dueDate
        ? "LATE"
        : "SUBMITTED";

    // Relative URL saved in database.
    const fileUrl = `/uploads/assignments/${req.file.filename}`;

    // If the student already has a submission
    // and it contains an older file, remove it.
    const existingSubmission =
      await prisma.assignmentSubmission.findUnique(
        {
          where: {
            assignmentId_studentId: {
              assignmentId,
              studentId:
                student.id,
            },
          },
        }
      );

    if (
      existingSubmission?.fileUrl
    ) {
      const oldFilePath =
        existingSubmission.fileUrl.startsWith(
          "/"
        )
          ? existingSubmission.fileUrl.slice(
              1
            )
          : existingSubmission.fileUrl;

      const absoluteOldFilePath =
        `${process.cwd()}/${oldFilePath.replace(
          /\\/g,
          "/"
        )}`;

      if (
        fs.existsSync(
          absoluteOldFilePath
        )
      ) {
        try {
          fs.unlinkSync(
            absoluteOldFilePath
          );
        } catch (fileError) {
          console.warn(
            "Could not remove old assignment file:",
            fileError.message
          );
        }
      }
    }

    const submission =
      await prisma.assignmentSubmission.upsert(
        {
          where: {
            assignmentId_studentId: {
              assignmentId,
              studentId:
                student.id,
            },
          },

          update: {
            submittedAt: now,
            status,
            fileName:
              req.file.originalname,
            fileUrl,
            fileSize:
              req.file.size,
            fileType:
              req.file.mimetype,
          },

          create: {
            assignmentId,
            studentId:
              student.id,
            submittedAt: now,
            status,
            fileName:
              req.file.originalname,
            fileUrl,
            fileSize:
              req.file.size,
            fileType:
              req.file.mimetype,
          },

          include: {
            assignment: {
              include: {
                course: true,
              },
            },
          },
        }
      );

    return res.status(200).json({
      success: true,
      message:
        status === "LATE"
          ? "Assignment submitted late successfully"
          : "Assignment submitted successfully",
      submission,
    });
  } catch (error) {
    // Remove newly uploaded file when database operation fails.
    if (req.file?.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (fileError) {
        console.warn(
          "Could not remove uploaded file after error:",
          fileError.message
        );
      }
    }

    console.error(
      "Submit assignment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to submit assignment",
      error: error.message,
    });
  }
};

// ============================================================
// GET SINGLE ASSIGNMENT
// ============================================================
export const getAssignmentById = async (
  req,
  res
) => {
  try {
    const assignmentId = Number(
      req.params.id
    );

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid assignment ID",
      });
    }

    const assignment =
      await prisma.assignment.findUnique({
        where: {
          id: assignmentId,
        },

        include: {
          course: true,

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

          submissions: {
            include: {
              student: {
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
        },
      });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message:
          "Assignment not found",
      });
    }

    return res.status(200).json({
      success: true,
      assignment,
    });
  } catch (error) {
    console.error(
      "Get assignment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch assignment",
    });
  }
};

// ============================================================
// GRADE ASSIGNMENT
// ============================================================
export const gradeAssignment = async (
  req,
  res
) => {
  try {
    const userId = req.user.userId;

    const submissionId = Number(
      req.params.submissionId
    );

    const {
      marksObtained,
      remarks,
    } = req.body;

    if (!submissionId) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid submission ID",
      });
    }

    if (
      marksObtained === undefined ||
      marksObtained === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Marks obtained are required",
      });
    }

    const faculty =
      await prisma.faculty.findUnique({
        where: {
          userId: Number(userId),
        },
      });

    if (!faculty) {
      return res.status(403).json({
        success: false,
        message:
          "Only faculty can grade assignments",
      });
    }

    const submission =
      await prisma.assignmentSubmission.findUnique(
        {
          where: {
            id: submissionId,
          },

          include: {
            assignment: true,
          },
        }
      );

    if (!submission) {
      return res.status(404).json({
        success: false,
        message:
          "Submission not found",
      });
    }

    if (
      submission.assignment.facultyId !==
      faculty.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to grade this assignment",
      });
    }

    const marks =
      Number(marksObtained);

    if (
      Number.isNaN(marks) ||
      marks < 0 ||
      marks >
        submission.assignment
          .maxMarks
    ) {
      return res.status(400).json({
        success: false,
        message: `Marks must be between 0 and ${submission.assignment.maxMarks}`,
      });
    }

    const updatedSubmission =
      await prisma.assignmentSubmission.update(
        {
          where: {
            id: submissionId,
          },

          data: {
            marksObtained: marks,
            remarks:
              remarks?.trim() ||
              null,
            status: "GRADED",
          },

          include: {
            assignment: {
              include: {
                course: true,
              },
            },

            student: {
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
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Assignment graded successfully",
      submission:
        updatedSubmission,
    });
  } catch (error) {
    console.error(
      "Grade assignment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to grade assignment",
    });
  }
};

export default {
  createAssignment,
  getMyFacultyAssignments,
  getFacultyAssignmentById,
  getMyAssignments,
  submitAssignment,
  getAssignmentById,
  gradeAssignment,
};