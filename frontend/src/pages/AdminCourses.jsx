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
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Eye,
  Filter,
  GraduationCap,
  Layers3,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  SortAsc,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from "../api";

/* ============================================================
   HELPERS
============================================================ */

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
    "Not Assigned"
  );
}

function getFacultyEmail(
  faculty
) {
  return (
    faculty?.user?.email ||
    faculty?.email ||
    ""
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

function getDepartmentName(
  department
) {
  return (
    department?.name ||
    department?.code ||
    "N/A"
  );
}

function getDepartmentCode(
  department
) {
  return (
    department?.code ||
    "—"
  );
}

function getProgramName(
  program
) {
  return (
    program?.name ||
    program?.code ||
    "N/A"
  );
}

function getProgramCode(
  program
) {
  return (
    program?.code ||
    "—"
  );
}

function getCourseDepartmentId(
  course
) {
  return (
    course?.departmentId ??
    course?.department?.id ??
    null
  );
}

function getCourseProgramId(
  course
) {
  return (
    course?.programId ??
    course?.program?.id ??
    null
  );
}

function getCourseFacultyId(
  course
) {
  return (
    course?.facultyId ??
    course?.faculty?.id ??
    null
  );
}

function getProgramDepartmentId(
  program
) {
  return (
    program?.departmentId ??
    program?.department?.id ??
    null
  );
}

function getFacultyDepartmentId(
  member
) {
  return (
    member?.departmentId ??
    member?.department?.id ??
    null
  );
}

function getCourseStudentCount(
  course
) {
  return Array.isArray(
    course?.enrollments
  )
    ? course.enrollments
        .length
    : Number(
        course?._count
          ?.enrollments ||
          course?.counts
            ?.enrollments ||
          0
      );
}

/* ============================================================
   RESPONSE NORMALIZATION
============================================================ */

function normalizeCourses(
  response
) {
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

  if (
    Array.isArray(
      response?.data?.data
    )
  ) {
    return response.data.data;
  }

  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }

  return [];
}

function normalizeCourse(
  response
) {
  if (
    response?.course
  ) {
    return response.course;
  }

  if (
    response?.data?.course
  ) {
    return response.data.course;
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

function normalizeDepartments(
  response
) {
  if (
    Array.isArray(
      response?.departments
    )
  ) {
    return response.departments;
  }

  if (
    Array.isArray(
      response?.data?.departments
    )
  ) {
    return response.data.departments;
  }

  if (
    Array.isArray(
      response?.data?.data
    )
  ) {
    return response.data.data;
  }

  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }

  return [];
}

function normalizePrograms(
  response
) {
  if (
    Array.isArray(
      response?.programs
    )
  ) {
    return response.programs;
  }

  if (
    Array.isArray(
      response?.data?.programs
    )
  ) {
    return response.data.programs;
  }

  if (
    Array.isArray(
      response?.data?.data
    )
  ) {
    return response.data.data;
  }

  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }

  return [];
}

function normalizeFaculty(
  response
) {
  if (
    Array.isArray(
      response?.faculty
    )
  ) {
    return response.faculty;
  }

  if (
    Array.isArray(
      response?.data?.faculty
    )
  ) {
    return response.data.faculty;
  }

  if (
    Array.isArray(
      response?.data?.data
    )
  ) {
    return response.data.data;
  }

  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }

  return [];
}

/* ============================================================
   FORMAT HELPERS
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

function getCourseTypeLabel(
  type
) {
  if (!type) {
    return "Not specified";
  }

  const labels = {
    LECTURE:
      "Lecture",
    LAB:
      "Lab",
    PRACTICAL:
      "Practical",
    PROJECT:
      "Project",
    ELECTIVE:
      "Elective",
  };

  return (
    labels[
      String(
        type
      ).toUpperCase()
    ] ||
    String(type)
  );
}

function getCourseTypeClass(
  type
) {
  const normalized =
    String(
      type || ""
    ).toUpperCase();

  if (
    normalized ===
    "LAB"
  ) {
    return "bg-purple-50 text-purple-700";
  }

  if (
    normalized ===
    "PRACTICAL"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  if (
    normalized ===
    "PROJECT"
  ) {
    return "bg-green-50 text-green-700";
  }

  if (
    normalized ===
    "ELECTIVE"
  ) {
    return "bg-pink-50 text-pink-700";
  }

  return "bg-blue-50 text-blue-700";
}

/* ============================================================
   EMPTY FORM
============================================================ */

const emptyForm = {
  code: "",
  name: "",
  description: "",
  credits: "",
  semester: "",
  type: "",
  departmentId: "",
  programId: "",
  facultyId: "",
};

/* ============================================================
   MODAL
============================================================ */

function Modal({
  title,
  subtitle,
  children,
  onClose,
  maxWidth = "max-w-5xl",
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">

      <div
        className={`flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-3xl bg-white shadow-2xl`}
      >

        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">

          <div className="min-w-0">

            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Campus360 Administration
            </p>

            <h2 className="mt-1 truncate text-xl font-bold text-slate-800">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-xs text-slate-500">
                {subtitle}
              </p>
            )}

          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <X size={18} />
          </button>

        </div>

        <div className="min-w-0 overflow-x-hidden overflow-y-auto p-5 sm:p-6">
          {children}
        </div>

      </div>

    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

function EmptyText({ children = "No data found." }) {
  return (
    <div className="py-10 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
export default function AdminCourses() {
  const navigate =
    useNavigate();

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

  const [
    faculty,
    setFaculty,
  ] = useState([]);

  const [
    selectedCourse,
    setSelectedCourse,
  ] = useState(null);

  const [
    search,
    setSearch,
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
    semester,
    setSemester,
  ] = useState("");

  const [
    facultyId,
    setFacultyId,
  ] = useState("");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("");

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
    formOpen,
    setFormOpen,
  ] = useState(false);

  const [
    editingCourse,
    setEditingCourse,
  ] = useState(null);

  const [
    form,
    setForm,
  ] = useState(
    emptyForm
  );

  const [
    formLoading,
    setFormLoading,
  ] = useState(false);

  const [
    deleteLoading,
    setDeleteLoading,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    formError,
    setFormError,
  ] = useState("");

  /* ==========================================================
     LOAD REFERENCE DATA
  ========================================================== */

  const loadReferenceData =
    useCallback(
      async () => {
        try {
          const [
            departmentResponse,
            programResponse,
            facultyResponse,
          ] =
            await Promise.all(
              [
                apiGet(
                  "/departments"
                ),
                apiGet(
                  "/programs"
                ),
                apiGet(
                  "/faculty"
                ),
              ]
            );

          setDepartments(
            normalizeDepartments(
              departmentResponse
            )
          );

          setPrograms(
            normalizePrograms(
              programResponse
            )
          );

          setFaculty(
            normalizeFaculty(
              facultyResponse
            )
          );
        } catch (
          err
        ) {
          console.error(
            "Load course reference data error:",
            err
          );

          setError(
            err?.message ||
              "Failed to load course reference data."
          );
        }
      },
      []
    );

  /* ==========================================================
     FETCH COURSES
  ========================================================== */

  const fetchCourses =
    useCallback(
      async (
        showRefreshLoader = false
      ) => {
        try {
          if (
            showRefreshLoader
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

          const response =
            await apiGet(
              "/admin/courses"
            );

          let courseList =
            normalizeCourses(
              response
            );

          const searchValue =
            search
              .trim()
              .toLowerCase();

          if (
            searchValue
          ) {
            courseList =
              courseList.filter(
                (
                  course
                ) => {
                  const searchableText =
                    [
                      course?.code,
                      course?.name,
                      course?.description,
                      course?.type,
                      course
                        ?.department
                        ?.name,
                      course
                        ?.department
                        ?.code,
                      course
                        ?.program
                        ?.name,
                      course
                        ?.program
                        ?.code,
                      getFacultyName(
                        course?.faculty
                      ),
                    ]
                      .filter(
                        Boolean
                      )
                      .join(" ")
                      .toLowerCase();

                  return searchableText.includes(
                    searchValue
                  );
                }
              );
          }

          if (
            departmentId
          ) {
            courseList =
              courseList.filter(
                (
                  course
                ) =>
                  String(
                    getCourseDepartmentId(
                      course
                    )
                  ) ===
                  String(
                    departmentId
                  )
              );
          }

          if (
            programId
          ) {
            courseList =
              courseList.filter(
                (
                  course
                ) =>
                  String(
                    getCourseProgramId(
                      course
                    )
                  ) ===
                  String(
                    programId
                  )
              );
          }

          if (
            semester
          ) {
            courseList =
              courseList.filter(
                (
                  course
                ) =>
                  String(
                    course?.semester
                  ) ===
                  String(
                    semester
                  )
              );
          }

          if (
            facultyId
          ) {
            courseList =
              courseList.filter(
                (
                  course
                ) =>
                  String(
                    getCourseFacultyId(
                      course
                    )
                  ) ===
                  String(
                    facultyId
                  )
              );
          }

          if (
            typeFilter
          ) {
            courseList =
              courseList.filter(
                (
                  course
                ) =>
                  String(
                    course?.type ||
                      ""
                  ).toUpperCase() ===
                  String(
                    typeFilter
                  ).toUpperCase()
              );
          }

          setCourses(
            courseList
          );
        } catch (
          err
        ) {
          console.error(
            "Fetch admin courses error:",
            err
          );

          setError(
            err?.message ||
              "Failed to fetch courses."
          );

          setCourses([]);
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
        departmentId,
        programId,
        semester,
        facultyId,
        typeFilter,
      ]
    );

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    loadReferenceData();
    fetchCourses();
  }, [
    loadReferenceData,
    fetchCourses,
  ]);

  /* ==========================================================
     SUCCESS MESSAGE AUTO HIDE
  ========================================================== */

  useEffect(() => {
    if (
      !successMessage
    ) {
      return;
    }

    const timer =
      setTimeout(
        () => {
          setSuccessMessage(
            ""
          );
        },
        4500
      );

    return () =>
      clearTimeout(
        timer
      );
  }, [
    successMessage,
  ]);

  /* ==========================================================
     OPEN DETAILS
  ========================================================== */

  async function openCourseDetails(
    courseId
  ) {
    try {
      setDetailsLoading(
        true
      );

      setError("");

      const response =
        await apiGet(
          `/admin/courses/${courseId}`
        );

      const course =
        normalizeCourse(
          response
        );

      if (!course) {
        throw new Error(
          "Course details were not returned by the server."
        );
      }

      setSelectedCourse(
        course
      );
    } catch (
      err
    ) {
      console.error(
        "Fetch course details error:",
        err
      );

      setError(
        err?.message ||
          "Failed to fetch course details."
      );
    } finally {
      setDetailsLoading(
        false
      );
    }
  }

  /* ==========================================================
     CREATE FORM
  ========================================================== */

  function openCreateForm() {
    setEditingCourse(
      null
    );

    setForm({
      ...emptyForm,
    });

    setFormError("");
    setFormOpen(
      true
    );
    setSelectedCourse(
      null
    );
  }

  /* ==========================================================
     EDIT FORM
  ========================================================== */

  function openEditForm(
    course
  ) {
    setEditingCourse(
      course
    );

    const courseDepartmentId =
      getCourseDepartmentId(
        course
      );

    setForm({
      code:
        course?.code ||
        "",

      name:
        course?.name ||
        "",

      description:
        course?.description ||
        "",

      credits:
        course?.credits !==
          null &&
        course?.credits !==
          undefined
          ? String(
              course.credits
            )
          : "",

      semester:
        course?.semester !==
          null &&
        course?.semester !==
          undefined
          ? String(
              course.semester
            )
          : "",

      type:
        course?.type ||
        "",

      departmentId:
        courseDepartmentId !==
        null
          ? String(
              courseDepartmentId
            )
          : "",

      programId:
        getCourseProgramId(
          course
        ) !== null
          ? String(
              getCourseProgramId(
                course
              )
            )
          : "",

      facultyId:
        getCourseFacultyId(
          course
        ) !== null
          ? String(
              getCourseFacultyId(
                course
              )
            )
          : "",
    });

    setFormError("");
    setFormOpen(
      true
    );
    setSelectedCourse(
      null
    );
  }

  /* ==========================================================
     FORM CHANGE
  ========================================================== */

  function handleFormChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    if (
      name ===
      "departmentId"
    ) {
      setForm(
        (
          previous
        ) => ({
          ...previous,
          departmentId:
            value,
          programId:
            "",
          facultyId:
            "",
        })
      );

      return;
    }

    if (
      name ===
      "programId"
    ) {
      const selectedProgram =
        programs.find(
          (
            program
          ) =>
            String(
              program?.id
            ) ===
            String(
              value
            )
        );

      const programDepartmentId =
        getProgramDepartmentId(
          selectedProgram
        );

      if (
        programDepartmentId !==
          null &&
        form.departmentId &&
        String(
          programDepartmentId
        ) !==
          String(
            form.departmentId
          )
      ) {
        setForm(
          (
            previous
          ) => ({
            ...previous,
            programId:
              "",
          })
        );

        setFormError(
          "Selected program does not belong to the selected department."
        );

        return;
      }
    }

    setForm(
      (
        previous
      ) => ({
        ...previous,
        [name]:
          value,
      })
    );

    if (
      formError
    ) {
      setFormError("");
    }
  }

  /* ==========================================================
     CREATE / UPDATE COURSE
  ========================================================== */

  async function handleSubmitCourse(
    event
  ) {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    const {
      code,
      name,
      description,
      credits,
      semester:
        formSemester,
      type,
      departmentId:
        formDepartmentId,
      programId:
        formProgramId,
      facultyId:
        formFacultyId,
    } = form;

    if (
      !code.trim() ||
      !name.trim() ||
      !credits ||
      !formSemester ||
      !type ||
      !formDepartmentId ||
      !formProgramId
    ) {
      setFormError(
        "Please fill in all required fields."
      );

      return;
    }

    const creditsNumber =
      Number(
        credits
      );

    const semesterNumber =
      Number(
        formSemester
      );

    if (
      !Number.isFinite(
        creditsNumber
      ) ||
      creditsNumber <=
        0
    ) {
      setFormError(
        "Credits must be a valid positive number."
      );

      return;
    }

    if (
      !Number.isInteger(
        creditsNumber
      )
    ) {
      setFormError(
        "Credits must be a whole number."
      );

      return;
    }

    if (
      !Number.isInteger(
        semesterNumber
      ) ||
      semesterNumber <
        1 ||
      semesterNumber >
        8
    ) {
      setFormError(
        "Semester must be between 1 and 8."
      );

      return;
    }

    const selectedProgram =
      programs.find(
        (
          program
        ) =>
          String(
            program?.id
          ) ===
          String(
            formProgramId
          )
      );

    if (
      selectedProgram
    ) {
      const programDepartmentId =
        getProgramDepartmentId(
          selectedProgram
        );

      if (
        programDepartmentId !==
          null &&
        String(
          programDepartmentId
        ) !==
          String(
            formDepartmentId
          )
      ) {
        setFormError(
          "The selected program does not belong to the selected department."
        );

        return;
      }
    }

    const selectedFaculty =
      formFacultyId
        ? faculty.find(
            (
              member
            ) =>
              String(
                member?.id
              ) ===
              String(
                formFacultyId
              )
          )
        : null;

    if (
      selectedFaculty &&
      getFacultyDepartmentId(
        selectedFaculty
      ) !== null &&
      String(
        getFacultyDepartmentId(
          selectedFaculty
        )
      ) !==
        String(
          formDepartmentId
        )
    ) {
      setFormError(
        "The selected faculty member does not belong to the selected department."
      );

      return;
    }

    try {
      setFormLoading(
        true
      );

      const payload = {
        code:
          code
            .trim()
            .toUpperCase(),

        name:
          name.trim(),

        description:
          description.trim() ||
          null,

        credits:
          creditsNumber,

        semester:
          semesterNumber,

        type:
          type.trim(),

        departmentId:
          Number(
            formDepartmentId
          ),

        programId:
          Number(
            formProgramId
          ),

        facultyId:
          formFacultyId !==
          ""
            ? Number(
                formFacultyId
              )
            : null,
      };

      let response;

      if (
        editingCourse
      ) {
        response =
          await apiPut(
            `/admin/courses/${editingCourse.id}`,
            payload
          );
      } else {
        response =
          await apiPost(
            "/admin/courses",
            payload
          );
      }

      const savedCourse =
        normalizeCourse(
          response
        );

      const wasEditing =
        Boolean(
          editingCourse
        );

      setFormOpen(
        false
      );

      setEditingCourse(
        null
      );

      setForm({
        ...emptyForm,
      });

      setFormError("");

      setSuccessMessage(
        wasEditing
          ? "Course updated successfully."
          : "Course created successfully."
      );

      setSelectedCourse(
        null
      );

      await fetchCourses(
        true
      );

      if (
        savedCourse
      ) {
        setSelectedCourse(
          savedCourse
        );
      }
    } catch (
      err
    ) {
      console.error(
        "Save course error:",
        err
      );

      setFormError(
        err?.message ||
          "Failed to save course."
      );
    } finally {
      setFormLoading(
        false
      );
    }
  }

  /* ==========================================================
     DELETE
  ========================================================== */

  async function handleDeleteCourse(
    course
  ) {
    const enrollmentCount =
      getCourseStudentCount(
        course
      );

    const confirmed =
      window.confirm(
        enrollmentCount >
          0
          ? `Course "${course?.code || ""} - ${course?.name || ""}" has ${enrollmentCount} enrolled student(s). Deleting may be blocked by the server until enrollments are removed. Continue?`
          : `Are you sure you want to delete "${course?.code || ""} - ${course?.name || ""}"?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    try {
      setDeleteLoading(
        course.id
      );

      setError("");
      setSuccessMessage("");

      await apiDelete(
        `/admin/courses/${course.id}`
      );

      setSuccessMessage(
        "Course deleted successfully."
      );

      if (
        selectedCourse?.id ===
        course.id
      ) {
        setSelectedCourse(
          null
        );
      }

      await fetchCourses(
        true
      );
    } catch (
      err
    ) {
      console.error(
        "Delete course error:",
        err
      );

      setError(
        err?.message ||
          "Failed to delete course."
      );
    } finally {
      setDeleteLoading(
        null
      );
    }
  }

  /* ==========================================================
     CLEAR FILTERS
  ========================================================== */

  function clearFilters() {
    setSearch("");
    setDepartmentId("");
    setProgramId("");
    setSemester("");
    setFacultyId("");
    setTypeFilter("");
    setSortBy("name");
    setSortDirection("asc");

    setTimeout(
      () => {
        fetchCourses(
          true
        );
      },
      0
    );
  }

  /* ==========================================================
     FILTERED PROGRAMS
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
            getProgramDepartmentId(
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

  /* ==========================================================
     FORM PROGRAMS
  ========================================================== */

  const formPrograms =
    useMemo(() => {
      if (
        !form.departmentId
      ) {
        return programs;
      }

      return programs.filter(
        (
          program
        ) =>
          String(
            getProgramDepartmentId(
              program
            )
          ) ===
          String(
            form.departmentId
          )
      );
    }, [
      programs,
      form.departmentId,
    ]);

  /* ==========================================================
     FORM FACULTY
  ========================================================== */

  const formFaculty =
    useMemo(() => {
      if (
        !form.departmentId
      ) {
        return faculty;
      }

      return faculty.filter(
        (
          member
        ) =>
          String(
            getFacultyDepartmentId(
              member
            )
          ) ===
          String(
            form.departmentId
          )
      );
    }, [
      faculty,
      form.departmentId,
    ]);

  /* ==========================================================
     PROCESSED COURSES
  ========================================================== */

  const processedCourses =
    useMemo(() => {
      const result =
        [...courses];

      result.sort(
        (
          a,
          b
        ) => {
          let comparison =
            0;

          if (
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
          } else if (
            sortBy ===
            "department"
          ) {
            comparison =
              getDepartmentName(
                a?.department
              ).localeCompare(
                getDepartmentName(
                  b?.department
                )
              );
          } else if (
            sortBy ===
            "program"
          ) {
            comparison =
              getProgramName(
                a?.program
              ).localeCompare(
                getProgramName(
                  b?.program
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
            "credits"
          ) {
            comparison =
              Number(
                a?.credits ||
                  0
              ) -
              Number(
                b?.credits ||
                  0
              );
          } else if (
            sortBy ===
            "students"
          ) {
            comparison =
              getCourseStudentCount(
                a
              ) -
              getCourseStudentCount(
                b
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
      courses,
      sortBy,
      sortDirection,
    ]);

  /* ==========================================================
     SUMMARY
  ========================================================== */

  const totalStudents =
    useMemo(
      () =>
        courses.reduce(
          (
            total,
            course
          ) =>
            total +
            getCourseStudentCount(
              course
            ),
          0
        ),
      [courses]
    );

  const totalCredits =
    useMemo(
      () =>
        courses.reduce(
          (
            total,
            course
          ) =>
            total +
            Number(
              course?.credits ||
                0
            ),
          0
        ),
      [courses]
    );

  const averageCredits =
    courses.length >
    0
      ? (
          totalCredits /
          courses.length
        ).toFixed(1)
      : "0.0";

  const uniqueDepartments =
    new Set(
      courses
        .map(
          (
            course
          ) =>
            getCourseDepartmentId(
              course
            )
        )
        .filter(
          Boolean
        )
    ).size;

  const uniquePrograms =
    new Set(
      courses
        .map(
          (
            course
          ) =>
            getCourseProgramId(
              course
            )
        )
        .filter(
          Boolean
        )
    ).size;

  const facultyAssignedCount =
    courses.filter(
      (
        course
      ) =>
        getCourseFacultyId(
          course
        ) !== null
    ).length;

  const facultyCoverage =
    courses.length >
    0
      ? Math.round(
          (
            facultyAssignedCount /
            courses.length
          ) *
            100
        )
      : 0;

  const uniqueTypes =
    new Set(
      courses
        .map(
          (
            course
          ) =>
            course?.type
        )
        .filter(
          Boolean
        )
    ).size;

  const mostEnrolledCourse =
    courses.length >
    0
      ? courses.reduce(
          (
            highest,
            course
          ) =>
            getCourseStudentCount(
              course
            ) >
            getCourseStudentCount(
              highest
            )
              ? course
              : highest,
          courses[0]
        )
      : null;

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
    Boolean(
      semester
    ) ||
    Boolean(
      facultyId
    ) ||
    Boolean(
      typeFilter
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

              <BookOpen
                size={22}
              />

            </div>

            <div className="min-w-0">

              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Campus360 Administration
              </p>

              <h1 className="truncate text-xl font-bold text-slate-800">
                Course Management
              </h1>

              <p className="hidden text-xs text-slate-500 sm:block">
                Manage courses, academic mapping and teaching assignments.
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={
                openCreateForm
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 sm:px-4"
            >

              <Plus size={17} />

              <span className="hidden sm:inline">
                Add Course
              </span>

            </button>

            <button
              type="button"
              onClick={() =>
                fetchCourses(
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
                  Course Administration
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-blue-100">
                  {courses.length} Courses
                </span>

              </div>

              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
                Course operations at a glance
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
                Create, update, inspect and organize academic courses across departments and programs while monitoring student enrollment and faculty assignment.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">

                <HeroTag
                  icon={
                    <Users
                      size={14}
                    />
                  }
                  text={`${totalStudents} student enrollments`}
                />

                <HeroTag
                  icon={
                    <GraduationCap
                      size={14}
                    />
                  }
                  text={`${uniquePrograms} programs`}
                />

                <HeroTag
                  icon={
                    <Layers3
                      size={14}
                    />
                  }
                  text={`${uniqueTypes} course types`}
                />

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              <HeroMetric
                value={
                  courses.length
                }
                label="Courses"
              />

              <HeroMetric
                value={
                  totalStudents
                }
                label="Enrollments"
              />

              <HeroMetric
                value={
                  facultyAssignedCount
                }
                label="Faculty Assigned"
              />

              <HeroMetric
                value={`${facultyCoverage}%`}
                label="Assignment Rate"
              />

            </div>

          </div>

        </section>

        {/* ====================================================
            MESSAGES
        ==================================================== */}

        {successMessage && (
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
                {
                  successMessage
                }
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage(
                  ""
                )
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
                Course management error
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
              <BookOpen
                size={21}
              />
            }
            label="Total Courses"
            value={
              courses.length
            }
            description="Courses currently displayed"
            tone="blue"
          />

          <KpiCard
            icon={
              <Users size={21} />
            }
            label="Student Enrollments"
            value={
              totalStudents
            }
            description="Across displayed courses"
            tone="green"
          />

          <KpiCard
            icon={
              <GraduationCap
                size={21}
              />
            }
            label="Faculty Assigned"
            value={
              facultyAssignedCount
            }
            description={`${facultyCoverage}% courses have faculty`}
            tone="purple"
          />

          <KpiCard
            icon={
              <Layers3
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
            ANALYTICS
        ==================================================== */}

        <section className="mt-8 grid gap-6 lg:grid-cols-3">

          <AnalyticsPanel
            title="Academic Structure"
            icon={
              <GraduationCap
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

              <MetricBox
                label="Course Types"
                value={
                  uniqueTypes
                }
              />

              <MetricBox
                label="Total Credits"
                value={
                  totalCredits
                }
              />

            </div>

          </AnalyticsPanel>

          <AnalyticsPanel
            title="Credit Distribution"
            icon={
              <BookOpen
                size={20}
              />
            }
            iconClass="bg-purple-50 text-purple-600"
          >

            <p className="text-3xl font-bold text-slate-800">
              {
                averageCredits
              }
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-700">
              Average credits per course
            </p>

            <div className="mt-4 rounded-xl bg-purple-50 p-4">

              <p className="text-xs text-purple-700">
                Total credits
              </p>

              <p className="mt-1 text-xl font-bold text-purple-900">
                {
                  formatCount(
                    totalCredits
                  )
                }
              </p>

            </div>

          </AnalyticsPanel>

          <AnalyticsPanel
            title="Most Enrolled Course"
            icon={
              <Users
                size={20}
              />
            }
            iconClass="bg-green-50 text-green-600"
          >

            {mostEnrolledCourse ? (
              <>
                <p className="text-3xl font-bold text-slate-800">
                  {
                    formatCount(
                      getCourseStudentCount(
                        mostEnrolledCourse
                      )
                    )
                  }
                </p>

                <p className="mt-1 font-bold text-slate-700">
                  {
                    mostEnrolledCourse
                      .name ||
                    "Unnamed course"
                  }
                </p>

                <div className="mt-4 flex flex-wrap gap-2">

                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">

                    {
                      mostEnrolledCourse.code ||
                      "No code"
                    }

                  </span>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">

                    Semester{" "}
                    {
                      mostEnrolledCourse
                        .semester ||
                      "—"
                    }

                  </span>

                </div>
              </>
            ) : (
              <EmptyText text="No course data available." />
            )}

          </AnalyticsPanel>

        </section>

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
                  Find and organize courses by academic mapping.
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

          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">

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
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    fetchCourses(
                      true
                    );
                  }
                }}
                placeholder="Search course code, name, faculty..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
              ) =>
                setProgramId(
                  event.target
                    .value
                )
              }
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
                semester
              }
              onChange={(
                event
              ) =>
                setSemester(
                  event.target
                    .value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >

              <option value="">
                All Semesters
              </option>

              {Array.from(
                {
                  length: 8,
                },
                (
                  _,
                  index
                ) =>
                  index + 1
              ).map(
                (
                  value
                ) => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
                  >
                    Semester{" "}
                    {
                      value
                    }
                  </option>
                )
              )}

            </select>

            <select
              value={
                facultyId
              }
              onChange={(
                event
              ) =>
                setFacultyId(
                  event.target
                    .value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >

              <option value="">
                All Faculty
              </option>

              {faculty.map(
                (
                  member
                ) => (
                  <option
                    key={
                      member.id
                    }
                    value={
                      member.id
                    }
                  >
                    {
                      getFacultyName(
                        member
                      )
                    }
                  </option>
                )
              )}

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
              className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >

              <option value="">
                All Course Types
              </option>

              <option value="LECTURE">
                Lecture
              </option>

              <option value="LAB">
                Lab
              </option>

              <option value="PRACTICAL">
                Practical
              </option>

              <option value="PROJECT">
                Project
              </option>

              <option value="ELECTIVE">
                Elective
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

                <option value="code">
                  Sort by Code
                </option>

                <option value="department">
                  Sort by Department
                </option>

                <option value="program">
                  Sort by Program
                </option>

                <option value="semester">
                  Sort by Semester
                </option>

                <option value="credits">
                  Sort by Credits
                </option>

                <option value="students">
                  Sort by Students
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
              type="button"
              onClick={() =>
                fetchCourses(
                  true
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >

              <Search
                size={17}
              />

              Apply Filters

            </button>

          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs text-slate-500">

              Showing{" "}
              <span className="font-bold text-slate-700">
                {
                  processedCourses.length
                }
              </span>
              {" "}
              of{" "}
              <span className="font-bold text-slate-700">
                {
                  courses.length
                }
              </span>
              {" "}
              courses

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
            COURSE RECORDS
        ==================================================== */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <BookOpen
                    size={21}
                    className="text-blue-600"
                  />

                  <h2 className="text-lg font-bold text-slate-800">
                    Course Records
                  </h2>

                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Manage academic courses and their associated faculty and enrollments.
                </p>

              </div>

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                  {
                    processedCourses.length
                  } displayed
                </span>

                <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
                  {
                    facultyAssignedCount
                  } assigned
                </span>

              </div>

            </div>

          </div>

          {loading ? (

            <CourseTableSkeleton />

          ) : processedCourses.length ===
            0 ? (

            <EmptyCourseState
              hasFilters={
                hasFilters
              }
              onClear={
                clearFilters
              }
            />

          ) : viewMode ===
            "table" ? (

            <CourseTable
              courses={
                processedCourses
              }
              onView={
                openCourseDetails
              }
              onEdit={
                openEditForm
              }
              onDelete={
                handleDeleteCourse
              }
              deleteLoading={
                deleteLoading
              }
            />

          ) : (

            <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">

              {processedCourses.map(
                (
                  course
                ) => (
                  <CourseCard
                    key={
                      course.id
                    }
                    course={
                      course
                    }
                    onView={
                      openCourseDetails
                    }
                    onEdit={
                      openEditForm
                    }
                    onDelete={
                      handleDeleteCourse
                    }
                    deleteLoading={
                      deleteLoading
                    }
                  />
                )
              )}

            </div>

          )}

        </section>

      </main>

      {/* ======================================================
          CREATE / EDIT MODAL
      ====================================================== */}

      {formOpen && (
        <Modal
          title={
            editingCourse
              ? "Edit Course"
              : "Add New Course"
          }
          subtitle={
            editingCourse
              ? `Editing ${editingCourse.code || "course"}`
              : "Create a new academic course."
          }
          maxWidth="max-w-3xl"
          onClose={() => {
            if (
              !formLoading
            ) {
              setFormOpen(
                false
              );

              setFormError(
                ""
              );
            }
          }}
        >

          <form
            onSubmit={
              handleSubmitCourse
            }
            className="space-y-6"
          >

            {formError && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

                <AlertCircle
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <p>
                  {
                    formError
                  }
                </p>

              </div>
            )}

            {/* BASIC */}

            <section>

              <FormSectionTitle
                title="Basic Course Information"
                icon={
                  <BookOpen
                    size={18}
                  />
                }
              />

              <div className="mt-4 grid gap-4 md:grid-cols-2">

                <FormField
                  label="Course Code"
                  required
                >
                  <input
                    name="code"
                    value={
                      form.code
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="e.g. CS301"
                    required
                    className="form-input"
                  />
                </FormField>

                <FormField
                  label="Course Name"
                  required
                >
                  <input
                    name="name"
                    value={
                      form.name
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="e.g. Data Structures"
                    required
                    className="form-input"
                  />
                </FormField>

                <FormField
                  label="Credits"
                  required
                >
                  <input
                    name="credits"
                    type="number"
                    min="1"
                    step="1"
                    value={
                      form.credits
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="e.g. 4"
                    required
                    className="form-input"
                  />
                </FormField>

                <FormField
                  label="Semester"
                  required
                >
                  <select
                    name="semester"
                    value={
                      form.semester
                    }
                    onChange={
                      handleFormChange
                    }
                    required
                    className="form-input"
                  >

                    <option value="">
                      Select Semester
                    </option>

                    {Array.from(
                      {
                        length: 8,
                      },
                      (
                        _,
                        index
                      ) =>
                        index +
                        1
                    ).map(
                      (
                        value
                      ) => (
                        <option
                          key={
                            value
                          }
                          value={
                            value
                          }
                        >
                          Semester{" "}
                          {
                            value
                          }
                        </option>
                      )
                    )}

                  </select>
                </FormField>

                <FormField
                  label="Course Type"
                  required
                >
                  <select
                    name="type"
                    value={
                      form.type
                    }
                    onChange={
                      handleFormChange
                    }
                    required
                    className="form-input"
                  >

                    <option value="">
                      Select Type
                    </option>

                    <option value="LECTURE">
                      Lecture
                    </option>

                    <option value="LAB">
                      Lab
                    </option>

                    <option value="PRACTICAL">
                      Practical
                    </option>

                    <option value="PROJECT">
                      Project
                    </option>

                    <option value="ELECTIVE">
                      Elective
                    </option>

                  </select>
                </FormField>

              </div>

            </section>

            {/* ACADEMIC MAPPING */}

            <section>

              <FormSectionTitle
                title="Academic Mapping"
                icon={
                  <GraduationCap
                    size={18}
                  />
                }
              />

<div className="mt-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">

  <div className="min-w-0">
    <FormField
      label="Department"
      required
    >
      <select
        name="departmentId"
        value={
          form.departmentId
        }
        onChange={
          handleFormChange
        }
        required
        className="form-input w-full min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
      >

        <option value="">
          Select Department
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
    </FormField>
  </div>

<div className="min-w-0">
  <FormField
    label="Program"
    required
  >
    <select
      name="programId"
      value={form.programId}
      onChange={handleFormChange}
      required
      disabled={!form.departmentId}
      className="form-input w-full min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap disabled:bg-slate-100"
    >
      <option value="">
        {form.departmentId
          ? "Select Program"
          : "Select Department First"}
      </option>

      {formPrograms.map(
        (program) => (
          <option
            key={program.id}
            value={program.id}
          >
            {program.code
              ? `${program.code} — ${program.name}`
              : program.name}
          </option>
        )
      )}
    </select>
  </FormField>
</div>

<div className="min-w-0">
  <FormField
    label="Faculty"
  >
    <select
      name="facultyId"
      value={form.facultyId}
      onChange={handleFormChange}
      disabled={!form.departmentId}
      className="form-input w-full min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap disabled:bg-slate-100"
    >
      <option value="">
        {form.departmentId
          ? "Not Assigned"
          : "Select Department First"}
      </option>

      {formFaculty.map(
        (member) => (
          <option
            key={member.id}
            value={member.id}
          >
            {getFacultyName(member)}
          </option>
        )
      )}
    </select>
  </FormField>
</div>

</div>

</section>

            {/* DESCRIPTION */}

            <section>

              <FormSectionTitle
                title="Course Description"
                icon={
                  <Layers3
                    size={18}
                  />
                }
              />

              <div className="mt-4">

                <textarea
                  name="description"
                  value={
                    form.description
                  }
                  onChange={
                    handleFormChange
                  }
                  rows={5}
                  placeholder="Enter course description..."
                  className="form-input resize-none"
                />

              </div>

            </section>

            {/* ACTIONS */}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

              <button
                type="button"
                disabled={
                  formLoading
                }
                onClick={() => {
                  setFormOpen(
                    false
                  );

                  setFormError(
                    ""
                  );
                }}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  formLoading
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {formLoading ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />

                    Saving...
                  </>
                ) : editingCourse ? (
                  <>
                    <Edit3
                      size={18}
                    />

                    Update Course
                  </>
                ) : (
                  <>
                    <Plus size={18} />

                    Create Course
                  </>
                )}

              </button>

            </div>

          </form>

        </Modal>
      )}

      {/* ======================================================
          DETAILS MODAL
      ====================================================== */}

      {selectedCourse && (
        <Modal
          title={`${selectedCourse.code || "Course"} — Course Details`}
          subtitle={
            selectedCourse.name
          }
          maxWidth="max-w-6xl"
          onClose={() =>
            setSelectedCourse(
              null
            )
          }
        >

          {detailsLoading ? (

            <div className="flex min-h-[350px] items-center justify-center">

              <div className="text-center">

                <Loader2
                  size={32}
                  className="mx-auto animate-spin text-blue-600"
                />

                <p className="mt-4 text-sm font-semibold text-slate-500">
                  Loading course details...
                </p>

              </div>

            </div>

          ) : (

            <div>

              {/* HERO */}

              <section className="rounded-2xl bg-blue-600 p-5 text-white sm:p-6">

                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                  <div className="flex items-center gap-4">

                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold">

                      {
                        selectedCourse.code?.charAt(
                          0
                        ) ||
                        "C"
                      }

                    </div>

                    <div className="min-w-0">

                      <p className="text-xs font-bold uppercase tracking-wide text-blue-100">
                        Academic Course
                      </p>

                      <h3 className="mt-1 text-2xl font-bold">
                        {
                          selectedCourse.name ||
                          "Unnamed Course"
                        }
                      </h3>

                      <p className="mt-1 text-sm font-semibold text-blue-100">
                        {
                          selectedCourse.code ||
                          "No course code"
                        }
                      </p>

                    </div>

                  </div>

                  <div className="flex flex-wrap gap-2">

                    <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-blue-100">

                      Semester{" "}
                      {
                        selectedCourse.semester ||
                        "—"
                      }

                    </span>

                    <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-blue-100">

                      {
                        getCourseTypeLabel(
                          selectedCourse.type
                        )
                      }

                    </span>

                  </div>

                </div>

              </section>

              {/* SUMMARY */}

              <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

                <DetailStat
                  label="Credits"
                  value={
                    selectedCourse.credits ??
                    "—"
                  }
                  icon={
                    <GraduationCap
                      size={18}
                    />
                  }
                  tone="blue"
                />

                <DetailStat
                  label="Semester"
                  value={
                    selectedCourse.semester ??
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
                  label="Students"
                  value={getCourseStudentCount(
                    selectedCourse
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
                  value={
                    getCourseFacultyId(
                      selectedCourse
                    ) !==
                    null
                      ? "Assigned"
                      : "Unassigned"
                  }
                  icon={
                    <UserRound
                      size={18}
                    />
                  }
                  tone="amber"
                />

              </section>

              {/* ACTIONS */}

              <div className="mt-6 flex flex-wrap justify-end gap-2">

                <button
                  type="button"
                  onClick={() =>
                    openEditForm(
                      selectedCourse
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
                >

                  <Edit3
                    size={17}
                  />

                  Edit Course

                </button>

                <button
                  type="button"
                  disabled={
                    deleteLoading ===
                    selectedCourse.id
                  }
                  onClick={() =>
                    handleDeleteCourse(
                      selectedCourse
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >

                  {deleteLoading ===
                  selectedCourse.id ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Trash2
                      size={17}
                    />
                  )}

                  Delete

                </button>

              </div>

              {/* ACADEMIC INFO */}

              <section className="mt-7">

                <SectionTitle
                  title="Academic Information"
                  icon={
                    <GraduationCap
                      size={19}
                    />
                  }
                />

                <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">

                  <InfoCard
                    icon={
                      <BookOpen
                        size={16}
                      />
                    }
                    label="Department"
                    value={getDepartmentName(
                      selectedCourse.department
                    )}
                  />

                  <InfoCard
                    icon={
                      <GraduationCap
                        size={16}
                      />
                    }
                    label="Program"
                    value={getProgramName(
                      selectedCourse.program
                    )}
                  />

                  <InfoCard
                    icon={
                      <CalendarDays
                        size={16}
                      />
                    }
                    label="Semester"
                    value={
                      selectedCourse.semester
                        ? `Semester ${selectedCourse.semester}`
                        : "Not specified"
                    }
                  />

                  <InfoCard
                    icon={
                      <Layers3
                        size={16}
                      />
                    }
                    label="Course Type"
                    value={getCourseTypeLabel(
                      selectedCourse.type
                    )}
                  />

                </div>

              </section>

              {/* FACULTY */}

              <section className="mt-7">

                <SectionTitle
                  title="Faculty Assignment"
                  icon={
                    <UserRound
                      size={19}
                    />
                  }
                />

                <div className="mt-4 rounded-2xl border border-slate-200 p-5">

                  {selectedCourse.faculty ? (

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div className="flex items-center gap-3">

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-600">

                          {
                            getFacultyInitials(
                              selectedCourse.faculty
                            )
                          }

                        </div>

                        <div>

                          <p className="font-bold text-slate-800">
                            {
                              getFacultyName(
                                selectedCourse.faculty
                              )
                            }
                          </p>

                          <p className="mt-1 text-xs font-semibold text-blue-600">

                            {
                              selectedCourse
                                .faculty
                                .employeeId ||
                              "Employee ID unavailable"
                            }

                          </p>

                          {getFacultyEmail(
                            selectedCourse.faculty
                          ) && (
                            <p className="mt-1 text-xs text-slate-400">

                              {
                                getFacultyEmail(
                                  selectedCourse.faculty
                                )
                              }

                            </p>
                          )}

                        </div>

                      </div>

                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">

                        <CheckCircle2
                          size={14}
                        />

                        Faculty Assigned

                      </span>

                    </div>

                  ) : (

                    <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4">

                      <AlertCircle
                        size={19}
                        className="text-amber-600"
                      />

                      <div>

                        <p className="text-sm font-bold text-amber-900">
                          No faculty assigned
                        </p>

                        <p className="mt-1 text-xs text-amber-700">
                          Assign a faculty member by editing this course.
                        </p>

                      </div>

                    </div>

                  )}

                </div>

              </section>

              {/* DESCRIPTION */}

              <section className="mt-7">

                <SectionTitle
                  title="Description"
                  icon={
                    <Layers3
                      size={19}
                    />
                  }
                />

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">

                  {
                    selectedCourse.description ||
                    "No course description available."
                  }

                </div>

              </section>

              {/* ENROLLMENTS */}

              <section className="mt-7">

                <div className="flex items-center justify-between gap-3">

                  <SectionTitle
                    title="Enrolled Students"
                    icon={
                      <Users
                        size={19}
                      />
                    }
                  />

                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">

                    {
                      formatCount(
                        getCourseStudentCount(
                          selectedCourse
                        )
                      )
                    }

                  </span>

                </div>

                {Array.isArray(
                  selectedCourse.enrollments
                ) &&
                selectedCourse
                  .enrollments
                  .length >
                  0 ? (

                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">

                    <div className="max-h-80 overflow-y-auto">

                      {
                        selectedCourse.enrollments.map(
                          (
                            enrollment
                          ) => {

                            const student =
                              enrollment?.student;

                            const studentName =
                              `${student?.user?.firstName || ""} ${
                                student?.user?.lastName || ""
                              }`.trim() ||
                              "Unknown Student";

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
                              <div
                                key={
                                  enrollment.id
                                }
                                className="border-b border-slate-100 p-4 last:border-b-0"
                              >

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                  <div>

                                    <p className="font-semibold text-slate-800">
                                      {
                                        studentName
                                      }
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">

                                      {
                                        student
                                          ?.enrollmentNumber ||
                                        student
                                          ?.user
                                          ?.email ||
                                        "Student information unavailable"
                                      }

                                    </p>

                                  </div>

                                  <div className="sm:w-48">

                                    <div className="mb-1 flex items-center justify-between">

                                      <span className="text-[10px] font-medium text-slate-400">
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

                                </div>

                              </div>
                            );
                          }
                        )
                      }

                    </div>

                  </div>

                ) : (

                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center">

                    <Users
                      size={32}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 text-sm font-semibold text-slate-600">
                      No students enrolled
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      This course currently has no enrollment records.
                    </p>

                  </div>

                )}

              </section>

              <div className="mt-7 flex justify-end border-t border-slate-200 pt-5">

                <button
                  type="button"
                  onClick={() =>
                    setSelectedCourse(
                      null
                    )
                  }
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Close
                </button>

              </div>

            </div>

          )}

        </Modal>
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
   COURSE TABLE
============================================================ */

function CourseTable({
  courses,
  onView,
  onEdit,
  onDelete,
  deleteLoading,
}) {
  return (
    <div className="overflow-x-auto">

      <table className="w-full min-w-[1350px]">

        <thead className="border-b border-slate-200 bg-slate-50">

          <tr>

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
              Faculty
            </TableHeader>

            <TableHeader>
              Type
            </TableHeader>

            <TableHeader>
              Credits
            </TableHeader>

            <TableHeader>
              Students
            </TableHeader>

            <TableHeader align="right">
              Actions
            </TableHeader>

          </tr>

        </thead>

        <tbody className="divide-y divide-slate-100">

          {courses.map(
            (
              course
            ) => {

              const studentCount =
                getCourseStudentCount(
                  course
                );

              return (
                <tr
                  key={
                    course.id
                  }
                  className="transition hover:bg-slate-50"
                >

                  <td className="px-5 py-5">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-600">

                        {
                          course?.code?.charAt(
                            0
                          ) ||
                          "C"
                        }

                      </div>

                      <div className="min-w-0">

                        <p className="truncate font-bold text-slate-800">
                          {
                            course?.name ||
                            "Unnamed Course"
                          }
                        </p>

                        <p className="mt-1 text-xs font-semibold text-blue-600">
                          {
                            course?.code ||
                            "No Code"
                          }
                        </p>

                      </div>

                    </div>

                  </td>

                  <td className="px-5 py-5">

                    <p className="font-semibold text-slate-700">
                      {
                        getDepartmentCode(
                          course?.department
                        )
                      }
                    </p>

                    <p className="mt-1 max-w-[170px] text-xs text-slate-500">
                      {
                        getDepartmentName(
                          course?.department
                        )
                      }
                    </p>

                  </td>

                  <td className="px-5 py-5">

                    <p className="font-semibold text-slate-700">
                      {
                        getProgramCode(
                          course?.program
                        )
                      }
                    </p>

                    <p className="mt-1 max-w-[200px] text-xs text-slate-500">
                      {
                        getProgramName(
                          course?.program
                        )
                      }
                    </p>

                  </td>

                  <td className="px-5 py-5">

                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">

                      Sem{" "}
                      {
                        course?.semester ||
                        "—"
                      }

                    </span>

                  </td>

                  <td className="px-5 py-5">

                    <div className="flex items-center gap-2">

                      {course?.faculty ? (
                        <>
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600">

                            {
                              getFacultyInitials(
                                course.faculty
                              )
                            }

                          </div>

                          <div className="min-w-0">

                            <p className="max-w-[170px] truncate text-sm font-semibold text-slate-700">
                              {
                                getFacultyName(
                                  course.faculty
                                )
                              }
                            </p>

                            <p className="text-[10px] text-slate-400">
                              {
                                course
                                  .faculty
                                  .employeeId ||
                                ""
                              }
                            </p>

                          </div>
                        </>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">
                          Not assigned
                        </span>
                      )}

                    </div>

                  </td>

                  <td className="px-5 py-5">

                    <span
                      className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold ${getCourseTypeClass(
                        course?.type
                      )}`}
                    >
                      {
                        getCourseTypeLabel(
                          course?.type
                        )
                      }
                    </span>

                  </td>

                  <td className="px-5 py-5">

                    <span className="font-bold text-slate-700">
                      {
                        course?.credits ??
                        "—"
                      }
                    </span>

                  </td>

                  <td className="px-5 py-5">

                    <div className="flex items-center gap-2">

                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">

                        <Users
                          size={15}
                        />

                      </div>

                      <span className="font-bold text-slate-700">
                        {
                          formatCount(
                            studentCount
                          )
                        }
                      </span>

                    </div>

                  </td>

                  <td className="px-5 py-5">

                    <div className="flex items-center justify-end gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          onView(
                            course.id
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
                          onEdit(
                            course
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
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
                        disabled={
                          deleteLoading ===
                          course.id
                        }
                        onClick={() =>
                          onDelete(
                            course
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >

                        {deleteLoading ===
                        course.id ? (
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

                        Delete

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
   COURSE CARD
============================================================ */

function CourseCard({
  course,
  onView,
  onEdit,
  onDelete,
  deleteLoading,
}) {
  const studentCount =
    getCourseStudentCount(
      course
    );

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">

      <div className="flex items-start gap-3">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-600">

          {
            course?.code?.charAt(
              0
            ) ||
            "C"
          }

        </div>

        <div className="min-w-0 flex-1">

          <div className="flex items-start justify-between gap-2">

            <div className="min-w-0">

              <h3 className="truncate font-bold text-slate-800">
                {
                  course?.name ||
                  "Unnamed Course"
                }
              </h3>

              <p className="mt-1 text-xs font-bold text-blue-600">
                {
                  course?.code ||
                  "No Code"
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

      <div className="mt-4 flex flex-wrap gap-2">

        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">

          Semester{" "}
          {
            course?.semester ||
            "—"
          }

        </span>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${getCourseTypeClass(
            course?.type
          )}`}
        >
          {
            getCourseTypeLabel(
              course?.type
            )
          }
        </span>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">

          {
            course?.credits ??
            0
          }{" "}
          Credits

        </span>

      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-4">

        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Academic Mapping
        </p>

        <p className="mt-1 truncate text-sm font-bold text-slate-700">

          {
            getDepartmentName(
              course?.department
            )
          }

        </p>

        <p className="mt-1 truncate text-xs text-slate-500">

          {
            getProgramName(
              course?.program
            )
          }

        </p>

      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">

        <MiniMetric
          label="Students"
          value={
            studentCount
          }
          icon={
            <Users size={15} />
          }
          tone="green"
        />

        <MiniMetric
          label="Faculty"
          value={
            course?.faculty
              ? "Assigned"
              : "Open"
          }
          icon={
            <UserRound
              size={15}
            />
          }
          tone={
            course?.faculty
              ? "blue"
              : "amber"
          }
        />

      </div>

      <div className="mt-4 rounded-xl border border-slate-100 p-3">

        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Faculty
        </p>

        <p className="mt-1 truncate text-sm font-semibold text-slate-700">

          {
            getFacultyName(
              course?.faculty
            )
          }

        </p>

      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">

        <button
          type="button"
          onClick={() =>
            onView(
              course.id
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
              course
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
          disabled={
            deleteLoading ===
            course.id
          }
          onClick={() =>
            onDelete(
              course
            )
          }
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-red-50 px-2 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
        >

          {deleteLoading ===
          course.id ? (
            <Loader2
              size={14}
              className="animate-spin"
            />
          ) : (
            <Trash2
              size={14}
            />
          )}

          Delete

        </button>

      </div>

    </article>
  );
}

/* ============================================================
   MINI METRIC
============================================================ */

function MiniMetric({
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

        <span className="truncate text-xs font-bold text-slate-700">
          {value}
        </span>

      </div>

      <p className="mt-2 text-[10px] font-semibold text-slate-400">
        {label}
      </p>

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
   COURSE DETAIL STAT
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
   INFO CARD
============================================================ */

function InfoCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex items-center gap-2 text-slate-500">

        {icon}

        <span className="text-[10px] font-bold uppercase tracking-wide">
          {label}
        </span>

      </div>

      <p className="mt-2 break-words text-sm font-bold text-slate-700">
        {value}
      </p>

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
   FORM SECTION TITLE
============================================================ */

function FormSectionTitle({
  title,
  icon,
}) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">

      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>

      <h3 className="font-bold text-slate-800">
        {title}
      </h3>

    </div>
  );
}

/* ============================================================
   FORM FIELD
============================================================ */

function FormField({
  label,
  required = false,
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
   EMPTY COURSE
============================================================ */

function EmptyCourseState({
  hasFilters,
  onClear,
}) {
  return (
    <div className="p-12 text-center">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

        <BookOpen
          size={31}
        />

      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-800">
        No courses found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">

        {hasFilters
          ? "No courses match your current search or filters."
          : "There are currently no course records available."}

      </p>

      <div className="mt-5 flex justify-center gap-2">

        {hasFilters && (
          <button
            type="button"
            onClick={
              onClear
            }
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            Clear Filters
          </button>
        )}

      </div>

    </div>
  );
}

/* ============================================================
   SKELETON
============================================================ */

function CourseTableSkeleton() {
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
   GLOBAL FORM INPUT CLASS
============================================================ */

const formInputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

if (
  typeof document !==
  "undefined"
) {
  // Intentionally left without DOM manipulation.
}

/* ============================================================
   EXPORT
============================================================ */

// Tailwind-safe aliases used by form fields.
function FormInputAlias() {
  return null;
}

export {
  formInputClass as COURSE_FORM_INPUT_CLASS,
  FormInputAlias,
};
