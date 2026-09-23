import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  Copy,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Eye,
  Filter,
  GraduationCap,
  LayoutGrid,
  List,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  ShieldOff,
  SortAsc,
  Users,
  UserRound,
  X,
  AlertCircle,
  Activity,
  School,
  Layers3,
  CalendarDays,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  apiGet,
  apiPatch,
  apiPost,
} from "../api";

/* ============================================================
   HELPERS
============================================================ */

const handleAuthError = (
  error,
  navigate
) => {
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

  return (
    `${firstName} ${lastName}`.trim() ||
    student?.name ||
    student?.fullName ||
    "Unnamed Student"
  );
};

const getStudentEmail = (
  student
) =>
  student?.user?.email ||
  student?.email ||
  "";

const getStudentInitials = (
  student
) => {
  const name =
    getStudentName(
      student
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
    return "S";
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
};

const getEnrollment = (
  student
) =>
  student?.enrollmentNumber ||
  student?.enrollment ||
  "Not assigned";

const getDepartmentName = (
  student
) =>
  student?.departmentRel
    ?.name ||
  student?.department?.name ||
  "Department not assigned";

const getDepartmentCode = (
  student
) =>
  student?.departmentRel
    ?.code ||
  student?.department?.code ||
  "—";

const getProgramName = (
  student
) =>
  student?.programRel
    ?.name ||
  student?.program?.name ||
  "Program not assigned";

const getProgramCode = (
  student
) =>
  student?.programRel
    ?.code ||
  student?.program?.code ||
  "—";

const getAccountStatus =
  (student) =>
    student?.user?.isActive ===
    true
      ? "ACTIVE"
      : "INACTIVE";

/* ============================================================
   COMPONENT
============================================================ */

function AdminStudents() {
  const navigate =
    useNavigate();

  const [
    students,
    setStudents,
  ] = useState([]);

  const [
    selectedStudent,
    setSelectedStudent,
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
    programId,
    setProgramId,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("ALL");

  const [
    semesterFilter,
    setSemesterFilter,
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
    departments,
    setDepartments,
  ] = useState([]);

  const [
    programs,
    setPrograms,
  ] = useState([]);

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
    editingStudent,
    setEditingStudent,
  ] = useState(null);

  const [
    editBatch,
    setEditBatch,
  ] = useState("");

  const [
    editDivision,
    setEditDivision,
  ] = useState("");

  const [
    editLoading,
    setEditLoading,
  ] = useState(false);

  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addStudentLoading, setAddStudentLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [addStudentForm, setAddStudentForm] = useState({
    firstName: "",
    lastName: "",
    enrollmentNumber: "",
    semester: "",
    admissionYear: String(new Date().getFullYear()),
    departmentId: "",
    programId: "",
    phone: "",
    dateOfBirth: "",
    batch: "",
    division: "",
  });

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  /* ==========================================================
     FETCH STUDENTS
  ========================================================== */

  const fetchStudents =
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

          if (
            programId
          ) {
            params.append(
              "programId",
              programId
            );
          }

          const query =
            params.toString();

          const endpoint =
            `/admin/students${
              query
                ? `?${query}`
                : ""
            }`;

          const data =
            await apiGet(
              endpoint
            );

          setStudents(
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
            "Admin students error:",
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
              "Failed to load student records."
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
        programId,
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
     FETCH PROGRAMS
  ========================================================== */

  const fetchPrograms =
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
              "/programs"
            );

          setPrograms(
            Array.isArray(
              data?.data
            )
              ? data.data
              : Array.isArray(
                  data?.programs
                )
              ? data.programs
              : []
          );
        } catch (
          err
        ) {
          console.error(
            "Programs fetch error:",
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
    fetchPrograms();
    fetchStudents();
  }, [
    fetchDepartments,
    fetchPrograms,
    fetchStudents,
  ]);

  /* ==========================================================
     FILTER PROGRAMS BY DEPARTMENT
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
            program?.departmentId
          ) ===
            String(
              departmentId
            ) ||
          String(
            program?.department
              ?.id
          ) ===
            String(
              departmentId
            )
      );
    }, [
      programs,
      departmentId,
    ]);

  /* ==========================================================
     RESET INVALID PROGRAM
  ========================================================== */

  useEffect(() => {
    if (
      programId &&
      !filteredPrograms.some(
        (
          program
        ) =>
          String(
            program?.id
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

    fetchStudents(
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
    setProgramId("");
    setStatusFilter("ALL");
    setSemesterFilter("ALL");
    setSortBy("name");
    setSortDirection("asc");

    fetchStudents(
      false,
      ""
    );
  };

  /* ==========================================================
     VIEW STUDENT
  ========================================================== */

  const openStudentDetails =
    async (
      studentId
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
            `/admin/students/${studentId}`
          );

        setSelectedStudent(
          data?.data ||
            null
        );
      } catch (
        err
      ) {
        console.error(
          "Student details error:",
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
            "Failed to fetch student details."
        );
      } finally {
        setDetailsLoading(
          false
        );
      }
    };

  /* ==========================================================
     EDIT
  ========================================================== */

  const openEditStudent =
    (
      student
    ) => {
      setEditingStudent(
        student
      );

      setEditBatch(
        student?.batch
          ? String(
              student.batch
            )
          : ""
      );

      setEditDivision(
        student?.division
          ? String(
              student.division
            )
          : ""
      );

      setError("");
      setSuccess("");
    };

  const closeEditStudent =
    () => {
      if (
        editLoading
      ) {
        return;
      }

      setEditingStudent(
        null
      );

      setEditBatch("");
      setEditDivision("");
    };

  /* ==========================================================
     UPDATE STUDENT
  ========================================================== */

  const updateStudent =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        !editingStudent
      ) {
        return;
      }

      try {
        setEditLoading(
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

        if (
          editBatch !== "" &&
          ![
            "1",
            "2",
            "3",
          ].includes(
            String(
              editBatch
            )
          )
        ) {
          throw new Error(
            "Batch must be 1, 2 or 3."
          );
        }

        const normalizedDivision =
          editDivision
            .trim()
            .toUpperCase();

        if (
          normalizedDivision &&
          !/^[A-Z0-9]+$/.test(
            normalizedDivision
          )
        ) {
          throw new Error(
            "Division can contain only letters and numbers."
          );
        }

        const data =
          await apiPatch(
            `/admin/students/${editingStudent.id}`,
            {
              batch:
                editBatch ===
                ""
                  ? null
                  : String(
                      editBatch
                    ),

              division:
                normalizedDivision ||
                null,
            }
          );

        setSuccess(
          data?.message ||
            "Student information updated successfully."
        );

        const updatedId =
          editingStudent.id;

        setEditingStudent(
          null
        );

        setEditBatch("");
        setEditDivision("");

        await fetchStudents(
          true
        );

        if (
          selectedStudent?.id ===
          updatedId
        ) {
          await openStudentDetails(
            updatedId
          );
        }
      } catch (
        err
      ) {
        console.error(
          "Student update error:",
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
            "Failed to update student information."
        );
      } finally {
        setEditLoading(
          false
        );
      }
    };

  /* ==========================================================
     ADD STUDENT
  ========================================================== */

  const resetAddStudentForm = () => {
    setAddStudentForm({
      firstName: "",
      lastName: "",
      semester: "",
      admissionYear: String(new Date().getFullYear()),
      departmentId: "",
      programId: "",
      phone: "",
      dateOfBirth: "",
      batch: "",
      division: "",
    });
  };

  const openAddStudent = () => {
    setError("");
    setSuccess("");
    resetAddStudentForm();
    setAddStudentOpen(true);
  };

  const closeAddStudent = () => {
    if (addStudentLoading) return;
    setAddStudentOpen(false);
    resetAddStudentForm();
  };

  const handleAddStudentChange = (event) => {
    const { name, value } = event.target;
    setAddStudentForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "departmentId" ? { programId: "" } : {}),
    }));
  };

  const createStudent = async (event) => {
    event.preventDefault();

    try {
      setAddStudentLoading(true);
      setError("");
      setSuccess("");

      const {
        firstName,
        lastName,
        semester,
        admissionYear,
        departmentId,
        programId,
        phone,
        dateOfBirth,
        batch,
        division,
      } = addStudentForm;

      if (!firstName.trim() || !lastName.trim()) {
        throw new Error("First name and last name are required.");
      }

      const semesterNumber = Number(semester);
      if (!Number.isInteger(semesterNumber) || semesterNumber < 1 || semesterNumber > 8) {
        throw new Error("Semester must be between 1 and 8.");
      }

      const admissionYearNumber = Number(admissionYear);
      if (!Number.isInteger(admissionYearNumber) || admissionYearNumber < 2000 || admissionYearNumber > new Date().getFullYear() + 1) {
        throw new Error("Please enter a valid admission year.");
      }

      if (!departmentId || !programId) {
        throw new Error("Department and program are required.");
      }

      const normalizedDivision = division.trim().toUpperCase();
      if (normalizedDivision && !/^[A-Z0-9]+$/.test(normalizedDivision)) {
        throw new Error("Division can contain only letters and numbers.");
      }

      const data = await apiPost("/admin/students", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        semester: semesterNumber,
        admissionYear: admissionYearNumber,
        departmentId: Number(departmentId),
        programId: Number(programId),
        phone: phone.trim() || null,
        dateOfBirth: dateOfBirth || null,
        batch: batch || null,
        division: normalizedDivision || null,
      });

      const credentials = data?.data?.credentials;
      if (!credentials?.email || !credentials?.temporaryPassword) {
        throw new Error("Student was created, but login credentials were not returned by the server.");
      }

      setCreatedCredentials({
        ...credentials,
        student: data?.data?.student,
      });
      setAddStudentOpen(false);
      resetAddStudentForm();
      setSuccess(data?.message || "Student created successfully.");
      await fetchStudents(true);
    } catch (err) {
      console.error("Create student error:", err);

      if (handleAuthError(err, navigate)) return;

      setError(err?.message || "Failed to create student.");
    } finally {
      setAddStudentLoading(false);
    }
  };

  /* ==========================================================
     ACCOUNT STATUS
  ========================================================== */

  const updateStudentStatus =
    async (
      studentId,
      currentStatus
    ) => {
      const nextStatus =
        !currentStatus;

      const confirmed =
        window.confirm(
          nextStatus
            ? "Activate this student account?"
            : "Deactivate this student account?"
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
            `/admin/students/${studentId}/status`,
            {
              isActive:
                nextStatus,
            }
          );

        setSuccess(
          data?.message ||
            "Student account status updated successfully."
        );

        await fetchStudents(
          true
        );

        if (
          selectedStudent?.id ===
          studentId
        ) {
          await openStudentDetails(
            studentId
          );
        }
      } catch (
        err
      ) {
        console.error(
          "Status update error:",
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
            "Failed to update account status."
        );
      } finally {
        setStatusUpdating(
          false
        );
      }
    };

  /* ==========================================================
     STUDENT STATUS / SEMESTER VALUES
  ========================================================== */

  const semesterOptions =
    useMemo(() => {
      return [
        ...new Set(
          students
            .map(
              (
                student
              ) =>
                student?.semester
            )
            .filter(
              (
                semester
              ) =>
                semester !==
                  null &&
                semester !==
                  undefined &&
                semester !==
                  ""
            )
        ),
      ].sort(
        (
          a,
          b
        ) =>
          Number(a) -
          Number(b)
      );
    }, [
      students,
    ]);

  /* ==========================================================
     FILTERED / SORTED STUDENTS
  ========================================================== */

  const processedStudents =
    useMemo(() => {
      let result =
        [...students];

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
              student
            ) => {
              const searchable =
                [
                  getStudentName(
                    student
                  ),
                  getStudentEmail(
                    student
                  ),
                  getEnrollment(
                    student
                  ),
                  getDepartmentName(
                    student
                  ),
                  getDepartmentCode(
                    student
                  ),
                  getProgramName(
                    student
                  ),
                  getProgramCode(
                    student
                  ),
                  student?.batch,
                  student?.division,
                  student?.semester,
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
              student
            ) =>
              getAccountStatus(
                student
              ) ===
              statusFilter
          );
      }

      if (
        semesterFilter !==
        "ALL"
      ) {
        result =
          result.filter(
            (
              student
            ) =>
              String(
                student?.semester
              ) ===
              String(
                semesterFilter
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
            "enrollment"
          ) {
            comparison =
              getEnrollment(
                a
              ).localeCompare(
                getEnrollment(
                  b
                )
              );
          } else if (
            sortBy ===
            "semester"
          ) {
            comparison =
              Number(
                a?.semester ||
                  0
              ) -
              Number(
                b?.semester ||
                  0
              );
          } else if (
            sortBy ===
            "status"
          ) {
            comparison =
              getAccountStatus(
                a
              ).localeCompare(
                getAccountStatus(
                  b
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
          } else {
            comparison =
              getStudentName(
                a
              ).localeCompare(
                getStudentName(
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
      students,
      search,
      statusFilter,
      semesterFilter,
      sortBy,
      sortDirection,
    ]);

  /* ==========================================================
     STATS
  ========================================================== */

  const totalStudents =
    students.length;

  const activeStudents =
    students.filter(
      (
        student
      ) =>
        student?.user
          ?.isActive ===
        true
    ).length;

  const inactiveStudents =
    Math.max(
      totalStudents -
        activeStudents,
      0
    );

  const studentsWithBatch =
    students.filter(
      (
        student
      ) =>
        student?.batch
    ).length;

  const studentsWithDivision =
    students.filter(
      (
        student
      ) =>
        student?.division
    ).length;

  const batchAssignmentRate =
    totalStudents >
    0
      ? Math.round(
          (
            studentsWithBatch /
            totalStudents
          ) *
            100
        )
      : 0;

  const divisionAssignmentRate =
    totalStudents >
    0
      ? Math.round(
          (
            studentsWithDivision /
            totalStudents
          ) *
            100
        )
      : 0;

  const uniqueDepartments =
    new Set(
      students
        .map(
          (
            student
          ) =>
            getDepartmentCode(
              student
            )
        )
        .filter(
          (
            value
          ) =>
            value &&
            value !== "—"
        )
    ).size;

  const uniquePrograms =
    new Set(
      students
        .map(
          (
            student
          ) =>
            getProgramCode(
              student
            )
        )
        .filter(
          (
            value
          ) =>
            value &&
            value !== "—"
        )
    ).size;

  const hasFilters =
    Boolean(
      search.trim()
    ) ||
    Boolean(
      departmentId
    ) ||
    Boolean(
      programId
    ) ||
    statusFilter !==
      "ALL" ||
    semesterFilter !==
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
                Student Management
              </h1>

              <p className="hidden text-xs text-slate-500 sm:block">
                Manage records, academic groups and account access.
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() =>
                fetchStudents(
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

          <div className="absolute -bottom-24 right-24 h-64 w-64 rounded-full bg-white/5" />

          <div className="relative grid gap-7 xl:grid-cols-[1fr_auto] xl:items-center">

            <div>

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                  Student Administration
                </span>

                <span className="rounded-full bg-emerald-400/20 px-3 py-1.5 text-xs font-bold text-emerald-100">
                  {activeStudents} Active
                </span>

                {inactiveStudents >
                  0 && (
                  <span className="rounded-full bg-red-400/20 px-3 py-1.5 text-xs font-bold text-red-100">
                    {inactiveStudents} Inactive
                  </span>
                )}

              </div>

              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                Student records at a glance
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
                Search, filter and manage student academic information, account access, batch and division assignments from one centralized workspace.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">

                <HeroTag
                  icon={
                    <Users
                      size={14}
                    />
                  }
                  text={`${totalStudents} total students`}
                />

                <HeroTag
                  icon={
                    <School
                      size={14}
                    />
                  }
                  text={`${uniqueDepartments} departments`}
                />

                <HeroTag
                  icon={
                    <BookOpen
                      size={14}
                    />
                  }
                  text={`${uniquePrograms} programs`}
                />

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              <HeroMetric
                value={
                  totalStudents
                }
                label="Students"
              />

              <HeroMetric
                value={
                  activeStudents
                }
                label="Active"
              />

              <HeroMetric
                value={
                  studentsWithBatch
                }
                label="Batch Assigned"
              />

              <HeroMetric
                value={`${batchAssignmentRate}%`}
                label="Coverage"
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
                Student management error
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
            KPI
        ==================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <KpiCard
            icon={
              <Users size={21} />
            }
            label="Total Students"
            value={
              totalStudents
            }
            description="Student records"
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
              activeStudents
            }
            description={`${totalStudents > 0 ? Math.round(
              (activeStudents /
                totalStudents) *
                100
            ) : 0}% of students`}
            tone="green"
          />

          <KpiCard
            icon={
              <Layers3
                size={21}
              />
            }
            label="Academic Groups"
            value={
              studentsWithBatch +
              studentsWithDivision
            }
            description={`${studentsWithBatch} batch · ${studentsWithDivision} division assignments`}
            tone="purple"
          />

          <KpiCard
            icon={
              <School
                size={21}
              />
            }
            label="Departments"
            value={
              uniqueDepartments
            }
            description={`${uniquePrograms} programs represented`}
            tone="amber"
          />

        </section>

        {/* ====================================================
            MANAGEMENT ANALYTICS
        ==================================================== */}

        <section className="mt-8 grid gap-6 lg:grid-cols-3">

          <AnalyticsPanel
            title="Account Health"
            icon={
              <ShieldCheck
                size={20}
              />
            }
            iconClass="bg-green-50 text-green-600"
          >

            <ProgressMetric
              label="Active Accounts"
              value={
                totalStudents >
                0
                  ? Math.round(
                      (
                        activeStudents /
                        totalStudents
                      ) *
                        100
                    )
                  : 0
              }
              detail={`${activeStudents} of ${totalStudents} accounts active`}
              tone="green"
            />

            <div className="mt-4 grid grid-cols-2 gap-3">

              <MetricBox
                label="Active"
                value={
                  activeStudents
                }
                valueClass="text-green-600"
              />

              <MetricBox
                label="Inactive"
                value={
                  inactiveStudents
                }
                valueClass="text-red-600"
              />

            </div>

          </AnalyticsPanel>

          <AnalyticsPanel
            title="Academic Grouping"
            icon={
              <Layers3
                size={20}
              />
            }
            iconClass="bg-purple-50 text-purple-600"
          >

            <ProgressMetric
              label="Batch Assignment"
              value={
                batchAssignmentRate
              }
              detail={`${studentsWithBatch} students have a batch`}
              tone="purple"
            />

            <ProgressMetric
              label="Division Assignment"
              value={
                divisionAssignmentRate
              }
              detail={`${studentsWithDivision} students have a division`}
              tone="amber"
            />

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
                label="Programs"
                value={
                  uniquePrograms
                }
              />

            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">

              <MetricBox
                label="Batch Coverage"
                value={`${batchAssignmentRate}%`}
              />

              <MetricBox
                label="Division Coverage"
                value={`${divisionAssignmentRate}%`}
              />

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
                  Narrow the student records you want to manage.
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

            <div className="relative lg:col-span-2 xl:col-span-2">

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
                placeholder="Name, enrollment, email, department..."
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X
                    size={15}
                  />
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
                programId
              }
              onChange={(
                event
              ) =>
                setProgramId(
                  event.target
                    .value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

            <select
              value={
                semesterFilter
              }
              onChange={(
                event
              ) =>
                setSemesterFilter(
                  event.target
                    .value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >

              <option value="ALL">
                All Semesters
              </option>

              {semesterOptions.map(
                (
                  semester
                ) => (
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

            <div className="flex gap-2 lg:col-span-2 xl:col-span-1">

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

                <option value="enrollment">
                  Sort by Enrollment
                </option>

                <option value="department">
                  Sort by Department
                </option>

                <option value="semester">
                  Sort by Semester
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 md:col-span-2 lg:col-span-1"
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
                  processedStudents.length
                }
              </span>
              {" "}
              of{" "}
              <span className="font-bold text-slate-700">
                {
                  students.length
                }
              </span>
              {" "}
              student
              {
                students.length ===
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
            STUDENT RECORDS
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
                    Student Records
                  </h2>

                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Manage student profile, academic grouping and account access.
                </p>

              </div>

              <div className="flex flex-wrap items-center gap-2">

                <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                  {activeStudents} active
                </span>

                <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                  {inactiveStudents} inactive
                </span>

                <button
                  type="button"
                  onClick={openAddStudent}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Plus size={17} />
                  Add Student
                </button>

              </div>

            </div>

          </div>

          {loading ? (

            <StudentTableSkeleton />

          ) : processedStudents.length ===
            0 ? (

            <EmptyStudents
              hasFilters={
                hasFilters
              }
              onClear={
                clearFilters
              }
            />

          ) : viewMode ===
            "table" ? (

            <StudentTable
              students={
                processedStudents
              }
              onView={
                openStudentDetails
              }
              onEdit={
                openEditStudent
              }
              onStatus={
                updateStudentStatus
              }
              statusUpdating={
                statusUpdating
              }
            />

          ) : (

            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">

              {processedStudents.map(
                (
                  student
                ) => (
                  <StudentCard
                    key={
                      student.id
                    }
                    student={
                      student
                    }
                    onView={
                      openStudentDetails
                    }
                    onEdit={
                      openEditStudent
                    }
                    onStatus={
                      updateStudentStatus
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

        {/* ====================================================
            RECORD COVERAGE
        ==================================================== */}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">

          <CoveragePanel
            title="Batch Assignment Coverage"
            subtitle="Students assigned to practical or lab batches."
            value={
              batchAssignmentRate
            }
            assigned={
              studentsWithBatch
            }
            total={
              totalStudents
            }
            tone="purple"
            icon={
              <Layers3
                size={21}
              />
            }
          />

          <CoveragePanel
            title="Division Assignment Coverage"
            subtitle="Students assigned to academic divisions."
            value={
              divisionAssignmentRate
            }
            assigned={
              studentsWithDivision
            }
            total={
              totalStudents
            }
            tone="amber"
            icon={
              <School
                size={21}
              />
            }
          />

        </section>

      </main>

      {addStudentOpen && (
        <AddStudentModal
          form={addStudentForm}
          departments={departments}
          programs={programs}
          loading={addStudentLoading}
          onChange={handleAddStudentChange}
          onClose={closeAddStudent}
          onSubmit={createStudent}
        />
      )}

      {createdCredentials && (
        <CredentialsModal
          credentials={createdCredentials}
          onClose={() => setCreatedCredentials(null)}
        />
      )}

      {/* ======================================================
          DETAILS MODAL
      ====================================================== */}

      {selectedStudent && (
        <StudentDetailsModal
          student={
            selectedStudent
          }
          loading={
            detailsLoading
          }
          onClose={() =>
            setSelectedStudent(
              null
            )
          }
          onEdit={() =>
            openEditStudent(
              selectedStudent
            )
          }
          onStatus={() =>
            updateStudentStatus(
              selectedStudent.id,
              selectedStudent
                .user
                ?.isActive
            )
          }
          statusUpdating={
            statusUpdating
          }
        />
      )}

      {/* ======================================================
          EDIT MODAL
      ====================================================== */}

      {editingStudent && (
        <EditStudentModal
          student={
            editingStudent
          }
          batch={
            editBatch
          }
          division={
            editDivision
          }
          loading={
            editLoading
          }
          onBatchChange={
            setEditBatch
          }
          onDivisionChange={
            setEditDivision
          }
          onClose={
            closeEditStudent
          }
          onSubmit={
            updateStudent
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
  tone = "blue",
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
          styles[tone]
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
  tone = "blue",
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

  const tones = {
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
          className={`h-full rounded-full transition-all duration-500 ${
            tones[tone] ||
            tones.blue
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
   STUDENT TABLE
============================================================ */

function StudentTable({
  students,
  onView,
  onEdit,
  onStatus,
  statusUpdating,
}) {
  return (
    <div className="overflow-x-auto">

      <table className="w-full min-w-[1380px]">

        <thead className="border-b border-slate-200 bg-slate-50">

          <tr>

            <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Student
            </th>

            <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Enrollment
            </th>

            <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Department
            </th>

            <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Program
            </th>

            <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Semester
            </th>

            <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Batch
            </th>

            <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Division
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

          {students.map(
            (
              student
            ) => {

              const active =
                student?.user
                  ?.isActive ===
                true;

              return (
                <tr
                  key={
                    student.id
                  }
                  className="transition hover:bg-slate-50"
                >

                  {/* STUDENT */}

                  <td className="px-5 py-5">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-600">

                        {
                          getStudentInitials(
                            student
                          )
                        }

                      </div>

                      <div className="min-w-0">

                        <p className="truncate font-bold text-slate-800">
                          {
                            getStudentName(
                              student
                            )
                          }
                        </p>

                        {getStudentEmail(
                          student
                        ) ? (
                          <p className="mt-1 flex max-w-[220px] items-center gap-1 text-xs text-slate-500">

                            <Mail
                              size={
                                12
                              }
                            />

                            <span className="truncate">

                              {
                                getStudentEmail(
                                  student
                                )
                              }

                            </span>

                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-400">
                            Email not available
                          </p>
                        )}

                      </div>

                    </div>

                  </td>

                  {/* ENROLLMENT */}

                  <td className="px-5 py-5">

                    <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                      {
                        getEnrollment(
                          student
                        )
                      }
                    </span>

                  </td>

                  {/* DEPARTMENT */}

                  <td className="px-5 py-5">

                    <p className="font-bold text-slate-700">
                      {
                        getDepartmentCode(
                          student
                        )
                      }
                    </p>

                    <p className="mt-1 max-w-[180px] text-xs text-slate-500">
                      {
                        getDepartmentName(
                          student
                        )
                      }
                    </p>

                  </td>

                  {/* PROGRAM */}

                  <td className="px-5 py-5">

                    <p className="font-bold text-slate-700">
                      {
                        getProgramCode(
                          student
                        )
                      }
                    </p>

                    <p className="mt-1 max-w-[220px] text-xs text-slate-500">
                      {
                        getProgramName(
                          student
                        )
                      }
                    </p>

                  </td>

                  {/* SEMESTER */}

                  <td className="px-5 py-5">

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">

                      <GraduationCap
                        size={
                          13
                        }
                      />

                      Semester{" "}
                      {
                        student?.semester ??
                        "—"
                      }

                    </span>

                  </td>

                  {/* BATCH */}

                  <td className="px-5 py-5">

                    {student?.batch ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700">

                        <Layers3
                          size={
                            13
                          }
                        />

                        Batch{" "}
                        {
                          student.batch
                        }

                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">
                        Not assigned
                      </span>
                    )}

                  </td>

                  {/* DIVISION */}

                  <td className="px-5 py-5">

                    {student?.division ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">

                        <School
                          size={
                            13
                          }
                        />

                        {
                          student.division
                        }

                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">
                        Not assigned
                      </span>
                    )}

                  </td>

                  {/* STATUS */}

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
                            student.id
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
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
                          onEdit(
                            student
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                      >

                        <Edit3
                          size={
                            15
                          }
                        />

                        Edit

                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onStatus(
                            student.id,
                            active
                          )
                        }
                        disabled={
                          statusUpdating
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
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
   STUDENT CARD
============================================================ */

function StudentCard({
  student,
  onView,
  onEdit,
  onStatus,
  statusUpdating,
}) {
  const active =
    student?.user
      ?.isActive ===
    true;

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">

      <div className="flex items-start justify-between gap-3">

        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-600">

            {
              getStudentInitials(
                student
              )
            }

          </div>

          <div className="min-w-0">

            <h3 className="truncate font-bold text-slate-800">
              {
                getStudentName(
                  student
                )
              }
            </h3>

            <p className="mt-1 truncate text-xs font-semibold text-blue-600">
              {
                getEnrollment(
                  student
                )
              }
            </p>

          </div>

        </div>

        {active ? (
          <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-700">
            Active
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700">
            Inactive
          </span>
        )}

      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">

        <CardInfo
          label="Department"
          value={
            getDepartmentCode(
              student
            )
          }
        />

        <CardInfo
          label="Program"
          value={
            getProgramCode(
              student
            )
          }
        />

        <CardInfo
          label="Semester"
          value={
            student?.semester ??
            "—"
          }
        />

        <CardInfo
          label="Batch"
          value={
            student?.batch ||
            "—"
          }
        />

      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3">

        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Division
        </p>

        <p className="mt-1 text-sm font-bold text-slate-700">
          {
            student?.division ||
            "Not assigned"
          }
        </p>

      </div>

      {getStudentEmail(
        student
      ) && (
        <a
          href={`mailto:${getStudentEmail(
            student
          )}`}
          className="mt-4 flex items-center gap-2 break-all text-xs text-slate-500 hover:text-blue-600"
        >

          <Mail
            size={14}
          />

          {
            getStudentEmail(
              student
            )
          }

        </a>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">

        <button
          type="button"
          onClick={() =>
            onView(
              student.id
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
            onEdit(
              student
            )
          }
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-50 px-2 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
        >

          <Edit3
            size={14}
          />

          Edit

        </button>

        <button
          type="button"
          onClick={() =>
            onStatus(
              student.id,
              active
            )
          }
          disabled={
            statusUpdating
          }
          className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-bold disabled:opacity-50 ${
            active
              ? "bg-red-50 text-red-700 hover:bg-red-100"
              : "bg-green-50 text-green-700 hover:bg-green-100"
          }`}
        >

          {active ? (
            <ShieldOff
              size={14}
            />
          ) : (
            <ShieldCheck
              size={14}
            />
          )}

          {active
            ? "Disable"
            : "Activate"}

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

      <p className="mt-1 text-sm font-bold text-slate-700">
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   COVERAGE PANEL
============================================================ */

function CoveragePanel({
  title,
  subtitle,
  value,
  assigned,
  total,
  tone,
  icon,
}) {
  const styles = {
    purple: {
      icon:
        "bg-purple-50 text-purple-600",
      bar:
        "bg-purple-600",
      value:
        "text-purple-700",
    },
    amber: {
      icon:
        "bg-amber-50 text-amber-600",
      bar:
        "bg-amber-500",
      value:
        "text-amber-700",
    },
  };

  const style =
    styles[tone] ||
    styles.purple;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

      <div className="flex items-center gap-3">

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${style.icon}`}
        >
          {icon}
        </div>

        <div>

          <h2 className="font-bold text-slate-800">
            {title}
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {subtitle}
          </p>

        </div>

      </div>

      <div className="mt-6 flex items-end justify-between gap-4">

        <div>

          <p
            className={`text-3xl font-bold ${style.value}`}
          >
            {value}%
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {
              assigned
            }{" "}
            of{" "}
            {
              total
            }{" "}
            students assigned
          </p>

        </div>

        <p className="text-right text-xs font-semibold text-slate-500">
          {
            total -
            assigned
          }{" "}
          remaining
        </p>

      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">

        <div
          className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
          style={{
            width: `${Math.max(
              0,
              Math.min(
                Number(
                  value
                ) ||
                  0,
                100
              )
            )}%`,
          }}
        />

      </div>

    </section>
  );
}

/* ============================================================
   EMPTY STUDENTS
============================================================ */

function EmptyStudents({
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
        No students found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilters
          ? "No student records match your current search or filters."
          : "There are currently no student records available."}
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
   TABLE SKELETON
============================================================ */

function StudentTableSkeleton() {
  return (
    <div className="overflow-hidden">

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

    </div>
  );
}

/* ============================================================
   DETAILS MODAL
============================================================ */

function AddStudentModal({
  form,
  departments,
  programs,
  loading,
  onChange,
  onClose,
  onSubmit,
}) {
  const filteredPrograms = programs.filter(
    (program) =>
      !form.departmentId ||
      String(program?.departmentId) === String(form.departmentId) ||
      String(program?.department?.id) === String(form.departmentId)
  );

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center py-6">
        <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-5">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Plus size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Add New Student</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Create the student account and academic record.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={onSubmit} className="max-h-[78vh] overflow-y-auto p-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <SectionTitle
                  icon={<UserRound size={18} />}
                  title="Personal Information"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="First Name"
                    name="firstName"
                    value={form.firstName}
                    onChange={onChange}
                    placeholder="Enter first name"
                    required
                  />
                  <FormField
                    label="Last Name"
                    name="lastName"
                    value={form.lastName}
                    onChange={onChange}
                    placeholder="Enter last name"
                    required
                  />
                </div>

                <FormField
                  label="Phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={onChange}
                  placeholder="Optional phone number"
                />

                <FormField
                  label="Date of Birth"
                  name="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={onChange}
                />
              </div>

              <div className="space-y-4">
                <SectionTitle
                  icon={<GraduationCap size={18} />}
                  title="Academic Information"
                />

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Enrollment Number
                  </label>
                  <div className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-500">
                    Generated automatically after student creation
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Campus360 assigns the next enrollment number automatically.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Semester"
                    name="semester"
                    type="number"
                    min="1"
                    max="8"
                    value={form.semester}
                    onChange={onChange}
                    placeholder="1 - 8"
                    required
                  />

                  <FormField
                    label="Admission Year"
                    name="admissionYear"
                    type="number"
                    min="2000"
                    max={new Date().getFullYear() + 1}
                    value={form.admissionYear}
                    onChange={onChange}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="departmentId"
                      value={form.departmentId}
                      onChange={onChange}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Program <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="programId"
                      value={form.programId}
                      onChange={onChange}
                      required
                      disabled={!form.departmentId}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    >
                      <option value="">
                        {form.departmentId ? "Select Program" : "Select Department First"}
                      </option>
                      {filteredPrograms.map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.code
                            ? `${program.code} — ${program.name}`
                            : program.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Batch
                    </label>
                    <select
                      name="batch"
                      value={form.batch}
                      onChange={onChange}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Not Assigned</option>
                      <option value="1">Batch 1</option>
                      <option value="2">Batch 2</option>
                      <option value="3">Batch 3</option>
                    </select>
                  </div>

                  <FormField
                    label="Division"
                    name="division"
                    value={form.division}
                    onChange={onChange}
                    placeholder="e.g. A"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 shrink-0 text-blue-600" size={20} />
                <div>
                  <p className="font-bold text-blue-800">Login credentials are generated automatically</p>
                  <p className="mt-1 text-sm leading-6 text-blue-700">
                    Campus360 will automatically assign the next enrollment number, create the institutional email,
                    and use Campus@123 as the temporary password. The credentials will be shown after creation.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw size={17} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={17} />
                    Create Student
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  min,
  max,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function CredentialsModal({ credentials, onClose }) {
  const [copied, setCopied] = useState("");

  const copyValue = async (type, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
      window.setTimeout(() => setCopied(""), 1800);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center py-6">
        <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="bg-emerald-600 px-6 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <CheckCircle2 size={26} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Student Created Successfully</h2>
                <p className="mt-1 text-sm text-emerald-100">
                  Save these credentials and provide them to the student.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {credentials.student && (
              <div className="mb-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Student
                </p>
                <p className="mt-1 font-bold text-slate-800">
                  {credentials.student?.user?.firstName ||
                    credentials.student?.firstName ||
                    ""}{" "}
                  {credentials.student?.user?.lastName ||
                    credentials.student?.lastName ||
                    ""}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {credentials.student?.enrollmentNumber || "Student account"}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <CredentialRow
                label="College Email"
                value={credentials.email}
                copied={copied === "email"}
                onCopy={() => copyValue("email", credentials.email)}
              />

              <CredentialRow
                label="Temporary Password"
                value={credentials.temporaryPassword}
                copied={copied === "password"}
                onCopy={() => copyValue("password", credentials.temporaryPassword)}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              <strong>Important:</strong> This temporary password is shown only here. Make sure
              the student receives it securely.
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CredentialRow({ label, value, copied, onCopy }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
        <code className="min-w-0 flex-1 break-all px-2 text-sm font-semibold text-slate-700">
          {value}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100"
        >
          {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function StudentDetailsModal({
  student,
  loading,
  onClose,
  onEdit,
  onStatus,
  statusUpdating,
}) {
  const active =
    student?.user
      ?.isActive ===
    true;

  const courses =
    Array.isArray(
      student?.enrollments
    )
      ? student.enrollments
      : [];

  const enrollmentCount =
    courses.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">

      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* MODAL HEADER */}

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">

          <div>

            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Student Profile
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-800">
              Student Details
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

          <div className="flex flex-1 items-center justify-center p-12 text-slate-500">

            <div className="text-center">

              <RefreshCw
                size={30}
                className="mx-auto animate-spin text-blue-600"
              />

              <p className="mt-4 text-sm font-semibold">
                Loading student details...
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
                      getStudentInitials(
                        student
                      )
                    }

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
                        getEnrollment(
                          student
                        )
                      }
                    </p>

                    <p className="mt-1 text-xs text-blue-200">
                      {
                        getDepartmentCode(
                          student
                        )
                      }
                      {" · "}
                      {
                        getProgramCode(
                          student
                        )
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

            {/* BASIC INFORMATION */}

            <section className="mt-6">

              <SectionTitle
                icon={
                  <UserRound
                    size={19}
                  />
                }
                title="Basic Information"
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                <InfoItem
                  label="Email"
                  value={
                    getStudentEmail(
                      student
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
                  label="Phone"
                  value={
                    student?.phone ||
                    "Not provided"
                  }
                  icon={
                    <Phone
                      size={15}
                    />
                  }
                />

                <InfoItem
                  label="Semester"
                  value={
                    student?.semester
                      ? `Semester ${student.semester}`
                      : "Not assigned"
                  }
                  icon={
                    <GraduationCap
                      size={15}
                    />
                  }
                />

                <InfoItem
                  label="Admission Year"
                  value={
                    student?.admissionYear ||
                    "Not provided"
                  }
                  icon={
                    <CalendarDays
                      size={15}
                    />
                  }
                />

                <InfoItem
                  label="Department"
                  value={
                    getDepartmentName(
                      student
                    )
                  }
                  icon={
                    <School
                      size={15}
                    />
                  }
                />

                <InfoItem
                  label="Program"
                  value={
                    getProgramName(
                      student
                    )
                  }
                  icon={
                    <BookOpen
                      size={15}
                    />
                  }
                />

                <InfoItem
                  label="Batch"
                  value={
                    student?.batch
                      ? `Batch ${student.batch}`
                      : "Not assigned"
                  }
                  icon={
                    <Layers3
                      size={15}
                    />
                  }
                />

                <InfoItem
                  label="Division"
                  value={
                    student?.division ||
                    "Not assigned"
                  }
                  icon={
                    <School
                      size={15}
                    />
                  }
                />

              </div>

            </section>

            {/* ACADEMIC GROUP */}

            <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    Academic Group
                  </p>

                  <h3 className="mt-1 font-bold text-blue-900">
                    Batch & Division Assignment
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-blue-700">
                    These values are used for academic grouping, timetable and practical/lab allocation.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    onEdit
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                >

                  <Edit3
                    size={16}
                  />

                  Edit Group

                </button>

              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">

                <div className="rounded-xl bg-white p-4">

                  <p className="text-xs text-slate-400">
                    Batch
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-800">
                    {
                      student?.batch ||
                      "Not assigned"
                    }
                  </p>

                </div>

                <div className="rounded-xl bg-white p-4">

                  <p className="text-xs text-slate-400">
                    Division
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-800">
                    {
                      student?.division ||
                      "Not assigned"
                    }
                  </p>

                </div>

              </div>

            </section>

            {/* ENROLLED COURSES */}

            <section className="mt-6">

              <div className="flex items-center justify-between gap-3">

                <SectionTitle
                  icon={
                    <BookOpen
                      size={19}
                    />
                  }
                  title="Enrolled Courses"
                />

                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">

                  {
                    enrollmentCount
                  }{" "}
                  course
                  {
                    enrollmentCount ===
                    1
                      ? ""
                      : "s"
                  }

                </span>

              </div>

              {courses.length >
              0 ? (

                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">

                  <table className="w-full min-w-[760px]">

                    <thead className="bg-slate-50">

                      <tr>

                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Course
                        </th>

                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Type
                        </th>

                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Credits
                        </th>

                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Progress
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {courses.map(
                        (
                          enrollment
                        ) => {

                          const progress =
                            Math.max(
                              0,
                              Math.min(
                                Number(
                                  enrollment?.progressPercent ||
                                    0
                                ),
                                100
                              )
                            );

                          return (
                            <tr
                              key={
                                enrollment.id
                              }
                              className="hover:bg-slate-50"
                            >

                              <td className="px-4 py-4">

                                <p className="font-bold text-slate-700">
                                  {
                                    enrollment
                                      ?.course
                                      ?.code ||
                                    "Course"
                                  }
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {
                                    enrollment
                                      ?.course
                                      ?.name ||
                                    "Unnamed course"
                                  }
                                </p>

                              </td>

                              <td className="px-4 py-4 text-sm text-slate-600">
                                {
                                  enrollment
                                    ?.course
                                    ?.type ||
                                  "—"
                                }
                              </td>

                              <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                                {
                                  enrollment
                                    ?.course
                                    ?.credits ??
                                  "—"
                                }
                              </td>

                              <td className="px-4 py-4">

                                <div className="w-44">

                                  <div className="mb-1 flex items-center justify-between">

                                    <span className="text-[10px] text-slate-400">
                                      Progress
                                    </span>

                                    <span className="text-xs font-bold text-blue-600">
                                      {
                                        progress
                                      }%
                                    </span>

                                  </div>

                                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                                    <div
                                      className="h-full rounded-full bg-blue-600"
                                      style={{
                                        width: `${progress}%`,
                                      }}
                                    />

                                  </div>

                                </div>

                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              ) : (

                <div className="mt-4 rounded-2xl bg-slate-50 p-7 text-center text-sm text-slate-500">
                  No enrolled courses found.
                </div>

              )}

            </section>

            {/* MODAL FOOTER */}

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
   EDIT MODAL
============================================================ */

function EditStudentModal({
  student,
  batch,
  division,
  loading,
  onBatchChange,
  onDivisionChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">

      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-6">

          <div>

            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Academic Group
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-800">
              Edit Student
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {
                getStudentName(
                  student
                )
              }
              {" · "}
              {
                getEnrollment(
                  student
                )
              }
            </p>

          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              loading
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            <X size={18} />
          </button>

        </div>

        <form
          onSubmit={
            onSubmit
          }
          className="space-y-5 p-5 sm:p-6"
        >

          <div>

            <label className="mb-2 block text-sm font-bold text-slate-700">
              Batch
            </label>

            <select
              value={
                batch
              }
              onChange={(
                event
              ) =>
                onBatchChange(
                  event.target
                    .value
                )
              }
              disabled={
                loading
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >

              <option value="">
                Not Assigned
              </option>

              <option value="1">
                Batch 1
              </option>

              <option value="2">
                Batch 2
              </option>

              <option value="3">
                Batch 3
              </option>

            </select>

            <p className="mt-1.5 text-xs text-slate-400">
              Used for practical and lab grouping.
            </p>

          </div>

          <div>

            <label className="mb-2 block text-sm font-bold text-slate-700">
              Division
            </label>

            <input
              type="text"
              value={
                division
              }
              onChange={(
                event
              ) =>
                onDivisionChange(
                  event.target
                    .value
                    .toUpperCase()
                )
              }
              maxLength={
                10
              }
              disabled={
                loading
              }
              placeholder="Example: B"
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            />

            <p className="mt-1.5 text-xs text-slate-400">
              Example: A, B or C.
            </p>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Current Assignment
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3">

              <div className="rounded-xl bg-white p-3">

                <p className="text-xs text-slate-400">
                  Current Batch
                </p>

                <p className="mt-1 font-bold text-slate-700">
                  {
                    student?.batch ||
                    "Not assigned"
                  }
                </p>

              </div>

              <div className="rounded-xl bg-white p-3">

                <p className="text-xs text-slate-400">
                  Current Division
                </p>

                <p className="mt-1 font-bold text-slate-700">
                  {
                    student?.division ||
                    "Not assigned"
                  }
                </p>

              </div>

            </div>

          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                loading
              }
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >

              {loading ? (
                <>
                  <RefreshCw
                    size={17}
                    className="animate-spin"
                  />

                  Saving...
                </>
              ) : (
                <>
                  <Save
                    size={17}
                  />

                  Save Changes
                </>
              )}

            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

/* ============================================================
   SECTION TITLE
============================================================ */

function SectionTitle({
  icon,
  title,
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

export default AdminStudents;