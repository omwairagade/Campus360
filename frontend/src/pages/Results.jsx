import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  FileText,
  RefreshCw,
  Search,
  TrendingUp,
  X,
} from "lucide-react";

import { apiGet, logoutUser } from "../api";

const Results = () => {
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const [selectedResult, setSelectedResult] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ============================================================
  // HELPERS
  // ============================================================

  const getErrorMessage = (err) => {
    return (
      err?.response?.data?.message ||
      err?.message ||
      "Failed to load results"
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

  const getMarks = (result) => {
    const value = Number(result?.marksObtained);

    return Number.isNaN(value) ? null : value;
  };

  const getMaxMarks = (result) => {
    const value =
      Number(result?.exam?.maxMarks) ||
      Number(result?.maxMarks);

    return Number.isNaN(value) || value <= 0 ? null : value;
  };

  const getPercentage = (result) => {
    const marks = getMarks(result);
    const maxMarks = getMaxMarks(result);

    if (
      marks === null ||
      maxMarks === null ||
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
    if (percentage === null) {
      return "";
    }

    if (percentage >= 75) {
      return "performance-good";
    }

    if (percentage >= 50) {
      return "performance-average";
    }

    return "performance-low";
  };

  const getResultGrade = (result) => {
    return String(result?.grade || "N/A").trim().toUpperCase();
  };

  const getExamType = (result) => {
    return String(
      result?.exam?.examType ||
        result?.examType ||
        "EXAM"
    )
      .trim()
      .toUpperCase();
  };

  const getExamTitle = (result) => {
    return (
      result?.exam?.title ||
      result?.title ||
      "Examination"
    );
  };

  const getCourseCode = (result) => {
    return (
      result?.course?.code ||
      result?.courseCode ||
      "N/A"
    );
  };

  const getCourseName = (result) => {
    return (
      result?.course?.name ||
      result?.courseName ||
      "Course"
    );
  };

  const getExamDate = (result) => {
    const value =
      result?.exam?.examDate ||
      result?.examDate;

    if (!value) {
      return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  };

  const formatDate = (result) => {
    const date = getExamDate(result);

    if (!date) {
      return "Date not available";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatMonth = (result) => {
    const date = getExamDate(result);

    if (!date) {
      return "---";
    }

    return date.toLocaleDateString("en-IN", {
      month: "short",
    });
  };

  const formatDay = (result) => {
    const date = getExamDate(result);

    if (!date) {
      return "--";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
    });
  };

  // ============================================================
  // LOAD RESULTS
  // ============================================================

  const loadResults = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await apiGet("/student/results");

        const resultData =
          response?.results ||
          response?.data?.results ||
          response?.data?.data?.results ||
          [];

        setResults(
          Array.isArray(resultData)
            ? resultData
            : []
        );
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
    loadResults();
  }, [loadResults]);

  // ============================================================
  // GRADE OPTIONS
  // ============================================================

  const gradeOptions = useMemo(() => {
    const grades = results
      .map((result) => getResultGrade(result))
      .filter((grade) => grade !== "N/A");

    return [
      "ALL",
      ...Array.from(new Set(grades)),
    ];
  }, [results]);

  // ============================================================
  // FILTERED RESULTS
  // ============================================================

  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...results]
      .filter((result) => {
        if (!query) {
          return true;
        }

        return (
          getCourseCode(result)
            .toLowerCase()
            .includes(query) ||
          getCourseName(result)
            .toLowerCase()
            .includes(query) ||
          getExamTitle(result)
            .toLowerCase()
            .includes(query) ||
          getExamType(result)
            .toLowerCase()
            .includes(query) ||
          getResultGrade(result)
            .toLowerCase()
            .includes(query)
        );
      })
      .filter((result) => {
        if (gradeFilter === "ALL") {
          return true;
        }

        return (
          getResultGrade(result) ===
          gradeFilter
        );
      })
      .sort((a, b) => {
        const first =
          getExamDate(a)?.getTime() || 0;

        const second =
          getExamDate(b)?.getTime() || 0;

        return second - first;
      });
  }, [results, search, gradeFilter]);

  // ============================================================
  // STATISTICS
  // ============================================================

  const stats = useMemo(() => {
    const total = results.length;

    const percentages = results
      .map(getPercentage)
      .filter(
        (percentage) =>
          percentage !== null
      );

    const average =
      percentages.length > 0
        ? percentages.reduce(
            (sum, value) => sum + value,
            0
          ) / percentages.length
        : null;

    const passed = results.filter(
      (result) => {
        const percentage =
          getPercentage(result);

        const grade =
          getResultGrade(result);

        if (
          ["F", "FAIL", "FAILED"].includes(
            grade
          )
        ) {
          return false;
        }

        return (
          percentage === null ||
          percentage >= 40
        );
      }
    ).length;

    const gradePoints = results
      .map((result) => {
        const value = Number(
          result?.gradePoint
        );

        return Number.isNaN(value)
          ? null
          : value;
      })
      .filter(
        (value) => value !== null
      );

    const averageGradePoint =
      gradePoints.length > 0
        ? gradePoints.reduce(
            (sum, value) => sum + value,
            0
          ) / gradePoints.length
        : null;

    return {
      total,
      passed,
      failed: Math.max(total - passed, 0),
      average,
      averageGradePoint,
    };
  }, [results]);

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <>
        <style>{resultStyles}</style>

        <div className="result-page">
          <div className="result-loading">
            <div className="loading-spinner" />

            <h3>
              Loading results...
            </h3>

            <p>
              Please wait while we fetch
              your examination results.
            </p>
          </div>
        </div>
      </>
    );
  }

  // ============================================================
  // MAIN PAGE
  // ============================================================

  return (
    <>
      <style>{resultStyles}</style>

      <div className="result-page">
        <div className="result-container">
          {/* HEADER */}
          <div className="page-header">
            <div className="page-header-left">
              <button
                className="back-button"
                onClick={() =>
                  navigate("/dashboard")
                }
              >
                <ArrowLeft size={18} />

                <span>
                  Back to Dashboard
                </span>
              </button>

              <div className="page-title">
                <div className="page-title-icon">
                  <TrendingUp size={27} />
                </div>

                <div>
                  <h1>Results</h1>

                  <p>
                    View your examination
                    results and academic
                    performance
                  </p>
                </div>
              </div>
            </div>

            <button
              className="refresh-button"
              onClick={() =>
                loadResults(true)
              }
              disabled={refreshing}
              title="Refresh results"
            >
              <RefreshCw
                size={18}
                className={
                  refreshing
                    ? "spin-animation"
                    : ""
                }
              />

              <span>
                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </span>
            </button>
          </div>

          {/* ERROR */}
          {error && (
            <div className="error-alert">
              <CircleAlert size={20} />

              <div>
                <strong>
                  Unable to load results
                </strong>

                <p>{error}</p>
              </div>

              <button
                onClick={() =>
                  loadResults()
                }
              >
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
                  Total Results
                </span>

                <strong>
                  {stats.total}
                </strong>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon passed-icon">
                <CheckCircle2 size={21} />
              </div>

              <div>
                <span className="summary-label">
                  Passed
                </span>

                <strong>
                  {stats.passed}
                </strong>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon failed-icon">
                <CircleAlert size={21} />
              </div>

              <div>
                <span className="summary-label">
                  Failed
                </span>

                <strong>
                  {stats.failed}
                </strong>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon average-icon">
                <Award size={21} />
              </div>

              <div>
                <span className="summary-label">
                  Average %
                </span>

                <strong>
                  {stats.average === null
                    ? "--"
                    : `${stats.average.toFixed(
                        1
                      )}%`}
                </strong>
              </div>
            </div>
          </div>

          {/* ACADEMIC PERFORMANCE */}
          {results.length > 0 && (
            <div className="performance-banner">
              <div className="performance-banner-icon">
                <TrendingUp size={22} />
              </div>

              <div className="performance-banner-content">
                <span>
                  Academic Performance
                </span>

                <strong>
                  {stats.average === null
                    ? "Marks not available"
                    : `${stats.average.toFixed(
                        1
                      )}% average performance`}
                </strong>
              </div>

              {stats.averageGradePoint !==
                null && (
                <div className="cgpa-box">
                  <span>
                    Avg. Grade Point
                  </span>

                  <strong>
                    {stats.averageGradePoint.toFixed(
                      2
                    )}
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* FILTERS */}
          <div className="filter-card">
            <div className="search-wrapper">
              <Search size={18} />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search course, exam or grade..."
              />

              {search && (
                <button
                  className="clear-search"
                  onClick={() =>
                    setSearch("")
                  }
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="filter-group">
              <label>
                Grade
              </label>

              <select
                value={gradeFilter}
                onChange={(event) =>
                  setGradeFilter(
                    event.target.value
                  )
                }
              >
                {gradeOptions.map(
                  (grade) => (
                    <option
                      key={grade}
                      value={grade}
                    >
                      {grade === "ALL"
                        ? "All Grades"
                        : grade}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* RESULT COUNT */}
          <div className="results-heading">
            <div>
              <h2>
                Your Results
              </h2>

              <span>
                {filteredResults.length}{" "}
                {filteredResults.length ===
                1
                  ? "result"
                  : "results"}{" "}
                found
              </span>
            </div>
          </div>

          {/* EMPTY */}
          {filteredResults.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Award size={34} />
              </div>

              <h3>
                {results.length === 0
                  ? "No results available"
                  : "No matching results"}
              </h3>

              <p>
                {results.length === 0
                  ? "Your examination results will appear here once they are published."
                  : "Try changing your search or grade filter."}
              </p>

              {(search ||
                gradeFilter !==
                  "ALL") && (
                <button
                  className="reset-button"
                  onClick={() => {
                    setSearch("");
                    setGradeFilter(
                      "ALL"
                    );
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="result-list">
              {filteredResults.map(
                (result) => {
                  const percentage =
                    getPercentage(
                      result
                    );

                  const performanceClass =
                    getPerformanceClass(
                      percentage
                    );

                  const grade =
                    getResultGrade(
                      result
                    );

                  return (
                    <div
                      className="result-card"
                      key={
                        result.id
                      }
                      onClick={() =>
                        setSelectedResult(
                          result
                        )
                      }
                    >
                      {/* DATE */}
                      <div className="result-date-box">
                        <span>
                          {formatMonth(
                            result
                          )}
                        </span>

                        <strong>
                          {formatDay(
                            result
                          )}
                        </strong>
                      </div>

                      {/* MAIN */}
                      <div className="result-main">
                        <div className="result-top-row">
                          <div>
                            <div className="result-title-row">
                              <h3>
                                {getCourseName(
                                  result
                                )}
                              </h3>

                              <span className="exam-type">
                                {getExamType(
                                  result
                                )}
                              </span>
                            </div>

                            <div className="course-info">
                              <BookOpen
                                size={16}
                              />

                              <strong>
                                {getCourseCode(
                                  result
                                )}
                              </strong>

                              {result
                                ?.course
                                ?.credits !==
                                undefined &&
                                result
                                  ?.course
                                  ?.credits !==
                                  null && (
                                  <span className="credits">
                                    {
                                      result
                                        .course
                                        .credits
                                    }{" "}
                                    credits
                                  </span>
                                )}
                            </div>
                          </div>

                          <div
                            className={`grade-badge ${performanceClass}`}
                          >
                            <Award
                              size={15}
                            />

                            {grade}
                          </div>
                        </div>

                        <div className="result-details-row">
                          <div className="detail-item">
                            <FileText
                              size={16}
                            />

                            <span>
                              {
                                getExamTitle(
                                  result
                                )
                              }
                            </span>
                          </div>

                          <div className="detail-item">
                            <CalendarDays
                              size={16}
                            />

                            <span>
                              {formatDate(
                                result
                              )}
                            </span>
                          </div>

                          <div className="detail-item">
                            <Award
                              size={16}
                            />

                            <span>
                              Marks:{" "}
                              {getMarks(
                                result
                              ) ?? "--"}{" "}
                              /{" "}
                              {getMaxMarks(
                                result
                              ) ?? "--"}
                            </span>
                          </div>

                          {result
                            ?.gradePoint !==
                            undefined &&
                            result
                              ?.gradePoint !==
                              null && (
                              <div className="detail-item">
                                <TrendingUp
                                  size={16}
                                />

                                <span>
                                  GP:{" "}
                                  {
                                    result.gradePoint
                                  }
                                </span>
                              </div>
                            )}
                        </div>

                        <div className="result-bottom-row">
                          {percentage !==
                            null ? (
                            <div className="percentage-section">
                              <div className="percentage-label">
                                <span>
                                  Percentage
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
                                  className={`progress-fill ${performanceClass}`}
                                  style={{
                                    width: `${percentage}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="percentage-unavailable">
                              Marks percentage not
                              available
                            </span>
                          )}

                          <span className="view-result">
                            View Details →
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* DETAILS MODAL */}
        {selectedResult && (
          <div
            className="modal-overlay"
            onClick={() =>
              setSelectedResult(null)
            }
          >
            <div
              className="result-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="modal-header">
                <div>
                  <span className="modal-eyebrow">
                    {getExamType(
                      selectedResult
                    )}
                  </span>

                  <h2>
                    {getCourseName(
                      selectedResult
                    )}
                  </h2>
                </div>

                <button
                  className="modal-close"
                  onClick={() =>
                    setSelectedResult(
                      null
                    )
                  }
                  aria-label="Close"
                >
                  <X size={21} />
                </button>
              </div>

              <div className="modal-body">
                {/* COURSE */}
                <div className="modal-course-card">
                  <div className="modal-course-icon">
                    <BookOpen size={22} />
                  </div>

                  <div>
                    <span>
                      {getCourseCode(
                        selectedResult
                      )}
                    </span>

                    <strong>
                      {getCourseName(
                        selectedResult
                      )}
                    </strong>
                  </div>
                </div>

                {/* INFORMATION */}
                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <FileText
                      size={19}
                    />

                    <div>
                      <span>
                        Examination
                      </span>

                      <strong>
                        {getExamTitle(
                          selectedResult
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="modal-info-item">
                    <CalendarDays
                      size={19}
                    />

                    <div>
                      <span>
                        Exam Date
                      </span>

                      <strong>
                        {formatDate(
                          selectedResult
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="modal-info-item">
                    <Award size={19} />

                    <div>
                      <span>
                        Maximum Marks
                      </span>

                      <strong>
                        {getMaxMarks(
                          selectedResult
                        ) ?? "N/A"}
                      </strong>
                    </div>
                  </div>

                  <div className="modal-info-item">
                    <BookOpen
                      size={19}
                    />

                    <div>
                      <span>
                        Credits
                      </span>

                      <strong>
                        {selectedResult
                          ?.course
                          ?.credits ??
                          "N/A"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* RESULT */}
                <div className="result-detail-card">
                  <div className="result-detail-header">
                    <div>
                      <span className="section-label">
                        Examination Result
                      </span>

                      <h3>
                        Your Performance
                      </h3>
                    </div>

                    <div className="result-icon-large">
                      <Award size={23} />
                    </div>
                  </div>

                  <div className="result-detail-grid">
                    <div>
                      <span>
                        Marks Obtained
                      </span>

                      <strong>
                        {getMarks(
                          selectedResult
                        ) ?? "--"}{" "}
                        /{" "}
                        {getMaxMarks(
                          selectedResult
                        ) ?? "--"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Grade
                      </span>

                      <strong>
                        {getResultGrade(
                          selectedResult
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Grade Point
                      </span>

                      <strong>
                        {selectedResult
                          ?.gradePoint ??
                          "--"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Percentage
                      </span>

                      <strong>
                        {(() => {
                          const percentage =
                            getPercentage(
                              selectedResult
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
                      getPercentage(
                        selectedResult
                      );

                    if (
                      percentage === null
                    ) {
                      return null;
                    }

                    const performanceClass =
                      getPerformanceClass(
                        percentage
                      );

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
                            className={`progress-fill ${performanceClass}`}
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="modal-done-button"
                  onClick={() =>
                    setSelectedResult(
                      null
                    )
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

// ============================================================
// STYLES
// ============================================================

const resultStyles = `
  * {
    box-sizing: border-box;
  }

  .result-page {
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

  .result-container {
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

  .passed-icon {
    background: #eafaf2;
    color: #15945b;
  }

  .failed-icon {
    background: #fff0ed;
    color: #c43e29;
  }

  .average-icon {
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

  .performance-banner {
    display: flex;
    align-items: center;
    gap: 13px;
    background: white;
    border: 1px solid #dcefe4;
    border-radius: 16px;
    padding: 16px 18px;
    margin-bottom: 20px;
    box-shadow: 0 5px 18px rgba(20, 36, 70, 0.04);
  }

  .performance-banner-icon {
    width: 45px;
    height: 45px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e9f8f0;
    color: #128052;
    flex-shrink: 0;
  }

  .performance-banner-content {
    flex: 1;
  }

  .performance-banner-content span {
    display: block;
    color: #7b8a80;
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 3px;
  }

  .performance-banner-content strong {
    color: #205f43;
    font-size: 15px;
  }

  .cgpa-box {
    text-align: right;
    padding-left: 20px;
    border-left: 1px solid #e1ebe5;
  }

  .cgpa-box span {
    display: block;
    color: #7b8a80;
    font-size: 10px;
    margin-bottom: 3px;
  }

  .cgpa-box strong {
    color: #128052;
    font-size: 20px;
  }

  .filter-card {
    display: grid;
    grid-template-columns: minmax(250px, 1fr) 190px;
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

  .result-list {
    display: flex;
    flex-direction: column;
    gap: 13px;
  }

  .result-card {
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

  .result-card:hover {
    transform: translateY(-2px);
    border-color: #cddafa;
    box-shadow: 0 12px 28px rgba(20, 36, 70, 0.08);
  }

  .result-date-box {
    width: 82px;
    min-width: 82px;
    background: #f0f5ff;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    border-right: 1px solid #e3eaf8;
  }

  .result-date-box span {
    color: #1769ff;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .result-date-box strong {
    color: #172033;
    font-size: 27px;
    line-height: 1.15;
    margin-top: 2px;
  }

  .result-main {
    flex: 1;
    min-width: 0;
    padding: 17px 19px;
  }

  .result-top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 15px;
  }

  .result-title-row {
    display: flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
  }

  .result-title-row h3 {
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

  .grade-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 20px;
    padding: 7px 11px;
    font-size: 12px;
    font-weight: 900;
    white-space: nowrap;
    background: #e9f8f0;
    color: #128052;
  }

  .grade-badge.performance-average {
    background: #fff7df;
    color: #a36d00;
  }

  .grade-badge.performance-low {
    background: #fff0ed;
    color: #c43e29;
  }

  .result-details-row {
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

  .result-bottom-row {
    min-height: 38px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    margin-top: 13px;
  }

  .percentage-section {
    flex: 1;
    max-width: 500px;
  }

  .percentage-label {
    display: flex;
    justify-content: space-between;
    color: #718073;
    font-size: 11px;
    margin-bottom: 6px;
  }

  .percentage-label strong {
    color: #205f43;
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

  .percentage-unavailable {
    color: #8a95a7;
    font-size: 12px;
  }

  .view-result {
    color: #1769ff;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
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

  .result-loading {
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

  .result-loading h3 {
    margin: 0 0 6px;
    color: #243148;
  }

  .result-loading p {
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

  .result-modal {
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

  .result-detail-card {
    margin-top: 20px;
    padding: 17px;
    border-radius: 14px;
    border: 1px solid #dcefe4;
    background: #f7fcf9;
  }

  .result-detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }

  .result-detail-header h3 {
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

  .result-detail-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 9px;
  }

  .result-detail-grid > div {
    background: white;
    border: 1px solid #e3eee7;
    border-radius: 9px;
    padding: 11px;
  }

  .result-detail-grid span {
    display: block;
    color: #849184;
    font-size: 10px;
    margin-bottom: 4px;
  }

  .result-detail-grid strong {
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
  }

  @media (max-width: 700px) {
    .result-page {
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

    .performance-banner {
      align-items: flex-start;
    }

    .cgpa-box {
      padding-left: 10px;
    }

    .filter-card {
      grid-template-columns: 1fr;
    }

    .result-card {
      flex-direction: column;
    }

    .result-date-box {
      width: 100%;
      min-width: 0;
      height: 56px;
      flex-direction: row;
      gap: 7px;
      border-right: none;
      border-bottom: 1px solid #e3eaf8;
    }

    .result-date-box strong {
      font-size: 23px;
    }

    .result-top-row {
      flex-direction: column;
    }

    .result-details-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 9px;
    }

    .result-bottom-row {
      align-items: flex-start;
      flex-direction: column;
    }

    .percentage-section {
      width: 100%;
      max-width: none;
    }

    .modal-info-grid {
      grid-template-columns: 1fr;
    }

    .result-detail-grid {
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

    .result-main {
      padding: 15px;
    }

    .performance-banner {
      flex-wrap: wrap;
    }

    .cgpa-box {
      width: 100%;
      padding: 10px 0 0;
      border-left: none;
      border-top: 1px solid #e1ebe5;
      text-align: left;
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

    .result-detail-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
`;

export default Results;