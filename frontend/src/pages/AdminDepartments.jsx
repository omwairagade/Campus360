import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  Eye,
  Filter,
  GraduationCap,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  School,
  Users,
  X,
  AlertCircle,
  Layers3,
  ChevronRight,
  Activity,
  BarChart3,
  Plus,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  apiGet,
  apiPost,
} from "../api";

/* ============================================================
   HELPERS
============================================================ */

function formatCount(
  value
) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-IN"
  );
}

function handleAuthError(
  error,
  navigate
) {
  const message =
    String(
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

function getCount(
  department,
  type
) {
  const directCount =
    Number(
      department?.counts?.[
        type
      ] ?? NaN
    );

  if (
    !Number.isNaN(
      directCount
    )
  ) {
    return directCount;
  }

  const underscoreCount =
    Number(
      department?._count?.[
        type
      ] ?? NaN
    );

  if (
    !Number.isNaN(
      underscoreCount
    )
  ) {
    return underscoreCount;
  }

  const arrayCount =
    Array.isArray(
      department?.[type]
    )
      ? department[type]
          .length
      : 0;

  return arrayCount;
}

function normalizeDepartment(
  department
) {
  if (
    !department
  ) {
    return null;
  }

  const programs =
    Array.isArray(
      department.programs
    )
      ? department.programs
      : [];

  const students =
    Array.isArray(
      department.students
    )
      ? department.students
      : [];

  const faculty =
    Array.isArray(
      department.faculty
    )
      ? department.faculty
      : [];

  const courses =
    Array.isArray(
      department.courses
    )
      ? department.courses
      : [];

  const counts = {
    programs:
      Number(
        department.counts
          ?.programs ??
          department._count
            ?.programs
      ) ||
      programs.length,

    students:
      Number(
        department.counts
          ?.students ??
          department._count
            ?.students
      ) ||
      students.length,

    faculty:
      Number(
        department.counts
          ?.faculty ??
          department._count
            ?.faculty
      ) ||
      faculty.length,

    courses:
      Number(
        department.counts
          ?.courses ??
          department._count
            ?.courses
      ) ||
      courses.length,
  };

  return {
    ...department,
    programs,
    students,
    faculty,
    courses,
    counts,
    _count: {
      ...(department._count ||
        {}),
      ...counts,
    },
  };
}

function getDepartmentInitials(
  department
) {
  const name =
    department?.name ||
    "Department";

  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length ===
    0
  ) {
    return "D";
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

function AdminDepartments() {
  const navigate =
    useNavigate();

  const [
    departments,
    setDepartments,
  ] = useState([]);

  const [
    selectedDepartment,
    setSelectedDepartment,
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

  const [
    error,
    setError,
  ] = useState("");

  const [
    showDepartmentModal,
    setShowDepartmentModal,
  ] = useState(false);

  const [
    formLoading,
    setFormLoading,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState("");

  const [
    departmentForm,
    setDepartmentForm,
  ] = useState({
    name: "",
    code: "",
    description: "",
  });

  /* ==========================================================
     FETCH DEPARTMENTS
  ========================================================== */

  const fetchDepartments =
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

          const query =
            params.toString();

          const endpoint =
            `/admin/departments${
              query
                ? `?${query}`
                : ""
            }`;

          const data =
            await apiGet(
              endpoint
            );

          let rawDepartments =
            [];

          if (
            Array.isArray(
              data?.data
            )
          ) {
            rawDepartments =
              data.data;
          } else if (
            Array.isArray(
              data?.departments
            )
          ) {
            rawDepartments =
              data.departments;
          } else if (
            Array.isArray(
              data?.data
                ?.departments
            )
          ) {
            rawDepartments =
              data.data
                .departments;
          }

          /*
           * Enrich every department from
           * its detail endpoint so cards have
           * reliable counts and relationships.
           */

          const enrichedDepartments =
            await Promise.all(
              rawDepartments.map(
                async (
                  department
                ) => {
                  try {
                    const detailData =
                      await apiGet(
                        `/admin/departments/${department.id}`
                      );

                    const detailedDepartment =
                      detailData?.data ||
                      detailData?.department ||
                      detailData?.data
                        ?.department ||
                      null;

                    if (
                      detailedDepartment
                    ) {
                      return normalizeDepartment(
                        {
                          ...department,
                          ...detailedDepartment,
                        }
                      );
                    }

                    return normalizeDepartment(
                      department
                    );
                  } catch (
                    detailError
                  ) {
                    console.warn(
                      `Unable to enrich department ${department.id}:`,
                      detailError
                    );

                    return normalizeDepartment(
                      department
                    );
                  }
                }
              )
            );

          setDepartments(
            enrichedDepartments.filter(
              Boolean
            )
          );
        } catch (
          err
        ) {
          console.error(
            "Admin departments error:",
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
              "Failed to load departments."
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
        navigate,
      ]
    );

  /* ==========================================================
     CREATE DEPARTMENT
  ========================================================== */

  const openCreateDepartment = () => {
    setDepartmentForm({
      name: "",
      code: "",
      description: "",
    });
    setFormError("");
    setShowDepartmentModal(true);
  };

  const closeDepartmentModal = () => {
    if (formLoading) return;
    setShowDepartmentModal(false);
    setFormError("");
  };

  const handleCreateDepartment = async (event) => {
    event.preventDefault();

    const name = departmentForm.name.trim();
    const code = departmentForm.code.trim().toUpperCase();
    const description = departmentForm.description.trim();

    if (!name) {
      setFormError("Please enter a department name.");
      return;
    }

    if (!code) {
      setFormError("Please enter a department code.");
      return;
    }

    try {
      setFormLoading(true);
      setFormError("");
      setError("");

      await apiPost("/admin/departments", {
        name,
        code,
        description: description || null,
      });

      setShowDepartmentModal(false);
      setDepartmentForm({
        name: "",
        code: "",
        description: "",
      });

      await fetchDepartments(true, appliedSearch);
    } catch (err) {
      console.error("Create department error:", err);
      if (handleAuthError(err, navigate)) return;
      setFormError(err?.message || "Failed to create department.");
    } finally {
      setFormLoading(false);
    }
  };

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    fetchDepartments();
  }, [
    fetchDepartments,
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

    fetchDepartments(
      false,
      value
    );
  };

  /* ==========================================================
     CLEAR SEARCH
  ========================================================== */

  const clearSearch = () => {
    setSearch("");
    setAppliedSearch("");

    fetchDepartments(
      true,
      ""
    );
  };

  /* ==========================================================
     OPEN DETAILS
  ========================================================== */

  const openDepartmentDetails =
    async (
      departmentId
    ) => {
      try {
        setDetailsLoading(
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

        const data =
          await apiGet(
            `/admin/departments/${departmentId}`
          );

        const rawDepartment =
          data?.data ||
          data?.department ||
          data?.data
            ?.department ||
          null;

        setSelectedDepartment(
          normalizeDepartment(
            rawDepartment
          )
        );
      } catch (
        err
      ) {
        console.error(
          "Department details error:",
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
            "Failed to fetch department details."
        );
      } finally {
        setDetailsLoading(
          false
        );
      }
    };

  /* ==========================================================
     PROCESSED DEPARTMENTS
  ========================================================== */

  const processedDepartments =
    useMemo(() => {
      let result =
        [...departments];

      const term =
        search
          .trim()
          .toLowerCase();

      /*
       * Local filtering allows instant filtering
       * after the server search.
       */

      if (
        term
      ) {
        result =
          result.filter(
            (
              department
            ) => {
              const searchable =
                [
                  department?.name,
                  department?.code,
                  department?.description,
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
          let comparison =
            0;

          if (
            sortBy ===
            "students"
          ) {
            comparison =
              getCount(
                a,
                "students"
              ) -
              getCount(
                b,
                "students"
              );
          } else if (
            sortBy ===
            "faculty"
          ) {
            comparison =
              getCount(
                a,
                "faculty"
              ) -
              getCount(
                b,
                "faculty"
              );
          } else if (
            sortBy ===
            "courses"
          ) {
            comparison =
              getCount(
                a,
                "courses"
              ) -
              getCount(
                b,
                "courses"
              );
          } else if (
            sortBy ===
            "programs"
          ) {
            comparison =
              getCount(
                a,
                "programs"
              ) -
              getCount(
                b,
                "programs"
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
      departments,
      search,
      sortBy,
      sortDirection,
    ]);

  /* ==========================================================
     TOTALS
  ========================================================== */

  const totals =
    useMemo(() => {
      return departments.reduce(
        (
          result,
          department
        ) => {
          result.programs +=
            getCount(
              department,
              "programs"
            );

          result.students +=
            getCount(
              department,
              "students"
            );

          result.faculty +=
            getCount(
              department,
              "faculty"
            );

          result.courses +=
            getCount(
              department,
              "courses"
            );

          return result;
        },
        {
          programs: 0,
          students: 0,
          faculty: 0,
          courses: 0,
        }
      );
    }, [
      departments,
    ]);

  const departmentCount =
    departments.length;

  const averageStudents =
    departmentCount >
    0
      ? (
          totals.students /
          departmentCount
        ).toFixed(1)
      : "0.0";

  const averageFaculty =
    departmentCount >
    0
      ? (
          totals.faculty /
          departmentCount
        ).toFixed(1)
      : "0.0";

  const averageCourses =
    departmentCount >
    0
      ? (
          totals.courses /
          departmentCount
        ).toFixed(1)
      : "0.0";

  const mostStudentDepartment =
    departments.length >
    0
      ? departments.reduce(
          (
            highest,
            department
          ) =>
            getCount(
              department,
              "students"
            ) >
            getCount(
              highest,
              "students"
            )
              ? department
              : highest,
          departments[0]
        )
      : null;

  const mostCourseDepartment =
    departments.length >
    0
      ? departments.reduce(
          (
            highest,
            department
          ) =>
            getCount(
              department,
              "courses"
            ) >
            getCount(
              highest,
              "courses"
            )
              ? department
              : highest,
          departments[0]
        )
      : null;

  const hasSearch =
    Boolean(
      search.trim()
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

              <Building2
                size={22}
              />

            </div>

            <div className="min-w-0">

              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Campus360 Administration
              </p>

              <h1 className="truncate text-xl font-bold text-slate-800">
                Department Management
              </h1>

              <p className="hidden text-xs text-slate-500 sm:block">
                Manage academic departments and their institutional structure.
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCreateDepartment}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 sm:px-4"
            >
              <Plus size={17} />
              <span className="hidden sm:inline">
                Add Department
              </span>
            </button>

          <button
            type="button"
            onClick={() =>
              fetchDepartments(
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
                  Academic Structure
                </span>

                <span className="rounded-full bg-blue-400/20 px-3 py-1.5 text-xs font-bold text-blue-100">
                  {departmentCount} Departments
                </span>

              </div>

              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                Institution structure at a glance
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
                View departments together with their programs, students, faculty and courses. Use the management view to understand the academic structure of Campus360.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">

                <HeroTag
                  icon={
                    <GraduationCap
                      size={14}
                    />
                  }
                  text={`${totals.programs} programs`}
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
                  departmentCount
                }
                label="Departments"
              />

              <HeroMetric
                value={
                  totals.programs
                }
                label="Programs"
              />

              <HeroMetric
                value={
                  totals.students
                }
                label="Students"
              />

              <HeroMetric
                value={
                  totals.faculty
                }
                label="Faculty"
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
                Department management error
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
              <Building2
                size={21}
              />
            }
            label="Departments"
            value={
              departmentCount
            }
            description="Academic departments"
            tone="blue"
          />

          <KpiCard
            icon={
              <GraduationCap
                size={21}
              />
            }
            label="Programs"
            value={
              totals.programs
            }
            description="Programs across departments"
            tone="purple"
          />

          <KpiCard
            icon={
              <Users size={21} />
            }
            label="Students"
            value={
              totals.students
            }
            description="Students across departments"
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
            description="Courses across departments"
            tone="amber"
          />

        </section>

        {/* ====================================================
            ANALYTICS
        ==================================================== */}

        <section className="mt-8 grid gap-6 lg:grid-cols-3">

          <AnalyticsPanel
            title="Average Per Department"
            icon={
              <BarChart3
                size={20}
              />
            }
            iconClass="bg-blue-50 text-blue-600"
          >

            <div className="grid grid-cols-3 gap-3">

              <MetricBox
                label="Students"
                value={
                  averageStudents
                }
              />

              <MetricBox
                label="Faculty"
                value={
                  averageFaculty
                }
              />

              <MetricBox
                label="Courses"
                value={
                  averageCourses
                }
              />

            </div>

          </AnalyticsPanel>

          <AnalyticsPanel
            title="Largest Student Population"
            icon={
              <Users size={20} />
            }
            iconClass="bg-green-50 text-green-600"
          >

            {mostStudentDepartment ? (
              <>
                <p className="text-2xl font-bold text-slate-800">
                  {
                    formatCount(
                      getCount(
                        mostStudentDepartment,
                        "students"
                      )
                    )
                  }
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {
                    mostStudentDepartment.name
                  }
                </p>

                <div className="mt-4 rounded-xl bg-green-50 p-3">

                  <p className="text-xs text-green-700">
                    Department code
                  </p>

                  <p className="mt-1 font-bold text-green-900">
                    {
                      mostStudentDepartment.code ||
                      "—"
                    }
                  </p>

                </div>
              </>
            ) : (
              <EmptyText text="No department data available." />
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

            {mostCourseDepartment ? (
              <>
                <p className="text-2xl font-bold text-slate-800">
                  {
                    formatCount(
                      getCount(
                        mostCourseDepartment,
                        "courses"
                      )
                    )
                  }
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {
                    mostCourseDepartment.name
                  }
                </p>

                <div className="mt-4 rounded-xl bg-purple-50 p-3">

                  <p className="text-xs text-purple-700">
                    Programs
                  </p>

                  <p className="mt-1 font-bold text-purple-900">
                    {
                      formatCount(
                        getCount(
                          mostCourseDepartment,
                          "programs"
                        )
                      )
                    }
                  </p>

                </div>
              </>
            ) : (
              <EmptyText text="No department data available." />
            )}

          </AnalyticsPanel>

        </section>

        {/* ====================================================
            SEARCH / CONTROLS
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
                  Search & Controls
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Search departments and organize the view.
                </p>

              </div>

            </div>

            {hasSearch && (
              <button
                type="button"
                onClick={
                  clearSearch
                }
                className="inline-flex items-center gap-2 self-start rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >

                <X size={14} />

                Clear Search

              </button>
            )}

          </div>

          <form
            onSubmit={
              handleSearch
            }
            className="mt-6 grid gap-3 lg:grid-cols-4"
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
                placeholder="Search by department name, code or description..."
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

            <div className="flex gap-2">

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
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              >

                <option value="name">
                  Sort by Name
                </option>

                <option value="code">
                  Sort by Code
                </option>

                <option value="students">
                  Sort by Students
                </option>

                <option value="faculty">
                  Sort by Faculty
                </option>

                <option value="programs">
                  Sort by Programs
                </option>

                <option value="courses">
                  Sort by Courses
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

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >

              <Search
                size={17}
              />

              Search

            </button>

          </form>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs text-slate-500">

              Showing{" "}
              <span className="font-bold text-slate-700">
                {
                  processedDepartments.length
                }
              </span>
              {" "}
              of{" "}
              <span className="font-bold text-slate-700">
                {
                  departments.length
                }
              </span>
              {" "}
              departments

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
            DEPARTMENT RECORDS
        ==================================================== */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <Building2
                    size={21}
                    className="text-blue-600"
                  />

                  <h2 className="text-lg font-bold text-slate-800">
                    Department Records
                  </h2>

                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Explore department structure and academic resources.
                </p>

              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                {
                  processedDepartments.length
                } displayed
              </span>

            </div>

          </div>

          {loading ? (
            <DepartmentSkeletonGrid />
          ) : processedDepartments.length ===
            0 ? (
            <EmptyState
              hasSearch={
                hasSearch
              }
              onClear={
                clearSearch
              }
            />
          ) : viewMode ===
            "grid" ? (
            <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">

              {processedDepartments.map(
                (
                  department
                ) => (
                  <DepartmentCard
                    key={
                      department.id
                    }
                    department={
                      department
                    }
                    onView={
                      openDepartmentDetails
                    }
                  />
                )
              )}

            </div>
          ) : (
            <DepartmentList
              departments={
                processedDepartments
              }
              onView={
                openDepartmentDetails
              }
            />
          )}

        </section>

      </main>

      {/* ======================================================
          CREATE DEPARTMENT MODAL
      ====================================================== */}

      {showDepartmentModal && (
        <DepartmentFormModal
          form={departmentForm}
          loading={formLoading}
          error={formError}
          onChange={(field, value) =>
            setDepartmentForm((current) => ({
              ...current,
              [field]: value,
            }))
          }
          onClose={closeDepartmentModal}
          onSubmit={handleCreateDepartment}
        />
      )}

      {/* ======================================================
          DETAILS MODAL
      ====================================================== */}

      {selectedDepartment && (
        <DepartmentDetailsModal
          department={
            selectedDepartment
          }
          loading={
            detailsLoading
          }
          onClose={() =>
            setSelectedDepartment(
              null
            )
          }
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
    <div className="rounded-xl bg-slate-50 p-3 text-center">

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
   DEPARTMENT CARD
============================================================ */

function DepartmentCard({
  department,
  onView,
}) {
  const programs =
    department.programs ||
    [];

  const programCount =
    getCount(
      department,
      "programs"
    );

  const studentCount =
    getCount(
      department,
      "students"
    );

  const facultyCount =
    getCount(
      department,
      "faculty"
    );

  const courseCount =
    getCount(
      department,
      "courses"
    );

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">

      {/* HEADER */}

      <div className="flex items-start gap-3">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-600">

          {
            getDepartmentInitials(
              department
            )
          }

        </div>

        <div className="min-w-0 flex-1">

          <div className="flex items-start justify-between gap-2">

            <h3 className="truncate font-bold text-slate-800">
              {
                department.name
              }
            </h3>

            <ChevronRight
              size={17}
              className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500"
            />

          </div>

          <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">

            {
              department.code ||
              "NO CODE"
            }

          </span>

        </div>

      </div>

      {/* DESCRIPTION */}

      <p className="mt-4 min-h-[48px] text-sm leading-6 text-slate-500">
        {
          department.description ||
          "No department description available."
        }
      </p>

      {/* METRICS */}

      <div className="mt-5 grid grid-cols-2 gap-3">

        <MiniMetric
          icon={
            <GraduationCap
              size={15}
            />
          }
          label="Programs"
          value={
            programCount
          }
          tone="blue"
        />

        <MiniMetric
          icon={
            <Users
              size={15}
            />
          }
          label="Students"
          value={
            studentCount
          }
          tone="green"
        />

        <MiniMetric
          icon={
            <Users
              size={15}
            />
          }
          label="Faculty"
          value={
            facultyCount
          }
          tone="purple"
        />

        <MiniMetric
          icon={
            <BookOpen
              size={15}
            />
          }
          label="Courses"
          value={
            courseCount
          }
          tone="amber"
        />

      </div>

      {/* PROGRAMS */}

      <div className="mt-5">

        <div className="mb-3 flex items-center justify-between">

          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Programs
          </p>

          <span className="text-xs font-bold text-slate-500">
            {
              formatCount(
                programCount
              )
            }
          </span>

        </div>

        {programs.length >
        0 ? (

          <div className="space-y-2">

            {programs
              .slice(
                0,
                3
              )
              .map(
                (
                  program
                ) => (
                  <div
                    key={
                      program.id
                    }
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                  >

                    <div className="min-w-0">

                      <p className="truncate text-xs font-bold text-slate-700">
                        {
                          program.name ||
                          "Unnamed Program"
                        }
                      </p>

                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {
                          program.code ||
                          "No code"
                        }
                      </p>

                    </div>

                    <span className="shrink-0 text-[10px] font-semibold text-slate-400">

                      {
                        program.durationYears ||
                        0
                      }{" "}
                      yrs

                    </span>

                  </div>
                )
              )}

            {programs.length >
              3 && (
              <p className="pt-1 text-xs font-semibold text-slate-400">

                +
                {
                  programs.length -
                  3
                }{" "}
                more programs

              </p>
            )}

          </div>

        ) : (

          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-400">
            {programCount >
            0
              ? `${formatCount(
                  programCount
                )} program(s) available`
              : "No programs found."}
          </p>

        )}

      </div>

      {/* BUTTON */}

      <button
        type="button"
        onClick={() =>
          onView(
            department.id
          )
        }
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      >

        <Eye
          size={16}
        />

        View Department

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
   DEPARTMENT LIST
============================================================ */

function DepartmentList({
  departments,
  onView,
}) {
  return (
    <div className="overflow-x-auto">

      <table className="w-full min-w-[1050px]">

        <thead className="border-b border-slate-200 bg-slate-50">

          <tr>

            <TableHeader>
              Department
            </TableHeader>

            <TableHeader>
              Programs
            </TableHeader>

            <TableHeader>
              Students
            </TableHeader>

            <TableHeader>
              Faculty
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

          {departments.map(
            (
              department
            ) => (
              <tr
                key={
                  department.id
                }
                className="transition hover:bg-slate-50"
              >

                <td className="px-5 py-5">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-600">
                      {
                        getDepartmentInitials(
                          department
                        )
                      }
                    </div>

                    <div className="min-w-0">

                      <p className="truncate font-bold text-slate-800">
                        {
                          department.name
                        }
                      </p>

                      <p className="mt-1 text-xs font-semibold text-blue-600">
                        {
                          department.code ||
                          "No Code"
                        }
                      </p>

                    </div>

                  </div>

                </td>

                <td className="px-5 py-5 text-sm font-bold text-slate-700">
                  {
                    formatCount(
                      getCount(
                        department,
                        "programs"
                      )
                    )
                  }
                </td>

                <td className="px-5 py-5 text-sm font-bold text-slate-700">
                  {
                    formatCount(
                      getCount(
                        department,
                        "students"
                      )
                    )
                  }
                </td>

                <td className="px-5 py-5 text-sm font-bold text-slate-700">
                  {
                    formatCount(
                      getCount(
                        department,
                        "faculty"
                      )
                    )
                  }
                </td>

                <td className="px-5 py-5 text-sm font-bold text-slate-700">
                  {
                    formatCount(
                      getCount(
                        department,
                        "courses"
                      )
                    )
                  }
                </td>

                <td className="px-5 py-5">

                  <button
                    type="button"
                    onClick={() =>
                      onView(
                        department.id
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
            )
          )}

        </tbody>

      </table>

    </div>
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
   DEPARTMENT FORM MODAL
============================================================ */

function DepartmentFormModal({
  form,
  loading,
  error,
  onChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Academic Structure
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-800">
              Add Department
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a department that can contain multiple academic programs.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 sm:p-6">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm font-semibold leading-6">{error}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Department Name" required value={form.name} onChange={(value) => onChange("name", value)} placeholder="e.g. Medical Sciences" className="sm:col-span-2" />
            <FormField label="Department Code" required value={form.code} onChange={(value) => onChange("code", value.toUpperCase())} placeholder="e.g. MED" />
            <div className="sm:col-span-2">
              <label className="text-sm font-bold text-slate-700">Description</label>
              <textarea value={form.description} onChange={(event) => onChange("description", event.target.value)} rows={4} placeholder="Optional department description..." className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={loading} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? (<> <RefreshCw size={16} className="animate-spin" /> Creating... </>) : (<> <Plus size={16} /> Create Department </>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, required, value, onChange, placeholder, className = "" }) {
  return (
    <div className={className}>
      <label className="text-sm font-bold text-slate-700">{label}{required && <span className="ml-1 text-red-500">*</span>}</label>
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
    </div>
  );
}

/* ============================================================
   DETAILS MODAL
============================================================ */

function DepartmentDetailsModal({
  department,
  loading,
  onClose,
}) {
  const programs =
    department.programs ||
    [];

  const students =
    department.students ||
    [];

  const faculty =
    department.faculty ||
    [];

  const courses =
    department.courses ||
    [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">

      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Building2
                size={21}
              />
            </div>

            <div className="min-w-0">

              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Department Profile
              </p>

              <h2 className="truncate text-xl font-bold text-slate-800">
                {
                  department.name
                }
              </h2>

              <p className="text-xs font-semibold text-slate-500">
                {
                  department.code ||
                  "No department code"
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
                Loading department details...
              </p>

            </div>

          </div>

        ) : (

          <div className="overflow-y-auto p-5 sm:p-6">

            {/* HERO */}

            <section className="rounded-2xl bg-blue-600 p-5 text-white sm:p-6">

              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                <div className="flex items-center gap-4">

                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold">

                    {
                      getDepartmentInitials(
                        department
                      )
                    }

                  </div>

                  <div>

                    <h3 className="text-2xl font-bold">
                      {
                        department.name
                      }
                    </h3>

                    <p className="mt-1 text-sm text-blue-100">
                      {
                        department.code ||
                        "No department code"
                      }
                    </p>

                  </div>

                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-blue-100">

                  <Building2
                    size={15}
                  />

                  Academic Department

                </span>

              </div>

              <p className="mt-5 max-w-4xl text-sm leading-6 text-blue-100">
                {
                  department.description ||
                  "No department description available."
                }
              </p>

            </section>

            {/* COUNTS */}

            <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">

              <DetailStat
                label="Programs"
                value={getCount(
                  department,
                  "programs"
                )}
                icon={
                  <GraduationCap
                    size={18}
                  />
                }
                tone="blue"
              />

              <DetailStat
                label="Students"
                value={getCount(
                  department,
                  "students"
                )}
                icon={
                  <Users
                    size={18}
                  />
                }
                tone="green"
              />

              <DetailStat
                label="Faculty"
                value={getCount(
                  department,
                  "faculty"
                )}
                icon={
                  <Users
                    size={18}
                  />
                }
                tone="purple"
              />

              <DetailStat
                label="Courses"
                value={getCount(
                  department,
                  "courses"
                )}
                icon={
                  <BookOpen
                    size={18}
                  />
                }
                tone="amber"
              />

            </section>

            {/* PROGRAMS */}

            <DetailSection
              title="Academic Programs"
              icon={
                <GraduationCap
                  size={19}
                />
              }
              count={
                getCount(
                  department,
                  "programs"
                )
              }
            >

              {programs.length >
              0 ? (

                <div className="grid gap-4 md:grid-cols-2">

                  {programs.map(
                    (
                      program
                    ) => (
                      <div
                        key={
                          program.id
                        }
                        className="rounded-2xl border border-slate-200 p-4"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div>

                            <p className="font-bold text-slate-700">
                              {
                                program.name
                              }
                            </p>

                            <p className="mt-1 text-xs font-semibold text-blue-600">
                              {
                                program.code ||
                                "No code"
                              }
                            </p>

                          </div>

                          <GraduationCap
                            size={19}
                            className="text-blue-600"
                          />

                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">

                          <Badge>
                            {
                              program.durationYears ||
                              0
                            }{" "}
                            Years
                          </Badge>

                          <Badge>
                            Students:{" "}
                            {
                              program._count
                                ?.students ||
                              0
                            }
                          </Badge>

                          <Badge>
                            Courses:{" "}
                            {
                              program._count
                                ?.courses ||
                              0
                            }
                          </Badge>

                        </div>

                      </div>
                    )
                  )}

                </div>

              ) : (

                <EmptyText
                  text={
                    getCount(
                      department,
                      "programs"
                    ) >
                    0
                      ? "Programs exist but detailed program records were not returned by the server."
                      : "No programs found."
                  }
                />

              )}

            </DetailSection>

            {/* STUDENTS */}

            <DetailSection
              title="Students"
              icon={
                <Users
                  size={19}
                />
              }
              count={
                getCount(
                  department,
                  "students"
                )
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
                          Program
                        </TableHeader>

                        <TableHeader>
                          Semester
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
                        ) => (
                          <tr
                            key={
                              student.id
                            }
                            className="hover:bg-slate-50"
                          >

                            <td className="px-4 py-4">

                              <p className="font-semibold text-slate-700">

                                {
                                  student
                                    .user
                                    ?.firstName
                                }{" "}
                                {
                                  student
                                    .user
                                    ?.lastName
                                }

                              </p>

                              <p className="mt-1 text-xs text-slate-400">

                                {
                                  student
                                    .user
                                    ?.email ||
                                  "—"
                                }

                              </p>

                            </td>

                            <td className="px-4 py-4 text-sm font-semibold text-slate-600">

                              {
                                student.enrollmentNumber ||
                                "—"
                              }

                            </td>

                            <td className="px-4 py-4">

                              <p className="text-sm font-semibold text-slate-700">

                                {
                                  student
                                    .programRel
                                    ?.code ||
                                  "—"
                                }

                              </p>

                              <p className="mt-1 text-xs text-slate-400">

                                {
                                  student
                                    .programRel
                                    ?.name ||
                                  ""
                                }

                              </p>

                            </td>

                            <td className="px-4 py-4 text-sm text-slate-600">

                              Semester{" "}
                              {
                                student.semester ||
                                "—"
                              }

                            </td>

                            <td className="px-4 py-4">

                              <StatusBadge
                                active={
                                  student
                                    .user
                                    ?.isActive
                                }
                              />

                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              ) : (

                <EmptyText
                  text={
                    getCount(
                      department,
                      "students"
                    ) >
                    0
                      ? "Students exist but detailed student records were not returned by the server."
                      : "No students found."
                  }
                />

              )}

            </DetailSection>

            {/* FACULTY */}

            <DetailSection
              title="Faculty"
              icon={
                <Users
                  size={19}
                />
              }
              count={
                getCount(
                  department,
                  "faculty"
                )
              }
            >

              {faculty.length >
              0 ? (

                <div className="grid gap-4 md:grid-cols-2">

                  {faculty.map(
                    (
                      member
                    ) => (
                      <div
                        key={
                          member.id
                        }
                        className="rounded-2xl border border-slate-200 p-4"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div>

                            <p className="font-bold text-slate-700">

                              {
                                member
                                  .user
                                  ?.firstName
                              }{" "}
                              {
                                member
                                  .user
                                  ?.lastName
                              }

                            </p>

                            <p className="mt-1 text-sm text-slate-500">

                              {
                                member.designation ||
                                "Faculty"
                              }

                            </p>

                          </div>

                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">

                            {
                              member.employeeId ||
                              "No ID"
                            }

                          </span>

                        </div>

                        <p className="mt-3 break-all text-xs text-slate-400">

                          {
                            member
                              .user
                              ?.email ||
                            "Email not available"
                          }

                        </p>

                        <div className="mt-3">

                          <StatusBadge
                            active={
                              member
                                .user
                                ?.isActive
                            }
                          />

                        </div>

                      </div>
                    )
                  )}

                </div>

              ) : (

                <EmptyText
                  text={
                    getCount(
                      department,
                      "faculty"
                    ) >
                    0
                      ? "Faculty exist but detailed faculty records were not returned by the server."
                      : "No faculty found."
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
                getCount(
                  department,
                  "courses"
                )
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
                          Program
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
                        ) => (
                          <tr
                            key={
                              course.id
                            }
                            className="hover:bg-slate-50"
                          >

                            <td className="px-4 py-4">

                              <p className="font-bold text-slate-700">
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

                            <td className="px-4 py-4">

                              <p className="text-sm font-semibold text-slate-700">

                                {
                                  course
                                    .program
                                    ?.code ||
                                  "—"
                                }

                              </p>

                              <p className="mt-1 text-xs text-slate-400">

                                {
                                  course
                                    .program
                                    ?.name ||
                                  ""
                                }

                              </p>

                            </td>

                            <td className="px-4 py-4 text-sm text-slate-600">

                              Semester{" "}
                              {
                                course.semester ||
                                "—"
                              }

                            </td>

                            <td className="px-4 py-4">

                              {course.type ? (
                                <Badge>
                                  {
                                    course.type
                                  }
                                </Badge>
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

                              {course.faculty ? (
                                <>

                                  <p className="text-sm font-semibold text-slate-700">

                                    {
                                      course
                                        .faculty
                                        .user
                                        ?.firstName
                                    }{" "}
                                    {
                                      course
                                        .faculty
                                        .user
                                        ?.lastName
                                    }

                                  </p>

                                  <p className="mt-1 text-xs text-slate-400">

                                    {
                                      course
                                        .faculty
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
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              ) : (

                <EmptyText
                  text={
                    getCount(
                      department,
                      "courses"
                    ) >
                    0
                      ? "Courses exist but detailed course records were not returned by the server."
                      : "No courses found."
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

      <div className="flex items-center justify-between">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            styles[tone]
          }`}
        >
          {icon}
        </div>

        <p className="text-2xl font-bold text-slate-800">
          {
            formatCount(
              value
            )
          }
        </p>

      </div>

      <p className="mt-3 text-xs font-semibold text-slate-500">
        {label}
      </p>

    </div>
  );
}

/* ============================================================
   BADGE
============================================================ */

function Badge({
  children,
}) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      {children}
    </span>
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
  hasSearch,
  onClear,
}) {
  return (
    <div className="p-12 text-center">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

        <Building2
          size={31}
        />

      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-800">
        No departments found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">

        {hasSearch
          ? "No department records match your current search."
          : "There are currently no departments available."}

      </p>

      {hasSearch && (
        <button
          type="button"
          onClick={
            onClear
          }
          className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Clear Search
        </button>
      )}

    </div>
  );
}

/* ============================================================
   SKELETON GRID
============================================================ */

function DepartmentSkeletonGrid() {
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

            <div className="flex items-center gap-3">

              <div className="h-12 w-12 rounded-xl bg-slate-200" />

              <div className="flex-1">

                <div className="h-4 w-2/3 rounded bg-slate-200" />

                <div className="mt-2 h-4 w-16 rounded bg-slate-200" />

              </div>

            </div>

            <div className="mt-5 h-12 rounded-lg bg-slate-100" />

            <div className="mt-5 grid grid-cols-2 gap-3">

              <div className="h-16 rounded-xl bg-slate-100" />

              <div className="h-16 rounded-xl bg-slate-100" />

              <div className="h-16 rounded-xl bg-slate-100" />

              <div className="h-16 rounded-xl bg-slate-100" />

            </div>

          </div>
        )
      )}

    </div>
  );
}

export default AdminDepartments;