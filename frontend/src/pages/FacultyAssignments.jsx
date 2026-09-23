import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ClipboardList,
  FileText,
  Filter,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  Users,
  X,
  AlertCircle,
  AlertTriangle,
  CircleAlert,
  Zap,
  GraduationCap,
  Activity,
  Layers3,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  apiGet,
  apiPost,
  logoutUser,
} from "../api";

/* ============================================================
   HELPERS
============================================================ */

const normalizeArray = (
  response,
  keys = []
) => {
  if (Array.isArray(response)) {
    return response;
  }

  for (const key of keys) {
    if (
      Array.isArray(
        response?.[key]
      )
    ) {
      return response[key];
    }
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  for (const key of keys) {
    if (
      Array.isArray(
        response?.data?.[key]
      )
    ) {
      return response.data[key];
    }
  }

  return [];
};

const isAuthError = (
  message
) =>
  /authentication|unauthorized|forbidden|token/i.test(
    message || ""
  );

const getCourseName = (
  assignment
) =>
  assignment?.course?.name ||
  assignment?.course?.title ||
  assignment?.courseName ||
  "Course";

const getCourseCode = (
  assignment
) =>
  assignment?.course?.code ||
  assignment?.course?.courseCode ||
  assignment?.courseCode ||
  "N/A";

const getSubmissions = (
  assignment
) =>
  Array.isArray(
    assignment?.submissions
  )
    ? assignment.submissions
    : [];

const getSubmissionCount = (
  assignment
) => {
  const explicit =
    assignment?.totalSubmissions;

  if (
    explicit !== null &&
    explicit !== undefined
  ) {
    return Number(explicit);
  }

  return getSubmissions(
    assignment
  ).length;
};

const getFileCount = (
  assignment
) =>
  getSubmissions(
    assignment
  ).filter(
    (submission) =>
      Boolean(
        submission?.fileUrl ||
          submission?.fileName
      )
  ).length;

const getPendingGrading = (
  assignment
) => {
  if (
    assignment?.pendingGrading !==
      null &&
    assignment?.pendingGrading !==
      undefined
  ) {
    return Number(
      assignment.pendingGrading
    );
  }

  return getSubmissions(
    assignment
  ).filter(
    (submission) =>
      String(
        submission?.status ||
          ""
      ).toUpperCase() !==
      "GRADED"
  ).length;
};

const getGradedCount = (
  assignment
) => {
  if (
    assignment?.gradedSubmissions !==
      null &&
    assignment?.gradedSubmissions !==
      undefined
  ) {
    return Number(
      assignment.gradedSubmissions
    );
  }

  return getSubmissions(
    assignment
  ).filter(
    (submission) =>
      String(
        submission?.status ||
          ""
      ).toUpperCase() ===
      "GRADED"
  ).length;
};

const getAssignmentStatus = (
  assignment
) => {
  const dueDate =
    assignment?.dueDate
      ? new Date(
          assignment.dueDate
        )
      : null;

  const overdue =
    dueDate &&
    !Number.isNaN(
      dueDate.getTime()
    ) &&
    dueDate < new Date();

  const pending =
    getPendingGrading(
      assignment
    );

  const submissions =
    getSubmissionCount(
      assignment
    );

  if (
    submissions === 0 &&
    overdue
  ) {
    return "OVERDUE";
  }

  if (
    submissions > 0 &&
    pending > 0
  ) {
    return "NEEDS_GRADING";
  }

  if (
    submissions > 0 &&
    pending === 0
  ) {
    return "GRADED";
  }

  if (overdue) {
    return "OVERDUE";
  }

  return "ACTIVE";
};

const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const formatDateTime = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

const getDaysUntilDue = (
  value
) => {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  const now =
    new Date();

  now.setHours(
    0,
    0,
    0,
    0
  );

  date.setHours(
    0,
    0,
    0,
    0
  );

  return Math.ceil(
    (
      date.getTime() -
      now.getTime()
    ) /
      (
        1000 *
        60 *
        60 *
        24
      )
  );
};

const getUrgency = (
  value
) => {
  const days =
    getDaysUntilDue(value);

  if (days === null) {
    return {
      label:
        "Date unavailable",
      className:
        "bg-slate-100 text-slate-600 border-slate-200",
    };
  }

  if (days < 0) {
    return {
      label:
        "Overdue",
      className:
        "bg-red-50 text-red-700 border-red-200",
    };
  }

  if (days === 0) {
    return {
      label:
        "Due today",
      className:
        "bg-red-50 text-red-700 border-red-200",
    };
  }

  if (days === 1) {
    return {
      label:
        "Due tomorrow",
      className:
        "bg-orange-50 text-orange-700 border-orange-200",
    };
  }

  if (days <= 3) {
    return {
      label:
        `Due in ${days} days`,
      className:
        "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  if (days <= 7) {
    return {
      label:
        `Due in ${days} days`,
      className:
        "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  return {
    label:
      `Due in ${days} days`,
    className:
      "bg-green-50 text-green-700 border-green-200",
  };
};

/* ============================================================
   COMPONENT
============================================================ */

function FacultyAssignments() {
  const navigate =
    useNavigate();

  const [courses, setCourses] =
    useState([]);

  const [assignments, setAssignments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [showForm, setShowForm] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [courseFilter, setCourseFilter] =
    useState("ALL");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [sortBy, setSortBy] =
    useState("dueDate");

  const [viewMode, setViewMode] =
    useState("grid");

  const [form, setForm] =
    useState({
      courseId: "",
      title: "",
      description: "",
      dueDate: "",
      maxMarks: "100",
    });

  /* ==========================================================
     LOAD COURSES
  ========================================================== */

  const fetchCourses =
    useCallback(
      async () => {
        try {
          const data =
            await apiGet(
              "/faculty/my-courses"
            );

          return normalizeArray(
            data,
            ["courses"]
          );
        } catch (firstError) {
          const message =
            String(
              firstError?.message ||
                ""
            ).toLowerCase();

          if (
            message.includes("404")
          ) {
            const fallback =
              await apiGet(
                "/faculty/courses"
              );

            return normalizeArray(
              fallback,
              ["courses"]
            );
          }

          throw firstError;
        }
      },
      []
    );

  /* ==========================================================
     LOAD ASSIGNMENTS
  ========================================================== */

  const fetchAssignments =
    useCallback(
      async () => {
        const data =
          await apiGet(
            "/assignments/faculty/my-assignments"
          );

        const loaded =
          normalizeArray(
            data,
            ["assignments"]
          );

        setAssignments(
          loaded
        );

        return loaded;
      },
      []
    );

  /* ==========================================================
     LOAD EVERYTHING
  ========================================================== */

  const loadData =
    useCallback(
      async (
        isRefresh = false
      ) => {
        try {
          if (isRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const [
            coursesResult,
            assignmentsResult,
          ] =
            await Promise.allSettled([
              fetchCourses(),
              fetchAssignments(),
            ]);

          const failures = [];

          if (
            coursesResult.status ===
            "fulfilled"
          ) {
            setCourses(
              coursesResult.value
            );
          } else {
            failures.push({
              name: "courses",
              error:
                coursesResult.reason,
            });
          }

          if (
            assignmentsResult.status ===
            "rejected"
          ) {
            failures.push({
              name: "assignments",
              error:
                assignmentsResult.reason,
            });
          }

          const authFailure =
            failures.find(
              (failure) =>
                isAuthError(
                  failure.error
                    ?.message
                )
            );

          if (authFailure) {
            logoutUser();
            navigate("/");
            return;
          }

          if (
            failures.length >
            0
          ) {
            setError(
              `Some assignment data could not be loaded: ${failures
                .map(
                  (failure) =>
                    failure.name
                )
                .join(", ")}.`
            );
          }
        } catch (err) {
          console.error(
            "Faculty assignments error:",
            err
          );

          const message =
            err?.message ||
            "Unable to load assignments.";

          setError(
            message
          );

          if (
            isAuthError(
              message
            )
          ) {
            logoutUser();
            navigate("/");
          }
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        fetchCourses,
        fetchAssignments,
        navigate,
      ]
    );

  useEffect(() => {
    loadData();
  }, [
    loadData,
  ]);

  /* ==========================================================
     FORM HANDLER
  ========================================================== */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );

    setError("");
    setSuccess("");
  };

  /* ==========================================================
     RESET FORM
  ========================================================== */

  const resetForm = () => {
    setForm({
      courseId: "",
      title: "",
      description: "",
      dueDate: "",
      maxMarks: "100",
    });

    setShowForm(false);
  };

  /* ==========================================================
     CREATE ASSIGNMENT
  ========================================================== */

  const handleCreateAssignment =
    async (event) => {
      event.preventDefault();

      try {
        setError("");
        setSuccess("");

        if (
          !form.courseId ||
          !form.title.trim() ||
          !form.dueDate
        ) {
          setError(
            "Course, title and due date are required."
          );
          return;
        }

        const maxMarks =
          Number(
            form.maxMarks
          );

        if (
          Number.isNaN(
            maxMarks
          ) ||
          maxMarks <= 0
        ) {
          setError(
            "Maximum marks must be greater than 0."
          );
          return;
        }

        const dueDate =
          new Date(
            form.dueDate
          );

        if (
          Number.isNaN(
            dueDate.getTime()
          )
        ) {
          setError(
            "Please enter a valid due date."
          );
          return;
        }

        if (
          dueDate <=
          new Date()
        ) {
          setError(
            "Assignment due date must be in the future."
          );
          return;
        }

        setSaving(true);

        const data =
          await apiPost(
            "/assignments",
            {
              courseId:
                Number(
                  form.courseId
                ),
              title:
                form.title.trim(),
              description:
                form.description.trim(),
              dueDate:
                form.dueDate,
              maxMarks,
            }
          );

        setSuccess(
          data?.message ||
            "Assignment created successfully."
        );

        resetForm();

        await fetchAssignments();
      } catch (err) {
        console.error(
          "Create assignment error:",
          err
        );

        const message =
          err?.message ||
          "Unable to create assignment.";

        setError(
          message
        );

        if (
          isAuthError(
            message
          )
        ) {
          logoutUser();
          navigate("/");
        }
      } finally {
        setSaving(false);
      }
    };

  /* ==========================================================
     COURSE OPTIONS
  ========================================================== */

  const courseOptions =
    useMemo(() => {
      return courses
        .filter(
          (course) =>
            course?.id !==
              null &&
            course?.id !==
              undefined
        )
        .map(
          (course) => ({
            id: String(
              course.id
            ),
            code:
              course.code ||
              course.courseCode ||
              "COURSE",
            name:
              course.name ||
              course.title ||
              "Course",
          })
        );
    }, [courses]);

  /* ==========================================================
     STATISTICS
  ========================================================== */

  const totalSubmissions =
    assignments.reduce(
      (sum, assignment) =>
        sum +
        getSubmissionCount(
          assignment
        ),
      0
    );

  const totalFiles =
    assignments.reduce(
      (sum, assignment) =>
        sum +
        getFileCount(
          assignment
        ),
      0
    );

  const pendingGrading =
    assignments.reduce(
      (sum, assignment) =>
        sum +
        getPendingGrading(
          assignment
        ),
      0
    );

  const gradedSubmissions =
    assignments.reduce(
      (sum, assignment) =>
        sum +
        getGradedCount(
          assignment
        ),
      0
    );

  const upcomingAssignments =
    assignments.filter(
      (assignment) => {
        const dueDate =
          assignment?.dueDate
            ? new Date(
                assignment.dueDate
              )
            : null;

        return (
          dueDate &&
          !Number.isNaN(
            dueDate.getTime()
          ) &&
          dueDate >=
            new Date()
        );
      }
    );

  const overdueAssignments =
    assignments.filter(
      (assignment) =>
        getAssignmentStatus(
          assignment
        ) ===
        "OVERDUE"
    );

  const needsGradingAssignments =
    assignments.filter(
      (assignment) =>
        getAssignmentStatus(
          assignment
        ) ===
        "NEEDS_GRADING"
    );

  const gradedAssignments =
    assignments.filter(
      (assignment) =>
        getAssignmentStatus(
          assignment
        ) ===
        "GRADED"
    );

  const activeAssignments =
    assignments.filter(
      (assignment) =>
        getAssignmentStatus(
          assignment
        ) ===
        "ACTIVE"
    );

  const gradingProgress =
    totalSubmissions > 0
      ? Math.round(
          (
            gradedSubmissions /
            totalSubmissions
          ) *
            100
        )
      : 0;

  const submissionCoverage =
    assignments.length > 0
      ? Math.round(
          (
            totalSubmissions /
            assignments.length
          )
        )
      : 0;

  const averageSubmissionsPerAssignment =
    assignments.length > 0
      ? (
          totalSubmissions /
          assignments.length
        ).toFixed(1)
      : "0.0";

  const averagePendingPerAssignment =
    assignments.length > 0
      ? (
          pendingGrading /
          assignments.length
        ).toFixed(1)
      : "0.0";

  const completionHealth =
    gradingProgress >= 90
      ? "Excellent"
      : gradingProgress >= 75
      ? "Good"
      : gradingProgress >= 50
      ? "Moderate"
      : "Needs Attention";

  const attentionScore =
    pendingGrading +
    overdueAssignments.length;

  /* ==========================================================
     COURSE DISTRIBUTION
  ========================================================== */

  const courseDistribution =
    useMemo(() => {
      const map =
        new Map();

      assignments.forEach(
        (assignment) => {
          const code =
            getCourseCode(
              assignment
            );

          const name =
            getCourseName(
              assignment
            );

          const key =
            `${code}|${name}`;

          const existing =
            map.get(key) || {
              code,
              name,
              assignments: 0,
              submissions: 0,
              pending: 0,
              graded: 0,
              files: 0,
            };

          existing.assignments +=
            1;

          existing.submissions +=
            getSubmissionCount(
              assignment
            );

          existing.pending +=
            getPendingGrading(
              assignment
            );

          existing.graded +=
            getGradedCount(
              assignment
            );

          existing.files +=
            getFileCount(
              assignment
            );

          map.set(
            key,
            existing
          );
        }
      );

      return [
        ...map.values(),
      ].sort(
        (a, b) => {
          if (
            b.submissions !==
            a.submissions
          ) {
            return (
              b.submissions -
              a.submissions
            );
          }

          return (
            b.assignments -
            a.assignments
          );
        }
      );
    }, [
      assignments,
    ]);

  /* ==========================================================
     UPCOMING SORTED
  ========================================================== */

  const sortedUpcoming =
    useMemo(() => {
      return [
        ...upcomingAssignments,
      ]
        .sort(
          (a, b) =>
            new Date(
              a?.dueDate
            ).getTime() -
            new Date(
              b?.dueDate
            ).getTime()
        )
        .slice(0, 6);
    }, [
      upcomingAssignments,
    ]);

  /* ==========================================================
     FILTERED ASSIGNMENTS
  ========================================================== */

  const filteredAssignments =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      const filtered =
        assignments.filter(
          (assignment) => {
            const courseId =
              String(
                assignment?.course
                  ?.id ||
                  assignment?.courseId ||
                  ""
              );

            const status =
              getAssignmentStatus(
                assignment
              );

            const searchableText =
              [
                assignment?.title,
                assignment?.description,
                getCourseCode(
                  assignment
                ),
                getCourseName(
                  assignment
                ),
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
              !search ||
              searchableText.includes(
                search
              );

            const matchesCourse =
              courseFilter ===
                "ALL" ||
              courseId ===
                courseFilter;

            const matchesStatus =
              statusFilter ===
                "ALL" ||
              status ===
                statusFilter;

            return (
              matchesSearch &&
              matchesCourse &&
              matchesStatus
            );
          }
        );

      return [
        ...filtered,
      ].sort(
        (a, b) => {
          if (
            sortBy ===
            "title"
          ) {
            return String(
              a?.title ||
                ""
            ).localeCompare(
              String(
                b?.title ||
                  ""
              )
            );
          }

          if (
            sortBy ===
            "course"
          ) {
            return getCourseCode(
              a
            ).localeCompare(
              getCourseCode(
                b
              )
            );
          }

          if (
            sortBy ===
            "submissions"
          ) {
            return (
              getSubmissionCount(
                b
              ) -
              getSubmissionCount(
                a
              )
            );
          }

          if (
            sortBy ===
            "grading"
          ) {
            return (
              getPendingGrading(
                b
              ) -
              getPendingGrading(
                a
              )
            );
          }

          if (
            sortBy ===
            "newest"
          ) {
            return (
              new Date(
                b?.createdAt ||
                  0
              ).getTime() -
              new Date(
                a?.createdAt ||
                  0
              ).getTime()
            );
          }

          const dateA =
            a?.dueDate
              ? new Date(
                  a.dueDate
                ).getTime()
              : Number.MAX_SAFE_INTEGER;

          const dateB =
            b?.dueDate
              ? new Date(
                  b.dueDate
                ).getTime()
              : Number.MAX_SAFE_INTEGER;

          return (
            dateA -
            dateB
          );
        }
      );
    }, [
      assignments,
      searchTerm,
      courseFilter,
      statusFilter,
      sortBy,
    ]);

  /* ==========================================================
     FILTER STATE
  ========================================================== */

  const hasFilters =
    searchTerm.trim() !==
      "" ||
    courseFilter !==
      "ALL" ||
    statusFilter !==
      "ALL";

  const clearFilters = () => {
    setSearchTerm("");
    setCourseFilter(
      "ALL"
    );
    setStatusFilter(
      "ALL"
    );
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">

          <div className="flex min-w-0 items-center gap-3">

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/faculty/dashboard"
                )
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-indigo-600"
              title="Back to Faculty Dashboard"
            >

              <ArrowLeft
                size={19}
              />

            </button>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">

              <ClipboardList
                size={22}
              />

            </div>

            <div className="min-w-0">

              <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                Faculty Portal
              </p>

              <h1 className="truncate text-xl font-bold text-slate-900 md:text-2xl">
                Assignments
              </h1>

              <p className="hidden text-sm text-slate-500 sm:block">
                Create, monitor and manage student assessments
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() =>
                loadData(true)
              }
              disabled={
                refreshing
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            >

              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              <span className="hidden sm:inline">
                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </span>

            </button>

            <button
              type="button"
              onClick={() =>
                setShowForm(
                  true
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 sm:px-4"
            >

              <Plus
                size={18}
              />

              <span className="hidden sm:inline">
                Create
              </span>

              <span className="sm:hidden">
                New
              </span>

            </button>

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-indigo-600 p-6 text-white shadow-lg sm:p-8">

          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10" />

          <div className="absolute -bottom-20 right-20 h-52 w-52 rounded-full bg-white/5" />

          <div className="relative grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">

            <div className="max-w-3xl">

              <div className="mb-3 flex flex-wrap gap-2">

                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                  Assignment Management
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">

                  {assignments.length}
                  {" "}
                  assignment
                  {assignments.length ===
                  1
                    ? ""
                    : "s"}

                </span>

                {attentionScore >
                  0 && (
                  <span className="rounded-full bg-red-400/20 px-3 py-1.5 text-xs font-bold text-red-100">

                    {attentionScore}
                    {" "}
                    items need attention

                  </span>
                )}

              </div>

              <h2 className="text-2xl font-bold sm:text-3xl">
                Manage assessments with clarity
              </h2>

              <p className="mt-2 text-sm leading-6 text-indigo-100 sm:text-base">

                Create assignments, monitor submissions, track grading progress and stay ahead of important academic deadlines.

              </p>

              <div className="mt-5 flex flex-wrap gap-3">

                <HeroPill
                  icon={
                    <Users size={14} />
                  }
                  text={`${totalSubmissions} submissions`}
                />

                <HeroPill
                  icon={
                    <Clock3
                      size={14}
                    />
                  }
                  text={`${pendingGrading} pending grading`}
                />

                <HeroPill
                  icon={
                    <CalendarDays
                      size={14}
                    />
                  }
                  text={`${upcomingAssignments.length} upcoming`}
                />

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              <HeroMetric
                value={
                  totalSubmissions
                }
                label="Submissions"
              />

              <HeroMetric
                value={
                  pendingGrading
                }
                label="Pending"
              />

              <HeroMetric
                value={
                  overdueAssignments.length
                }
                label="Overdue"
              />

              <HeroMetric
                value={`${gradingProgress}%`}
                label="Graded"
              />

            </div>

          </div>

        </section>

        {/* ====================================================
            MESSAGES
        ==================================================== */}

        {error && (
          <AlertBox
            type="error"
            message={
              error
            }
            onClose={() =>
              setError("")
            }
          />
        )}

        {success && (
          <AlertBox
            type="success"
            message={
              success
            }
            onClose={() =>
              setSuccess("")
            }
          />
        )}

        {/* ====================================================
            SUMMARY CARDS
        ==================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">

          <SummaryCard
            icon={
              <FileText
                size={21}
              />
            }
            title="Assignments"
            value={
              assignments.length
            }
            description="Created by you"
          />

          <SummaryCard
            icon={
              <Users size={21} />
            }
            title="Submissions"
            value={
              totalSubmissions
            }
            description="Student submissions"
            type="info"
          />

          <SummaryCard
            icon={
              <Clock3 size={21} />
            }
            title="Pending Grading"
            value={
              pendingGrading
            }
            description="Awaiting evaluation"
            type="warning"
          />

          <SummaryCard
            icon={
              <CheckCircle2
                size={21}
              />
            }
            title="Graded"
            value={
              gradedSubmissions
            }
            description="Evaluated submissions"
            type="positive"
          />

          <SummaryCard
            icon={
              <CalendarDays
                size={21}
              />
            }
            title="Upcoming"
            value={
              upcomingAssignments.length
            }
            description="Future deadlines"
            type="info"
          />

        </section>

        {/* ====================================================
            ANALYTICS
        ==================================================== */}

        <section className="mt-8 grid gap-6 xl:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

                  <BarChart3
                    size={21}
                  />

                </div>

                <div>

                  <h2 className="font-bold text-slate-900">
                    Assessment Analytics
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Overall assignment workload and grading health.
                  </p>

                </div>

              </div>

              <span className="inline-flex w-fit rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600">
                {completionHealth}
              </span>

            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">

              <AnalyticsBox
                icon={
                  <TrendingUp
                    size={20}
                  />
                }
                label="Grading Progress"
                value={`${gradingProgress}%`}
                description={`${gradedSubmissions} of ${totalSubmissions} submissions graded`}
              />

              <AnalyticsBox
                icon={
                  <Activity
                    size={20}
                  />
                }
                label="Avg. Submissions"
                value={
                  averageSubmissionsPerAssignment
                }
                description="Per assignment"
              />

              <AnalyticsBox
                icon={
                  <Target size={20} />
                }
                label="Avg. Pending"
                value={
                  averagePendingPerAssignment
                }
                description="Per assignment"
              />

            </div>

            <div className="mt-6">

              <div className="mb-2 flex items-center justify-between">

                <span className="text-xs font-semibold text-slate-500">
                  Overall grading progress
                </span>

                <span className="text-xs font-bold text-indigo-600">
                  {gradingProgress}%
                </span>

              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100">

                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    gradingProgress >=
                    90
                      ? "bg-green-500"
                      : gradingProgress >=
                        75
                      ? "bg-blue-500"
                      : gradingProgress >=
                        50
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      gradingProgress,
                      100
                    )}%`,
                  }}
                />

              </div>

            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">

              <MetricTile
                label="Files Collected"
                value={
                  totalFiles
                }
                icon={
                  <Paperclip
                    size={17}
                  />
                }
              />

              <MetricTile
                label="Course Coverage"
                value={
                  courseDistribution.length
                }
                icon={
                  <Layers3
                    size={17}
                  />
                }
              />

              <MetricTile
                label="Attention Queue"
                value={
                  attentionScore
                }
                icon={
                  <CircleAlert
                    size={17}
                  />
                }
              />

            </div>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">

                <CircleAlert
                  size={21}
                />

              </div>

              <div>

                <h2 className="font-bold text-slate-900">
                  Assignment Status
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Current workload distribution.
                </p>

              </div>

            </div>

            <div className="mt-6 space-y-4">

              <StatusSummaryRow
                label="Active"
                value={
                  activeAssignments.length
                }
                total={
                  Math.max(
                    assignments.length,
                    1
                  )
                }
                className="bg-blue-500"
              />

              <StatusSummaryRow
                label="Needs Grading"
                value={
                  needsGradingAssignments.length
                }
                total={
                  Math.max(
                    assignments.length,
                    1
                  )
                }
                className="bg-amber-500"
              />

              <StatusSummaryRow
                label="Fully Graded"
                value={
                  gradedAssignments.length
                }
                total={
                  Math.max(
                    assignments.length,
                    1
                  )
                }
                className="bg-green-500"
              />

              <StatusSummaryRow
                label="Overdue"
                value={
                  overdueAssignments.length
                }
                total={
                  Math.max(
                    assignments.length,
                    1
                  )
                }
                className="bg-red-500"
              />

            </div>

          </div>

        </section>

        {/* ====================================================
            UPCOMING DEADLINES
        ==================================================== */}

        {sortedUpcoming.length >
          0 && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                  <CalendarDays
                    size={21}
                  />

                </div>

                <div>

                  <h2 className="font-bold text-slate-900">
                    Upcoming Deadlines
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Closest assignment deadlines across your courses.
                  </p>

                </div>

              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600">
                {upcomingAssignments.length} upcoming
              </span>

            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">

              {sortedUpcoming.map(
                (
                  assignment
                ) => {

                  const urgency =
                    getUrgency(
                      assignment?.dueDate
                    );

                  const pending =
                    getPendingGrading(
                      assignment
                    );

                  return (
                    <button
                      type="button"
                      key={
                        assignment.id
                      }
                      onClick={() =>
                        navigate(
                          `/faculty/assignments/${assignment.id}`
                        )
                      }
                      className="group rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                            {
                              getCourseCode(
                                assignment
                              )
                            }
                          </p>

                          <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-800">
                            {
                              assignment?.title ||
                              "Assignment"
                            }
                          </p>

                        </div>

                        <ChevronRight
                          size={17}
                          className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500"
                        />

                      </div>

                      <div className="mt-3 flex items-center gap-2">

                        <CalendarDays
                          size={
                            14
                          }
                          className="text-slate-400"
                        />

                        <span className="text-xs font-semibold text-slate-500">
                          {
                            formatDate(
                              assignment?.dueDate
                            )
                          }
                        </span>

                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${urgency.className}`}
                        >
                          {
                            urgency.label
                          }
                        </span>

                        {pending >
                          0 && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                            {pending} pending
                          </span>
                        )}

                      </div>

                    </button>
                  );
                }
              )}

            </div>

          </section>
        )}

        {/* ====================================================
            COURSE DISTRIBUTION
        ==================================================== */}

        {courseDistribution.length >
          0 && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">

                  <BookOpen
                    size={21}
                  />

                </div>

                <div>

                  <h2 className="font-bold text-slate-900">
                    Course Assignment Distribution
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Assignment and submission activity by course.
                  </p>

                </div>

              </div>

              <span className="text-xs font-semibold text-slate-400">
                {courseDistribution.length} course
                {courseDistribution.length ===
                1
                  ? ""
                  : "s"}
              </span>

            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

              {courseDistribution
                .slice(
                  0,
                  6
                )
                .map(
                  (
                    course
                  ) => {

                    const progress =
                      course.submissions >
                      0
                        ? Math.round(
                            (
                              course.graded /
                              course.submissions
                            ) *
                              100
                          )
                        : 0;

                    return (
                      <div
                        key={`${course.code}-${course.name}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                              {
                                course.code
                              }
                            </p>

                            <h3 className="mt-1 truncate font-bold text-slate-800">
                              {
                                course.name
                              }
                            </h3>

                          </div>

                          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500">
                            {
                              course.assignments
                            }
                          </span>

                        </div>

                        <div className="mt-4 grid grid-cols-4 gap-2">

                          <SmallMetric
                            label="Assignments"
                            value={
                              course.assignments
                            }
                          />

                          <SmallMetric
                            label="Submitted"
                            value={
                              course.submissions
                            }
                          />

                          <SmallMetric
                            label="Pending"
                            value={
                              course.pending
                            }
                          />

                          <SmallMetric
                            label="Files"
                            value={
                              course.files
                            }
                          />

                        </div>

                        <div className="mt-4">

                          <div className="mb-1 flex items-center justify-between text-[11px]">

                            <span className="font-semibold text-slate-500">
                              Grading progress
                            </span>

                            <span className="font-bold text-indigo-600">
                              {progress}%
                            </span>

                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">

                            <div
                              className={`h-full rounded-full ${
                                progress >=
                                90
                                  ? "bg-green-500"
                                  : progress >=
                                    50
                                  ? "bg-blue-500"
                                  : "bg-amber-500"
                              }`}
                              style={{
                                width: `${progress}%`,
                              }}
                            />

                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

            </div>

          </section>
        )}

        {/* ====================================================
            CREATE FORM
        ==================================================== */}

        {showForm && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-200 p-5 sm:p-6">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

                  <Plus size={21} />

                </div>

                <div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Create New Assignment
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Add an assignment for one of your courses.
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={
                  resetForm
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              >

                <X size={19} />

              </button>

            </div>

            <form
              onSubmit={
                handleCreateAssignment
              }
              className="grid gap-5 p-5 sm:p-6 md:grid-cols-2"
            >

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Course
                </label>

                <select
                  name="courseId"
                  value={
                    form.courseId
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                >

                  <option value="">
                    Select course
                  </option>

                  {courseOptions.map(
                    (
                      course
                    ) => (
                      <option
                        key={
                          course.id
                        }
                        value={
                          course.id
                        }
                      >
                        {
                          course.code
                        }{" "}
                        -{" "}
                        {
                          course.name
                        }
                      </option>
                    )
                  )}

                </select>

              </div>

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Assignment Title
                </label>

                <input
                  type="text"
                  name="title"
                  value={
                    form.title
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter assignment title"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />

              </div>

              <div className="md:col-span-2">

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  name="description"
                  value={
                    form.description
                  }
                  onChange={
                    handleChange
                  }
                  rows={5}
                  placeholder="Enter assignment instructions or description..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Due Date & Time
                </label>

                <input
                  type="datetime-local"
                  name="dueDate"
                  value={
                    form.dueDate
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Maximum Marks
                </label>

                <input
                  type="number"
                  min="1"
                  name="maxMarks"
                  value={
                    form.maxMarks
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />

              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:col-span-2 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    resetForm
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {saving ? (
                    <>
                      <RefreshCw
                        size={18}
                        className="animate-spin"
                      />

                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />

                      Create Assignment
                    </>
                  )}

                </button>

              </div>

            </form>

          </section>
        )}

        {/* ====================================================
            SEARCH / FILTERS
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

            <div className="relative min-w-0 flex-1">

              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={
                  searchTerm
                }
                onChange={(
                  event
                ) =>
                  setSearchTerm(
                    event.target
                      .value
                  )
                }
                placeholder="Search assignments, descriptions or courses..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-11 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchTerm("")
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
                >
                  <X size={16} />
                </button>
              )}

            </div>

            <div className="flex flex-wrap items-center gap-2">

              <div className="mr-1 flex items-center gap-2 text-sm font-semibold text-slate-500">

                <Filter
                  size={17}
                />

                Filters

              </div>

              <select
                value={
                  statusFilter
                }
                onChange={(
                  event
                ) =>
                  setStatusFilter(
                    event.target
                      .value
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
              >

                <option value="ALL">
                  All Status
                </option>

                <option value="ACTIVE">
                  Active
                </option>

                <option value="NEEDS_GRADING">
                  Needs Grading
                </option>

                <option value="GRADED">
                  Fully Graded
                </option>

                <option value="OVERDUE">
                  Overdue
                </option>

              </select>

              <select
                value={
                  courseFilter
                }
                onChange={(
                  event
                ) =>
                  setCourseFilter(
                    event.target
                      .value
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
              >

                <option value="ALL">
                  All Courses
                </option>

                {courseOptions.map(
                  (
                    course
                  ) => (
                    <option
                      key={
                        course.id
                      }
                      value={
                        course.id
                      }
                    >
                      {
                        course.code
                      }
                    </option>
                  )
                )}

              </select>

              <select
                value={
                  sortBy
                }
                onChange={(
                  event
                ) =>
                  setSortBy(
                    event.target
                      .value
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
              >

                <option value="dueDate">
                  Sort: Deadline
                </option>

                <option value="newest">
                  Sort: Newest
                </option>

                <option value="title">
                  Sort: Title
                </option>

                <option value="course">
                  Sort: Course
                </option>

                <option value="submissions">
                  Sort: Submissions
                </option>

                <option value="grading">
                  Sort: Pending Grading
                </option>

              </select>

              {hasFilters && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
                >

                  <X size={14} />

                  Clear

                </button>
              )}

            </div>

          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs text-slate-500">

              Showing{" "}
              <span className="font-bold text-slate-700">
                {
                  filteredAssignments.length
                }
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-700">
                {
                  assignments.length
                }
              </span>{" "}
              assignments

            </p>

            <div className="flex items-center gap-2">

              <span className="hidden text-xs font-semibold text-slate-400 sm:inline">
                View
              </span>

              <button
                type="button"
                onClick={() =>
                  setViewMode(
                    "grid"
                  )
                }
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode ===
                  "grid"
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                Cards
              </button>

              <button
                type="button"
                onClick={() =>
                  setViewMode(
                    "list"
                  )
                }
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode ===
                  "list"
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                List
              </button>

            </div>

          </div>

        </section>

        {/* ====================================================
            ASSIGNMENTS
        ==================================================== */}

        {loading ? (

          <section className="mt-8 grid gap-5 lg:grid-cols-2">

            {[
              1,
              2,
              3,
              4,
            ].map(
              (item) => (
                <AssignmentSkeleton
                  key={
                    item
                  }
                />
              )
            )}

          </section>

        ) : assignments.length ===
          0 ? (

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

              <FileText
                size={30}
              />

            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-800">
              No assignments yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create your first assignment to begin collecting student submissions.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowForm(
                  true
                )
              }
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
            >

              <Plus size={17} />

              Create Assignment

            </button>

          </section>

        ) : filteredAssignments.length ===
          0 ? (

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

            <Search
              size={43}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-5 text-lg font-bold text-slate-800">
              No matching assignments
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your search or filters.
            </p>

            <button
              type="button"
              onClick={
                clearFilters
              }
              className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
            >
              Clear Filters
            </button>

          </section>

        ) : viewMode ===
          "grid" ? (

          <section className="mt-8 grid gap-5 lg:grid-cols-2">

            {filteredAssignments.map(
              (assignment) => (
                <AssignmentCard
                  key={
                    assignment.id
                  }
                  assignment={
                    assignment
                  }
                  submissionCount={getSubmissionCount(
                    assignment
                  )}
                  fileCount={getFileCount(
                    assignment
                  )}
                  pendingGrading={getPendingGrading(
                    assignment
                  )}
                  gradedCount={getGradedCount(
                    assignment
                  )}
                  status={getAssignmentStatus(
                    assignment
                  )}
                  onOpen={() =>
                    navigate(
                      `/faculty/assignments/${assignment.id}`
                    )
                  }
                />
              )
            )}

          </section>

        ) : (

          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-400 xl:grid">

              <span>
                Assignment
              </span>

              <span>
                Deadline
              </span>

              <span>
                Submissions
              </span>

              <span>
                Pending
              </span>

              <span>
                Status
              </span>

              <span>
                Action
              </span>

            </div>

            <div className="divide-y divide-slate-100">

              {filteredAssignments.map(
                (
                  assignment
                ) => {

                  const status =
                    getAssignmentStatus(
                      assignment
                    );

                  const submissionCount =
                    getSubmissionCount(
                      assignment
                    );

                  const pending =
                    getPendingGrading(
                      assignment
                    );

                  const urgency =
                    getUrgency(
                      assignment?.dueDate
                    );

                  return (
                    <div
                      key={
                        assignment.id
                      }
                      className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] xl:items-center"
                    >

                      <div className="min-w-0">

                        <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                          {
                            getCourseCode(
                              assignment
                            )
                          }
                        </p>

                        <h3 className="mt-1 truncate font-bold text-slate-800">
                          {
                            assignment?.title ||
                            "Untitled Assignment"
                          }
                        </h3>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {
                            getCourseName(
                              assignment
                            )
                          }
                        </p>

                      </div>

                      <div>

                        <p className="text-xs font-semibold text-slate-400 xl:hidden">
                          Deadline
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700 xl:mt-0">
                          {
                            formatDate(
                              assignment?.dueDate
                            )
                          }
                        </p>

                        <span
                          className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${urgency.className}`}
                        >
                          {
                            urgency.label
                          }
                        </span>

                      </div>

                      <div>

                        <p className="text-xs font-semibold text-slate-400 xl:hidden">
                          Submissions
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-800 xl:mt-0">
                          {
                            submissionCount
                          }
                        </p>

                      </div>

                      <div>

                        <p className="text-xs font-semibold text-slate-400 xl:hidden">
                          Pending
                        </p>

                        <p
                          className={`mt-1 text-sm font-bold xl:mt-0 ${
                            pending >
                            0
                              ? "text-amber-600"
                              : "text-green-600"
                          }`}
                        >
                          {
                            pending
                          }
                        </p>

                      </div>

                      <div>

                        <p className="text-xs font-semibold text-slate-400 xl:hidden">
                          Status
                        </p>

                        <StatusBadge
                          status={
                            status
                          }
                        />

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/faculty/assignments/${assignment.id}`
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
                      >

                        Open

                        <ChevronRight
                          size={16}
                        />

                      </button>

                    </div>
                  );
                }
              )}

            </div>

          </section>

        )}

        {/* ====================================================
            QUICK ACTIONS
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

              <Zap size={21} />

            </div>

            <div>

              <h2 className="font-bold text-slate-900">
                Assignment Actions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Continue with common assessment tasks.
              </p>

            </div>

          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            <QuickAction
              icon={
                <Plus size={20} />
              }
              title="Create Assignment"
              description="Publish a new assessment"
              onClick={() =>
                setShowForm(
                  true
                )
              }
            />

            <QuickAction
              icon={
                <Clock3 size={20} />
              }
              title="Review Pending"
              description={`${pendingGrading} submissions waiting`}
              onClick={() => {
                setStatusFilter(
                  "NEEDS_GRADING"
                );

                window.scrollTo({
                  top: 0,
                  behavior:
                    "smooth",
                });
              }}
            />

            <QuickAction
              icon={
                <AlertTriangle
                  size={20}
                />
              }
              title="Overdue Assignments"
              description={`${overdueAssignments.length} overdue`}
              onClick={() => {
                setStatusFilter(
                  "OVERDUE"
                );

                window.scrollTo({
                  top: 0,
                  behavior:
                    "smooth",
                });
              }}
            />

          </div>

        </section>

      </main>

    </div>
  );
}

/* ============================================================
   HERO PILL
============================================================ */

function HeroPill({
  icon,
  text,
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">

      {icon}

      {text}

    </span>
  );
}

/* ============================================================
   HERO METRIC
============================================================ */

function HeroMetric({
  value,
  label,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center backdrop-blur">

      <p className="text-xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-[10px] font-semibold text-indigo-200">
        {label}
      </p>

    </div>
  );
}

/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  icon,
  title,
  value,
  description,
  type = "default",
}) {
  const styles = {
    default:
      "bg-indigo-50 text-indigo-600",
    positive:
      "bg-green-50 text-green-600",
    warning:
      "bg-amber-50 text-amber-600",
    info:
      "bg-blue-50 text-blue-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          styles[type]
        }`}
      >
        {icon}
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>

    </div>
  );
}

/* ============================================================
   ANALYTICS BOX
============================================================ */

function AnalyticsBox({
  icon,
  label,
  value,
  description,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">

      <div className="flex items-center justify-between gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
          {icon}
        </div>

        <span className="text-2xl font-bold text-slate-900">
          {value}
        </span>

      </div>

      <p className="mt-4 text-sm font-semibold text-slate-700">
        {label}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>

    </div>
  );
}

/* ============================================================
   METRIC TILE
============================================================ */

function MetricTile({
  icon,
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">

          {icon}

        </div>

        <span className="text-sm font-semibold text-slate-600">
          {label}
        </span>

      </div>

      <span className="text-lg font-bold text-slate-800">
        {value}
      </span>

    </div>
  );
}

/* ============================================================
   STATUS SUMMARY
============================================================ */

function StatusSummaryRow({
  label,
  value,
  total,
  className,
}) {
  const percentage =
    total > 0
      ? Math.min(
          (
            value /
            total
          ) *
            100,
          100
        )
      : 0;

  return (
    <div>

      <div className="flex items-center justify-between gap-3">

        <span className="text-sm font-semibold text-slate-700">
          {label}
        </span>

        <span className="text-sm font-bold text-slate-700">
          {value}
        </span>

      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">

        <div
          className={`h-full rounded-full transition-all ${className}`}
          style={{
            width: `${
              value > 0
                ? Math.max(
                    percentage,
                    6
                  )
                : 0
            }%`,
          }}
        />

      </div>

    </div>
  );
}

/* ============================================================
   SMALL METRIC
============================================================ */

function SmallMetric({
  label,
  value,
}) {
  return (
    <div className="rounded-lg bg-white p-2.5 text-center">

      <p className="text-base font-bold text-slate-800">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

    </div>
  );
}

/* ============================================================
   STATUS BADGE
============================================================ */

function StatusBadge({
  status,
}) {
  const config = {
    ACTIVE: {
      label:
        "Active",
      className:
        "bg-blue-50 text-blue-700 border-blue-200",
    },

    NEEDS_GRADING: {
      label:
        "Needs Grading",
      className:
        "bg-amber-50 text-amber-700 border-amber-200",
    },

    GRADED: {
      label:
        "Fully Graded",
      className:
        "bg-green-50 text-green-700 border-green-200",
    },

    OVERDUE: {
      label:
        "Overdue",
      className:
        "bg-red-50 text-red-700 border-red-200",
    },
  };

  const selected =
    config[status] ||
    config.ACTIVE;

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${selected.className}`}
    >
      {
        selected.label
      }
    </span>
  );
}

/* ============================================================
   ASSIGNMENT CARD
============================================================ */

function AssignmentCard({
  assignment,
  submissionCount,
  fileCount,
  pendingGrading,
  gradedCount,
  status,
  onOpen,
}) {
  const urgency =
    getUrgency(
      assignment?.dueDate
    );

  const gradingProgress =
    submissionCount >
    0
      ? Math.round(
          (
            gradedCount /
            submissionCount
          ) *
            100
        )
      : 0;

  const isUrgent =
    urgency.label ===
      "Overdue" ||
    urgency.label ===
      "Due today" ||
    urgency.label ===
      "Due tomorrow";

  return (
    <article
      className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
        isUrgent
          ? "border-red-200"
          : "border-slate-200"
      }`}
    >

      {/* TOP */}

      <div className="bg-indigo-600 p-5 text-white">

        <div className="flex items-start justify-between gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">

            <GraduationCap
              size={22}
            />

          </div>

          <div className="flex flex-wrap justify-end gap-2">

            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">
              {
                getCourseCode(
                  assignment
                )
              }
            </span>

            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold">
              {assignment?.maxMarks ??
                "—"}{" "}
              marks
            </span>

          </div>

        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-indigo-200">

          {
            getCourseName(
              assignment
            )
          }

        </p>

        <h3 className="mt-1 line-clamp-2 text-xl font-bold">
          {
            assignment?.title ||
            "Untitled Assignment"
          }
        </h3>

      </div>

      {/* CONTENT */}

      <div className="p-5">

        <div className="flex flex-wrap items-center gap-2">

          <StatusBadge
            status={
              status
            }
          />

          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${urgency.className}`}
          >

            {
              urgency.label
            }

          </span>

        </div>

        {assignment?.description && (
          <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">
            {
              assignment.description
            }
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">

          <InfoItem
            icon={
              <CalendarDays
                size={16}
              />
            }
            label="Due Date"
            value={formatDate(
              assignment?.dueDate
            )}
            danger={
              urgency.label ===
              "Overdue"
            }
          />

          <InfoItem
            icon={
              <Users
                size={16}
              />
            }
            label="Submissions"
            value={
              submissionCount
            }
          />

          <InfoItem
            icon={
              <Clock3
                size={16}
              />
            }
            label="Pending"
            value={
              pendingGrading
            }
            warning={
              pendingGrading >
              0
            }
          />

          <InfoItem
            icon={
              <Paperclip
                size={16}
              />
            }
            label="Files"
            value={
              fileCount
            }
          />

        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-4">

          <div className="flex items-center justify-between gap-3">

            <span className="text-xs font-semibold text-slate-500">
              Grading Progress
            </span>

            <span className="text-xs font-bold text-indigo-600">
              {gradingProgress}%
            </span>

          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">

            <div
              className={`h-full rounded-full transition-all ${
                gradingProgress >=
                90
                  ? "bg-green-500"
                  : gradingProgress >=
                    50
                  ? "bg-blue-500"
                  : "bg-amber-500"
              }`}
              style={{
                width: `${gradingProgress}%`,
              }}
            />

          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">

            <span>
              {
                gradedCount
              }{" "}
              graded
            </span>

            <span>
              {
                submissionCount
              }{" "}
              total
            </span>

          </div>

        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">

          <p className="text-xs text-slate-400">
            Deadline
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-600">
            {
              formatDateTime(
                assignment?.dueDate
              )
            }
          </p>

          <button
            type="button"
            onClick={
              onOpen
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
          >

            {submissionCount >
            0
              ? "View Submissions & Grade"
              : "View Assignment"}

            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-1"
            />

          </button>

        </div>

      </div>

    </article>
  );
}

/* ============================================================
   INFO ITEM
============================================================ */

function InfoItem({
  icon,
  label,
  value,
  danger = false,
  warning = false,
}) {
  return (
    <div
      className={`rounded-xl p-3 ${
        danger
          ? "bg-red-50"
          : warning
          ? "bg-amber-50"
          : "bg-slate-50"
      }`}
    >

      <div
        className={`flex items-center gap-2 text-[11px] font-medium ${
          danger
            ? "text-red-500"
            : warning
            ? "text-amber-500"
            : "text-slate-400"
        }`}
      >

        <span className="text-indigo-600">
          {icon}
        </span>

        {label}

      </div>

      <p
        className={`mt-1 text-sm font-bold ${
          danger
            ? "text-red-700"
            : warning
            ? "text-amber-700"
            : "text-slate-800"
        }`}
      >

        {value}

      </p>

    </div>
  );
}

/* ============================================================
   QUICK ACTION
============================================================ */

function QuickAction({
  icon,
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
    >

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm transition group-hover:bg-indigo-600 group-hover:text-white">

        {icon}

      </div>

      <div className="min-w-0 flex-1">

        <p className="truncate text-sm font-bold text-slate-800">
          {title}
        </p>

        <p className="mt-1 truncate text-xs text-slate-500">
          {description}
        </p>

      </div>

      <ChevronRight
        size={17}
        className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500"
      />

    </button>
  );
}

/* ============================================================
   ALERT
============================================================ */

function AlertBox({
  type,
  message,
  onClose,
}) {
  const isError =
    type === "error";

  return (
    <div
      className={`mt-6 flex items-start gap-3 rounded-2xl border p-5 ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-green-200 bg-green-50 text-green-700"
      }`}
    >

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isError
            ? "bg-red-100"
            : "bg-green-100"
        }`}
      >

        {isError ? (
          <AlertCircle
            size={20}
          />
        ) : (
          <CheckCircle2
            size={20}
          />
        )}

      </div>

      <div className="min-w-0 flex-1">

        <p className="font-bold">
          {isError
            ? "Assignment error"
            : "Success"}
        </p>

        <p className="mt-1 text-sm leading-6">
          {message}
        </p>

      </div>

      <button
        type="button"
        onClick={
          onClose
        }
        className="shrink-0 rounded-lg p-1 text-current opacity-60 hover:bg-black/5 hover:opacity-100"
      >

        <X size={17} />

      </button>

    </div>
  );
}

/* ============================================================
   SKELETON
============================================================ */

function AssignmentSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="h-40 bg-slate-200" />

      <div className="space-y-4 p-5">

        <div className="h-5 w-3/4 rounded bg-slate-200" />

        <div className="h-4 w-1/2 rounded bg-slate-200" />

        <div className="grid grid-cols-2 gap-3">

          <div className="h-16 rounded-xl bg-slate-100" />

          <div className="h-16 rounded-xl bg-slate-100" />

          <div className="h-16 rounded-xl bg-slate-100" />

          <div className="h-16 rounded-xl bg-slate-100" />

        </div>

        <div className="h-12 rounded-xl bg-slate-200" />

      </div>

    </div>
  );
}

export default FacultyAssignments;