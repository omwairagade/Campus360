import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpen,
  CheckCircle,
  ClipboardList,
  GraduationCap,
  Loader2,
  RefreshCw,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { apiGet } from "../api";

/* =========================================================
   HELPERS
   ========================================================= */

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-IN").format(
    Number.isFinite(number) ? number : 0
  );
}

function formatCurrency(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(
    Number.isFinite(number) ? number : 0
  );
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* =========================================================
   AUTH ERROR
   ========================================================= */

function handleAuthError(error) {
  const message = String(
    error?.message || ""
  ).toLowerCase();

  if (
    message.includes("401") ||
    message.includes("unauthorized") ||
    message.includes("authentication") ||
    message.includes("token")
  ) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/";

    return true;
  }

  return false;
}

/* =========================================================
   STAT CARD
   ========================================================= */

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass = "bg-gray-100 text-gray-600",
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <p className="mt-2 break-words text-2xl font-bold text-gray-900 md:text-3xl">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-gray-500">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SECTION
   ========================================================= */

function Section({
  title,
  description,
  icon: Icon,
  children,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
              <Icon size={19} />
            </div>
          )}

          <div>
            <h2 className="font-semibold text-gray-900">
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-sm text-gray-500">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   EMPTY STATE
   ========================================================= */

function EmptyState({ message }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <BarChart3
          size={26}
          className="text-gray-400"
        />
      </div>

      <p className="font-semibold text-gray-800">
        {message}
      </p>
    </div>
  );
}

/* =========================================================
   PROGRESS BAR
   ========================================================= */

function ProgressBar({
  label,
  value,
  total,
  suffix = "",
}) {
  const numericValue = Number(value || 0);
  const numericTotal = Number(total || 0);

  const percentage =
    numericTotal > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (numericValue / numericTotal) * 100
          )
        )
      : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-700">
          {label}
        </span>

        <span className="text-sm font-semibold text-gray-900">
          {formatNumber(value)}
          {suffix}
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gray-900 transition-all"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   ADMIN REPORTS
   ========================================================= */

export default function AdminReports() {
  const navigate = useNavigate();

  const [summary, setSummary] =
    useState(null);

  const [departments, setDepartments] =
    useState([]);

  const [courses, setCourses] =
    useState([]);

  const [exams, setExams] =
    useState([]);

  const [fees, setFees] =
    useState([]);

  const [feeSummary, setFeeSummary] =
    useState({
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
    });

  const [assignments, setAssignments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports(
    showRefreshLoader = false
  ) {
    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setSuccessMessage("");

      const [
        summaryData,
        departmentsData,
        coursesData,
        examsData,
        feesData,
        assignmentsData,
      ] = await Promise.all([
        apiGet(
          "/admin/reports/summary"
        ),
        apiGet(
          "/admin/reports/departments"
        ),
        apiGet(
          "/admin/reports/courses"
        ),
        apiGet(
          "/admin/reports/exams"
        ),
        apiGet(
          "/admin/reports/fees"
        ),
        apiGet(
          "/admin/reports/assignments"
        ),
      ]);

      setSummary(
        summaryData?.data || null
      );

      setDepartments(
        Array.isArray(
          departmentsData?.departments
        )
          ? departmentsData.departments
          : Array.isArray(
              departmentsData?.data
            )
          ? departmentsData.data
          : []
      );

      setCourses(
        Array.isArray(
          coursesData?.courses
        )
          ? coursesData.courses
          : Array.isArray(
              coursesData?.data
            )
          ? coursesData.data
          : []
      );

      setExams(
        Array.isArray(
          examsData?.exams
        )
          ? examsData.exams
          : Array.isArray(
              examsData?.data
            )
          ? examsData.data
          : []
      );

      setFeeSummary(
        feesData?.summary || {
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
        }
      );

      setFees(
        Array.isArray(
          feesData?.fees
        )
          ? feesData.fees
          : []
      );

      setAssignments(
        Array.isArray(
          assignmentsData?.assignments
        )
          ? assignmentsData.assignments
          : []
      );

      if (showRefreshLoader) {
        setSuccessMessage(
          "Reports refreshed successfully."
        );
      }
    } catch (err) {
      console.error(
        "Load admin reports error:",
        err
      );

      if (handleAuthError(err)) {
        return;
      }

      setError(
        err.message ||
          "Unable to load admin reports."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const derivedMetrics = useMemo(() => {
    const totalStudents =
      Number(
        summary?.students?.total || 0
      );

    const activeStudents =
      Number(
        summary?.students?.active || 0
      );

    const studentActivityRate =
      totalStudents > 0
        ? (
            (activeStudents /
              totalStudents) *
            100
          ).toFixed(1)
        : "0.0";

    const totalSubmissions =
      Number(
        summary?.assignments
          ?.submissions || 0
      );

    const gradedSubmissions =
      Number(
        summary?.assignments
          ?.gradedSubmissions || 0
      );

    const gradingRate =
      totalSubmissions > 0
        ? (
            (gradedSubmissions /
              totalSubmissions) *
            100
          ).toFixed(1)
        : "0.0";

    const feeCollectionRate =
      Number(
        feeSummary?.totalAmount || 0
      ) > 0
        ? (
            (Number(
              feeSummary?.paidAmount || 0
            ) /
              Number(
                feeSummary?.totalAmount || 0
              )) *
            100
          ).toFixed(1)
        : "0.0";

    return {
      studentActivityRate,
      gradingRate,
      feeCollectionRate,
    };
  }, [summary, feeSummary]);

  const topDepartments =
    useMemo(() => {
      return [...departments]
        .sort(
          (a, b) =>
            Number(b.students || 0) -
            Number(a.students || 0)
        )
        .slice(0, 5);
    }, [departments]);

  const topCourses =
    useMemo(() => {
      return [...courses]
        .sort(
          (a, b) =>
            Number(b.enrollments || 0) -
            Number(a.enrollments || 0)
        )
        .slice(0, 5);
    }, [courses]);

  const examAverage =
    useMemo(() => {
      if (!exams.length) {
        return 0;
      }

      const total = exams.reduce(
        (sum, exam) =>
          sum +
          Number(
            exam.averagePercentage || 0
          ),
        0
      );

      return (
        total / exams.length
      ).toFixed(1);
    }, [exams]);

  const assignmentAverage =
    useMemo(() => {
      if (!assignments.length) {
        return 0;
      }

      const graded =
        assignments.filter(
          (assignment) =>
            Number(
              assignment.gradedCount || 0
            ) > 0
        );

      if (!graded.length) {
        return 0;
      }

      const total =
        graded.reduce(
          (sum, assignment) =>
            sum +
            Number(
              assignment.averageMarks ||
                0
            ),
          0
        );

      return (
        total / graded.length
      ).toFixed(2);
    }, [assignments]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2
              size={26}
              className="animate-spin"
            />

            Loading reports...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <BarChart3 size={16} />

              <span>Admin</span>

              <span>/</span>

              <span>
                Reports & Analytics
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              Reports & Analytics
            </h1>

            <p className="mt-1 text-gray-600">
              Overview of academic, financial
              and operational data.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/admin/dashboard"
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              ← Back to Dashboard
            </button>

            <button
              type="button"
              onClick={() =>
                loadReports(true)
              }
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={18}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh Reports
            </button>
          </div>
        </div>

        {/* =====================================================
            SUCCESS
        ====================================================== */}

        {successMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            <CheckCircle size={20} />

            <span className="font-medium">
              {successMessage}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage("")
              }
              className="ml-auto rounded-lg p-1 hover:bg-green-100"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* =====================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <span className="font-medium">
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="ml-auto rounded-lg p-1 hover:bg-red-100"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* =====================================================
            SUMMARY CARDS
        ====================================================== */}

        {summary && (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Students"
                value={formatNumber(
                  summary.students?.total
                )}
                subtitle={`${formatNumber(
                  summary.students?.active
                )} active`}
                icon={GraduationCap}
                iconClass="bg-blue-100 text-blue-600"
              />

              <StatCard
                title="Faculty"
                value={formatNumber(
                  summary.faculty?.total
                )}
                subtitle={`${formatNumber(
                  summary.faculty?.active
                )} active`}
                icon={Users}
                iconClass="bg-purple-100 text-purple-600"
              />

              <StatCard
                title="Courses"
                value={formatNumber(
                  summary.academic?.courses
                )}
                subtitle={`${formatNumber(
                  summary.academic?.enrollments
                )} enrollments`}
                icon={BookOpen}
                iconClass="bg-green-100 text-green-600"
              />

              <StatCard
                title="Departments"
                value={formatNumber(
                  summary.academic?.departments
                )}
                subtitle={`${formatNumber(
                  summary.academic?.programs
                )} programs`}
                icon={BarChart3}
                iconClass="bg-orange-100 text-orange-600"
              />
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Exams"
                value={formatNumber(
                  summary.exams?.total
                )}
                subtitle={`${formatNumber(
                  summary.exams?.upcoming
                )} upcoming`}
                icon={ClipboardList}
                iconClass="bg-indigo-100 text-indigo-600"
              />

              <StatCard
                title="Assignments"
                value={formatNumber(
                  summary.assignments?.total
                )}
                subtitle={`${formatNumber(
                  summary.assignments?.submissions
                )} submissions`}
                icon={ClipboardList}
                iconClass="bg-yellow-100 text-yellow-600"
              />

              <StatCard
                title="Fee Collected"
                value={formatCurrency(
                  summary.fees?.paidAmount
                )}
                subtitle={`Pending ${formatCurrency(
                  summary.fees?.pendingAmount
                )}`}
                icon={Wallet}
                iconClass="bg-emerald-100 text-emerald-600"
              />

              <StatCard
                title="Published Notices"
                value={formatNumber(
                  summary.notices?.published
                )}
                subtitle={`of ${formatNumber(
                  summary.notices?.total
                )} total`}
                icon={CheckCircle}
                iconClass="bg-pink-100 text-pink-600"
              />
            </div>
          </>
        )}

        {/* =====================================================
            PERFORMANCE SNAPSHOT
        ====================================================== */}

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <Section
            title="Student Activity"
            description="Active student account rate."
            icon={GraduationCap}
          >
            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-900">
                {
                  derivedMetrics.studentActivityRate
                }
                %
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Active students compared with
                total students.
              </p>
            </div>

            <ProgressBar
              label="Active Students"
              value={
                summary?.students
                  ?.active || 0
              }
              total={
                summary?.students
                  ?.total || 0
              }
            />
          </Section>

          <Section
            title="Fee Collection"
            description="Overall fee collection progress."
            icon={Wallet}
          >
            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-900">
                {
                  derivedMetrics.feeCollectionRate
                }
                %
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Collected amount versus total
                fees.
              </p>
            </div>

            <ProgressBar
              label="Collected"
              value={
                feeSummary.paidAmount
              }
              total={
                feeSummary.totalAmount
              }
            />
          </Section>

          <Section
            title="Assignment Grading"
            description="Percentage of submissions that have been graded."
            icon={ClipboardList}
          >
            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-900">
                {
                  derivedMetrics.gradingRate
                }
                %
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Graded submissions compared
                with submitted work.
              </p>
            </div>

            <ProgressBar
              label="Graded"
              value={
                summary?.assignments
                  ?.gradedSubmissions || 0
              }
              total={
                summary?.assignments
                  ?.submissions || 0
              }
            />
          </Section>
        </div>

        {/* =====================================================
            DEPARTMENT OVERVIEW
        ====================================================== */}

        <div className="mb-6">
          <Section
            title="Department Overview"
            description="Students, faculty, courses and programs by department."
            icon={Users}
          >
            {departments.length ===
            0 ? (
              <EmptyState message="No department data available." />
            ) : (
              <>
                <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {topDepartments.map(
                    (department) => (
                      <div
                        key={
                          department.id
                        }
                        className="rounded-xl border bg-gray-50 p-4"
                      >
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {
                            department.name
                          }
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {
                            department.code
                          }
                        </p>

                        <p className="mt-3 text-2xl font-bold text-gray-900">
                          {formatNumber(
                            department.students
                          )}
                        </p>

                        <p className="text-xs text-gray-500">
                          students
                        </p>
                      </div>
                    )
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[750px]">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Department
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Students
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Faculty
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Courses
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Programs
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {departments.map(
                        (department) => (
                          <tr
                            key={
                              department.id
                            }
                            className="hover:bg-gray-50"
                          >
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-900">
                                {
                                  department.name
                                }
                              </p>

                              <p className="text-xs text-gray-500">
                                {
                                  department.code
                                }
                              </p>
                            </td>

                            <td className="px-4 py-3 font-semibold text-gray-800">
                              {formatNumber(
                                department.students
                              )}
                            </td>

                            <td className="px-4 py-3 font-semibold text-gray-800">
                              {formatNumber(
                                department.faculty
                              )}
                            </td>

                            <td className="px-4 py-3 font-semibold text-gray-800">
                              {formatNumber(
                                department.courses
                              )}
                            </td>

                            <td className="px-4 py-3 font-semibold text-gray-800">
                              {formatNumber(
                                department.programs
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Section>
        </div>

        {/* =====================================================
            COURSE OVERVIEW
        ====================================================== */}

        <div className="mb-6">
          <Section
            title="Course Overview"
            description="Enrollment and academic activity by course."
            icon={BookOpen}
          >
            {courses.length ===
            0 ? (
              <EmptyState message="No course data available." />
            ) : (
              <>
                <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {topCourses.map(
                    (course) => (
                      <div
                        key={course.id}
                        className="rounded-xl border bg-gray-50 p-4"
                      >
                        <p className="text-sm font-bold text-gray-900">
                          {course.code}
                        </p>

                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                          {course.name}
                        </p>

                        <p className="mt-3 text-2xl font-bold text-gray-900">
                          {formatNumber(
                            course.enrollments
                          )}
                        </p>

                        <p className="text-xs text-gray-500">
                          enrollments
                        </p>
                      </div>
                    )
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px]">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Course
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Department
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Semester
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Faculty
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Enrollments
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Assignments
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Exams
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y">
                      {courses.map(
                        (course) => (
                          <tr
                            key={course.id}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-900">
                                {
                                  course.code
                                }
                              </p>

                              <p className="text-sm text-gray-500">
                                {
                                  course.name
                                }
                              </p>
                            </td>

                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-gray-800">
                                {course
                                  .department
                                  ?.code ||
                                  "-"}
                              </p>

                              <p className="text-xs text-gray-500">
                                {course
                                  .department
                                  ?.name ||
                                  "-"}
                              </p>
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-700">
                              Sem{" "}
                              {
                                course.semester
                              }
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-700">
                              {course
                                .faculty
                                ?.name ||
                                "Not assigned"}
                            </td>

                            <td className="px-4 py-3 font-semibold text-gray-800">
                              {formatNumber(
                                course.enrollments
                              )}
                            </td>

                            <td className="px-4 py-3 font-semibold text-gray-800">
                              {formatNumber(
                                course.assignments
                              )}
                            </td>

                            <td className="px-4 py-3 font-semibold text-gray-800">
                              {formatNumber(
                                course.exams
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Section>
        </div>

        {/* =====================================================
            EXAM PERFORMANCE
        ====================================================== */}

        <div className="mb-6">
          <Section
            title="Exam Performance"
            description={`Average performance across ${formatNumber(
              exams.length
            )} exams.`}
            icon={ClipboardList}
          >
            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border bg-indigo-50 p-4">
                <p className="text-sm text-indigo-700">
                  Average Exam Percentage
                </p>

                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {examAverage}%
                </p>
              </div>

              <div className="rounded-xl border bg-blue-50 p-4">
                <p className="text-sm text-blue-700">
                  Total Results Recorded
                </p>

                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {formatNumber(
                    exams.reduce(
                      (sum, exam) =>
                        sum +
                        Number(
                          exam.resultCount ||
                            0
                        ),
                      0
                    )
                  )}
                </p>
              </div>
            </div>

            {exams.length === 0 ? (
              <EmptyState message="No exam performance data available." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Exam
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Course
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Date
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Max Marks
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Results
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Average
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Average %
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {exams.map(
                      (exam) => (
                        <tr
                          key={exam.id}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">
                              {
                                exam.title
                              }
                            </p>

                            <p className="text-xs text-gray-500">
                              {
                                exam.examType
                              }
                            </p>
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-700">
                            {exam.course
                              ?.code ||
                              "-"}
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatDate(
                              exam.examDate
                            )}
                          </td>

                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {
                              exam.maxMarks
                            }
                          </td>

                          <td className="px-4 py-3 font-semibold text-purple-600">
                            {formatNumber(
                              exam.resultCount
                            )}
                          </td>

                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {
                              exam.averageMarks
                            }
                          </td>

                          <td className="px-4 py-3 font-semibold text-blue-600">
                            {
                              exam.averagePercentage
                            }
                            %
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        {/* =====================================================
            FEE COLLECTION
        ====================================================== */}

        <div className="mb-6">
          <Section
            title="Fee Collection"
            description="Financial collection, pending amount and payment status."
            icon={Wallet}
          >
            <div className="mb-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border bg-blue-50 p-4">
                <p className="text-sm text-blue-700">
                  Total Fees
                </p>

                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    feeSummary.totalAmount
                  )}
                </p>
              </div>

              <div className="rounded-xl border bg-green-50 p-4">
                <p className="text-sm text-green-700">
                  Collected
                </p>

                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    feeSummary.paidAmount
                  )}
                </p>
              </div>

              <div className="rounded-xl border bg-orange-50 p-4">
                <p className="text-sm text-orange-700">
                  Pending
                </p>

                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    feeSummary.pendingAmount
                  )}
                </p>
              </div>
            </div>

            {fees.length === 0 ? (
              <EmptyState message="No fee records available." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px]">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Student
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Fee
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Total
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Paid
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Pending
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Due Date
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {fees.map(
                      (fee) => (
                        <tr
                          key={fee.id}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">
                              {fee.student
                                ?.name ||
                                "-"}
                            </p>

                            <p className="text-xs text-gray-500">
                              {fee.student
                                ?.enrollmentNumber ||
                                "-"}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-700">
                            {fee.title}
                          </td>

                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {formatCurrency(
                              fee.totalAmount
                            )}
                          </td>

                          <td className="px-4 py-3 font-semibold text-green-600">
                            {formatCurrency(
                              fee.paidAmount
                            )}
                          </td>

                          <td className="px-4 py-3 font-semibold text-orange-600">
                            {formatCurrency(
                              fee.pendingAmount
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatDate(
                              fee.dueDate
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                fee.status ===
                                "PAID"
                                  ? "bg-green-100 text-green-700"
                                  : fee.status ===
                                    "PARTIAL"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {
                                fee.status
                              }
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        {/* =====================================================
            ASSIGNMENT REPORT
        ====================================================== */}

        <Section
          title="Assignment Submission Report"
          description="Submission, grading and average-mark analysis."
          icon={ClipboardList}
        >
          <div className="mb-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-yellow-50 p-4">
              <p className="text-sm text-yellow-700">
                Total Assignments
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatNumber(
                  assignments.length
                )}
              </p>
            </div>

            <div className="rounded-xl border bg-purple-50 p-4">
              <p className="text-sm text-purple-700">
                Average Marks
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {assignmentAverage}
              </p>
            </div>

            <div className="rounded-xl border bg-green-50 p-4">
              <p className="text-sm text-green-700">
                Graded Submissions
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatNumber(
                  summary?.assignments
                    ?.gradedSubmissions
                )}
              </p>
            </div>
          </div>

          {assignments.length ===
          0 ? (
            <EmptyState message="No assignment report data available." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Assignment
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Course
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Due Date
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Total
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Submitted
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Pending
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Graded
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Average
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {assignments.map(
                    (assignment) => (
                      <tr
                        key={
                          assignment.id
                        }
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">
                            {
                              assignment.title
                            }
                          </p>
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-700">
                          {assignment
                            .course
                            ?.code ||
                            "-"}
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatDate(
                            assignment.dueDate
                          )}
                        </td>

                        <td className="px-4 py-3 font-semibold text-gray-800">
                          {formatNumber(
                            assignment.totalSubmissions
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 font-semibold text-green-600">
                            <ArrowUp
                              size={14}
                            />

                            {formatNumber(
                              assignment.submittedCount
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 font-semibold text-orange-600">
                            <ArrowDown
                              size={14}
                            />

                            {formatNumber(
                              assignment.pendingCount
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-semibold text-purple-600">
                          {formatNumber(
                            assignment.gradedCount
                          )}
                        </td>

                        <td className="px-4 py-3 font-semibold text-gray-800">
                          {
                            assignment.averageMarks
                          }
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}