import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  Users,
  Award,
  CalendarDays,
  Search,
  Filter,
  XCircle,
  Clock3,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  apiGet,
  apiPut,
  logoutUser,
} from "../api";

function FacultyExamResults() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [exam, setExam] =
    useState(null);

  const [students, setStudents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [savingId, setSavingId] =
    useState(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [results, setResults] =
    useState({});

  const [searchTerm, setSearchTerm] =
    useState("");

  const [divisionFilter, setDivisionFilter] =
    useState("ALL");

  const [batchFilter, setBatchFilter] =
    useState("ALL");

  // ============================================================
  // AUTH
  // ============================================================

  const isAuthError = (err) => {
    return /authentication|unauthorized|forbidden|token/i.test(
      String(err?.message || "")
    );
  };

  const handleApiError = (err) => {
    const message =
      err?.message ||
      "An unexpected error occurred.";

    if (isAuthError(err)) {
      logoutUser();
      navigate("/");
      return;
    }

    setError(message);
  };

  // ============================================================
  // NORMALIZE
  // ============================================================

  const normalizeExam = (data) => {
    return (
      data?.exam ||
      data?.data?.exam ||
      data?.data ||
      null
    );
  };

  const normalizeStudents = (
    data
  ) => {
    const loaded =
      data?.students ||
      data?.data?.students ||
      [];

    return Array.isArray(loaded)
      ? loaded
      : [];
  };

  // ============================================================
  // LOAD
  // ============================================================

  const loadExam = async (
    isRefresh = false
  ) => {
    if (!id) {
      setError(
        "Examination ID is missing."
      );
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setSuccess("");

      const data =
        await apiGet(
          `/exams/faculty/${id}`
        );

      const loadedExam =
        normalizeExam(data);

      const loadedStudents =
        normalizeStudents(data);

      setExam(
        loadedExam
      );

      setStudents(
        loadedStudents
      );

      const initialResults =
        {};

      loadedStudents.forEach(
        (student) => {
          const result =
            student?.result;

          initialResults[
            student.id
          ] = {
            marksObtained:
              result?.marksObtained ??
              "",
            grade:
              result?.grade ??
              "",
            gradePoint:
              result?.gradePoint ??
              "",
          };
        }
      );

      setResults(
        initialResults
      );
    } catch (err) {
      console.error(
        "Faculty exam results error:",
        err
      );

      handleApiError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExam();
  }, [id]);

  // ============================================================
  // RESULT INPUT
  // ============================================================

  const handleChange = (
    studentId,
    field,
    value
  ) => {
    setResults((current) => ({
      ...current,
      [studentId]: {
        ...(current[studentId] || {
          marksObtained: "",
          grade: "",
          gradePoint: "",
        }),
        [field]: value,
      },
    }));

    setError("");
    setSuccess("");
  };

  // ============================================================
  // SAVE
  // ============================================================

  const saveResult = async (
    studentId
  ) => {
    if (!exam) {
      setError(
        "Examination information is unavailable."
      );
      return;
    }

    const current =
      results[studentId] || {};

    if (
      current.marksObtained ===
        "" ||
      current.marksObtained ===
        null ||
      current.marksObtained ===
        undefined
    ) {
      setError(
        "Please enter marks before saving."
      );
      return;
    }

    const marks =
      Number(
        current.marksObtained
      );

    const maxMarks =
      Number(
        exam?.maxMarks
      );

    if (
      !Number.isFinite(
        marks
      ) ||
      marks < 0 ||
      marks > maxMarks
    ) {
      setError(
        `Marks must be between 0 and ${maxMarks}.`
      );
      return;
    }

    let gradePoint = null;

    if (
      current.gradePoint !==
        "" &&
      current.gradePoint !==
        null &&
      current.gradePoint !==
        undefined
    ) {
      gradePoint =
        Number(
          current.gradePoint
        );

      if (
        !Number.isFinite(
          gradePoint
        ) ||
        gradePoint < 0 ||
        gradePoint > 10
      ) {
        setError(
          "Grade point must be between 0 and 10."
        );
        return;
      }
    }

    try {
      setSavingId(
        studentId
      );
      setError("");
      setSuccess("");

      const data =
        await apiPut(
          `/exams/${id}/results`,
          {
            studentId:
              Number(
                studentId
              ),
            marksObtained:
              marks,
            grade:
              current.grade
                ?.trim()
                .toUpperCase() ||
              null,
            gradePoint,
          }
        );

      setSuccess(
        data?.message ||
          "Exam result saved successfully."
      );

      await loadExam(true);
    } catch (err) {
      console.error(
        "Save exam result error:",
        err
      );

      handleApiError(err);
    } finally {
      setSavingId(null);
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================

  const formatDateTime = (
    value
  ) => {
    if (!value) {
      return "Not available";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Not available";
    }

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(date);
  };

  const getStudentName = (
    student
  ) => {
    const user =
      student?.user;

    const fullName = [
      user?.firstName,
      user?.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      fullName ||
      user?.name ||
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
      student?.studentId ||
      student?.rollNumber ||
      "-"
    );
  };

  const getBatch = (
    student
  ) => {
    return (
      student?.batch ??
      "—"
    );
  };

  const getDivision = (
    student
  ) => {
    return (
      student?.division ||
      "—"
    );
  };

  const formatGrade = (
    value
  ) => {
    return (
      String(value || "")
        .trim()
        .toUpperCase() ||
      "-"
    );
  };

  // ============================================================
  // FILTER OPTIONS
  // ============================================================

  const divisions =
    useMemo(() => {
      return [
        ...new Set(
          students
            .map(
              (student) =>
                student?.division
            )
            .filter(Boolean)
        ),
      ].sort();
    }, [students]);

  const batches =
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
        ),
      ].sort((a, b) => {
        const numberA =
          Number(a);

        const numberB =
          Number(b);

        if (
          Number.isFinite(
            numberA
          ) &&
          Number.isFinite(
            numberB
          )
        ) {
          return (
            numberA -
            numberB
          );
        }

        return String(
          a
        ).localeCompare(
          String(b)
        );
      });
    }, [students]);

  // ============================================================
  // FILTER STUDENTS
  // ============================================================

  const filteredStudents =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return [...students]
        .filter(
          (student) => {
            const name =
              getStudentName(
                student
              ).toLowerCase();

            const enrollment =
              String(
                getStudentId(
                  student
                )
              ).toLowerCase();

            const email =
              String(
                student?.user
                  ?.email || ""
              ).toLowerCase();

            const batch =
              String(
                student?.batch ||
                  ""
              ).toLowerCase();

            const division =
              String(
                student?.division ||
                  ""
              ).toLowerCase();

            const matchesSearch =
              !search ||
              name.includes(search) ||
              enrollment.includes(
                search
              ) ||
              email.includes(search) ||
              batch.includes(search) ||
              division.includes(search);

            const matchesBatch =
              batchFilter === "ALL" ||
              String(
                student?.batch ?? ""
              ) ===
                String(
                  batchFilter
                );

            const matchesDivision =
              divisionFilter === "ALL" ||
              String(
                student?.division ?? ""
              ) ===
                String(
                  divisionFilter
                );

            return (
              matchesSearch &&
              matchesBatch &&
              matchesDivision
            );
          }
        )
        .sort((a, b) =>
          getStudentName(
            a
          ).localeCompare(
            getStudentName(
              b
            )
          )
        );
    }, [
      students,
      searchTerm,
      batchFilter,
      divisionFilter,
    ]);

  // ============================================================
  // STATS
  // ============================================================

  const gradedCount =
    students.filter(
      (student) =>
        student?.result &&
        student.result
          .marksObtained !==
          null &&
        student.result
          .marksObtained !==
          undefined
    ).length;

  const pendingCount =
    Math.max(
      students.length -
        gradedCount,
      0
    );

  const progress =
    students.length > 0
      ? Math.round(
          (gradedCount /
            students.length) *
            100
        )
      : 0;

  const clearFilters = () => {
    setSearchTerm("");
    setBatchFilter("ALL");
    setDivisionFilter("ALL");
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-600">
          <RefreshCw
            size={20}
            className="animate-spin"
          />
          Loading examination...
        </div>
      </div>
    );
  }

  // ============================================================
  // INITIAL ERROR
  // ============================================================

  if (!exam) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          <AlertCircle
            size={42}
            className="mx-auto"
          />

          <h1 className="mt-4 text-xl font-bold">
            Unable to load examination
          </h1>

          <p className="mt-2 text-sm">
            {error ||
              "Examination information is not available."}
          </p>

          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() =>
                loadExam()
              }
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
            >
              <RefreshCw size={17} />
              Try Again
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/faculty/examinations"
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              <ArrowLeft size={17} />
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/faculty/examinations"
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="text-xl font-bold md:text-2xl">
                Exam Results
              </h1>

              <p className="text-sm text-slate-500">
                Enter and manage student marks
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              loadExam(true)
            }
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="flex-1">
              <p className="font-semibold">
                Error
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="opacity-60 hover:opacity-100"
            >
              <XCircle size={18} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-700">
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="flex-1">
              <p className="font-semibold">
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
              className="opacity-60 hover:opacity-100"
            >
              <XCircle size={18} />
            </button>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  {exam?.course?.code ||
                    "COURSE"}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {formatExamType(
                    exam?.examType
                  )}
                </span>

                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  Max{" "}
                  {exam?.maxMarks ??
                    "—"}
                </span>
              </div>

              <h2 className="mt-4 text-2xl font-bold">
                {exam?.title ||
                  "Examination"}
              </h2>

              <p className="mt-1 text-sm font-medium text-indigo-600">
                {exam?.course?.name ||
                  "Course"}
              </p>
            </div>

            <div className="rounded-xl bg-indigo-50 p-5">
              <div className="flex items-center gap-2 text-indigo-600">
                <CalendarDays size={17} />

                <span className="text-xs font-semibold uppercase tracking-wide">
                  Exam Date
                </span>
              </div>

              <p className="mt-2 font-bold text-indigo-900">
                {formatDateTime(
                  exam?.examDate
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={
              <Users size={21} />
            }
            title="Students"
            value={
              students.length
            }
            description="Enrolled students"
          />

          <StatCard
            icon={
              <CheckCircle2
                size={21}
              />
            }
            title="Results Entered"
            value={
              gradedCount
            }
            description="Students with marks"
          />

          <StatCard
            icon={
              <Clock3 size={21} />
            }
            title="Pending"
            value={
              pendingCount
            }
            description="Results remaining"
          />

          <StatCard
            icon={
              <Award size={21} />
            }
            title="Progress"
            value={`${progress}%`}
            description="Result entry completed"
          />
        </section>

        {students.length > 0 && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={
                    searchTerm
                  }
                  onChange={(event) =>
                    setSearchTerm(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search student name, enrollment, batch or division..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Filter size={17} />
                  Filters
                </div>

                <select
                  value={
                    batchFilter
                  }
                  onChange={(event) =>
                    setBatchFilter(
                      event.target
                        .value
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none"
                >
                  <option value="ALL">
                    All Batches
                  </option>

                  {batches.map(
                    (batch) => (
                      <option
                        key={
                          String(
                            batch
                          )
                        }
                        value={
                          String(
                            batch
                          )
                        }
                      >
                        Batch {batch}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={
                    divisionFilter
                  }
                  onChange={(event) =>
                    setDivisionFilter(
                      event.target
                        .value
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none"
                >
                  <option value="ALL">
                    All Divisions
                  </option>

                  {divisions.map(
                    (division) => (
                      <option
                        key={
                          String(
                            division
                          )
                        }
                        value={
                          String(
                            division
                          )
                        }
                      >
                        Division{" "}
                        {division}
                      </option>
                    )
                  )}
                </select>

                {(searchTerm ||
                  batchFilter !==
                    "ALL" ||
                  divisionFilter !==
                    "ALL") && (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                  >
                    <XCircle size={16} />
                    Clear
                  </button>
                )}
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {
                  filteredStudents.length
                }
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {students.length}
              </span>{" "}
              students
            </p>
          </section>
        )}

        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold">
              Student Results
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enter marks, grade and grade point for each student.
            </p>
          </div>

          {students.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <Users
                size={42}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-5 text-lg font-bold">
                No students found
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                No students are enrolled in this course.
              </p>
            </div>
          ) : filteredStudents.length ===
            0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <Search
                size={42}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-5 text-lg font-bold">
                No matching students
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Try changing the search or filters.
              </p>

              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        #
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Student
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Enrollment
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Batch
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Division
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Marks
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Grade
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Grade Point
                      </th>

                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStudents.map(
                      (
                        student,
                        index
                      ) => {
                        const current =
                          results[
                            student.id
                          ] || {
                            marksObtained:
                              "",
                            grade: "",
                            gradePoint:
                              "",
                          };

                        const hasResult =
                          student?.result &&
                          student.result
                            .marksObtained !==
                            null &&
                          student.result
                            .marksObtained !==
                            undefined;

                        const isSaving =
                          savingId ===
                          student.id;

                        return (
                          <tr
                            key={
                              student.id
                            }
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                          >
                            <td className="px-6 py-5 text-sm text-slate-500">
                              {index + 1}
                            </td>

                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600">
                                  {getStudentName(
                                    student
                                  )
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()}
                                </div>

                                <div>
                                  <p className="font-semibold text-slate-800">
                                    {getStudentName(
                                      student
                                    )}
                                  </p>

                                  <p className="text-xs text-slate-500">
                                    {student?.user
                                      ?.email ||
                                      "Student"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-5 text-sm font-semibold text-slate-600">
                              {getStudentId(
                                student
                              )}
                            </td>

                            <td className="px-6 py-5">
                              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                {getBatch(
                                  student
                                )}
                              </span>
                            </td>

                            <td className="px-6 py-5">
                              <span className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                                {getDivision(
                                  student
                                )}
                              </span>
                            </td>

                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={
                                    exam?.maxMarks
                                  }
                                  step="0.01"
                                  value={
                                    current.marksObtained
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    handleChange(
                                      student.id,
                                      "marksObtained",
                                      event.target.value
                                    )
                                  }
                                  placeholder={`0-${exam?.maxMarks ?? ""}`}
                                  className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white"
                                />

                                {hasResult && (
                                  <CheckCircle2
                                    size={
                                      17
                                    }
                                    className="text-green-500"
                                  />
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-5">
                              <input
                                type="text"
                                maxLength="5"
                                value={
                                  current.grade
                                }
                                onChange={(
                                  event
                                ) =>
                                  handleChange(
                                    student.id,
                                    "grade",
                                    event.target.value.toUpperCase()
                                  )
                                }
                                placeholder="A+"
                                className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold uppercase outline-none focus:border-indigo-500 focus:bg-white"
                              />
                            </td>

                            <td className="px-6 py-5">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.01"
                                value={
                                  current.gradePoint
                                }
                                onChange={(
                                  event
                                ) =>
                                  handleChange(
                                    student.id,
                                    "gradePoint",
                                    event.target.value
                                  )
                                }
                                placeholder="0-10"
                                className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white"
                              />
                            </td>

                            <td className="px-6 py-5 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  saveResult(
                                    student.id
                                  )
                                }
                                disabled={
                                  isSaving
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isSaving ? (
                                  <>
                                    <RefreshCw
                                      size={
                                        16
                                      }
                                      className="animate-spin"
                                    />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save
                                      size={
                                        16
                                      }
                                    />
                                    {hasResult
                                      ? "Update"
                                      : "Save"}
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  icon,
  title,
  value,
  description,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        {icon}
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-3xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

// ============================================================
// EXAM TYPE
// ============================================================

function formatExamType(
  value
) {
  if (!value) {
    return "Exam";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
}

export default FacultyExamResults;