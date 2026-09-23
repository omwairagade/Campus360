import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  FileText,
  GraduationCap,
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

const isAuthError = (
  error
) => {
  return /authentication|unauthorized|forbidden|token/i.test(
    String(error?.message || "")
  );
};

const normalizeCourses = (
  data
) => {
  const loaded =
    data?.courses ||
    data?.data?.courses ||
    data?.data ||
    [];

  return Array.isArray(loaded)
    ? loaded
    : [];
};

const normalizeExams = (
  data
) => {
  const loaded =
    data?.exams ||
    data?.data?.exams ||
    data?.data ||
    [];

  return Array.isArray(loaded)
    ? loaded
    : [];
};

const formatDateTime = (
  value
) => {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
};

const formatDate = (
  value
) => {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
};

const formatExamType = (
  value
) => {
  if (!value) {
    return "Examination";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
};

const isPastExam = (
  value
) => {
  if (!value) {
    return false;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return false;
  }

  return (
    date.getTime() <
    Date.now()
  );
};

const getDaysDifference = (
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

  const difference =
    date.getTime() -
    now.getTime();

  return Math.ceil(
    difference /
      (
        1000 *
        60 *
        60 *
        24
      )
  );
};

const getExamUrgency = (
  value
) => {
  const days =
    getDaysDifference(
      value
    );

  if (days === null) {
    return {
      label:
        "Date unavailable",
      className:
        "border-slate-200 bg-slate-100 text-slate-600",
    };
  }

  if (days < 0) {
    return {
      label:
        "Completed",
      className:
        "border-slate-200 bg-slate-100 text-slate-600",
    };
  }

  if (days === 0) {
    return {
      label:
        "Exam today",
      className:
        "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (days === 1) {
    return {
      label:
        "Exam tomorrow",
      className:
        "border-orange-200 bg-orange-50 text-orange-700",
    };
  }

  if (days <= 3) {
    return {
      label:
        `In ${days} days`,
      className:
        "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (days <= 7) {
    return {
      label:
        `In ${days} days`,
      className:
        "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    label:
      `In ${days} days`,
    className:
      "border-green-200 bg-green-50 text-green-700",
  };
};

const getCourseCode = (
  exam
) => {
  return (
    exam?.course?.code ||
    exam?.courseCode ||
    "COURSE"
  );
};

const getCourseName = (
  exam
) => {
  return (
    exam?.course?.name ||
    exam?.course?.title ||
    exam?.courseName ||
    "Course"
  );
};

const getResultCount = (
  exam
) => {
  return Number(
    exam?.totalResults ||
      exam?.resultsCount ||
      exam?.resultCount ||
      exam?.results?.length ||
      0
  );
};

const getExamResultStatus = (
  exam
) => {
  const resultCount =
    getResultCount(exam);

  if (
    resultCount > 0
  ) {
    return "RESULTS_AVAILABLE";
  }

  if (
    isPastExam(
      exam?.examDate
    )
  ) {
    return "AWAITING_RESULTS";
  }

  return "SCHEDULED";
};

/* ============================================================
   COMPONENT
============================================================ */

function FacultyExaminations() {
  const navigate =
    useNavigate();

  const [courses, setCourses] =
    useState([]);

  const [exams, setExams] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [showForm, setShowForm] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState("ALL");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [resultFilter, setResultFilter] =
    useState("ALL");

  const [sortBy, setSortBy] =
    useState("date");

  const [viewMode, setViewMode] =
    useState("grid");

  const [form, setForm] =
    useState({
      courseId: "",
      title: "",
      examType: "MID_SEM",
      examDate: "",
      maxMarks: "100",
    });

  /* ==========================================================
     ERROR HANDLER
  ========================================================== */

  const handleApiError =
    useCallback(
      (err) => {
        console.error(
          "Faculty examination error:",
          err
        );

        const message =
          err?.message ||
          "An unexpected error occurred.";

        if (
          isAuthError(
            err
          )
        ) {
          logoutUser();
          navigate("/");
          return;
        }

        setError(
          message
        );
      },
      [navigate]
    );

  /* ==========================================================
     FETCH COURSES
  ========================================================== */

  const fetchCourses =
    useCallback(
      async () => {
        try {
          let data;

          try {
            data =
              await apiGet(
                "/faculty/my-courses"
              );
          } catch (
            firstError
          ) {
            const message =
              String(
                firstError?.message ||
                  ""
              ).toLowerCase();

            if (
              message.includes(
                "404"
              )
            ) {
              data =
                await apiGet(
                  "/faculty/courses"
                );
            } else {
              throw firstError;
            }
          }

          return normalizeCourses(
            data
          );
        } catch (err) {
          if (
            isAuthError(
              err
            )
          ) {
            logoutUser();
            navigate("/");
          }

          throw err;
        }
      },
      [navigate]
    );

  /* ==========================================================
     FETCH EXAMS
  ========================================================== */

  const fetchExams =
    useCallback(
      async () => {
        try {
          const data =
            await apiGet(
              "/exams/faculty/my-exams"
            );

          return normalizeExams(
            data
          );
        } catch (err) {
          if (
            isAuthError(
              err
            )
          ) {
            logoutUser();
            navigate("/");
          }

          throw err;
        }
      },
      [navigate]
    );

  /* ==========================================================
     LOAD DATA
  ========================================================== */

  const loadData =
    useCallback(
      async (
        isRefresh = false
      ) => {
        try {
          if (isRefresh) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError("");

          const [
            coursesResult,
            examsResult,
          ] =
            await Promise.allSettled(
              [
                fetchCourses(),
                fetchExams(),
              ]
            );

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
              name:
                "courses",
              error:
                coursesResult.reason,
            });
          }

          if (
            examsResult.status ===
            "fulfilled"
          ) {
            setExams(
              examsResult.value
            );
          } else {
            failures.push({
              name:
                "examinations",
              error:
                examsResult.reason,
            });
          }

          const authFailure =
            failures.find(
              (
                failure
              ) =>
                isAuthError(
                  failure.error
                )
            );

          if (
            authFailure
          ) {
            logoutUser();
            navigate("/");
            return;
          }

          if (
            failures.length >
            0
          ) {
            setError(
              `Some examination data could not be loaded: ${failures
                .map(
                  (
                    failure
                  ) =>
                    failure.name
                )
                .join(
                  ", "
                )}.`
            );
          }
        } catch (err) {
          handleApiError(
            err
          );
        } finally {
          setLoading(
            false
          );
          setRefreshing(
            false
          );
        }
      },
      [
        fetchCourses,
        fetchExams,
        handleApiError,
        navigate,
      ]
    );

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ==========================================================
     FORM
  ========================================================== */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (
        current
      ) => ({
        ...current,
        [name]:
          value,
      })
    );

    setError("");
    setSuccess("");
  };

  const resetForm = () => {
    setForm({
      courseId: "",
      title: "",
      examType:
        "MID_SEM",
      examDate: "",
      maxMarks:
        "100",
    });

    setShowForm(
      false
    );
  };

  /* ==========================================================
     CREATE EXAM
  ========================================================== */

  const handleCreateExam =
    async (
      event
    ) => {
      event.preventDefault();

      try {
        setError("");
        setSuccess("");

        const title =
          form.title.trim();

        if (
          !form.courseId ||
          !title ||
          !form.examType ||
          !form.examDate
        ) {
          setError(
            "Course, title, exam type and exam date are required."
          );
          return;
        }

        const maxMarks =
          Number(
            form.maxMarks
          );

        if (
          !Number.isFinite(
            maxMarks
          ) ||
          maxMarks <=
            0
        ) {
          setError(
            "Maximum marks must be greater than 0."
          );
          return;
        }

        const examDate =
          new Date(
            form.examDate
          );

        if (
          Number.isNaN(
            examDate.getTime()
          )
        ) {
          setError(
            "Please enter a valid examination date."
          );
          return;
        }

        if (
          examDate <=
          new Date()
        ) {
          setError(
            "Examination date must be in the future."
          );
          return;
        }

        setSaving(
          true
        );

        const data =
          await apiPost(
            "/exams",
            {
              courseId:
                Number(
                  form.courseId
                ),
              title,
              examType:
                form.examType,
              examDate:
                form.examDate,
              maxMarks,
            }
          );

        setSuccess(
          data?.message ||
            "Examination created successfully."
        );

        resetForm();

        const refreshedExams =
          await fetchExams();

        setExams(
          refreshedExams
        );
      } catch (err) {
        handleApiError(
          err
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  /* ==========================================================
     EXAM TYPE OPTIONS
  ========================================================== */

  const examTypes =
    useMemo(() => {
      return [
        ...new Set(
          exams
            .map(
              (exam) =>
                exam?.examType
            )
            .filter(Boolean)
        ),
      ].sort();
    }, [exams]);

  /* ==========================================================
     EXAM STATUS DATA
  ========================================================== */

  const upcomingExams =
    useMemo(
      () =>
        exams.filter(
          (exam) =>
            !isPastExam(
              exam?.examDate
            )
        ),
      [exams]
    );

  const completedExams =
    useMemo(
      () =>
        exams.filter(
          (exam) =>
            isPastExam(
              exam?.examDate
            )
        ),
      [exams]
    );

  const examsWithResults =
    useMemo(
      () =>
        exams.filter(
          (exam) =>
            getResultCount(
              exam
            ) > 0
        ),
      [exams]
    );

  const examsAwaitingResults =
    useMemo(
      () =>
        completedExams.filter(
          (exam) =>
            getResultCount(
              exam
            ) === 0
        ),
      [completedExams]
    );

  /* ==========================================================
     STATS
  ========================================================== */

  const totalResults =
    exams.reduce(
      (
        sum,
        exam
      ) =>
        sum +
        getResultCount(
          exam
        ),
      0
    );

  const completedResults =
    completedExams.reduce(
      (
        sum,
        exam
      ) =>
        sum +
        getResultCount(
          exam
        ),
      0
    );

  const upcomingResults =
    upcomingExams.reduce(
      (
        sum,
        exam
      ) =>
        sum +
        getResultCount(
          exam
        ),
      0
    );

  const averageResultsPerExam =
    exams.length >
    0
      ? (
          totalResults /
          exams.length
        ).toFixed(
          1
        )
      : "0.0";

  const averageMarks =
    exams.length >
    0
      ? (
          exams.reduce(
            (
              sum,
              exam
            ) =>
              sum +
              Number(
                exam?.maxMarks ||
                  0
              ),
            0
          ) /
          exams.length
        ).toFixed(
          0
        )
      : "0";

  const nextExam =
    [
      ...upcomingExams,
    ].sort(
      (
        a,
        b
      ) =>
        new Date(
          a?.examDate ||
            0
        ).getTime() -
        new Date(
          b?.examDate ||
            0
        ).getTime()
    )[0] ||
    null;

  const nextExamDays =
    nextExam
      ? getDaysDifference(
          nextExam.examDate
        )
      : null;

  const completedResultCoverage =
    completedExams.length >
    0
      ? Math.round(
          (
            examsWithResults.filter(
              (
                exam
              ) =>
                isPastExam(
                  exam?.examDate
                )
            ).length /
            completedExams.length
          ) *
            100
        )
      : 0;

  const scheduleCoverage =
    exams.length >
    0
      ? Math.round(
          (
            upcomingExams.length /
            exams.length
          ) *
            100
        )
      : 0;

  /* ==========================================================
     EXAM TYPE DISTRIBUTION
  ========================================================== */

  const typeDistribution =
    useMemo(() => {
      const map =
        new Map();

      exams.forEach(
        (
          exam
        ) => {
          const type =
            exam?.examType ||
            "OTHER";

          map.set(
            type,
            (
              map.get(
                type
              ) || 0
            ) + 1
          );
        }
      );

      return [
        ...map.entries(),
      ].sort(
        (
          a,
          b
        ) =>
          b[1] -
          a[1]
      );
    }, [exams]);

  /* ==========================================================
     COURSE DISTRIBUTION
  ========================================================== */

  const courseDistribution =
    useMemo(() => {
      const map =
        new Map();

      exams.forEach(
        (
          exam
        ) => {
          const code =
            getCourseCode(
              exam
            );

          const name =
            getCourseName(
              exam
            );

          const key =
            `${code}|${name}`;

          const current =
            map.get(
              key
            ) || {
              code,
              name,
              total:
                0,
              upcoming:
                0,
              completed:
                0,
              results:
                0,
            };

          current.total +=
            1;

          if (
            isPastExam(
              exam?.examDate
            )
          ) {
            current.completed +=
              1;
          } else {
            current.upcoming +=
              1;
          }

          current.results +=
            getResultCount(
              exam
            );

          map.set(
            key,
            current
          );
        }
      );

      return [
        ...map.values(),
      ].sort(
        (
          a,
          b
        ) =>
          b.total -
          a.total
      );
    }, [exams]);

  /* ==========================================================
     FILTERED EXAMS
  ========================================================== */

  const filteredExams =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      const filtered =
        exams.filter(
          (
            exam
          ) => {
            const title =
              String(
                exam?.title ||
                  ""
              ).toLowerCase();

            const code =
              String(
                getCourseCode(
                  exam
                )
              ).toLowerCase();

            const name =
              String(
                getCourseName(
                  exam
                )
              ).toLowerCase();

            const type =
              String(
                exam?.examType ||
                  ""
              ).toLowerCase();

            const matchesSearch =
              !search ||
              title.includes(
                search
              ) ||
              code.includes(
                search
              ) ||
              name.includes(
                search
              ) ||
              type.includes(
                search
              );

            const matchesType =
              typeFilter ===
                "ALL" ||
              exam?.examType ===
                typeFilter;

            const past =
              isPastExam(
                exam?.examDate
              );

            const matchesStatus =
              statusFilter ===
                "ALL" ||
              (
                statusFilter ===
                  "UPCOMING" &&
                !past
              ) ||
              (
                statusFilter ===
                  "COMPLETED" &&
                past
              );

            const resultStatus =
              getExamResultStatus(
                exam
              );

            const matchesResult =
              resultFilter ===
                "ALL" ||
              (
                resultFilter ===
                  "RESULTS" &&
                resultStatus ===
                  "RESULTS_AVAILABLE"
              ) ||
              (
                resultFilter ===
                  "AWAITING" &&
                resultStatus ===
                  "AWAITING_RESULTS"
              ) ||
              (
                resultFilter ===
                  "SCHEDULED" &&
                resultStatus ===
                  "SCHEDULED"
              );

            return (
              matchesSearch &&
              matchesType &&
              matchesStatus &&
              matchesResult
            );
          }
        );

      return [
        ...filtered,
      ].sort(
        (
          a,
          b
        ) => {
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
            "results"
          ) {
            return (
              getResultCount(
                b
              ) -
              getResultCount(
                a
              )
            );
          }

          if (
            sortBy ===
            "marks"
          ) {
            return (
              Number(
                b?.maxMarks ||
                  0
              ) -
              Number(
                a?.maxMarks ||
                  0
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

          return (
            new Date(
              a?.examDate ||
                0
            ).getTime() -
            new Date(
              b?.examDate ||
                0
            ).getTime()
          );
        }
      );
    }, [
      exams,
      searchTerm,
      typeFilter,
      statusFilter,
      resultFilter,
      sortBy,
    ]);

  /* ==========================================================
     FILTER STATE
  ========================================================== */

  const hasFilters =
    Boolean(
      searchTerm.trim()
    ) ||
    typeFilter !==
      "ALL" ||
    statusFilter !==
      "ALL" ||
    resultFilter !==
      "ALL";

  const clearFilters =
    () => {
      setSearchTerm("");
      setTypeFilter(
        "ALL"
      );
      setStatusFilter(
        "ALL"
      );
      setResultFilter(
        "ALL"
      );
    };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ====================================================
          HEADER
      ==================================================== */}

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

              <GraduationCap
                size={23}
              />

            </div>

            <div className="min-w-0">

              <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                Faculty Portal
              </p>

              <h1 className="truncate text-xl font-bold md:text-2xl">
                Examinations
              </h1>

              <p className="hidden text-sm text-slate-500 sm:block">
                Schedule, monitor and manage academic examinations
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

              <Plus size={18} />

              <span className="hidden sm:inline">
                Create Exam
              </span>

              <span className="sm:hidden">
                New
              </span>

            </button>

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ==================================================
            HERO
        ================================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-indigo-600 p-6 text-white shadow-lg sm:p-8">

          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10" />

          <div className="absolute -bottom-24 right-24 h-64 w-64 rounded-full bg-white/5" />

          <div className="relative grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">

            <div className="max-w-3xl">

              <div className="mb-3 flex flex-wrap gap-2">

                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">

                  Examination Management

                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">

                  {exams.length}
                  {" "}
                  exam
                  {exams.length ===
                  1
                    ? ""
                    : "s"}

                </span>

                {nextExam && (
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">

                    Next:
                    {" "}
                    {nextExamDays ===
                    0
                      ? "Today"
                      : `${nextExamDays}d`}

                  </span>
                )}

              </div>

              <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
                Plan examinations with confidence
              </h2>

              <p className="mt-3 text-sm leading-6 text-indigo-100 sm:text-base">

                Schedule assessments, monitor exam timelines, track result activity and manage your examination workload from one place.

              </p>

              <div className="mt-5 flex flex-wrap gap-3">

                <HeroPill
                  icon={
                    <CalendarDays
                      size={14}
                    />
                  }
                  text={`${upcomingExams.length} upcoming`}
                />

                <HeroPill
                  icon={
                    <CheckCircle2
                      size={14}
                    />
                  }
                  text={`${completedExams.length} completed`}
                />

                <HeroPill
                  icon={
                    <Users size={14} />
                  }
                  text={`${totalResults} result entries`}
                />

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              <HeroMetric
                value={
                  exams.length
                }
                label="Total Exams"
              />

              <HeroMetric
                value={
                  upcomingExams.length
                }
                label="Upcoming"
              />

              <HeroMetric
                value={
                  examsAwaitingResults.length
                }
                label="Awaiting Results"
              />

              <HeroMetric
                value={
                  totalResults
                }
                label="Results"
              />

            </div>

          </div>

        </section>

        {/* ==================================================
            ALERTS
        ================================================== */}

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

        {/* ==================================================
            NEXT EXAM
        ================================================== */}

        {nextExam && (
          <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm sm:p-6">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-start gap-3">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">

                  <CalendarDays
                    size={22}
                  />

                </div>

                <div>

                  <div className="flex flex-wrap items-center gap-2">

                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                      Next Examination
                    </p>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                        getExamUrgency(
                          nextExam.examDate
                        ).className
                      }`}
                    >

                      {
                        getExamUrgency(
                          nextExam.examDate
                        ).label
                      }

                    </span>

                  </div>

                  <h3 className="mt-1 text-lg font-bold text-slate-900">
                    {
                      nextExam.title
                    }
                  </h3>

                  <p className="mt-1 text-sm font-semibold text-indigo-600">

                    {
                      getCourseCode(
                        nextExam
                      )
                    }
                    {" "}
                    •
                    {" "}
                    {
                      getCourseName(
                        nextExam
                      )
                    }

                  </p>

                  <p className="mt-2 text-sm text-slate-500">

                    {
                      formatDateTime(
                        nextExam.examDate
                      )
                    }
                    {" "}
                    •
                    {" "}
                    {
                      formatExamType(
                        nextExam.examType
                      )
                    }
                    {" "}
                    •
                    {" "}
                    {
                      nextExam.maxMarks ??
                      "—"
                    }
                    {" "}
                    marks

                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/faculty/examinations/${nextExam.id}`
                  )
                }
                className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
              >

                Manage Exam

                <ArrowRight
                  size={16}
                />

              </button>

            </div>

          </section>
        )}

        {/* ==================================================
            SUMMARY
        ================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">

          <SummaryCard
            icon={
              <FileText
                size={21}
              />
            }
            title="Total Exams"
            value={
              exams.length
            }
            description="All examinations"
          />

          <SummaryCard
            icon={
              <CalendarDays
                size={21}
              />
            }
            title="Upcoming"
            value={
              upcomingExams.length
            }
            description="Future examinations"
            type="info"
          />

          <SummaryCard
            icon={
              <CheckCircle2
                size={21}
              />
            }
            title="Completed"
            value={
              completedExams.length
            }
            description="Past examinations"
            type="positive"
          />

          <SummaryCard
            icon={
              <Users size={21} />
            }
            title="Results"
            value={
              totalResults
            }
            description="Student result entries"
          />

          <SummaryCard
            icon={
              <BookOpen
                size={21}
              />
            }
            title="Courses"
            value={
              courses.length
            }
            description="Assigned courses"
          />

        </section>

        {/* ==================================================
            ANALYTICS
        ================================================== */}

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
                    Examination Analytics
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Overview of schedule and result activity.
                  </p>

                </div>

              </div>

              <span className="inline-flex w-fit rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600">

                {upcomingExams.length >
                0
                  ? `${scheduleCoverage}% scheduled`
                  : "No upcoming exams"}

              </span>

            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <AnalyticsCard
                icon={
                  <CalendarDays
                    size={20}
                  />
                }
                label="Upcoming"
                value={
                  upcomingExams.length
                }
                description="Scheduled assessments"
              />

              <AnalyticsCard
                icon={
                  <CheckCircle2
                    size={20}
                  />
                }
                label="Result Coverage"
                value={`${completedResultCoverage}%`}
                description="Completed exams with results"
              />

              <AnalyticsCard
                icon={
                  <Activity
                    size={20}
                  />
                }
                label="Avg Results"
                value={
                  averageResultsPerExam
                }
                description="Entries per exam"
              />

              <AnalyticsCard
                icon={
                  <Award size={20} />
                }
                label="Avg Marks"
                value={
                  averageMarks
                }
                description="Maximum marks average"
              />

            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">

              <ProgressCard
                label="Exam Completion"
                value={
                  exams.length >
                  0
                    ? Math.round(
                        (
                          completedExams.length /
                          exams.length
                        ) *
                          100
                      )
                    : 0
                }
                detail={`${completedExams.length} of ${exams.length} exams completed`}
              />

              <ProgressCard
                label="Result Coverage"
                value={
                  completedResultCoverage
                }
                detail={`${examsWithResults.filter(
                  (
                    exam
                  ) =>
                    isPastExam(
                      exam?.examDate
                    )
                ).length} completed exams have results`}
              />

            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">

              <MetricTile
                icon={
                  <Users size={17} />
                }
                label="Upcoming Results"
                value={
                  upcomingResults
                }
              />

              <MetricTile
                icon={
                  <AlertTriangle
                    size={17}
                  />
                }
                label="Awaiting Results"
                value={
                  examsAwaitingResults.length
                }
              />

              <MetricTile
                icon={
                  <Layers3
                    size={17}
                  />
                }
                label="Exam Types"
                value={
                  typeDistribution.length
                }
              />

            </div>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">

                <Award
                  size={21}
                />

              </div>

              <div>

                <h2 className="font-bold text-slate-900">
                  Exam Types
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Distribution by assessment type.
                </p>

              </div>

            </div>

            <div className="mt-6 space-y-4">

              {typeDistribution.length ===
              0 ? (

                <p className="text-sm text-slate-500">
                  No examination data available.
                </p>

              ) : (

                typeDistribution
                  .slice(
                    0,
                    6
                  )
                  .map(
                    ([
                      type,
                      count,
                    ]) => {

                      const percentage =
                        exams.length >
                        0
                          ? Math.round(
                              (
                                count /
                                exams.length
                              ) *
                                100
                            )
                          : 0;

                      return (
                        <div
                          key={
                            type
                          }
                        >

                          <div className="flex items-center justify-between gap-3">

                            <span className="truncate text-sm font-semibold text-slate-700">
                              {
                                formatExamType(
                                  type
                                )
                              }
                            </span>

                            <span className="shrink-0 text-xs font-bold text-slate-500">
                              {
                                count
                              }
                            </span>

                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">

                            <div
                              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                              }}
                            />

                          </div>

                        </div>
                      );
                    }
                  )

              )}

            </div>

          </div>

        </section>

        {/* ==================================================
            RESULT ATTENTION CENTER
        ================================================== */}

        {examsAwaitingResults.length >
          0 && (
          <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-start gap-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">

                  <CircleAlert
                    size={21}
                  />

                </div>

                <div>

                  <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
                    Attention Required
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-900">
                    Completed exams awaiting results
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">

                    {
                      examsAwaitingResults.length
                    }
                    {" "}
                    completed examination
                    {
                      examsAwaitingResults.length ===
                      1
                        ? ""
                        : "s"
                    }
                    {" "}
                    currently have no result entries.

                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() => {
                  setStatusFilter(
                    "COMPLETED"
                  );
                  setResultFilter(
                    "AWAITING"
                  );
                }}
                className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white hover:bg-amber-700"
              >

                Review Exams

                <ArrowRight
                  size={16}
                />

              </button>

            </div>

          </section>
        )}

        {/* ==================================================
            CREATE FORM
        ================================================== */}

        {showForm && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-200 p-5 sm:p-6">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

                  <Plus size={21} />

                </div>

                <div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Create New Examination
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Schedule an assessment for one of your assigned courses.
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
                handleCreateExam
              }
              className="grid gap-5 p-5 sm:p-6 md:grid-cols-2"
            >

              <FormField
                label="Course"
              >

                <select
                  name="courseId"
                  value={
                    form.courseId
                  }
                  onChange={
                    handleChange
                  }
                  required
                  className="input-style"
                >

                  <option value="">
                    Select course
                  </option>

                  {courses.map(
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
                          course.code ||
                          course.courseCode ||
                          "COURSE"
                        }
                        {" "}
                        -
                        {" "}
                        {
                          course.name ||
                          course.title ||
                          "Course"
                        }

                      </option>
                    )
                  )}

                </select>

              </FormField>

              <FormField
                label="Exam Title"
              >

                <input
                  type="text"
                  name="title"
                  value={
                    form.title
                  }
                  onChange={
                    handleChange
                  }
                  required
                  placeholder="Example: Data Structures Mid-Semester Exam"
                  className="input-style"
                />

              </FormField>

              <FormField
                label="Exam Type"
              >

                <select
                  name="examType"
                  value={
                    form.examType
                  }
                  onChange={
                    handleChange
                  }
                  required
                  className="input-style"
                >

                  <option value="MID_SEM">
                    Mid Semester
                  </option>

                  <option value="END_SEM">
                    End Semester
                  </option>

                  <option value="UNIT_TEST">
                    Unit Test
                  </option>

                  <option value="PRACTICAL">
                    Practical
                  </option>

                  <option value="VIVA">
                    Viva
                  </option>

                </select>

              </FormField>

              <FormField
                label="Exam Date & Time"
              >

                <input
                  type="datetime-local"
                  name="examDate"
                  value={
                    form.examDate
                  }
                  onChange={
                    handleChange
                  }
                  required
                  className="input-style"
                />

              </FormField>

              <FormField
                label="Maximum Marks"
              >

                <input
                  type="number"
                  min="1"
                  step="0.01"
                  name="maxMarks"
                  value={
                    form.maxMarks
                  }
                  onChange={
                    handleChange
                  }
                  required
                  className="input-style"
                />

              </FormField>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 md:col-span-2 md:flex-row md:justify-end">

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
                        size={17}
                        className="animate-spin"
                      />

                      Creating...

                    </>
                  ) : (
                    <>
                      <Plus
                        size={17}
                      />

                      Create Exam

                    </>
                  )}

                </button>

              </div>

            </form>

          </section>
        )}

        {/* ==================================================
            COURSE DISTRIBUTION
        ================================================== */}

        {courseDistribution.length >
          0 && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                  <BookOpen
                    size={21}
                  />

                </div>

                <div>

                  <h2 className="font-bold text-slate-900">
                    Course Examination Distribution
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Examination workload across your assigned courses.
                  </p>

                </div>

              </div>

              <span className="text-xs font-semibold text-slate-400">
                {courseDistribution.length}
                {" "}
                course
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

                    const completion =
                      course.total >
                      0
                        ? Math.round(
                            (
                              course.completed /
                              course.total
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
                              course.total
                            }

                          </span>

                        </div>

                        <div className="mt-4 grid grid-cols-4 gap-2">

                          <SmallMetric
                            label="Total"
                            value={
                              course.total
                            }
                          />

                          <SmallMetric
                            label="Upcoming"
                            value={
                              course.upcoming
                            }
                          />

                          <SmallMetric
                            label="Done"
                            value={
                              course.completed
                            }
                          />

                          <SmallMetric
                            label="Results"
                            value={
                              course.results
                            }
                          />

                        </div>

                        <div className="mt-4">

                          <div className="mb-1 flex items-center justify-between text-[11px]">

                            <span className="font-semibold text-slate-500">
                              Completion
                            </span>

                            <span className="font-bold text-indigo-600">
                              {
                                completion
                              }%
                            </span>

                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">

                            <div
                              className="h-full rounded-full bg-indigo-600"
                              style={{
                                width: `${completion}%`,
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

        {/* ==================================================
            SEARCH / FILTERS
        ================================================== */}

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
                placeholder="Search examination, course or exam type..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-11 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchTerm(
                      ""
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
                >

                  <X size={16} />

                </button>
              )}

            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap">

              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">

                <Filter
                  size={17}
                />

                <span className="hidden sm:inline">
                  Filters
                </span>

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

                <option value="UPCOMING">
                  Upcoming
                </option>

                <option value="COMPLETED">
                  Completed
                </option>

              </select>

              <select
                value={
                  resultFilter
                }
                onChange={(
                  event
                ) =>
                  setResultFilter(
                    event.target
                      .value
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
              >

                <option value="ALL">
                  All Result States
                </option>

                <option value="RESULTS">
                  Results Available
                </option>

                <option value="AWAITING">
                  Awaiting Results
                </option>

                <option value="SCHEDULED">
                  Scheduled
                </option>

              </select>

              <select
                value={
                  typeFilter
                }
                onChange={(
                  event
                ) =>
                  setTypeFilter(
                    event.target
                      .value
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
              >

                <option value="ALL">
                  All Types
                </option>

                {examTypes.map(
                  (
                    type
                  ) => (
                    <option
                      key={
                        type
                      }
                      value={
                        type
                      }
                    >
                      {
                        formatExamType(
                          type
                        )
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

                <option value="date">
                  Sort: Exam Date
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

                <option value="results">
                  Sort: Results
                </option>

                <option value="marks">
                  Sort: Marks
                </option>

              </select>

              {hasFilters && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
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
                  filteredExams.length
                }
              </span>
              {" "}
              of{" "}
              <span className="font-bold text-slate-700">
                {
                  exams.length
                }
              </span>
              {" "}
              examinations

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
                    : "bg-slate-100 text-slate-500"
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
                    : "bg-slate-100 text-slate-500"
                }`}
              >

                List

              </button>

            </div>

          </div>

        </section>

        {/* ==================================================
            EXAMS
        ================================================== */}

        {loading ? (

          <section className="mt-8 grid gap-5 lg:grid-cols-2">

            {[
              1,
              2,
              3,
              4,
            ].map(
              (
                item
              ) => (
                <ExamSkeleton
                  key={
                    item
                  }
                />
              )
            )}

          </section>

        ) : exams.length ===
          0 ? (

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

              <GraduationCap
                size={31}
              />

            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-800">
              No examinations yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create your first examination to start managing assessments.
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

              Create Exam

            </button>

          </section>

        ) : filteredExams.length ===
          0 ? (

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

            <Search
              size={44}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-5 text-lg font-bold text-slate-800">
              No matching examinations
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your search or filters.
            </p>

            <button
              type="button"
              onClick={
                clearFilters
              }
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
            >

              <X size={16} />

              Clear Filters

            </button>

          </section>

        ) : viewMode ===
          "grid" ? (

          <section className="mt-8 grid gap-5 lg:grid-cols-2">

            {filteredExams.map(
              (
                exam
              ) => (
                <ExamCard
                  key={
                    exam.id
                  }
                  exam={
                    exam
                  }
                  onOpen={() =>
                    navigate(
                      `/faculty/examinations/${exam.id}`
                    )
                  }
                />
              )
            )}

          </section>

        ) : (

          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="hidden grid-cols-[2fr_1.25fr_1fr_1fr_1fr_1.2fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-400 xl:grid">

              <span>
                Examination
              </span>

              <span>
                Date
              </span>

              <span>
                Type
              </span>

              <span>
                Marks
              </span>

              <span>
                Results
              </span>

              <span>
                Result Status
              </span>

              <span>
                Action
              </span>

            </div>

            <div className="divide-y divide-slate-100">

              {filteredExams.map(
                (
                  exam
                ) => {

                  const past =
                    isPastExam(
                      exam?.examDate
                    );

                  const urgency =
                    getExamUrgency(
                      exam?.examDate
                    );

                  const resultStatus =
                    getExamResultStatus(
                      exam
                    );

                  return (
                    <div
                      key={
                        exam.id
                      }
                      className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 xl:grid-cols-[2fr_1.25fr_1fr_1fr_1fr_1.2fr_auto] xl:items-center"
                    >

                      <div className="min-w-0">

                        <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">

                          {
                            getCourseCode(
                              exam
                            )
                          }

                        </p>

                        <h3 className="mt-1 truncate font-bold text-slate-800">

                          {
                            exam?.title ||
                            "Untitled Examination"
                          }

                        </h3>

                        <p className="mt-1 truncate text-xs text-slate-500">

                          {
                            getCourseName(
                              exam
                            )
                          }

                        </p>

                      </div>

                      <div>

                        <p className="text-xs font-semibold text-slate-400 xl:hidden">
                          Date
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700 xl:mt-0">

                          {
                            formatDate(
                              exam?.examDate
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
                          Type
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700 xl:mt-0">

                          {
                            formatExamType(
                              exam?.examType
                            )
                          }

                        </p>

                      </div>

                      <div>

                        <p className="text-xs font-semibold text-slate-400 xl:hidden">
                          Marks
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-800 xl:mt-0">

                          {
                            exam?.maxMarks ??
                            "—"
                          }

                        </p>

                      </div>

                      <div>

                        <p className="text-xs font-semibold text-slate-400 xl:hidden">
                          Results
                        </p>

                        <p className="mt-1 text-sm font-bold text-indigo-600 xl:mt-0">

                          {
                            getResultCount(
                              exam
                            )
                          }

                        </p>

                      </div>

                      <div>

                        <p className="text-xs font-semibold text-slate-400 xl:hidden">
                          Result Status
                        </p>

                        <ResultStatusBadge
                          status={
                            resultStatus
                          }
                          past={
                            past
                          }
                        />

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/faculty/examinations/${exam.id}`
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
                      >

                        Open

                        <ChevronRight
                          size={
                            16
                          }
                        />

                      </button>

                    </div>
                  );
                }
              )}

            </div>

          </section>

        )}

        {/* ==================================================
            UPCOMING EXAMINATIONS
        ================================================== */}

        {upcomingExams.length >
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
                    Upcoming Examinations
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Your next scheduled assessments.
                  </p>

                </div>

              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600">

                {
                  upcomingExams.length
                }
                {" "}
                upcoming

              </span>

            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">

              {[
                ...upcomingExams,
              ]
                .sort(
                  (
                    a,
                    b
                  ) =>
                    new Date(
                      a.examDate
                    ).getTime() -
                    new Date(
                      b.examDate
                    ).getTime()
                )
                .slice(
                  0,
                  4
                )
                .map(
                  (
                    exam
                  ) => {

                    const urgency =
                      getExamUrgency(
                        exam?.examDate
                      );

                    return (
                      <button
                        type="button"
                        key={
                          exam.id
                        }
                        onClick={() =>
                          navigate(
                            `/faculty/examinations/${exam.id}`
                          )
                        }
                        className="group rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                              {
                                getCourseCode(
                                  exam
                                )
                              }
                            </p>

                            <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-800">
                              {
                                exam?.title ||
                                "Examination"
                              }
                            </p>

                          </div>

                          <ChevronRight
                            size={
                              17
                            }
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
                                exam?.examDate
                              )
                            }

                          </span>

                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${urgency.className}`}
                          >
                            {
                              urgency.label
                            }
                          </span>

                          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">

                            {
                              exam?.maxMarks ??
                              "—"
                            }
                            {" "}
                            marks

                          </span>

                        </div>

                      </button>
                    );
                  }
                )}

            </div>

          </section>
        )}

        {/* ==================================================
            QUICK ACTIONS
        ================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

              <Zap size={21} />

            </div>

            <div>

              <h2 className="font-bold text-slate-900">
                Examination Actions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Continue with common examination tasks.
              </p>

            </div>

          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            <QuickAction
              icon={
                <Plus size={20} />
              }
              title="Create Examination"
              description="Schedule a new assessment"
              onClick={() =>
                setShowForm(
                  true
                )
              }
            />

            <QuickAction
              icon={
                <CalendarDays
                  size={20}
                />
              }
              title="View Upcoming"
              description={`${upcomingExams.length} upcoming examination${
                upcomingExams.length ===
                1
                  ? ""
                  : "s"
              }`}
              onClick={() => {
                setStatusFilter(
                  "UPCOMING"
                );
                setResultFilter(
                  "ALL"
                );
              }}
            />

            <QuickAction
              icon={
                <CircleAlert
                  size={20}
                />
              }
              title="Awaiting Results"
              description={`${examsAwaitingResults.length} completed exam${
                examsAwaitingResults.length ===
                1
                  ? ""
                  : "s"
              }`}
              onClick={() => {
                setStatusFilter(
                  "COMPLETED"
                );
                setResultFilter(
                  "AWAITING"
                );
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
    info:
      "bg-blue-50 text-blue-600",
    positive:
      "bg-green-50 text-green-600",
    warning:
      "bg-amber-50 text-amber-600",
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
   ANALYTICS CARD
============================================================ */

function AnalyticsCard({
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
   PROGRESS CARD
============================================================ */

function ProgressCard({
  label,
  value,
  detail,
}) {
  const safeValue =
    Math.max(
      0,
      Math.min(
        Number(value) ||
          0,
        100
      )
    );

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex items-center justify-between gap-3">

        <p className="text-sm font-semibold text-slate-700">
          {label}
        </p>

        <span className="text-sm font-bold text-indigo-600">
          {safeValue}%
        </span>

      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">

        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-500"
          style={{
            width: `${safeValue}%`,
          }}
        />

      </div>

      <p className="mt-2 text-xs text-slate-400">
        {detail}
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
   EXAM CARD
============================================================ */

function ExamCard({
  exam,
  onOpen,
}) {
  const past =
    isPastExam(
      exam?.examDate
    );

  const urgency =
    getExamUrgency(
      exam?.examDate
    );

  const resultCount =
    getResultCount(
      exam
    );

  const resultStatus =
    getExamResultStatus(
      exam
    );

  const days =
    getDaysDifference(
      exam?.examDate
    );

  const isUrgent =
    !past &&
    days !== null &&
    days <= 3;

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
              size={23}
            />

          </div>

          <div className="flex flex-wrap justify-end gap-2">

            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">

              {
                getCourseCode(
                  exam
                )
              }

            </span>

            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold">

              {
                exam?.maxMarks ??
                "—"
              }
              {" "}
              marks

            </span>

          </div>

        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-indigo-200">

          {
            formatExamType(
              exam?.examType
            )
          }

        </p>

        <h3 className="mt-1 line-clamp-2 text-xl font-bold">

          {
            exam?.title ||
            "Untitled Examination"
          }

        </h3>

        <p className="mt-2 truncate text-sm font-medium text-indigo-100">

          {
            getCourseName(
              exam
            )
          }

        </p>

      </div>

      {/* CONTENT */}

      <div className="p-5">

        <div className="flex flex-wrap items-center gap-2">

          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
              past
                ? "border-slate-200 bg-slate-100 text-slate-600"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >

            {past
              ? "Completed"
              : "Upcoming"}

          </span>

          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${urgency.className}`}
          >

            {
              urgency.label
            }

          </span>

          <ResultStatusBadge
            status={
              resultStatus
            }
            past={
              past
            }
          />

        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">

          <InfoItem
            icon={
              <CalendarDays
                size={16}
              />
            }
            label="Exam Date"
            value={formatDateTime(
              exam?.examDate
            )}
          />

          <InfoItem
            icon={
              <FileText
                size={16}
              />
            }
            label="Exam Type"
            value={formatExamType(
              exam?.examType
            )}
          />

          <InfoItem
            icon={
              <Award size={16} />
            }
            label="Maximum Marks"
            value={
              exam?.maxMarks ??
              "—"
            }
          />

          <InfoItem
            icon={
              <Users size={16} />
            }
            label="Results Entered"
            value={
              resultCount
            }
          />

        </div>

        {/* RESULT STATUS */}

        <div className="mt-5 rounded-xl bg-slate-50 p-4">

          <div className="flex items-center justify-between gap-3">

            <span className="text-xs font-semibold text-slate-500">
              Result Activity
            </span>

            <span className="text-xs font-bold text-indigo-600">

              {
                resultCount
              }
              {" "}
              entries

            </span>

          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">

            <div
              className={`h-full rounded-full transition-all ${
                resultCount >
                0
                  ? "bg-indigo-600"
                  : past
                  ? "bg-amber-400"
                  : "bg-slate-300"
              }`}
              style={{
                width:
                  resultCount >
                  0
                    ? "100%"
                    : past
                    ? "25%"
                    : "0%",
              }}
            />

          </div>

          <p className="mt-2 text-[11px] text-slate-400">

            {past
              ? resultCount >
                0
                ? "Result entries are available."
                : "Results are awaiting entry."
              : "Result entry will be managed after the examination."}

          </p>

        </div>

        {/* ACTION */}

        <div className="mt-5 border-t border-slate-100 pt-4">

          <p className="text-xs text-slate-400">
            Scheduled
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-600">

            {
              formatDateTime(
                exam?.examDate
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

            {resultCount >
            0
              ? "View & Manage Results"
              : past
              ? "Enter Results"
              : "Manage Examination"}

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
   RESULT STATUS BADGE
============================================================ */

function ResultStatusBadge({
  status,
  past,
}) {
  if (
    status ===
    "RESULTS_AVAILABLE"
  ) {
    return (
      <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-700">

        Results Available

      </span>
    );
  }

  if (
    status ===
    "AWAITING_RESULTS"
  ) {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">

        Awaiting Results

      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">

      {past
        ? "Completed"
        : "Scheduled"}

    </span>
  );
}

/* ============================================================
   INFO ITEM
============================================================ */

function InfoItem({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">

      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">

        <span className="text-indigo-600">
          {icon}
        </span>

        {label}

      </div>

      <p className="mt-1 break-words text-sm font-bold text-slate-800">
        {value}
      </p>

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
   FORM FIELD
============================================================ */

function FormField({
  label,
  children,
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      {children}

    </div>
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
            ? "Examination error"
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

function ExamSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="h-44 bg-slate-200" />

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

export default FacultyExaminations;