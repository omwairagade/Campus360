import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  ArrowUpDown,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock,
  Filter,
  GraduationCap,
  Layers3,
  RefreshCw,
  Search,
  Users,
  X,
  BarChart3,
  BookMarked,
  Hash,
  Building2,
  LayoutGrid,
  ListFilter,
} from "lucide-react";

import {
  apiGet,
} from "../api";

/* ============================================================
   HELPERS
============================================================ */

const normalizeCourses = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.courses)) {
    return response.courses;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.courses)) {
    return response.data.courses;
  }

  return [];
};

const getCourseName = (course) => {
  return (
    course?.name ||
    course?.courseName ||
    course?.title ||
    "Unnamed Course"
  );
};

const getCourseCode = (course) => {
  return (
    course?.code ||
    course?.courseCode ||
    course?.course_code ||
    "N/A"
  );
};

const getSemester = (course) => {
  return (
    course?.semester ??
    course?.sem ??
    "—"
  );
};

const getCredits = (course) => {
  return (
    course?.credits ??
    course?.credit ??
    "—"
  );
};

const getType = (course) => {
  return (
    course?.type ||
    course?.courseType ||
    course?.classType ||
    "Course"
  );
};

const getDepartment = (course) => {
  return (
    course?.department?.name ||
    course?.departmentName ||
    "Not assigned"
  );
};

const getCourseDescription = (
  course
) => {
  return (
    course?.description ||
    course?.courseDescription ||
    course?.details ||
    "Manage teaching activities, attendance, assignments and academic work for this course."
  );
};

const getCourseId = (course) => {
  return (
    course?.id ||
    course?.courseId ||
    course?.course_id ||
    null
  );
};

const getStudentCount = (course) => {
  return Number(
    course?.studentCount ??
      course?.studentsCount ??
      course?.enrolledStudents ??
      course?.totalStudents ??
      course?.students?.length ??
      0
  );
};

const getAssignmentCount = (
  course
) => {
  return Number(
    course?.assignmentCount ??
      course?.assignmentsCount ??
      course?.totalAssignments ??
      course?.assignments?.length ??
      0
  );
};

const getScheduleCount = (
  course
) => {
  return Number(
    course?.scheduleCount ??
      course?.timetableCount ??
      course?.sessionsCount ??
      0
  );
};

const getSemesterNumber = (
  course
) => {
  const value =
    getSemester(course);

  const numeric =
    Number(value);

  return Number.isFinite(
    numeric
  )
    ? numeric
    : null;
};

const getTypeGroup = (course) => {
  const value = getType(course)
    .toLowerCase();

  if (
    value.includes("lab") ||
    value.includes("practical")
  ) {
    return "LAB";
  }

  if (
    value.includes("lecture") ||
    value.includes("theory")
  ) {
    return "LECTURE";
  }

  return "OTHER";
};

/* ============================================================
   COMPONENT
============================================================ */

function FacultyCourses() {
  const navigate = useNavigate();

  const [courses, setCourses] =
    useState([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [semesterFilter, setSemesterFilter] =
    useState("ALL");

  const [typeFilter, setTypeFilter] =
    useState("ALL");

  const [sortBy, setSortBy] =
    useState("name");

  const [viewMode, setViewMode] =
    useState("grid");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  /* ==========================================================
     LOAD COURSES
  ========================================================== */

  const loadCourses = async (
    isRefresh = false
  ) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      let response;

      try {
        response = await apiGet(
          "/faculty/my-courses"
        );
      } catch (primaryError) {
        response = await apiGet(
          "/faculty/courses"
        );
      }

      setCourses(
        normalizeCourses(response)
      );
    } catch (err) {
      console.error(
        "Failed to load faculty courses:",
        err
      );

      setError(
        err?.message ||
          "Failed to load courses."
      );

      setCourses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  /* ==========================================================
     FILTER OPTIONS
  ========================================================== */

  const semesterOptions =
    useMemo(() => {
      const values =
        courses
          .map(
            (course) =>
              getSemesterNumber(course)
          )
          .filter(
            (value) =>
              value !== null
          );

      return [
        ...new Set(values),
      ].sort(
        (a, b) => a - b
      );
    }, [courses]);

  const typeOptions =
    useMemo(() => {
      return [
        ...new Set(
          courses.map(
            (course) =>
              getType(course)
          )
        ),
      ].sort((a, b) =>
        String(a).localeCompare(
          String(b)
        )
      );
    }, [courses]);

  /* ==========================================================
     FILTERED COURSES
  ========================================================== */

  const filteredCourses =
    useMemo(() => {
      const term =
        searchTerm
          .trim()
          .toLowerCase();

      const filtered =
        courses.filter(
          (course) => {
            const searchValues = [
              getCourseName(course),
              getCourseCode(course),
              getDepartment(course),
              getSemester(course),
              getType(course),
              getCourseDescription(
                course
              ),
            ];

            const matchesSearch =
              !term ||
              searchValues.some(
                (value) =>
                  String(
                    value ?? ""
                  )
                    .toLowerCase()
                    .includes(term)
              );

            const courseSemester =
              getSemesterNumber(
                course
              );

            const matchesSemester =
              semesterFilter ===
                "ALL" ||
              String(
                courseSemester
              ) ===
                String(
                  semesterFilter
                );

            const matchesType =
              typeFilter ===
                "ALL" ||
              getType(course) ===
                typeFilter;

            return (
              matchesSearch &&
              matchesSemester &&
              matchesType
            );
          }
        );

      return [...filtered].sort(
        (a, b) => {
          if (
            sortBy === "code"
          ) {
            return getCourseCode(
              a
            ).localeCompare(
              getCourseCode(b)
            );
          }

          if (
            sortBy === "semester"
          ) {
            const semesterA =
              getSemesterNumber(a) ??
              999;

            const semesterB =
              getSemesterNumber(b) ??
              999;

            return (
              semesterA -
              semesterB
            );
          }

          if (
            sortBy === "credits"
          ) {
            return (
              Number(
                getCredits(b)
              ) -
              Number(
                getCredits(a)
              )
            );
          }

          if (
            sortBy === "students"
          ) {
            return (
              getStudentCount(b) -
              getStudentCount(a)
            );
          }

          return getCourseName(
            a
          ).localeCompare(
            getCourseName(b)
          );
        }
      );
    }, [
      courses,
      searchTerm,
      semesterFilter,
      typeFilter,
      sortBy,
    ]);

  /* ==========================================================
     ANALYTICS
  ========================================================== */

  const totalCredits =
    courses.reduce(
      (sum, course) =>
        sum +
        (Number(
          getCredits(course)
        ) || 0),
      0
    );

  const totalStudents =
    courses.reduce(
      (sum, course) =>
        sum +
        getStudentCount(course),
      0
    );

  const totalAssignments =
    courses.reduce(
      (sum, course) =>
        sum +
        getAssignmentCount(
          course
        ),
      0
    );

  const totalSchedules =
    courses.reduce(
      (sum, course) =>
        sum +
        getScheduleCount(
          course
        ),
      0
    );

  const lectureCourses =
    courses.filter(
      (course) =>
        getTypeGroup(course) ===
        "LECTURE"
    ).length;

  const labCourses =
    courses.filter(
      (course) =>
        getTypeGroup(course) ===
        "LAB"
    ).length;

  const otherCourses =
    Math.max(
      courses.length -
        lectureCourses -
        labCourses,
      0
    );

  const averageStudents =
    courses.length > 0
      ? Math.round(
          totalStudents /
            courses.length
        )
      : 0;

  const averageCredits =
    courses.length > 0
      ? (
          totalCredits /
          courses.length
        ).toFixed(1)
      : "0.0";

  /* ==========================================================
     COURSE GROUPS
  ========================================================== */

  const semesterDistribution =
    useMemo(() => {
      const map =
        new Map();

      courses.forEach(
        (course) => {
          const semester =
            getSemesterNumber(
              course
            );

          if (
            semester === null
          ) {
            return;
          }

          map.set(
            semester,
            (map.get(
              semester
            ) || 0) + 1
          );
        }
      );

      return [
        ...map.entries(),
      ].sort(
        (a, b) =>
          a[0] - b[0]
      );
    }, [courses]);

  const highestSemesterLoad =
    semesterDistribution.length >
    0
      ? Math.max(
          ...semesterDistribution.map(
            ([, count]) =>
              count
          )
        )
      : 0;

  /* ==========================================================
     FILTER STATE
  ========================================================== */

  const hasFilters =
    searchTerm.trim() !== "" ||
    semesterFilter !== "ALL" ||
    typeFilter !== "ALL";

  const clearFilters = () => {
    setSearchTerm("");
    setSemesterFilter("ALL");
    setTypeFilter("ALL");
  };

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

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

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
                <BookOpen
                  size={23}
                />
              </div>

              <div className="min-w-0">

                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Faculty Portal
                </p>

                <h1 className="truncate text-xl font-bold text-slate-900 md:text-2xl">
                  My Courses
                </h1>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={() =>
                  loadCourses(true)
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
            HERO
        ==================================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-indigo-600 p-6 text-white shadow-lg sm:p-8">

          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/10" />

          <div className="absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-white/5" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div className="max-w-3xl">

              <div className="mb-3 flex flex-wrap items-center gap-2">

                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                  {courses.length}{" "}
                  Assigned Courses
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
                  {totalCredits} Credits
                </span>

              </div>

              <h2 className="text-2xl font-bold sm:text-3xl">
                Manage your teaching workload
              </h2>

              <p className="mt-2 text-sm leading-6 text-indigo-100 sm:text-base">
                Access your assigned courses and open each course to manage teaching activities, attendance, assignments and academic work.
              </p>

            </div>

            <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[340px]">

              <HeroMetric
                label="Students"
                value={
                  totalStudents
                }
              />

              <HeroMetric
                label="Assignments"
                value={
                  totalAssignments
                }
              />

              <HeroMetric
                label="Avg. Students"
                value={
                  averageStudents
                }
              />

            </div>

          </div>

        </section>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">

            <CircleErrorIcon />

            <div className="min-w-0 flex-1">

              <p className="font-bold">
                Unable to load courses
              </p>

              <p className="mt-1 text-sm leading-6">
                {error}
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                loadCourses(true)
              }
              className="shrink-0 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-bold text-red-700 transition hover:bg-red-200"
            >
              Retry
            </button>

          </div>
        )}

        {/* ====================================================
            SUMMARY CARDS
        ==================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <MetricCard
            icon={
              <BookOpen size={21} />
            }
            title="Total Courses"
            value={
              courses.length
            }
            description="Assigned to you"
          />

          <MetricCard
            icon={
              <Users size={21} />
            }
            title="Students"
            value={
              totalStudents
            }
            description="Across assigned courses"
          />

          <MetricCard
            icon={
              <GraduationCap
                size={21}
              />
            }
            title="Total Credits"
            value={
              totalCredits
            }
            description={`Average ${averageCredits} per course`}
          />

          <MetricCard
            icon={
              <ClipboardListIcon />
            }
            title="Assignments"
            value={
              totalAssignments
            }
            description="Available course data"
          />

        </section>

        {/* ====================================================
            COURSE BREAKDOWN
        ==================================================== */}

        <section className="mt-6 grid gap-6 lg:grid-cols-2">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Layers3 size={20} />
              </div>

              <div>

                <h2 className="font-bold text-slate-900">
                  Course Type Breakdown
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Distribution of assigned course types.
                </p>

              </div>

            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">

              <BreakdownCard
                label="Lectures"
                value={
                  lectureCourses
                }
                percentage={
                  courses.length
                    ? Math.round(
                        (lectureCourses /
                          courses.length) *
                          100
                      )
                    : 0
                }
                className="bg-blue-50 text-blue-700"
              />

              <BreakdownCard
                label="Labs"
                value={
                  labCourses
                }
                percentage={
                  courses.length
                    ? Math.round(
                        (labCourses /
                          courses.length) *
                          100
                      )
                    : 0
                }
                className="bg-purple-50 text-purple-700"
              />

              <BreakdownCard
                label="Other"
                value={
                  otherCourses
                }
                percentage={
                  courses.length
                    ? Math.round(
                        (otherCourses /
                          courses.length) *
                          100
                      )
                    : 0
                }
                className="bg-slate-100 text-slate-700"
              />

            </div>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <BarChart3
                  size={20}
                />
              </div>

              <div>

                <h2 className="font-bold text-slate-900">
                  Academic Load
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Quick overview of your teaching distribution.
                </p>

              </div>

            </div>

            <div className="mt-5 space-y-4">

              {semesterDistribution.length ===
              0 ? (
                <p className="text-sm text-slate-500">
                  Semester information is not available.
                </p>
              ) : (
                semesterDistribution.map(
                  ([
                    semester,
                    count,
                  ]) => {
                    const percentage =
                      highestSemesterLoad >
                      0
                        ? Math.round(
                            (count /
                              highestSemesterLoad) *
                              100
                          )
                        : 0;

                    return (
                      <div
                        key={
                          semester
                        }
                      >

                        <div className="flex items-center justify-between gap-3">

                          <span className="text-sm font-semibold text-slate-700">
                            Semester{" "}
                            {
                              semester
                            }
                          </span>

                          <span className="text-xs font-bold text-slate-500">
                            {count} course
                            {count ===
                            1
                              ? ""
                              : "s"}
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

        {/* ====================================================
            SEARCH & FILTER
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
                placeholder="Search course name, code, department, semester..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-11 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchTerm("")
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}

            </div>

            <div className="flex flex-wrap items-center gap-3">

              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">

                <Filter size={17} />

                Filters

              </div>

              <select
                value={
                  semesterFilter
                }
                onChange={(event) =>
                  setSemesterFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500"
              >

                <option value="ALL">
                  All Semesters
                </option>

                {semesterOptions.map(
                  (semester) => (
                    <option
                      key={
                        semester
                      }
                      value={
                        semester
                      }
                    >
                      Semester{" "}
                      {semester}
                    </option>
                  )
                )}

              </select>

              <select
                value={
                  typeFilter
                }
                onChange={(event) =>
                  setTypeFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500"
              >

                <option value="ALL">
                  All Types
                </option>

                {typeOptions.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  )
                )}

              </select>

              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500"
              >

                <option value="name">
                  Sort: Name
                </option>

                <option value="code">
                  Sort: Code
                </option>

                <option value="semester">
                  Sort: Semester
                </option>

                <option value="credits">
                  Sort: Credits
                </option>

                <option value="students">
                  Sort: Students
                </option>

              </select>

            </div>

          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">

              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 font-semibold">

                <ListFilter
                  size={13}
                />

                Showing{" "}
                {
                  filteredCourses.length
                }{" "}
                of{" "}
                {
                  courses.length
                }

              </span>

              {hasFilters && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 font-semibold text-indigo-600 hover:bg-indigo-100"
                >
                  <X size={13} />
                  Clear filters
                </button>
              )}

            </div>

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
                className={`rounded-lg p-2 ${
                  viewMode ===
                  "grid"
                    ? "bg-indigo-100 text-indigo-600"
                    : "text-slate-400 hover:bg-slate-100"
                }`}
                title="Grid view"
              >
                <LayoutGrid
                  size={17}
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  setViewMode(
                    "list"
                  )
                }
                className={`rounded-lg p-2 ${
                  viewMode ===
                  "list"
                    ? "bg-indigo-100 text-indigo-600"
                    : "text-slate-400 hover:bg-slate-100"
                }`}
                title="List view"
              >
                <ListFilter
                  size={17}
                />
              </button>

            </div>

          </div>

        </section>

        {/* ====================================================
            LOADING
        ==================================================== */}

        {loading && (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {[1, 2, 3, 4, 5, 6].map(
              (item) => (
                <div
                  key={item}
                  className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >

                  <div className="h-36 bg-slate-200" />

                  <div className="space-y-4 p-5">

                    <div className="h-5 w-3/4 rounded bg-slate-200" />

                    <div className="h-4 w-1/2 rounded bg-slate-200" />

                    <div className="grid grid-cols-2 gap-3">

                      <div className="h-16 rounded-xl bg-slate-100" />

                      <div className="h-16 rounded-xl bg-slate-100" />

                    </div>

                    <div className="h-11 rounded-xl bg-slate-200" />

                  </div>

                </div>
              )
            )}

          </div>
        )}

        {/* ====================================================
            EMPTY
        ==================================================== */}

        {!loading &&
          !error &&
          filteredCourses.length ===
            0 && (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

                <BookOpen
                  size={30}
                />

              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-800">
                No courses found
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {hasFilters
                  ? "No courses match your current search and filters."
                  : "No courses are currently assigned to you."}
              </p>

              {hasFilters && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                >

                  <X size={16} />

                  Clear Filters

                </button>
              )}

            </section>
          )}

        {/* ====================================================
            GRID VIEW
        ==================================================== */}

        {!loading &&
          filteredCourses.length >
            0 &&
          viewMode ===
            "grid" && (
            <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">

              {filteredCourses.map(
                (course) => {
                  const courseId =
                    getCourseId(
                      course
                    );

                  const semester =
                    getSemester(
                      course
                    );

                  const credits =
                    getCredits(
                      course
                    );

                  const type =
                    getType(
                      course
                    );

                  const students =
                    getStudentCount(
                      course
                    );

                  const assignments =
                    getAssignmentCount(
                      course
                    );

                  return (
                    <article
                      key={
                        courseId ||
                        `${getCourseCode(
                          course
                        )}-${getCourseName(
                          course
                        )}`
                      }
                      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
                    >

                      {/* TOP */}

                      <div className="relative overflow-hidden bg-indigo-600 p-6 text-white">

                        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />

                        <div className="relative">

                          <div className="mb-5 flex items-start justify-between gap-3">

                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                              <BookOpen
                                size={24}
                              />
                            </div>

                            <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur">
                              {type}
                            </span>

                          </div>

                          <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                            {getCourseCode(
                              course
                            )}
                          </p>

                          <h2 className="mt-1 line-clamp-2 text-xl font-bold">
                            {getCourseName(
                              course
                            )}
                          </h2>

                        </div>

                      </div>

                      {/* CONTENT */}

                      <div className="flex flex-1 flex-col p-5">

                        <p className="line-clamp-2 min-h-[42px] text-sm leading-5 text-slate-500">
                          {getCourseDescription(
                            course
                          )}
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-3">

                          <CourseInfo
                            icon={
                              <GraduationCap
                                size={16}
                              />
                            }
                            label="Semester"
                            value={
                              semester
                            }
                          />

                          <CourseInfo
                            icon={
                              <Hash
                                size={16}
                              />
                            }
                            label="Credits"
                            value={
                              credits
                            }
                          />

                          <CourseInfo
                            icon={
                              <Users
                                size={16}
                              />
                            }
                            label="Students"
                            value={
                              students
                            }
                          />

                          <CourseInfo
                            icon={
                              <ClipboardListIcon />
                            }
                            label="Assignments"
                            value={
                              assignments
                            }
                          />

                        </div>

                        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">

                          <div className="flex items-start gap-2">

                            <Building2
                              size={16}
                              className="mt-0.5 shrink-0 text-slate-400"
                            />

                            <div className="min-w-0">

                              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                Department
                              </p>

                              <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                                {getDepartment(
                                  course
                                )}
                              </p>

                            </div>

                          </div>

                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (
                              !courseId
                            ) {
                              return;
                            }

                            navigate(
                              `/faculty/courses/${courseId}`
                            );
                          }}
                          disabled={
                            !courseId
                          }
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >

                          <Users
                            size={17}
                          />

                          Manage Course

                          <ChevronRight
                            size={18}
                            className="transition-transform group-hover:translate-x-1"
                          />

                        </button>

                      </div>

                    </article>
                  );
                }
              )}

            </section>
          )}

        {/* ====================================================
            LIST VIEW
        ==================================================== */}

        {!loading &&
          filteredCourses.length >
            0 &&
          viewMode ===
            "list" && (
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1.2fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-400 lg:grid">

                <span>
                  Course
                </span>

                <span>
                  Semester
                </span>

                <span>
                  Credits
                </span>

                <span>
                  Students
                </span>

                <span>
                  Department
                </span>

                <span>
                  Action
                </span>

              </div>

              <div className="divide-y divide-slate-100">

                {filteredCourses.map(
                  (course) => {
                    const courseId =
                      getCourseId(
                        course
                      );

                    return (
                      <div
                        key={
                          courseId ||
                          getCourseCode(
                            course
                          )
                        }
                        className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 lg:grid-cols-[2fr_1fr_1fr_1fr_1.2fr_auto] lg:items-center"
                      >

                        <div className="min-w-0">

                          <div className="flex items-start gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                              <BookOpen
                                size={
                                  19
                                }
                              />
                            </div>

                            <div className="min-w-0">

                              <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                                {getCourseCode(
                                  course
                                )}
                              </p>

                              <h3 className="mt-0.5 truncate font-bold text-slate-800">
                                {getCourseName(
                                  course
                                )}
                              </h3>

                              <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                                {getType(
                                  course
                                )}
                              </span>

                            </div>

                          </div>

                        </div>

                        <div>

                          <p className="text-[10px] font-bold uppercase text-slate-400 lg:hidden">
                            Semester
                          </p>

                          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-700 lg:mt-0">

                            <GraduationCap
                              size={15}
                              className="text-slate-400"
                            />

                            {getSemester(
                              course
                            )}

                          </p>

                        </div>

                        <div>

                          <p className="text-[10px] font-bold uppercase text-slate-400 lg:hidden">
                            Credits
                          </p>

                          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-700 lg:mt-0">

                            <Hash
                              size={15}
                              className="text-slate-400"
                            />

                            {getCredits(
                              course
                            )}

                          </p>

                        </div>

                        <div>

                          <p className="text-[10px] font-bold uppercase text-slate-400 lg:hidden">
                            Students
                          </p>

                          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-700 lg:mt-0">

                            <Users
                              size={15}
                              className="text-slate-400"
                            />

                            {
                              getStudentCount(
                                course
                              )
                            }

                          </p>

                        </div>

                        <div className="min-w-0">

                          <p className="text-[10px] font-bold uppercase text-slate-400 lg:hidden">
                            Department
                          </p>

                          <p className="mt-1 truncate text-sm font-semibold text-slate-700 lg:mt-0">
                            {getDepartment(
                              course
                            )}
                          </p>

                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (
                              !courseId
                            ) {
                              return;
                            }

                            navigate(
                              `/faculty/courses/${courseId}`
                            );
                          }}
                          disabled={
                            !courseId
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
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
            FOOTER STATS
        ==================================================== */}

        {!loading &&
          courses.length >
            0 && (
            <section className="mt-8 grid gap-4 sm:grid-cols-3">

              <FooterStat
                icon={
                  <CalendarDays
                    size={20}
                  />
                }
                label="Scheduled Sessions"
                value={
                  totalSchedules ||
                  "—"
                }
                description="Based on available course data"
              />

              <FooterStat
                icon={
                  <BookMarked
                    size={20}
                  />
                }
                label="Semester Coverage"
                value={
                  semesterDistribution.length
                }
                description="Academic semesters represented"
              />

              <FooterStat
                icon={
                  <ArrowUpDown
                    size={20}
                  />
                }
                label="Visible Results"
                value={
                  filteredCourses.length
                }
                description="Courses matching current filters"
              />

            </section>
          )}

      </main>

    </div>
  );
}

/* ============================================================
   COMPONENTS
============================================================ */

function MetricCard({
  icon,
  title,
  value,
  description,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div className="flex items-start justify-between gap-3">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          {icon}
        </div>

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

function HeroMetric({
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur">

      <p className="text-xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-[11px] font-semibold text-indigo-200">
        {label}
      </p>

    </div>
  );
}

function BreakdownCard({
  label,
  value,
  percentage,
  className,
}) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
    >

      <p className="text-xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold">
        {label}
      </p>

      <p className="mt-1 text-[10px] opacity-70">
        {percentage}% of courses
      </p>

    </div>
  );
}

function CourseInfo({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">

      <div className="mb-1 flex items-center gap-1.5 text-slate-400">

        {icon}

        <span className="text-[11px] font-semibold">
          {label}
        </span>

      </div>

      <p className="font-bold text-slate-700">
        {value}
      </p>

    </div>
  );
}

function FooterStat({
  icon,
  label,
  value,
  description,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>

        <div className="min-w-0">

          <p className="text-xs font-semibold text-slate-400">
            {label}
          </p>

          <p className="mt-0.5 text-xl font-bold text-slate-800">
            {value}
          </p>

        </div>

      </div>

      <p className="mt-3 text-xs leading-5 text-slate-400">
        {description}
      </p>

    </div>
  );
}

function CircleErrorIcon() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
      <CircleAlertIcon
        size={20}
      />
    </div>
  );
}

function CircleAlertIcon({
  size = 20,
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
      />
      <line
        x1="12"
        y1="8"
        x2="12"
        y2="12"
      />
      <line
        x1="12"
        y1="16"
        x2="12.01"
        y2="16"
      />
    </svg>
  );
}

function ClipboardListIcon() {
  return (
    <ClipboardListSvg />
  );
}

function ClipboardListSvg() {
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
      <rect
        width="8"
        height="4"
        x="8"
        y="2"
        rx="1"
        ry="1"
      />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M8 14h8" />
      <path d="M8 18h6" />
      <path d="M8 10h8" />
    </svg>
  );
}

export default FacultyCourses;