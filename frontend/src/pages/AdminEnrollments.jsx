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
  CheckCircle2,
  ChevronRight,
  Eye,
  Filter,
  GraduationCap,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UserRound,
  Users,
  X,
  Activity,
  CalendarDays,
  Building2,
  Layers3,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from "../api";

/* ============================================================
   RESPONSE HELPERS
============================================================ */

function normalizeList(
  response,
  keys = []
) {
  for (
    const key of keys
  ) {
    if (
      Array.isArray(
        response?.[key]
      )
    ) {
      return response[key];
    }

    if (
      Array.isArray(
        response?.data?.[key]
      )
    ) {
      return response.data[key];
    }
  }

  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }

  if (
    Array.isArray(
      response?.data?.data
    )
  ) {
    return response.data.data;
  }

  return [];
}

function normalizeSingle(
  response,
  keys = []
) {
  for (
    const key of keys
  ) {
    if (
      response?.[key] &&
      typeof response[key] ===
        "object"
    ) {
      return response[key];
    }

    if (
      response?.data?.[key] &&
      typeof response.data[key] ===
        "object"
    ) {
      return response.data[key];
    }
  }

  if (
    response?.data?.data &&
    typeof response.data.data ===
      "object"
  ) {
    return response.data.data;
  }

  if (
    response?.data &&
    typeof response.data ===
      "object" &&
    !Array.isArray(
      response.data
    )
  ) {
    return response.data;
  }

  return null;
}

function getDepartmentId(
  item
) {
  return (
    item?.departmentId ??
    item?.department?.id ??
    null
  );
}

function getProgramId(
  item
) {
  return (
    item?.programId ??
    item?.program?.id ??
    null
  );
}

function getCourseId(
  item
) {
  return (
    item?.courseId ??
    item?.course?.id ??
    null
  );
}

function getStudentId(
  item
) {
  return (
    item?.studentId ??
    item?.student?.id ??
    null
  );
}

function getStudentName(
  student
) {
  const name =
    `${student?.user?.firstName || ""} ${
      student?.user?.lastName || ""
    }`.trim();

  return (
    name ||
    student?.name ||
    student?.fullName ||
    "Unnamed Student"
  );
}

function getFacultyName(
  faculty
) {
  if (!faculty) {
    return "Not Assigned";
  }

  const name =
    `${faculty?.user?.firstName || ""} ${
      faculty?.user?.lastName || ""
    }`.trim();

  return (
    name ||
    faculty?.name ||
    faculty?.fullName ||
    "Not Assigned"
  );
}

function getFacultyInitials(
  faculty
) {
  const name =
    getFacultyName(
      faculty
    );

  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length ===
    0
  ) {
    return "F";
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

function getProgress(
  enrollment
) {
  return Math.max(
    0,
    Math.min(
      Number(
        enrollment?.progressPercent ||
          0
      ),
      100
    )
  );
}

function formatCount(
  value
) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-IN"
  );
}

function formatDate(
  value
) {
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
    "en-IN"
  );
}

function formatDateTime(
  value
) {
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
    "en-IN"
  );
}

/* ============================================================
   AUTH
============================================================ */

function handleAuthenticationError(
  err,
  navigate
) {
  const message =
    String(
      err?.message || ""
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

/* ============================================================
   MAIN COMPONENT
============================================================ */

function AdminEnrollments() {
  const navigate =
    useNavigate();

  /* ==========================================================
     DATA
  ========================================================== */

  const [
    enrollments,
    setEnrollments,
  ] = useState([]);

  const [
    students,
    setStudents,
  ] = useState([]);

  const [
    courses,
    setCourses,
  ] = useState([]);

  const [
    departments,
    setDepartments,
  ] = useState([]);

  const [
    programs,
    setPrograms,
  ] = useState([]);

  /* ==========================================================
     DETAILS
  ========================================================== */

  const [
    selectedEnrollment,
    setSelectedEnrollment,
  ] = useState(null);

  /* ==========================================================
     FILTERS
  ========================================================== */

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    studentId,
    setStudentId,
  ] = useState("");

  const [
    courseId,
    setCourseId,
  ] = useState("");

  const [
    departmentId,
    setDepartmentId,
  ] = useState("");

  const [
    programId,
    setProgramId,
  ] = useState("");

  const [
    progressFilter,
    setProgressFilter,
  ] = useState("ALL");

  /* ==========================================================
     VIEW / SORT
  ========================================================== */

  const [
    viewMode,
    setViewMode,
  ] = useState("table");

  const [
    sortBy,
    setSortBy,
  ] = useState("student");

  const [
    sortDirection,
    setSortDirection,
  ] = useState("asc");

  /* ==========================================================
     ADD FORM
  ========================================================== */

  const [
    formStudentId,
    setFormStudentId,
  ] = useState("");

  const [
    formCourseId,
    setFormCourseId,
  ] = useState("");

  const [
    formProgress,
    setFormProgress,
  ] = useState("0");

  const [
    showAddForm,
    setShowAddForm,
  ] = useState(false);

  /* ==========================================================
     LOADING
  ========================================================== */

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
    saving,
    setSaving,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState(null);

  const [
    updatingId,
    setUpdatingId,
  ] = useState(null);

  /* ==========================================================
     MESSAGES
  ========================================================== */

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  /* ==========================================================
     FETCH ENROLLMENTS
  ========================================================== */

  const fetchEnrollments =
    useCallback(
      async (
        showRefresh = false
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

          if (
            search.trim()
          ) {
            params.set(
              "search",
              search.trim()
            );
          }

          if (
            studentId
          ) {
            params.set(
              "studentId",
              studentId
            );
          }

          if (
            courseId
          ) {
            params.set(
              "courseId",
              courseId
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

          if (
            programId
          ) {
            params.set(
              "programId",
              programId
            );
          }

          const query =
            params.toString();

          const response =
            await apiGet(
              `/admin/enrollments${
                query
                  ? `?${query}`
                  : ""
              }`
            );

          const list =
            normalizeList(
              response,
              [
                "enrollments",
              ]
            );

          setEnrollments(
            list
          );
        } catch (
          err
        ) {
          console.error(
            "Admin enrollments error:",
            err
          );

          if (
            handleAuthenticationError(
              err,
              navigate
            )
          ) {
            return;
          }

          setError(
            err?.message ||
              "Failed to load enrollments."
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
        search,
        studentId,
        courseId,
        departmentId,
        programId,
        navigate,
      ]
    );

  /* ==========================================================
     REFERENCE DATA
  ========================================================== */

  const fetchReferenceData =
    useCallback(
      async () => {
        try {
          const [
            studentsResponse,
            coursesResponse,
            departmentsResponse,
            programsResponse,
          ] =
            await Promise.all(
              [
                apiGet(
                  "/admin/students"
                ),
                apiGet(
                  "/admin/courses"
                ),
                apiGet(
                  "/admin/departments"
                ),
                apiGet(
                  "/admin/programs"
                ),
              ]
            );

          setStudents(
            normalizeList(
              studentsResponse,
              [
                "students",
              ]
            )
          );

          setCourses(
            normalizeList(
              coursesResponse,
              [
                "courses",
              ]
            )
          );

          setDepartments(
            normalizeList(
              departmentsResponse,
              [
                "departments",
              ]
            )
          );

          setPrograms(
            normalizeList(
              programsResponse,
              [
                "programs",
              ]
            )
          );
        } catch (
          err
        ) {
          console.error(
            "Reference data error:",
            err
          );

          if (
            handleAuthenticationError(
              err,
              navigate
            )
          ) {
            return;
          }

          setError(
            err?.message ||
              "Failed to load reference data."
          );
        }
      },
      [navigate]
    );

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    fetchReferenceData();
  }, [
    fetchReferenceData,
  ]);

  useEffect(() => {
    fetchEnrollments();
  }, [
    fetchEnrollments,
  ]);

  /* ==========================================================
     OPEN DETAILS
  ========================================================== */

  const openEnrollmentDetails =
    async (
      enrollmentId
    ) => {
      try {
        setDetailsLoading(
          true
        );

        setError("");

        const response =
          await apiGet(
            `/admin/enrollments/${enrollmentId}`
          );

        const enrollment =
          normalizeSingle(
            response,
            [
              "enrollment",
            ]
          );

        if (
          !enrollment
        ) {
          throw new Error(
            "Enrollment details were not returned by the server."
          );
        }

        setSelectedEnrollment(
          enrollment
        );
      } catch (
        err
      ) {
        console.error(
          "Enrollment details error:",
          err
        );

        if (
          handleAuthenticationError(
            err,
            navigate
          )
        ) {
          return;
        }

        setError(
          err?.message ||
            "Failed to fetch enrollment details."
        );
      } finally {
        setDetailsLoading(
          false
        );
      }
    };

  /* ==========================================================
     CREATE
  ========================================================== */

  const createEnrollment =
    async (
      event
    ) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      if (
        !formStudentId ||
        !formCourseId
      ) {
        setError(
          "Please select both a student and a course."
        );

        return;
      }

      const progressValue =
        Number(
          formProgress || 0
        );

      if (
        !Number.isInteger(
          progressValue
        ) ||
        progressValue <
          0 ||
        progressValue >
          100
      ) {
        setError(
          "Initial progress must be an integer between 0 and 100."
        );

        return;
      }

      const alreadyEnrolled =
        enrollments.some(
          (
            enrollment
          ) =>
            String(
              getStudentId(
                enrollment
              )
            ) ===
              String(
                formStudentId
              ) &&
            String(
              getCourseId(
                enrollment
              )
            ) ===
              String(
                formCourseId
              )
        );

      if (
        alreadyEnrolled
      ) {
        setError(
          "This student is already enrolled in the selected course."
        );

        return;
      }

      try {
        setSaving(
          true
        );

        const response =
          await apiPost(
            "/admin/enrollments",
            {
              studentId:
                Number(
                  formStudentId
                ),

              courseId:
                Number(
                  formCourseId
                ),

              progressPercent:
                progressValue,
            }
          );

        setSuccess(
          response?.message ||
            "Student enrolled successfully."
        );

        setFormStudentId(
          ""
        );

        setFormCourseId(
          ""
        );

        setFormProgress(
          "0"
        );

        setShowAddForm(
          false
        );

        await fetchEnrollments(
          true
        );
      } catch (
        err
      ) {
        console.error(
          "Create enrollment error:",
          err
        );

        if (
          handleAuthenticationError(
            err,
            navigate
          )
        ) {
          return;
        }

        setError(
          err?.message ||
            "Failed to create enrollment."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  /* ==========================================================
     UPDATE PROGRESS
  ========================================================== */

  const updateProgress =
    async (
      enrollmentId,
      currentProgress
    ) => {
      const value =
        window.prompt(
          "Enter progress percentage (0-100):",
          String(
            currentProgress ??
              0
          )
        );

      if (
        value ===
        null
      ) {
        return;
      }

      const parsedValue =
        Number(
          value
        );

      if (
        !Number.isInteger(
          parsedValue
        ) ||
        parsedValue <
          0 ||
        parsedValue >
          100
      ) {
        setError(
          "Progress must be an integer between 0 and 100."
        );

        return;
      }

      try {
        setUpdatingId(
          enrollmentId
        );

        setError("");
        setSuccess("");

        const response =
          await apiPatch(
            `/admin/enrollments/${enrollmentId}`,
            {
              progressPercent:
                parsedValue,
            }
          );

        setSuccess(
          response?.message ||
            "Enrollment progress updated successfully."
        );

        await fetchEnrollments(
          true
        );

        if (
          selectedEnrollment?.id ===
          enrollmentId
        ) {
          await openEnrollmentDetails(
            enrollmentId
          );
        }
      } catch (
        err
      ) {
        console.error(
          "Update enrollment error:",
          err
        );

        if (
          handleAuthenticationError(
            err,
            navigate
          )
        ) {
          return;
        }

        setError(
          err?.message ||
            "Failed to update enrollment."
        );
      } finally {
        setUpdatingId(
          null
        );
      }
    };

  /* ==========================================================
     DELETE
  ========================================================== */

  const deleteEnrollment =
    async (
      enrollment
    ) => {
      const studentName =
        getStudentName(
          enrollment?.student
        );

      const courseCode =
        enrollment?.course
          ?.code ||
        "this course";

      const confirmed =
        window.confirm(
          `Remove ${studentName} from ${courseCode}? This will delete the enrollment record.`
        );

      if (
        !confirmed
      ) {
        return;
      }

      try {
        setDeletingId(
          enrollment.id
        );

        setError("");
        setSuccess("");

        const response =
          await apiDelete(
            `/admin/enrollments/${enrollment.id}`
          );

        setSuccess(
          response?.message ||
            "Enrollment removed successfully."
        );

        if (
          selectedEnrollment?.id ===
          enrollment.id
        ) {
          setSelectedEnrollment(
            null
          );
        }

        await fetchEnrollments(
          true
        );
      } catch (
        err
      ) {
        console.error(
          "Delete enrollment error:",
          err
        );

        if (
          handleAuthenticationError(
            err,
            navigate
          )
        ) {
          return;
        }

        setError(
          err?.message ||
            "Failed to remove enrollment."
        );
      } finally {
        setDeletingId(
          null
        );
      }
    };

  /* ==========================================================
     FILTER HELPERS
  ========================================================== */

  const filteredPrograms =
    useMemo(() => {
      if (
        !departmentId
      ) {
        return programs;
      }

      return programs.filter(
        (
          program
        ) =>
          String(
            getDepartmentId(
              program
            )
          ) ===
          String(
            departmentId
          )
      );
    }, [
      programs,
      departmentId,
    ]);

  const filteredCourses =
    useMemo(() => {
      return courses.filter(
        (
          course
        ) => {
          if (
            departmentId &&
            String(
              getDepartmentId(
                course
              )
            ) !==
              String(
                departmentId
              )
          ) {
            return false;
          }

          if (
            programId &&
            String(
              getProgramId(
                course
              )
            ) !==
              String(
                programId
              )
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      courses,
      departmentId,
      programId,
    ]);

  useEffect(() => {
    if (
      programId &&
      !filteredPrograms.some(
        (
          program
        ) =>
          String(
            program.id
          ) ===
          String(
            programId
          )
      )
    ) {
      setProgramId("");
    }
  }, [
    filteredPrograms,
    programId,
  ]);

  useEffect(() => {
    if (
      courseId &&
      !filteredCourses.some(
        (
          course
        ) =>
          String(
            course.id
          ) ===
          String(
            courseId
          )
      )
    ) {
      setCourseId("");
    }
  }, [
    filteredCourses,
    courseId,
  ]);

  /* ==========================================================
     PROCESSED ENROLLMENTS
  ========================================================== */

  const processedEnrollments =
    useMemo(() => {
      let result =
        [...enrollments];

      const searchTerm =
        search
          .trim()
          .toLowerCase();

      if (
        searchTerm
      ) {
        result =
          result.filter(
            (
              enrollment
            ) => {
              const searchable =
                [
                  getStudentName(
                    enrollment?.student
                  ),
                  enrollment
                    ?.student
                    ?.enrollmentNumber,
                  enrollment
                    ?.student
                    ?.user
                    ?.email,
                  enrollment
                    ?.course
                    ?.code,
                  enrollment
                    ?.course
                    ?.name,
                  enrollment
                    ?.course
                    ?.department
                    ?.name,
                  enrollment
                    ?.course
                    ?.department
                    ?.code,
                  enrollment
                    ?.course
                    ?.program
                    ?.name,
                  enrollment
                    ?.course
                    ?.program
                    ?.code,
                ]
                  .filter(
                    Boolean
                  )
                  .join(" ")
                  .toLowerCase();

              return searchable.includes(
                searchTerm
              );
            }
          );
      }

      if (
        progressFilter !==
        "ALL"
      ) {
        result =
          result.filter(
            (
              enrollment
            ) => {
              const progress =
                getProgress(
                  enrollment
                );

              if (
                progressFilter ===
                "NOT_STARTED"
              ) {
                return (
                  progress ===
                  0
                );
              }

              if (
                progressFilter ===
                "IN_PROGRESS"
              ) {
                return (
                  progress >
                    0 &&
                  progress <
                    100
                );
              }

              if (
                progressFilter ===
                "COMPLETED"
              ) {
                return (
                  progress ===
                  100
                );
              }

              return true;
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
            "course"
          ) {
            comparison =
              String(
                a?.course?.name ||
                  ""
              ).localeCompare(
                String(
                  b?.course?.name ||
                    ""
                )
              );
          } else if (
            sortBy ===
            "progress"
          ) {
            comparison =
              getProgress(
                a
              ) -
              getProgress(
                b
              );
          } else if (
            sortBy ===
            "date"
          ) {
            comparison =
              new Date(
                a?.enrolledAt ||
                  0
              ).getTime() -
              new Date(
                b?.enrolledAt ||
                  0
              ).getTime();
          } else if (
            sortBy ===
            "semester"
          ) {
            comparison =
              Number(
                a?.course
                  ?.semester ||
                  0
              ) -
              Number(
                b?.course
                  ?.semester ||
                  0
              );
          } else {
            comparison =
              getStudentName(
                a?.student
              ).localeCompare(
                getStudentName(
                  b?.student
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
      enrollments,
      search,
      progressFilter,
      sortBy,
      sortDirection,
    ]);

  /* ==========================================================
     SUMMARY
  ========================================================== */

  const totalEnrollments =
    enrollments.length;

  const completedCount =
    enrollments.filter(
      (
        enrollment
      ) =>
        getProgress(
          enrollment
        ) ===
        100
    ).length;

  const inProgressCount =
    enrollments.filter(
      (
        enrollment
      ) => {
        const progress =
          getProgress(
            enrollment
          );

        return (
          progress >
            0 &&
          progress <
            100
        );
      }
    ).length;

  const notStartedCount =
    enrollments.filter(
      (
        enrollment
      ) =>
        getProgress(
          enrollment
        ) ===
        0
    ).length;

  const averageProgress =
    totalEnrollments >
    0
      ? Math.round(
          enrollments.reduce(
            (
              sum,
              enrollment
            ) =>
              sum +
              getProgress(
                enrollment
              ),
            0
          ) /
            totalEnrollments
        )
      : 0;

  const activeStudentEnrollments =
    enrollments.filter(
      (
        enrollment
      ) =>
        enrollment
          ?.student
          ?.user
          ?.isActive !==
          false
    ).length;

  const uniqueStudents =
    new Set(
      enrollments
        .map(
          getStudentId
        )
        .filter(
          Boolean
        )
    ).size;

  const uniqueCourses =
    new Set(
      enrollments
        .map(
          getCourseId
        )
        .filter(
          Boolean
        )
    ).size;

  const hasFilters =
    Boolean(
      search.trim()
    ) ||
    Boolean(
      studentId
    ) ||
    Boolean(
      courseId
    ) ||
    Boolean(
      departmentId
    ) ||
    Boolean(
      programId
    ) ||
    progressFilter !==
      "ALL";

  const completionRate =
    totalEnrollments >
    0
      ? Math.round(
          (
            completedCount /
            totalEnrollments
          ) *
            100
        )
      : 0;

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

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">

              <Users
                size={22}
              />

            </div>

            <div className="min-w-0">

              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Campus360 Administration
              </p>

              <h1 className="truncate text-xl font-bold text-slate-800">
                Enrollment Management
              </h1>

              <p className="hidden text-xs text-slate-500 sm:block">
                Manage student-course enrollment records and progress.
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() =>
                setShowAddForm(
                  (
                    value
                  ) =>
                    !value
                )
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 sm:px-4"
            >

              <Plus
                size={17}
              />

              <span className="hidden sm:inline">
                {showAddForm
                  ? "Close Form"
                  : "Add Enrollment"}
              </span>

            </button>

            <button
              type="button"
              onClick={() =>
                fetchEnrollments(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:px-4"
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
                  Enrollment Operations
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-blue-100">
                  {totalEnrollments} Records
                </span>

              </div>

              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                Enrollment activity at a glance
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
                Manage student-course relationships, monitor learning progress, identify completion levels and maintain clean enrollment records across Campus360.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">

                <HeroTag
                  icon={
                    <Users
                      size={14}
                    />
                  }
                  text={`${uniqueStudents} students`}
                />

                <HeroTag
                  icon={
                    <BookOpen
                      size={14}
                    />
                  }
                  text={`${uniqueCourses} courses`}
                />

                <HeroTag
                  icon={
                    <CheckCircle2
                      size={14}
                    />
                  }
                  text={`${completionRate}% completed`}
                />

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              <HeroMetric
                value={
                  totalEnrollments
                }
                label="Enrollments"
              />

              <HeroMetric
                value={
                  averageProgress
                }
                label="Avg Progress"
              />

              <HeroMetric
                value={
                  completedCount
                }
                label="Completed"
              />

              <HeroMetric
                value={
                  activeStudentEnrollments
                }
                label="Active"
              />

            </div>

          </div>

        </section>

        {/* ====================================================
            MESSAGES
        ==================================================== */}

        {success && (
          <MessageBanner
            type="success"
            message={
              success
            }
            onClose={() =>
              setSuccess(
                ""
              )
            }
          />
        )}

        {error && (
          <MessageBanner
            type="error"
            message={
              error
            }
            onClose={() =>
              setError(
                ""
              )
            }
          />
        )}

        {/* ====================================================
            KPI CARDS
        ==================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <KpiCard
            icon={
              <Users size={21} />
            }
            label="Total Enrollments"
            value={
              totalEnrollments
            }
            description={`${uniqueStudents} students across ${uniqueCourses} courses`}
            tone="blue"
          />

          <KpiCard
            icon={
              <Activity
                size={21}
              />
            }
            label="Average Progress"
            value={`${averageProgress}%`}
            description="Average learning progress"
            tone="purple"
          />

          <KpiCard
            icon={
              <CheckCircle2
                size={21}
              />
            }
            label="Completed"
            value={
              completedCount
            }
            description={`${completionRate}% of enrollment records`}
            tone="green"
          />

          <KpiCard
            icon={
              <ShieldAlert
                size={21}
              />
            }
            label="Needs Attention"
            value={
              notStartedCount
            }
            description={`${inProgressCount} currently in progress`}
            tone="amber"
          />

        </section>

        {/* ====================================================
            PROGRESS ANALYTICS
        ==================================================== */}

        <section className="mt-8 grid gap-6 lg:grid-cols-3">

          <AnalyticsPanel
            title="Progress Breakdown"
            icon={
              <Activity
                size={20}
              />
            }
            iconClass="bg-blue-50 text-blue-600"
          >

            <ProgressBreakdown
              label="Completed"
              value={
                completedCount
              }
              total={
                totalEnrollments
              }
              tone="green"
            />

            <ProgressBreakdown
              label="In Progress"
              value={
                inProgressCount
              }
              total={
                totalEnrollments
              }
              tone="blue"
            />

            <ProgressBreakdown
              label="Not Started"
              value={
                notStartedCount
              }
              total={
                totalEnrollments
              }
              tone="amber"
            />

          </AnalyticsPanel>

          <AnalyticsPanel
            title="Enrollment Coverage"
            icon={
              <Layers3
                size={20}
              />
            }
            iconClass="bg-purple-50 text-purple-600"
          >

            <div className="grid grid-cols-2 gap-3">

              <MetricBox
                label="Students"
                value={
                  uniqueStudents
                }
              />

              <MetricBox
                label="Courses"
                value={
                  uniqueCourses
                }
              />

              <MetricBox
                label="Departments"
                value={
                  new Set(
                    enrollments
                      .map(
                        (
                          enrollment
                        ) =>
                          getDepartmentId(
                            enrollment?.course
                          )
                      )
                      .filter(
                        Boolean
                      )
                  ).size
                }
              />

              <MetricBox
                label="Programs"
                value={
                  new Set(
                    enrollments
                      .map(
                        (
                          enrollment
                        ) =>
                          getProgramId(
                            enrollment?.course
                          )
                      )
                      .filter(
                        Boolean
                      )
                  ).size
                }
              />

            </div>

          </AnalyticsPanel>

          <AnalyticsPanel
            title="Enrollment Health"
            icon={
              <ShieldAlert
                size={20}
              />
            }
            iconClass="bg-green-50 text-green-600"
          >

            <div className="rounded-xl bg-green-50 p-4">

              <div className="flex items-center justify-between">

                <span className="text-xs font-bold text-green-700">
                  Active student accounts
                </span>

                <span className="text-xl font-bold text-green-900">
                  {
                    activeStudentEnrollments
                  }
                </span>

              </div>

              <p className="mt-1 text-[10px] text-green-700">
                Enrollment records linked to active student accounts
              </p>

            </div>

            <div className="mt-3 rounded-xl bg-amber-50 p-4">

              <div className="flex items-center justify-between">

                <span className="text-xs font-bold text-amber-700">
                  Not started
                </span>

                <span className="text-xl font-bold text-amber-900">
                  {
                    notStartedCount
                  }
                </span>

              </div>

              <p className="mt-1 text-[10px] text-amber-700">
                Enrollments with 0% progress
              </p>

            </div>

          </AnalyticsPanel>

        </section>

        {/* ====================================================
            ADD ENROLLMENT
        ==================================================== */}

        {showAddForm && (
          <section className="mt-8 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">

                  <Plus
                    size={21}
                  />

                </div>

                <div>

                  <h2 className="text-lg font-bold text-slate-800">
                    Add Enrollment
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Enroll a student into a course.
                  </p>

                </div>

              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                New Enrollment
              </span>

            </div>

            <form
              onSubmit={
                createEnrollment
              }
              className="mt-6 grid gap-4 md:grid-cols-3"
            >

              <FormField
                label="Student"
                required
              >
                <select
                  value={
                    formStudentId
                  }
                  onChange={(
                    event
                  ) =>
                    setFormStudentId(
                      event.target
                        .value
                    )
                  }
                  required
                  className="form-input"
                >

                  <option value="">
                    Select Student
                  </option>

                  {students.map(
                    (
                      student
                    ) => (
                      <option
                        key={
                          student.id
                        }
                        value={
                          student.id
                        }
                      >

                        {
                          student.enrollmentNumber ||
                          `Student #${student.id}`
                        }
                        {" — "}
                        {
                          getStudentName(
                            student
                          )
                        }

                      </option>
                    )
                  )}

                </select>
              </FormField>

              <FormField
                label="Course"
                required
              >
                <select
                  value={
                    formCourseId
                  }
                  onChange={(
                    event
                  ) =>
                    setFormCourseId(
                      event.target
                        .value
                    )
                  }
                  required
                  className="form-input"
                >

                  <option value="">
                    Select Course
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
                          course.code
                        }
                        {" — "}
                        {
                          course.name
                        }

                      </option>
                    )
                  )}

                </select>
              </FormField>

              <FormField
                label="Initial Progress"
              >
                <div className="relative">

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={
                      formProgress
                    }
                    onChange={(
                      event
                    ) =>
                      setFormProgress(
                        event.target
                          .value
                      )
                    }
                    className="form-input pr-12"
                  />

                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    %
                  </span>

                </div>
              </FormField>

              <div className="md:col-span-3 flex justify-end">

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {saving ? (
                    <>
                      <Loader2
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
                      Create Enrollment
                    </>
                  )}

                </button>

              </div>

            </form>

          </section>
        )}

        {/* ====================================================
            FILTERS
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
                  Find enrollment records by student, course or academic structure.
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
            onSubmit={(event) => {
              event.preventDefault();
              fetchEnrollments(
                true
              );
            }}
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
                placeholder="Student, enrollment number, course..."
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
              ) => {
                setDepartmentId(
                  event.target
                    .value
                );

                setProgramId(
                  ""
                );

                setCourseId(
                  ""
                );
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                programId
              }
              onChange={(
                event
              ) => {
                setProgramId(
                  event.target
                    .value
                );

                setCourseId(
                  ""
                );
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >

              <option value="">
                All Programs
              </option>

              {filteredPrograms.map(
                (
                  program
                ) => (
                  <option
                    key={
                      program.id
                    }
                    value={
                      program.id
                    }
                  >

                    {
                      program.code
                        ? `${program.code} — ${program.name}`
                        : program.name
                    }

                  </option>
                )
              )}

            </select>

            <select
              value={
                courseId
              }
              onChange={(
                event
              ) =>
                setCourseId(
                  event.target
                    .value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >

              <option value="">
                All Courses
              </option>

              {filteredCourses.map(
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
                    {" — "}
                    {
                      course.name
                    }

                  </option>
                )
              )}

            </select>

            <select
              value={
                studentId
              }
              onChange={(
                event
              ) =>
                setStudentId(
                  event.target
                    .value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >

              <option value="">
                All Students
              </option>

              {students.map(
                (
                  student
                ) => (
                  <option
                    key={
                      student.id
                    }
                    value={
                      student.id
                    }
                  >

                    {
                      student.enrollmentNumber ||
                      `Student #${student.id}`
                    }
                    {" — "}
                    {
                      getStudentName(
                        student
                      )
                    }

                  </option>
                )
              )}

            </select>

            <select
              value={
                progressFilter
              }
              onChange={(
                event
              ) =>
                setProgressFilter(
                  event.target
                    .value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >

              <option value="ALL">
                All Progress
              </option>

              <option value="NOT_STARTED">
                Not Started — 0%
              </option>

              <option value="IN_PROGRESS">
                In Progress
              </option>

              <option value="COMPLETED">
                Completed — 100%
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

                <option value="student">
                  Sort by Student
                </option>

                <option value="course">
                  Sort by Course
                </option>

                <option value="progress">
                  Sort by Progress
                </option>

                <option value="semester">
                  Sort by Semester
                </option>

                <option value="date">
                  Sort by Date
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

              Apply Filters

            </button>

          </form>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs text-slate-500">

              Showing{" "}
              <span className="font-bold text-slate-700">
                {
                  processedEnrollments.length
                }
              </span>
              {" "}
              of{" "}
              <span className="font-bold text-slate-700">
                {
                  totalEnrollments
                }
              </span>
              {" "}
              enrollment records

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

                  <Users
                    size={21}
                    className="text-blue-600"
                  />

                  <h2 className="text-lg font-bold text-slate-800">
                    Enrollment Records
                  </h2>

                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Student-to-course relationships and learning progress.
                </p>

              </div>

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                  {
                    processedEnrollments.length
                  } displayed
                </span>

                <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                  {
                    completedCount
                  } completed
                </span>

              </div>

            </div>

          </div>

          {loading ? (

            <EnrollmentTableSkeleton />

          ) : processedEnrollments.length ===
            0 ? (

            <EmptyEnrollmentState
              hasFilters={
                hasFilters
              }
              onClear={
                clearFilters
              }
            />

          ) : viewMode ===
            "table" ? (

            <EnrollmentTable
              enrollments={
                processedEnrollments
              }
              onView={
                openEnrollmentDetails
              }
              onProgress={
                updateProgress
              }
              onDelete={
                deleteEnrollment
              }
              updatingId={
                updatingId
              }
              deletingId={
                deletingId
              }
            />

          ) : (

            <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">

              {processedEnrollments.map(
                (
                  enrollment
                ) => (
                  <EnrollmentCard
                    key={
                      enrollment.id
                    }
                    enrollment={
                      enrollment
                    }
                    onView={
                      openEnrollmentDetails
                    }
                    onProgress={
                      updateProgress
                    }
                    onDelete={
                      deleteEnrollment
                    }
                    updatingId={
                      updatingId
                    }
                    deletingId={
                      deletingId
                    }
                  />
                )
              )}

            </div>

          )}

        </section>

      </main>

      {/* ======================================================
          DETAILS MODAL
      ====================================================== */}

      {selectedEnrollment && (
        <EnrollmentDetailsModal
          enrollment={
            selectedEnrollment
          }
          loading={
            detailsLoading
          }
          onClose={() =>
            setSelectedEnrollment(
              null
            )
          }
          onProgress={() =>
            updateProgress(
              selectedEnrollment.id,
              selectedEnrollment.progressPercent
            )
          }
          onDelete={() =>
            deleteEnrollment(
              selectedEnrollment
            )
          }
          updatingId={
            updatingId
          }
          deletingId={
            deletingId
          }
        />
      )}

      {/* ======================================================
          INLINE FORM STYLE
      ====================================================== */}

      <style>
        {`
          .form-input {
            width: 100%;
            border: 1px solid rgb(203 213 225);
            border-radius: 0.75rem;
            background: white;
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
          }

          .form-input:focus {
            border-color: rgb(59 130 246);
            box-shadow: 0 0 0 3px rgb(219 234 254);
          }

          .form-input:disabled {
            background: rgb(241 245 249);
            cursor: not-allowed;
          }
        `}
      </style>

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
   MESSAGE
============================================================ */

function MessageBanner({
  type,
  message,
  onClose,
}) {
  const isSuccess =
    type ===
    "success";

  return (
    <div
      className={`mt-6 flex items-start gap-3 rounded-2xl border p-5 ${
        isSuccess
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >

      {isSuccess ? (
        <CheckCircle2
          size={20}
          className="mt-0.5 shrink-0"
        />
      ) : (
        <AlertCircle
          size={20}
          className="mt-0.5 shrink-0"
        />
      )}

      <div className="min-w-0 flex-1">

        <p className="font-bold">
          {isSuccess
            ? "Success"
            : "Enrollment management error"}
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
        className={
          isSuccess
            ? "text-green-500 hover:text-green-700"
            : "text-red-500 hover:text-red-700"
        }
      >
        <X size={17} />
      </button>

    </div>
  );
}

/* ============================================================
   KPI
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
   PROGRESS BREAKDOWN
============================================================ */

function ProgressBreakdown({
  label,
  value,
  total,
  tone,
}) {
  const percentage =
    total >
    0
      ? Math.round(
          (value /
            total) *
            100
        )
      : 0;

  const colors = {
    blue:
      "bg-blue-600",
    green:
      "bg-green-500",
    amber:
      "bg-amber-500",
  };

  return (
    <div className="mb-4 last:mb-0">

      <div className="flex items-center justify-between">

        <span className="text-xs font-semibold text-slate-600">
          {label}
        </span>

        <span className="text-xs font-bold text-slate-700">
          {value}{" "}
          ({percentage}%)
        </span>

      </div>

      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">

        <div
          className={`h-full rounded-full ${
            colors[tone] ||
            colors.blue
          }`}
          style={{
            width: `${percentage}%`,
          }}
        />

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
   FORM FIELD
============================================================ */

function FormField({
  label,
  required,
  children,
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-bold text-slate-700">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </label>

      {children}

    </div>
  );
}

/* ============================================================
   ENROLLMENT TABLE
============================================================ */

function EnrollmentTable({
  enrollments,
  onView,
  onProgress,
  onDelete,
  updatingId,
  deletingId,
}) {
  return (
    <div className="overflow-x-auto">

      <table className="w-full min-w-[1250px]">

        <thead className="border-b border-slate-200 bg-slate-50">

          <tr>

            <TableHeader>
              Student
            </TableHeader>

            <TableHeader>
              Course
            </TableHeader>

            <TableHeader>
              Department
            </TableHeader>

            <TableHeader>
              Program
            </TableHeader>

            <TableHeader>
              Semester
            </TableHeader>

            <TableHeader>
              Progress
            </TableHeader>

            <TableHeader>
              Enrolled On
            </TableHeader>

            <TableHeader align="right">
              Actions
            </TableHeader>

          </tr>

        </thead>

        <tbody className="divide-y divide-slate-100">

          {enrollments.map(
            (
              enrollment
            ) => {

              const student =
                enrollment?.student;

              const course =
                enrollment?.course;

              const progress =
                getProgress(
                  enrollment
                );

              const studentName =
                getStudentName(
                  student
                );

              return (
                <tr
                  key={
                    enrollment.id
                  }
                  className="transition hover:bg-slate-50"
                >

                  {/* STUDENT */}

                  <td className="px-5 py-5">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-600">

                        {(
                          student
                            ?.user
                            ?.firstName?.[0] ||
                          "S"
                        ).toUpperCase()}

                      </div>

                      <div className="min-w-0">

                        <p className="truncate font-bold text-slate-800">
                          {
                            studentName
                          }
                        </p>

                        <p className="mt-1 max-w-[180px] truncate text-xs text-slate-400">

                          {
                            student
                              ?.enrollmentNumber ||
                            student
                              ?.user
                              ?.email ||
                            "No enrollment number"
                          }

                        </p>

                      </div>

                    </div>

                  </td>

                  {/* COURSE */}

                  <td className="px-5 py-5">

                    <p className="font-bold text-slate-700">

                      {
                        course
                          ?.code ||
                        "—"
                      }

                    </p>

                    <p className="mt-1 max-w-[200px] truncate text-xs text-slate-500">

                      {
                        course
                          ?.name ||
                        "Course unavailable"
                      }

                    </p>

                  </td>

                  {/* DEPARTMENT */}

                  <td className="px-5 py-5">

                    <p className="font-semibold text-slate-700">

                      {
                        course
                          ?.department
                          ?.code ||
                        "—"
                      }

                    </p>

                    <p className="mt-1 max-w-[160px] truncate text-xs text-slate-400">

                      {
                        course
                          ?.department
                          ?.name ||
                        "—"
                      }

                    </p>

                  </td>

                  {/* PROGRAM */}

                  <td className="px-5 py-5">

                    <p className="font-semibold text-slate-700">

                      {
                        course
                          ?.program
                          ?.code ||
                        "—"
                      }

                    </p>

                    <p className="mt-1 max-w-[180px] truncate text-xs text-slate-400">

                      {
                        course
                          ?.program
                          ?.name ||
                        "—"
                      }

                    </p>

                  </td>

                  {/* SEMESTER */}

                  <td className="px-5 py-5">

                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">

                      Sem{" "}
                      {
                        course
                          ?.semester ||
                        "—"
                      }

                    </span>

                  </td>

                  {/* PROGRESS */}

                  <td className="px-5 py-5">

                    <div className="w-40">

                      <div className="mb-1 flex items-center justify-between">

                        <span className="text-[10px] font-medium text-slate-400">
                          Progress
                        </span>

                        <span className="text-xs font-bold text-slate-700">
                          {
                            progress
                          }%
                        </span>

                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                        <div
                          className={`h-full rounded-full ${
                            progress ===
                            100
                              ? "bg-green-500"
                              : progress >
                                0
                              ? "bg-blue-600"
                              : "bg-slate-300"
                          }`}
                          style={{
                            width: `${progress}%`,
                          }}
                        />

                      </div>

                    </div>

                  </td>

                  {/* DATE */}

                  <td className="px-5 py-5">

                    <p className="text-sm font-semibold text-slate-700">

                      {
                        formatDate(
                          enrollment.enrolledAt
                        )
                      }

                    </p>

                  </td>

                  {/* ACTIONS */}

                  <td className="px-5 py-5">

                    <div className="flex items-center justify-end gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          onView(
                            enrollment.id
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
                          onProgress(
                            enrollment.id,
                            enrollment.progressPercent
                          )
                        }
                        disabled={
                          updatingId ===
                          enrollment.id
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                      >

                        {updatingId ===
                        enrollment.id ? (
                          <Loader2
                            size={
                              15
                            }
                            className="animate-spin"
                          />
                        ) : (
                          <Activity
                            size={
                              15
                            }
                          />
                        )}

                        {
                          updatingId ===
                          enrollment.id
                            ? "Saving"
                            : "Progress"
                        }

                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onDelete(
                            enrollment
                          )
                        }
                        disabled={
                          deletingId ===
                          enrollment.id
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >

                        {deletingId ===
                        enrollment.id ? (
                          <Loader2
                            size={
                              15
                            }
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2
                            size={
                              15
                            }
                          />
                        )}

                        Remove

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
   TABLE HEADER
============================================================ */

function TableHeader({
  children,
  align = "left",
}) {
  return (
    <th
      className={`px-5 py-4 text-${align} text-[10px] font-bold uppercase tracking-wide text-slate-400`}
    >
      {children}
    </th>
  );
}

/* ============================================================
   ENROLLMENT CARD
============================================================ */

function EnrollmentCard({
  enrollment,
  onView,
  onProgress,
  onDelete,
  updatingId,
  deletingId,
}) {
  const progress =
    getProgress(
      enrollment
    );

  const student =
    enrollment?.student;

  const course =
    enrollment?.course;

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">

      <div className="flex items-start gap-3">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-600">

          {(
            student
              ?.user
              ?.firstName?.[0] ||
            "S"
          ).toUpperCase()}

        </div>

        <div className="min-w-0 flex-1">

          <div className="flex items-start justify-between gap-2">

            <div className="min-w-0">

              <h3 className="truncate font-bold text-slate-800">
                {
                  getStudentName(
                    student
                  )
                }
              </h3>

              <p className="mt-1 truncate text-xs text-slate-400">

                {
                  student
                    ?.enrollmentNumber ||
                  "No enrollment number"
                }

              </p>

            </div>

            <ChevronRight
              size={17}
              className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500"
            />

          </div>

        </div>

      </div>

      <div className="mt-5 rounded-xl bg-blue-50 p-4">

        <p className="text-[10px] font-bold uppercase tracking-wide text-blue-500">
          Course
        </p>

        <p className="mt-1 font-bold text-blue-900">
          {
            course
              ?.code ||
            "No course code"
          }
        </p>

        <p className="mt-1 text-sm text-blue-800">

          {
            course
              ?.name ||
            "Course unavailable"
          }

        </p>

      </div>

      <div className="mt-3 flex flex-wrap gap-2">

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">

          Semester{" "}
          {
            course
              ?.semester ||
            "—"
          }

        </span>

        <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-bold text-purple-700">

          {
            course
              ?.program
              ?.code ||
            "No program"
          }

        </span>

      </div>

      <div className="mt-5">

        <div className="flex items-center justify-between">

          <span className="text-xs font-semibold text-slate-500">
            Course Progress
          </span>

          <span className="text-sm font-bold text-slate-800">
            {progress}%
          </span>

        </div>

        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">

          <div
            className={`h-full rounded-full ${
              progress ===
              100
                ? "bg-green-500"
                : progress >
                  0
                ? "bg-blue-600"
                : "bg-slate-300"
            }`}
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">

        <span className="inline-flex items-center gap-1.5">

          <CalendarDays
            size={13}
          />

          {
            formatDate(
              enrollment.enrolledAt
            )
          }

        </span>

        <span
          className={`font-bold ${
            progress ===
            100
              ? "text-green-600"
              : progress >
                0
              ? "text-blue-600"
              : "text-amber-600"
          }`}
        >

          {progress ===
          100
            ? "Completed"
            : progress >
              0
            ? "In Progress"
            : "Not Started"}

        </span>

      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">

        <button
          type="button"
          onClick={() =>
            onView(
              enrollment.id
            )
          }
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >

          <Eye
            size={14}
          />

          View

        </button>

        <button
          type="button"
          onClick={() =>
            onProgress(
              enrollment.id,
              enrollment.progressPercent
            )
          }
          disabled={
            updatingId ===
            enrollment.id
          }
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-amber-50 px-2 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
        >

          {updatingId ===
          enrollment.id ? (
            <Loader2
              size={14}
              className="animate-spin"
            />
          ) : (
            <Activity
              size={14}
            />
          )}

          Progress

        </button>

        <button
          type="button"
          onClick={() =>
            onDelete(
              enrollment
            )
          }
          disabled={
            deletingId ===
            enrollment.id
          }
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-red-50 px-2 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
        >

          {deletingId ===
          enrollment.id ? (
            <Loader2
              size={14}
              className="animate-spin"
            />
          ) : (
            <Trash2
              size={14}
            />
          )}

          Remove

        </button>

      </div>

    </article>
  );
}

/* ============================================================
   DETAILS MODAL
============================================================ */

function EnrollmentDetailsModal({
  enrollment,
  loading,
  onClose,
  onProgress,
  onDelete,
  updatingId,
  deletingId,
}) {
  const student =
    enrollment?.student;

  const course =
    enrollment?.course;

  const faculty =
    course?.faculty;

  const progress =
    getProgress(
      enrollment
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">

      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

              <Users
                size={21}
              />

            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Enrollment Profile
              </p>

              <h2 className="text-xl font-bold text-slate-800">
                Enrollment Details
              </h2>

            </div>

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
                Loading enrollment details...
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

                    {(
                      student
                        ?.user
                        ?.firstName?.[0] ||
                      "S"
                    ).toUpperCase()}

                  </div>

                  <div className="min-w-0">

                    <h3 className="truncate text-2xl font-bold">

                      {
                        getStudentName(
                          student
                        )
                      }

                    </h3>

                    <p className="mt-1 text-sm text-blue-100">

                      {
                        student
                          ?.enrollmentNumber ||
                        "No enrollment number"
                      }

                    </p>

                    <p className="mt-1 text-xs text-blue-200">

                      {
                        course
                          ?.code ||
                        "No course"
                      }
                      {" · "}
                      {
                        course
                          ?.name ||
                        "Course unavailable"
                      }

                    </p>

                  </div>

                </div>

                <span
                  className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${
                    progress ===
                    100
                      ? "bg-green-400/20 text-green-100"
                      : progress >
                        0
                      ? "bg-white/10 text-blue-100"
                      : "bg-amber-400/20 text-amber-100"
                  }`}
                >

                  {progress ===
                  100 ? (
                    <CheckCircle2
                      size={15}
                    />
                  ) : (
                    <Activity
                      size={15}
                    />
                  )}

                  {progress ===
                  100
                    ? "Completed"
                    : progress >
                      0
                    ? "In Progress"
                    : "Not Started"}

                </span>

              </div>

            </section>

            {/* SUMMARY */}

            <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

              <DetailStat
                label="Progress"
                value={`${progress}%`}
                icon={
                  <Activity
                    size={18}
                  />
                }
                tone="blue"
              />

              <DetailStat
                label="Semester"
                value={
                  course
                    ?.semester ||
                  "—"
                }
                icon={
                  <CalendarDays
                    size={18}
                  />
                }
                tone="purple"
              />

              <DetailStat
                label="Credits"
                value={
                  course
                    ?.credits ??
                  "—"
                }
                icon={
                  <GraduationCap
                    size={18}
                  />
                }
                tone="green"
              />

              <DetailStat
                label="Enrollment ID"
                value={
                  enrollment.id
                }
                icon={
                  <Layers3
                    size={18}
                  />
                }
                tone="amber"
              />

            </section>

            {/* STUDENT */}

            <DetailSection
              title="Student Information"
              icon={
                <UserRound
                  size={19}
                />
              }
            >

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">

                <InfoCard
                  label="Student Name"
                  value={getStudentName(
                    student
                  )}
                />

                <InfoCard
                  label="Enrollment Number"
                  value={
                    student
                      ?.enrollmentNumber
                  }
                />

                <InfoCard
                  label="Email"
                  value={
                    student
                      ?.user
                      ?.email
                  }
                />

                <InfoCard
                  label="Student Semester"
                  value={
                    student
                      ?.semester
                      ? `Semester ${student.semester}`
                      : "—"
                  }
                />

              </div>

            </DetailSection>

            {/* COURSE */}

            <DetailSection
              title="Course Information"
              icon={
                <BookOpen
                  size={19}
                />
              }
            >

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">

                <InfoCard
                  label="Course Code"
                  value={
                    course?.code
                  }
                />

                <InfoCard
                  label="Course Name"
                  value={
                    course?.name
                  }
                />

                <InfoCard
                  label="Department"
                  value={
                    course
                      ?.department
                      ?.name
                  }
                />

                <InfoCard
                  label="Program"
                  value={
                    course
                      ?.program
                      ?.name
                  }
                />

              </div>

            </DetailSection>

            {/* FACULTY */}

            <DetailSection
              title="Faculty Assignment"
              icon={
                <GraduationCap
                  size={19}
                />
              }
            >

              <div className="rounded-2xl border border-slate-200 p-4">

                {faculty ? (

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-600">

                        {
                          getFacultyInitials(
                            faculty
                          )
                        }

                      </div>

                      <div>

                        <p className="font-bold text-slate-800">

                          {
                            getFacultyName(
                              faculty
                            )
                          }

                        </p>

                        <p className="mt-1 text-xs text-slate-400">

                          {
                            faculty.employeeId ||
                            "Employee ID unavailable"
                          }

                        </p>

                      </div>

                    </div>

                    <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">

                      Faculty Assigned

                    </span>

                  </div>

                ) : (

                  <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4">

                    <ShieldAlert
                      size={19}
                      className="text-amber-600"
                    />

                    <div>

                      <p className="font-bold text-amber-900">
                        No faculty assigned
                      </p>

                      <p className="mt-1 text-xs text-amber-700">
                        This enrollment's course does not currently have an assigned faculty member.
                      </p>

                    </div>

                  </div>

                )}

              </div>

            </DetailSection>

            {/* PROGRESS */}

            <DetailSection
              title="Learning Progress"
              icon={
                <Activity
                  size={19}
                />
              }
            >

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <p className="text-sm font-semibold text-slate-500">
                      Current Progress
                    </p>

                    <p className="mt-1 text-4xl font-bold text-slate-800">
                      {
                        progress
                      }%
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={
                      onProgress
                    }
                    disabled={
                      updatingId ===
                      enrollment.id
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                  >

                    {updatingId ===
                    enrollment.id ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Activity
                        size={17}
                      />
                    )}

                    Update Progress

                  </button>

                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">

                  <div
                    className={`h-full rounded-full ${
                      progress ===
                      100
                        ? "bg-green-500"
                        : progress >
                          0
                        ? "bg-blue-600"
                        : "bg-slate-300"
                    }`}
                    style={{
                      width: `${progress}%`,
                    }}
                  />

                </div>

                <div className="mt-3 flex flex-wrap gap-2">

                  <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500">

                    {progress ===
                    100
                      ? "Completed"
                      : progress >
                        0
                      ? "In Progress"
                      : "Not Started"}

                  </span>

                </div>

              </div>

            </DetailSection>

            {/* ENROLLMENT INFO */}

            <DetailSection
              title="Enrollment Information"
              icon={
                <Layers3
                  size={19}
                />
              }
            >

              <div className="grid gap-3 md:grid-cols-3">

                <InfoCard
                  label="Enrollment ID"
                  value={
                    enrollment.id
                  }
                />

                <InfoCard
                  label="Enrolled On"
                  value={formatDateTime(
                    enrollment.enrolledAt
                  )}
                />

                <InfoCard
                  label="Student Account"
                  value={
                    student
                      ?.user
                      ?.isActive ===
                    false
                      ? "Inactive"
                      : "Active"
                  }
                />

              </div>

            </DetailSection>

            {/* ACTIONS */}

            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

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
                  onDelete
                }
                disabled={
                  deletingId ===
                  enrollment.id
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >

                {deletingId ===
                enrollment.id ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Trash2
                    size={17}
                  />
                )}

                {deletingId ===
                enrollment.id
                  ? "Removing..."
                  : "Remove Enrollment"}

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
  children,
}) {
  return (
    <section className="mt-7">

      <div className="mb-4 flex items-center gap-2">

        <span className="text-blue-600">
          {icon}
        </span>

        <h3 className="font-bold text-slate-800">
          {title}
        </h3>

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

      <div className="flex items-center justify-between gap-2">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            styles[tone] ||
            styles.blue
          }`}
        >
          {icon}
        </div>

        <p className="max-w-[110px] truncate text-right text-xl font-bold text-slate-800">
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
   INFO CARD
============================================================ */

function InfoCard({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-bold text-slate-700">
        {value || "—"}
      </p>

    </div>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyEnrollmentState({
  hasFilters,
  onClear,
}) {
  return (
    <div className="p-12 text-center">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

        <Users
          size={31}
        />

      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-800">
        No enrollments found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">

        {hasFilters
          ? "No enrollment records match your current search or filters."
          : "There are currently no enrollment records available."}

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

function EnrollmentTableSkeleton() {
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

/* ============================================================
   EXPORT
============================================================ */

export default AdminEnrollments;