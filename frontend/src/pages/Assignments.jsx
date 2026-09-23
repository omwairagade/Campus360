import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Upload,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import { apiGet, logoutUser } from "../api";

const API_BASE_URL = "http://localhost:5000/api";

function isAuthError(message = "") {
  const text = String(message).toLowerCase();

  return [
    "token",
    "authentication",
    "unauthorized",
    "forbidden",
  ].some((item) => text.includes(item));
}

function formatDate(dateValue) {
  if (!dateValue) return "Date not available";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateValue) {
  if (!dateValue) return "Date not available";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDueDate(assignment) {
  if (!assignment?.dueDate) return null;

  const date = new Date(assignment.dueDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getSubmission(assignment) {
  return assignment?.submission || null;
}

function getAssignmentStatus(assignment) {
  const submission = getSubmission(assignment);
  const dueDate = getDueDate(assignment);
  const now = new Date();

  const status = String(submission?.status || "").toUpperCase();

  if (status === "GRADED") {
    return {
      key: "graded",
      label: "Graded",
      className: "assignment-status-graded",
      icon: CheckCircle2,
    };
  }

  if (status === "SUBMITTED") {
    return {
      key: "submitted",
      label: "Submitted",
      className: "assignment-status-submitted",
      icon: CheckCircle2,
    };
  }

  if (status === "LATE") {
    return {
      key: "late",
      label: "Submitted Late",
      className: "assignment-status-late",
      icon: Clock3,
    };
  }

  if (dueDate && dueDate < now) {
    return {
      key: "overdue",
      label: "Overdue",
      className: "assignment-status-overdue",
      icon: XCircle,
    };
  }

  return {
    key: "pending",
    label: "Pending",
    className: "assignment-status-pending",
    icon: Clock3,
  };
}

function getCourseLabel(assignment) {
  const code = assignment?.course?.code || "";
  const name = assignment?.course?.name || "";

  if (code && name) {
    return `${code} • ${name}`;
  }

  return code || name || "Course not available";
}

function getFacultyName(assignment) {
  const faculty = assignment?.faculty;

  if (!faculty) {
    return "Faculty not assigned";
  }

  if (faculty.user) {
    const name = [
      faculty.user.firstName,
      faculty.user.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (name) return name;
  }

  const name = [
    faculty.firstName,
    faculty.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || faculty.name || "Faculty not assigned";
}

function normalizeAssignments(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.assignments)) {
    return payload.assignments;
  }

  if (Array.isArray(payload?.data?.assignments)) {
    return payload.data.assignments;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

async function submitAssignmentFile(assignmentId, file) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication token is missing.");
  }

  const formData = new FormData();

  formData.append("assignmentFile", file);

  const response = await fetch(
    `${API_BASE_URL}/assignments/${assignmentId}/submit`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        "Unable to submit assignment."
    );
  }

  return data;
}

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
}) {
  return (
    <div className="assignment-stat-card">
      <div className="assignment-stat-icon">
        <Icon size={21} />
      </div>

      <div className="assignment-stat-content">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}

export default function Assignments() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [courseFilter, setCourseFilter] = useState("ALL");

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");

  const loadAssignments = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const payload = await apiGet(
          "/assignments/my-assignments"
        );

        setAssignments(normalizeAssignments(payload));
      } catch (err) {
        const message =
          err?.message ||
          "Unable to load assignments.";

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
    loadAssignments();
  }, [loadAssignments]);

  const courses = useMemo(() => {
    const values = assignments
      .map((assignment) => assignment?.course)
      .filter(Boolean);

    const unique = new Map();

    values.forEach((course) => {
      const key = course.id ?? course.code ?? course.name;

      if (!unique.has(key)) {
        unique.set(key, course);
      }
    });

    return Array.from(unique.values()).sort((a, b) =>
      String(a?.name || "").localeCompare(
        String(b?.name || "")
      )
    );
  }, [assignments]);

  const statistics = useMemo(() => {
    let pending = 0;
    let submitted = 0;
    let graded = 0;
    let overdue = 0;

    assignments.forEach((assignment) => {
      const status = getAssignmentStatus(assignment);

      if (status.key === "pending") pending += 1;
      if (status.key === "submitted") submitted += 1;
      if (status.key === "late") submitted += 1;
      if (status.key === "graded") graded += 1;
      if (status.key === "overdue") overdue += 1;
    });

    return {
      total: assignments.length,
      pending,
      submitted,
      graded,
      overdue,
    };
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const title = String(
        assignment?.title || ""
      ).toLowerCase();

      const description = String(
        assignment?.description || ""
      ).toLowerCase();

      const courseCode = String(
        assignment?.course?.code || ""
      ).toLowerCase();

      const courseName = String(
        assignment?.course?.name || ""
      ).toLowerCase();

      const status = getAssignmentStatus(assignment);

      const matchesSearch =
        !query ||
        title.includes(query) ||
        description.includes(query) ||
        courseCode.includes(query) ||
        courseName.includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        status.key === statusFilter;

      const assignmentCourseId =
        assignment?.course?.id;

      const matchesCourse =
        courseFilter === "ALL" ||
        String(assignmentCourseId) ===
          String(courseFilter);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCourse
      );
    });
  }, [
    assignments,
    search,
    statusFilter,
    courseFilter,
  ]);

  const openAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setSelectedFile(null);
    setSubmitMessage("");
    setError("");
  };

  const closeModal = () => {
    if (uploading) return;

    setSelectedAssignment(null);
    setSelectedFile(null);
    setSubmitMessage("");
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setSubmitMessage("");
    setError("");
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) return;

    if (!selectedFile) {
      setError("Please select a file before submitting.");
      return;
    }

    setUploading(true);
    setError("");
    setSubmitMessage("");

    try {
      const response = await submitAssignmentFile(
        selectedAssignment.id,
        selectedFile
      );

      const updatedSubmission =
        response?.submission ||
        response?.data?.submission ||
        null;

      setSubmitMessage(
        response?.message ||
          "Assignment submitted successfully."
      );

      if (updatedSubmission) {
        setAssignments((current) =>
          current.map((assignment) =>
            String(assignment.id) ===
            String(selectedAssignment.id)
              ? {
                  ...assignment,
                  submission: updatedSubmission,
                }
              : assignment
          )
        );

        setSelectedAssignment((current) =>
          current
            ? {
                ...current,
                submission: updatedSubmission,
              }
            : current
        );
      } else {
        await loadAssignments(true);

        setSelectedAssignment((current) => {
          if (!current) return current;

          const updated = assignments.find(
            (assignment) =>
              String(assignment.id) ===
              String(current.id)
          );

          return updated || current;
        });
      }

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      const message =
        err?.message ||
        "Unable to submit assignment.";

      if (isAuthError(message)) {
        logoutUser();
        navigate("/");
        return;
      }

      setError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="assignments-page">
      <style>{`
        .assignments-page {
          min-height: 100vh;
          background: #f5f7fb;
          color: #172033;
          padding: 24px;
          font-family: "Segoe UI", Arial, sans-serif;
        }

        .assignments-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .assignment-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 22px;
        }

        .assignment-back,
        .assignment-refresh {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #dce3ed;
          background: #ffffff;
          color: #29374f;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .assignment-back:hover {
          transform: translateX(-2px);
          background: #f1f5fa;
        }

        .assignment-refresh:hover {
          background: #f1f5fa;
        }

        .assignment-refresh:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .assignment-refresh svg {
          transition: transform 0.2s ease;
        }

        .assignment-refresh:disabled svg {
          animation: assignment-spin 0.9s linear infinite;
        }

        @keyframes assignment-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .assignment-hero {
          background: linear-gradient(
            135deg,
            #ffffff 0%,
            #eef5ff 100%
          );
          border: 1px solid #dfe7f3;
          border-radius: 20px;
          padding: 27px;
          margin-bottom: 22px;
          box-shadow: 0 8px 28px rgba(32, 57, 93, 0.05);
        }

        .assignment-hero-content {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .assignment-hero-icon {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e8f1ff;
          color: #1769ff;
          flex-shrink: 0;
        }

        .assignment-hero h1 {
          margin: 0 0 6px;
          font-size: 28px;
        }

        .assignment-hero p {
          margin: 0;
          color: #69768b;
          font-size: 14px;
        }

        .assignment-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 23px;
        }

        .assignment-stat-card {
          background: #ffffff;
          border: 1px solid #e1e7ef;
          border-radius: 16px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 13px;
          box-shadow: 0 5px 20px rgba(32, 57, 93, 0.04);
        }

        .assignment-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #eef4ff;
          color: #1769ff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .assignment-stat-content span {
          display: block;
          color: #748096;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .assignment-stat-content strong {
          display: block;
          color: #182338;
          font-size: 24px;
          line-height: 1;
        }

        .assignment-stat-content small {
          display: block;
          color: #8993a5;
          font-size: 10px;
          margin-top: 5px;
        }

        .assignment-controls {
          background: #ffffff;
          border: 1px solid #e0e6ef;
          border-radius: 16px;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 20px;
        }

        .assignment-search {
          flex: 1;
          position: relative;
        }

        .assignment-search svg {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #8a95a7;
        }

        .assignment-search input,
        .assignment-select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #dce3ed;
          background: #f9fbfd;
          border-radius: 10px;
          padding: 11px 13px;
          color: #2d3b53;
          outline: none;
          font-size: 13px;
        }

        .assignment-search input {
          padding-left: 40px;
        }

        .assignment-search input:focus,
        .assignment-select:focus {
          border-color: #82aaff;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(23, 105, 255, 0.08);
        }

        .assignment-filter-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #778398;
        }

        .assignment-select {
          min-width: 160px;
        }

        .assignment-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .assignment-section-heading h2 {
          margin: 0;
          font-size: 19px;
        }

        .assignment-count {
          color: #7c8799;
          font-size: 12px;
        }

        .assignment-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .assignment-card {
          background: #ffffff;
          border: 1px solid #e0e6ef;
          border-radius: 17px;
          padding: 19px;
          box-shadow: 0 5px 20px rgba(32, 57, 93, 0.04);
          transition: 0.2s ease;
        }

        .assignment-card:hover {
          border-color: #bfd2f2;
          box-shadow: 0 10px 27px rgba(32, 57, 93, 0.08);
          transform: translateY(-1px);
        }

        .assignment-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 13px;
        }

        .assignment-card h3 {
          margin: 0 0 6px;
          font-size: 17px;
          color: #1b273c;
        }

        .assignment-course {
          color: #6e7a8e;
          font-size: 12px;
        }

        .assignment-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .assignment-status-pending {
          background: #fff5da;
          color: #986400;
        }

        .assignment-status-submitted {
          background: #e7f7ee;
          color: #167347;
        }

        .assignment-status-graded {
          background: #e6f7ef;
          color: #087443;
        }

        .assignment-status-late {
          background: #fff0e4;
          color: #ad5d00;
        }

        .assignment-status-overdue {
          background: #ffebeb;
          color: #b42318;
        }

        .assignment-divider {
          height: 1px;
          background: #edf0f4;
          margin: 15px 0;
        }

        .assignment-description {
          color: #647188;
          font-size: 13px;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 40px;
        }

        .assignment-info-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-top: 15px;
        }

        .assignment-info {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .assignment-info svg {
          color: #78859a;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .assignment-info span {
          display: block;
          color: #8993a5;
          font-size: 10px;
          margin-bottom: 3px;
        }

        .assignment-info strong {
          display: block;
          color: #344158;
          font-size: 12px;
          font-weight: 700;
        }

        .assignment-result {
          margin-top: 15px;
          padding: 12px;
          border-radius: 11px;
          background: #f7f9fc;
          border: 1px solid #e8edf3;
        }

        .assignment-result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 9px;
        }

        .assignment-result-title {
          font-size: 11px;
          color: #68758a;
          font-weight: 700;
        }

        .assignment-result-values {
          display: flex;
          gap: 9px;
        }

        .assignment-result-value {
          flex: 1;
          background: #ffffff;
          border: 1px solid #e5eaf1;
          border-radius: 8px;
          padding: 7px;
          text-align: center;
        }

        .assignment-result-value span {
          display: block;
          color: #8a94a6;
          font-size: 9px;
          margin-bottom: 3px;
        }

        .assignment-result-value strong {
          color: #27354c;
          font-size: 13px;
        }

        .assignment-card-footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 15px;
        }

        .assignment-details-btn {
          border: none;
          background: #edf4ff;
          color: #1769ff;
          border-radius: 9px;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .assignment-details-btn:hover {
          background: #dfebff;
        }

        .assignment-loading {
          min-height: 350px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #1769ff;
          font-weight: 600;
        }

        .assignment-loading svg {
          animation: assignment-spin 0.9s linear infinite;
        }

        .assignment-error {
          display: flex;
          align-items: center;
          gap: 11px;
          background: #fff1f1;
          border: 1px solid #ffcaca;
          color: #b42318;
          border-radius: 12px;
          padding: 13px;
          margin-bottom: 18px;
        }

        .assignment-error-text {
          flex: 1;
          font-size: 12px;
        }

        .assignment-retry {
          border: none;
          background: #ffe0e0;
          color: #b42318;
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .assignment-empty {
          min-height: 270px;
          background: #ffffff;
          border: 1px dashed #d4dce7;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 25px;
        }

        .assignment-empty-icon {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: #eef3fa;
          color: #718098;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }

        .assignment-empty h3 {
          margin: 0 0 6px;
          font-size: 17px;
        }

        .assignment-empty p {
          margin: 0;
          color: #7b8799;
          font-size: 13px;
        }

        .assignment-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(10, 22, 40, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .assignment-modal {
          width: min(650px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.22);
        }

        .assignment-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          padding: 21px;
          border-bottom: 1px solid #edf0f4;
        }

        .assignment-modal-header h2 {
          margin: 0 0 5px;
          font-size: 20px;
          color: #182338;
        }

        .assignment-modal-header p {
          margin: 0;
          color: #748096;
          font-size: 12px;
        }

        .assignment-modal-close {
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 9px;
          background: #f2f4f7;
          color: #566278;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }

        .assignment-modal-body {
          padding: 21px;
        }

        .assignment-modal-description {
          color: #56657b;
          font-size: 13px;
          line-height: 1.65;
          white-space: pre-wrap;
          margin-bottom: 18px;
        }

        .assignment-modal-info {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 11px;
        }

        .assignment-modal-info-box {
          padding: 12px;
          background: #f8fafc;
          border: 1px solid #e7ecf2;
          border-radius: 10px;
        }

        .assignment-modal-info-box span {
          display: block;
          color: #8a94a6;
          font-size: 10px;
          margin-bottom: 4px;
        }

        .assignment-modal-info-box strong {
          color: #2f3d55;
          font-size: 12px;
        }

        .assignment-submission-box {
          margin-top: 17px;
          padding: 16px;
          background: #f6f9fd;
          border: 1px solid #e0e8f3;
          border-radius: 13px;
        }

        .assignment-submission-box h3 {
          margin: 0 0 12px;
          font-size: 14px;
          color: #27354b;
        }

        .existing-file {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: #ffffff;
          border: 1px solid #e5eaf1;
          border-radius: 9px;
          margin-bottom: 12px;
        }

        .existing-file-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: #edf4ff;
          color: #1769ff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .existing-file-info {
          flex: 1;
          min-width: 0;
        }

        .existing-file-info strong {
          display: block;
          font-size: 12px;
          color: #30405a;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .existing-file-info span {
          display: block;
          color: #8993a5;
          font-size: 10px;
          margin-top: 3px;
        }

        .file-download {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #1769ff;
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
        }

        .file-upload-area {
          border: 1px dashed #bdc9da;
          border-radius: 11px;
          background: #ffffff;
          padding: 18px;
          text-align: center;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .file-upload-area:hover {
          border-color: #1769ff;
          background: #f8fbff;
        }

        .file-upload-area svg {
          color: #1769ff;
          margin-bottom: 7px;
        }

        .file-upload-area strong {
          display: block;
          color: #344158;
          font-size: 12px;
        }

        .file-upload-area span {
          display: block;
          color: #8a94a6;
          font-size: 10px;
          margin-top: 4px;
        }

        .selected-file {
          margin-top: 10px;
          padding: 9px 11px;
          border-radius: 8px;
          background: #edf5ff;
          color: #2f4f7e;
          font-size: 11px;
          text-align: left;
          word-break: break-word;
        }

        .submission-message {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #167347;
          background: #eaf8f0;
          border: 1px solid #c9ebd7;
          border-radius: 8px;
          padding: 9px;
          margin-top: 10px;
          font-size: 11px;
        }

        .submission-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 13px;
        }

        .cancel-submit {
          border: 1px solid #d9e0e9;
          background: #ffffff;
          color: #526078;
          border-radius: 9px;
          padding: 9px 13px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .submit-assignment-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          background: #1769ff;
          color: #ffffff;
          border-radius: 9px;
          padding: 9px 14px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .submit-assignment-btn:hover {
          background: #0d5be5;
        }

        .submit-assignment-btn:disabled,
        .cancel-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-assignment-btn svg {
          animation: none;
        }

        .submit-assignment-btn:disabled svg {
          animation: assignment-spin 0.9s linear infinite;
        }

        .graded-remarks {
          margin-top: 12px;
          padding: 10px;
          background: #ffffff;
          border: 1px solid #e5eaf1;
          border-radius: 8px;
          color: #657188;
          font-size: 11px;
          line-height: 1.5;
        }

        .graded-remarks strong {
          color: #344158;
        }

        @media (max-width: 1000px) {
          .assignment-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .assignment-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .assignments-page {
            padding: 14px;
          }

          .assignment-hero {
            padding: 20px;
          }

          .assignment-hero h1 {
            font-size: 24px;
          }

          .assignment-controls {
            flex-direction: column;
            align-items: stretch;
          }

          .assignment-filter-wrap {
            width: 100%;
          }

          .assignment-select {
            width: 100%;
          }

          .assignment-info-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .assignment-stats {
            grid-template-columns: 1fr;
          }

          .assignment-card-top {
            flex-direction: column;
          }

          .assignment-modal-info {
            grid-template-columns: 1fr;
          }

          .assignment-result-values {
            flex-direction: column;
          }

          .submission-actions {
            flex-direction: column-reverse;
          }

          .cancel-submit,
          .submit-assignment-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="assignments-container">
        <div className="assignment-topbar">
          <button
            type="button"
            className="assignment-back"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </button>

          <button
            type="button"
            className="assignment-refresh"
            onClick={() => loadAssignments(true)}
            disabled={refreshing}
          >
            <RefreshCw size={16} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <section className="assignment-hero">
          <div className="assignment-hero-content">
            <div className="assignment-hero-icon">
              <FileText size={29} />
            </div>

            <div>
              <h1>Assignments</h1>
              <p>
                View your assignments, submission status,
                deadlines and grades.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="assignment-error">
            <AlertCircle size={20} />

            <div className="assignment-error-text">
              {error}
            </div>

            <button
              type="button"
              className="assignment-retry"
              onClick={() => {
                setError("");
                loadAssignments();
              }}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="assignment-loading">
            <Loader2 size={22} />
            Loading assignments...
          </div>
        ) : (
          <>
            <section className="assignment-stats">
              <StatCard
                icon={FileText}
                title="Total"
                value={statistics.total}
                subtitle="Assigned to you"
              />

              <StatCard
                icon={Clock3}
                title="Pending"
                value={statistics.pending}
                subtitle="Need submission"
              />

              <StatCard
                icon={CheckCircle2}
                title="Submitted"
                value={statistics.submitted}
                subtitle="Submitted assignments"
              />

              <StatCard
                icon={CheckCircle2}
                title="Graded"
                value={statistics.graded}
                subtitle="Results available"
              />
            </section>

            <section className="assignment-controls">
              <div className="assignment-search">
                <Search size={17} />

                <input
                  type="text"
                  placeholder="Search assignment or course..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>

              <div className="assignment-filter-wrap">
                <Filter size={16} />

                <select
                  className="assignment-select"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                >
                  <option value="ALL">
                    All Status
                  </option>
                  <option value="pending">
                    Pending
                  </option>
                  <option value="overdue">
                    Overdue
                  </option>
                  <option value="submitted">
                    Submitted
                  </option>
                  <option value="late">
                    Submitted Late
                  </option>
                  <option value="graded">
                    Graded
                  </option>
                </select>
              </div>

              <select
                className="assignment-select"
                value={courseFilter}
                onChange={(event) =>
                  setCourseFilter(event.target.value)
                }
              >
                <option value="ALL">
                  All Courses
                </option>

                {courses.map((course) => (
                  <option
                    key={course.id}
                    value={course.id}
                  >
                    {course.code || course.name}
                  </option>
                ))}
              </select>
            </section>

            <div className="assignment-section-heading">
              <h2>My Assignments</h2>

              <span className="assignment-count">
                {filteredAssignments.length}{" "}
                {filteredAssignments.length === 1
                  ? "assignment"
                  : "assignments"}
              </span>
            </div>

            {filteredAssignments.length === 0 ? (
              <div className="assignment-empty">
                <div className="assignment-empty-icon">
                  <FileText size={25} />
                </div>

                <h3>
                  {assignments.length === 0
                    ? "No assignments found"
                    : "No matching assignments"}
                </h3>

                <p>
                  {assignments.length === 0
                    ? "Assignments assigned to your enrolled courses will appear here."
                    : "Try changing your search or filters."}
                </p>
              </div>
            ) : (
              <div className="assignment-list">
                {filteredAssignments.map(
                  (assignment) => {
                    const status =
                      getAssignmentStatus(
                        assignment
                      );

                    const StatusIcon = status.icon;
                    const submission =
                      getSubmission(assignment);

                    return (
                      <article
                        className="assignment-card"
                        key={assignment.id}
                      >
                        <div className="assignment-card-top">
                          <div>
                            <h3>
                              {assignment.title ||
                                "Assignment"}
                            </h3>

                            <div className="assignment-course">
                              {getCourseLabel(
                                assignment
                              )}
                            </div>
                          </div>

                          <span
                            className={`assignment-status ${status.className}`}
                          >
                            <StatusIcon size={12} />
                            {status.label}
                          </span>
                        </div>

                        <div className="assignment-divider" />

                        <div className="assignment-description">
                          {assignment.description ||
                            "No description provided."}
                        </div>

                        <div className="assignment-info-row">
                          <div className="assignment-info">
                            <CalendarDays size={16} />

                            <div>
                              <span>Due Date</span>
                              <strong>
                                {formatDate(
                                  assignment.dueDate
                                )}
                              </strong>
                            </div>
                          </div>

                          <div className="assignment-info">
                            <BookOpen size={16} />

                            <div>
                              <span>Maximum Marks</span>
                              <strong>
                                {assignment.maxMarks ??
                                  "-"}
                              </strong>
                            </div>
                          </div>

                          <div className="assignment-info">
                            <UserRound size={16} />

                            <div>
                              <span>Faculty</span>
                              <strong>
                                {getFacultyName(
                                  assignment
                                )}
                              </strong>
                            </div>
                          </div>

                          <div className="assignment-info">
                            <FileText size={16} />

                            <div>
                              <span>Submission</span>
                              <strong>
                                {submission
                                  ? submission.status ||
                                    "Submitted"
                                  : "Not submitted"}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {submission &&
                          submission.status ===
                            "GRADED" && (
                            <div className="assignment-result">
                              <div className="assignment-result-header">
                                <span className="assignment-result-title">
                                  Result
                                </span>

                                <span className="assignment-status assignment-status-graded">
                                  <CheckCircle2
                                    size={11}
                                  />
                                  Graded
                                </span>
                              </div>

                              <div className="assignment-result-values">
                                <div className="assignment-result-value">
                                  <span>
                                    Marks
                                  </span>
                                  <strong>
                                    {submission.marksObtained ??
                                      "-"}{" "}
                                    /{" "}
                                    {assignment.maxMarks ??
                                      "-"}
                                  </strong>
                                </div>

                                <div className="assignment-result-value">
                                  <span>
                                    Submitted
                                  </span>
                                  <strong>
                                    {formatDate(
                                      submission.submittedAt
                                    )}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          )}

                        <div className="assignment-card-footer">
                          <button
                            type="button"
                            className="assignment-details-btn"
                            onClick={() =>
                              openAssignment(
                                assignment
                              )
                            }
                          >
                            View Details
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </>
        )}
      </div>

      {selectedAssignment && (
        <div
          className="assignment-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !uploading
            ) {
              closeModal();
            }
          }}
        >
          <div className="assignment-modal">
            <div className="assignment-modal-header">
              <div>
                <h2>
                  {selectedAssignment.title ||
                    "Assignment Details"}
                </h2>

                <p>
                  {getCourseLabel(
                    selectedAssignment
                  )}
                </p>
              </div>

              <button
                type="button"
                className="assignment-modal-close"
                onClick={closeModal}
                disabled={uploading}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="assignment-modal-body">
              <div className="assignment-modal-description">
                {selectedAssignment.description ||
                  "No description provided."}
              </div>

              <div className="assignment-modal-info">
                <div className="assignment-modal-info-box">
                  <span>Due Date</span>
                  <strong>
                    {formatDateTime(
                      selectedAssignment.dueDate
                    )}
                  </strong>
                </div>

                <div className="assignment-modal-info-box">
                  <span>Maximum Marks</span>
                  <strong>
                    {selectedAssignment.maxMarks ?? "-"}
                  </strong>
                </div>

                <div className="assignment-modal-info-box">
                  <span>Course</span>
                  <strong>
                    {selectedAssignment.course
                      ?.name || "-"}
                  </strong>
                </div>

                <div className="assignment-modal-info-box">
                  <span>Faculty</span>
                  <strong>
                    {getFacultyName(
                      selectedAssignment
                    )}
                  </strong>
                </div>
              </div>

              <div className="assignment-submission-box">
                <h3>My Submission</h3>

                {selectedAssignment.submission
                  ?.fileUrl && (
                  <div className="existing-file">
                    <div className="existing-file-icon">
                      <FileText size={17} />
                    </div>

                    <div className="existing-file-info">
                      <strong>
                        {selectedAssignment.submission
                          .fileName ||
                          "Submitted File"}
                      </strong>

                      <span>
                        Submitted{" "}
                        {formatDateTime(
                          selectedAssignment
                            .submission
                            .submittedAt
                        )}
                      </span>
                    </div>

                    <a
                      className="file-download"
                      href={`${API_BASE_URL.replace(
                        "/api",
                        ""
                      )}${
                        selectedAssignment.submission
                          .fileUrl
                      }`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={14} />
                      Open
                    </a>
                  </div>
                )}

                <label
                  className="file-upload-area"
                  htmlFor="assignment-file-input"
                >
                  <Upload size={23} />

                  <strong>
                    {selectedAssignment.submission
                      ? "Choose file to resubmit"
                      : "Choose assignment file"}
                  </strong>

                  <span>
                    Click here to select your file
                  </span>

                  <input
                    id="assignment-file-input"
                    ref={fileInputRef}
                    type="file"
                    hidden
                    onChange={handleFileChange}
                    disabled={uploading}
                  />

                  {selectedFile && (
                    <div className="selected-file">
                      Selected:{" "}
                      <strong>
                        {selectedFile.name}
                      </strong>
                    </div>
                  )}
                </label>

                {selectedAssignment.submission
                  ?.status === "GRADED" && (
                  <div className="graded-remarks">
                    <strong>Marks:</strong>{" "}
                    {selectedAssignment.submission
                      .marksObtained ?? "-"}{" "}
                    /{" "}
                    {selectedAssignment.maxMarks ?? "-"}
                    {selectedAssignment.submission
                      .remarks && (
                      <>
                        <br />
                        <strong>Remarks:</strong>{" "}
                        {
                          selectedAssignment.submission
                            .remarks
                        }
                      </>
                    )}
                  </div>
                )}

                {submitMessage && (
                  <div className="submission-message">
                    <CheckCircle2 size={15} />
                    {submitMessage}
                  </div>
                )}

                <div className="submission-actions">
                  <button
                    type="button"
                    className="cancel-submit"
                    onClick={closeModal}
                    disabled={uploading}
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    className="submit-assignment-btn"
                    onClick={handleSubmit}
                    disabled={
                      uploading || !selectedFile
                    }
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={14} />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        {selectedAssignment.submission
                          ? "Resubmit Assignment"
                          : "Submit Assignment"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}