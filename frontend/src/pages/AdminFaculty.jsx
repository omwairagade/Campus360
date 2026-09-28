import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Eye,
  Filter,
  GraduationCap,
  LayoutGrid,
  List,
  Mail,
  RefreshCw,
  School,
  Search,
  ShieldCheck,
  ShieldOff,
  SortAsc,
  UserRound,
  Users,
  X,
  AlertCircle,
  BriefcaseBusiness,
  Layers3,
  Plus,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  apiGet,
  apiPatch,
  apiPost,
} from "../api";

/* ============================================================
   HELPERS
============================================================ */

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

function getFacultyName(
  member
) {
  const firstName =
    member?.user?.firstName ||
    "";

  const lastName =
    member?.user?.lastName ||
    "";

  return (
    `${firstName} ${lastName}`.trim() ||
    member?.name ||
    member?.fullName ||
    "Unnamed Faculty"
  );
}

function getFacultyEmail(
  member
) {
  return (
    member?.user?.email ||
    member?.email ||
    ""
  );
}

function getFacultyInitials(
  member
) {
  const name =
    getFacultyName(member);

  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return "F";
  }

  if (
    parts.length === 1
  ) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return `${parts[0].charAt(
    0
  )}${parts[
    parts.length - 1
  ].charAt(0)}`.toUpperCase();
}

function getDepartmentName(
  member
) {
  return (
    member?.department
      ?.name ||
    member?.departmentRel
      ?.name ||
    "Department not assigned"
  );
}

function getDepartmentCode(
  member
) {
  return (
    member?.department
      ?.code ||
    member?.departmentRel
      ?.code ||
    "—"
  );
}

function getCourseCount(
  member
) {
  return Number(
    member?._count?.courses ||
      0
  );
}

function isMemberActive(
  member
) {
  return (
    member?.user
      ?.isActive === true
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

function AdminFaculty() {
  const navigate =
    useNavigate();

  const [
    faculty,
    setFaculty,
  ] = useState([]);

  const [
    departments,
    setDepartments,
  ] = useState([]);

  const [
    selectedFaculty,
    setSelectedFaculty,
  ] = useState(null);

  const [
    showCreateModal,
    setShowCreateModal,
  ] = useState(false);

  const [
    creatingFaculty,
    setCreatingFaculty,
  ] = useState(false);

  const [
    createFacultyForm,
    setCreateFacultyForm,
  ] = useState({
    firstName: "",
    lastName: "",
    employeeId: "",
    departmentId: "",
  });

  const [
    createdCredentials,
    setCreatedCredentials,
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
    statusFilter,
    setStatusFilter,
  ] = useState("ALL");

  const [
    designationFilter,
    setDesignationFilter,
  ] = useState("ALL");

  const [
    viewMode,
    setViewMode,
  ] = useState("table");

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
    statusUpdating,
    setStatusUpdating,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const handleCreateFaculty = async (event) => {
    event.preventDefault();

    const firstName = createFacultyForm.firstName.trim();
    const lastName = createFacultyForm.lastName.trim();
    const employeeId = createFacultyForm.employeeId.trim();
    const selectedDepartmentId = createFacultyForm.departmentId;

    if (!firstName || !lastName || !employeeId || !selectedDepartmentId) {
      setError("Please fill all faculty account fields.");
      return;
    }

    try {
      setCreatingFaculty(true);
      setError("");
      setSuccess("");
      setCreatedCredentials(null);

      const data = await apiPost("/faculty", {
        firstName,
        lastName,
        employeeId,
        departmentId: Number(selectedDepartmentId),
      });

const credentials = {
  email:
    data?.credentials?.email ||
    data?.credentials?.collegeEmail ||
    data?.email ||
    data?.collegeEmail ||
    `${employeeId}@campus360.com`,
  temporaryPassword:
    data?.credentials?.temporaryPassword ||
    data?.credentials?.password ||
    data?.temporaryPassword ||
    data?.password ||
    "Campus@123",
};

      setCreatedCredentials(credentials);
      setSuccess(
        data?.message ||
          "Faculty account created successfully. Provide the temporary credentials to the faculty member."
      );

      setCreateFacultyForm({
        firstName: "",
        lastName: "",
        employeeId: "",
        departmentId: "",
      });

      await fetchFaculty(true);
    } catch (err) {
      console.error("Create faculty error:", err);

      if (handleAuthError(err, navigate)) {
        return;
      }

      setError(
        err?.message ||
          "Failed to create faculty account."
      );
    } finally {
      setCreatingFaculty(false);
    }
  };

  /* ==========================================================
     FETCH FACULTY
  ========================================================== */

  const fetchFaculty =
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
            params.append(
              "search",
              effectiveSearch.trim()
            );
          }

          if (
            departmentId
          ) {
            params.append(
              "departmentId",
              departmentId
            );
          }

          const query =
            params.toString();

          const endpoint =
            `/admin/faculty${
              query
                ? `?${query}`
                : ""
            }`;

          const data =
            await apiGet(
              endpoint
            );

          setFaculty(
            Array.isArray(
              data?.data
            )
              ? data.data
              : []
          );
        } catch (
          err
        ) {
          console.error(
            "Admin faculty error:",
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
              "Failed to load faculty records."
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
              "/departments"
            );

          setDepartments(
            Array.isArray(
              data?.data
            )
              ? data.data
              : Array.isArray(
                  data?.departments
                )
              ? data.departments
              : []
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
    fetchDepartments();
    fetchFaculty();
  }, [
    fetchDepartments,
    fetchFaculty,
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

    fetchFaculty(
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
    setStatusFilter("ALL");
    setDesignationFilter("ALL");
    setSortBy("name");
    setSortDirection("asc");

    fetchFaculty(
      false,
      ""
    );
  };

  /* ==========================================================
     OPEN DETAILS
  ========================================================== */

  const openFacultyDetails =
    async (
      facultyId
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
            `/admin/faculty/${facultyId}`
          );

        setSelectedFaculty(
          data?.data ||
            null
        );
      } catch (
        err
      ) {
        console.error(
          "Faculty details error:",
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
            "Failed to fetch faculty details."
        );
      } finally {
        setDetailsLoading(
          false
        );
      }
    };

  /* ==========================================================
     ACCOUNT STATUS
  ========================================================== */

  const updateFacultyStatus =
    async (
      facultyId,
      currentStatus
    ) => {
      const nextStatus =
        !currentStatus;

      const confirmed =
        window.confirm(
          nextStatus
            ? "Activate this faculty account?"
            : "Deactivate this faculty account?"
        );

      if (!confirmed) {
        return;
      }

      try {
        setStatusUpdating(
          true
        );

        setError("");
        setSuccess("");

        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          navigate("/");
          return;
        }

        const data =
          await apiPatch(
            `/admin/faculty/${facultyId}/status`,
            {
              isActive:
                nextStatus,
            }
          );

        setSuccess(
          data?.message ||
            "Faculty account status updated successfully."
        );

        await fetchFaculty(
          true
        );

        if (
          selectedFaculty?.id ===
          facultyId
        ) {
          await openFacultyDetails(
            facultyId
          );
        }
      } catch (
        err
      ) {
        console.error(
          "Faculty status update error:",
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
            "Failed to update faculty account status."
        );
      } finally {
        setStatusUpdating(
          false
        );
      }
    };

  /* ==========================================================
     DESIGNATION OPTIONS
  ========================================================== */

  const designationOptions =
    useMemo(() => {
      return [
        ...new Set(
          faculty
            .map(
              (
                member
              ) =>
                member
                  ?.designation
            )
            .filter(
              Boolean
            )
        ),
      ].sort(
        (
          a,
          b
        ) =>
          String(a).localeCompare(
            String(b)
          )
      );
    }, [
      faculty,
    ]);

  /* ==========================================================
     PROCESSED FACULTY
  ========================================================== */

  const processedFaculty =
    useMemo(() => {
      let result =
        [...faculty];

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
              member
            ) => {
              const searchable =
                [
                  getFacultyName(
                    member
                  ),
                  getFacultyEmail(
                    member
                  ),
                  member?.employeeId,
                  member?.designation,
                  getDepartmentName(
                    member
                  ),
                  getDepartmentCode(
                    member
                  ),
                ]
                  .join(" ")
                  .toLowerCase();

              return searchable.includes(
                term
              );
            }
          );
      }

      if (
        statusFilter !==
        "ALL"
      ) {
        result =
          result.filter(
            (
              member
            ) =>
              (
                isMemberActive(
                  member
                )
                  ? "ACTIVE"
                  : "INACTIVE"
              ) ===
              statusFilter
          );
      }

      if (
        designationFilter !==
        "ALL"
      ) {
        result =
          result.filter(
            (
              member
            ) =>
              String(
                member?.designation ||
                  ""
              ) ===
              String(
                designationFilter
              )
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
            "employeeId"
          ) {
            comparison =
              String(
                a?.employeeId ||
                  ""
              ).localeCompare(
                String(
                  b?.employeeId ||
                    ""
                )
              );
          } else if (
            sortBy ===
            "department"
          ) {
            comparison =
              getDepartmentName(
                a
              ).localeCompare(
                getDepartmentName(
                  b
                )
              );
          } else if (
            sortBy ===
            "courses"
          ) {
            comparison =
              getCourseCount(
                a
              ) -
              getCourseCount(
                b
              );
          } else if (
            sortBy ===
            "status"
          ) {
            comparison =
              (
                isMemberActive(
                  a
                )
                  ? 1
                  : 0
              ) -
              (
                isMemberActive(
                  b
                )
                  ? 1
                  : 0
              );
          } else {
            comparison =
              getFacultyName(
                a
              ).localeCompare(
                getFacultyName(
                  b
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
      faculty,
      search,
      statusFilter,
      designationFilter,
      sortBy,
      sortDirection,
    ]);

  /* ==========================================================
     SUMMARY STATS
  ========================================================== */

  const totalFaculty =
    faculty.length;

  const activeFacultyCount =
    faculty.filter(
      (
        member
      ) =>
        isMemberActive(
          member
        )
    ).length;

  const inactiveFacultyCount =
    Math.max(
      totalFaculty -
        activeFacultyCount,
      0
    );

  const totalCoursesAssigned =
    faculty.reduce(
      (
        total,
        member
      ) =>
        total +
        getCourseCount(
          member
        ),
      0
    );

  const averageCourses =
    totalFaculty >
    0
      ? (
          totalCoursesAssigned /
          totalFaculty
        ).toFixed(1)
      : "0.0";

  const uniqueDepartments =
    new Set(
      faculty
        .map(
          (
            member
          ) =>
            getDepartmentCode(
              member
            )
        )
        .filter(
          (
            code
          ) =>
            code &&
            code !== "—"
        )
    ).size;

  const activePercentage =
    totalFaculty >
    0
      ? Math.round(
          (
            activeFacultyCount /
            totalFaculty
          ) *
            100
        )
      : 0;

  const hasFilters =
    Boolean(
      search.trim()
    ) ||
    Boolean(
      departmentId
    ) ||
    statusFilter !==
      "ALL" ||
    designationFilter !==
      "ALL";

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
                Faculty Management
              </h1>

              <p className="hidden text-xs text-slate-500 sm:block">
                Manage faculty profiles, teaching load and account access.
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
                setCreatedCredentials(null);
                setCreateFacultyForm({
                  firstName: "",
                  lastName: "",
                  employeeId: "",
                  departmentId: "",
                });
                setShowCreateModal(true);
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 sm:px-4"
            >
              <Plus size={17} />
              <span className="hidden sm:inline">Add Faculty</span>
            </button>

            <button
              type="button"
              onClick={() =>
                fetchFaculty(
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
                  Faculty Administration
                </span>

                <span className="rounded-full bg-green-400/20 px-3 py-1.5 text-xs font-bold text-green-100">
                  {activeFacultyCount} Active
                </span>

                {inactiveFacultyCount >
                  0 && (
                  <span className="rounded-full bg-red-400/20 px-3 py-1.5 text-xs font-bold text-red-100">
                    {inactiveFacultyCount} Inactive
                  </span>
                )}

              </div>

              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                Faculty operations at a glance
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
                Review faculty members, departments, course assignments and account activity from one centralized administrative workspace.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">

                <HeroTag
                  icon={
                    <Users
                      size={14}
                    />
                  }
                  text={`${totalFaculty} faculty members`}
                />

                <HeroTag
                  icon={
                    <BookOpen
                      size={14}
                    />
                  }
                  text={`${totalCoursesAssigned} course assignments`}
                />

                <HeroTag
                  icon={
                    <School
                      size={14}
                    />
                  }
                  text={`${uniqueDepartments} departments`}
                />

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              <HeroMetric
                value={
                  totalFaculty
                }
                label="Faculty"
              />

              <HeroMetric
                value={
                  activeFacultyCount
                }
                label="Active"
              />

              <HeroMetric
                value={
                  totalCoursesAssigned
                }
                label="Course Load"
              />

              <HeroMetric
                value={`${activePercentage}%`}
                label="Active Rate"
              />

            </div>

          </div>

        </section>

        {/* ====================================================
            MESSAGES
        ==================================================== */}

        {success && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-700">

            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">

              <p className="font-bold">
                Success
              </p>

              <p className="mt-1 text-sm">
                {success}
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setSuccess("")
              }
              className="text-green-500 hover:text-green-700"
            >
              <X size={17} />
            </button>

          </div>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">

            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">

              <p className="font-bold">
                Faculty management error
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
              <Users size={21} />
            }
            label="Total Faculty"
            value={
              totalFaculty
            }
            description="Faculty records"
            tone="blue"
          />

          <KpiCard
            icon={
              <ShieldCheck
                size={21}
              />
            }
            label="Active Accounts"
            value={
              activeFacultyCount
            }
            description={`${activePercentage}% of faculty accounts`}
            tone="green"
          />

          <KpiCard
            icon={
              <BookOpen size={21} />
            }
            label="Course Assignments"
            value={
              totalCoursesAssigned
            }
            description={`Average ${averageCourses} courses per faculty`}
            tone="purple"
          />

          <KpiCard
            icon={
              <School size={21} />
            }
            label="Departments"
            value={
              uniqueDepartments
            }
            description="Departments represented"
            tone="amber"
          />

        </section>

        {/* ====================================================
            ANALYTICS
        ==================================================== */}

        <section className="mt-8 grid gap-6 lg:grid-cols-3">

          <AnalyticsPanel
            title="Account Health"
            icon={
              <Activity
                size={20}
              />
            }
            iconClass="bg-green-50 text-green-600"
          >

            <ProgressMetric
              label="Active Faculty"
              value={
                activePercentage
              }
              detail={`${activeFacultyCount} of ${totalFaculty} accounts active`}
              tone="green"
            />

            <div className="mt-4 grid grid-cols-2 gap-3">

              <MetricBox
                label="Active"
                value={
                  activeFacultyCount
                }
                valueClass="text-green-600"
              />

              <MetricBox
                label="Inactive"
                value={
                  inactiveFacultyCount
                }
                valueClass="text-red-600"
              />

            </div>

          </AnalyticsPanel>

          <AnalyticsPanel
            title="Teaching Load"
            icon={
              <BookOpen
                size={20}
              />
            }
            iconClass="bg-purple-50 text-purple-600"
          >

            <div className="grid grid-cols-2 gap-3">

              <MetricBox
                label="Total Assignments"
                value={
                  totalCoursesAssigned
                }
                valueClass="text-purple-600"
              />

              <MetricBox
                label="Avg / Faculty"
                value={
                  averageCourses
                }
                valueClass="text-blue-600"
              />

            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4">

              <div className="flex items-center justify-between">

                <span className="text-xs font-semibold text-slate-500">
                  Faculty with courses
                </span>

                <span className="text-sm font-bold text-slate-800">
                  {
                    faculty.filter(
                      (
                        member
                      ) =>
                        getCourseCount(
                          member
                        ) >
                        0
                    ).length
                  }
                  /
                  {
                    totalFaculty
                  }
                </span>

              </div>

            </div>

          </AnalyticsPanel>

          <AnalyticsPanel
            title="Institution Coverage"
            icon={
              <School
                size={20}
              />
            }
            iconClass="bg-blue-50 text-blue-600"
          >

            <div className="grid grid-cols-2 gap-3">

              <MetricBox
                label="Departments"
                value={
                  uniqueDepartments
                }
              />

              <MetricBox
                label="Designations"
                value={
                  designationOptions.length
                }
              />

            </div>

            <div className="mt-3 rounded-xl bg-slate-50 p-4">

              <p className="text-xs font-semibold text-slate-500">
                Highest course load
              </p>

              <p className="mt-1 text-xl font-bold text-slate-800">

                {totalFaculty >
                0
                  ? Math.max(
                      ...faculty.map(
                        (
                          member
                        ) =>
                          getCourseCount(
                            member
                          )
                      )
                    )
                  : 0}

              </p>

              <p className="mt-1 text-xs text-slate-400">
                courses assigned to a single faculty member
              </p>

            </div>

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
                  Find faculty by profile, department, role or account status.
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
            className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"
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
                placeholder="Name, employee ID, designation or email..."
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

            <select
              value={
                designationFilter
              }
              onChange={(
                event
              ) =>
                setDesignationFilter(
                  event.target
                    .value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >

              <option value="ALL">
                All Designations
              </option>

              {designationOptions.map(
                (
                  designation
                ) => (
                  <option
                    key={
                      designation
                    }
                    value={
                      designation
                    }
                  >
                    {
                      designation
                    }
                  </option>
                )
              )}

            </select>

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
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >

              <option value="ALL">
                All Accounts
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="INACTIVE">
                Inactive
              </option>

            </select>

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

                <option value="employeeId">
                  Sort by Employee ID
                </option>

                <option value="department">
                  Sort by Department
                </option>

                <option value="courses">
                  Sort by Courses
                </option>

                <option value="status">
                  Sort by Status
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
                <SortAsc
                  size={18}
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
                  processedFaculty.length
                }
              </span>
              {" "}
              of{" "}
              <span className="font-bold text-slate-700">
                {
                  faculty.length
                }
              </span>
              {" "}
              faculty member
              {
                faculty.length ===
                1
                  ? ""
                  : "s"
              }

            </p>

            <div className="flex items-center gap-2">

              <span className="hidden text-xs font-semibold text-slate-400 sm:inline">
                View
              </span>

              <button
                type="button"
                onClick={() =>
                  setViewMode(
                    "table"
                  )
                }
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${
                  viewMode ===
                  "table"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >

                <List
                  size={14}
                />

                Table

              </button>

              <button
                type="button"
                onClick={() =>
                  setViewMode(
                    "cards"
                  )
                }
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${
                  viewMode ===
                  "cards"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >

                <LayoutGrid
                  size={14}
                />

                Cards

              </button>

            </div>

          </div>

        </section>

        {/* ====================================================
            RECORDS
        ==================================================== */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <BriefcaseBusiness
                    size={21}
                    className="text-blue-600"
                  />

                  <h2 className="text-lg font-bold text-slate-800">
                    Faculty Records
                  </h2>

                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Review faculty profiles, teaching assignments and account status.
                </p>

              </div>

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                  {
                    processedFaculty.length
                  } displayed
                </span>

                <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                  {activeFacultyCount} active
                </span>

              </div>

            </div>

          </div>

          {loading ? (
            <FacultyTableSkeleton />
          ) : processedFaculty.length ===
            0 ? (
            <EmptyFaculty
              hasFilters={
                hasFilters
              }
              onClear={
                clearFilters
              }
            />
          ) : viewMode ===
            "table" ? (
            <FacultyTable
              faculty={
                processedFaculty
              }
              onView={
                openFacultyDetails
              }
              onStatus={
                updateFacultyStatus
              }
              statusUpdating={
                statusUpdating
              }
            />
          ) : (
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">

              {processedFaculty.map(
                (
                  member
                ) => (
                  <FacultyCard
                    key={
                      member.id
                    }
                    member={
                      member
                    }
                    onView={
                      openFacultyDetails
                    }
                    onStatus={
                      updateFacultyStatus
                    }
                    statusUpdating={
                      statusUpdating
                    }
                  />
                )
              )}

            </div>
          )}

        </section>

      </main>

      {showCreateModal && (
        <CreateFacultyModal
          departments={departments}
          form={createFacultyForm}
          setForm={setCreateFacultyForm}
          loading={creatingFaculty}
          credentials={createdCredentials}
          onSubmit={handleCreateFaculty}
          onClose={() => {
            if (!creatingFaculty) {
              setShowCreateModal(false);
              setCreatedCredentials(null);
            }
          }}
        />
      )}

      {/* ======================================================
          FACULTY DETAILS MODAL
      ====================================================== */}

      {selectedFaculty && (
        <FacultyDetailsModal
          faculty={
            selectedFaculty
          }
          loading={
            detailsLoading
          }
          onClose={() =>
            setSelectedFaculty(
              null
            )
          }
          onStatus={() =>
            updateFacultyStatus(
              selectedFaculty.id,
              selectedFaculty.user
                ?.isActive
            )
          }
          statusUpdating={
            statusUpdating
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
   PROGRESS METRIC
============================================================ */

function ProgressMetric({
  label,
  value,
  detail,
  tone,
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

  const barStyles = {
    blue:
      "bg-blue-600",
    green:
      "bg-green-500",
    purple:
      "bg-purple-600",
    amber:
      "bg-amber-500",
  };

  return (
    <div>

      <div className="flex items-center justify-between gap-3">

        <span className="text-sm font-semibold text-slate-700">
          {label}
        </span>

        <span className="text-sm font-bold text-slate-800">
          {
            safeValue
          }%
        </span>

      </div>

      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">

        <div
          className={`h-full rounded-full ${
            barStyles[tone] ||
            barStyles.blue
          }`}
          style={{
            width: `${safeValue}%`,
          }}
        />

      </div>

      <p className="mt-1 text-xs text-slate-400">
        {detail}
      </p>

    </div>
  );
}

/* ============================================================
   METRIC BOX
============================================================ */

function MetricBox({
  label,
  value,
  valueClass = "text-slate-800",
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">

      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-bold ${valueClass}`}
      >
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   FACULTY TABLE
============================================================ */

function FacultyTable({
  faculty,
  onView,
  onStatus,
  statusUpdating,
}) {
  return (
    <div className="overflow-x-auto">

      <table className="w-full min-w-[1180px]">

        <thead className="border-b border-slate-200 bg-slate-50">

          <tr>

            <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Faculty
            </th>

            <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Employee ID
            </th>

            <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Department
            </th>

            <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Designation
            </th>

            <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Teaching Load
            </th>

            <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Account
            </th>

            <th className="px-5 py-4 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Actions
            </th>

          </tr>

        </thead>

        <tbody className="divide-y divide-slate-100">

          {faculty.map(
            (
              member
            ) => {

              const active =
                isMemberActive(
                  member
                );

              const courseCount =
                getCourseCount(
                  member
                );

              return (
                <tr
                  key={
                    member.id
                  }
                  className="transition hover:bg-slate-50"
                >

                  {/* FACULTY */}

                  <td className="px-5 py-5">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-600">

                        {
                          getFacultyInitials(
                            member
                          )
                        }

                      </div>

                      <div className="min-w-0">

                        <p className="truncate font-bold text-slate-800">
                          {
                            getFacultyName(
                              member
                            )
                          }
                        </p>

                        <div className="mt-1 flex max-w-[230px] items-center gap-1 text-xs text-slate-500">

                          <Mail
                            size={
                              12
                            }
                          />

                          <span className="truncate">
                            {
                              getFacultyEmail(
                                member
                              ) ||
                              "Email not available"
                            }
                          </span>

                        </div>

                      </div>

                    </div>

                  </td>

                  {/* EMPLOYEE ID */}

                  <td className="px-5 py-5">

                    <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                      {
                        member.employeeId ||
                        "—"
                      }
                    </span>

                  </td>

                  {/* DEPARTMENT */}

                  <td className="px-5 py-5">

                    <p className="font-bold text-slate-700">
                      {
                        getDepartmentCode(
                          member
                        )
                      }
                    </p>

                    <p className="mt-1 max-w-[180px] text-xs text-slate-500">
                      {
                        getDepartmentName(
                          member
                        )
                      }
                    </p>

                  </td>

                  {/* DESIGNATION */}

                  <td className="px-5 py-5">

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">

                      <BriefcaseBusiness
                        size={
                          13
                        }
                      />

                      {
                        member.designation ||
                        "Not specified"
                      }

                    </span>

                  </td>

                  {/* COURSES */}

                  <td className="px-5 py-5">

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">

                        <BookOpen
                          size={
                            17
                          }
                        />

                      </div>

                      <div>

                        <p className="font-bold text-slate-700">
                          {
                            courseCount
                          }
                        </p>

                        <p className="text-[10px] text-slate-400">
                          assigned course
                          {
                            courseCount ===
                            1
                              ? ""
                              : "s"
                          }
                        </p>

                      </div>

                    </div>

                  </td>

                  {/* ACCOUNT */}

                  <td className="px-5 py-5">

                    {active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">

                        <ShieldCheck
                          size={
                            14
                          }
                        />

                        Active

                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">

                        <ShieldOff
                          size={
                            14
                          }
                        />

                        Inactive

                      </span>
                    )}

                  </td>

                  {/* ACTIONS */}

                  <td className="px-5 py-5">

                    <div className="flex items-center justify-end gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          onView(
                            member.id
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >

                        <Eye
                          size={
                            15
                          }
                        />

                        View

                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onStatus(
                            member.id,
                            active
                          )
                        }
                        disabled={
                          statusUpdating
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                          active
                            ? "bg-red-50 text-red-700 hover:bg-red-100"
                            : "bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                      >

                        {active ? (
                          <>
                            <ShieldOff
                              size={
                                15
                              }
                            />

                            Disable
                          </>
                        ) : (
                          <>
                            <ShieldCheck
                              size={
                                15
                              }
                            />

                            Activate
                          </>
                        )}

                      </button>

                    </div>

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
   FACULTY CARD
============================================================ */

function FacultyCard({
  member,
  onView,
  onStatus,
  statusUpdating,
}) {
  const active =
    isMemberActive(
      member
    );

  const courseCount =
    getCourseCount(
      member
    );

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">

      <div className="flex items-start justify-between gap-3">

        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-600">

            {
              getFacultyInitials(
                member
              )
            }

          </div>

          <div className="min-w-0">

            <h3 className="truncate font-bold text-slate-800">
              {
                getFacultyName(
                  member
                )
              }
            </h3>

            <p className="mt-1 text-xs font-semibold text-blue-600">
              {
                member.employeeId ||
                "Employee ID not available"
              }
            </p>

          </div>

        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
            active
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {active
            ? "Active"
            : "Inactive"}
        </span>

      </div>

      <div className="mt-5">

        <div className="rounded-xl bg-blue-50 p-3">

          <p className="text-[10px] font-bold uppercase tracking-wide text-blue-500">
            Designation
          </p>

          <p className="mt-1 text-sm font-bold text-blue-900">
            {
              member.designation ||
              "Not specified"
            }
          </p>

        </div>

      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">

        <CardInfo
          label="Department"
          value={
            getDepartmentCode(
              member
            )
          }
        />

        <CardInfo
          label="Courses"
          value={
            courseCount
          }
        />

      </div>

      <div className="mt-3 rounded-xl border border-slate-200 p-3">

        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Department
        </p>

        <p className="mt-1 text-sm font-bold text-slate-700">
          {
            getDepartmentName(
              member
            )
          }
        </p>

      </div>

      {getFacultyEmail(
        member
      ) && (
        <a
          href={`mailto:${getFacultyEmail(
            member
          )}`}
          className="mt-4 flex items-center gap-2 break-all text-xs text-slate-500 hover:text-blue-600"
        >

          <Mail
            size={14}
          />

          {
            getFacultyEmail(
              member
            )
          }

        </a>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">

        <button
          type="button"
          onClick={() =>
            onView(
              member.id
            )
          }
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >

          <Eye
            size={14}
          />

          View Details

        </button>

        <button
          type="button"
          onClick={() =>
            onStatus(
              member.id,
              active
            )
          }
          disabled={
            statusUpdating
          }
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${
            active
              ? "bg-red-50 text-red-700 hover:bg-red-100"
              : "bg-green-50 text-green-700 hover:bg-green-100"
          }`}
        >

          {active ? (
            <>
              <ShieldOff
                size={14}
              />

              Disable
            </>
          ) : (
            <>
              <ShieldCheck
                size={14}
              />

              Activate
            </>
          )}

        </button>

      </div>

    </article>
  );
}

/* ============================================================
   CARD INFO
============================================================ */

function CardInfo({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">

      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-700">
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   DETAILS MODAL
============================================================ */

function CreateFacultyModal({
  departments,
  form,
  setForm,
  loading,
  credentials,
  onSubmit,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">

      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Faculty Account
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-800">
              Add Faculty
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-5 sm:p-6">
          {credentials ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-green-600" size={21} />
                  <div>
                    <p className="font-bold text-green-800">Faculty account created</p>
                    <p className="mt-1 text-sm leading-6 text-green-700">
                      Give these temporary credentials to the faculty member. They must change the password after first login.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">College Email</p>
                  <p className="mt-2 break-all text-sm font-bold text-slate-800">
                    {credentials.email}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Temporary Password</p>
                  <p className="mt-2 text-sm font-bold text-slate-800">
                    {credentials.temporaryPassword || "Campus@123"}
                  </p>
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">First Name</span>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                    placeholder="Enter first name"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    disabled={loading}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Last Name</span>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                    placeholder="Enter last name"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    disabled={loading}
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Employee ID</span>
                <input
                  type="text"
                  value={form.employeeId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      employeeId: event.target.value,
                    }))
                  }
                  placeholder="Example: FAC001"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-slate-400">
                  The college email will be generated as EmployeeID@campus360.com.
                </p>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Department</span>
                <select
                  value={form.departmentId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      departmentId: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  disabled={loading}
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.code
                        ? `${department.code} — ${department.name}`
                        : department.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                  Login Credentials
                </p>
                <p className="mt-2 text-sm leading-6 text-blue-800">
                  The system will automatically use <strong>Campus@123</strong> as the temporary password. The faculty member must change it on first login.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Create Faculty
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>

    </div>
  );
}

function FacultyDetailsModal({
  faculty,
  loading,
  onClose,
  onStatus,
  statusUpdating,
}) {
  const active =
    isMemberActive(
      faculty
    );

  const courses =
    Array.isArray(
      faculty?.courses
    )
      ? faculty.courses
      : [];

  const timetableCount =
    Number(
      faculty?._count
        ?.timetable ||
        0
    );

  const assignmentsCount =
    Number(
      faculty?._count
        ?.assignments ||
        0
    );

  const examsCount =
    Number(
      faculty?._count?.exams ||
        0
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">

      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">

          <div>

            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Faculty Profile
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-800">
              Faculty Details
            </h2>

          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
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
                Loading faculty details...
              </p>

            </div>

          </div>

        ) : (

          <div className="overflow-y-auto p-5 sm:p-6">

            {/* PROFILE HERO */}

            <section className="rounded-2xl bg-blue-600 p-5 text-white sm:p-6">

              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                <div className="flex items-center gap-4">

                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold">

                    {
                      getFacultyInitials(
                        faculty
                      )
                    }

                  </div>

                  <div className="min-w-0">

                    <h3 className="truncate text-2xl font-bold">
                      {
                        getFacultyName(
                          faculty
                        )
                      }
                    </h3>

                    <p className="mt-1 text-sm text-blue-100">
                      {
                        faculty.employeeId ||
                        "Employee ID not available"
                      }
                    </p>

                    <p className="mt-1 text-xs text-blue-200">
                      {
                        getDepartmentCode(
                          faculty
                        )
                      }
                      {" · "}
                      {
                        faculty.designation ||
                        "Faculty"
                      }
                    </p>

                  </div>

                </div>

                <span
                  className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${
                    active
                      ? "bg-green-400/20 text-green-100"
                      : "bg-red-400/20 text-red-100"
                  }`}
                >

                  {active ? (
                    <ShieldCheck
                      size={15}
                    />
                  ) : (
                    <ShieldOff
                      size={15}
                    />
                  )}

                  {active
                    ? "Active Account"
                    : "Inactive Account"}

                </span>

              </div>

            </section>

            {/* PROFESSIONAL INFORMATION */}

            <section className="mt-6">

              <SectionTitle
                title="Professional Information"
                icon={
                  <BriefcaseBusiness
                    size={19}
                  />
                }
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                <InfoItem
                  label="Email"
                  value={
                    getFacultyEmail(
                      faculty
                    ) ||
                    "Not provided"
                  }
                  icon={
                    <Mail
                      size={15}
                    />
                  }
                />

                <InfoItem
                  label="Employee ID"
                  value={
                    faculty.employeeId ||
                    "Not provided"
                  }
                  icon={
                    <UserRound
                      size={15}
                    />
                  }
                />

                <InfoItem
                  label="Designation"
                  value={
                    faculty.designation ||
                    "Not specified"
                  }
                  icon={
                    <BriefcaseBusiness
                      size={15}
                    />
                  }
                />

                <InfoItem
                  label="Department"
                  value={
                    getDepartmentName(
                      faculty
                    )
                  }
                  icon={
                    <School
                      size={15}
                    />
                  }
                />

              </div>

            </section>

            {/* TEACHING ANALYTICS */}

            <section className="mt-6">

              <SectionTitle
                title="Teaching Activity"
                icon={
                  <Activity
                    size={19}
                  />
                }
              />

              <div className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-4">

                <StatBox
                  label="Courses"
                  value={
                    faculty?._count
                      ?.courses ??
                    courses.length
                  }
                  icon={
                    <BookOpen
                      size={18}
                    />
                  }
                  tone="blue"
                />

                <StatBox
                  label="Timetable Entries"
                  value={
                    timetableCount
                  }
                  icon={
                    <CalendarDays
                      size={18}
                    />
                  }
                  tone="purple"
                />

                <StatBox
                  label="Assignments"
                  value={
                    assignmentsCount
                  }
                  icon={
                    <Layers3
                      size={18}
                    />
                  }
                  tone="amber"
                />

                <StatBox
                  label="Exams"
                  value={
                    examsCount
                  }
                  icon={
                    <GraduationCap
                      size={18}
                    />
                  }
                  tone="green"
                />

              </div>

            </section>

            {/* COURSES */}

            <section className="mt-6">

              <div className="flex items-center justify-between gap-3">

                <SectionTitle
                  title="Assigned Courses"
                  icon={
                    <BookOpen
                      size={19}
                    />
                  }
                />

                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">

                  {
                    courses.length
                  }{" "}
                  course
                  {
                    courses.length ===
                    1
                      ? ""
                      : "s"
                  }

                </span>

              </div>

              {courses.length >
              0 ? (

                <div className="mt-4 grid gap-4 md:grid-cols-2">

                  {courses.map(
                    (
                      course
                    ) => (
                      <div
                        key={
                          course.id
                        }
                        className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-slate-50"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <p className="font-bold text-slate-700">
                              {
                                course.code ||
                                "Course"
                              }
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {
                                course.name ||
                                "Unnamed course"
                              }
                            </p>

                          </div>

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">

                            <BookOpen
                              size={17}
                            />

                          </div>

                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">

                            {
                              course.credits ??
                              0
                            }{" "}
                            Credits

                          </span>

                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">

                            Semester{" "}
                            {
                              course.semester ??
                              "—"
                            }

                          </span>

                          {course.type && (
                            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-bold text-purple-700">

                              {
                                course.type
                              }

                            </span>
                          )}

                        </div>

                        {course.program
                          ?.name && (
                          <p className="mt-3 text-xs text-slate-400">

                            Program:{" "}
                            {
                              course
                                .program
                                .name
                            }

                          </p>
                        )}

                      </div>
                    )
                  )}

                </div>

              ) : (

                <div className="mt-4 rounded-2xl bg-slate-50 p-8 text-center">

                  <BookOpen
                    size={30}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    No courses assigned
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    This faculty member currently has no assigned courses.
                  </p>

                </div>

              )}

            </section>

            {/* CONTACT */}

            <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">

                  <Mail
                    size={18}
                  />

                </div>

                <div>

                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    Contact
                  </p>

                  <p className="mt-1 text-sm font-bold text-blue-900">
                    {
                      getFacultyEmail(
                        faculty
                      ) ||
                      "No email address available"
                    }
                  </p>

                  {getFacultyEmail(
                    faculty
                  ) && (
                    <a
                      href={`mailto:${getFacultyEmail(
                        faculty
                      )}`}
                      className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-900"
                    >
                      Send Email
                      <Eye
                        size={13}
                      />
                    </a>
                  )}

                </div>

              </div>

            </section>

            {/* FOOTER */}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={
                  onClose
                }
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>

              <button
                type="button"
                onClick={
                  onStatus
                }
                disabled={
                  statusUpdating
                }
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${
                  active
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >

                {active ? (
                  <>
                    <ShieldOff
                      size={17}
                    />

                    Deactivate Account
                  </>
                ) : (
                  <>
                    <ShieldCheck
                      size={17}
                    />

                    Activate Account
                  </>
                )}

              </button>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}

/* ============================================================
   SECTION TITLE
============================================================ */

function SectionTitle({
  title,
  icon,
}) {
  return (
    <div className="flex items-center gap-2">

      <span className="text-blue-600">
        {icon}
      </span>

      <h3 className="font-bold text-slate-800">
        {title}
      </h3>

    </div>
  );
}

/* ============================================================
   INFO ITEM
============================================================ */

function InfoItem({
  label,
  value,
  icon,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">

      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">

        <span className="text-blue-600">
          {icon}
        </span>

        {label}

      </div>

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
   STAT BOX
============================================================ */

function StatBox({
  label,
  value,
  icon,
  tone,
}) {
  const styles = {
    blue:
      "bg-blue-50 text-blue-600",
    purple:
      "bg-purple-50 text-purple-600",
    amber:
      "bg-amber-50 text-amber-600",
    green:
      "bg-green-50 text-green-600",
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

        <p className="text-2xl font-bold text-slate-800">
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
   EMPTY
============================================================ */

function EmptyFaculty({
  hasFilters,
  onClear,
}) {
  return (
    <div className="p-12 text-center">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

        <UserRound
          size={31}
        />

      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-800">
        No faculty found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilters
          ? "No faculty records match your current search or filters."
          : "There are currently no faculty records available."}
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

function FacultyTableSkeleton() {
  return (
    <div className="space-y-4 p-6">

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
            className="animate-pulse rounded-xl bg-slate-100 p-5"
          >

            <div className="grid grid-cols-6 gap-4">

              <div className="h-10 rounded-lg bg-slate-200" />
              <div className="h-10 rounded-lg bg-slate-200" />
              <div className="h-10 rounded-lg bg-slate-200" />
              <div className="h-10 rounded-lg bg-slate-200" />
              <div className="h-10 rounded-lg bg-slate-200" />
              <div className="h-10 rounded-lg bg-slate-200" />

            </div>

          </div>
        )
      )}

    </div>
  );
}

export default AdminFaculty;