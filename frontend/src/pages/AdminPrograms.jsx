import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Eye,
  Filter,
  GraduationCap,
  Layers3,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  School,
  SortAsc,
  Users,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  apiGet,
  apiPost,
} from "../api";

/* ============================================================
   HELPERS
============================================================ */

function formatCount(value) {
  return Number(
    value || 0
  ).toLocaleString("en-IN");
}

function handleAuthError(
  error,
  navigate
) {
  const message = String(
    error?.message || ""
  ).toLowerCase();

  if (
    message.includes("401") ||
    message.includes(
      "unauthorized"
    ) ||
    message.includes(
      "authentication"
    ) ||
    message.includes(
      "token"
    )
  ) {
    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "user"
    );

    navigate("/");

    return true;
  }

  return false;
}

function getProgramCounts(
  program
) {
  return {
    students: Number(
      program?.counts
        ?.students ??
        program?._count
          ?.students ??
        (
          Array.isArray(
            program?.students
          )
            ? program.students
                .length
            : 0
        )
    ),

    courses: Number(
      program?.counts
        ?.courses ??
        program?._count
          ?.courses ??
        (
          Array.isArray(
            program?.courses
          )
            ? program.courses
                .length
            : 0
        )
    ),
  };
}

function normalizeProgram(
  program
) {
  if (
    !program
  ) {
    return null;
  }

  const counts =
    getProgramCounts(
      program
    );

  return {
    ...program,

    students:
      Array.isArray(
        program.students
      )
        ? program.students
        : [],

    courses:
      Array.isArray(
        program.courses
      )
        ? program.courses
        : [],

    counts,
  };
}

function normalizePrograms(
  programs
) {
  if (
    !Array.isArray(
      programs
    )
  ) {
    return [];
  }

  return programs
    .map(
      normalizeProgram
    )
    .filter(Boolean);
}

function getProgramInitials(
  program
) {
  const name =
    program?.name ||
    "Program";

  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length ===
    0
  ) {
    return "P";
  }

  if (
    parts.length ===
    1
  ) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return `${parts[0].charAt(
    0
  )}${parts[
    parts.length - 1
  ].charAt(
    0
  )}`.toUpperCase();
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

function AdminPrograms() {
  const navigate =
    useNavigate();

  const [
    programs,
    setPrograms,
  ] = useState([]);

  const [
    departments,
    setDepartments,
  ] = useState([]);

  const [
    selectedProgram,
    setSelectedProgram,
  ] = useState(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    appliedSearch,
    setAppliedSearch,
  ] = useState("");

  const [
    departmentId,
    setDepartmentId,
  ] = useState("");

  const [
    viewMode,
    setViewMode,
  ] = useState("grid");

  const [
    sortBy,
    setSortBy,
  ] = useState("name");

  const [
    sortDirection,
    setSortDirection,
  ] = useState("asc");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    detailsLoading,
    setDetailsLoading,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "",
    code: "",
    durationYears: "",
    departmentId: "",
  });

  const [
    error,
    setError,
  ] = useState("");

  const handleCreateProgram = async (event) => {
    event.preventDefault();

    const name = createForm.name.trim();
    const code = createForm.code.trim().toUpperCase();
    const durationYears = Number(createForm.durationYears);
    const parsedDepartmentId = Number(createForm.departmentId);

    if (!name || !code || !createForm.durationYears || !parsedDepartmentId) {
      setCreateError("Please fill all required fields.");
      return;
    }

    if (!Number.isFinite(durationYears) || durationYears <= 0) {
      setCreateError("Duration must be greater than 0.");
      return;
    }

    try {
      setCreateLoading(true);
      setCreateError("");
      setSuccessMessage("");

      await apiPost("/admin/programs", {
        name,
        code,
        durationYears,
        departmentId: parsedDepartmentId,
      });

      setCreateForm({
        name: "",
        code: "",
        durationYears: "",
        departmentId: "",
      });
      setShowCreateModal(false);
      setSuccessMessage("Program created successfully.");
      await fetchPrograms(true);
    } catch (createProgramError) {
      console.error("Create program error:", createProgramError);
      if (!handleAuthError(createProgramError, navigate)) {
        setCreateError(createProgramError?.message || "Failed to create program.");
      }
    } finally {
      setCreateLoading(false);
    }
  };

  /* ==========================================================
     FETCH PROGRAMS
  ========================================================== */

  const fetchPrograms =
    useCallback(
      async (
        showRefresh = false,
        overrideSearch
      ) => {
        try {
          if (
            showRefresh
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError("");

          const token =
            localStorage.getItem(
              "token"
            );

          if (!token) {
            navigate("/");
            return;
          }

          const params =
            new URLSearchParams();

          const effectiveSearch =
            overrideSearch !==
            undefined
              ? overrideSearch
              : appliedSearch;

          if (
            effectiveSearch.trim()
          ) {
            params.set(
              "search",
              effectiveSearch.trim()
            );
          }

          if (
            departmentId
          ) {
            params.set(
              "departmentId",
              departmentId
            );
          }

          const query =
            params.toString();

          const endpoint =
            `/admin/programs${
              query
                ? `?${query}`
                : ""
            }`;

          const data =
            await apiGet(
              endpoint
            );

          const rawPrograms =
            Array.isArray(
              data?.programs
            )
              ? data.programs
              : Array.isArray(
                  data?.data
                )
              ? data.data
              : Array.isArray(
                  data?.data
                    ?.programs
                )
              ? data.data
                  .programs
              : [];

          setPrograms(
            normalizePrograms(
              rawPrograms
            )
          );
        } catch (
          err
        ) {
          console.error(
            "Admin programs error:",
            err
          );

          if (
            handleAuthError(
              err,
              navigate
            )
          ) {
            return;
          }

          setError(
            err?.message ||
              "Failed to load programs."
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
        appliedSearch,
        departmentId,
        navigate,
      ]
    );

  /* ==========================================================
     FETCH DEPARTMENTS
  ========================================================== */

  const fetchDepartments =
    useCallback(
      async () => {
        try {
          const token =
            localStorage.getItem(
              "token"
            );

          if (!token) {
            return;
          }

          const data =
            await apiGet(
              "/admin/departments"
            );

          const rawDepartments =
            Array.isArray(
              data?.data
            )
              ? data.data
              : Array.isArray(
                  data?.departments
                )
              ? data.departments
              : Array.isArray(
                  data?.data
                    ?.departments
                )
              ? data.data
                  .departments
              : [];

          setDepartments(
            rawDepartments
          );
        } catch (
          err
        ) {
          console.error(
            "Departments fetch error:",
            err
          );

          handleAuthError(
            err,
            navigate
          );
        }
      },
      [navigate]
    );

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    let mounted =
      true;

    const load =
      async () => {
        try {
          setLoading(
            true
          );

          setError("");

          const token =
            localStorage.getItem(
              "token"
            );

          if (!token) {
            navigate("/");
            return;
          }

          const [
            departmentResponse,
            programResponse,
          ] =
            await Promise.all(
              [
                apiGet(
                  "/admin/departments"
                ),
                apiGet(
                  "/admin/programs"
                ),
              ]
            );

          if (
            !mounted
          ) {
            return;
          }

          const rawDepartments =
            Array.isArray(
              departmentResponse?.data
            )
              ? departmentResponse.data
              : Array.isArray(
                  departmentResponse
                    ?.departments
                )
              ? departmentResponse.departments
              : Array.isArray(
                  departmentResponse
                    ?.data
                    ?.departments
                )
              ? departmentResponse
                  .data
                  .departments
              : [];

          const rawPrograms =
            Array.isArray(
              programResponse?.programs
            )
              ? programResponse.programs
              : Array.isArray(
                  programResponse?.data
                )
              ? programResponse.data
              : Array.isArray(
                  programResponse
                    ?.data
                    ?.programs
                )
              ? programResponse
                  .data
                  .programs
              : [];

          setDepartments(
            rawDepartments
          );

          /*
           * Enrich each program so the list shows
           * reliable student/course counts.
           */
          const enrichedPrograms =
            await Promise.all(
              rawPrograms.map(
                async (
                  program
                ) => {
                  try {
                    const detailData =
                      await apiGet(
                        `/admin/programs/${program.id}`
                      );

                    const detailedProgram =
                      detailData?.program ||
                      detailData?.data ||
                      detailData
                        ?.data
                        ?.program ||
                      null;

                    return normalizeProgram(
                      detailedProgram
                        ? {
                            ...program,
                            ...detailedProgram,
                          }
                        : program
                    );
                  } catch (
                    detailError
                  ) {
                    console.warn(
                      `Unable to enrich program ${program.id}:`,
                      detailError
                    );

                    return normalizeProgram(
                      program
                    );
                  }
                }
              )
            );

          if (
            mounted
          ) {
            setPrograms(
              enrichedPrograms.filter(
                Boolean
              )
            );
          }
        } catch (
          err
        ) {
          console.error(
            "Admin programs initial load error:",
            err
          );

          if (
            mounted
          ) {
            if (
              handleAuthError(
                err,
                navigate
              )
            ) {
              return;
            }

            setError(
              err?.message ||
                "Failed to load programs."
            );
          }
        } finally {
          if (
            mounted
          ) {
            setLoading(
              false
            );
          }
        }
      };

    load();

    return () => {
      mounted =
        false;
    };
  }, [
    navigate,
  ]);

  /* ==========================================================
     SEARCH
  ========================================================== */

  const handleSearch = (
    event
  ) => {
    event.preventDefault();

    const value =
      search.trim();

    setAppliedSearch(
      value
    );

    fetchPrograms(
      false,
      value
    );
  };

  /* ==========================================================
     CLEAR FILTERS
  ========================================================== */

  const clearFilters = () => {
    setSearch("");
    setAppliedSearch("");
    setDepartmentId("");
    setSortBy("name");
    setSortDirection("asc");

    fetchPrograms(
      true,
      ""
    );
  };

  /* ==========================================================
     OPEN PROGRAM DETAILS
  ========================================================== */

  const openProgramDetails =
    async (
      programId
    ) => {
      try {
        setDetailsLoading(
          true
        );

        setError("");

        setSelectedProgram(
          null
        );

        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          navigate("/");
          return;
        }

        const data =
          await apiGet(
            `/admin/programs/${programId}`
          );

        const rawProgram =
          data?.program ||
          data?.data ||
          data?.data
            ?.program ||
          null;

        setSelectedProgram(
          normalizeProgram(
            rawProgram
          )
        );
      } catch (
        err
      ) {
        console.error(
          "Program details error:",
          err
        );

        if (
          handleAuthError(
            err,
            navigate
          )
        ) {
          return;
        }

        setError(
          err?.message ||
            "Failed to fetch program details."
        );
      } finally {
        setDetailsLoading(
          false
        );
      }
    };

  /* ==========================================================
     PROCESSED PROGRAMS
  ========================================================== */

  const processedPrograms =
    useMemo(() => {
      let result =
        [...programs];

      const term =
        search
          .trim()
          .toLowerCase();

      if (
        term
      ) {
        result =
          result.filter(
            (
              program
            ) => {
              const searchable =
                [
                  program?.name,
                  program?.code,
                  program
                    ?.department
                    ?.name,
                  program
                    ?.department
                    ?.code,
                ]
                  .join(" ")
                  .toLowerCase();

              return searchable.includes(
                term
              );
            }
          );
      }

      result.sort(
        (
          a,
          b
        ) => {
          const aCounts =
            getProgramCounts(
              a
            );

          const bCounts =
            getProgramCounts(
              b
            );

          let comparison =
            0;

          if (
            sortBy ===
            "students"
          ) {
            comparison =
              aCounts.students -
              bCounts.students;
          } else if (
            sortBy ===
            "courses"
          ) {
            comparison =
              aCounts.courses -
              bCounts.courses;
          } else if (
            sortBy ===
            "duration"
          ) {
            comparison =
              Number(
                a?.durationYears ||
                  0
              ) -
              Number(
                b?.durationYears ||
                  0
              );
          } else if (
            sortBy ===
            "department"
          ) {
            comparison =
              String(
                a?.department
                  ?.name ||
                  ""
              ).localeCompare(
                String(
                  b?.department
                    ?.name ||
                    ""
                )
              );
          } else if (
            sortBy ===
            "code"
          ) {
            comparison =
              String(
                a?.code ||
                  ""
              ).localeCompare(
                String(
                  b?.code ||
                    ""
                )
              );
          } else {
            comparison =
              String(
                a?.name ||
                  ""
              ).localeCompare(
                String(
                  b?.name ||
                    ""
                )
              );
          }

          return sortDirection ===
            "asc"
            ? comparison
            : -comparison;
        }
      );

      return result;
    }, [
      programs,
      search,
      sortBy,
      sortDirection,
    ]);

  /* ==========================================================
     TOTALS
  ========================================================== */

  const totals =
    useMemo(() => {
      return programs.reduce(
        (
          result,
          program
        ) => {
          const counts =
            getProgramCounts(
              program
            );

          result.students +=
            counts.students;

          result.courses +=
            counts.courses;

          return result;
        },
        {
          students: 0,
          courses: 0,
        }
      );
    }, [
      programs,
    ]);

  const totalPrograms =
    programs.length;

  const departmentCoverage =
    new Set(
      programs
        .map(
          (
            program
          ) =>
            program?.department
              ?.id ||
            program?.departmentId
        )
        .filter(
          Boolean
        )
    ).size;

  const averageStudents =
    totalPrograms >
    0
      ? (
          totals.students /
          totalPrograms
        ).toFixed(1)
      : "0.0";

  const averageCourses =
    totalPrograms >
    0
      ? (
          totals.courses /
          totalPrograms
        ).toFixed(1)
      : "0.0";

  const totalProgramDuration =
    programs.reduce(
      (
        total,
        program
      ) =>
        total +
        Number(
          program?.durationYears ||
            0
        ),
      0
    );

  const averageDuration =
    totalPrograms >
    0
      ? (
          totalProgramDuration /
          totalPrograms
        ).toFixed(1)
      : "0.0";

  const largestProgram =
    programs.length >
    0
      ? programs.reduce(
          (
            largest,
            program
          ) =>
            getProgramCounts(
              program
            ).students >
            getProgramCounts(
              largest
            ).students
              ? program
              : largest,
          programs[0]
        )
      : null;

  const largestCourseProgram =
    programs.length >
    0
      ? programs.reduce(
          (
            largest,
            program
          ) =>
            getProgramCounts(
              program
            ).courses >
            getProgramCounts(
              largest
            ).courses
              ? program
              : largest,
          programs[0]
        )
      : null;

  const hasFilters =
    Boolean(
      search.trim()
    ) ||
    Boolean(
      departmentId
    );

  /* ==========================================================
     RETURN
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
                  "/admin/dashboard"
                )
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              title="Back to dashboard"
            >
              <ArrowLeft
                size={19}
              />
            </button>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">

              <GraduationCap
                size={23}
              />

            </div>

            <div className="min-w-0">

              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Campus360 Administration
              </p>

              <h1 className="truncate text-xl font-bold text-slate-800">
                Program Management
              </h1>

              <p className="hidden text-xs text-slate-500 sm:block">
                Manage academic programs and enrollment structure.
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() => {
                setCreateError("");
                setSuccessMessage("");
                setCreateForm({
                  name: "",
                  code: "",
                  durationYears: "",
                  departmentId: departmentId || "",
                });
                setShowCreateModal(true);
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 sm:px-4"
            >
              <span className="text-lg leading-none">+</span>
              <span className="hidden sm:inline">Add Program</span>
              <span className="sm:hidden">Add</span>
            </button>

            <button
            type="button"
            onClick={() =>
              fetchPrograms(
                true
              )
            }
            disabled={
              refreshing
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
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

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {successMessage && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-sm">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={18} className="text-green-600" />
              {successMessage}
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              className="rounded-lg p-1 text-green-700 hover:bg-green-100"
              aria-label="Close success message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-blue-600 p-6 text-white shadow-lg sm:p-8">

          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10" />

          <div className="absolute -bottom-28 right-20 h-64 w-64 rounded-full bg-white/5" />

          <div className="relative grid gap-7 xl:grid-cols-[1fr_auto] xl:items-center">

            <div>

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                  Academic Programs
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-blue-100">
                  {totalPrograms} Programs
                </span>

              </div>

              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                Academic programs at a glance
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
                Review programs, their departments, enrolled students, associated courses and program duration from one centralized administration workspace.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">

                <HeroTag
                  icon={
                    <Building2
                      size={14}
                    />
                  }
                  text={`${departmentCoverage} departments represented`}
                />

                <HeroTag
                  icon={
                    <Users
                      size={14}
                    />
                  }
                  text={`${totals.students} students`}
                />

                <HeroTag
                  icon={
                    <BookOpen
                      size={14}
                    />
                  }
                  text={`${totals.courses} courses`}
                />

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              <HeroMetric
                value={
                  totalPrograms
                }
                label="Programs"
              />

              <HeroMetric
                value={
                  departmentCoverage
                }
                label="Departments"
              />

              <HeroMetric
                value={
                  totals.students
                }
                label="Students"
              />

              <HeroMetric
                value={
                  totals.courses
                }
                label="Courses"
              />

            </div>

          </div>

        </section>

        {/* ====================================================
            MESSAGES
        ==================================================== */}

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">

            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">

              <p className="font-bold">
                Program management error
              </p>

              <p className="mt-1 text-sm leading-6">
                {error}
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="text-red-500 hover:text-red-700"
            >
              <X size={17} />
            </button>

          </div>
        )}

        {/* ====================================================
            KPI CARDS
        ==================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <KpiCard
            icon={
              <GraduationCap
                size={21}
              />
            }
            label="Total Programs"
            value={
              totalPrograms
            }
            description="Academic programs"
            tone="blue"
          />

          <KpiCard
            icon={
              <Users size={21} />
            }
            label="Students"
            value={
              totals.students
            }
            description={`Average ${averageStudents} students per program`}
            tone="green"
          />

          <KpiCard
            icon={
              <BookOpen
                size={21}
              />
            }
            label="Courses"
            value={
              totals.courses
            }
            description={`Average ${averageCourses} courses per program`}
            tone="purple"
          />

          <KpiCard
            icon={
              <Building2
                size={21}
              />
            }
            label="Departments"
            value={
              departmentCoverage
            }
            description={`Average duration ${averageDuration} years`}
            tone="amber"
          />

        </section>

        {/* ====================================================
            ANALYTICS
        ==================================================== */}

        <section className="mt-8 grid gap-6 lg:grid-cols-3">

          <AnalyticsPanel
            title="Program Structure"
            icon={
              <Layers3
                size={20}
              />
            }
            iconClass="bg-blue-50 text-blue-600"
          >

            <div className="grid grid-cols-2 gap-3">

              <MetricBox
                label="Programs"
                value={
                  totalPrograms
                }
              />

              <MetricBox
                label="Departments"
                value={
                  departmentCoverage
                }
              />

              <MetricBox
                label="Avg Duration"
                value={`${averageDuration} yrs`}
              />

              <MetricBox
                label="Courses"
                value={
                  totals.courses
                }
              />

            </div>

          </AnalyticsPanel>

          <AnalyticsPanel
            title="Largest Student Program"
            icon={
              <Users
                size={20}
              />
            }
            iconClass="bg-green-50 text-green-600"
          >

            {largestProgram ? (
              <>
                <p className="text-3xl font-bold text-slate-800">
                  {
                    formatCount(
                      getProgramCounts(
                        largestProgram
                      ).students
                    )
                  }
                </p>

                <p className="mt-1 font-bold text-slate-700">
                  {
                    largestProgram.name
                  }
                </p>

                <div className="mt-4 flex flex-wrap gap-2">

                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                    {
                      largestProgram.code ||
                      "No code"
                    }
                  </span>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                    {
                      largestProgram
                        .department
                        ?.name ||
                      "No department"
                    }
                  </span>

                </div>
              </>
            ) : (
              <EmptyText text="No program data available." />
            )}

          </AnalyticsPanel>

          <AnalyticsPanel
            title="Largest Course Offering"
            icon={
              <BookOpen
                size={20}
              />
            }
            iconClass="bg-purple-50 text-purple-600"
          >

            {largestCourseProgram ? (
              <>
                <p className="text-3xl font-bold text-slate-800">
                  {
                    formatCount(
                      getProgramCounts(
                        largestCourseProgram
                      ).courses
                    )
                  }
                </p>

                <p className="mt-1 font-bold text-slate-700">
                  {
                    largestCourseProgram.name
                  }
                </p>

                <div className="mt-4 rounded-xl bg-purple-50 p-3">

                  <p className="text-xs text-purple-700">
                    Department
                  </p>

                  <p className="mt-1 text-sm font-bold text-purple-900">
                    {
                      largestCourseProgram
                        .department
                        ?.name ||
                      "Not assigned"
                    }
                  </p>

                </div>
              </>
            ) : (
              <EmptyText text="No course data available." />
            )}

          </AnalyticsPanel>

        </section>

        {/* ====================================================
            SEARCH & FILTERS
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                <Filter
                  size={21}
                />

              </div>

              <div>

                <h2 className="text-lg font-bold text-slate-800">
                  Search & Filters
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Find programs by name, code or department.
                </p>

              </div>

            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="inline-flex items-center gap-2 self-start rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >

                <X size={14} />

                Clear all

              </button>
            )}

          </div>

          <form
            onSubmit={
              handleSearch
            }
            className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4"
          >

            <div className="relative lg:col-span-2">

              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search program name or code..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={15} />
                </button>
              )}

            </div>

            <select
              value={
                departmentId
              }
              onChange={(
                event
              ) =>
                setDepartmentId(
                  event.target
                    .value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >

              <option value="">
                All Departments
              </option>

              {departments.map(
                (
                  department
                ) => (
                  <option
                    key={
                      department.id
                    }
                    value={
                      department.id
                    }
                  >
                    {
                      department.code
                        ? `${department.code} — ${department.name}`
                        : department.name
                    }
                  </option>
                )
              )}

            </select>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >

              <Search
                size={17}
              />

              Search

            </button>

            <div className="flex gap-2 md:col-span-2 lg:col-span-4">

              <div className="flex flex-1 gap-2">

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
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                >

                  <option value="name">
                    Sort by Name
                  </option>

                  <option value="code">
                    Sort by Code
                  </option>

                  <option value="department">
                    Sort by Department
                  </option>

                  <option value="students">
                    Sort by Students
                  </option>

                  <option value="courses">
                    Sort by Courses
                  </option>

                  <option value="duration">
                    Sort by Duration
                  </option>

                </select>

                <button
                  type="button"
                  onClick={() =>
                    setSortDirection(
                      (
                        current
                      ) =>
                        current ===
                        "asc"
                          ? "desc"
                          : "asc"
                    )
                  }
                  className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50"
                  title="Toggle sort direction"
                >

                  <ArrowRight
                    size={18}
                    className={
                      sortDirection ===
                      "desc"
                        ? "rotate-180"
                        : ""
                    }
                  />

                </button>

              </div>

            </div>

          </form>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs text-slate-500">

              Showing{" "}
              <span className="font-bold text-slate-700">
                {
                  processedPrograms.length
                }
              </span>
              {" "}
              of{" "}
              <span className="font-bold text-slate-700">
                {
                  programs.length
                }
              </span>
              {" "}
              programs

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
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${
                  viewMode ===
                  "grid"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >

                <LayoutGrid
                  size={14}
                />

                Grid

              </button>

              <button
                type="button"
                onClick={() =>
                  setViewMode(
                    "list"
                  )
                }
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${
                  viewMode ===
                  "list"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >

                <List
                  size={14}
                />

                List

              </button>

            </div>

          </div>

        </section>

        {/* ====================================================
            PROGRAM RECORDS
        ==================================================== */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <GraduationCap
                    size={21}
                    className="text-blue-600"
                  />

                  <h2 className="text-lg font-bold text-slate-800">
                    Program Records
                  </h2>

                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Browse academic programs and enrollment structure.
                </p>

              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                {
                  processedPrograms.length
                } displayed
              </span>

            </div>

          </div>

          {loading ? (
            <ProgramSkeletonGrid />
          ) : processedPrograms.length ===
            0 ? (
            <EmptyState
              hasFilters={
                hasFilters
              }
              onClear={
                clearFilters
              }
            />
          ) : viewMode ===
            "grid" ? (
            <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">

              {processedPrograms.map(
                (
                  program
                ) => (
                  <ProgramCard
                    key={
                      program.id
                    }
                    program={
                      program
                    }
                    onView={
                      openProgramDetails
                    }
                  />
                )
              )}

            </div>
          ) : (
            <ProgramList
              programs={
                processedPrograms
              }
              onView={
                openProgramDetails
              }
            />
          )}

        </section>

      </main>

      {/* ======================================================
          DETAILS MODAL
      ====================================================== */}

      {selectedProgram && (
        <ProgramDetailsModal
          program={
            selectedProgram
          }
          loading={
            detailsLoading
          }
          onClose={() =>
            setSelectedProgram(
              null
            )
          }
        />
      )}

      {showCreateModal && (
        <CreateProgramModal
          form={createForm}
          departments={departments}
          loading={createLoading}
          error={createError}
          onClose={() => {
            if (!createLoading) {
              setShowCreateModal(false);
              setCreateError("");
            }
          }}
          onChange={(field, value) =>
            setCreateForm((current) => ({
              ...current,
              [field]: value,
            }))
          }
          onSubmit={handleCreateProgram}
        />
      )}

    </div>
  );
}

/* ============================================================
   HERO TAG
============================================================ */

function HeroTag({
  icon,
  text,
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100">
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

      <p className="mt-1 text-[10px] font-semibold text-blue-100">
        {label}
      </p>

    </div>
  );
}

/* ============================================================
   KPI CARD
============================================================ */

function KpiCard({
  icon,
  label,
  value,
  description,
  tone,
}) {
  const styles = {
    blue:
      "bg-blue-50 text-blue-600",
    green:
      "bg-green-50 text-green-600",
    purple:
      "bg-purple-50 text-purple-600",
    amber:
      "bg-amber-50 text-amber-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          styles[tone] ||
          styles.blue
        }`}
      >
        {icon}
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-3xl font-bold text-slate-800">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>

    </div>
  );
}

/* ============================================================
   ANALYTICS PANEL
============================================================ */

function AnalyticsPanel({
  title,
  icon,
  iconClass,
  children,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center gap-3">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <h3 className="font-bold text-slate-800">
          {title}
        </h3>

      </div>

      <div className="mt-5">
        {children}
      </div>

    </div>
  );
}

/* ============================================================
   METRIC BOX
============================================================ */

function MetricBox({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 text-center">

      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-800">
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   PROGRAM CARD
============================================================ */

function ProgramCard({
  program,
  onView,
}) {
  const counts =
    getProgramCounts(
      program
    );

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">

      <div className="flex items-start gap-3">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-600">

          {
            getProgramInitials(
              program
            )
          }

        </div>

        <div className="min-w-0 flex-1">

          <div className="flex items-start justify-between gap-2">

            <h3 className="truncate font-bold text-slate-800">
              {
                program.name ||
                "Unnamed Program"
              }
            </h3>

            <ChevronRight
              size={17}
              className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500"
            />

          </div>

          <div className="mt-2 flex flex-wrap gap-2">

            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">

              {
                program.code ||
                "NO CODE"
              }

            </span>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">

              {
                program.durationYears ||
                0
              }{" "}
              Years

            </span>

          </div>

        </div>

      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">

        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Department
        </p>

        <p className="mt-1 truncate text-sm font-bold text-slate-700">

          {
            program.department
              ?.name ||
            "Department not assigned"
          }

        </p>

        <p className="mt-1 text-xs font-semibold text-blue-600">

          {
            program.department
              ?.code ||
            ""
          }

        </p>

      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">

        <MiniMetric
          icon={
            <Users
              size={15}
            />
          }
          label="Students"
          value={
            counts.students
          }
          tone="green"
        />

        <MiniMetric
          icon={
            <BookOpen
              size={15}
            />
          }
          label="Courses"
          value={
            counts.courses
          }
          tone="purple"
        />

      </div>

      <div className="mt-4 rounded-xl border border-slate-100 p-3">

        <div className="flex items-center justify-between">

          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Program Duration
          </span>

          <CalendarDays
            size={14}
            className="text-slate-400"
          />

        </div>

        <p className="mt-1 text-sm font-bold text-slate-700">

          {
            program.durationYears ||
            0
          }{" "}
          academic years

        </p>

      </div>

      <button
        type="button"
        onClick={() =>
          onView(
            program.id
          )
        }
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      >

        <Eye
          size={16}
        />

        View Program

      </button>

    </article>
  );
}

/* ============================================================
   MINI METRIC
============================================================ */

function MiniMetric({
  icon,
  label,
  value,
  tone,
}) {
  const styles = {
    blue:
      "bg-blue-50 text-blue-600",
    green:
      "bg-green-50 text-green-600",
    purple:
      "bg-purple-50 text-purple-600",
    amber:
      "bg-amber-50 text-amber-600",
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">

      <div className="flex items-center justify-between gap-2">

        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            styles[tone] ||
            styles.blue
          }`}
        >
          {icon}
        </div>

        <span className="text-lg font-bold text-slate-800">
          {
            formatCount(
              value
            )
          }
        </span>

      </div>

      <p className="mt-2 text-[10px] font-semibold text-slate-400">
        {label}
      </p>

    </div>
  );
}

/* ============================================================
   PROGRAM LIST
============================================================ */

function ProgramList({
  programs,
  onView,
}) {
  return (
    <div className="overflow-x-auto">

      <table className="w-full min-w-[1050px]">

        <thead className="border-b border-slate-200 bg-slate-50">

          <tr>

            <TableHeader>
              Program
            </TableHeader>

            <TableHeader>
              Department
            </TableHeader>

            <TableHeader>
              Duration
            </TableHeader>

            <TableHeader>
              Students
            </TableHeader>

            <TableHeader>
              Courses
            </TableHeader>

            <TableHeader>
              Actions
            </TableHeader>

          </tr>

        </thead>

        <tbody className="divide-y divide-slate-100">

          {programs.map(
            (
              program
            ) => {

              const counts =
                getProgramCounts(
                  program
                );

              return (
                <tr
                  key={
                    program.id
                  }
                  className="transition hover:bg-slate-50"
                >

                  <td className="px-5 py-5">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-600">

                        {
                          getProgramInitials(
                            program
                          )
                        }

                      </div>

                      <div className="min-w-0">

                        <p className="truncate font-bold text-slate-800">

                          {
                            program.name ||
                            "Unnamed Program"
                          }

                        </p>

                        <p className="mt-1 text-xs font-semibold text-blue-600">

                          {
                            program.code ||
                            "No code"
                          }

                        </p>

                      </div>

                    </div>

                  </td>

                  <td className="px-5 py-5">

                    <p className="font-semibold text-slate-700">

                      {
                        program.department
                          ?.code ||
                        "—"
                      }

                    </p>

                    <p className="mt-1 text-xs text-slate-500">

                      {
                        program.department
                          ?.name ||
                        "Department not assigned"
                      }

                    </p>

                  </td>

                  <td className="px-5 py-5">

                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">

                      {
                        program.durationYears ||
                        0
                      }{" "}
                      Years

                    </span>

                  </td>

                  <td className="px-5 py-5">

                    <span className="font-bold text-slate-700">

                      {
                        formatCount(
                          counts.students
                        )
                      }

                    </span>

                  </td>

                  <td className="px-5 py-5">

                    <span className="font-bold text-slate-700">

                      {
                        formatCount(
                          counts.courses
                        )
                      }

                    </span>

                  </td>

                  <td className="px-5 py-5">

                    <button
                      type="button"
                      onClick={() =>
                        onView(
                          program.id
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >

                      <Eye
                        size={15}
                      />

                      View

                    </button>

                  </td>

                </tr>
              );
            }
          )}

        </tbody>

      </table>

    </div>
  );
}

/* ============================================================
   DETAILS MODAL
============================================================ */

function ProgramDetailsModal({
  program,
  loading,
  onClose,
}) {
  const students =
    program.students ||
    [];

  const courses =
    program.courses ||
    [];

  const counts =
    getProgramCounts(
      program
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">

      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

              <GraduationCap
                size={22}
              />

            </div>

            <div className="min-w-0">

              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Program Profile
              </p>

              <h2 className="truncate text-xl font-bold text-slate-800">

                {
                  program.name
                }

              </h2>

              <p className="text-xs font-semibold text-slate-500">

                {
                  program.code ||
                  "No program code"
                }

              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <X size={18} />
          </button>

        </div>

        {loading ? (

          <div className="flex flex-1 items-center justify-center p-12">

            <div className="text-center">

              <RefreshCw
                size={30}
                className="mx-auto animate-spin text-blue-600"
              />

              <p className="mt-4 text-sm font-semibold text-slate-500">
                Loading program details...
              </p>

            </div>

          </div>

        ) : (

          <div className="overflow-y-auto p-5 sm:p-6">

            {/* PROGRAM HERO */}

            <section className="rounded-2xl bg-blue-600 p-5 text-white sm:p-6">

              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                <div className="flex items-center gap-4">

                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold">

                    {
                      getProgramInitials(
                        program
                      )
                    }

                  </div>

                  <div>

                    <h3 className="text-2xl font-bold">
                      {
                        program.name
                      }
                    </h3>

                    <p className="mt-1 text-sm text-blue-100">
                      {
                        program.code ||
                        "No program code"
                      }
                    </p>

                    <p className="mt-1 text-xs text-blue-200">

                      {
                        program
                          .department
                          ?.name ||
                        "Department not assigned"
                      }

                    </p>

                  </div>

                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-blue-100">

                  <GraduationCap
                    size={15}
                  />

                  Academic Program

                </span>

              </div>

            </section>

            {/* INFORMATION */}

            <section className="mt-6">

              <SectionTitle
                title="Program Information"
                icon={
                  <GraduationCap
                    size={19}
                  />
                }
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                <InfoItem
                  label="Program Code"
                  value={
                    program.code
                  }
                />

                <InfoItem
                  label="Duration"
                  value={`${
                    program.durationYears ||
                    0
                  } Years`}
                />

                <InfoItem
                  label="Department"
                  value={
                    program.department
                      ?.name
                  }
                />

                <InfoItem
                  label="Department Code"
                  value={
                    program.department
                      ?.code
                  }
                />

              </div>

            </section>

            {/* SUMMARY */}

            <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

              <DetailStat
                label="Students"
                value={
                  counts.students
                }
                icon={
                  <Users
                    size={18}
                  />
                }
                tone="green"
              />

              <DetailStat
                label="Courses"
                value={
                  counts.courses
                }
                icon={
                  <BookOpen
                    size={18}
                  />
                }
                tone="purple"
              />

              <DetailStat
                label="Duration"
                value={`${program.durationYears || 0}y`}
                icon={
                  <CalendarDays
                    size={18}
                  />
                }
                tone="blue"
              />

              <DetailStat
                label="Department"
                value={
                  program.department
                    ?.code ||
                  "—"
                }
                icon={
                  <Building2
                    size={18}
                  />
                }
                tone="amber"
              />

            </section>

            {/* STUDENTS */}

            <DetailSection
              title="Students"
              icon={
                <Users
                  size={19}
                />
              }
              count={
                counts.students
              }
            >

              {students.length >
              0 ? (

                <div className="overflow-x-auto rounded-2xl border border-slate-200">

                  <table className="w-full min-w-[780px]">

                    <thead className="bg-slate-50">

                      <tr>

                        <TableHeader>
                          Student
                        </TableHeader>

                        <TableHeader>
                          Enrollment
                        </TableHeader>

                        <TableHeader>
                          Semester
                        </TableHeader>

                        <TableHeader>
                          Admission Year
                        </TableHeader>

                        <TableHeader>
                          Account
                        </TableHeader>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {students.map(
                        (
                          student
                        ) => {

                          const name =
                            `${student?.user?.firstName || ""} ${
                              student?.user?.lastName || ""
                            }`.trim() ||
                            "Unknown Student";

                          return (
                            <tr
                              key={
                                student.id
                              }
                              className="hover:bg-slate-50"
                            >

                              <td className="px-4 py-4">

                                <p className="font-semibold text-slate-700">
                                  {
                                    name
                                  }
                                </p>

                                <p className="mt-1 text-xs text-slate-400">

                                  {
                                    student
                                      ?.user
                                      ?.email ||
                                    "Email not available"
                                  }

                                </p>

                              </td>

                              <td className="px-4 py-4 text-sm font-semibold text-slate-600">

                                {
                                  student
                                    .enrollmentNumber ||
                                  "—"
                                }

                              </td>

                              <td className="px-4 py-4 text-sm text-slate-600">

                                Semester{" "}
                                {
                                  student
                                    .semester ||
                                  "—"
                                }

                              </td>

                              <td className="px-4 py-4 text-sm text-slate-600">

                                {
                                  student
                                    .admissionYear ||
                                  "—"
                                }

                              </td>

                              <td className="px-4 py-4">

                                <StatusBadge
                                  active={
                                    student
                                      ?.user
                                      ?.isActive
                                  }
                                />

                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              ) : (

                <EmptyText
                  text={
                    counts.students >
                    0
                      ? "Students exist but detailed student records were not returned by the server."
                      : "No students enrolled in this program."
                  }
                />

              )}

            </DetailSection>

            {/* COURSES */}

            <DetailSection
              title="Courses"
              icon={
                <BookOpen
                  size={19}
                />
              }
              count={
                counts.courses
              }
            >

              {courses.length >
              0 ? (

                <div className="overflow-x-auto rounded-2xl border border-slate-200">

                  <table className="w-full min-w-[900px]">

                    <thead className="bg-slate-50">

                      <tr>

                        <TableHeader>
                          Course
                        </TableHeader>

                        <TableHeader>
                          Semester
                        </TableHeader>

                        <TableHeader>
                          Type
                        </TableHeader>

                        <TableHeader>
                          Credits
                        </TableHeader>

                        <TableHeader>
                          Faculty
                        </TableHeader>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {courses.map(
                        (
                          course
                        ) => {

                          const faculty =
                            course?.faculty;

                          const facultyUser =
                            faculty?.user;

                          const facultyName =
                            `${facultyUser?.firstName || ""} ${
                              facultyUser?.lastName || ""
                            }`.trim();

                          return (
                            <tr
                              key={
                                course.id
                              }
                              className="hover:bg-slate-50"
                            >

                              <td className="px-4 py-4">

                                <p className="font-semibold text-slate-700">
                                  {
                                    course.code ||
                                    "—"
                                  }
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                  {
                                    course.name ||
                                    "Unnamed course"
                                  }
                                </p>

                              </td>

                              <td className="px-4 py-4 text-sm text-slate-600">

                                Semester{" "}
                                {
                                  course
                                    .semester ||
                                  "—"
                                }

                              </td>

                              <td className="px-4 py-4">

                                {course.type ? (
                                  <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">
                                    {
                                      course.type
                                    }
                                  </span>
                                ) : (
                                  <span className="text-sm text-slate-400">
                                    —
                                  </span>
                                )}

                              </td>

                              <td className="px-4 py-4 text-sm font-semibold text-slate-600">

                                {
                                  course.credits ??
                                  "—"
                                }

                              </td>

                              <td className="px-4 py-4">

                                {faculty ? (
                                  <>

                                    <p className="text-sm font-semibold text-slate-700">
                                      {
                                        facultyName ||
                                        "Unknown Faculty"
                                      }
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">

                                      {
                                        faculty
                                          .employeeId ||
                                        "—"
                                      }

                                    </p>

                                  </>
                                ) : (
                                  <span className="text-sm text-slate-400">
                                    Not assigned
                                  </span>
                                )}

                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              ) : (

                <EmptyText
                  text={
                    counts.courses >
                    0
                      ? "Courses exist but detailed course records were not returned by the server."
                      : "No courses associated with this program."
                  }
                />

              )}

            </DetailSection>

            {/* FOOTER */}

            <div className="mt-6 flex justify-end border-t border-slate-200 pt-5">

              <button
                type="button"
                onClick={
                  onClose
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >

                <X
                  size={17}
                />

                Close

              </button>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}

/* ============================================================
   DETAIL SECTION
============================================================ */

function DetailSection({
  title,
  icon,
  count,
  children,
}) {
  return (
    <section className="mt-7">

      <div className="mb-4 flex items-center justify-between gap-3">

        <div className="flex items-center gap-2">

          <span className="text-blue-600">
            {icon}
          </span>

          <h3 className="font-bold text-slate-800">
            {title}
          </h3>

        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">

          {
            formatCount(
              count
            )
          }

        </span>

      </div>

      {children}

    </section>
  );
}

/* ============================================================
   DETAIL STAT
============================================================ */

function DetailStat({
  label,
  value,
  icon,
  tone,
}) {
  const styles = {
    blue:
      "bg-blue-50 text-blue-600",
    green:
      "bg-green-50 text-green-600",
    purple:
      "bg-purple-50 text-purple-600",
    amber:
      "bg-amber-50 text-amber-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">

      <div className="flex items-center justify-between gap-3">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            styles[tone] ||
            styles.blue
          }`}
        >
          {icon}
        </div>

        <p className="max-w-[100px] truncate text-right text-xl font-bold text-slate-800">
          {value}
        </p>

      </div>

      <p className="mt-3 text-xs font-semibold text-slate-500">
        {label}
      </p>

    </div>
  );
}

/* ============================================================
   INFO ITEM
============================================================ */

function InfoItem({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">

      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-bold text-slate-700">
        {
          value ||
          "—"
        }
      </p>

    </div>
  );
}

/* ============================================================
   STATUS
============================================================ */

function StatusBadge({
  active,
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
        active
          ? "bg-green-50 text-green-700"
          : "bg-red-50 text-red-700"
      }`}
    >

      {active ? (
        <CheckCircle2
          size={13}
        />
      ) : (
        <AlertCircle
          size={13}
        />
      )}

      {active
        ? "Active"
        : "Inactive"}

    </span>
  );
}

/* ============================================================
   TABLE HEADER
============================================================ */

function TableHeader({
  children,
}) {
  return (
    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
      {children}
    </th>
  );
}

/* ============================================================
   EMPTY TEXT
============================================================ */

function EmptyText({
  text,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-6 text-center">

      <p className="text-sm text-slate-500">
        {text}
      </p>

    </div>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({
  hasFilters,
  onClear,
}) {
  return (
    <div className="p-12 text-center">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

        <GraduationCap
          size={31}
        />

      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-800">
        No programs found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">

        {hasFilters
          ? "No program records match your current search or filters."
          : "There are currently no academic programs available."}

      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={
            onClear
          }
          className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Clear Filters
        </button>
      )}

    </div>
  );
}

/* ============================================================
   SKELETON
============================================================ */

function ProgramSkeletonGrid() {
  return (
    <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">

      {Array.from({
        length: 6,
      }).map(
        (
          _,
          index
        ) => (
          <div
            key={
              index
            }
            className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
          >

            <div className="flex gap-3">

              <div className="h-12 w-12 rounded-xl bg-slate-200" />

              <div className="flex-1">

                <div className="h-5 w-2/3 rounded bg-slate-200" />

                <div className="mt-3 h-5 w-28 rounded bg-slate-200" />

              </div>

            </div>

            <div className="mt-5 h-20 rounded-xl bg-slate-100" />

            <div className="mt-4 grid grid-cols-2 gap-3">

              <div className="h-16 rounded-xl bg-slate-100" />

              <div className="h-16 rounded-xl bg-slate-100" />

            </div>

            <div className="mt-4 h-16 rounded-xl bg-slate-100" />

            <div className="mt-5 h-10 rounded-xl bg-slate-100" />

          </div>
        )
      )}

    </div>
  );
}

function CreateProgramModal({
  form,
  departments,
  loading,
  error,
  onClose,
  onChange,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Academic Structure
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-800">Add Program</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a program under an academic department.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 sm:p-6">
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Department <span className="text-red-500">*</span>
              </span>
              <select
                value={form.departmentId}
                onChange={(event) => onChange("departmentId", event.target.value)}
                required
                disabled={loading}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
              >
                <option value="">Select Department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.code
                      ? `${department.code} — ${department.name}`
                      : department.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Program Name <span className="text-red-500">*</span>
              </span>
              <input
                value={form.name}
                onChange={(event) => onChange("name", event.target.value)}
                required
                disabled={loading}
                placeholder="e.g. MBBS"
                className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Program Code <span className="text-red-500">*</span>
              </span>
              <input
                value={form.code}
                onChange={(event) => onChange("code", event.target.value.toUpperCase())}
                required
                disabled={loading}
                placeholder="e.g. MBBS"
                className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm uppercase text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Duration (Years) <span className="text-red-500">*</span>
              </span>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={form.durationYears}
                onChange={(event) => onChange("durationYears", event.target.value)}
                required
                disabled={loading}
                placeholder="e.g. 5"
                className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw size={17} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <GraduationCap size={17} />
                  Create Program
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminPrograms;