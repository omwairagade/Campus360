import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  BookOpen,
  UserRound,
  Award,
  Search,
  RefreshCw,
  X,
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  FileText,
  TrendingUp,
} from "lucide-react";

import { apiGet, logoutUser } from "../api";

const Examinations = () => {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedExam, setSelectedExam] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const getErrorMessage = (err) => {
    return (
      err?.response?.data?.message ||
      err?.message ||
      "Failed to load examinations"
    );
  };

  const isAuthError = (message) => {
    const text = String(message || "").toLowerCase();

    return (
      text.includes("token") ||
      text.includes("authentication") ||
      text.includes("unauthorized") ||
      text.includes("forbidden") ||
      text.includes("401") ||
      text.includes("403")
    );
  };

  const loadExams = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await apiGet("/exams/my-exams");

        const examData =
          response?.exams ||
          response?.data?.exams ||
          response?.data?.data?.exams ||
          [];

        setExams(Array.isArray(examData) ? examData : []);
      } catch (err) {
        const message = getErrorMessage(err);

        if (isAuthError(message)) {
          logoutUser();
          navigate("/");
          return;
        }

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const normalizeExamType = (value) => {
    return String(value || "EXAM")
      .trim()
      .toUpperCase();
  };

  const getExamDate = (exam) => {
    const date = new Date(exam?.examDate);

    return Number.isNaN(date.getTime()) ? null : date;
  };

  const isUpcoming = (exam) => {
    const date = getExamDate(exam);

    if (!date) return false;

    return date.getTime() >= Date.now();
  };

  const isCompleted = (exam) => {
    const date = getExamDate(exam);

    if (!date) return false;

    return date.getTime() < Date.now();
  };

  const formatDate = (dateValue) => {
    const date = getExamDate({ examDate: dateValue });

    if (!date) return "Date not available";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDay = (dateValue) => {
    const date = getExamDate({ examDate: dateValue });

    if (!date) return "--";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
    });
  };

  const formatMonth = (dateValue) => {
    const date = getExamDate({ examDate: dateValue });

    if (!date) return "---";

    return date.toLocaleDateString("en-IN", {
      month: "short",
    });
  };

  const formatTime = (dateValue) => {
    const date = getExamDate({ examDate: dateValue });

    if (!date) return "Time not available";

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFacultyName = (exam) => {
    const user = exam?.faculty?.user;

    if (!user) return "Faculty not assigned";

    const name = `${user.firstName || ""} ${
      user.lastName || ""
    }`.trim();

    return name || "Faculty not assigned";
  };

  const getExamStatus = (exam) => {
    if (isUpcoming(exam)) {
      return {
        label: "Upcoming",
        className: "status-upcoming",
        icon: CalendarDays,
      };
    }

    if (exam?.result) {
      return {
        label: "Result Available",
        className: "status-result",
        icon: CheckCircle2,
      };
    }

    return {
      label: "Completed",
      className: "status-completed",
      icon: CheckCircle2,
    };
  };

  const examTypes = useMemo(() => {
    const types = exams
      .map((exam) => normalizeExamType(exam.examType))
      .filter(Boolean);

    return ["ALL", ...Array.from(new Set(types))];
  }, [exams]);

  const stats = useMemo(() => {
    const upcoming = exams.filter(isUpcoming).length;
    const completed = exams.filter(isCompleted).length;
    const results = exams.filter((exam) => exam?.result).length;

    return {
      total: exams.length,
      upcoming,
      completed,
      results,
    };
  }, [exams]);

  const filteredExams = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...exams]
      .filter((exam) => {
        if (!query) return true;

        const course = exam?.course || {};
        const facultyName = getFacultyName(exam);

        return (
          String(exam?.title || "")
            .toLowerCase()
            .includes(query) ||
          String(exam?.examType || "")
            .toLowerCase()
            .includes(query) ||
          String(course?.code || "")
            .toLowerCase()
            .includes(query) ||
          String(course?.name || "")
            .toLowerCase()
            .includes(query) ||
          facultyName.toLowerCase().includes(query)
        );
      })
      .filter((exam) => {
        if (typeFilter === "ALL") return true;

        return (
          normalizeExamType(exam.examType) === typeFilter
        );
      })
      .filter((exam) => {
        if (statusFilter === "ALL") return true;

        if (statusFilter === "UPCOMING") {
          return isUpcoming(exam);
        }

        if (statusFilter === "COMPLETED") {
          return isCompleted(exam);
        }

        if (statusFilter === "RESULT") {
          return Boolean(exam?.result);
        }

        return true;
      })
      .sort((a, b) => {
        const first =
          getExamDate(a)?.getTime() || 0;
        const second =
          getExamDate(b)?.getTime() || 0;

        return first - second;
      });
  }, [exams, search, typeFilter, statusFilter]);

  const getMarksPercentage = (exam) => {
    if (!exam?.result) return null;

    const marks = Number(exam.result.marksObtained);
    const maxMarks = Number(exam.maxMarks);

    if (
      Number.isNaN(marks) ||
      Number.isNaN(maxMarks) ||
      maxMarks <= 0
    ) {
      return null;
    }

    return Math.min(
      Math.max((marks / maxMarks) * 100, 0),
      100
    );
  };

  const getPerformanceClass = (percentage) => {
    if (percentage === null) return "";

    if (percentage >= 75) {
      return "performance-good";
    }

    if (percentage >= 50) {
      return "performance-average";
    }

    return "performance-low";
  };

  const getDaysRemaining = (exam) => {
    const date = getExamDate(exam);

    if (!date || !isUpcoming(exam)) {
      return null;
    }

    const now = new Date();

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const examDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const difference =
      examDay.getTime() - today.getTime();

    return Math.ceil(
      difference / (1000 * 60 * 60 * 24)
    );
  };

  const renderDaysRemaining = (exam) => {
    const days = getDaysRemaining(exam);

    if (days === null) {
      return null;
    }

    if (days === 0) {
      return (
        <span className="exam-countdown countdown-today">
          Today
        </span>
      );
    }

    if (days === 1) {
      return (
        <span className="exam-countdown countdown-soon">
          Tomorrow
        </span>
      );
    }

    if (days <= 7) {
      return (
        <span className="exam-countdown countdown-soon">
          {days} days left
        </span>
      );
    }

    return (
      <span className="exam-countdown">
        {days} days left
      </span>
    );
  };

  if (loading) {
    return (
      <>
        <style>{examinationStyles}</style>

        <div className="examination-page">
          <div className="examination-loading">
            <div className="loading-spinner" />
            <h3>Loading examinations...</h3>
            <p>
              Please wait while we fetch your exam schedule.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{examinationStyles}</style>

      <div className="examination-page">
        <div className="examination-container">
          {/* HEADER */}
          <div className="page-header">
            <div className="page-header-left">
              <button
                className="back-button"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft size={18} />
                <span>Back to Dashboard</span>
              </button>

              <div className="page-title">
                <div className="page-title-icon">
                  <GraduationCap size={27} />
                </div>

                <div>
                  <h1>Examinations</h1>
                  <p>
                    View your upcoming and completed examinations
                  </p>
                </div>
              </div>
            </div>

            <button
              className="refresh-button"
              onClick={() => loadExams(true)}
              disabled={refreshing}
              title="Refresh examinations"
            >
              <RefreshCw
                size={18}
                className={
                  refreshing ? "spin-animation" : ""
                }
              />
              <span>
                {refreshing ? "Refreshing..." : "Refresh"}
              </span>
            </button>
          </div>

          {/* ERROR */}
          {error && (
            <div className="error-alert">
              <CircleAlert size={20} />

              <div>
                <strong>Unable to load examinations</strong>
                <p>{error}</p>
              </div>

              <button onClick={() => loadExams()}>
                Try Again
              </button>
            </div>
          )}

          {/* SUMMARY */}
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-icon total-icon">
                <FileText size={21} />
              </div>

              <div>
                <span className="summary-label">
                  Total Exams
                </span>
                <strong>{stats.total}</strong>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon upcoming-icon">
                <CalendarDays size={21} />
              </div>

              <div>
                <span className="summary-label">
                  Upcoming
                </span>
                <strong>{stats.upcoming}</strong>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon completed-icon">
                <CheckCircle2 size={21} />
              </div>

              <div>
                <span className="summary-label">
                  Completed
                </span>
                <strong>{stats.completed}</strong>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon result-icon">
                <Award size={21} />
              </div>

              <div>
                <span className="summary-label">
                  Results Available
                </span>
                <strong>{stats.results}</strong>
              </div>
            </div>
          </div>

          {/* FILTERS */}
          <div className="filter-card">
            <div className="search-wrapper">
              <Search size={18} />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search exam, course or faculty..."
              />

              {search && (
                <button
                  className="clear-search"
                  onClick={() => setSearch("")}
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="filter-group">
              <label>Exam Type</label>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value)
                }
              >
                {examTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === "ALL"
                      ? "All Types"
                      : type}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Status</label>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="ALL">All Status</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="COMPLETED">
                  Completed
                </option>
                <option value="RESULT">
                  Result Available
                </option>
              </select>
            </div>
          </div>

          {/* RESULT COUNT */}
          <div className="results-heading">
            <div>
              <h2>Your Examinations</h2>
              <span>
                {filteredExams.length}{" "}
                {filteredExams.length === 1
                  ? "examination"
                  : "examinations"}{" "}
                found
              </span>
            </div>
          </div>

          {/* EMPTY */}
          {filteredExams.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <CalendarDays size={34} />
              </div>

              <h3>No examinations found</h3>

              <p>
                {exams.length === 0
                  ? "No examinations have been scheduled for your enrolled courses yet."
                  : "Try changing your search or filters."}
              </p>

              {(search ||
                typeFilter !== "ALL" ||
                statusFilter !== "ALL") && (
                <button
                  className="reset-button"
                  onClick={() => {
                    setSearch("");
                    setTypeFilter("ALL");
                    setStatusFilter("ALL");
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="exam-list">
              {filteredExams.map((exam) => {
                const status = getExamStatus(exam);
                const StatusIcon = status.icon;
                const percentage =
                  getMarksPercentage(exam);

                return (
                  <div
                    className="exam-card"
                    key={exam.id}
                    onClick={() =>
                      setSelectedExam(exam)
                    }
                  >
                    <div className="exam-date-box">
                      <span>
                        {formatMonth(exam.examDate)}
                      </span>
                      <strong>
                        {formatDay(exam.examDate)}
                      </strong>
                    </div>

                    <div className="exam-main">
                      <div className="exam-top-row">
                        <div>
                          <div className="exam-title-row">
                            <h3>
                              {exam.title ||
                                "Untitled Examination"}
                            </h3>

                            <span className="exam-type">
                              {exam.examType ||
                                "EXAM"}
                            </span>
                          </div>

                          <div className="course-info">
                            <BookOpen size={16} />

                            <strong>
                              {exam.course?.code ||
                                "N/A"}
                            </strong>

                            <span>
                              {exam.course?.name ||
                                "Course"}
                            </span>

                            {exam.course?.credits !==
                              undefined &&
                              exam.course?.credits !==
                                null && (
                                <span className="credits">
                                  {exam.course.credits}{" "}
                                  credits
                                </span>
                              )}
                          </div>
                        </div>

                        <div
                          className={`exam-status ${status.className}`}
                        >
                          <StatusIcon size={15} />
                          {status.label}
                        </div>
                      </div>

                      <div className="exam-details-row">
                        <div className="detail-item">
                          <CalendarDays size={16} />
                          <span>
                            {formatDate(
                              exam.examDate
                            )}
                          </span>
                        </div>

                        <div className="detail-item">
                          <Clock3 size={16} />
                          <span>
                            {formatTime(
                              exam.examDate
                            )}
                          </span>
                        </div>

                        <div className="detail-item">
                          <UserRound size={16} />
                          <span>
                            {getFacultyName(exam)}
                          </span>
                        </div>

                        <div className="detail-item">
                          <Award size={16} />
                          <span>
                            Max Marks:{" "}
                            {exam.maxMarks ?? "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="exam-bottom-row">
                        <div>
                          {renderDaysRemaining(exam)}
                        </div>

                        {exam.result ? (
                          <div
                            className={`result-preview ${getPerformanceClass(
                              percentage
                            )}`}
                          >
                            <span className="result-grade">
                              {exam.result.grade ||
                                "Result"}
                            </span>

                            <span>
                              {exam.result.marksObtained ??
                                "--"}{" "}
                              /{" "}
                              {exam.maxMarks ??
                                "--"}{" "}
                              marks
                            </span>

                            {exam.result.gradePoint !==
                              null &&
                              exam.result.gradePoint !==
                                undefined && (
                                <span>
                                  GP:{" "}
                                  {
                                    exam.result
                                      .gradePoint
                                  }
                                </span>
                              )}
                          </div>
                        ) : isCompleted(exam) ? (
                          <span className="result-pending">
                            Result not available
                          </span>
                        ) : (
                          <span className="exam-view">
                            View details →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DETAILS MODAL */}
        {selectedExam && (
          <div
            className="modal-overlay"
            onClick={() =>
              setSelectedExam(null)
            }
          >
            <div
              className="exam-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="modal-header">
                <div>
                  <span className="modal-eyebrow">
                    {selectedExam.examType ||
                      "EXAMINATION"}
                  </span>

                  <h2>
                    {selectedExam.title ||
                      "Examination"}
                  </h2>
                </div>

                <button
                  className="modal-close"
                  onClick={() =>
                    setSelectedExam(null)
                  }
                  aria-label="Close"
                >
                  <X size={21} />
                </button>
              </div>

              <div className="modal-body">
                <div className="modal-course-card">
                  <div className="modal-course-icon">
                    <BookOpen size={22} />
                  </div>

                  <div>
                    <span>
                      {selectedExam.course
                        ?.code || "N/A"}
                    </span>

                    <strong>
                      {selectedExam.course
                        ?.name || "Course"}
                    </strong>
                  </div>
                </div>

                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <CalendarDays size={19} />
                    <div>
                      <span>Date</span>
                      <strong>
                        {formatDate(
                          selectedExam.examDate
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="modal-info-item">
                    <Clock3 size={19} />
                    <div>
                      <span>Time</span>
                      <strong>
                        {formatTime(
                          selectedExam.examDate
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="modal-info-item">
                    <UserRound size={19} />
                    <div>
                      <span>Faculty</span>
                      <strong>
                        {getFacultyName(
                          selectedExam
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="modal-info-item">
                    <FileText size={19} />
                    <div>
                      <span>Maximum Marks</span>
                      <strong>
                        {selectedExam.maxMarks ??
                          "N/A"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="modal-status-section">
                  <span className="section-label">
                    Examination Status
                  </span>

                  {(() => {
                    const status =
                      getExamStatus(
                        selectedExam
                      );

                    const StatusIcon =
                      status.icon;

                    return (
                      <div
                        className={`large-status ${status.className}`}
                      >
                        <StatusIcon size={19} />
                        {status.label}
                      </div>
                    );
                  })()}
                </div>

                {selectedExam.result ? (
                  <div className="result-card">
                    <div className="result-card-header">
                      <div>
                        <span className="section-label">
                          Your Result
                        </span>
                        <h3>
                          Examination Result
                        </h3>
                      </div>

                      <div className="result-icon-large">
                        <Award size={23} />
                      </div>
                    </div>

                    <div className="result-grid">
                      <div>
                        <span>Marks Obtained</span>
                        <strong>
                          {
                            selectedExam
                              .result
                              .marksObtained
                          }{" "}
                          /{" "}
                          {
                            selectedExam
                              .maxMarks
                          }
                        </strong>
                      </div>

                      <div>
                        <span>Grade</span>
                        <strong>
                          {selectedExam.result
                            .grade || "--"}
                        </strong>
                      </div>

                      <div>
                        <span>Grade Point</span>
                        <strong>
                          {selectedExam.result
                            .gradePoint ??
                            "--"}
                        </strong>
                      </div>

                      <div>
                        <span>Percentage</span>
                        <strong>
                          {(() => {
                            const percentage =
                              getMarksPercentage(
                                selectedExam
                              );

                            return percentage ===
                              null
                              ? "--"
                              : `${percentage.toFixed(
                                  1
                                )}%`;
                          })()}
                        </strong>
                      </div>
                    </div>

                    {(() => {
                      const percentage =
                        getMarksPercentage(
                          selectedExam
                        );

                      if (
                        percentage === null
                      ) {
                        return null;
                      }

                      return (
                        <div className="progress-container">
                          <div className="progress-label">
                            <span>
                              Performance
                            </span>
                            <strong>
                              {percentage.toFixed(
                                1
                              )}
                              %
                            </strong>
                          </div>

                          <div className="progress-track">
                            <div
                              className={`progress-fill ${getPerformanceClass(
                                percentage
                              )}`}
                              style={{
                                width: `${percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="no-result-card">
                    <TrendingUp size={22} />

                    <div>
                      <strong>
                        No result available
                      </strong>

                      <p>
                        Your result has not been
                        published for this examination
                        yet.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  className="modal-done-button"
                  onClick={() =>
                    setSelectedExam(null)
                  }
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const examinationStyles = `
  * {
    box-sizing: border-box;
  }

  .examination-page {
    min-height: 100vh;
    background: #f5f7fb;
    color: #172033;
    padding: 28px 20px 50px;
    font-family:
      Inter,
      "Segoe UI",
      Roboto,
      Arial,
      sans-serif;
  }

  .examination-container {
    width: 100%;
    max-width: 1250px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 25px;
  }

  .page-header-left {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .back-button,
  .refresh-button,
  .reset-button,
  .modal-done-button {
    border: none;
    cursor: pointer;
    font-family: inherit;
  }

  .back-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    background: transparent;
    color: #52617a;
    font-size: 14px;
    font-weight: 700;
    padding: 0;
  }

  .back-button:hover {
    color: #1769ff;
  }

  .page-title {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .page-title-icon {
    width: 54px;
    height: 54px;
    border-radius: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eaf1ff;
    color: #1769ff;
    flex-shrink: 0;
  }

  .page-title h1 {
    margin: 0 0 5px;
    font-size: 30px;
    line-height: 1.15;
    font-weight: 800;
    color: #172033;
  }

  .page-title p {
    margin: 0;
    color: #718096;
    font-size: 14px;
  }

  .refresh-button {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #1769ff;
    color: white;
    border-radius: 10px;
    padding: 11px 16px;
    font-size: 14px;
    font-weight: 700;
    box-shadow: 0 5px 14px rgba(23, 105, 255, 0.2);
  }

  .refresh-button:hover {
    background: #0f57da;
  }

  .refresh-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .spin-animation {
    animation: spin 0.9s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  .error-alert {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 15px 17px;
    margin-bottom: 20px;
    border-radius: 13px;
    background: #fff2f2;
    border: 1px solid #ffd3d3;
    color: #b42318;
  }

  .error-alert > div {
    flex: 1;
  }

  .error-alert strong {
    display: block;
    font-size: 14px;
    margin-bottom: 3px;
  }

  .error-alert p {
    margin: 0;
    font-size: 13px;
  }

  .error-alert button {
    border: none;
    background: #b42318;
    color: white;
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    font-weight: 700;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
    margin-bottom: 20px;
  }

  .summary-card {
    background: white;
    border: 1px solid #e7ebf2;
    border-radius: 16px;
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 13px;
    box-shadow: 0 5px 18px rgba(20, 36, 70, 0.04);
  }

  .summary-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .total-icon {
    background: #eef2ff;
    color: #4f46e5;
  }

  .upcoming-icon {
    background: #eaf1ff;
    color: #1769ff;
  }

  .completed-icon {
    background: #eafaf2;
    color: #15945b;
  }

  .result-icon {
    background: #fff7df;
    color: #c48600;
  }

  .summary-label {
    display: block;
    color: #77849a;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .summary-card strong {
    display: block;
    font-size: 23px;
    line-height: 1;
    color: #182236;
  }

  .filter-card {
    display: grid;
    grid-template-columns: minmax(250px, 1fr) 190px 190px;
    gap: 14px;
    align-items: end;
    background: white;
    border: 1px solid #e7ebf2;
    border-radius: 16px;
    padding: 17px;
    margin-bottom: 24px;
    box-shadow: 0 5px 18px rgba(20, 36, 70, 0.04);
  }

  .search-wrapper {
    height: 44px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid #dfe5ee;
    border-radius: 10px;
    padding: 0 12px;
    color: #8a96a9;
    background: #fbfcfe;
  }

  .search-wrapper:focus-within {
    border-color: #1769ff;
    box-shadow: 0 0 0 3px rgba(23, 105, 255, 0.08);
  }

  .search-wrapper input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: #172033;
    font-size: 14px;
    font-family: inherit;
  }

  .clear-search {
    border: none;
    background: transparent;
    color: #8793a6;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 3px;
  }

  .filter-group label {
    display: block;
    color: #69778c;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .filter-group select {
    width: 100%;
    height: 44px;
    border: 1px solid #dfe5ee;
    border-radius: 10px;
    padding: 0 12px;
    background: #fbfcfe;
    color: #243148;
    outline: none;
    font-family: inherit;
    cursor: pointer;
  }

  .filter-group select:focus {
    border-color: #1769ff;
  }

  .results-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 13px;
  }

  .results-heading h2 {
    margin: 0 0 3px;
    font-size: 19px;
    font-weight: 800;
    color: #1c2639;
  }

  .results-heading span {
    color: #8290a5;
    font-size: 13px;
  }

  .exam-list {
    display: flex;
    flex-direction: column;
    gap: 13px;
  }

  .exam-card {
    display: flex;
    align-items: stretch;
    background: white;
    border: 1px solid #e5eaf2;
    border-radius: 17px;
    overflow: hidden;
    cursor: pointer;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      border-color 0.2s ease;
  }

  .exam-card:hover {
    transform: translateY(-2px);
    border-color: #cddafa;
    box-shadow: 0 12px 28px rgba(20, 36, 70, 0.08);
  }

  .exam-date-box {
    width: 82px;
    min-width: 82px;
    background: #f0f5ff;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    border-right: 1px solid #e3eaf8;
  }

  .exam-date-box span {
    color: #1769ff;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .exam-date-box strong {
    color: #172033;
    font-size: 27px;
    line-height: 1.15;
    margin-top: 2px;
  }

  .exam-main {
    flex: 1;
    min-width: 0;
    padding: 17px 19px;
  }

  .exam-top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 15px;
  }

  .exam-title-row {
    display: flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
  }

  .exam-title-row h3 {
    margin: 0;
    color: #172033;
    font-size: 16px;
    font-weight: 800;
  }

  .exam-type {
    display: inline-flex;
    align-items: center;
    border-radius: 20px;
    padding: 4px 9px;
    background: #f1f4f8;
    color: #5c687b;
    font-size: 10px;
    font-weight: 800;
  }

  .course-info {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 7px;
    color: #758399;
    font-size: 13px;
    flex-wrap: wrap;
  }

  .course-info svg {
    color: #1769ff;
  }

  .course-info strong {
    color: #40506a;
  }

  .credits {
    padding-left: 8px;
    border-left: 1px solid #dfe5ee;
  }

  .exam-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 20px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
  }

  .status-upcoming {
    color: #1769ff;
    background: #eaf1ff;
  }

  .status-result {
    color: #128052;
    background: #e9f8f0;
  }

  .status-completed {
    color: #667085;
    background: #f0f2f5;
  }

  .exam-details-row {
    display: flex;
    align-items: center;
    gap: 19px;
    flex-wrap: wrap;
    margin-top: 15px;
    padding-top: 13px;
    border-top: 1px solid #edf0f5;
  }

  .detail-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #68768c;
    font-size: 12px;
  }

  .detail-item svg {
    color: #8996a9;
  }

  .exam-bottom-row {
    min-height: 27px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    margin-top: 12px;
  }

  .exam-countdown {
    display: inline-flex;
    padding: 5px 9px;
    border-radius: 7px;
    background: #f3f6fa;
    color: #657287;
    font-size: 11px;
    font-weight: 700;
  }

  .countdown-today {
    background: #fff0ed;
    color: #c43e29;
  }

  .countdown-soon {
    background: #fff7df;
    color: #a36d00;
  }

  .result-preview {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 12px;
    color: #6b788d;
  }

  .result-preview .result-grade {
    min-width: 27px;
    height: 27px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    font-weight: 900;
    background: #e9f8f0;
    color: #128052;
  }

  .performance-average .result-grade {
    background: #fff7df;
    color: #a36d00;
  }

  .performance-low .result-grade {
    background: #fff0ed;
    color: #c43e29;
  }

  .result-pending {
    color: #8a95a7;
    font-size: 12px;
  }

  .exam-view {
    color: #1769ff;
    font-size: 12px;
    font-weight: 700;
  }

  .empty-state {
    background: white;
    border: 1px solid #e5eaf2;
    border-radius: 18px;
    padding: 60px 20px;
    text-align: center;
  }

  .empty-icon {
    width: 68px;
    height: 68px;
    margin: 0 auto 15px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eef3ff;
    color: #1769ff;
  }

  .empty-state h3 {
    margin: 0 0 7px;
    color: #1d283b;
    font-size: 18px;
  }

  .empty-state p {
    max-width: 500px;
    margin: 0 auto 17px;
    color: #7c899d;
    font-size: 13px;
    line-height: 1.6;
  }

  .reset-button {
    padding: 9px 14px;
    border-radius: 9px;
    background: #1769ff;
    color: white;
    font-weight: 700;
    font-size: 13px;
  }

  .examination-loading {
    min-height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 4px solid #dce6fa;
    border-top-color: #1769ff;
    animation: spin 0.8s linear infinite;
    margin-bottom: 16px;
  }

  .examination-loading h3 {
    margin: 0 0 6px;
    color: #243148;
  }

  .examination-loading p {
    margin: 0;
    color: #7d899d;
    font-size: 13px;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(13, 22, 38, 0.52);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow-y: auto;
  }

  .exam-modal {
    width: 100%;
    max-width: 650px;
    background: white;
    border-radius: 20px;
    box-shadow: 0 25px 70px rgba(10, 22, 45, 0.25);
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    gap: 15px;
    padding: 22px 24px;
    border-bottom: 1px solid #edf0f5;
  }

  .modal-eyebrow {
    color: #1769ff;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.8px;
  }

  .modal-header h2 {
    margin: 4px 0 0;
    color: #182236;
    font-size: 21px;
  }

  .modal-close {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 9px;
    background: #f1f4f8;
    color: #647188;
    cursor: pointer;
    flex-shrink: 0;
  }

  .modal-close:hover {
    background: #e9edf3;
  }

  .modal-body {
    padding: 21px 24px;
  }

  .modal-course-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px;
    border-radius: 13px;
    background: #f6f8fc;
    margin-bottom: 18px;
  }

  .modal-course-icon {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    background: #eaf1ff;
    color: #1769ff;
  }

  .modal-course-card span {
    display: block;
    color: #1769ff;
    font-size: 11px;
    font-weight: 800;
    margin-bottom: 2px;
  }

  .modal-course-card strong {
    display: block;
    color: #27344b;
    font-size: 14px;
  }

  .modal-info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 11px;
    margin-bottom: 20px;
  }

  .modal-info-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border: 1px solid #e8ecf2;
    border-radius: 11px;
  }

  .modal-info-item > svg {
    color: #1769ff;
    flex-shrink: 0;
  }

  .modal-info-item span {
    display: block;
    color: #8994a6;
    font-size: 10px;
    font-weight: 700;
    margin-bottom: 3px;
  }

  .modal-info-item strong {
    display: block;
    color: #2d3a50;
    font-size: 12px;
  }

  .section-label {
    display: block;
    color: #78869a;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-bottom: 7px;
  }

  .large-status {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border-radius: 9px;
    padding: 8px 11px;
    font-size: 12px;
    font-weight: 800;
  }

  .result-card {
    margin-top: 20px;
    padding: 17px;
    border-radius: 14px;
    border: 1px solid #dcefe4;
    background: #f7fcf9;
  }

  .result-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }

  .result-card-header h3 {
    margin: 0;
    font-size: 16px;
    color: #26354a;
  }

  .result-icon-large {
    width: 42px;
    height: 42px;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e5f6ed;
    color: #128052;
  }

  .result-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 9px;
  }

  .result-grid > div {
    background: white;
    border: 1px solid #e3eee7;
    border-radius: 9px;
    padding: 11px;
  }

  .result-grid span {
    display: block;
    color: #849184;
    font-size: 10px;
    margin-bottom: 4px;
  }

  .result-grid strong {
    display: block;
    color: #1d5f42;
    font-size: 14px;
  }

  .progress-container {
    margin-top: 17px;
  }

  .progress-label {
    display: flex;
    justify-content: space-between;
    color: #718073;
    font-size: 11px;
    margin-bottom: 6px;
  }

  .progress-label strong {
    color: #1d5f42;
  }

  .progress-track {
    height: 7px;
    overflow: hidden;
    border-radius: 20px;
    background: #e1e9e4;
  }

  .progress-fill {
    height: 100%;
    border-radius: inherit;
    transition: width 0.3s ease;
  }

  .progress-fill.performance-good {
    background: #15945b;
  }

  .progress-fill.performance-average {
    background: #c48600;
  }

  .progress-fill.performance-low {
    background: #c43e29;
  }

  .no-result-card {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    margin-top: 20px;
    padding: 14px;
    border-radius: 12px;
    background: #f5f7fa;
    color: #778397;
  }

  .no-result-card svg {
    color: #8c98aa;
    flex-shrink: 0;
  }

  .no-result-card strong {
    display: block;
    color: #45536a;
    font-size: 13px;
    margin-bottom: 3px;
  }

  .no-result-card p {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 15px 24px;
    border-top: 1px solid #edf0f5;
    background: #fafbfc;
  }

  .modal-done-button {
    padding: 9px 18px;
    border-radius: 9px;
    background: #1769ff;
    color: white;
    font-size: 13px;
    font-weight: 700;
  }

  @media (max-width: 950px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .filter-card {
      grid-template-columns: 1fr 1fr;
    }

    .search-wrapper {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 700px) {
    .examination-page {
      padding: 20px 13px 35px;
    }

    .page-header {
      align-items: stretch;
      flex-direction: column;
    }

    .refresh-button {
      width: 100%;
      justify-content: center;
    }

    .page-title h1 {
      font-size: 25px;
    }

    .summary-grid {
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .summary-card {
      padding: 13px;
    }

    .summary-icon {
      width: 38px;
      height: 38px;
    }

    .summary-card strong {
      font-size: 20px;
    }

    .filter-card {
      grid-template-columns: 1fr;
    }

    .search-wrapper {
      grid-column: auto;
    }

    .exam-card {
      flex-direction: column;
    }

    .exam-date-box {
      width: 100%;
      min-width: 0;
      height: 56px;
      flex-direction: row;
      gap: 7px;
      border-right: none;
      border-bottom: 1px solid #e3eaf8;
    }

    .exam-date-box strong {
      font-size: 23px;
    }

    .exam-top-row {
      flex-direction: column;
    }

    .exam-status {
      width: fit-content;
    }

    .exam-details-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 9px;
    }

    .exam-bottom-row {
      align-items: flex-start;
      flex-direction: column;
    }

    .result-preview {
      flex-wrap: wrap;
    }

    .modal-info-grid {
      grid-template-columns: 1fr;
    }

    .result-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 430px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }

    .page-title {
      align-items: flex-start;
    }

    .page-title-icon {
      width: 46px;
      height: 46px;
    }

    .page-title h1 {
      font-size: 22px;
    }

    .exam-main {
      padding: 15px;
    }

    .modal-overlay {
      padding: 10px;
    }

    .modal-header,
    .modal-body,
    .modal-footer {
      padding-left: 17px;
      padding-right: 17px;
    }

    .result-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
`;

export default Examinations;