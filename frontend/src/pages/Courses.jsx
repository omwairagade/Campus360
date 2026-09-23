import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Mail,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiGet, logoutUser } from "../api";

const getFacultyName = (faculty) => {
  if (!faculty?.user) return "Not Assigned";

  const firstName = faculty.user.firstName || "";
  const lastName = faculty.user.lastName || "";

  return `${firstName} ${lastName}`.trim() || "Not Assigned";
};

const getResponseCourses = (response) => {
  return (
    response?.courses ||
    response?.data?.courses ||
    response?.data ||
    []
  );
};

const normalizeCourse = (course) => ({
  ...course,
  id: course?.id,
  code: course?.code || "N/A",
  name: course?.name || "Unnamed Course",
  description: course?.description || "",
  credits: Number(course?.credits || 0),
  semester: course?.semester || "-",
  type: course?.type || "Course",
  department: course?.department || null,
  program: course?.program || null,
  faculty: course?.faculty || null,
  enrollmentId: course?.enrollmentId,
  enrolledAt: course?.enrolledAt,
  progressPercent: Math.min(
    100,
    Math.max(0, Number(course?.progressPercent || 0))
  ),
});

const getCourseTypeClass = (type) => {
  const normalized = String(type || "").toLowerCase();

  if (normalized.includes("elective")) {
    return "course-type elective";
  }

  if (
    normalized.includes("practical") ||
    normalized.includes("lab")
  ) {
    return "course-type practical";
  }

  return "course-type core";
};

const getProgressClass = (progress) => {
  if (progress >= 75) return "progress-fill high";
  if (progress >= 40) return "progress-fill medium";
  return "progress-fill low";
};

const formatDate = (dateValue) => {
  if (!dateValue) return "Not available";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getErrorMessage = (error) => {
  if (!error) return "Something went wrong.";

  if (typeof error === "string") {
    return error;
  }

  return (
    error?.response?.data?.message ||
    error?.message ||
    "Failed to load your courses."
  );
};

function CourseCard({ course, onOpen }) {
  const facultyName = getFacultyName(course.faculty);

  return (
    <article className="course-card">
      <div className="course-card-top">
        <div className="course-icon">
          <BookOpen size={23} />
        </div>

        <span className={getCourseTypeClass(course.type)}>
          {course.type}
        </span>
      </div>

      <div className="course-code">
        {course.code}
      </div>

      <h3 className="course-name">
        {course.name}
      </h3>

      {course.description ? (
        <p className="course-description">
          {course.description}
        </p>
      ) : (
        <p className="course-description muted">
          No course description available.
        </p>
      )}

      <div className="course-info-grid">
        <div className="course-info-item">
          <span className="course-info-label">
            <GraduationCap size={15} />
            Credits
          </span>
          <strong>{course.credits}</strong>
        </div>

        <div className="course-info-item">
          <span className="course-info-label">
            <CalendarDays size={15} />
            Semester
          </span>
          <strong>{course.semester}</strong>
        </div>
      </div>

      <div className="course-faculty">
        <div className="faculty-avatar">
          <UserRound size={18} />
        </div>

        <div className="faculty-details">
          <span>Faculty</span>

          <strong>{facultyName}</strong>

          {course.faculty?.user?.email && (
            <a
              href={`mailto:${course.faculty.user.email}`}
              onClick={(event) => event.stopPropagation()}
            >
              <Mail size={13} />
              {course.faculty.user.email}
            </a>
          )}
        </div>
      </div>

      <div className="course-progress">
        <div className="progress-heading">
          <span>Course Progress</span>
          <strong>{course.progressPercent}%</strong>
        </div>

        <div className="progress-track">
          <div
            className={getProgressClass(
              course.progressPercent
            )}
            style={{
              width: `${course.progressPercent}%`,
            }}
          />
        </div>
      </div>

      <div className="course-card-footer">
        <span className="enrolled-date">
          Enrolled {formatDate(course.enrolledAt)}
        </span>

        <button
          type="button"
          className="view-course-btn"
          onClick={() => onOpen(course)}
        >
          View Details
        </button>
      </div>
    </article>
  );
}

function CourseDetailsModal({ course, onClose }) {
  if (!course) return null;

  const facultyName = getFacultyName(course.faculty);

  return (
    <div
      className="course-modal-overlay"
      onMouseDown={onClose}
    >
      <div
        className="course-modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="course-modal-header">
          <div>
            <span className="modal-course-code">
              {course.code}
            </span>

            <h2>{course.name}</h2>

            <span className={getCourseTypeClass(course.type)}>
              {course.type}
            </span>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={21} />
          </button>
        </div>

        <div className="modal-content">
          <div className="modal-description">
            <h3>Course Description</h3>

            <p>
              {course.description ||
                "No description has been provided for this course."}
            </p>
          </div>

          <div className="modal-detail-grid">
            <div className="modal-detail">
              <span>Credits</span>
              <strong>{course.credits}</strong>
            </div>

            <div className="modal-detail">
              <span>Semester</span>
              <strong>{course.semester}</strong>
            </div>

            <div className="modal-detail">
              <span>Department</span>
              <strong>
                {course.department?.name ||
                  "Not available"}
              </strong>
            </div>

            <div className="modal-detail">
              <span>Program</span>
              <strong>
                {course.program?.name ||
                  "Not available"}
              </strong>
            </div>
          </div>

          <div className="modal-faculty">
            <div className="faculty-avatar large">
              <UserRound size={22} />
            </div>

            <div>
              <span>Course Faculty</span>

              <strong>{facultyName}</strong>

              {course.faculty?.user?.email && (
                <a
                  href={`mailto:${course.faculty.user.email}`}
                >
                  <Mail size={14} />
                  {course.faculty.user.email}
                </a>
              )}
            </div>
          </div>

          <div className="modal-progress">
            <div className="progress-heading">
              <span>Course Progress</span>
              <strong>
                {course.progressPercent}%
              </strong>
            </div>

            <div className="progress-track large">
              <div
                className={getProgressClass(
                  course.progressPercent
                )}
                style={{
                  width: `${course.progressPercent}%`,
                }}
              />
            </div>
          </div>

          <div className="modal-enrollment">
            <CalendarDays size={17} />

            <span>
              Enrolled on{" "}
              <strong>
                {formatDate(course.enrolledAt)}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Courses() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [semesterFilter, setSemesterFilter] =
    useState("all");
  const [typeFilter, setTypeFilter] =
    useState("all");

  const [selectedCourse, setSelectedCourse] =
    useState(null);

  const loadCourses = async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await apiGet(
        "/courses/my-courses"
      );

      const receivedCourses = getResponseCourses(
        response
      )
        .map(normalizeCourse)
        .filter(
          (course) => course.id !== undefined
        );

      setCourses(receivedCourses);
    } catch (err) {
      console.error(
        "Load student courses error:",
        err
      );

      const message = getErrorMessage(err);

      const authError =
        /token|authentication|unauthorized|forbidden|401|403/i.test(
          message
        );

      if (authError) {
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
    loadCourses();
  }, []);

  const semesterOptions = useMemo(() => {
    const values = courses
      .map((course) => String(course.semester))
      .filter(Boolean);

    return [...new Set(values)].sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
      })
    );
  }, [courses]);

  const typeOptions = useMemo(() => {
    const values = courses
      .map((course) => String(course.type))
      .filter(Boolean);

    return [...new Set(values)].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesSearch =
        !query ||
        course.name
          .toLowerCase()
          .includes(query) ||
        course.code
          .toLowerCase()
          .includes(query) ||
        String(course.type)
          .toLowerCase()
          .includes(query) ||
        String(course.department?.name || "")
          .toLowerCase()
          .includes(query) ||
        String(course.program?.name || "")
          .toLowerCase()
          .includes(query) ||
        getFacultyName(course.faculty)
          .toLowerCase()
          .includes(query);

      const matchesSemester =
        semesterFilter === "all" ||
        String(course.semester) ===
          semesterFilter;

      const matchesType =
        typeFilter === "all" ||
        String(course.type) === typeFilter;

      return (
        matchesSearch &&
        matchesSemester &&
        matchesType
      );
    });
  }, [
    courses,
    searchTerm,
    semesterFilter,
    typeFilter,
  ]);

  const totalCredits = useMemo(
    () =>
      courses.reduce(
        (total, course) =>
          total + Number(course.credits || 0),
        0
      ),
    [courses]
  );

  const averageProgress = useMemo(() => {
    if (!courses.length) return 0;

    const total = courses.reduce(
      (sum, course) =>
        sum +
        Number(course.progressPercent || 0),
      0
    );

    return Math.round(total / courses.length);
  }, [courses]);

  const completedCourses = courses.filter(
    (course) => course.progressPercent >= 100
  ).length;

  const activeCourses =
    courses.length - completedCourses;

  return (
    <div className="courses-page">
      <style>{`
        .courses-page {
          min-height: 100%;
          padding: 28px;
          background: #f7f9fc;
          color: #172033;
        }

        .courses-container {
          max-width: 1450px;
          margin: 0 auto;
        }

        .courses-page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
        }

        .courses-title-wrap h1 {
          margin: 0 0 7px;
          font-size: 30px;
          font-weight: 750;
          letter-spacing: -0.5px;
        }

        .courses-title-wrap p {
          margin: 0;
          color: #687386;
          font-size: 14px;
        }

        .back-dashboard-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 0;
          background: transparent;
          color: #5f6d82;
          padding: 0;
          margin-bottom: 14px;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .back-dashboard-btn:hover {
          color: #2463c5;
          transform: translateX(-2px);
        }

        .refresh-courses-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #dbe1ea;
          background: #ffffff;
          color: #243047;
          padding: 10px 15px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 650;
          transition: 0.2s ease;
        }

        .refresh-courses-btn:hover {
          border-color: #b9c3d3;
          transform: translateY(-1px);
        }

        .refresh-courses-btn:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .refresh-spin {
          animation: course-spin 0.9s linear infinite;
        }

        @keyframes course-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        .course-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .course-summary-card {
          background: #ffffff;
          border: 1px solid #e6eaf0;
          border-radius: 15px;
          padding: 19px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 4px 16px rgba(20, 32, 55, 0.04);
        }

        .summary-icon {
          width: 45px;
          height: 45px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #eef5ff;
          color: #2463c5;
          flex-shrink: 0;
        }

        .summary-text span {
          display: block;
          color: #778196;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .summary-text strong {
          font-size: 22px;
          line-height: 1;
        }

        .courses-toolbar {
          display: grid;
          grid-template-columns: minmax(260px, 1fr) 180px 180px;
          gap: 12px;
          background: #ffffff;
          border: 1px solid #e6eaf0;
          padding: 16px;
          border-radius: 15px;
          margin-bottom: 22px;
          box-shadow: 0 4px 16px rgba(20, 32, 55, 0.035);
        }

        .course-search {
          position: relative;
        }

        .course-search svg {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #8993a5;
        }

        .course-search input,
        .course-filter {
          width: 100%;
          height: 43px;
          border: 1px solid #dce2eb;
          border-radius: 10px;
          background: #ffffff;
          color: #1d293d;
          font-size: 13px;
          outline: none;
        }

        .course-search input {
          padding: 0 13px 0 39px;
        }

        .course-filter {
          padding: 0 12px;
          cursor: pointer;
        }

        .course-search input:focus,
        .course-filter:focus {
          border-color: #7aa7e8;
          box-shadow: 0 0 0 3px rgba(53, 113, 202, 0.1);
        }

        .error-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          background: #fff3f3;
          border: 1px solid #f0caca;
          color: #a52a2a;
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 20px;
          font-size: 13px;
        }

        .retry-btn {
          border: 1px solid #e4a5a5;
          background: #ffffff;
          color: #a52a2a;
          padding: 8px 13px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 650;
        }

        .courses-result-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 13px;
        }

        .courses-result-heading h2 {
          font-size: 17px;
          margin: 0;
        }

        .courses-result-heading span {
          color: #778196;
          font-size: 12px;
        }

        .course-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .course-card {
          background: #ffffff;
          border: 1px solid #e5e9f0;
          border-radius: 16px;
          padding: 19px;
          box-shadow: 0 5px 18px rgba(20, 32, 55, 0.045);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          min-width: 0;
        }

        .course-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(20, 32, 55, 0.08);
        }

        .course-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }

        .course-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: #eef5ff;
          color: #2563c7;
        }

        .course-type {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 750;
          text-transform: capitalize;
          white-space: nowrap;
        }

        .course-type.core {
          background: #edf4ff;
          color: #2864bc;
        }

        .course-type.elective {
          background: #f2efff;
          color: #674bb2;
        }

        .course-type.practical {
          background: #ecf9f2;
          color: #278457;
        }

        .course-code {
          color: #2864bc;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.6px;
          margin-bottom: 5px;
        }

        .course-name {
          margin: 0;
          font-size: 18px;
          line-height: 1.35;
          min-height: 49px;
          color: #172033;
        }

        .course-description {
          margin: 8px 0 17px;
          color: #687386;
          font-size: 12px;
          line-height: 1.55;
          min-height: 38px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .course-description.muted {
          color: #9aa3b1;
        }

        .course-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-top: 1px solid #edf0f4;
          border-bottom: 1px solid #edf0f4;
          padding: 12px 0;
          gap: 12px;
        }

        .course-info-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .course-info-label {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #8791a1;
          font-size: 11px;
        }

        .course-info-item strong {
          font-size: 13px;
        }

        .course-faculty {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 15px 0;
        }

        .faculty-avatar {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 50%;
          background: #f0f3f8;
          color: #556176;
        }

        .faculty-avatar.large {
          width: 46px;
          height: 46px;
        }

        .faculty-details {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .faculty-details > span,
        .modal-faculty span {
          color: #8993a3;
          font-size: 10px;
          margin-bottom: 2px;
        }

        .faculty-details strong {
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .faculty-details a,
        .modal-faculty a {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #5d6b80;
          text-decoration: none;
          font-size: 10px;
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .faculty-details a:hover,
        .modal-faculty a:hover {
          color: #2463c5;
        }

        .course-progress {
          margin-top: 3px;
        }

        .progress-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 7px;
        }

        .progress-heading span {
          color: #788397;
          font-size: 11px;
        }

        .progress-heading strong {
          font-size: 11px;
        }

        .progress-track {
          width: 100%;
          height: 7px;
          background: #edf0f4;
          border-radius: 10px;
          overflow: hidden;
        }

        .progress-track.large {
          height: 9px;
        }

        .progress-fill {
          height: 100%;
          border-radius: inherit;
          transition: width 0.35s ease;
          background: #3478d4;
        }

        .progress-fill.high {
          background: #3a9a69;
        }

        .progress-fill.medium {
          background: #d39a34;
        }

        .progress-fill.low {
          background: #d26767;
        }

        .course-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-top: 17px;
          padding-top: 13px;
          border-top: 1px solid #edf0f4;
        }

        .enrolled-date {
          color: #8a94a4;
          font-size: 10px;
        }

        .view-course-btn {
          border: 0;
          background: #172033;
          color: #ffffff;
          border-radius: 8px;
          padding: 8px 11px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .view-course-btn:hover {
          background: #27344b;
        }

        .empty-courses {
          background: #ffffff;
          border: 1px dashed #d6dce6;
          border-radius: 16px;
          padding: 55px 20px;
          text-align: center;
        }

        .empty-courses-icon {
          width: 56px;
          height: 56px;
          margin: 0 auto 12px;
          display: grid;
          place-items: center;
          background: #eef3fa;
          color: #60708a;
          border-radius: 50%;
        }

        .empty-courses h3 {
          margin: 0 0 6px;
          font-size: 17px;
        }

        .empty-courses p {
          margin: 0;
          color: #7c8798;
          font-size: 13px;
        }

        .course-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(14, 22, 37, 0.52);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .course-modal {
          width: min(650px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          background: #ffffff;
          border-radius: 18px;
          box-shadow: 0 25px 70px rgba(10, 20, 35, 0.2);
        }

        .course-modal-header {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 22px;
          border-bottom: 1px solid #edf0f4;
        }

        .modal-course-code {
          color: #2864bc;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.6px;
        }

        .course-modal-header h2 {
          margin: 5px 0 10px;
          font-size: 22px;
          line-height: 1.3;
        }

        .modal-close {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border: 0;
          background: #f2f4f7;
          color: #526076;
          border-radius: 9px;
          cursor: pointer;
        }

        .modal-close:hover {
          background: #e7ebf1;
        }

        .modal-content {
          padding: 22px;
        }

        .modal-description h3 {
          margin: 0 0 7px;
          font-size: 13px;
        }

        .modal-description p {
          margin: 0;
          color: #697487;
          font-size: 13px;
          line-height: 1.6;
        }

        .modal-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 11px;
          margin: 20px 0;
        }

        .modal-detail {
          padding: 13px;
          background: #f8f9fb;
          border-radius: 10px;
        }

        .modal-detail span {
          display: block;
          color: #8993a3;
          font-size: 10px;
          margin-bottom: 4px;
        }

        .modal-detail strong {
          font-size: 13px;
        }

        .modal-faculty {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 15px;
          border: 1px solid #e8ecf2;
          border-radius: 12px;
        }

        .modal-faculty > div:last-child {
          display: flex;
          flex-direction: column;
        }

        .modal-faculty strong {
          font-size: 13px;
        }

        .modal-progress {
          margin-top: 20px;
        }

        .modal-enrollment {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 20px;
          color: #6e798b;
          font-size: 12px;
        }

        @media (max-width: 1150px) {
          .course-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .course-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .courses-page {
            padding: 18px 14px;
          }

          .courses-page-header {
            align-items: stretch;
            flex-direction: column;
          }

          .refresh-courses-btn {
            justify-content: center;
          }

          .course-summary-grid {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .course-summary-card {
            padding: 14px;
          }

          .summary-icon {
            width: 38px;
            height: 38px;
          }

          .summary-text strong {
            font-size: 18px;
          }

          .courses-toolbar {
            grid-template-columns: 1fr;
          }

          .course-grid {
            grid-template-columns: 1fr;
          }

          .course-modal-overlay {
            padding: 10px;
          }

          .course-modal-header,
          .modal-content {
            padding: 17px;
          }
        }

        @media (max-width: 430px) {
          .course-summary-grid {
            grid-template-columns: 1fr;
          }

          .courses-title-wrap h1 {
            font-size: 25px;
          }

          .course-name {
            min-height: auto;
          }
        }
      `}</style>

      <div className="courses-container">

        {/* PAGE HEADER */}
        <div className="courses-page-header">
          <div>
            <button
              type="button"
              className="back-dashboard-btn"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>

            <div className="courses-title-wrap">
              <h1>My Courses</h1>

              <p>
                View your enrolled courses, faculty,
                credits and academic progress.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="refresh-courses-btn"
            onClick={() => loadCourses(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "refresh-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="error-box">
            <span>{error}</span>

            <button
              type="button"
              className="retry-btn"
              onClick={() => loadCourses()}
            >
              Retry
            </button>
          </div>
        )}

        {/* SUMMARY */}
        <div className="course-summary-grid">
          <div className="course-summary-card">
            <div className="summary-icon">
              <BookOpen size={21} />
            </div>

            <div className="summary-text">
              <span>Total Courses</span>
              <strong>{courses.length}</strong>
            </div>
          </div>

          <div className="course-summary-card">
            <div className="summary-icon">
              <GraduationCap size={21} />
            </div>

            <div className="summary-text">
              <span>Total Credits</span>
              <strong>{totalCredits}</strong>
            </div>
          </div>

          <div className="course-summary-card">
            <div className="summary-icon">
              <Clock3 size={21} />
            </div>

            <div className="summary-text">
              <span>Active Courses</span>
              <strong>{activeCourses}</strong>
            </div>
          </div>

          <div className="course-summary-card">
            <div className="summary-icon">
              <CheckCircle2 size={21} />
            </div>

            <div className="summary-text">
              <span>Average Progress</span>
              <strong>{averageProgress}%</strong>
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="courses-toolbar">
          <div className="course-search">
            <Search size={17} />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search by course name, code or faculty..."
            />
          </div>

          <select
            className="course-filter"
            value={semesterFilter}
            onChange={(event) =>
              setSemesterFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All Semesters
            </option>

            {semesterOptions.map(
              (semester) => (
                <option
                  key={semester}
                  value={semester}
                >
                  Semester {semester}
                </option>
              )
            )}
          </select>

          <select
            className="course-filter"
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              All Types
            </option>

            {typeOptions.map((type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* RESULT HEADER */}
        <div className="courses-result-heading">
          <h2>Your Enrolled Courses</h2>

          <span>
            Showing {filteredCourses.length} of{" "}
            {courses.length}
          </span>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="empty-courses">
            <div className="empty-courses-icon">
              <RefreshCw
                size={24}
                className="refresh-spin"
              />
            </div>

            <h3>
              Loading your courses...
            </h3>

            <p>
              Please wait while we fetch your
              enrolled courses.
            </p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="empty-courses">
            <div className="empty-courses-icon">
              <BookOpen size={25} />
            </div>

            <h3>
              {courses.length === 0
                ? "No courses found"
                : "No matching courses"}
            </h3>

            <p>
              {courses.length === 0
                ? "You currently do not have any enrolled courses."
                : "Try changing your search or filter options."}
            </p>
          </div>
        ) : (
          <div className="course-grid">
            {filteredCourses.map(
              (course) => (
                <CourseCard
                  key={
                    course.enrollmentId ||
                    course.id
                  }
                  course={course}
                  onOpen={
                    setSelectedCourse
                  }
                />
              )
            )}
          </div>
        )}
      </div>

      {/* COURSE DETAILS MODAL */}
      <CourseDetailsModal
        course={selectedCourse}
        onClose={() =>
          setSelectedCourse(null)
        }
      />
    </div>
  );
}