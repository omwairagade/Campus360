import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  CalendarDays,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiGet, logoutUser } from "../api";

const Attendance = () => {
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    totalClasses: 0,
    attendedClasses: 0,
    absentClasses: 0,
    attendancePercentage: 0,
  });

  const [studentGroup, setStudentGroup] = useState({
    semester: null,
    batch: null,
    division: null,
  });

  const [records, setRecords] = useState([]);
  const [courseAttendance, setCourseAttendance] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const handleAuthError = (message = "") => {
    const text = String(message).toLowerCase();

    if (
      text.includes("token") ||
      text.includes("authentication") ||
      text.includes("unauthorized") ||
      text.includes("forbidden")
    ) {
      logoutUser();
      navigate("/");
      return true;
    }

    return false;
  };

  const loadAttendance = async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [overallResponse, courseResponse] = await Promise.all([
        apiGet("/attendance/my"),
        apiGet("/attendance/my/courses"),
      ]);

      const overall = overallResponse?.data || overallResponse || {};
      const courseData =
        courseResponse?.data || courseResponse || {};

      if (overall?.success === false) {
        throw new Error(
          overall.message || "Failed to load attendance"
        );
      }

      if (courseData?.success === false) {
        throw new Error(
          courseData.message ||
            "Failed to load course attendance"
        );
      }

      const attendanceSummary = overall?.summary || {};

      setSummary({
        totalClasses: Number(attendanceSummary.totalClasses) || 0,
        attendedClasses:
          Number(attendanceSummary.attendedClasses) || 0,
        absentClasses:
          Number(attendanceSummary.absentClasses) || 0,
        attendancePercentage:
          Number(attendanceSummary.attendancePercentage) || 0,
      });

      setStudentGroup({
        semester:
          overall?.studentGroup?.semester ??
          courseData?.studentGroup?.semester ??
          null,

        batch:
          overall?.studentGroup?.batch ??
          courseData?.studentGroup?.batch ??
          null,

        division:
          overall?.studentGroup?.division ??
          courseData?.studentGroup?.division ??
          null,
      });

      setRecords(
        Array.isArray(overall?.records)
          ? overall.records
          : []
      );

      setCourseAttendance(
        Array.isArray(courseData?.courses)
          ? courseData.courses
          : []
      );
    } catch (err) {
      console.error("Load attendance error:", err);

      const message =
        err?.message || "Failed to load attendance";

      if (!handleAuthError(message)) {
        setError(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const getAttendanceStatus = (percentage) => {
    const value = Number(percentage) || 0;

    if (value >= 75) {
      return {
        label: "Good",
        className: "good",
        icon: CheckCircle2,
      };
    }

    if (value >= 65) {
      return {
        label: "Warning",
        className: "warning",
        icon: AlertTriangle,
      };
    }

    return {
      label: "Low",
      className: "low",
      icon: XCircle,
    };
  };

  const overallStatus = getAttendanceStatus(
    summary.attendancePercentage
  );

  const OverallStatusIcon = overallStatus.icon;

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return courseAttendance.filter((item) => {
      const course = item?.course || {};

      const searchableText = [
        course.code,
        course.name,
        course.credits,
      ]
        .filter(
          (value) =>
            value !== undefined &&
            value !== null
        )
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const percentage =
        Number(item?.percentage) || 0;

      let matchesStatus = true;

      if (statusFilter === "GOOD") {
        matchesStatus = percentage >= 75;
      }

      if (statusFilter === "WARNING") {
        matchesStatus =
          percentage >= 65 && percentage < 75;
      }

      if (statusFilter === "LOW") {
        matchesStatus = percentage < 65;
      }

      return matchesSearch && matchesStatus;
    });
  }, [courseAttendance, search, statusFilter]);

  const recentRecords = records.slice(0, 12);

  const getRecordStatus = (status) => {
    const normalized =
      String(status || "").toUpperCase();

    if (normalized === "PRESENT") {
      return {
        label: "Present",
        className: "present",
        icon: CheckCircle2,
      };
    }

    if (normalized === "ABSENT") {
      return {
        label: "Absent",
        className: "absent",
        icon: XCircle,
      };
    }

    if (normalized === "LATE") {
      return {
        label: "Late",
        className: "late",
        icon: Clock3,
      };
    }

    return {
      label: normalized || "Unknown",
      className: "unknown",
      icon: CalendarDays,
    };
  };

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "—";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getProgressClass = (percentage) => {
    const value = Number(percentage) || 0;

    if (value >= 75) {
      return "progress-good";
    }

    if (value >= 65) {
      return "progress-warning";
    }

    return "progress-low";
  };

  const attendanceProgress = Math.min(
    Math.max(
      Number(summary.attendancePercentage) || 0,
      0
    ),
    100
  );

  if (loading) {
    return (
      <div className="attendance-page">
        <div className="attendance-loading">
          <div className="loading-spinner">
            <RefreshCw size={28} />
          </div>

          <h2>Loading Attendance</h2>

          <p>
            Fetching your attendance records...
          </p>
        </div>

        <style>{attendanceStyles}</style>
      </div>
    );
  }

  return (
    <div className="attendance-page">
      <div className="attendance-container">
        {/* Header */}
        <div className="page-header">
          <button
            className="back-button"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={18} />
            <span>Back to Dashboard</span>
          </button>

          <button
            className="refresh-button"
            onClick={() => loadAttendance(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={refreshing ? "spin" : ""}
            />

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Title */}
        <div className="page-title">
          <div>
            <div className="title-icon">
              <CalendarDays size={26} />
            </div>

            <div>
              <h1>Attendance</h1>

              <p>
                Track your attendance across all
                enrolled courses.
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="error-alert">
            <AlertTriangle size={20} />

            <div>
              <strong>
                Unable to load attendance
              </strong>

              <p>{error}</p>
            </div>

            <button
              onClick={() => loadAttendance(true)}
            >
              Retry
            </button>
          </div>
        )}

        {/* Student Group */}
        <div className="group-card">
          <div className="group-card-icon">
            <GraduationCap size={21} />
          </div>

          <div className="group-info">
            <span className="group-label">
              Academic Group
            </span>

            <div className="group-values">
              <div>
                <small>Semester</small>

                <strong>
                  {studentGroup.semester ?? "—"}
                </strong>
              </div>

              <div>
                <small>Batch</small>

                <strong>
                  {studentGroup.batch ?? "—"}
                </strong>
              </div>

              <div>
                <small>Division</small>

                <strong>
                  {studentGroup.division ?? "—"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-grid">
          <div className="summary-card primary">
            <div className="summary-icon">
              <TrendingUp size={23} />
            </div>

            <div className="summary-content">
              <span>Overall Attendance</span>

              <strong>
                {summary.attendancePercentage.toFixed(1)}%
              </strong>

              <small
                className={`summary-status ${overallStatus.className}`}
              >
                {overallStatus.label}
              </small>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon blue">
              <CalendarDays size={23} />
            </div>

            <div className="summary-content">
              <span>Total Classes</span>

              <strong>{summary.totalClasses}</strong>

              <small>Classes recorded</small>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon green">
              <CheckCircle2 size={23} />
            </div>

            <div className="summary-content">
              <span>Attended</span>

              <strong>{summary.attendedClasses}</strong>

              <small>Present + Late</small>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon red">
              <XCircle size={23} />
            </div>

            <div className="summary-content">
              <span>Absent</span>

              <strong>{summary.absentClasses}</strong>

              <small>Missed classes</small>
            </div>
          </div>
        </div>

        {/* Attendance Overview */}
        <section className="overview-card">
          <div className="section-header">
            <div>
              <h2>Attendance Overview</h2>

              <p>
                Your overall attendance performance
              </p>
            </div>

            <div
              className={`overview-badge ${overallStatus.className}`}
            >
              <OverallStatusIcon size={17} />
              {overallStatus.label}
            </div>
          </div>

          <div className="overview-content">
            <div
              className="percentage-circle"
              style={{
                "--attendance-progress": `${attendanceProgress}%`,
              }}
            >
              <div>
                <strong>
                  {summary.attendancePercentage.toFixed(1)}%
                </strong>

                <span>Attendance</span>
              </div>
            </div>

            <div className="overview-details">
              <div className="detail-row">
                <span>
                  <span className="dot green-dot" />
                  Attended Classes
                </span>

                <strong>
                  {summary.attendedClasses}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  <span className="dot red-dot" />
                  Absent Classes
                </span>

                <strong>
                  {summary.absentClasses}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  <span className="dot blue-dot" />
                  Total Classes
                </span>

                <strong>
                  {summary.totalClasses}
                </strong>
              </div>

              <div className="overview-progress">
                <div className="progress-label">
                  <span>
                    Attendance Progress
                  </span>

                  <strong>
                    {summary.attendancePercentage.toFixed(1)}%
                  </strong>
                </div>

                <div className="progress-track large">
                  <div
                    className={`progress-fill ${getProgressClass(
                      summary.attendancePercentage
                    )}`}
                    style={{
                      width: `${attendanceProgress}%`,
                    }}
                  />
                </div>

                <small>
                  Recommended minimum: 75%
                </small>
              </div>
            </div>
          </div>
        </section>

        {/* Course Attendance */}
        <section className="courses-section">
          <div className="section-header course-header">
            <div>
              <h2>Course-wise Attendance</h2>

              <p>
                Attendance performance for each
                enrolled course
              </p>
            </div>

            <div className="course-count">
              {filteredCourses.length}{" "}
              course
              {filteredCourses.length !== 1
                ? "s"
                : ""}
            </div>
          </div>

          <div className="filters">
            <div className="search-box">
              <Search size={18} />

              <input
                type="text"
                placeholder="Search course by name or code..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="ALL">
                All Courses
              </option>

              <option value="GOOD">
                75% and above
              </option>

              <option value="WARNING">
                65% - 74%
              </option>

              <option value="LOW">
                Below 65%
              </option>
            </select>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={42} />

              <h3>No attendance records</h3>

              <p>
                No course attendance matches
                your current filters.
              </p>

              {(search ||
                statusFilter !== "ALL") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="course-attendance-grid">
              {filteredCourses.map(
                (item, index) => {
                  const course =
                    item?.course || {};

                  const percentage =
                    Number(item?.percentage) || 0;

                  const status =
                    getAttendanceStatus(
                      percentage
                    );

                  const StatusIcon =
                    status.icon;

                  const courseProgress =
                    Math.min(
                      Math.max(
                        percentage,
                        0
                      ),
                      100
                    );

                  return (
                    <div
                      className="course-attendance-card"
                      key={
                        course.id ||
                        course.code ||
                        index
                      }
                    >
                      <div className="course-card-top">
                        <div className="course-icon">
                          <BookOpen size={21} />
                        </div>

                        <div className="course-heading">
                          <span>
                            {course.code ||
                              "COURSE"}
                          </span>

                          <h3>
                            {course.name ||
                              "Unknown Course"}
                          </h3>
                        </div>

                        <div
                          className={`course-status ${status.className}`}
                        >
                          <StatusIcon size={15} />
                          {status.label}
                        </div>
                      </div>

                      <div className="course-stats">
                        <div>
                          <span>
                            Total Classes
                          </span>

                          <strong>
                            {Number(
                              item?.totalClasses
                            ) || 0}
                          </strong>
                        </div>

                        <div>
                          <span>Attended</span>

                          <strong>
                            {Number(
                              item?.attendedClasses
                            ) || 0}
                          </strong>
                        </div>

                        <div>
                          <span>Credits</span>

                          <strong>
                            {course.credits ?? "—"}
                          </strong>
                        </div>
                      </div>

                      <div className="course-progress-section">
                        <div className="course-progress-label">
                          <span>Attendance</span>

                          <strong>
                            {percentage.toFixed(1)}%
                          </strong>
                        </div>

                        <div className="progress-track">
                          <div
                            className={`progress-fill ${getProgressClass(
                              percentage
                            )}`}
                            style={{
                              width: `${courseProgress}%`,
                            }}
                          />
                        </div>
                      </div>

                      {percentage < 75 && (
                        <div className="course-warning">
                          <AlertTriangle size={15} />

                          Attendance is below
                          the recommended 75%.
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* Recent Attendance */}
        <section className="recent-section">
          <div className="section-header">
            <div>
              <h2>Recent Attendance</h2>

              <p>
                Your latest attendance records
              </p>
            </div>

            <div className="record-count">
              {recentRecords.length} records
            </div>
          </div>

          {recentRecords.length === 0 ? (
            <div className="empty-state compact">
              <CalendarDays size={36} />

              <h3>No attendance records</h3>

              <p>
                Attendance records will appear
                here once they are available.
              </p>
            </div>
          ) : (
            <div className="attendance-table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Course</th>
                    <th>Code</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {recentRecords.map(
                    (record, index) => {
                      const status =
                        getRecordStatus(
                          record?.status
                        );

                      const StatusIcon =
                        status.icon;

                      return (
                        <tr
                          key={
                            record?.id ||
                            index
                          }
                        >
                          <td>
                            <div className="date-cell">
                              <CalendarDays
                                size={16}
                              />

                              {formatDate(
                                record?.date
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="table-course">
                              <strong>
                                {record?.course?.name ||
                                  "Unknown Course"}
                              </strong>

                              <span>
                                {record?.course
                                  ?.credits !==
                                undefined
                                  ? `${record.course.credits} credits`
                                  : ""}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span className="course-code">
                              {record?.course?.code ||
                                "—"}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`record-status ${status.className}`}
                            >
                              <StatusIcon size={15} />
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Attendance Information */}
        <section className="tips-card">
          <div className="tips-icon">
            <Users size={22} />
          </div>

          <div>
            <h3>Attendance Information</h3>

            <p>
              Present and Late classes are counted
              as attended. Keep your attendance at
              or above 75% to stay within the
              recommended range.
            </p>
          </div>
        </section>
      </div>

      <style>{attendanceStyles}</style>
    </div>
  );
};

const attendanceStyles = `
  * {
    box-sizing: border-box;
  }

  .attendance-page {
    min-height: 100vh;
    background:
      linear-gradient(
        180deg,
        #f8fbff 0%,
        #f3f6fb 100%
      );
    color: #172033;
    padding: 28px;
  }

  .attendance-container {
    max-width: 1400px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 24px;
  }

  .back-button,
  .refresh-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 10px;
    padding: 10px 15px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s ease;
  }

  .back-button {
    background: #ffffff;
    color: #344054;
    border: 1px solid #e4e7ec;
  }

  .back-button:hover {
    background: #f9fafb;
    transform: translateX(-2px);
  }

  .refresh-button {
    background: #1769ff;
    color: #ffffff;
    box-shadow:
      0 5px 15px rgba(
        23,
        105,
        255,
        0.18
      );
  }

  .refresh-button:hover {
    background: #0f5be0;
  }

  .refresh-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .spin {
    animation: spin 0.9s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .page-title {
    margin-bottom: 24px;
  }

  .page-title > div {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .title-icon {
    width: 54px;
    height: 54px;
    border-radius: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eaf2ff;
    color: #1769ff;
  }

  .page-title h1 {
    margin: 0 0 5px;
    font-size: 30px;
    line-height: 1.2;
    letter-spacing: -0.5px;
  }

  .page-title p {
    margin: 0;
    color: #667085;
    font-size: 14px;
  }

  .error-alert {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 15px 17px;
    border-radius: 13px;
    background: #fff4f2;
    border: 1px solid #fecdca;
    color: #b42318;
    margin-bottom: 22px;
  }

  .error-alert > div {
    flex: 1;
  }

  .error-alert strong {
    display: block;
    margin-bottom: 3px;
  }

  .error-alert p {
    margin: 0;
    font-size: 13px;
  }

  .error-alert button {
    border: 0;
    background: #b42318;
    color: white;
    border-radius: 8px;
    padding: 8px 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .group-card {
    display: flex;
    align-items: center;
    gap: 15px;
    background: white;
    border: 1px solid #e9edf5;
    border-radius: 16px;
    padding: 18px 20px;
    margin-bottom: 20px;
    box-shadow:
      0 5px 20px rgba(
        16,
        24,
        40,
        0.04
      );
  }

  .group-card-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f5ff;
    color: #1769ff;
    flex-shrink: 0;
  }

  .group-info {
    flex: 1;
  }

  .group-label {
    display: block;
    color: #667085;
    font-size: 12px;
    margin-bottom: 7px;
  }

  .group-values {
    display: flex;
    align-items: center;
    gap: 35px;
  }

  .group-values div {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .group-values small {
    color: #667085;
    font-size: 12px;
  }

  .group-values strong {
    color: #1d2939;
    font-size: 14px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 17px;
    margin-bottom: 22px;
  }

  .summary-card {
    background: #ffffff;
    border: 1px solid #e9edf5;
    border-radius: 16px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 15px;
    box-shadow:
      0 5px 20px rgba(
        16,
        24,
        40,
        0.04
      );
  }

  .summary-card.primary {
    border-color: #d9e6ff;
    background:
      linear-gradient(
        135deg,
        #ffffff,
        #f5f8ff
      );
  }

  .summary-icon {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    background: #eef3ff;
    color: #1769ff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .summary-icon.blue {
    background: #eff8ff;
    color: #1570ef;
  }

  .summary-icon.green {
    background: #ecfdf3;
    color: #039855;
  }

  .summary-icon.red {
    background: #fff1f3;
    color: #d92d20;
  }

  .summary-content {
    min-width: 0;
  }

  .summary-content span {
    display: block;
    color: #667085;
    font-size: 12px;
    margin-bottom: 4px;
  }

  .summary-content strong {
    display: inline-block;
    color: #101828;
    font-size: 25px;
    margin-right: 8px;
  }

  .summary-content small {
    display: block;
    color: #98a2b3;
    font-size: 11px;
    margin-top: 3px;
  }

  .summary-status {
    font-weight: 700;
  }

  .summary-status.good {
    color: #039855;
  }

  .summary-status.warning {
    color: #dc6803;
  }

  .summary-status.low {
    color: #d92d20;
  }

  .overview-card,
  .courses-section,
  .recent-section {
    background: white;
    border: 1px solid #e9edf5;
    border-radius: 18px;
    padding: 23px;
    margin-bottom: 22px;
    box-shadow:
      0 5px 22px rgba(
        16,
        24,
        40,
        0.04
      );
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 22px;
  }

  .section-header h2 {
    margin: 0 0 5px;
    color: #101828;
    font-size: 19px;
  }

  .section-header p {
    margin: 0;
    color: #667085;
    font-size: 13px;
  }

  .overview-badge,
  .course-status,
  .record-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
  }

  .overview-badge {
    padding: 8px 12px;
  }

  .good {
    color: #027a48;
    background: #ecfdf3;
  }

  .warning {
    color: #b54708;
    background: #fffaeb;
  }

  .low {
    color: #b42318;
    background: #fff1f3;
  }

  .overview-content {
    display: grid;
    grid-template-columns:
      240px 1fr;
    gap: 45px;
    align-items: center;
  }

  .percentage-circle {
    width: 190px;
    height: 190px;
    border-radius: 50%;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      conic-gradient(
        #1769ff var(--attendance-progress, 0%),
        #eaf0f8 0
      );
    position: relative;
  }

  .percentage-circle::before {
    content: "";
    position: absolute;
    inset: 14px;
    border-radius: 50%;
    background: white;
  }

  .percentage-circle > div {
    position: relative;
    z-index: 1;
    text-align: center;
  }

  .percentage-circle strong {
    display: block;
    font-size: 32px;
    color: #101828;
  }

  .percentage-circle span {
    color: #667085;
    font-size: 12px;
  }

  .overview-details {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid #f0f2f5;
  }

  .detail-row span {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #475467;
    font-size: 13px;
  }

  .detail-row strong {
    color: #101828;
    font-size: 14px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .green-dot {
    background: #12b76a;
  }

  .red-dot {
    background: #f04438;
  }

  .blue-dot {
    background: #1769ff;
  }

  .overview-progress {
    margin-top: 4px;
  }

  .progress-label,
  .course-progress-label {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 7px;
    color: #475467;
    font-size: 12px;
  }

  .progress-label strong,
  .course-progress-label strong {
    color: #101828;
  }

  .progress-track {
    height: 8px;
    width: 100%;
    background: #eef2f6;
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-track.large {
    height: 10px;
  }

  .progress-fill {
    height: 100%;
    border-radius: inherit;
    transition: width 0.35s ease;
  }

  .progress-good {
    background: #12b76a;
  }

  .progress-warning {
    background: #f79009;
  }

  .progress-low {
    background: #f04438;
  }

  .overview-progress small {
    display: block;
    color: #98a2b3;
    margin-top: 7px;
    font-size: 11px;
  }

  .course-header {
    margin-bottom: 18px;
  }

  .course-count,
  .record-count {
    padding: 7px 11px;
    border-radius: 8px;
    background: #f2f4f7;
    color: #475467;
    font-size: 12px;
    font-weight: 600;
  }

  .filters {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .search-box {
    flex: 1;
    min-width: 0;
    height: 43px;
    border: 1px solid #d0d5dd;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 13px;
    color: #98a2b3;
    background: white;
  }

  .search-box:focus-within {
    border-color: #1769ff;
    box-shadow:
      0 0 0 3px rgba(
        23,
        105,
        255,
        0.08
      );
  }

  .search-box input {
    border: 0;
    outline: 0;
    width: 100%;
    font-size: 13px;
    color: #101828;
    background: transparent;
  }

  .filters select {
    height: 43px;
    border: 1px solid #d0d5dd;
    border-radius: 10px;
    padding: 0 12px;
    background: white;
    color: #344054;
    outline: none;
    cursor: pointer;
  }

  .course-attendance-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .course-attendance-card {
    border: 1px solid #e7ebf2;
    border-radius: 15px;
    padding: 18px;
    background: #fff;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }

  .course-attendance-card:hover {
    transform: translateY(-2px);
    box-shadow:
      0 8px 25px rgba(
        16,
        24,
        40,
        0.07
      );
  }

  .course-card-top {
    display: flex;
    align-items: flex-start;
    gap: 11px;
  }

  .course-icon {
    width: 42px;
    height: 42px;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eef4ff;
    color: #1769ff;
    flex-shrink: 0;
  }

  .course-heading {
    flex: 1;
    min-width: 0;
  }

  .course-heading > span {
    display: block;
    color: #1769ff;
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 3px;
  }

  .course-heading h3 {
    margin: 0;
    color: #101828;
    font-size: 15px;
    line-height: 1.35;
  }

  .course-status {
    padding: 6px 9px;
    white-space: nowrap;
  }

  .course-stats {
    display: grid;
    grid-template-columns:
      repeat(3, 1fr);
    gap: 10px;
    margin: 19px 0;
  }

  .course-stats div {
    padding: 10px;
    background: #f8fafc;
    border-radius: 9px;
  }

  .course-stats span {
    display: block;
    color: #98a2b3;
    font-size: 10px;
    margin-bottom: 3px;
  }

  .course-stats strong {
    color: #344054;
    font-size: 15px;
  }

  .course-progress-section {
    margin-top: 3px;
  }

  .course-warning {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    padding: 8px 10px;
    border-radius: 8px;
    background: #fffaeb;
    color: #b54708;
    font-size: 11px;
  }

  .empty-state {
    text-align: center;
    padding: 55px 20px;
    color: #98a2b3;
  }

  .empty-state.compact {
    padding: 35px 20px;
  }

  .empty-state svg {
    margin-bottom: 10px;
  }

  .empty-state h3 {
    margin: 0 0 5px;
    color: #344054;
    font-size: 16px;
  }

  .empty-state p {
    margin: 0 0 15px;
    font-size: 13px;
  }

  .empty-state button {
    border: 0;
    border-radius: 8px;
    background: #1769ff;
    color: white;
    padding: 9px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .attendance-table-wrapper {
    width: 100%;
    overflow-x: auto;
  }

  .attendance-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 700px;
  }

  .attendance-table th {
    text-align: left;
    color: #667085;
    background: #f8fafc;
    padding: 12px 14px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .attendance-table td {
    padding: 14px;
    border-bottom: 1px solid #f0f2f5;
    color: #344054;
    font-size: 13px;
  }

  .date-cell {
    display: flex;
    align-items: center;
    gap: 7px;
    white-space: nowrap;
    color: #475467;
  }

  .table-course strong {
    display: block;
    color: #101828;
    font-size: 13px;
    margin-bottom: 3px;
  }

  .table-course span {
    color: #98a2b3;
    font-size: 11px;
  }

  .course-code {
    display: inline-block;
    padding: 5px 8px;
    border-radius: 6px;
    background: #f2f4f7;
    color: #475467;
    font-size: 11px;
    font-weight: 700;
  }

  .record-status {
    padding: 6px 9px;
  }

  .record-status.present {
    color: #027a48;
    background: #ecfdf3;
  }

  .record-status.absent {
    color: #b42318;
    background: #fff1f3;
  }

  .record-status.late {
    color: #b54708;
    background: #fffaeb;
  }

  .record-status.unknown {
    color: #475467;
    background: #f2f4f7;
  }

  .tips-card {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    padding: 18px 20px;
    border-radius: 15px;
    background: #eef6ff;
    border: 1px solid #d8eaff;
    margin-bottom: 25px;
  }

  .tips-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #dbeafe;
    color: #1769ff;
    flex-shrink: 0;
  }

  .tips-card h3 {
    margin: 2px 0 5px;
    color: #175cd3;
    font-size: 14px;
  }

  .tips-card p {
    margin: 0;
    color: #475467;
    font-size: 12px;
    line-height: 1.6;
  }

  .attendance-loading {
    min-height: 80vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .loading-spinner {
    width: 58px;
    height: 58px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eef4ff;
    color: #1769ff;
    margin-bottom: 15px;
    animation: pulse 1.3s ease-in-out infinite;
  }

  .attendance-loading h2 {
    margin: 0 0 6px;
    font-size: 20px;
    color: #101828;
  }

  .attendance-loading p {
    margin: 0;
    color: #667085;
    font-size: 13px;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }

    50% {
      transform: scale(0.94);
      opacity: 0.7;
    }
  }

  @media (max-width: 1100px) {
    .summary-grid {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .overview-content {
      grid-template-columns:
        190px 1fr;
      gap: 30px;
    }

    .percentage-circle {
      width: 165px;
      height: 165px;
    }
  }

  @media (max-width: 800px) {
    .attendance-page {
      padding: 18px;
    }

    .overview-content {
      grid-template-columns: 1fr;
    }

    .course-attendance-grid {
      grid-template-columns: 1fr;
    }

    .group-values {
      flex-wrap: wrap;
      gap: 15px 25px;
    }
  }

  @media (max-width: 600px) {
    .attendance-page {
      padding: 13px;
    }

    .page-header {
      margin-bottom: 18px;
    }

    .back-button,
    .refresh-button {
      padding: 9px 11px;
      font-size: 12px;
    }

    .back-button span {
      display: none;
    }

    .page-title h1 {
      font-size: 25px;
    }

    .page-title p {
      font-size: 12px;
    }

    .summary-grid {
      grid-template-columns: 1fr;
    }

    .group-card {
      align-items: flex-start;
    }

    .group-values {
      display: grid;
      grid-template-columns:
        repeat(3, 1fr);
      gap: 10px;
    }

    .group-values div {
      display: block;
    }

    .group-values small,
    .group-values strong {
      display: block;
    }

    .group-values strong {
      margin-top: 3px;
    }

    .overview-card,
    .courses-section,
    .recent-section {
      padding: 17px;
    }

    .section-header {
      align-items: flex-start;
    }

    .filters {
      flex-direction: column;
      align-items: stretch;
    }

    .filters select {
      width: 100%;
    }

    .course-card-top {
      flex-wrap: wrap;
    }

    .course-status {
      margin-left: 53px;
      margin-top: -4px;
    }

    .course-stats {
      gap: 6px;
    }

    .course-stats div {
      padding: 8px;
    }

    .course-stats span {
      font-size: 9px;
    }

    .course-stats strong {
      font-size: 13px;
    }

    .tips-card {
      padding: 15px;
    }
  }
`;

export default Attendance;