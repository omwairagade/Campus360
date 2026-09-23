import prisma from "../lib/prisma.js";

/*
  ==========================================
  ADMIN REPORTS & ANALYTICS CONTROLLER
  ==========================================
*/


/* =========================================================
   GET ADMIN REPORT SUMMARY
   GET /api/admin/reports/summary
   ========================================================= */

export const getAdminReportSummary = async (req, res) => {
  try {
    const [
      totalStudents,
      activeStudents,
      inactiveStudents,
      totalFaculty,
      activeFaculty,
      inactiveFaculty,
      totalCourses,
      totalDepartments,
      totalPrograms,
      totalAssignments,
      totalExams,
      upcomingExams,
      totalNotices,
      publishedNotices,
      feeTotals,
      pendingFees,
      partialFees,
      paidFees,
      totalEnrollments,
      totalSubmissions,
      gradedSubmissions,
    ] = await Promise.all([
      /* Students */
      prisma.student.count(),

      prisma.student.count({
        where: {
          user: {
            isActive: true,
          },
        },
      }),

      prisma.student.count({
        where: {
          user: {
            isActive: false,
          },
        },
      }),

      /* Faculty */
      prisma.faculty.count(),

      prisma.faculty.count({
        where: {
          user: {
            isActive: true,
          },
        },
      }),

      prisma.faculty.count({
        where: {
          user: {
            isActive: false,
          },
        },
      }),

      /* Academic structure */
      prisma.course.count(),
      prisma.department.count(),
      prisma.program.count(),

      /* Academic activity */
      prisma.assignment.count(),
      prisma.exam.count(),

      prisma.exam.count({
        where: {
          examDate: {
            gte: new Date(),
          },
        },
      }),

      /* Notices */
      prisma.notice.count(),

      prisma.notice.count({
        where: {
          isPublished: true,
        },
      }),

      /* Fees */
      prisma.fee.aggregate({
        _sum: {
          totalAmount: true,
          paidAmount: true,
        },
      }),

      prisma.fee.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.fee.count({
        where: {
          status: "PARTIAL",
        },
      }),

      prisma.fee.count({
        where: {
          status: "PAID",
        },
      }),

      /* Enrollments */
      prisma.courseEnrollment.count(),

      /* Assignments */
      prisma.assignmentSubmission.count(),

      prisma.assignmentSubmission.count({
        where: {
          marksObtained: {
            not: null,
          },
        },
      }),
    ]);

    const totalFeeAmount = Number(
      feeTotals?._sum?.totalAmount || 0
    );

    const totalPaidAmount = Number(
      feeTotals?._sum?.paidAmount || 0
    );

    const totalPendingAmount = Math.max(
      totalFeeAmount - totalPaidAmount,
      0
    );

    const submissionCompletionRate =
      totalSubmissions > 0
        ? Number(
            (
              (gradedSubmissions /
                totalSubmissions) *
              100
            ).toFixed(2)
          )
        : 0;

    return res.status(200).json({
      success: true,
      message:
        "Admin report summary fetched successfully.",
      data: {
        students: {
          total: totalStudents,
          active: activeStudents,
          inactive: inactiveStudents,
        },

        faculty: {
          total: totalFaculty,
          active: activeFaculty,
          inactive: inactiveFaculty,
        },

        academic: {
          courses: totalCourses,
          departments: totalDepartments,
          programs: totalPrograms,
          enrollments: totalEnrollments,
        },

        assignments: {
          total: totalAssignments,
          submissions: totalSubmissions,
          gradedSubmissions,
          completionRate:
            submissionCompletionRate,
        },

        exams: {
          total: totalExams,
          upcoming: upcomingExams,
          completed:
            totalExams - upcomingExams,
        },

        fees: {
          totalAmount: totalFeeAmount,
          paidAmount: totalPaidAmount,
          pendingAmount: totalPendingAmount,
          pendingCount: pendingFees,
          partialCount: partialFees,
          paidCount: paidFees,
        },

        notices: {
          total: totalNotices,
          published: publishedNotices,
          unpublished:
            totalNotices - publishedNotices,
        },
      },
    });
  } catch (error) {
    console.error(
      "Admin report summary error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch admin report summary.",
      error: error.message,
    });
  }
};


/* =========================================================
   GET DEPARTMENT-WISE STUDENT REPORT
   GET /api/admin/reports/departments
   ========================================================= */

export const getDepartmentReport = async (
  req,
  res
) => {
  try {
    const departments =
      await prisma.department.findMany({
        orderBy: {
          name: "asc",
        },

        select: {
          id: true,
          name: true,
          code: true,

          _count: {
            select: {
              students: true,
              faculty: true,
              courses: true,
              programs: true,
            },
          },
        },
      });

    const report = departments.map(
      (department) => ({
        id: department.id,
        name: department.name,
        code: department.code,

        students:
          department._count.students,

        faculty:
          department._count.faculty,

        courses:
          department._count.courses,

        programs:
          department._count.programs,
      })
    );

    return res.status(200).json({
      success: true,
      message:
        "Department report fetched successfully.",
      count: report.length,
      departments: report,
    });
  } catch (error) {
    console.error(
      "Department report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch department report.",
      error: error.message,
    });
  }
};


/* =========================================================
   GET COURSE ENROLLMENT REPORT
   GET /api/admin/reports/courses
   ========================================================= */

export const getCourseReport = async (
  req,
  res
) => {
  try {
    const courses =
      await prisma.course.findMany({
        orderBy: {
          code: "asc",
        },

        select: {
          id: true,
          code: true,
          name: true,
          credits: true,
          semester: true,
          type: true,

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

          faculty: {
            select: {
              id: true,
              employeeId: true,

              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },

          _count: {
            select: {
              enrollments: true,
              attendance: true,
              assignments: true,
              exams: true,
              timetable: true,
            },
          },
        },
      });

    const report = courses.map(
      (course) => ({
        id: course.id,
        code: course.code,
        name: course.name,
        credits: course.credits,
        semester: course.semester,
        type: course.type,

        department:
          course.department,

        program:
          course.program,

        faculty: course.faculty
          ? {
              id: course.faculty.id,
              employeeId:
                course.faculty
                  .employeeId,
              name: `${course.faculty.user?.firstName || ""} ${
                course.faculty.user?.lastName || ""
              }`.trim(),
            }
          : null,

        enrollments:
          course._count.enrollments,

        attendanceRecords:
          course._count.attendance,

        assignments:
          course._count.assignments,

        exams:
          course._count.exams,

        timetableEntries:
          course._count.timetable,
      })
    );

    return res.status(200).json({
      success: true,
      message:
        "Course report fetched successfully.",
      count: report.length,
      courses: report,
    });
  } catch (error) {
    console.error(
      "Course report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch course report.",
      error: error.message,
    });
  }
};


/* =========================================================
   GET EXAM PERFORMANCE REPORT
   GET /api/admin/reports/exams
   ========================================================= */

export const getExamPerformanceReport =
  async (req, res) => {
    try {
      const exams =
        await prisma.exam.findMany({
          orderBy: {
            examDate: "asc",
          },

          select: {
            id: true,
            title: true,
            examType: true,
            examDate: true,
            maxMarks: true,

            course: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },

            _count: {
              select: {
                results: true,
              },
            },

            results: {
              select: {
                marksObtained: true,
              },
            },
          },
        });

      const report = exams.map(
        (exam) => {
          const results =
            exam.results || [];

          const totalStudents =
            results.length;

          const totalMarks =
            results.reduce(
              (sum, result) =>
                sum +
                Number(
                  result.marksObtained ||
                    0
                ),
              0
            );

          const averageMarks =
            totalStudents > 0
              ? Number(
                  (
                    totalMarks /
                    totalStudents
                  ).toFixed(2)
                )
              : 0;

          const averagePercentage =
            exam.maxMarks > 0
              ? Number(
                  (
                    (averageMarks /
                      exam.maxMarks) *
                    100
                  ).toFixed(2)
                )
              : 0;

          return {
            id: exam.id,
            title: exam.title,
            examType: exam.examType,
            examDate: exam.examDate,
            maxMarks: exam.maxMarks,

            course: exam.course,

            resultCount:
              exam._count.results,

            averageMarks,
            averagePercentage,
          };
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Exam performance report fetched successfully.",
        count: report.length,
        exams: report,
      });
    } catch (error) {
      console.error(
        "Exam performance report error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch exam performance report.",
        error: error.message,
      });
    }
  };


/* =========================================================
   GET FEE COLLECTION REPORT
   GET /api/admin/reports/fees
   ========================================================= */

export const getFeeReport = async (
  req,
  res
) => {
  try {
    const fees =
      await prisma.fee.findMany({
        orderBy: {
          dueDate: "asc",
        },

        select: {
          id: true,
          title: true,
          totalAmount: true,
          paidAmount: true,
          dueDate: true,
          status: true,

          student: {
            select: {
              id: true,
              enrollmentNumber: true,

              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },

              departmentRel: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },

          payments: {
            select: {
              id: true,
              amount: true,
              paymentDate: true,
              paymentMethod: true,
            },
          },
        },
      });

    const report = fees.map((fee) => ({
      id: fee.id,
      title: fee.title,

      student: {
        id: fee.student.id,

        enrollmentNumber:
          fee.student.enrollmentNumber,

        name: `${fee.student.user?.firstName || ""} ${
          fee.student.user?.lastName || ""
        }`.trim(),

        department:
          fee.student.departmentRel,
      },

      totalAmount:
        Number(fee.totalAmount || 0),

      paidAmount:
        Number(fee.paidAmount || 0),

      pendingAmount: Math.max(
        Number(fee.totalAmount || 0) -
          Number(fee.paidAmount || 0),
        0
      ),

      dueDate: fee.dueDate,
      status: fee.status,

      paymentCount:
        fee.payments.length,

      payments: fee.payments,
    }));

    const summary = report.reduce(
      (result, fee) => {
        result.totalAmount +=
          fee.totalAmount;

        result.paidAmount +=
          fee.paidAmount;

        result.pendingAmount +=
          fee.pendingAmount;

        return result;
      },
      {
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Fee report fetched successfully.",
      summary,
      count: report.length,
      fees: report,
    });
  } catch (error) {
    console.error(
      "Fee report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch fee report.",
      error: error.message,
    });
  }
};


/* =========================================================
   GET ASSIGNMENT SUBMISSION REPORT
   GET /api/admin/reports/assignments
   ========================================================= */

export const getAssignmentReport =
  async (req, res) => {
    try {
      const assignments =
        await prisma.assignment.findMany({
          orderBy: {
            dueDate: "asc",
          },

          select: {
            id: true,
            title: true,
            dueDate: true,
            maxMarks: true,

            course: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },

            _count: {
              select: {
                submissions: true,
              },
            },

            submissions: {
              select: {
                status: true,
                submittedAt: true,
                marksObtained: true,
              },
            },
          },
        });

      const report =
        assignments.map(
          (assignment) => {
            const submissions =
              assignment.submissions ||
              [];

            const submittedCount =
              submissions.filter(
                (submission) =>
                  submission.submittedAt !==
                  null
              ).length;

            const gradedCount =
              submissions.filter(
                (submission) =>
                  submission.marksObtained !==
                  null
              ).length;

            const averageMarks =
              gradedCount > 0
                ? Number(
                    (
                      submissions
                        .filter(
                          (submission) =>
                            submission.marksObtained !==
                            null
                        )
                        .reduce(
                          (
                            sum,
                            submission
                          ) =>
                            sum +
                            Number(
                              submission.marksObtained ||
                                0
                            ),
                          0
                        ) /
                      gradedCount
                    ).toFixed(2)
                  )
                : 0;

            return {
              id: assignment.id,
              title: assignment.title,
              dueDate: assignment.dueDate,
              maxMarks:
                assignment.maxMarks,

              course:
                assignment.course,

              totalSubmissions:
                assignment._count
                  .submissions,

              submittedCount,
              pendingCount:
                Math.max(
                  assignment._count
                    .submissions -
                    submittedCount,
                  0
                ),

              gradedCount,
              averageMarks,
            };
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Assignment report fetched successfully.",
        count: report.length,
        assignments: report,
      });
    } catch (error) {
      console.error(
        "Assignment report error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch assignment report.",
        error: error.message,
      });
    }
  };