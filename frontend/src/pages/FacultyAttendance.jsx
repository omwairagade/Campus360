import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Filter,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  XCircle,
  ShieldAlert,
  Target,
  Activity,
  BookOpen,
  ChevronRight,
  Award,
  CircleAlert,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  apiGet,
} from "../api";

/* ============================================================
   HELPERS
============================================================ */

const normalizeCourseAttendance = (
  response
) => {
  if (
    Array.isArray(
      response?.courses
    )
  ) {
    return response.courses;
  }

  if (
    Array.isArray(
      response?.data?.courses
    )
  ) {
    return response.data.courses;
  }

  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

const normalizeRecords = (
  response
) => {
  if (
    Array.isArray(
      response?.records
    )
  ) {
    return response.records;
  }

  if (
    Array.isArray(
      response?.data?.records
    )
  ) {
    return response.data.records;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

const getAttendancePercentage = (
  item
) => {
  const total =
    Number(
      item?.totalClasses || 0
    );

  const attended =
    Number(
      item?.attendedClasses || 0
    );

  if (total <= 0) {
    return 0;
  }

  const supplied =
    Number(item?.percentage);

  if (
    Number.isFinite(supplied) &&
    supplied >= 0
  ) {
    return Math.min(
      supplied,
      100
    );
  }

  return Math.min(
    Math.round(
      (attended / total) *
        100
    ),
    100
  );
};

const getAttendanceHealth = (
  percentage,
  totalClasses
) => {
  if (Number(totalClasses) <= 0) {
    return {
      label: "No Data",
      shortLabel: "No Data",
      className:
        "bg-slate-100 text-slate-600 border-slate-200",
      barClass: "bg-slate-300",
      icon: <CircleAlert size={15} />,
    };
  }

  if (percentage >= 85) {
    return {
      label: "Excellent",
      shortLabel: "Excellent",
      className:
        "bg-green-50 text-green-700 border-green-200",
      barClass: "bg-green-500",
      icon: <Award size={15} />,
    };
  }

  if (percentage >= 75) {
    return {
      label: "On Track",
      shortLabel: "On Track",
      className:
        "bg-blue-50 text-blue-700 border-blue-200",
      barClass: "bg-blue-500",
      icon: <Target size={15} />,
    };
  }

  if (percentage >= 60) {
    return {
      label: "Needs Attention",
      shortLabel: "Warning",
      className:
        "bg-amber-50 text-amber-700 border-amber-200",
      barClass: "bg-amber-500",
      icon: <ShieldAlert size={15} />,
    };
  }

  return {
    label: "Critical",
    shortLabel: "Critical",
    className:
      "bg-red-50 text-red-700 border-red-200",
    barClass: "bg-red-500",
    icon: <XCircle size={15} />,
  };
};

const getPresentCount = (
  records
) => {
  return records.filter(
    (record) =>
      record?.status ===
        "PRESENT" ||
      record?.status === "LATE"
  ).length;
};

/* ============================================================
   COMPONENT
============================================================ */

function FacultyAttendance() {
  const navigate = useNavigate();

  const [summary, setSummary] =
    useState(null);

  const [records, setRecords] =
    useState([]);

  const [courseAttendance, setCourseAttendance] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [healthFilter, setHealthFilter] =
    useState("ALL");

  const [showAllRecords, setShowAllRecords] =
    useState(false);

  /* ==========================================================
     LOAD ATTENDANCE
  ========================================================== */

  const loadAttendance = async (
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
        overallData,
        courseData,
      ] = await Promise.all([
        apiGet(
          "/attendance/my-attendance"
        ),
        apiGet(
          "/attendance/my-courses"
        ),
      ]);

      setSummary(
        overallData?.summary ||
          overallData?.data?.summary ||
          null
      );

      setRecords(
        normalizeRecords(
          overallData
        )
      );

      setCourseAttendance(
        normalizeCourseAttendance(
          courseData
        )
      );
    } catch (err) {
      console.error(
        "Faculty attendance error:",
        err
      );

      setError(
        err?.message ||
          "Failed to load attendance data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  /* ==========================================================
     SUMMARY VALUES
  ========================================================== */

  const totalClasses =
    Number(
      summary?.totalClasses || 0
    );

  const attendedClasses =
    Number(
      summary?.attendedClasses || 0
    );

  const absentClasses =
    Number(
      summary?.absentClasses || 0
    );

  const lateClasses =
    Number(
      summary?.lateClasses || 0
    );

  const calculatedPercentage =
    totalClasses > 0
      ? Math.min(
          Math.round(
            (attendedClasses /
              totalClasses) *
              100
          ),
          100
        )
      : 0;

  const attendancePercentage =
    Number(
      summary?.attendancePercentage ??
        summary?.percentage ??
        calculatedPercentage
    );

  /* ==========================================================
     COURSE ANALYTICS
  ========================================================== */

  const courseStats = useMemo(() => {
    let excellent = 0;
    let onTrack = 0;
    let warning = 0;
    let critical = 0;
    let noData = 0;

    courseAttendance.forEach(
      (item) => {
        const percentage =
          getAttendancePercentage(
            item
          );

        const health =
          getAttendanceHealth(
            percentage,
            item?.totalClasses
          );

        if (
          health.label ===
          "Excellent"
        ) {
          excellent += 1;
        } else if (
          health.label ===
          "On Track"
        ) {
          onTrack += 1;
        } else if (
          health.label ===
          "Needs Attention"
        ) {
          warning += 1;
        } else if (
          health.label ===
          "Critical"
        ) {
          critical += 1;
        } else {
          noData += 1;
        }
      }
    );

    return {
      excellent,
      onTrack,
      warning,
      critical,
      noData,
    };
  }, [courseAttendance]);

  /* ==========================================================
     BEST / WORST COURSE
  ========================================================== */

  const courseHighlights =
    useMemo(() => {
      const withData =
        courseAttendance.filter(
          (item) =>
            Number(
              item?.totalClasses || 0
            ) > 0
        );

      if (withData.length === 0) {
        return {
          best: null,
          worst: null,
        };
      }

      const sorted = [
        ...withData,
      ].sort(
        (a, b) =>
          getAttendancePercentage(
            b
          ) -
          getAttendancePercentage(
            a
          )
      );

      return {
        best: sorted[0],
        worst:
          sorted[
            sorted.length - 1
          ],
      };
    }, [courseAttendance]);

  /* ==========================================================
     RECENT RECORD ANALYTICS
  ========================================================== */

  const recentAnalytics =
    useMemo(() => {
      const recent =
        [...records]
          .sort(
            (a, b) =>
              new Date(
                b?.date || 0
              ).getTime() -
              new Date(
                a?.date || 0
              ).getTime()
          )
          .slice(0, 10);

      const present =
        getPresentCount(
          recent
        );

      const late =
        recent.filter(
          (record) =>
            record?.status ===
            "LATE"
        ).length;

      const absent =
        recent.filter(
          (record) =>
            record?.status ===
            "ABSENT"
        ).length;

      const percentage =
        recent.length > 0
          ? Math.round(
              (present /
                recent.length) *
                100
            )
          : 0;

      return {
        recent,
        present,
        late,
        absent,
        percentage,
      };
    }, [records]);

  /* ==========================================================
     FILTERED COURSES
  ========================================================== */

  const filteredCourses =
    useMemo(() => {
      const term =
        searchTerm
          .trim()
          .toLowerCase();

      return courseAttendance
        .filter((item) => {
          const course =
            item?.course || {};

          const values = [
            course?.name,
            course?.code,
            course?.courseName,
            course?.courseCode,
            course?.department?.name,
            item?.semester,
          ];

          const matchesSearch =
            !term ||
            values.some(
              (value) =>
                String(
                  value ?? ""
                )
                  .toLowerCase()
                  .includes(term)
            );

          const percentage =
            getAttendancePercentage(
              item
            );

          const health =
            getAttendanceHealth(
              percentage,
              item?.totalClasses
            );

          const matchesHealth =
            healthFilter ===
              "ALL" ||
            health.label ===
              healthFilter;

          return (
            matchesSearch &&
            matchesHealth
          );
        })
        .sort(
          (a, b) =>
            getAttendancePercentage(
              a
            ) -
            getAttendancePercentage(
              b
            )
        );
    }, [
      courseAttendance,
      searchTerm,
      healthFilter,
    ]);

  /* ==========================================================
     ACTIONS
  ========================================================== */

  const clearFilters = () => {
    setSearchTerm("");
    setHealthFilter("ALL");
  };

  const hasFilters =
    Boolean(
      searchTerm.trim()
    ) ||
    healthFilter !== "ALL";

  /* ==========================================================
     RECORDS TO DISPLAY
  ========================================================== */

  const displayedRecords =
    showAllRecords
      ? recentAnalytics.recent.length >
        0
        ? [
            ...records,
          ].sort(
            (a, b) =>
              new Date(
                b?.date || 0
              ).getTime() -
              new Date(
                a?.date || 0
              ).getTime()
          )
        : []
      : recentAnalytics.recent;

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">

        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">

          <div className="w-full max-w-md text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">

              <RefreshCw
                size={30}
                className="animate-spin"
              />

            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-800">
              Loading attendance
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Fetching your teaching attendance data...
            </p>

          </div>

        </div>

      </div>
    );
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">

        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex min-w-0 items-center gap-3">

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/faculty/dashboard"
                  )
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                title="Back to dashboard"
              >
                <ArrowLeft
                  size={19}
                />
              </button>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <ClipboardCheck
                  size={22}
                />
              </div>

              <div className="min-w-0">

                <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                  Faculty Portal
                </p>

                <h1 className="truncate text-xl font-bold text-slate-900 md:text-2xl">
                  Attendance
                </h1>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={() =>
                  loadAttendance(
                    true
                  )
                }
                disabled={
                  refreshing
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                  Refresh
                </span>

              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/faculty/dashboard"
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >

                <BarChart3
                  size={17}
                />

                <span className="hidden sm:inline">
                  Dashboard
                </span>

              </button>

            </div>

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">

              <AlertCircle
                size={20}
              />

            </div>

            <div className="min-w-0 flex-1">

              <p className="font-bold">
                Attendance data issue
              </p>

              <p className="mt-1 text-sm leading-6">
                {error}
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                loadAttendance(
                  true
                )
              }
              className="shrink-0 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-bold text-red-700 transition hover:bg-red-200"
            >
              Retry
            </button>

          </div>
        )}

        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="rounded-3xl bg-indigo-600 p-6 text-white shadow-lg sm:p-8">

          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">

            <div className="max-w-3xl">

              <div className="mb-3 flex flex-wrap items-center gap-2">

                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                  Academic Monitoring
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
                  {courseAttendance.length}{" "}
                  course
                  {courseAttendance.length ===
                  1
                    ? ""
                    : "s"}
                </span>

              </div>

              <h2 className="text-2xl font-bold sm:text-3xl">
                Monitor attendance performance
              </h2>

              <p className="mt-2 text-sm leading-6 text-indigo-100 sm:text-base">
                Review attendance trends across your assigned courses and identify classes or recent records that need attention.
              </p>

            </div>

            <div className="flex shrink-0 items-center gap-4">

              <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border-8 border-white/15 bg-white/10">

                <span className="text-2xl font-bold">
                  {Math.round(
                    attendancePercentage
                  )}
                  %
                </span>

                <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-indigo-200">
                  Overall
                </span>

              </div>

            </div>

          </div>

        </section>

        {/* ====================================================
            OVERALL STATUS
        ==================================================== */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">

            <div className="flex-1">

              <div className="flex flex-wrap items-center gap-2">

                <h2 className="text-xl font-bold text-slate-900">
                  Overall Attendance
                </h2>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    attendancePercentage >=
                    85
                      ? "border-green-200 bg-green-50 text-green-700"
                      : attendancePercentage >=
                        75
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : attendancePercentage >=
                        60
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {attendancePercentage >=
                  85
                    ? "Healthy"
                    : attendancePercentage >=
                      75
                    ? "On Track"
                    : attendancePercentage >=
                      60
                    ? "Needs Attention"
                    : "Critical"}
                </span>

              </div>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {attendedClasses} attended out of{" "}
                {totalClasses} recorded classes
                {lateClasses > 0
                  ? ` • ${lateClasses} late`
                  : ""}
                .
              </p>

              <div className="mt-5">

                <div className="mb-2 flex items-center justify-between">

                  <span className="text-xs font-semibold text-slate-500">
                    Attendance Rate
                  </span>

                  <span className="text-sm font-bold text-indigo-600">
                    {Math.round(
                      attendancePercentage
                    )}
                    %
                  </span>

                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      attendancePercentage >=
                      85
                        ? "bg-green-500"
                        : attendancePercentage >=
                          75
                        ? "bg-blue-500"
                        : attendancePercentage >=
                          60
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        attendancePercentage,
                        100
                      )}%`,
                    }}
                  />

                </div>

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[520px]">

              <OverallMini
                label="Total"
                value={
                  totalClasses
                }
              />

              <OverallMini
                label="Attended"
                value={
                  attendedClasses
                }
                positive
              />

              <OverallMini
                label="Absent"
                value={
                  absentClasses
                }
                negative
              />

              <OverallMini
                label="Late"
                value={
                  lateClasses
                }
                warning
              />

            </div>

          </div>

        </section>

        {/* ====================================================
            SUMMARY CARDS
        ==================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            icon={
              <BookOpen size={21} />
            }
            title="Courses Tracked"
            value={
              courseAttendance.length
            }
            description="Assigned teaching courses"
          />

          <SummaryCard
            icon={
              <CheckCircle2
                size={21}
              />
            }
            title="Excellent"
            value={
              courseStats.excellent
            }
            description="85% or above"
            type="positive"
          />

          <SummaryCard
            icon={
              <Target size={21} />
            }
            title="On Track"
            value={
              courseStats.onTrack
            }
            description="75% to 84%"
            type="info"
          />

          <SummaryCard
            icon={
              <ShieldAlert
                size={21}
              />
            }
            title="Needs Attention"
            value={
              courseStats.warning +
              courseStats.critical
            }
            description="Below 75%"
            type="warning"
          />

        </section>

        {/* ====================================================
            COURSE HEALTH ANALYTICS
        ==================================================== */}

        <section className="mt-8 grid gap-6 xl:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Activity size={21} />
              </div>

              <div>

                <h2 className="font-bold text-slate-900">
                  Course Health
                </h2>

                <p className="text-xs text-slate-500">
                  Attendance distribution
                </p>

              </div>

            </div>

            <div className="mt-5 space-y-3">

              <HealthRow
                label="Excellent"
                value={
                  courseStats.excellent
                }
                total={
                  courseAttendance.length
                }
                className="bg-green-500"
              />

              <HealthRow
                label="On Track"
                value={
                  courseStats.onTrack
                }
                total={
                  courseAttendance.length
                }
                className="bg-blue-500"
              />

              <HealthRow
                label="Warning"
                value={
                  courseStats.warning
                }
                total={
                  courseAttendance.length
                }
                className="bg-amber-500"
              />

              <HealthRow
                label="Critical"
                value={
                  courseStats.critical
                }
                total={
                  courseAttendance.length
                }
                className="bg-red-500"
              />

            </div>

          </div>

          <HighlightCard
            title="Strongest Course"
            subtitle={
              courseHighlights.best
                ? `${Math.round(
                    getAttendancePercentage(
                      courseHighlights.best
                    )
                  )}% attendance`
                : "No data available"
            }
            course={
              courseHighlights.best
            }
            positive
          />

          <HighlightCard
            title="Course Needing Attention"
            subtitle={
              courseHighlights.worst
                ? `${Math.round(
                    getAttendancePercentage(
                      courseHighlights.worst
                    )
                  )}% attendance`
                : "No data available"
            }
            course={
              courseHighlights.worst
            }
            negative
          />

        </section>

        {/* ====================================================
            SEARCH / FILTER
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

            <div className="relative min-w-0 flex-1">

              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search course name or code..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-11 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
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

            <div className="flex flex-wrap items-center gap-3">

              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <Filter size={17} />
                Health
              </div>

              <select
                value={
                  healthFilter
                }
                onChange={(event) =>
                  setHealthFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500"
              >

                <option value="ALL">
                  All Courses
                </option>

                <option value="Excellent">
                  Excellent
                </option>

                <option value="On Track">
                  On Track
                </option>

                <option value="Needs Attention">
                  Needs Attention
                </option>

                <option value="Critical">
                  Critical
                </option>

                <option value="No Data">
                  No Data
                </option>

              </select>

              {hasFilters && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                >

                  <X size={15} />

                  Clear

                </button>
              )}

            </div>

          </div>

          <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">

            Showing{" "}
            <span className="font-bold text-slate-700">
              {
                filteredCourses.length
              }
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-700">
              {
                courseAttendance.length
              }
            </span>{" "}
            courses

          </div>

        </section>

        {/* ====================================================
            COURSE-WISE ATTENDANCE
        ==================================================== */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 p-5 sm:p-6">

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <BarChart3
                      size={21}
                    />
                  </div>

                  <div>

                    <h2 className="text-lg font-bold text-slate-900">
                      Course-wise Attendance
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Attendance performance across your assigned courses.
                    </p>

                  </div>

                </div>

              </div>

              <span className="text-xs font-semibold text-slate-400">
                Sorted by attendance
              </span>

            </div>

          </div>

          <div className="p-5 sm:p-6">

            {filteredCourses.length ===
            0 ? (
              <div className="py-12 text-center">

                <Search
                  size={44}
                  className="mx-auto text-slate-300"
                />

                <h3 className="mt-5 font-bold text-slate-800">
                  No courses found
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  {hasFilters
                    ? "Try changing your search or filter."
                    : "No attendance information is available."}
                </p>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                  >
                    Clear Filters
                  </button>
                )}

              </div>
            ) : (
              <div className="space-y-4">

                {filteredCourses.map(
                  (item, index) => (
                    <CourseAttendanceCard
                      key={
                        item?.course?.id ||
                        item?.courseId ||
                        `${item?.course?.code}-${index}`
                      }
                      item={item}
                    />
                  )
                )}

              </div>
            )}

          </div>

        </section>

        {/* ====================================================
            RECENT ATTENDANCE
        ==================================================== */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 p-5 sm:p-6">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Clock3
                      size={21}
                    />
                  </div>

                  <div>

                    <h2 className="text-lg font-bold text-slate-900">
                      Recent Attendance
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Latest attendance activity available to you.
                    </p>

                  </div>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAllRecords(
                    (current) =>
                      !current
                  )
                }
                className="inline-flex items-center gap-2 self-start text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >

                {showAllRecords
                  ? "Show recent"
                  : "View all"}

                <ChevronRight
                  size={16}
                />

              </button>

            </div>

          </div>

          <div className="p-5 sm:p-6">

            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">

              <RecentMetric
                label="Recent Records"
                value={
                  recentAnalytics.recent
                    .length
                }
              />

              <RecentMetric
                label="Present"
                value={
                  recentAnalytics.present
                }
                type="positive"
              />

              <RecentMetric
                label="Late"
                value={
                  recentAnalytics.late
                }
                type="warning"
              />

              <RecentMetric
                label="Absent"
                value={
                  recentAnalytics.absent
                }
                type="negative"
              />

            </div>

            {displayedRecords.length ===
            0 ? (
              <div className="rounded-xl bg-slate-50 p-10 text-center">

                <Clock3
                  size={40}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm text-slate-500">
                  No attendance records available.
                </p>

              </div>
            ) : (
              <div className="space-y-3">

                {displayedRecords
                  .slice(
                    0,
                    showAllRecords
                      ? 50
                      : 10
                  )
                  .map(
                    (record) => (
                      <AttendanceRecord
                        key={
                          record.id
                        }
                        record={
                          record
                        }
                      />
                    )
                  )}

              </div>
            )}

          </div>

        </section>

        {/* ====================================================
            QUICK ACTIONS
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <ZapIcon />
            </div>

            <div>

              <h2 className="font-bold text-slate-900">
                Attendance Actions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Continue with common faculty attendance tasks.
              </p>

            </div>

          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            <QuickAction
              icon={
                <ClipboardCheck
                  size={20}
                />
              }
              title="Open Attendance"
              description="Review attendance records"
              onClick={() =>
                loadAttendance(
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
              title="View Timetable"
              description="Check today's sessions"
              onClick={() =>
                navigate(
                  "/faculty/timetable"
                )
              }
            />

            <QuickAction
              icon={
                <Users size={20} />
              }
              title="View Students"
              description="Review enrolled students"
              onClick={() =>
                navigate(
                  "/faculty/students"
                )
              }
            />

          </div>

        </section>

      </main>

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
    info:
      "bg-blue-50 text-blue-600",
    warning:
      "bg-amber-50 text-amber-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          styles[type] ||
          styles.default
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
   OVERALL MINI
============================================================ */

function OverallMini({
  label,
  value,
  positive,
  negative,
  warning,
}) {
  const className =
    positive
      ? "bg-green-50 text-green-700"
      : negative
      ? "bg-red-50 text-red-700"
      : warning
      ? "bg-amber-50 text-amber-700"
      : "bg-slate-50 text-slate-700";

  return (
    <div
      className={`rounded-xl p-4 text-center ${className}`}
    >

      <p className="text-xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs font-semibold opacity-75">
        {label}
      </p>

    </div>
  );
}

/* ============================================================
   HEALTH ROW
============================================================ */

function HealthRow({
  label,
  value,
  total,
  className,
}) {
  const percentage =
    total > 0
      ? Math.round(
          (value / total) *
            100
        )
      : 0;

  return (
    <div>

      <div className="flex items-center justify-between gap-3">

        <span className="text-sm font-semibold text-slate-700">
          {label}
        </span>

        <span className="text-xs font-bold text-slate-500">
          {value}{" "}
          <span className="font-normal">
            ({percentage}%)
          </span>
        </span>

      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">

        <div
          className={`h-full rounded-full transition-all duration-500 ${className}`}
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}

/* ============================================================
   HIGHLIGHT CARD
============================================================ */

function HighlightCard({
  title,
  subtitle,
  course,
  positive,
  negative,
}) {
  const percentage =
    course
      ? getAttendancePercentage(
          course
        )
      : 0;

  const health =
    course
      ? getAttendanceHealth(
          percentage,
          course?.totalClasses
        )
      : null;

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${
        positive
          ? "border-green-200 bg-green-50"
          : negative
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-white"
      }`}
    >

      <div className="flex items-start justify-between gap-4">

        <div>

          <p
            className={`text-xs font-bold uppercase tracking-wide ${
              positive
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {title}
          </p>

          <h3 className="mt-2 line-clamp-2 text-lg font-bold text-slate-900">
            {course
              ?.course
              ?.name ||
              course
                ?.courseName ||
              "No course data"}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {course
              ?.course
              ?.code ||
              course
                ?.courseCode ||
              ""}
          </p>

        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            positive
              ? "bg-white text-green-600"
              : "bg-white text-red-600"
          }`}
        >
          {positive ? (
            <TrendingUp
              size={22}
            />
          ) : (
            <TrendingDown
              size={22}
            />
          )}
        </div>

      </div>

      <div className="mt-5 flex items-end justify-between gap-4">

        <div>

          <p className="text-2xl font-bold text-slate-900">
            {Math.round(
              percentage
            )}
            %
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {subtitle}
          </p>

        </div>

        {health && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${health.className}`}
          >
            {health.icon}
            {health.shortLabel}
          </span>
        )}

      </div>

    </div>
  );
}

/* ============================================================
   COURSE ATTENDANCE CARD
============================================================ */

function CourseAttendanceCard({
  item,
}) {
  const totalClasses =
    Number(
      item?.totalClasses || 0
    );

  const attendedClasses =
    Number(
      item?.attendedClasses || 0
    );

  const absent =
    Math.max(
      totalClasses -
        attendedClasses,
      0
    );

  const hasRecords =
    totalClasses > 0;

  const percentage =
    getAttendancePercentage(
      item
    );

  const health =
    getAttendanceHealth(
      percentage,
      totalClasses
    );

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-indigo-200 hover:bg-white hover:shadow-sm">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div className="min-w-0">

          <div className="flex flex-wrap items-center gap-2">

            <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
              {item
                ?.course
                ?.code ||
                item?.courseCode ||
                "COURSE"}
            </p>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${health.className}`}
            >
              {health.icon}
              {health.shortLabel}
            </span>

          </div>

          <h3 className="mt-1 text-lg font-bold text-slate-900">
            {item
              ?.course
              ?.name ||
              item?.courseName ||
              "Course not available"}
          </h3>

        </div>

        <div className="flex items-center gap-4">

          <div className="text-left sm:text-right">

            {hasRecords ? (
              <>
                <p className="text-2xl font-bold text-slate-900">
                  {Math.round(
                    percentage
                  )}
                  %
                </p>

                <p className="text-xs text-slate-500">
                  {attendedClasses} /{" "}
                  {totalClasses} classes
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-slate-400">
                  No records
                </p>

                <p className="text-xs text-slate-400">
                  0 classes recorded
                </p>
              </>
            )}

          </div>

        </div>

      </div>

      {hasRecords && (
        <div className="mt-5">

          <div className="mb-2 flex items-center justify-between gap-3">

            <span className="text-xs font-semibold text-slate-500">
              Attendance
            </span>

            <span className="text-xs font-semibold text-slate-400">
              {absent} absent
            </span>

          </div>

          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">

            <div
              className={`h-full rounded-full transition-all duration-500 ${health.barClass}`}
              style={{
                width: `${Math.min(
                  percentage,
                  100
                )}%`,
              }}
            />

          </div>

        </div>
      )}

    </article>
  );
}

/* ============================================================
   ATTENDANCE RECORD
============================================================ */

function AttendanceRecord({
  record,
}) {
  const status =
    String(
      record?.status ||
        "UNKNOWN"
    ).toUpperCase();

  const isPresent =
    status === "PRESENT" ||
    status === "LATE";

  const isLate =
    status === "LATE";

  const date =
    formatDate(
      record?.date
    );

  const statusStyle =
    isLate
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : isPresent
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-red-50 text-red-700 border-red-200";

  const iconStyle =
    isLate
      ? "bg-amber-50 text-amber-600"
      : isPresent
      ? "bg-green-50 text-green-600"
      : "bg-red-50 text-red-600";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:flex-row sm:items-center">

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconStyle}`}
      >
        {isPresent ? (
          <CheckCircle2
            size={19}
          />
        ) : (
          <XCircle size={19} />
        )}
      </div>

      <div className="min-w-0 flex-1">

        <h3 className="truncate font-semibold text-slate-800">
          {record
            ?.course
            ?.name ||
            record?.courseName ||
            "Course not available"}
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          {record
            ?.course
            ?.code ||
            record?.courseCode ||
            "-"}{" "}
          • {date}
        </p>

      </div>

      <span
        className={`inline-flex self-start rounded-full border px-3 py-1.5 text-xs font-bold sm:self-auto ${statusStyle}`}
      >
        {status}
      </span>

    </div>
  );
}

/* ============================================================
   RECENT METRIC
============================================================ */

function RecentMetric({
  label,
  value,
  type = "default",
}) {
  const styles = {
    default:
      "bg-slate-50 text-slate-700",
    positive:
      "bg-green-50 text-green-700",
    warning:
      "bg-amber-50 text-amber-700",
    negative:
      "bg-red-50 text-red-700",
  };

  return (
    <div
      className={`rounded-xl p-4 ${styles[type]}`}
    >

      <p className="text-lg font-bold">
        {value}
      </p>

      <p className="mt-1 text-[11px] font-semibold opacity-75">
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
      onClick={onClick}
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
   ZAP ICON
============================================================ */

function ZapIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export default FacultyAttendance;