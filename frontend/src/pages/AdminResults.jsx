import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Eye,
  Filter,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Trophy,
  Users,
  X,
  AlertCircle,
  BarChart3,
} from "lucide-react";

/* ============================================================
   API CONFIGURATION
============================================================ */

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* ============================================================
   HELPERS
============================================================ */

const getToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    ""
  );
};

const getAuthHeaders = () => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

const extractArray = (response, keys = []) => {
  if (!response) return [];

  if (Array.isArray(response)) {
    return response;
  }

  for (const key of keys) {
    if (Array.isArray(response[key])) {
      return response[key];
    }
  }

  if (response.data && Array.isArray(response.data)) {
    return response.data;
  }

  if (response.data?.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }

  return [];
};

const getStudentName = (student) => {
  if (!student) return "Unknown Student";

  const user = student.user;

  if (user) {
    const fullName = `${user.firstName || ""} ${
      user.lastName || ""
    }`.trim();

    if (fullName) return fullName;

    if (user.email) return user.email;
  }

  const fullName = `${student.firstName || ""} ${
    student.lastName || ""
  }`.trim();

  if (fullName) return fullName;

  if (student.enrollmentNumber) {
    return student.enrollmentNumber;
  }

  return `Student #${student.id}`;
};

const getStudentEmail = (student) => {
  return (
    student?.user?.email ||
    student?.email ||
    ""
  );
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getPercentage = (marks, maxMarks) => {
  const obtained = Number(marks);
  const maximum = Number(maxMarks);

  if (
    !Number.isFinite(obtained) ||
    !Number.isFinite(maximum) ||
    maximum <= 0
  ) {
    return 0;
  }

  return Math.round((obtained / maximum) * 100);
};

const getGradeClass = (grade) => {
  const value = String(grade || "")
    .trim()
    .toUpperCase();

  if (["A+", "A", "O"].includes(value)) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (["B+", "B"].includes(value)) {
    return "bg-blue-50 text-blue-700";
  }

  if (["C+", "C"].includes(value)) {
    return "bg-amber-50 text-amber-700";
  }

  if (["D", "E"].includes(value)) {
    return "bg-orange-50 text-orange-700";
  }

  if (["F", "FAIL"].includes(value)) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
};

/* ============================================================
   INITIAL FORM
============================================================ */

const initialForm = {
  examId: "",
  studentId: "",
  courseId: "",
  marksObtained: "",
  grade: "",
  gradePoint: "",
};

/* ============================================================
   ADMIN RESULTS
============================================================ */

const AdminResults = () => {
  const navigate = useNavigate();

  /* ----------------------------------------------------------
     STATE
  ---------------------------------------------------------- */

  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [examFilter, setExamFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingResult, setEditingResult] = useState(null);
  const [viewingResult, setViewingResult] = useState(null);
  const [deletingResult, setDeletingResult] = useState(null);

  const [form, setForm] = useState(initialForm);

  /* ----------------------------------------------------------
     API REQUEST
  ---------------------------------------------------------- */

  const apiRequest = async (url, options = {}) => {
    const response = await fetch(
      `${API_BASE_URL}${url}`,
      {
        ...options,
        headers: {
          ...getAuthHeaders(),
          ...(options.headers || {}),
        },
      }
    );

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        data.message ||
          "You are not authorized to perform this action."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Something went wrong. Please try again."
      );
    }

    return data;
  };

  /* ----------------------------------------------------------
     FETCH RESULTS
  ---------------------------------------------------------- */

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.append("search", search.trim());
      }

      if (examFilter) {
        params.append("examId", examFilter);
      }

      if (courseFilter) {
        params.append("courseId", courseFilter);
      }

      if (gradeFilter.trim()) {
        params.append("grade", gradeFilter.trim());
      }

      const query = params.toString();

      const response = await apiRequest(
        `/admin/results${query ? `?${query}` : ""}`
      );

      const resultList = extractArray(response, [
        "results",
        "data",
      ]);

      setResults(resultList);
    } catch (err) {
      console.error("fetchResults error:", err);
      setError(
        err.message || "Failed to load exam results."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------------------------------
     FETCH DROPDOWN DATA
  ---------------------------------------------------------- */

  const fetchOptions = async () => {
    try {
      setLoadingOptions(true);

      const [examResponse, studentResponse, courseResponse] =
        await Promise.all([
          apiRequest("/admin/exams"),
          apiRequest("/admin/students"),
          apiRequest("/admin/courses"),
        ]);

      const examList = extractArray(examResponse, [
        "exams",
        "data",
      ]);

      const studentList = extractArray(studentResponse, [
        "students",
        "data",
      ]);

      const courseList = extractArray(courseResponse, [
        "courses",
        "data",
      ]);

      setExams(examList);
      setStudents(studentList);
      setCourses(courseList);
    } catch (err) {
      console.error("fetchOptions error:", err);

      setError(
        err.message ||
          "Failed to load exams, students, or courses."
      );
    } finally {
      setLoadingOptions(false);
    }
  };

  /* ----------------------------------------------------------
     INITIAL LOAD
  ---------------------------------------------------------- */

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchResults();
  }, [
    search,
    examFilter,
    courseFilter,
    gradeFilter,
  ]);

  /* ----------------------------------------------------------
     SELECTED EXAM
  ---------------------------------------------------------- */

  const selectedExam = useMemo(() => {
    return exams.find(
      (exam) => String(exam.id) === String(form.examId)
    );
  }, [exams, form.examId]);

  /* ----------------------------------------------------------
     EXAM CHANGE
  ---------------------------------------------------------- */

  const handleExamChange = (examId) => {
    const exam = exams.find(
      (item) => String(item.id) === String(examId)
    );

    setForm((previous) => ({
      ...previous,
      examId,
      courseId: exam?.courseId
        ? String(exam.courseId)
        : "",
    }));
  };

  /* ----------------------------------------------------------
     FORM CHANGE
  ---------------------------------------------------------- */

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    if (name === "examId") {
      handleExamChange(value);
      return;
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* ----------------------------------------------------------
     OPEN ADD
  ---------------------------------------------------------- */

  const openAddModal = () => {
    setEditingResult(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  /* ----------------------------------------------------------
     OPEN EDIT
  ---------------------------------------------------------- */

  const openEditModal = (result) => {
    setEditingResult(result);

    setForm({
      examId: result.examId
        ? String(result.examId)
        : "",
      studentId: result.studentId
        ? String(result.studentId)
        : "",
      courseId: result.courseId
        ? String(result.courseId)
        : "",
      marksObtained:
        result.marksObtained !== null &&
        result.marksObtained !== undefined
          ? String(result.marksObtained)
          : "",
      grade: result.grade || "",
      gradePoint:
        result.gradePoint !== null &&
        result.gradePoint !== undefined
          ? String(result.gradePoint)
          : "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  /* ----------------------------------------------------------
     OPEN VIEW
  ---------------------------------------------------------- */

  const openViewModal = (result) => {
    setViewingResult(result);
    setShowViewModal(true);
  };

  /* ----------------------------------------------------------
     CLOSE MODAL
  ---------------------------------------------------------- */

  const closeModal = () => {
    if (submitting) return;

    setShowModal(false);
    setEditingResult(null);
    setForm(initialForm);
  };

  /* ----------------------------------------------------------
     SUBMIT RESULT
  ---------------------------------------------------------- */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.examId) {
      setError("Please select an exam.");
      return;
    }

    if (!form.studentId) {
      setError("Please select a student.");
      return;
    }

    if (!form.courseId) {
      setError("Please select a course.");
      return;
    }

    if (
      form.marksObtained === "" ||
      form.marksObtained === null
    ) {
      setError("Please enter marks obtained.");
      return;
    }

    const marks = Number(form.marksObtained);

    if (!Number.isFinite(marks) || marks < 0) {
      setError(
        "Marks obtained must be a valid non-negative number."
      );
      return;
    }

    if (
      selectedExam &&
      marks > Number(selectedExam.maxMarks)
    ) {
      setError(
        `Marks obtained cannot exceed the maximum marks of ${selectedExam.maxMarks}.`
      );
      return;
    }

    let parsedGradePoint = null;

    if (
      form.gradePoint !== "" &&
      form.gradePoint !== null
    ) {
      parsedGradePoint = Number(form.gradePoint);

      if (
        !Number.isFinite(parsedGradePoint) ||
        parsedGradePoint < 0
      ) {
        setError(
          "Grade point must be a valid non-negative number."
        );
        return;
      }
    }

    const payload = {
      examId: Number(form.examId),
      studentId: Number(form.studentId),
      courseId: Number(form.courseId),
      marksObtained: marks,
      grade:
        form.grade.trim() === ""
          ? null
          : form.grade.trim(),
      gradePoint: parsedGradePoint,
    };

    try {
      setSubmitting(true);

      if (editingResult) {
        await apiRequest(
          `/admin/results/${editingResult.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );

        setSuccess(
          "Exam result updated successfully."
        );
      } else {
        await apiRequest("/admin/results", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSuccess(
          "Exam result created successfully."
        );
      }

      setShowModal(false);
      setEditingResult(null);
      setForm(initialForm);

      await fetchResults();
    } catch (err) {
      console.error("save result error:", err);

      setError(
        err.message ||
          "Failed to save exam result."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ----------------------------------------------------------
     DELETE
  ---------------------------------------------------------- */

  const openDeleteModal = (result) => {
    setDeletingResult(result);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (submitting) return;

    setDeletingResult(null);
    setShowDeleteModal(false);
  };

  const handleDelete = async () => {
    if (!deletingResult) return;

    try {
      setSubmitting(true);
      setError("");

      await apiRequest(
        `/admin/results/${deletingResult.id}`,
        {
          method: "DELETE",
        }
      );

      setSuccess(
        "Exam result deleted successfully."
      );

      setShowDeleteModal(false);
      setDeletingResult(null);

      await fetchResults();
    } catch (err) {
      console.error("delete result error:", err);

      setError(
        err.message ||
          "Failed to delete exam result."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ----------------------------------------------------------
     REFRESH
  ---------------------------------------------------------- */

  const handleRefresh = async () => {
    setError("");
    await Promise.all([
      fetchOptions(),
      fetchResults(),
    ]);
  };

  /* ----------------------------------------------------------
     LOCAL FILTERING
  ---------------------------------------------------------- */

  const visibleResults = useMemo(() => {
    return results.filter((result) => {
      const searchTerm = search
        .trim()
        .toLowerCase();

      if (!searchTerm) return true;

      const studentName = getStudentName(
        result.student
      ).toLowerCase();

      const email = getStudentEmail(
        result.student
      ).toLowerCase();

      const examTitle = String(
        result.exam?.title || ""
      ).toLowerCase();

      const examType = String(
        result.exam?.examType || ""
      ).toLowerCase();

      const courseName = String(
        result.course?.name || ""
      ).toLowerCase();

      const courseCode = String(
        result.course?.code || ""
      ).toLowerCase();

      const grade = String(
        result.grade || ""
      ).toLowerCase();

      return (
        studentName.includes(searchTerm) ||
        email.includes(searchTerm) ||
        examTitle.includes(searchTerm) ||
        examType.includes(searchTerm) ||
        courseName.includes(searchTerm) ||
        courseCode.includes(searchTerm) ||
        grade.includes(searchTerm) ||
        String(result.id).includes(searchTerm) ||
        String(result.studentId).includes(searchTerm)
      );
    });
  }, [results, search]);

  /* ----------------------------------------------------------
     STATISTICS
  ---------------------------------------------------------- */

  const statistics = useMemo(() => {
    const total = visibleResults.length;

    let totalPercentage = 0;
    let passed = 0;

    visibleResults.forEach((result) => {
      const percentage = getPercentage(
        result.marksObtained,
        result.exam?.maxMarks
      );

      totalPercentage += percentage;

      const grade = String(
        result.grade || ""
      )
        .trim()
        .toUpperCase();

      if (
        grade &&
        !["F", "FAIL"].includes(grade)
      ) {
        passed += 1;
      } else if (
        !grade &&
        percentage >= 40
      ) {
        passed += 1;
      }
    });

    const average =
      total > 0
        ? Math.round(totalPercentage / total)
        : 0;

    const passPercentage =
      total > 0
        ? Math.round((passed / total) * 100)
        : 0;

    const uniqueStudents = new Set(
      visibleResults.map(
        (result) => result.studentId
      )
    ).size;

    const uniqueExams = new Set(
      visibleResults.map(
        (result) => result.examId
      )
    ).size;

    return {
      total,
      average,
      passPercentage,
      uniqueStudents,
      uniqueExams,
    };
  }, [visibleResults]);

  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Award size={24} />
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Results Management
              </h1>

              <p className="text-xs text-slate-500">
                Admin Portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
          >
            <ArrowLeft size={17} />
            Back
          </button>
        </div>
      </header>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ====================================================
            TITLE
        ==================================================== */}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Exam Results
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create, update, view and manage student
              examination results.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={
                loading || loadingOptions
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={
                  loading || loadingOptions
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={18} />
              Add Result
            </button>
          </div>
        </div>

        {/* ====================================================
            ALERTS
        ==================================================== */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div className="flex-1">
              <p className="text-sm font-semibold">
                Error
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="rounded-lg p-1 transition hover:bg-red-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div className="flex-1">
              <p className="text-sm font-semibold">
                Success
              </p>

              <p className="mt-1 text-sm">
                {success}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="rounded-lg p-1 transition hover:bg-emerald-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* ====================================================
            STATISTICS
        ==================================================== */}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BarChart3 size={22} />
              </div>

              <span className="text-xs font-medium text-slate-400">
                Results
              </span>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Total Results
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {statistics.total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Users size={22} />
              </div>

              <span className="text-xs font-medium text-slate-400">
                Students
              </span>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Students
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {statistics.uniqueStudents}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Trophy size={22} />
              </div>

              <span className="text-xs font-medium text-slate-400">
                Exams
              </span>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Exams
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {statistics.uniqueExams}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <BarChart3 size={22} />
              </div>

              <span className="text-xs font-medium text-slate-400">
                Average
              </span>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Average Percentage
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {statistics.average}%
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={22} />
              </div>

              <span className="text-xs font-medium text-slate-400">
                Passed
              </span>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Pass Percentage
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {statistics.passPercentage}%
            </p>
          </div>
        </section>

        {/* ====================================================
            FILTERS
        ==================================================== */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Filter
              size={19}
              className="text-blue-600"
            />

            <h3 className="font-bold text-slate-900">
              Search & Filters
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search student, exam, course..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Exam */}
            <div className="relative">
              <select
                value={examFilter}
                onChange={(event) =>
                  setExamFilter(event.target.value)
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  All Exams
                </option>

                {exams.map((exam) => (
                  <option
                    key={exam.id}
                    value={exam.id}
                  >
                    {exam.title}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Course */}
            <div className="relative">
              <select
                value={courseFilter}
                onChange={(event) =>
                  setCourseFilter(event.target.value)
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  All Courses
                </option>

                {courses.map((course) => (
                  <option
                    key={course.id}
                    value={course.id}
                  >
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Grade */}
            <input
              type="text"
              value={gradeFilter}
              onChange={(event) =>
                setGradeFilter(event.target.value)
              }
              placeholder="Filter by grade e.g. A"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </section>

        {/* ====================================================
            RESULTS TABLE
        ==================================================== */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-slate-900">
                Results List
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Showing {visibleResults.length} result
                {visibleResults.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>

            <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {visibleResults.length} Records
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <Loader2
                  size={30}
                  className="animate-spin text-blue-600"
                />

                <p className="text-sm">
                  Loading results...
                </p>
              </div>
            </div>
          ) : visibleResults.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Award size={30} />
              </div>

              <h4 className="mt-4 font-semibold text-slate-800">
                No results found
              </h4>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                There are no exam results matching your
                current search or filters.
              </p>

              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus size={17} />
                Add First Result
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Student
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Exam
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Course
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Marks
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Percentage
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Grade
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Grade Point
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleResults.map((result) => {
                    const percentage =
                      getPercentage(
                        result.marksObtained,
                        result.exam?.maxMarks
                      );

                    return (
                      <tr
                        key={result.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        {/* Student */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <GraduationCap
                                size={19}
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-800">
                                {getStudentName(
                                  result.student
                                )}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {result.student
                                  ?.enrollmentNumber ||
                                  getStudentEmail(
                                    result.student
                                  ) ||
                                  `ID: ${result.studentId}`}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Exam */}
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {result.exam?.title ||
                              `Exam #${result.examId}`}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {result.exam?.examType ||
                              "Exam"}{" "}
                            •{" "}
                            {formatDate(
                              result.exam?.examDate
                            )}
                          </p>
                        </td>

                        {/* Course */}
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {result.course?.code ||
                              `Course #${result.courseId}`}
                          </p>

                          <p className="mt-1 max-w-[190px] truncate text-xs text-slate-500">
                            {result.course?.name ||
                              "Course"}
                          </p>
                        </td>

                        {/* Marks */}
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">
                            {result.marksObtained}
                            <span className="font-medium text-slate-400">
                              {" "}
                              /{" "}
                              {result.exam?.maxMarks ??
                                "—"}
                            </span>
                          </p>
                        </td>

                        {/* Percentage */}
                        <td className="px-5 py-4">
                          <div className="min-w-[100px]">
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700">
                                {percentage}%
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-600 transition-all"
                                style={{
                                  width: `${Math.min(
                                    percentage,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Grade */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-bold ${getGradeClass(
                              result.grade
                            )}`}
                          >
                            {result.grade || "—"}
                          </span>
                        </td>

                        {/* Grade Point */}
                        <td className="px-5 py-4">
                          <span className="font-semibold text-slate-700">
                            {result.gradePoint ??
                              "—"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openViewModal(
                                  result
                                )
                              }
                              title="View Result"
                              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Eye size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  result
                                )
                              }
                              title="Edit Result"
                              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600"
                            >
                              <Edit3 size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openDeleteModal(
                                  result
                                )
                              }
                              title="Delete Result"
                              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2
                                size={17}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* ======================================================
          ADD / EDIT MODAL
      ====================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingResult
                    ? "Edit Exam Result"
                    : "Add Exam Result"}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Enter the student's examination result
                  details.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >
              {/* Exam */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Exam
                  <span className="text-red-500">
                    {" "}
                    *
                  </span>
                </label>

                <div className="relative">
                  <select
                    name="examId"
                    value={form.examId}
                    onChange={handleFormChange}
                    disabled={
                      submitting ||
                      loadingOptions
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  >
                    <option value="">
                      Select Exam
                    </option>

                    {exams.map((exam) => (
                      <option
                        key={exam.id}
                        value={exam.id}
                      >
                        {exam.title} —{" "}
                        {exam.examType} — Max:{" "}
                        {exam.maxMarks}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                {selectedExam && (
                  <div className="mt-2 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        <strong>Date:</strong>{" "}
                        {formatDate(
                          selectedExam.examDate
                        )}
                      </span>

                      <span>
                        <strong>Maximum Marks:</strong>{" "}
                        {selectedExam.maxMarks}
                      </span>

                      <span>
                        <strong>Course ID:</strong>{" "}
                        {selectedExam.courseId}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Student */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Student
                  <span className="text-red-500">
                    {" "}
                    *
                  </span>
                </label>

                <div className="relative">
                  <select
                    name="studentId"
                    value={form.studentId}
                    onChange={handleFormChange}
                    disabled={
                      submitting ||
                      loadingOptions
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  >
                    <option value="">
                      Select Student
                    </option>

                    {students.map((student) => (
                      <option
                        key={student.id}
                        value={student.id}
                      >
                        {getStudentName(student)}
                        {student.enrollmentNumber
                          ? ` — ${student.enrollmentNumber}`
                          : ""}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>

              {/* Course */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Course
                  <span className="text-red-500">
                    {" "}
                    *
                  </span>
                </label>

                <div className="relative">
                  <select
                    name="courseId"
                    value={form.courseId}
                    onChange={handleFormChange}
                    disabled={
                      submitting ||
                      loadingOptions ||
                      Boolean(selectedExam)
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  >
                    <option value="">
                      Select Course
                    </option>

                    {courses.map((course) => (
                      <option
                        key={course.id}
                        value={course.id}
                      >
                        {course.code} —{" "}
                        {course.name}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                {selectedExam && (
                  <p className="mt-2 text-xs text-slate-500">
                    Course is automatically selected from
                    the chosen exam.
                  </p>
                )}
              </div>

              {/* Marks + Grade Point */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Marks Obtained
                    <span className="text-red-500">
                      {" "}
                      *
                    </span>
                  </label>

                  <input
                    type="number"
                    name="marksObtained"
                    value={form.marksObtained}
                    onChange={handleFormChange}
                    min="0"
                    max={
                      selectedExam?.maxMarks ||
                      undefined
                    }
                    step="0.01"
                    placeholder={
                      selectedExam
                        ? `Maximum ${selectedExam.maxMarks}`
                        : "Enter marks"
                    }
                    disabled={submitting}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />

                  {selectedExam && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      Maximum allowed:{" "}
                      {selectedExam.maxMarks}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Grade Point
                  </label>

                  <input
                    type="number"
                    name="gradePoint"
                    value={form.gradePoint}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    placeholder="e.g. 9.0"
                    disabled={submitting}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Grade */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Grade
                </label>

                <input
                  type="text"
                  name="grade"
                  value={form.grade}
                  onChange={handleFormChange}
                  placeholder="e.g. A, A+, B, C, F"
                  maxLength={20}
                  disabled={submitting}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                />
              </div>

              {/* Form Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <span>{error}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    loadingOptions
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {editingResult
                    ? "Update Result"
                    : "Create Result"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          VIEW MODAL
      ====================================================== */}

      {showViewModal && viewingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Result Details
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Result ID #{viewingResult.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowViewModal(false)
                }
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* Student */}
              <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <GraduationCap size={24} />
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Student
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {getStudentName(
                      viewingResult.student
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {viewingResult.student
                      ?.enrollmentNumber ||
                      getStudentEmail(
                        viewingResult.student
                      )}
                  </p>
                </div>
              </div>

              {/* Exam / Course */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-2 flex items-center gap-2 text-blue-600">
                    <Trophy size={17} />
                    <span className="text-xs font-semibold">
                      Exam
                    </span>
                  </div>

                  <p className="font-semibold text-slate-900">
                    {viewingResult.exam?.title ||
                      `Exam #${viewingResult.examId}`}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {viewingResult.exam
                      ?.examType || "Exam"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(
                      viewingResult.exam?.examDate
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-2 flex items-center gap-2 text-indigo-600">
                    <BookOpen size={17} />
                    <span className="text-xs font-semibold">
                      Course
                    </span>
                  </div>

                  <p className="font-semibold text-slate-900">
                    {viewingResult.course?.code ||
                      `Course #${viewingResult.courseId}`}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {viewingResult.course?.name ||
                      "Course"}
                  </p>
                </div>
              </div>

              {/* Marks */}
              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Marks
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {viewingResult.marksObtained}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Maximum
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {viewingResult.exam
                        ?.maxMarks || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Percentage
                    </p>

                    <p className="mt-1 text-xl font-bold text-blue-600">
                      {getPercentage(
                        viewingResult.marksObtained,
                        viewingResult.exam
                          ?.maxMarks
                      )}
                      %
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Grade
                    </p>

                    <span
                      className={`mt-1 inline-flex rounded-lg px-3 py-1.5 text-sm font-bold ${getGradeClass(
                        viewingResult.grade
                      )}`}
                    >
                      {viewingResult.grade ||
                        "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grade Point */}
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-xs font-medium text-blue-600">
                  Grade Point
                </p>

                <p className="mt-1 text-2xl font-bold text-blue-900">
                  {viewingResult.gradePoint ??
                    "Not provided"}
                </p>
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={() =>
                  setShowViewModal(false)
                }
                className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          DELETE MODAL
      ====================================================== */}

      {showDeleteModal && deletingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={23} />
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-900">
              Delete Result?
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to delete the result
              for{" "}
              <strong className="text-slate-700">
                {getStudentName(
                  deletingResult.student
                )}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={submitting}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                )}

                Delete Result
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminResults;