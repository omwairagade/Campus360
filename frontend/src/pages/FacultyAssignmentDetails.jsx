import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  AlertCircle,
  ArrowLeft,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Mail,
  Paperclip,
  RefreshCw,
  Save,
  Search,
  Target,
  UserRound,
  Users,
  X,
  TrendingUp,
} from "lucide-react";

import {
  apiGet,
  apiPut,
  logoutUser,
} from "../api";

const API_SERVER_URL =
  "http://localhost:5000";

/* ============================================================
   HELPERS
============================================================ */

const normalizeAssignment = (
  response
) =>
  response?.assignment ||
  response?.data?.assignment ||
  response?.data ||
  null;

const isAuthError = (
  message
) =>
  /authentication|unauthorized|forbidden|token/i.test(
    message || ""
  );

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
      dateStyle:
        "medium",
      timeStyle:
        "short",
    }
  ).format(date);
};

const formatDate = (
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
      month:
        "short",
      year:
        "numeric",
    }
  ).format(date);
};

const getDaysUntil = (
  value
) => {
  if (!value) {
    return null;
  }

  const target =
    new Date(value);

  if (
    Number.isNaN(
      target.getTime()
    )
  ) {
    return null;
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  target.setHours(
    0,
    0,
    0,
    0
  );

  return Math.ceil(
    (
      target.getTime() -
      today.getTime()
    ) /
      (
        1000 *
        60 *
        60 *
        24
      )
  );
};

const getDueStatus = (
  value
) => {
  const days =
    getDaysUntil(value);

  if (
    days === null
  ) {
    return {
      label:
        "Date unavailable",
      className:
        "bg-slate-100 text-slate-600",
    };
  }

  if (
    days < 0
  ) {
    return {
      label:
        "Overdue",
      className:
        "bg-red-50 text-red-700",
    };
  }

  if (
    days === 0
  ) {
    return {
      label:
        "Due Today",
      className:
        "bg-red-50 text-red-700",
    };
  }

  if (
    days === 1
  ) {
    return {
      label:
        "Due Tomorrow",
      className:
        "bg-orange-50 text-orange-700",
    };
  }

  if (
    days <= 7
  ) {
    return {
      label:
        `Due in ${days} days`,
      className:
        "bg-amber-50 text-amber-700",
    };
  }

  return {
    label:
      `Due in ${days} days`,
    className:
      "bg-blue-50 text-blue-700",
  };
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

function FacultyAssignmentDetails() {
  const navigate =
    useNavigate();

  const { id } =
    useParams();

  const [
    assignment,
    setAssignment,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    gradingId,
    setGradingId,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    grading,
    setGrading,
  ] = useState({});

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("ALL");

  const [
    fileFilter,
    setFileFilter,
  ] = useState("ALL");

  /* ==========================================================
     ERROR HANDLER
  ========================================================== */

  const handleApiError =
    useCallback(
      (err) => {
        const message =
          err?.message ||
          "An unexpected error occurred.";

        console.error(
          "Faculty assignment API error:",
          err
        );

        if (
          isAuthError(
            message
          )
        ) {
          logoutUser();
          navigate("/");
          return;
        }

        setError(
          message
        );
      },
      [navigate]
    );

  /* ==========================================================
     INITIAL GRADING STATE
  ========================================================== */

  const buildGradingState =
    (loadedAssignment) => {
      const initial =
        {};

      const source =
        Array.isArray(
          loadedAssignment?.submissions
        )
          ? loadedAssignment.submissions
          : [];

      source.forEach(
        (
          submission
        ) => {
          initial[
            submission.id
          ] = {
            marksObtained:
              submission?.marksObtained ??
              "",
            remarks:
              submission?.remarks ??
              "",
          };
        }
      );

      return initial;
    };

  /* ==========================================================
     LOAD ASSIGNMENT
  ========================================================== */

  const fetchAssignment =
    useCallback(
      async (
        isRefresh = false
      ) => {
        if (!id) {
          return;
        }

        try {
          if (isRefresh) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError("");

          const data =
            await apiGet(
              `/assignments/faculty/${id}`
            );

          const loaded =
            normalizeAssignment(
              data
            );

          if (!loaded) {
            throw new Error(
              "Assignment information could not be found."
            );
          }

          setAssignment(
            loaded
          );

          setGrading(
            buildGradingState(
              loaded
            )
          );
        } catch (err) {
          handleApiError(
            err
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
        id,
        handleApiError,
      ]
    );

  useEffect(() => {
    fetchAssignment();
  }, [
    fetchAssignment,
  ]);

  /* ==========================================================
     GRADING INPUT
  ========================================================== */

  const updateGrading = (
    submissionId,
    field,
    value
  ) => {
    setGrading(
      (
        current
      ) => ({
        ...current,
        [submissionId]: {
          ...(
            current[
              submissionId
            ] || {
              marksObtained:
                "",
              remarks:
                "",
            }
          ),
          [field]:
            value,
        },
      })
    );

    setError("");
    setSuccess("");
  };

  /* ==========================================================
     GRADE SUBMISSION
  ========================================================== */

  const gradeSubmission =
    async (
      submissionId,
      maxMarks
    ) => {
      try {
        setGradingId(
          submissionId
        );

        setError("");
        setSuccess("");

        const current =
          grading[
            submissionId
          ] || {};

        if (
          current.marksObtained ===
            "" ||
          current.marksObtained ===
            null ||
          current.marksObtained ===
            undefined
        ) {
          setError(
            "Please enter marks before saving the grade."
          );
          return;
        }

        const marks =
          Number(
            current.marksObtained
          );

        const maximum =
          Number(
            maxMarks
          );

        if (
          Number.isNaN(
            marks
          )
        ) {
          setError(
            "Please enter valid marks."
          );
          return;
        }

        if (
          Number.isNaN(
            maximum
          ) ||
          maximum <= 0
        ) {
          setError(
            "Invalid maximum marks configured for this assignment."
          );
          return;
        }

        if (
          marks < 0 ||
          marks > maximum
        ) {
          setError(
            `Marks must be between 0 and ${maximum}.`
          );
          return;
        }

        const data =
          await apiPut(
            `/assignments/submissions/${submissionId}/grade`,
            {
              marksObtained:
                marks,
              remarks:
                current?.remarks
                  ?.trim() ||
                "",
            }
          );

        setSuccess(
          data?.message ||
            "Assignment graded successfully."
        );

        await fetchAssignment(
          true
        );
      } catch (err) {
        handleApiError(
          err
        );
      } finally {
        setGradingId(
          null
        );
      }
    };

  /* ==========================================================
     STUDENT HELPERS
  ========================================================== */

  const getStudentName =
    useCallback(
      (submission) => {
        const user =
          submission?.student
            ?.user;

        if (user) {
          const fullName =
            [
              user.firstName,
              user.lastName,
            ]
              .filter(Boolean)
              .join(" ");

          if (fullName) {
            return fullName;
          }

          if (user.name) {
            return user.name;
          }
        }

        return (
          submission?.student
            ?.name ||
          submission?.student
            ?.fullName ||
          "Student"
        );
      },
      []
    );

  const getStudentId =
    useCallback(
      (submission) => {
        const student =
          submission?.student;

        return (
          student?.enrollmentNumber ||
          student?.studentCode ||
          student?.registrationNumber ||
          student?.studentId ||
          student?.rollNumber ||
          "-"
        );
      },
      []
    );

  const getStudentEmail =
    useCallback(
      (submission) =>
        submission?.student
          ?.user?.email ||
        submission?.student
          ?.email ||
        submission?.email ||
        "",
      []
    );

  const getStudentBatch =
    useCallback(
      (submission) =>
        submission?.student
          ?.batch ||
        "—",
      []
    );

  const getStudentDivision =
    useCallback(
      (submission) =>
        submission?.student
          ?.division ||
        "—",
      []
    );

  const getStudentInitials =
    useCallback(
      (submission) => {
        const name =
          getStudentName(
            submission
          );

        const parts =
          name
            .trim()
            .split(
              /\s+/
            )
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
          parts.length -
            1
        ].charAt(
          0
        )}`.toUpperCase();
      },
      [
        getStudentName,
      ]
    );

  /* ==========================================================
     FILE HELPERS
  ========================================================== */

  const getFileUrl =
    (submission) => {
      const value =
        submission?.fileUrl;

      if (!value) {
        return "";
      }

      if (
        value.startsWith(
          "http://"
        ) ||
        value.startsWith(
          "https://"
        )
      ) {
        return value;
      }

      return `${API_SERVER_URL}${value}`;
    };

  const formatFileSize =
    (size) => {
      if (
        size === null ||
        size === undefined ||
        Number.isNaN(
          Number(size)
        )
      ) {
        return "Unknown size";
      }

      const bytes =
        Number(size);

      if (
        bytes < 1024
      ) {
        return `${bytes} B`;
      }

      if (
        bytes <
        1024 *
          1024
      ) {
        return `${(
          bytes / 1024
        ).toFixed(
          1
        )} KB`;
      }

      if (
        bytes <
        1024 *
          1024 *
          1024
      ) {
        return `${(
          bytes /
          (
            1024 *
            1024
          )
        ).toFixed(
          1
        )} MB`;
      }

      return `${(
        bytes /
        (
          1024 *
          1024 *
          1024
        )
      ).toFixed(
        1
      )} GB`;
    };

  /* ==========================================================
     SUBMISSION DATA
  ========================================================== */

  const allSubmissions =
    useMemo(() => {
      return Array.isArray(
        assignment?.submissions
      )
        ? assignment.submissions
        : [];
    }, [
      assignment,
    ]);

  const submittedCount =
    allSubmissions.filter(
      (
        submission
      ) => {
        const status =
          String(
            submission?.status ||
              ""
          ).toUpperCase();

        return (
          status ===
            "SUBMITTED" ||
          status ===
            "LATE" ||
          status ===
            "GRADED"
        );
      }
    ).length;

  const gradedCount =
    allSubmissions.filter(
      (
        submission
      ) =>
        String(
          submission?.status ||
            ""
        ).toUpperCase() ===
        "GRADED"
    ).length;

  const pendingCount =
    allSubmissions.filter(
      (
        submission
      ) =>
        String(
          submission?.status ||
            ""
        ).toUpperCase() !==
        "GRADED"
    ).length;

  const lateCount =
    allSubmissions.filter(
      (
        submission
      ) =>
        String(
          submission?.status ||
            ""
        ).toUpperCase() ===
        "LATE"
    ).length;

  const fileCount =
    allSubmissions.filter(
      (
        submission
      ) =>
        Boolean(
          submission?.fileUrl ||
            submission?.fileName
        )
    ).length;

  const totalAssignmentMarks =
    allSubmissions.reduce(
      (
        total,
        submission
      ) => {
        const marks =
          Number(
            submission?.marksObtained
          );

        if (
          Number.isNaN(
            marks
          )
        ) {
          return total;
        }

        return (
          total + marks
        );
      },
      0
    );

  const gradedAverage =
    gradedCount > 0
      ? (
          totalAssignmentMarks /
          gradedCount
        ).toFixed(1)
      : "—";

  const maxMarks =
    Number(
      assignment?.maxMarks
    ) || 0;

  const averagePercentage =
    gradedCount > 0 &&
    maxMarks > 0
      ? Math.round(
          (
            totalAssignmentMarks /
            (
              gradedCount *
              maxMarks
            )
          ) *
            100
        )
      : 0;

  const submissionRate =
    allSubmissions.length >
      0
      ? Math.round(
          (
            submittedCount /
            allSubmissions.length
          ) *
            100
        )
      : 0;

  const gradingRate =
    submittedCount > 0
      ? Math.round(
          (
            gradedCount /
            submittedCount
          ) *
            100
        )
      : 0;

  /* ==========================================================
     FILTERED SUBMISSIONS
  ========================================================== */

  const submissions =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      const filtered =
        allSubmissions.filter(
          (
            submission
          ) => {
            const status =
              String(
                submission?.status ||
                  ""
              ).toUpperCase();

            const text =
              [
                getStudentName(
                  submission
                ),
                getStudentId(
                  submission
                ),
                getStudentEmail(
                  submission
                ),
                getStudentBatch(
                  submission
                ),
                getStudentDivision(
                  submission
                ),
                submission?.fileName,
                status,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
              !search ||
              text.includes(
                search
              );

            const matchesStatus =
              statusFilter ===
                "ALL" ||
              (
                statusFilter ===
                  "GRADED" &&
                status ===
                  "GRADED"
              ) ||
              (
                statusFilter ===
                  "PENDING" &&
                status !==
                  "GRADED"
              ) ||
              (
                statusFilter ===
                  "LATE" &&
                status ===
                  "LATE"
              );

            const hasFile =
              Boolean(
                submission?.fileUrl ||
                  submission?.fileName
              );

            const matchesFile =
              fileFilter ===
                "ALL" ||
              (
                fileFilter ===
                  "WITH_FILE" &&
                hasFile
              ) ||
              (
                fileFilter ===
                  "WITHOUT_FILE" &&
                !hasFile
              );

            return (
              matchesSearch &&
              matchesStatus &&
              matchesFile
            );
          }
        );

      return [
        ...filtered,
      ].sort(
        (
          a,
          b
        ) => {
          const aStatus =
            String(
              a?.status ||
                ""
            ).toUpperCase();

          const bStatus =
            String(
              b?.status ||
                ""
            ).toUpperCase();

          if (
            aStatus ===
              "GRADED" &&
            bStatus !==
              "GRADED"
          ) {
            return 1;
          }

          if (
            aStatus !==
              "GRADED" &&
            bStatus ===
              "GRADED"
          ) {
            return -1;
          }

          return (
            new Date(
              b?.submittedAt ||
                0
            ).getTime() -
            new Date(
              a?.submittedAt ||
                0
            ).getTime()
          );
        }
      );
    }, [
      allSubmissions,
      searchTerm,
      statusFilter,
      fileFilter,
      getStudentName,
      getStudentId,
      getStudentEmail,
      getStudentBatch,
      getStudentDivision,
    ]);

  const hasFilters =
    Boolean(
      searchTerm.trim()
    ) ||
    statusFilter !==
      "ALL" ||
    fileFilter !==
      "ALL";

  const clearFilters =
    () => {
      setSearchTerm("");
      setStatusFilter(
        "ALL"
      );
      setFileFilter(
        "ALL"
      );
    };

  /* ==========================================================
     ASSIGNMENT META
  ========================================================== */

  const courseCode =
    assignment?.course
      ?.code ||
    assignment?.courseCode ||
    "COURSE";

  const courseName =
    assignment?.course
      ?.name ||
    assignment?.courseName ||
    "Course";

  const title =
    assignment?.title ||
    "Assignment";

  const dueStatus =
    getDueStatus(
      assignment?.dueDate
    );

  const isOverdue =
    getDaysUntil(
      assignment?.dueDate
    ) < 0;

  const isDueToday =
    getDaysUntil(
      assignment?.dueDate
    ) === 0;

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <AssignmentSkeleton />
    );
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (
    error &&
    !assignment
  ) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">

        <div className="mx-auto max-w-xl">

          <button
            type="button"
            onClick={() =>
              navigate(
                "/faculty/assignments"
              )
            }
            className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600"
          >
            <ArrowLeft
              size={18}
            />
            Back to Assignments
          </button>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">

            <div className="flex items-start gap-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100">

                <AlertCircle
                  size={22}
                />

              </div>

              <div>

                <h1 className="text-xl font-bold">
                  Unable to load assignment
                </h1>

                <p className="mt-2 text-sm leading-6">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    fetchAssignment()
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
                >

                  <RefreshCw
                    size={17}
                  />

                  Try Again

                </button>

              </div>

            </div>

          </div>

        </div>

      </div>
    );
  }

  /* ==========================================================
     PAGE
  ========================================================== */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* HEADER */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">

        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/faculty/assignments"
                )
              }
              className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600"
            >

              <ArrowLeft
                size={18}
              />

              Faculty Assignments

            </button>

            <button
              type="button"
              onClick={() =>
                fetchAssignment(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
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

        </div>

      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ALERTS */}

        {error && (
          <AlertBox
            type="error"
            message={
              error
            }
            onClose={() =>
              setError("")
            }
          />
        )}

        {success && (
          <AlertBox
            type="success"
            message={
              success
            }
            onClose={() =>
              setSuccess("")
            }
          />
        )}

        {/* HERO */}

        <section className="relative overflow-hidden rounded-3xl bg-indigo-600 p-6 text-white shadow-lg sm:p-8">

          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10" />

          <div className="absolute -bottom-24 right-20 h-56 w-56 rounded-full bg-white/5" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">

            <div className="min-w-0">

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                  {courseCode}
                </span>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    isOverdue
                      ? "bg-red-400/20 text-red-100"
                      : isDueToday
                      ? "bg-amber-400/20 text-amber-100"
                      : "bg-white/10 text-indigo-100"
                  }`}
                >
                  {
                    dueStatus.label
                  }
                </span>

              </div>

              <h1 className="mt-4 break-words text-2xl font-bold sm:text-3xl lg:text-4xl">
                {title}
              </h1>

              <p className="mt-2 text-sm font-semibold text-indigo-100">
                {courseName}
              </p>

              {assignment?.description && (
                <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-indigo-100 sm:text-base">
                  {
                    assignment.description
                  }
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-3">

                <HeroTag
                  icon={
                    <Award
                      size={14}
                    />
                  }
                  text={`${maxMarks || "—"} Maximum Marks`}
                />

                <HeroTag
                  icon={
                    <CalendarDays
                      size={14}
                    />
                  }
                  text={`Due ${
                    assignment?.dueDate
                      ? formatDateTime(
                          assignment.dueDate
                        )
                      : "Not set"
                  }`}
                />

                <HeroTag
                  icon={
                    <Users
                      size={14}
                    />
                  }
                  text={`${allSubmissions.length} submissions`}
                />

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[440px]">

              <HeroMetric
                label="Submitted"
                value={
                  submittedCount
                }
              />

              <HeroMetric
                label="Graded"
                value={
                  gradedCount
                }
              />

              <HeroMetric
                label="Pending"
                value={
                  pendingCount
                }
              />

              <HeroMetric
                label="Average"
                value={
                  gradedCount >
                  0
                    ? gradedAverage
                    : "—"
                }
              />

            </div>

          </div>

        </section>

        {/* KPI CARDS */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <KpiCard
            icon={
              <Users size={21} />
            }
            title="Submission Rate"
            value={`${submissionRate}%`}
            description={`${submittedCount} submissions received`}
          />

          <KpiCard
            icon={
              <CheckCircle2
                size={21}
              />
            }
            title="Grading Rate"
            value={`${gradingRate}%`}
            description={`${gradedCount} submissions graded`}
            type="green"
          />

          <KpiCard
            icon={
              <TrendingUp
                size={21}
              />
            }
            title="Average Score"
            value={
              gradedCount >
              0
                ? `${gradedAverage}/${maxMarks}`
                : "—"
            }
            description={
              gradedCount >
              0
                ? `${averagePercentage}% average`
                : "No graded submissions"
            }
            type="purple"
          />

          <KpiCard
            icon={
              <Paperclip
                size={21}
              />
            }
            title="Uploaded Files"
            value={
              fileCount
            }
            description={`${lateCount} late submission${
              lateCount ===
              1
                ? ""
                : "s"
            }`}
            type="amber"
          />

        </section>

        {/* PERFORMANCE */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

              <BarChart3
                size={22}
              />

            </div>

            <div>

              <h2 className="text-xl font-bold">
                Assignment Performance
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Submission and grading overview.
              </p>

            </div>

          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">

            <PerformanceCard
              title="Submission Progress"
              value={
                submissionRate
              }
              detail={`${submittedCount} of ${allSubmissions.length} submitted`}
              type="indigo"
            />

            <PerformanceCard
              title="Grading Progress"
              value={
                gradingRate
              }
              detail={`${pendingCount} pending`}
              type="green"
            />

            <PerformanceCard
              title="Average Score"
              value={
                averagePercentage
              }
              detail={
                gradedCount >
                0
                  ? `${gradedAverage} / ${maxMarks}`
                  : "No grades yet"
              }
              type="purple"
            />

          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">

            <SmallMetric
              icon={
                <CheckCircle2
                  size={18}
                />
              }
              label="Graded"
              value={
                gradedCount
              }
            />

            <SmallMetric
              icon={
                <Clock3
                  size={18}
                />
              }
              label="Pending"
              value={
                pendingCount
              }
            />

            <SmallMetric
              icon={
                <CalendarDays
                  size={18}
                />
              }
              label="Late"
              value={
                lateCount
              }
            />

          </div>

        </section>

        {/* SEARCH AND FILTER */}

        {allSubmissions.length >
          0 && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

                <Filter size={19} />

              </div>

              <div>

                <h2 className="font-bold text-slate-800">
                  Submission Filters
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Find and organize submissions quickly.
                </p>

              </div>

            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_200px_200px]">

              <div className="relative">

                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={
                    searchTerm
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchTerm(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search student, enrollment, email or file..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchTerm(
                        ""
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-200"
                  >
                    <X
                      size={15}
                    />
                  </button>
                )}

              </div>

              <FilterSelect
                value={
                  statusFilter
                }
                onChange={
                  setStatusFilter
                }
                options={[
                  {
                    value:
                      "ALL",
                    label:
                      "All Statuses",
                  },
                  {
                    value:
                      "PENDING",
                    label:
                      "Pending",
                  },
                  {
                    value:
                      "GRADED",
                    label:
                      "Graded",
                  },
                  {
                    value:
                      "LATE",
                    label:
                      "Late",
                  },
                ]}
              />

              <FilterSelect
                value={
                  fileFilter
                }
                onChange={
                  setFileFilter
                }
                options={[
                  {
                    value:
                      "ALL",
                    label:
                      "All Files",
                  },
                  {
                    value:
                      "WITH_FILE",
                    label:
                      "With Files",
                  },
                  {
                    value:
                      "WITHOUT_FILE",
                    label:
                      "Without Files",
                  },
                ]}
              />

            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-xs text-slate-400">

                Showing{" "}
                <span className="font-bold text-slate-700">
                  {
                    submissions.length
                  }
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-700">
                  {
                    allSubmissions.length
                  }
                </span>{" "}
                submissions

              </p>

              {hasFilters && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="inline-flex w-fit items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100"
                >

                  <X size={13} />

                  Clear Filters

                </button>
              )}

            </div>

          </section>
        )}

        {/* SUBMISSIONS */}

        <section className="mt-8">

          <div className="mb-5">

            <h2 className="text-xl font-bold">
              Student Submissions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Review files, marks and feedback for each student.
            </p>

          </div>

          {allSubmissions.length ===
          0 ? (

            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">

                <FileText
                  size={30}
                />

              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-800">
                No submissions yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Students have not submitted this assignment yet.
              </p>

            </div>

          ) : submissions.length ===
            0 ? (

            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

                <Search
                  size={30}
                />

              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-800">
                No matching submissions
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Try changing your search or filters.
              </p>

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

            </div>

          ) : (

            <div className="space-y-5">

              {submissions.map(
                (
                  submission,
                  index
                ) => {

                  const current =
                    grading[
                      submission.id
                    ] || {
                      marksObtained:
                        submission?.marksObtained ??
                        "",
                      remarks:
                        submission?.remarks ??
                        "",
                    };

                  const status =
                    String(
                      submission?.status ||
                        ""
                    ).toUpperCase();

                  const isGraded =
                    status ===
                    "GRADED";

                  const hasFile =
                    Boolean(
                      submission?.fileUrl ||
                        submission?.fileName
                    );

                  const fileUrl =
                    getFileUrl(
                      submission
                    );

                  const studentName =
                    getStudentName(
                      submission
                    );

                  const marks =
                    Number(
                      submission?.marksObtained
                    );

                  const percentage =
                    isGraded &&
                    maxMarks >
                      0 &&
                    !Number.isNaN(
                      marks
                    )
                      ? Math.round(
                          (
                            marks /
                            maxMarks
                          ) *
                            100
                        )
                      : null;

                  return (
                    <SubmissionCard
                      key={
                        submission.id
                      }
                      submission={
                        submission
                      }
                      index={
                        index
                      }
                      studentName={
                        studentName
                      }
                      studentInitials={getStudentInitials(
                        submission
                      )}
                      studentId={getStudentId(
                        submission
                      )}
                      studentEmail={getStudentEmail(
                        submission
                      )}
                      batch={getStudentBatch(
                        submission
                      )}
                      division={getStudentDivision(
                        submission
                      )}
                      status={
                        status
                      }
                      isGraded={
                        isGraded
                      }
                      percentage={
                        percentage
                      }
                      hasFile={
                        hasFile
                      }
                      fileUrl={
                        fileUrl
                      }
                      current={
                        current
                      }
                      maxMarks={
                        maxMarks
                      }
                      gradingId={
                        gradingId
                      }
                      updateGrading={
                        updateGrading
                      }
                      gradeSubmission={
                        gradeSubmission
                      }
                      formatFileSize={
                        formatFileSize
                      }
                    />
                  );
                }
              )}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

/* ============================================================
   SUBMISSION CARD
============================================================ */

function SubmissionCard({
  submission,
  index,
  studentName,
  studentInitials,
  studentId,
  studentEmail,
  batch,
  division,
  status,
  isGraded,
  percentage,
  hasFile,
  fileUrl,
  current,
  maxMarks,
  gradingId,
  updateGrading,
  gradeSubmission,
  formatFileSize,
}) {
  const statusConfig = {
    GRADED: {
      label:
        "GRADED",
      className:
        "bg-green-50 text-green-700",
      icon: (
        <CheckCircle2
          size={13}
        />
      ),
    },
    LATE: {
      label:
        "LATE",
      className:
        "bg-orange-50 text-orange-700",
      icon: (
        <Clock3 size={13} />
      ),
    },
    SUBMITTED: {
      label:
        "SUBMITTED",
      className:
        "bg-blue-50 text-blue-700",
      icon: (
        <CheckCircle2
          size={13}
        />
      ),
    },
  };

  const config =
    statusConfig[
      status
    ] || {
      label:
        status ||
        "PENDING",
      className:
        "bg-slate-100 text-slate-600",
      icon: (
        <Clock3 size={13} />
      ),
    };

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">

      <div
        className={`h-1 ${
          isGraded
            ? "bg-green-500"
            : status ===
              "LATE"
            ? "bg-orange-500"
            : "bg-indigo-500"
        }`}
      />

      <div className="p-5 sm:p-6">

        {/* STUDENT HEADER */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex min-w-0 items-center gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600">
              {studentInitials}
            </div>

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <h3 className="truncate text-lg font-bold text-slate-800">
                  {
                    studentName
                  }
                </h3>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${config.className}`}
                >
                  {
                    config.icon
                  }
                  {
                    config.label
                  }
                </span>

              </div>

              <p className="mt-1 text-sm font-semibold text-indigo-600">
                {studentId}
              </p>

            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            {percentage !==
              null && (
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  percentage >=
                  75
                    ? "bg-green-50 text-green-700"
                    : percentage >=
                      40
                    ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {
                  percentage
                }%
              </span>
            )}

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Submission #
              {
                index +
                1
              }
            </span>

          </div>

        </div>

        {/* STUDENT DETAILS */}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <InfoItem
            icon={
              <UserRound
                size={16}
              />
            }
            label="Batch"
            value={
              batch
            }
          />

          <InfoItem
            icon={
              <Users
                size={16}
              />
            }
            label="Division"
            value={
              division
            }
          />

          <InfoItem
            icon={
              <Mail size={16} />
            }
            label="Email"
            value={
              studentEmail ||
              "—"
            }
          />

          <InfoItem
            icon={
              <CalendarDays
                size={16}
              />
            }
            label="Submitted"
            value={formatDateTime(
              submission?.submittedAt
            )}
          />

        </div>

        {/* FILE */}

        <div className="mt-5">

          {hasFile ? (

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">

                    <Paperclip
                      size={20}
                    />

                  </div>

                  <div className="min-w-0">

                    <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                      Submitted File
                    </p>

                    <p className="mt-1 break-all text-sm font-bold text-blue-900">
                      {
                        submission?.fileName ||
                        "Assignment File"
                      }
                    </p>

                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-blue-600">

                      {submission?.fileType && (
                        <span>
                          {
                            submission.fileType
                          }
                        </span>
                      )}

                      {submission?.fileSize !==
                        null &&
                        submission?.fileSize !==
                          undefined && (
                          <span>
                            {
                              formatFileSize(
                                submission.fileSize
                              )
                            }
                          </span>
                        )}

                    </div>

                  </div>

                </div>

                {fileUrl && (
                  <div className="flex gap-2">

                    <a
                      href={
                        fileUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-blue-200 hover:bg-blue-100"
                    >

                      <ExternalLink
                        size={15}
                      />

                      Open

                    </a>

                    <a
                      href={
                        fileUrl
                      }
                      download={
                        submission?.fileName ||
                        true
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
                    >

                      <Download
                        size={15}
                      />

                      Download

                    </a>

                  </div>
                )}

              </div>

            </div>

          ) : (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">

              <div className="flex items-center gap-3 text-slate-500">

                <FileText
                  size={21}
                />

                <div>

                  <p className="text-sm font-bold text-slate-700">
                    No file attached
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    This submission does not contain an uploaded file.
                  </p>

                </div>

              </div>

            </div>

          )}

        </div>

        {/* CURRENT RESULT */}

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-2">

              <Award
                size={17}
                className="text-indigo-600"
              />

              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Current Result
              </span>

            </div>

            <span
              className={`text-lg font-bold ${
                isGraded
                  ? "text-green-700"
                  : "text-slate-700"
              }`}
            >

              {submission?.marksObtained !==
                null &&
              submission?.marksObtained !==
                undefined
                ? `${submission.marksObtained} / ${maxMarks}`
                : `Not graded / ${maxMarks}`}

            </span>

          </div>

          {submission?.remarks && (
            <div className="mt-3 rounded-xl bg-white p-3">

              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Existing Feedback
              </p>

              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {
                  submission.remarks
                }
              </p>

            </div>
          )}

        </div>

        {/* GRADING */}

        <div className="mt-6 border-t border-slate-100 pt-6">

          <div className="grid gap-5 lg:grid-cols-[220px_1fr]">

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Marks Obtained
              </label>

              <div className="relative">

                <input
                  type="number"
                  min="0"
                  max={
                    maxMarks ||
                    undefined
                  }
                  step="0.5"
                  value={
                    current.marksObtained
                  }
                  onChange={(
                    event
                  ) =>
                    updateGrading(
                      submission.id,
                      "marksObtained",
                      event
                        .target
                        .value
                    )
                  }
                  placeholder={`0 - ${maxMarks}`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-16 text-sm font-semibold outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  /
                  {" "}
                  {maxMarks}
                </span>

              </div>

            </div>

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Remarks / Feedback
              </label>

              <textarea
                rows={3}
                value={
                  current.remarks
                }
                onChange={(
                  event
                ) =>
                  updateGrading(
                    submission.id,
                    "remarks",
                    event
                      .target
                      .value
                  )
                }
                placeholder="Enter constructive feedback for the student..."
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />

            </div>

          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-xs font-medium text-slate-500">

                {isGraded
                  ? "This submission is already graded. You can update the marks or feedback."
                  : "Enter the marks and optional feedback, then save the grade."}

              </p>

              {current.marksObtained !==
                "" &&
                maxMarks >
                  0 && (
                  <p className="mt-1 text-xs font-semibold text-indigo-600">

                    Current entry:
                    {" "}
                    {
                      current.marksObtained
                    }
                    {" "}
                    /
                    {" "}
                    {maxMarks}

                  </p>
                )}

            </div>

            <button
              type="button"
              onClick={() =>
                gradeSubmission(
                  submission.id,
                  maxMarks
                )
              }
              disabled={
                gradingId ===
                submission.id
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {gradingId ===
              submission.id ? (
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

                  {isGraded
                    ? "Update Grade"
                    : "Save Grade"}

                </>
              )}

            </button>

          </div>

        </div>

      </div>

    </article>
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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">

      {icon}

      {text}

    </span>
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
   KPI CARD
============================================================ */

function KpiCard({
  icon,
  title,
  value,
  description,
  type = "indigo",
}) {
  const styles = {
    indigo:
      "bg-indigo-50 text-indigo-600",
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
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles[type]}`}
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
   PERFORMANCE CARD
============================================================ */

function PerformanceCard({
  title,
  value,
  detail,
  type,
}) {
  const styles = {
    indigo:
      "bg-indigo-600",
    green:
      "bg-green-500",
    purple:
      "bg-purple-500",
  };

  const safeValue =
    Math.max(
      0,
      Math.min(
        Number(value) ||
          0,
        100
      )
    );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

      <div className="flex items-center justify-between">

        <p className="text-sm font-bold text-slate-700">
          {title}
        </p>

        <span className="text-xl font-bold text-slate-800">
          {value}%
        </span>

      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">

        <div
          className={`h-full rounded-full ${
            styles[type] ||
            styles.indigo
          }`}
          style={{
            width: `${safeValue}%`,
          }}
        />

      </div>

      <p className="mt-2 text-xs text-slate-400">
        {detail}
      </p>

    </div>
  );
}

/* ============================================================
   SMALL METRIC
============================================================ */

function SmallMetric({
  icon,
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">

          {icon}

        </div>

        <span className="text-sm font-semibold text-slate-600">
          {label}
        </span>

      </div>

      <span className="text-xl font-bold text-slate-800">
        {value}
      </span>

    </div>
  );
}

/* ============================================================
   INFO ITEM
============================================================ */

function InfoItem({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">

      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">

        <span className="text-indigo-600">
          {icon}
        </span>

        {label}

      </div>

      <p className="mt-1 break-words text-sm font-semibold text-slate-700">
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   FILTER SELECT
============================================================ */

function FilterSelect({
  value,
  onChange,
  options,
}) {
  return (
    <select
      value={value}
      onChange={(
        event
      ) =>
        onChange(
          event.target
            .value
        )
      }
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
    >

      {options.map(
        (
          option
        ) => (
          <option
            key={
              option.value
            }
            value={
              option.value
            }
          >
            {
              option.label
            }
          </option>
        )
      )}

    </select>
  );
}

/* ============================================================
   ALERT
============================================================ */

function AlertBox({
  type,
  message,
  onClose,
}) {
  const isError =
    type === "error";

  return (
    <div
      className={`mb-6 flex items-start gap-3 rounded-2xl border p-5 ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-green-200 bg-green-50 text-green-700"
      }`}
    >

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isError
            ? "bg-red-100"
            : "bg-green-100"
        }`}
      >

        {isError ? (
          <AlertCircle
            size={20}
          />
        ) : (
          <CheckCircle2
            size={20}
          />
        )}

      </div>

      <div className="min-w-0 flex-1">

        <p className="font-bold">
          {isError
            ? "Error"
            : "Success"}
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
        className="rounded-lg p-1 text-current opacity-60 hover:bg-black/5 hover:opacity-100"
      >
        <X size={17} />
      </button>

    </div>
  );
}

/* ============================================================
   SKELETON
============================================================ */

function AssignmentSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-slate-50">

      <div className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6">

        <div className="mx-auto max-w-7xl">

          <div className="h-5 w-40 rounded bg-slate-200" />

        </div>

      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <div className="h-56 rounded-3xl bg-slate-200" />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {[
            1,
            2,
            3,
            4,
          ].map(
            (
              item
            ) => (
              <div
                key={
                  item
                }
                className="h-28 rounded-2xl bg-slate-200"
              />
            )
          )}

        </div>

        <div className="mt-8 h-56 rounded-2xl bg-slate-200" />

        <div className="mt-8 h-32 rounded-2xl bg-slate-200" />

        <div className="mt-8 h-80 rounded-2xl bg-slate-200" />

      </main>

    </div>
  );
}

export default FacultyAssignmentDetails;