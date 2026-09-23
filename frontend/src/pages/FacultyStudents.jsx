import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronRight,
  Filter,
  GraduationCap,
  Layers3,
  LibraryBig,
  Mail,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  Users,
  X,
  AlertCircle,
  CheckCircle2,
  Target,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Award,
  Activity,
} from "lucide-react";

import {
  apiGet,
  logoutUser,
} from "../api";

/* ============================================================
   HELPERS
============================================================ */

const normalizeStudents = (
  response
) => {
  if (
    Array.isArray(
      response?.students
    )
  ) {
    return response.students;
  }

  if (
    Array.isArray(
      response?.data?.students
    )
  ) {
    return response.data.students;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

const normalizeCourses = (
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

  return [];
};

const getStudentName = (
  student
) => {
  const firstName =
    student?.user?.firstName ||
    "";

  const lastName =
    student?.user?.lastName ||
    "";

  const fullName =
    `${firstName} ${lastName}`.trim();

  return (
    fullName ||
    student?.name ||
    student?.fullName ||
    "Student"
  );
};

const getStudentId = (
  student
) => {
  return (
    student?.enrollmentNumber ||
    student?.studentCode ||
    student?.registrationNumber ||
    student?.rollNumber ||
    "-"
  );
};

const getEmail = (
  student
) => {
  return (
    student?.user?.email ||
    student?.email ||
    "-"
  );
};

const getPhone = (
  student
) => {
  return (
    student?.phone ||
    student?.mobile ||
    student?.mobileNumber ||
    "-"
  );
};

const getDepartment = (
  student
) => {
  return (
    student?.department?.name ||
    student?.departmentRel?.name ||
    student?.departmentName ||
    "-"
  );
};

const getProgram = (
  student
) => {
  return (
    student?.program?.name ||
    student?.programRel?.name ||
    student?.programName ||
    "-"
  );
};

const getBatch = (
  student
) => {
  if (
    student?.batch === null ||
    student?.batch === undefined ||
    student?.batch === ""
  ) {
    return "Not assigned";
  }

  return `Batch ${student.batch}`;
};

const getDivision = (
  student
) => {
  if (
    student?.division === null ||
    student?.division === undefined ||
    student?.division === ""
  ) {
    return "Not assigned";
  }

  return student.division;
};

const getSemester = (
  student
) => {
  return (
    student?.semester ??
    student?.sem ??
    "—"
  );
};

const getCourseCount = (
  student
) => {
  return Array.isArray(
    student?.courses
  )
    ? student.courses.length
    : Number(
        student?.courseCount || 0
      );
};

const getInitials = (
  name
) => {
  const words =
    String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (words.length === 0) {
    return "S";
  }

  if (words.length === 1) {
    return words[0]
      .charAt(0)
      .toUpperCase();
  }

  return `${words[0].charAt(
    0
  )}${words[
    words.length - 1
  ].charAt(0)}`.toUpperCase();
};

/* ============================================================
   COMPONENT
============================================================ */

function FacultyStudents() {
  const navigate =
    useNavigate();

  const [students, setStudents] =
    useState([]);

  const [courses, setCourses] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [selectedCourse, setSelectedCourse] =
    useState("ALL");

  const [selectedSemester, setSelectedSemester] =
    useState("ALL");

  const [selectedDivision, setSelectedDivision] =
    useState("ALL");

  const [selectedBatch, setSelectedBatch] =
    useState("ALL");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [viewMode, setViewMode] =
    useState("grid");

  const [sortBy, setSortBy] =
    useState("name");

  /* ==========================================================
     LOAD STUDENTS
  ========================================================== */

  const loadStudents = async (
    isRefresh = false
  ) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const data =
        await apiGet(
          "/student/faculty/students"
        );

      setStudents(
        normalizeStudents(data)
      );

      setCourses(
        normalizeCourses(data)
      );
    } catch (err) {
      console.error(
        "Faculty students error:",
        err
      );

      const message =
        err?.message ||
        "Unable to load students.";

      setError(message);

      if (
        /authentication|unauthorized|forbidden|token/i.test(
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
  };

  useEffect(() => {
    loadStudents();
  }, []);

  /* ==========================================================
     FILTER OPTIONS
  ========================================================== */

  const semesterOptions =
    useMemo(() => {
      return [
        ...new Set(
          students
            .map((student) =>
              String(
                getSemester(
                  student
                )
              )
            )
            .filter(
              (value) =>
                value !== "—" &&
                value !== ""
            )
        ),
      ].sort(
        (a, b) =>
          Number(a) -
          Number(b)
      );
    }, [students]);

  const divisionOptions =
    useMemo(() => {
      return [
        ...new Set(
          students
            .map(
              (student) =>
                student?.division
            )
            .filter(
              (value) =>
                value !== null &&
                value !== undefined &&
                value !== ""
            )
            .map((value) =>
              String(value)
            )
        ),
      ].sort((a, b) =>
        a.localeCompare(b)
      );
    }, [students]);

  const batchOptions =
    useMemo(() => {
      return [
        ...new Set(
          students
            .map(
              (student) =>
                student?.batch
            )
            .filter(
              (value) =>
                value !== null &&
                value !== undefined &&
                value !== ""
            )
            .map((value) =>
              String(value)
            )
        ),
      ].sort((a, b) =>
        a.localeCompare(b)
      );
    }, [students]);

  /* ==========================================================
     FILTER STUDENTS
  ========================================================== */

  const filteredStudents =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const filtered =
        students.filter(
          (student) => {
            const searchableText = [
              getStudentName(
                student
              ),
              getStudentId(
                student
              ),
              getEmail(
                student
              ),
              getPhone(
                student
              ),
              getDepartment(
                student
              ),
              getProgram(
                student
              ),
              getBatch(
                student
              ),
              getDivision(
                student
              ),
              getSemester(
                student
              ),
            ]
              .join(" ")
              .toLowerCase();

            const matchesSearch =
              !query ||
              searchableText.includes(
                query
              );

            const matchesCourse =
              selectedCourse ===
                "ALL" ||
              (Array.isArray(
                student?.courses
              ) &&
                student.courses.some(
                  (course) =>
                    String(
                      course?.id
                    ) ===
                    String(
                      selectedCourse
                    )
                ));

            const matchesSemester =
              selectedSemester ===
                "ALL" ||
              String(
                getSemester(
                  student
                )
              ) ===
                String(
                  selectedSemester
                );

            const matchesDivision =
              selectedDivision ===
                "ALL" ||
              String(
                student?.division ??
                  ""
              ) ===
                String(
                  selectedDivision
                );

            const matchesBatch =
              selectedBatch ===
                "ALL" ||
              String(
                student?.batch ??
                  ""
              ) ===
                String(
                  selectedBatch
                );

            return (
              matchesSearch &&
              matchesCourse &&
              matchesSemester &&
              matchesDivision &&
              matchesBatch
            );
          }
        );

      return [...filtered].sort(
        (a, b) => {
          if (
            sortBy ===
            "studentId"
          ) {
            return getStudentId(
              a
            ).localeCompare(
              getStudentId(
                b
              )
            );
          }

          if (
            sortBy ===
            "semester"
          ) {
            return (
              Number(
                getSemester(
                  a
                )
              ) -
              Number(
                getSemester(
                  b
                )
              )
            );
          }

          if (
            sortBy ===
            "courses"
          ) {
            return (
              getCourseCount(
                b
              ) -
              getCourseCount(
                a
              )
            );
          }

          return getStudentName(
            a
          ).localeCompare(
            getStudentName(
              b
            )
          );
        }
      );
    }, [
      students,
      search,
      selectedCourse,
      selectedSemester,
      selectedDivision,
      selectedBatch,
      sortBy,
    ]);

  /* ==========================================================
     GLOBAL ANALYTICS
  ========================================================== */

  const totalStudents =
    students.length;

  const visibleStudents =
    filteredStudents.length;

  const uniqueDepartments =
    useMemo(() => {
      return new Set(
        students
          .map(
            (student) =>
              getDepartment(
                student
              )
          )
          .filter(
            (value) =>
              value &&
              value !== "-"
          )
      ).size;
    }, [students]);

  const uniquePrograms =
    useMemo(() => {
      return new Set(
        students
          .map(
            (student) =>
              getProgram(
                student
              )
          )
          .filter(
            (value) =>
              value &&
              value !== "-"
          )
      ).size;
    }, [students]);

  const averageCoursesPerStudent =
    useMemo(() => {
      if (students.length === 0) {
        return 0;
      }

      const total =
        students.reduce(
          (sum, student) =>
            sum +
            getCourseCount(
              student
            ),
          0
        );

      return (
        total /
        students.length
      ).toFixed(1);
    }, [students]);

  /* ==========================================================
     SEMESTER DISTRIBUTION
  ========================================================== */

  const semesterDistribution =
    useMemo(() => {
      const map =
        new Map();

      students.forEach(
        (student) => {
          const semester =
            String(
              getSemester(
                student
              )
            );

          if (
            semester === "—"
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
          Number(a[0]) -
          Number(b[0])
      );
    }, [students]);

  const maxSemesterStudents =
    Math.max(
      ...semesterDistribution.map(
        ([, count]) =>
          count
      ),
      0
    );

  /* ==========================================================
     DIVISION DISTRIBUTION
  ========================================================== */

  const divisionDistribution =
    useMemo(() => {
      const map =
        new Map();

      students.forEach(
        (student) => {
          const division =
            String(
              student?.division ||
                "Unassigned"
            );

          map.set(
            division,
            (map.get(
              division
            ) || 0) + 1
          );
        }
      );

      return [
        ...map.entries(),
      ].sort(
        (a, b) =>
          b[1] - a[1]
      );
    }, [students]);

  /* ==========================================================
     BATCH DISTRIBUTION
  ========================================================== */

  const batchDistribution =
    useMemo(() => {
      const map =
        new Map();

      students.forEach(
        (student) => {
          const batch =
            String(
              student?.batch ||
                "Unassigned"
            );

          map.set(
            batch,
            (map.get(
              batch
            ) || 0) + 1
          );
        }
      );

      return [
        ...map.entries(),
      ].sort(
        (a, b) =>
          b[1] - a[1]
      );
    }, [students]);

  /* ==========================================================
     FILTER STATE
  ========================================================== */

  const hasFilters =
    Boolean(
      search.trim()
    ) ||
    selectedCourse !==
      "ALL" ||
    selectedSemester !==
      "ALL" ||
    selectedDivision !==
      "ALL" ||
    selectedBatch !==
      "ALL";

  const clearFilters = () => {
    setSearch("");
    setSelectedCourse("ALL");
    setSelectedSemester("ALL");
    setSelectedDivision("ALL");
    setSelectedBatch("ALL");
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

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex min-w-0 items-center gap-3">

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/faculty/dashboard"
                  )
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                title="Back to faculty dashboard"
              >
                <ArrowLeft
                  size={19}
                />
              </button>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <Users size={22} />
              </div>

              <div className="min-w-0">

                <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                  Faculty Portal
                </p>

                <h1 className="truncate text-xl font-bold md:text-2xl">
                  Students
                </h1>

                <p className="hidden text-sm text-slate-500 sm:block">
                  Students enrolled in your courses
                </p>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={() =>
                  loadStudents(
                    true
                  )
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
                  navigate(
                    "/faculty/dashboard"
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:px-4"
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

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

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
                Student data issue
              </p>

              <p className="mt-1 text-sm leading-6">
                {error}
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                loadStudents(
                  true
                )
              }
              className="shrink-0 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-bold text-red-700 hover:bg-red-200"
            >
              Retry
            </button>

          </div>
        )}

        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-indigo-600 p-6 text-white shadow-lg sm:p-8">

          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10" />

          <div className="absolute -bottom-20 right-24 h-52 w-52 rounded-full bg-white/5" />

          <div className="relative flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">

            <div className="max-w-3xl">

              <div className="mb-3 flex flex-wrap gap-2">

                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                  Student Management
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
                  {totalStudents}{" "}
                  students
                </span>

              </div>

              <h2 className="text-2xl font-bold sm:text-3xl">
                Manage your student groups
              </h2>

              <p className="mt-2 text-sm leading-6 text-indigo-100 sm:text-base">
                Search students across your assigned courses and quickly review their academic and contact information.
              </p>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              <HeroMetric
                label="Students"
                value={
                  totalStudents
                }
              />

              <HeroMetric
                label="Courses"
                value={
                  courses.length
                }
              />

              <HeroMetric
                label="Programs"
                value={
                  uniquePrograms
                }
              />

              <HeroMetric
                label="Departments"
                value={
                  uniqueDepartments
                }
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
              <Users size={21} />
            }
            title="Total Students"
            value={
              totalStudents
            }
            description="Across your courses"
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
            description="Courses you teach"
          />

          <SummaryCard
            icon={
              <Target size={21} />
            }
            title="Visible Students"
            value={
              visibleStudents
            }
            description="Current search and filters"
            type="info"
          />

          <SummaryCard
            icon={
              <Activity
                size={21}
              />
            }
            title="Avg. Courses"
            value={
              averageCoursesPerStudent
            }
            description="Per student"
            type="positive"
          />

        </section>

        {/* ====================================================
            DISTRIBUTION ANALYTICS
        ==================================================== */}

        <section className="mt-8 grid gap-6 xl:grid-cols-3">

          {/* SEMESTER */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <GraduationCap
                  size={21}
                />
              </div>

              <div>

                <h2 className="font-bold text-slate-900">
                  Semester Distribution
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Students by semester
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

                    const width =
                      maxSemesterStudents >
                      0
                        ? Math.round(
                            (count /
                              maxSemesterStudents) *
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
                            {
                              count
                            }
                          </span>

                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">

                          <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{
                              width: `${width}%`,
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

          {/* DIVISION */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <LibraryBig
                  size={21}
                />
              </div>

              <div>

                <h2 className="font-bold text-slate-900">
                  Division Distribution
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Students by division
                </p>

              </div>

            </div>

            <div className="mt-5 flex flex-wrap gap-3">

              {divisionDistribution.length ===
              0 ? (
                <p className="text-sm text-slate-500">
                  No division data available.
                </p>
              ) : (
                divisionDistribution
                  .slice(0, 8)
                  .map(
                    ([
                      division,
                      count,
                    ]) => (
                      <button
                        type="button"
                        key={
                          division
                        }
                        onClick={() =>
                          setSelectedDivision(
                            division ===
                              "Unassigned"
                              ? "ALL"
                              : division
                          )
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-purple-200 hover:bg-purple-50"
                      >

                        <p className="text-sm font-bold text-slate-800">
                          {division ===
                          "Unassigned"
                            ? "Unassigned"
                            : `Division ${division}`}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {count} student
                          {count ===
                          1
                            ? ""
                            : "s"}
                        </p>

                      </button>
                    )
                  )
              )}

            </div>

          </div>

          {/* BATCH */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Layers3
                  size={21}
                />
              </div>

              <div>

                <h2 className="font-bold text-slate-900">
                  Batch Distribution
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Students by batch
                </p>

              </div>

            </div>

            <div className="mt-5 flex flex-wrap gap-3">

              {batchDistribution.length ===
              0 ? (
                <p className="text-sm text-slate-500">
                  No batch data available.
                </p>
              ) : (
                batchDistribution
                  .slice(0, 8)
                  .map(
                    ([
                      batch,
                      count,
                    ]) => (
                      <button
                        type="button"
                        key={
                          batch
                        }
                        onClick={() =>
                          setSelectedBatch(
                            batch ===
                              "Unassigned"
                              ? "ALL"
                              : batch
                          )
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-amber-200 hover:bg-amber-50"
                      >

                        <p className="text-sm font-bold text-slate-800">
                          {batch ===
                          "Unassigned"
                            ? "Unassigned"
                            : `Batch ${batch}`}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {count} student
                          {count ===
                          1
                            ? ""
                            : "s"}
                        </p>

                      </button>
                    )
                  )
              )}

            </div>

          </div>

        </section>

        {/* ====================================================
            FILTER PANEL
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-4">

            {/* SEARCH */}

            <div className="relative">

              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search by name, student ID, email, department, batch, division..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-11 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
                >
                  <X size={16} />
                </button>
              )}

            </div>

            {/* FILTERS */}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

              <FilterField
                label="Course"
                icon={
                  <BookOpen
                    size={15}
                  />
                }
              >

                <select
                  value={
                    selectedCourse
                  }
                  onChange={(event) =>
                    setSelectedCourse(
                      event.target
                        .value
                    )
                  }
                  className="filter-input"
                >

                  <option value="ALL">
                    All Courses
                  </option>

                  {courses.map(
                    (course) => (
                      <option
                        key={
                          course.id
                        }
                        value={
                          course.id
                        }
                      >
                        {course.code ||
                          course.courseCode ||
                          "COURSE"}{" "}
                        -{" "}
                        {course.name ||
                          course.title ||
                          "Course"}
                      </option>
                    )
                  )}

                </select>

              </FilterField>

              <FilterField
                label="Semester"
                icon={
                  <GraduationCap
                    size={15}
                  />
                }
              >

                <select
                  value={
                    selectedSemester
                  }
                  onChange={(event) =>
                    setSelectedSemester(
                      event.target
                        .value
                    )
                  }
                  className="filter-input"
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
                        {
                          semester
                        }
                      </option>
                    )
                  )}

                </select>

              </FilterField>

              <FilterField
                label="Division"
                icon={
                  <LibraryBig
                    size={15}
                  />
                }
              >

                <select
                  value={
                    selectedDivision
                  }
                  onChange={(event) =>
                    setSelectedDivision(
                      event.target
                        .value
                    )
                  }
                  className="filter-input"
                >

                  <option value="ALL">
                    All Divisions
                  </option>

                  {divisionOptions.map(
                    (division) => (
                      <option
                        key={
                          division
                        }
                        value={
                          division
                        }
                      >
                        Division{" "}
                        {
                          division
                        }
                      </option>
                    )
                  )}

                </select>

              </FilterField>

              <FilterField
                label="Batch"
                icon={
                  <Layers3
                    size={15}
                  />
                }
              >

                <select
                  value={
                    selectedBatch
                  }
                  onChange={(event) =>
                    setSelectedBatch(
                      event.target
                        .value
                    )
                  }
                  className="filter-input"
                >

                  <option value="ALL">
                    All Batches
                  </option>

                  {batchOptions.map(
                    (batch) => (
                      <option
                        key={batch}
                        value={batch}
                      >
                        Batch{" "}
                        {batch}
                      </option>
                    )
                  )}

                </select>

              </FilterField>

              <FilterField
                label="Sort"
                icon={
                  <SlidersHorizontal
                    size={15}
                  />
                }
              >

                <select
                  value={
                    sortBy
                  }
                  onChange={(event) =>
                    setSortBy(
                      event.target
                        .value
                    )
                  }
                  className="filter-input"
                >

                  <option value="name">
                    Student Name
                  </option>

                  <option value="studentId">
                    Student ID
                  </option>

                  <option value="semester">
                    Semester
                  </option>

                  <option value="courses">
                    Course Count
                  </option>

                </select>

              </FilterField>

            </div>

            {/* FILTER STATUS */}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">

                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 font-semibold">

                  <Filter size={13} />

                  Showing{" "}
                  <span className="text-slate-800">
                    {
                      visibleStudents
                    }
                  </span>{" "}
                  of{" "}
                  <span className="text-slate-800">
                    {
                      totalStudents
                    }
                  </span>

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
                  <List
                    size={17}
                  />
                </button>

              </div>

            </div>

          </div>

        </section>

        {/* ====================================================
            STUDENTS
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
                <StudentSkeleton
                  key={item}
                />
              )
            )}

          </section>
        ) : filteredStudents.length ===
          0 ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

              <Users size={30} />

            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-800">
              No students found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {hasFilters
                ? "No students match your current search and filters."
                : "No students are currently assigned to your courses."}
            </p>

            {hasFilters && (
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
            )}

          </section>
        ) : viewMode ===
          "grid" ? (
          <section className="mt-8 grid gap-5 lg:grid-cols-2">

            {filteredStudents.map(
              (student) => (
                <StudentCard
                  key={
                    student.id
                  }
                  student={
                    student
                  }
                />
              )
            )}

          </section>
        ) : (
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="hidden grid-cols-[1.8fr_1fr_1fr_1fr_1.2fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-400 lg:grid">

              <span>
                Student
              </span>

              <span>
                Semester
              </span>

              <span>
                Batch
              </span>

              <span>
                Division
              </span>

              <span>
                Courses
              </span>

              <span>
                Contact
              </span>

            </div>

            <div className="divide-y divide-slate-100">

              {filteredStudents.map(
                (student) => {

                  const name =
                    getStudentName(
                      student
                    );

                  const studentCourses =
                    Array.isArray(
                      student?.courses
                    )
                      ? student.courses
                      : [];

                  return (
                    <div
                      key={
                        student.id
                      }
                      className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 lg:grid-cols-[1.8fr_1fr_1fr_1fr_1.2fr_auto] lg:items-center"
                    >

                      <div className="flex min-w-0 items-center gap-3">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-600">
                          {getInitials(
                            name
                          )}
                        </div>

                        <div className="min-w-0">

                          <p className="truncate font-bold text-slate-800">
                            {name}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {
                              getStudentId(
                                student
                              )
                            }
                          </p>

                        </div>

                      </div>

                      <div>

                        <p className="text-xs text-slate-400 lg:hidden">
                          Semester
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700 lg:mt-0">
                          {
                            getSemester(
                              student
                            )
                          }
                        </p>

                      </div>

                      <div>

                        <p className="text-xs text-slate-400 lg:hidden">
                          Batch
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700 lg:mt-0">
                          {
                            getBatch(
                              student
                            )
                          }
                        </p>

                      </div>

                      <div>

                        <p className="text-xs text-slate-400 lg:hidden">
                          Division
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700 lg:mt-0">
                          {
                            getDivision(
                              student
                            )
                          }
                        </p>

                      </div>

                      <div>

                        <p className="text-xs text-slate-400 lg:hidden">
                          Courses
                        </p>

                        <div className="mt-1 flex flex-wrap gap-1 lg:mt-0">

                          {studentCourses
                            .slice(
                              0,
                              3
                            )
                            .map(
                              (
                                course
                              ) => (
                                <span
                                  key={
                                    course?.id
                                  }
                                  className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700"
                                >
                                  {course?.code ||
                                    course?.name ||
                                    "Course"}
                                </span>
                              )
                            )}

                          {studentCourses.length >
                            3 && (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                              +
                              {studentCourses.length -
                                3}
                            </span>
                          )}

                        </div>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleEmail(
                            student
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
                      >

                        <Mail
                          size={15}
                        />

                        Contact

                      </button>

                    </div>
                  );
                }
              )}

            </div>

          </section>
        )}

        {/* ====================================================
            FOOTER INSIGHTS
        ==================================================== */}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">

          <FooterInsight
            icon={
              <GraduationCap
                size={20}
              />
            }
            label="Academic Levels"
            value={
              semesterDistribution.length
            }
            description="Different semesters represented"
          />

          <FooterInsight
            icon={
              <LibraryBig size={20} />
            }
            label="Divisions"
            value={
              divisionDistribution.length
            }
            description="Different divisions represented"
          />

          <FooterInsight
            icon={
              <Layers3 size={20} />
            }
            label="Batches"
            value={
              batchDistribution.length
            }
            description="Different batches represented"
          />

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
    info:
      "bg-blue-50 text-blue-600",
    positive:
      "bg-green-50 text-green-600",
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
   HERO METRIC
============================================================ */

function HeroMetric({
  label,
  value,
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
   FILTER FIELD
============================================================ */

function FilterField({
  label,
  icon,
  children,
}) {
  return (
    <div>

      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500">

        {icon}

        {label}

      </div>

      {children}

    </div>
  );
}

/* ============================================================
   STUDENT CARD
============================================================ */

function StudentCard({
  student,
}) {
  const name =
    getStudentName(
      student
    );

  const studentCourses =
    Array.isArray(
      student?.courses
    )
      ? student.courses
      : [];

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg">

      {/* TOP */}

      <div className="bg-indigo-600 p-5 text-white">

        <div className="flex items-start gap-4">

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold">
            {getInitials(
              name
            )}
          </div>

          <div className="min-w-0 flex-1">

            <h3 className="truncate text-lg font-bold">
              {name}
            </h3>

            <p className="mt-1 text-xs font-semibold text-indigo-200">
              {
                getStudentId(
                  student
                )
              }
            </p>

            <div className="mt-3 flex flex-wrap gap-2">

              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold">
                Semester{" "}
                {
                  getSemester(
                    student
                  )
                }
              </span>

              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold">
                {
                  getBatch(
                    student
                  )
                }
              </span>

              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold">
                Division{" "}
                {
                  getDivision(
                    student
                  )
                }
              </span>

            </div>

          </div>

        </div>

      </div>

      {/* CONTENT */}

      <div className="p-5">

        <div className="grid gap-3 sm:grid-cols-2">

          <DetailItem
            icon={
              <Mail size={16} />
            }
            label="Email"
            value={
              getEmail(
                student
              )
            }
          />

          <DetailItem
            icon={
              <Phone size={16} />
            }
            label="Phone"
            value={
              getPhone(
                student
              )
            }
          />

          <DetailItem
            icon={
              <Building2
                size={16}
              />
            }
            label="Department"
            value={
              getDepartment(
                student
              )
            }
          />

          <DetailItem
            icon={
              <GraduationCap
                size={16}
              />
            }
            label="Program"
            value={
              getProgram(
                student
              )
            }
          />

          <DetailItem
            icon={
              <CalendarDays
                size={16}
              />
            }
            label="Admission Year"
            value={
              student?.admissionYear ??
              "-"
            }
          />

          <DetailItem
            icon={
              <BookOpen
                size={16}
              />
            }
            label="Course Count"
            value={
              studentCourses.length
            }
          />

        </div>

        {/* COURSES */}

        <div className="mt-5 border-t border-slate-100 pt-5">

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <BookOpen
                size={17}
                className="text-indigo-600"
              />

              <p className="text-sm font-bold text-slate-700">
                Enrolled Courses
              </p>

            </div>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
              {studentCourses.length}
            </span>

          </div>

          {studentCourses.length >
          0 ? (
            <div className="mt-3 flex flex-wrap gap-2">

              {studentCourses
                .map(
                  (course) => (
                    <span
                      key={
                        course?.id
                      }
                      className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700"
                    >
                      {course?.code ||
                        course?.name ||
                        "Course"}
                    </span>
                  )
                )}

            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              No course details available.
            </p>
          )}

        </div>

        {/* ACTION */}

        <button
          type="button"
          onClick={() =>
            handleEmail(
              student
            )
          }
          disabled={
            getEmail(
              student
            ) === "-"
          }
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >

          <Mail size={16} />

          Contact Student

          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-1"
          />

        </button>

      </div>

    </article>
  );
}

/* ============================================================
   DETAIL ITEM
============================================================ */

function DetailItem({
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

      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   FOOTER INSIGHT
============================================================ */

function FooterInsight({
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

        <div>

          <p className="text-xs font-semibold text-slate-400">
            {label}
          </p>

          <p className="text-xl font-bold text-slate-800">
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

/* ============================================================
   SKELETON
============================================================ */

function StudentSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="h-36 bg-slate-200" />

      <div className="space-y-4 p-5">

        <div className="h-5 w-3/4 rounded bg-slate-200" />

        <div className="h-4 w-1/2 rounded bg-slate-200" />

        <div className="grid grid-cols-2 gap-3">

          <div className="h-16 rounded-xl bg-slate-100" />

          <div className="h-16 rounded-xl bg-slate-100" />

          <div className="h-16 rounded-xl bg-slate-100" />

          <div className="h-16 rounded-xl bg-slate-100" />

        </div>

        <div className="h-11 rounded-xl bg-slate-200" />

      </div>

    </div>
  );
}

/* ============================================================
   EMAIL ACTION
============================================================ */

function handleEmail(student) {
  const email =
    getEmail(student);

  if (
    email &&
    email !== "-"
  ) {
    window.location.href =
      `mailto:${email}`;
  }
}

export default FacultyStudents;