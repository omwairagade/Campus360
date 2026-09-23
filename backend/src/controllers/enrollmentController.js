import prisma from "../lib/prisma.js";

// ENROLL STUDENT IN A COURSE
export const enrollStudent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    const student = await prisma.student.findUnique({
      where: {
        userId,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
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

    if (
      course.departmentId !== student.departmentId ||
      course.programId !== student.programId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Course does not belong to student's department and program",
      });
    }

    if (course.semester !== student.semester) {
      return res.status(400).json({
        success: false,
        message: "Course does not belong to student's current semester",
      });
    }

    const existingEnrollment =
      await prisma.courseEnrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId: course.id,
          },
        },
      });

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message: "Student is already enrolled in this course",
      });
    }

    const enrollment = await prisma.courseEnrollment.create({
      data: {
        studentId: student.id,
        courseId: course.id,
      },
      include: {
        course: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Student enrolled successfully",
      enrollment,
    });
  } catch (error) {
    console.error("Enroll student error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to enroll student",
    });
  }
};

// GET LOGGED-IN STUDENT ENROLLMENTS
export const getMyEnrollments = async (req, res) => {
  try {
    const userId = req.user.userId;

    const student = await prisma.student.findUnique({
      where: {
        userId,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const enrollments = await prisma.courseEnrollment.findMany({
      where: {
        studentId: student.id,
      },
      include: {
        course: {
          include: {
            department: true,
            program: true,
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
      },
      orderBy: {
        enrolledAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      enrollments,
    });
  } catch (error) {
    console.error("Get enrollments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrollments",
    });
  }
};

// UPDATE COURSE PROGRESS
export const updateCourseProgress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const courseId = Number(req.params.courseId);
    const { progressPercent } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    if (
      progressPercent === undefined ||
      progressPercent === null ||
      Number.isNaN(Number(progressPercent))
    ) {
      return res.status(400).json({
        success: false,
        message: "Progress percentage is required",
      });
    }

    const progress = Number(progressPercent);

    if (progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: "Progress must be between 0 and 100",
      });
    }

    const student = await prisma.student.findUnique({
      where: {
        userId,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const enrollment =
      await prisma.courseEnrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId,
          },
        },
      });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Course enrollment not found",
      });
    }

    const updatedEnrollment =
      await prisma.courseEnrollment.update({
        where: {
          id: enrollment.id,
        },
        data: {
          progressPercent: progress,
        },
        include: {
          course: true,
        },
      });

    return res.status(200).json({
      success: true,
      message: "Course progress updated successfully",
      enrollment: updatedEnrollment,
    });
  } catch (error) {
    console.error("Update course progress error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update course progress",
    });
  }
};

// REMOVE STUDENT FROM A COURSE
export const removeEnrollment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const courseId = Number(req.params.courseId);

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const student = await prisma.student.findUnique({
      where: {
        userId,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const enrollment =
      await prisma.courseEnrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId,
          },
        },
      });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    await prisma.courseEnrollment.delete({
      where: {
        id: enrollment.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Student removed from course successfully",
    });
  } catch (error) {
    console.error("Remove enrollment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove enrollment",
    });
  }
};

export default {
  enrollStudent,
  getMyEnrollments,
  updateCourseProgress,
  removeEnrollment,
};