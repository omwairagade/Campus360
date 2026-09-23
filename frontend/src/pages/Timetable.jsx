import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  UserRound,
  BookOpen,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { apiGet, logoutUser } from "../api";

const DAYS = [
  { id: 1, short: "Mon", full: "Monday" },
  { id: 2, short: "Tue", full: "Tuesday" },
  { id: 3, short: "Wed", full: "Wednesday" },
  { id: 4, short: "Thu", full: "Thursday" },
  { id: 5, short: "Fri", full: "Friday" },
  { id: 6, short: "Sat", full: "Saturday" },
  { id: 7, short: "Sun", full: "Sunday" },
];

const CLASS_TYPE_STYLES = {
  Lecture: "lecture",
  Practical: "practical",
  Lab: "lab",
  Tutorial: "tutorial",
  Seminar: "seminar",
  Workshop: "workshop",
};

const getDayName = (dayOfWeek) => {
  const day = DAYS.find(
    (item) => Number(item.id) === Number(dayOfWeek)
  );

  return day?.full || "Unknown";
};

const getDayShortName = (dayOfWeek) => {
  const day = DAYS.find(
    (item) => Number(item.id) === Number(dayOfWeek)
  );

  return day?.short || "N/A";
};

const formatTime = (time) => {
  if (!time || typeof time !== "string") {
    return "--";
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return time;
  }

  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${String(minutes).padStart(
    2,
    "0"
  )} ${suffix}`;
};

const getMinutes = (time) => {
  if (!time || typeof time !== "string") {
    return 0;
  }

  const [hours, minutes] = time
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
};

const getCurrentDay = () => {
  const day = new Date().getDay();

  return day === 0 ? 7 : day;
};

const normalizeTimetable = (data) => {
  if (Array.isArray(data?.timetable)) {
    return data.timetable;
  }

  if (Array.isArray(data?.data?.timetable)) {
    return data.data.timetable;
  }

  if (Array.isArray(data)) {
    return data;
  }

  return [];
};

const normalizeStudent = (data) => {
  return (
    data?.student ||
    data?.data?.student ||
    null
  );
};

export default function Timetable() {
  const navigate = useNavigate();

  const [timetable, setTimetable] = useState([]);
  const [student, setStudent] = useState(null);

  const [selectedDay, setSelectedDay] =
    useState(getCurrentDay());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  const fetchTimetable = async (
    showRefresh = false
  ) => {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await apiGet(
        "/timetable/my-timetable"
      );

      const data = response?.data ?? response;

      setTimetable(
        normalizeTimetable(data)
      );

      setStudent(
        normalizeStudent(data)
      );
    } catch (err) {
      console.error(
        "Student timetable error:",
        err
      );

      const message =
        err?.message ||
        "Failed to load timetable.";

      const lowerMessage =
        message.toLowerCase();

      if (
        lowerMessage.includes("token") ||
        lowerMessage.includes("authentication") ||
        lowerMessage.includes("unauthorized") ||
        lowerMessage.includes("forbidden")
      ) {
        logoutUser();
        navigate("/");
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  const sortedTimetable = useMemo(() => {
    return [...timetable].sort((a, b) => {
      if (
        Number(a.dayOfWeek) !==
        Number(b.dayOfWeek)
      ) {
        return (
          Number(a.dayOfWeek) -
          Number(b.dayOfWeek)
        );
      }

      return (
        getMinutes(a.startTime) -
        getMinutes(b.startTime)
      );
    });
  }, [timetable]);

  const selectedDayEntries = useMemo(() => {
    return sortedTimetable.filter(
      (entry) =>
        Number(entry.dayOfWeek) ===
        Number(selectedDay)
    );
  }, [sortedTimetable, selectedDay]);

  const todayEntries = useMemo(() => {
    return sortedTimetable.filter(
      (entry) =>
        Number(entry.dayOfWeek) ===
        getCurrentDay()
    );
  }, [sortedTimetable]);

  const totalCourses = useMemo(() => {
    return new Set(
      timetable
        .map((entry) => entry.course?.id)
        .filter(Boolean)
    ).size;
  }, [timetable]);

  const totalFaculty = useMemo(() => {
    return new Set(
      timetable
        .map((entry) => entry.faculty?.id)
        .filter(Boolean)
    ).size;
  }, [timetable]);

  const selectedDayName = getDayName(
    selectedDay
  );

  const moveDay = (direction) => {
    setSelectedDay((current) => {
      let next = current + direction;

      if (next < 1) {
        next = 7;
      }

      if (next > 7) {
        next = 1;
      }

      return next;
    });
  };

  const handleToday = () => {
    setSelectedDay(getCurrentDay());
  };

  const getClassTypeClass = (classType) => {
    const normalized =
      String(classType || "Lecture")
        .trim();

    return (
      CLASS_TYPE_STYLES[normalized] ||
      "lecture"
    );
  };

  return (
    <div className="student-timetable-page">
      <div className="timetable-container">

        {/* =====================================================
            HEADER
        ====================================================== */}
        <header className="timetable-header">
          <div className="header-left">
            <button
              className="back-button"
              onClick={() =>
                navigate("/dashboard")
              }
            >
              <ArrowLeft size={18} />
              <span>Back to Dashboard</span>
            </button>

            <div className="page-title-wrapper">
              <div className="page-icon">
                <CalendarDays size={25} />
              </div>

              <div>
                <h1>My Timetable</h1>
                <p>
                  View your weekly class
                  schedule
                </p>
              </div>
            </div>
          </div>

          <button
            className="refresh-button"
            onClick={() =>
              fetchTimetable(true)
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "spinning"
                  : ""
              }
            />
            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </header>

        {/* =====================================================
            ERROR
        ====================================================== */}
        {error && (
          <div className="error-banner">
            <AlertCircle size={19} />

            <div>
              <strong>
                Unable to load timetable
              </strong>

              <p>{error}</p>
            </div>

            <button
              onClick={() =>
                fetchTimetable()
              }
            >
              Retry
            </button>
          </div>
        )}

        {/* =====================================================
            STUDENT INFO
        ====================================================== */}
        {!loading && student && (
          <section className="student-info-card">
            <div className="student-info-main">
              <div className="student-avatar">
                <GraduationCap
                  size={25}
                />
              </div>

              <div>
                <h2>
                  {student.enrollmentNumber ||
                    "Student"}
                </h2>

                <p>
                  Your weekly academic
                  schedule
                </p>
              </div>
            </div>

            <div className="student-info-items">
              <div className="info-item">
                <span>Semester</span>
                <strong>
                  {student.semester ??
                    "--"}
                </strong>
              </div>

              <div className="info-item">
                <span>Batch</span>
                <strong>
                  {student.batch || "Common"}
                </strong>
              </div>

              <div className="info-item">
                <span>Division</span>
                <strong>
                  {student.division ||
                    "--"}
                </strong>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================
            SUMMARY CARDS
        ====================================================== */}
        <section className="summary-grid">
          <div className="summary-card">
            <div className="summary-icon blue">
              <CalendarDays size={21} />
            </div>

            <div>
              <span>Total Classes</span>
              <strong>
                {timetable.length}
              </strong>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon purple">
              <BookOpen size={21} />
            </div>

            <div>
              <span>Total Courses</span>
              <strong>
                {totalCourses}
              </strong>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon green">
              <UserRound size={21} />
            </div>

            <div>
              <span>Faculty</span>
              <strong>
                {totalFaculty}
              </strong>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon orange">
              <Clock3 size={21} />
            </div>

            <div>
              <span>Today's Classes</span>
              <strong>
                {todayEntries.length}
              </strong>
            </div>
          </div>
        </section>

        {/* =====================================================
            DAY SELECTOR
        ====================================================== */}
        <section className="day-section">

          <div className="day-section-header">
            <div>
              <h2>Weekly Schedule</h2>
              <p>
                Select a day to view your
                classes
              </p>
            </div>

            <button
              className="today-button"
              onClick={handleToday}
            >
              Go to Today
            </button>
          </div>

          <div className="day-selector">

            <button
              className="day-arrow"
              onClick={() =>
                moveDay(-1)
              }
              aria-label="Previous day"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="days-list">
              {DAYS.map((day) => {
                const count =
                  sortedTimetable.filter(
                    (entry) =>
                      Number(
                        entry.dayOfWeek
                      ) === day.id
                  ).length;

                return (
                  <button
                    key={day.id}
                    className={`day-button ${
                      Number(
                        selectedDay
                      ) === day.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setSelectedDay(
                        day.id
                      )
                    }
                  >
                    <span className="day-short">
                      {day.short}
                    </span>

                    <span className="day-full">
                      {day.full}
                    </span>

                    <span className="day-count">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              className="day-arrow"
              onClick={() =>
                moveDay(1)
              }
              aria-label="Next day"
            >
              <ChevronRight size={20} />
            </button>

          </div>
        </section>

        {/* =====================================================
            LOADING
        ====================================================== */}
        {loading ? (
          <section className="loading-container">
            <div className="loading-spinner" />

            <h3>
              Loading timetable...
            </h3>

            <p>
              Please wait while we fetch
              your schedule.
            </p>
          </section>
        ) : (
          <>
            {/* =================================================
                SELECTED DAY TITLE
            ================================================== */}
            <div className="selected-day-heading">
              <div>
                <span>
                  {getDayShortName(
                    selectedDay
                  )}
                </span>

                <div>
                  <h2>
                    {selectedDayName}
                  </h2>

                  <p>
                    {selectedDayEntries.length ===
                    0
                      ? "No classes scheduled"
                      : `${
                          selectedDayEntries.length
                        } class${
                          selectedDayEntries.length >
                          1
                            ? "es"
                            : ""
                        } scheduled`}
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                EMPTY STATE
            ================================================== */}
            {selectedDayEntries.length ===
            0 ? (
              <section className="empty-state">
                <div className="empty-icon">
                  <CalendarDays size={35} />
                </div>

                <h3>
                  No classes on{" "}
                  {selectedDayName}
                </h3>

                <p>
                  You don't have any
                  timetable entries scheduled
                  for this day.
                </p>

                <button
                  onClick={() =>
                    moveDay(1)
                  }
                >
                  View Next Day
                </button>
              </section>
            ) : (
              /* ===============================================
                 CLASS LIST
              ================================================ */
              <section className="classes-list">
                {selectedDayEntries.map(
                  (entry) => {
                    const course =
                      entry.course || {};

                    const faculty =
                      entry.faculty || {};

                    const facultyUser =
                      faculty.user || {};

                    const classType =
                      entry.classType ||
                      "Lecture";

                    const facultyName =
                      [
                        facultyUser.firstName,
                        facultyUser.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ") ||
                      "Faculty";

                    return (
                      <article
                        className="class-card"
                        key={entry.id}
                      >
                        <div className="time-column">
                          <span className="time-start">
                            {formatTime(
                              entry.startTime
                            )}
                          </span>

                          <span className="time-line">
                            <span />
                          </span>

                          <span className="time-end">
                            {formatTime(
                              entry.endTime
                            )}
                          </span>
                        </div>

                        <div className="class-content">
                          <div className="class-top">
                            <div>
                              <span className="course-code">
                                {course.code ||
                                  "COURSE"}
                              </span>

                              <h3>
                                {course.name ||
                                  "Course"}
                              </h3>
                            </div>

                            <span
                              className={`class-type ${getClassTypeClass(
                                classType
                              )}`}
                            >
                              {classType}
                            </span>
                          </div>

                          <div className="class-details">

                            <div className="detail-item">
                              <UserRound
                                size={16}
                              />

                              <span>
                                {facultyName}
                              </span>
                            </div>

                            <div className="detail-item">
                              <MapPin
                                size={16}
                              />

                              <span>
                                {entry.room ||
                                  "Room not assigned"}
                              </span>
                            </div>

                            <div className="detail-item">
                              <Clock3
                                size={16}
                              />

                              <span>
                                {formatTime(
                                  entry.startTime
                                )}{" "}
                                –{" "}
                                {formatTime(
                                  entry.endTime
                                )}
                              </span>
                            </div>

                            <div className="detail-item">
                              <BookOpen
                                size={16}
                              />

                              <span>
                                {course.credits ??
                                  "--"}{" "}
                                Credits
                              </span>
                            </div>

                          </div>

                          <div className="class-footer">
                            <span>
                              {getDayName(
                                entry.dayOfWeek
                              )}
                            </span>

                            <span>
                              Batch:{" "}
                              {entry.batch ||
                                "Common"}
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}
              </section>
            )}

            {/* =================================================
                FULL WEEK OVERVIEW
            ================================================== */}
            {sortedTimetable.length > 0 && (
              <section className="week-overview">

                <div className="week-overview-header">
                  <div>
                    <h2>
                      Full Week Overview
                    </h2>

                    <p>
                      Quick view of all
                      scheduled classes
                    </p>
                  </div>
                </div>

                <div className="week-table-wrapper">
                  <table className="week-table">
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Time</th>
                        <th>Course</th>
                        <th>Faculty</th>
                        <th>Room</th>
                        <th>Type</th>
                      </tr>
                    </thead>

                    <tbody>
                      {sortedTimetable.map(
                        (entry) => {
                          const facultyUser =
                            entry.faculty
                              ?.user || {};

                          const facultyName =
                            [
                              facultyUser.firstName,
                              facultyUser.lastName,
                            ]
                              .filter(Boolean)
                              .join(" ") ||
                            "Faculty";

                          return (
                            <tr
                              key={
                                `overview-${entry.id}`
                              }
                            >
                              <td>
                                <strong>
                                  {getDayShortName(
                                    entry.dayOfWeek
                                  )}
                                </strong>
                              </td>

                              <td>
                                {formatTime(
                                  entry.startTime
                                )}{" "}
                                –{" "}
                                {formatTime(
                                  entry.endTime
                                )}
                              </td>

                              <td>
                                <div className="table-course">
                                  <strong>
                                    {entry.course
                                      ?.code ||
                                      "COURSE"}
                                  </strong>

                                  <span>
                                    {entry.course
                                      ?.name ||
                                      "Course"}
                                  </span>
                                </div>
                              </td>

                              <td>
                                {facultyName}
                              </td>

                              <td>
                                {entry.room ||
                                  "—"}
                              </td>

                              <td>
                                <span
                                  className={`table-type ${getClassTypeClass(
                                    entry.classType
                                  )}`}
                                >
                                  {entry.classType ||
                                    "Lecture"}
                                </span>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .student-timetable-page {
          min-height: 100vh;
          background: #f5f7fb;
          padding: 28px;
          color: #172033;
        }

        .timetable-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        /* ================================================
           HEADER
        ================================================= */

        .timetable-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 22px;
        }

        .back-button,
        .refresh-button,
        .today-button,
        .day-arrow {
          border: none;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          color: #42506a;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #e4e9f2;
          font-weight: 600;
        }

        .back-button:hover {
          background: #f8faff;
          transform: translateY(-1px);
        }

        .page-title-wrapper {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .page-icon {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eaf1ff;
          color: #1769ff;
        }

        .page-title-wrapper h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 750;
          letter-spacing: -0.5px;
        }

        .page-title-wrapper p {
          margin: 4px 0 0;
          color: #7a8498;
          font-size: 14px;
        }

        .refresh-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 16px;
          border-radius: 10px;
          background: #1769ff;
          color: white;
          font-weight: 650;
          box-shadow: 0 5px 14px rgba(23, 105, 255, 0.18);
        }

        .refresh-button:hover {
          background: #0e5ce8;
        }

        .refresh-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 0.9s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* ================================================
           ERROR
        ================================================= */

        .error-banner {
          display: flex;
          align-items: center;
          gap: 13px;
          background: #fff1f1;
          border: 1px solid #ffd3d3;
          color: #b42318;
          padding: 15px 17px;
          border-radius: 12px;
          margin-bottom: 22px;
        }

        .error-banner > div {
          flex: 1;
        }

        .error-banner strong {
          font-size: 14px;
        }

        .error-banner p {
          margin: 3px 0 0;
          font-size: 13px;
        }

        .error-banner button {
          border: none;
          background: #b42318;
          color: white;
          border-radius: 8px;
          padding: 8px 13px;
          cursor: pointer;
          font-weight: 600;
        }

        /* ================================================
           STUDENT INFO
        ================================================= */

        .student-info-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 20px;
          background: white;
          border: 1px solid #e8edf5;
          border-radius: 16px;
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(25, 40, 70, 0.04);
        }

        .student-info-main {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .student-avatar {
          width: 50px;
          height: 50px;
          border-radius: 13px;
          background: #edf4ff;
          color: #1769ff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .student-info-main h2 {
          margin: 0;
          font-size: 17px;
        }

        .student-info-main p {
          margin: 4px 0 0;
          color: #7c879a;
          font-size: 13px;
        }

        .student-info-items {
          display: flex;
          gap: 28px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-item span {
          color: #8791a3;
          font-size: 12px;
        }

        .info-item strong {
          font-size: 15px;
        }

        /* ================================================
           SUMMARY
        ================================================= */

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 22px;
        }

        .summary-card {
          display: flex;
          align-items: center;
          gap: 13px;
          background: white;
          border: 1px solid #e8edf5;
          border-radius: 15px;
          padding: 18px;
          box-shadow: 0 4px 15px rgba(25, 40, 70, 0.035);
        }

        .summary-icon {
          width: 43px;
          height: 43px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .summary-icon.blue {
          background: #eaf1ff;
          color: #1769ff;
        }

        .summary-icon.purple {
          background: #f1ebff;
          color: #7447e8;
        }

        .summary-icon.green {
          background: #eaf9f0;
          color: #15945a;
        }

        .summary-icon.orange {
          background: #fff3e7;
          color: #e87d17;
        }

        .summary-card span {
          display: block;
          color: #7e899c;
          font-size: 12px;
          margin-bottom: 3px;
        }

        .summary-card strong {
          font-size: 21px;
        }

        /* ================================================
           DAY SECTION
        ================================================= */

        .day-section {
          background: white;
          border: 1px solid #e8edf5;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
          box-shadow: 0 4px 15px rgba(25, 40, 70, 0.035);
        }

        .day-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 18px;
        }

        .day-section-header h2,
        .week-overview-header h2 {
          margin: 0;
          font-size: 19px;
        }

        .day-section-header p,
        .week-overview-header p {
          margin: 5px 0 0;
          color: #818b9d;
          font-size: 13px;
        }

        .today-button {
          padding: 9px 14px;
          background: #f0f5ff;
          color: #1769ff;
          border-radius: 9px;
          font-weight: 650;
        }

        .today-button:hover {
          background: #e3edff;
        }

        .day-selector {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .day-arrow {
          flex: 0 0 40px;
          height: 50px;
          border-radius: 10px;
          background: #f6f8fc;
          color: #5c687d;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .day-arrow:hover {
          background: #eaf1ff;
          color: #1769ff;
        }

        .days-list {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 9px;
        }

        .day-button {
          position: relative;
          border: 1px solid #e5eaf2;
          background: #fbfcfe;
          border-radius: 11px;
          min-height: 64px;
          cursor: pointer;
          transition: 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          color: #5d687d;
        }

        .day-button:hover {
          border-color: #b9cef9;
          background: #f5f8ff;
        }

        .day-button.active {
          background: #1769ff;
          border-color: #1769ff;
          color: white;
          box-shadow: 0 5px 14px rgba(23, 105, 255, 0.2);
        }

        .day-short {
          font-weight: 750;
          font-size: 14px;
        }

        .day-full {
          display: none;
          font-size: 11px;
        }

        .day-count {
          font-size: 10px;
          opacity: 0.75;
        }

        /* ================================================
           LOADING
        ================================================= */

        .loading-container {
          min-height: 360px;
          background: white;
          border: 1px solid #e8edf5;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #6f7b8f;
        }

        .loading-spinner {
          width: 38px;
          height: 38px;
          border: 3px solid #e3eaf5;
          border-top-color: #1769ff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 14px;
        }

        .loading-container h3 {
          margin: 0;
          color: #28344a;
        }

        .loading-container p {
          margin: 6px 0 0;
          font-size: 13px;
        }

        /* ================================================
           SELECTED DAY
        ================================================= */

        .selected-day-heading {
          margin-bottom: 15px;
        }

        .selected-day-heading > div {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .selected-day-heading > div > span {
          width: 47px;
          height: 47px;
          border-radius: 12px;
          background: #1769ff;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 750;
          font-size: 13px;
        }

        .selected-day-heading h2 {
          margin: 0;
          font-size: 22px;
        }

        .selected-day-heading p {
          margin: 3px 0 0;
          color: #7c8799;
          font-size: 13px;
        }

        /* ================================================
           CLASS CARDS
        ================================================= */

        .classes-list {
          display: flex;
          flex-direction: column;
          gap: 13px;
          margin-bottom: 28px;
        }

        .class-card {
          display: flex;
          background: white;
          border: 1px solid #e6ebf3;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(20, 35, 65, 0.035);
          transition: 0.2s ease;
        }

        .class-card:hover {
          transform: translateY(-2px);
          border-color: #cddaf2;
          box-shadow: 0 8px 22px rgba(20, 35, 65, 0.07);
        }

        .time-column {
          width: 135px;
          flex: 0 0 135px;
          background: #f8faff;
          border-right: 1px solid #e7ecf4;
          padding: 18px 15px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .time-start,
        .time-end {
          font-size: 13px;
          font-weight: 700;
          color: #344054;
        }

        .time-line {
          width: 2px;
          height: 22px;
          background: #c9d8f4;
          position: relative;
        }

        .time-line span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #1769ff;
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }

        .class-content {
          flex: 1;
          padding: 18px 20px;
          min-width: 0;
        }

        .class-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
        }

        .course-code {
          font-size: 11px;
          color: #1769ff;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .class-top h3 {
          margin: 4px 0 0;
          font-size: 17px;
          color: #1f2937;
        }

        .class-type,
        .table-type {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .class-type.lecture,
        .table-type.lecture {
          background: #eaf1ff;
          color: #1769ff;
        }

        .class-type.practical,
        .table-type.practical {
          background: #eaf9f0;
          color: #148753;
        }

        .class-type.lab,
        .table-type.lab {
          background: #fff0e7;
          color: #d96817;
        }

        .class-type.tutorial,
        .table-type.tutorial {
          background: #f1ebff;
          color: #7145d9;
        }

        .class-type.seminar,
        .table-type.seminar {
          background: #fff3d8;
          color: #a36b00;
        }

        .class-type.workshop,
        .table-type.workshop {
          background: #ffeaf2;
          color: #c7356c;
        }

        .class-details {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 22px;
          margin-top: 16px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #68758a;
          font-size: 12px;
        }

        .detail-item svg {
          color: #8a97aa;
          flex-shrink: 0;
        }

        .class-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #edf0f5;
          margin-top: 16px;
          padding-top: 11px;
          color: #8993a5;
          font-size: 11px;
        }

        /* ================================================
           EMPTY
        ================================================= */

        .empty-state {
          background: white;
          border: 1px solid #e7ebf2;
          border-radius: 16px;
          min-height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 30px;
          margin-bottom: 28px;
        }

        .empty-icon {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: #f1f5fb;
          color: #8490a5;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }

        .empty-state h3 {
          margin: 0;
          font-size: 18px;
        }

        .empty-state p {
          color: #818b9d;
          font-size: 13px;
          max-width: 420px;
          margin: 7px 0 17px;
        }

        .empty-state button {
          border: none;
          background: #1769ff;
          color: white;
          padding: 9px 15px;
          border-radius: 9px;
          font-weight: 650;
          cursor: pointer;
        }

        /* ================================================
           WEEK OVERVIEW
        ================================================= */

        .week-overview {
          background: white;
          border: 1px solid #e7ebf2;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(25, 40, 70, 0.035);
          margin-bottom: 20px;
        }

        .week-overview-header {
          padding: 20px;
          border-bottom: 1px solid #edf0f5;
        }

        .week-table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .week-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 850px;
        }

        .week-table th {
          background: #f8faff;
          color: #68758a;
          font-size: 11px;
          text-align: left;
          padding: 12px 16px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.35px;
        }

        .week-table td {
          padding: 14px 16px;
          border-top: 1px solid #edf0f5;
          font-size: 12px;
          color: #59667b;
        }

        .week-table tbody tr:hover {
          background: #fafcff;
        }

        .table-course {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .table-course strong {
          color: #1769ff;
          font-size: 11px;
        }

        .table-course span {
          color: #273449;
          font-weight: 600;
        }

        /* ================================================
           RESPONSIVE
        ================================================= */

        @media (max-width: 1050px) {
          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .student-info-card {
            align-items: flex-start;
            flex-direction: column;
          }

          .student-info-items {
            width: 100%;
            justify-content: space-between;
          }
        }

        @media (max-width: 800px) {
          .student-timetable-page {
            padding: 18px 12px;
          }

          .timetable-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .header-left {
            width: 100%;
            flex-direction: column;
            align-items: flex-start;
          }

          .page-title-wrapper h1 {
            font-size: 24px;
          }

          .refresh-button {
            width: 100%;
            justify-content: center;
          }

          .student-info-items {
            gap: 18px;
            flex-wrap: wrap;
          }

          .day-section {
            padding: 15px;
          }

          .day-selector {
            gap: 5px;
          }

          .day-arrow {
            flex: 0 0 35px;
            height: 52px;
          }

          .days-list {
            gap: 5px;
          }

          .day-button {
            min-height: 52px;
          }

          .day-full {
            display: none;
          }

          .day-short {
            font-size: 12px;
          }

          .day-count {
            font-size: 9px;
          }

          .class-card {
            flex-direction: column;
          }

          .time-column {
            width: 100%;
            flex: none;
            border-right: none;
            border-bottom: 1px solid #e7ecf4;
            padding: 9px 15px;
            flex-direction: row;
            justify-content: flex-start;
            gap: 8px;
          }

          .time-line {
            width: 20px;
            height: 2px;
          }

          .time-line span {
            left: 50%;
            top: 50%;
          }

          .class-content {
            padding: 15px;
          }

          .class-details {
            gap: 10px 15px;
          }
        }

        @media (max-width: 560px) {
          .summary-grid {
            grid-template-columns: 1fr;
          }

          .page-title-wrapper {
            gap: 10px;
          }

          .page-icon {
            width: 44px;
            height: 44px;
          }

          .day-section-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .today-button {
            width: 100%;
          }

          .day-button {
            min-height: 50px;
            padding: 5px 2px;
          }

          .days-list {
            gap: 3px;
          }

          .day-arrow {
            flex: 0 0 30px;
          }

          .selected-day-heading h2 {
            font-size: 19px;
          }

          .class-top {
            flex-direction: column;
          }

          .class-type {
            align-self: flex-start;
          }

          .class-footer {
            gap: 10px;
            flex-direction: column;
            align-items: flex-start;
          }

          .student-info-items {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}