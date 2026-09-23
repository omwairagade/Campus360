// src/pages/AdminExams.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ClipboardList,
  Edit,
  Eye,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api";

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  localStorage.getItem("authToken");

const getAuthHeaders = () => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const emptyForm = {
  title: "",
  examType: "",
  examDate: "",
  maxMarks: "100",
  courseId: "",
  facultyId: "",
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTimeLocal = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
};

const getFacultyName = (faculty) => {
  if (!faculty) return "Not assigned";

  if (faculty.user) {
    const name = `${faculty.user.firstName || ""} ${
      faculty.user.lastName || ""
    }`.trim();

    if (name) return name;

    if (faculty.user.email) return faculty.user.email;
  }

  const name = `${faculty.firstName || ""} ${
    faculty.lastName || ""
  }`.trim();

  return name || faculty.email || `Faculty #${faculty.id}`;
};

const getCourseName = (course) => {
  if (!course) return "Unknown course";

  if (course.code && course.name) {
    return `${course.code} - ${course.name}`;
  }

  return course.name || course.code || `Course #${course.id}`;
};

const getSemester = (course) => {
  if (!course) return "-";

  return course.semester ?? "-";
};

const getExamTypeLabel = (type) => {
  if (!type) return "-";

  return type
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

function AdminExams() {
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculties, setFaculties] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [semester, setSemester] = useState("");
  const [examType, setExamType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [selectedExam, setSelectedExam] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [showFilters, setShowFilters] = useState(false);

  const semesters = useMemo(() => {
    const values = courses
      .map((course) => course.semester)
      .filter(
        (value) => value !== null && value !== undefined && value !== ""
      );

    return [...new Set(values)].sort((a, b) => Number(a) - Number(b));
  }, [courses]);

  const examTypes = useMemo(() => {
    const values = exams
      .map((exam) => exam.examType)
      .filter(Boolean);

    return [...new Set(values)].sort();
  }, [exams]);

  const loadOptions = async () => {
    setLoadingOptions(true);

    try {
      const headers = getAuthHeaders();

      const [coursesResponse, facultiesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/courses`, {
          headers,
        }),
        fetch(`${API_BASE_URL}/faculty`, {
          headers,
        }),
      ]);

      if (coursesResponse.status === 401 || facultiesResponse.status === 401) {
        handleUnauthorized();
        return;
      }

      const coursesData = await coursesResponse.json().catch(() => ({}));
      const facultiesData = await facultiesResponse.json().catch(() => ({}));

      if (coursesResponse.ok) {
        const courseList =
          coursesData.courses ||
          coursesData.data ||
          coursesData.records ||
          [];

        setCourses(Array.isArray(courseList) ? courseList : []);
      }

      if (facultiesResponse.ok) {
        const facultyList =
          facultiesData.faculties ||
          facultiesData.data ||
          facultiesData.records ||
          [];

        setFaculties(Array.isArray(facultyList) ? facultyList : []);
      }
    } catch (err) {
      console.error("Failed to load exam options:", err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("authToken");
    localStorage.removeItem("loggedInUser");

    window.location.href = "/login";
  };

  const loadExams = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) params.set("search", search.trim());
      if (courseId) params.set("courseId", courseId);
      if (facultyId) params.set("facultyId", facultyId);
      if (semester) params.set("semester", semester);
      if (examType) params.set("examType", examType);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);

      const query = params.toString();

      const response = await fetch(
        `${API_BASE_URL}/admin/exams${query ? `?${query}` : ""}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to load exams."
        );
      }

      const list = data.exams || data.data || [];

      setExams(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load exams:", err);
      setError(err.message || "Failed to load exams.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadExams();
    }, 250);

    return () => clearTimeout(timer);
  }, [
    search,
    courseId,
    facultyId,
    semester,
    examType,
    fromDate,
    toDate,
  ]);

  const resetFilters = () => {
    setSearch("");
    setCourseId("");
    setFacultyId("");
    setSemester("");
    setExamType("");
    setFromDate("");
    setToDate("");
  };

  const openCreateForm = () => {
    setEditingExam(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (exam) => {
    setEditingExam(exam);

    setForm({
      title: exam.title || "",
      examType: exam.examType || "",
      examDate: formatDateTimeLocal(exam.examDate),
      maxMarks: String(exam.maxMarks ?? 100),
      courseId: String(exam.courseId ?? exam.course?.id ?? ""),
      facultyId: exam.facultyId ? String(exam.facultyId) : "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingExam(null);
    setForm(emptyForm);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Exam title is required.");
      return;
    }

    if (!form.examType.trim()) {
      setError("Exam type is required.");
      return;
    }

    if (!form.examDate) {
      setError("Exam date is required.");
      return;
    }

    if (!form.courseId) {
      setError("Please select a course.");
      return;
    }

    const maxMarks = Number(form.maxMarks);

    if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
      setError("Maximum marks must be greater than 0.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        examType: form.examType.trim(),
        examDate: new Date(form.examDate).toISOString(),
        maxMarks,
        courseId: Number(form.courseId),
        facultyId: form.facultyId ? Number(form.facultyId) : null,
      };

      const url = editingExam
        ? `${API_BASE_URL}/admin/exams/${editingExam.id}`
        : `${API_BASE_URL}/admin/exams`;

      const response = await fetch(url, {
        method: editingExam ? "PATCH" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `Failed to ${editingExam ? "update" : "create"} exam.`
        );
      }

      setSuccess(
        editingExam
          ? "Exam updated successfully."
          : "Exam created successfully."
      );

      setShowForm(false);
      setEditingExam(null);
      setForm(emptyForm);

      await loadExams();
    } catch (err) {
      console.error("Failed to save exam:", err);
      setError(err.message || "Failed to save exam.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exam) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${exam.title}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/exams/${exam.id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to delete exam."
        );
      }

      setSuccess("Exam deleted successfully.");

      if (selectedExam?.id === exam.id) {
        setSelectedExam(null);
      }

      await loadExams();
    } catch (err) {
      console.error("Failed to delete exam:", err);
      setError(err.message || "Failed to delete exam.");
    }
  };

  const openDetails = async (exam) => {
    setSelectedExam(null);
    setLoadingDetails(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/exams/${exam.id}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to load exam details."
        );
      }

      setSelectedExam(data.exam || data.data || exam);
    } catch (err) {
      console.error("Failed to load exam details:", err);
      setError(err.message || "Failed to load exam details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const activeFilterCount = [
    courseId,
    facultyId,
    semester,
    examType,
    fromDate,
    toDate,
  ].filter(Boolean).length;

  return (
    <div className="admin-exams-page">
      <style>{`
        .admin-exams-page {
          min-height: 100vh;
          background: #f6f8fb;
          padding: 24px;
          color: #172033;
          box-sizing: border-box;
        }

        .admin-exams-container {
          max-width: 1500px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .page-title-section {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .page-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e9efff;
          color: #315bea;
        }

        .page-title {
          margin: 0;
          font-size: 28px;
          font-weight: 750;
          letter-spacing: -0.5px;
        }

        .page-subtitle {
          margin: 5px 0 0;
          color: #6b7280;
          font-size: 14px;
        }

        .primary-button {
          border: none;
          border-radius: 10px;
          padding: 11px 16px;
          background: #315bea;
          color: white;
          font-size: 14px;
          font-weight: 650;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: 0.2s;
        }

        .primary-button:hover {
          background: #2448c8;
        }

        .secondary-button {
          border: 1px solid #d9deea;
          border-radius: 10px;
          padding: 10px 14px;
          background: white;
          color: #374151;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .secondary-button:hover {
          background: #f8fafc;
        }

        .toolbar {
          background: white;
          border: 1px solid #e5e9f1;
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 18px;
          box-shadow: 0 2px 8px rgba(16, 24, 40, 0.04);
        }

        .toolbar-top {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .search-box {
          position: relative;
          flex: 1;
        }

        .search-box svg {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #8a93a3;
        }

        .search-input {
          width: 100%;
          box-sizing: border-box;
          height: 42px;
          border: 1px solid #dfe4ed;
          border-radius: 10px;
          padding: 0 14px 0 42px;
          font-size: 14px;
          outline: none;
          color: #172033;
          background: white;
        }

        .search-input:focus,
        .form-input:focus,
        .form-select:focus {
          border-color: #315bea;
          box-shadow: 0 0 0 3px rgba(49, 91, 234, 0.1);
        }

        .filter-toggle {
          height: 42px;
          padding: 0 14px;
          border: 1px solid #dfe4ed;
          border-radius: 10px;
          background: white;
          color: #374151;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          white-space: nowrap;
        }

        .filter-badge {
          min-width: 20px;
          height: 20px;
          padding: 0 5px;
          border-radius: 10px;
          background: #315bea;
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid #eef1f5;
        }

        .filter-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-field label,
        .form-field label {
          font-size: 12px;
          font-weight: 650;
          color: #4b5563;
        }

        .filter-field select,
        .filter-field input {
          height: 40px;
          box-sizing: border-box;
          width: 100%;
          border: 1px solid #dfe4ed;
          border-radius: 9px;
          padding: 0 11px;
          background: white;
          outline: none;
          color: #172033;
        }

        .filter-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 12px;
        }

        .alert {
          padding: 12px 14px;
          border-radius: 10px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .alert-error {
          background: #fff0f0;
          border: 1px solid #ffcaca;
          color: #b42318;
        }

        .alert-success {
          background: #ecfdf3;
          border: 1px solid #b7ebc9;
          color: #16794a;
        }

        .summary-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .summary-card {
          background: white;
          border: 1px solid #e5e9f1;
          border-radius: 14px;
          padding: 17px;
          box-shadow: 0 2px 8px rgba(16, 24, 40, 0.04);
        }

        .summary-label {
          color: #737d8d;
          font-size: 13px;
          margin-bottom: 7px;
        }

        .summary-value {
          font-size: 24px;
          font-weight: 750;
          color: #172033;
        }

        .table-card {
          background: white;
          border: 1px solid #e5e9f1;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(16, 24, 40, 0.04);
        }

        .table-header {
          padding: 16px 18px;
          border-bottom: 1px solid #edf0f5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .table-title {
          font-size: 16px;
          font-weight: 700;
        }

        .table-count {
          color: #7a8494;
          font-size: 13px;
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
        }

        th {
          text-align: left;
          background: #f9fafc;
          color: #697386;
          font-size: 11px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          padding: 13px 16px;
          border-bottom: 1px solid #e9edf3;
          white-space: nowrap;
        }

        td {
          padding: 15px 16px;
          border-bottom: 1px solid #eef1f5;
          font-size: 13px;
          vertical-align: middle;
        }

        tbody tr:hover {
          background: #fafcff;
        }

        .exam-title {
          font-weight: 700;
          color: #172033;
          margin-bottom: 4px;
        }

        .exam-id {
          font-size: 11px;
          color: #8992a1;
        }

        .course-cell {
          min-width: 180px;
        }

        .course-code {
          font-weight: 700;
          color: #315bea;
          margin-bottom: 3px;
        }

        .course-name {
          color: #626d7d;
          line-height: 1.35;
        }

        .faculty-cell {
          min-width: 150px;
        }

        .faculty-name {
          color: #374151;
          font-weight: 600;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .badge-type {
          background: #eef2ff;
          color: #4054b2;
        }

        .badge-results {
          background: #ecfdf3;
          color: #177245;
        }

        .badge-no-results {
          background: #f3f4f6;
          color: #687181;
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .icon-button {
          width: 34px;
          height: 34px;
          border: 1px solid #e1e5ec;
          border-radius: 8px;
          background: white;
          color: #596273;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .icon-button:hover {
          background: #f7f9fc;
          color: #315bea;
        }

        .icon-button.delete:hover {
          color: #c62828;
          border-color: #f0caca;
          background: #fff6f6;
        }

        .empty-state {
          text-align: center;
          padding: 55px 20px;
          color: #788394;
        }

        .empty-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 12px;
          border-radius: 12px;
          background: #f0f3f8;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8a94a5;
        }

        .empty-title {
          color: #374151;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .loading-state {
          padding: 55px 20px;
          text-align: center;
          color: #737d8d;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }

        .modal {
          width: min(680px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          border-radius: 16px;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.2);
        }

        .modal-large {
          width: min(900px, 100%);
        }

        .modal-header {
          padding: 18px 20px;
          border-bottom: 1px solid #edf0f5;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .modal-title {
          margin: 0;
          font-size: 19px;
          font-weight: 750;
        }

        .close-button {
          width: 34px;
          height: 34px;
          border: none;
          background: #f4f6f9;
          color: #596273;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .modal-body {
          padding: 20px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .form-field.full {
          grid-column: 1 / -1;
        }

        .form-input,
        .form-select {
          width: 100%;
          height: 42px;
          box-sizing: border-box;
          border: 1px solid #dfe4ed;
          border-radius: 9px;
          padding: 0 12px;
          outline: none;
          color: #172033;
          background: white;
          font-size: 14px;
        }

        .form-help {
          font-size: 11px;
          color: #8992a1;
          margin-top: -2px;
        }

        .modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #edf0f5;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 22px;
        }

        .detail-item {
          border: 1px solid #edf0f5;
          border-radius: 10px;
          padding: 13px;
          background: #fafbfd;
        }

        .detail-label {
          color: #7a8494;
          font-size: 11px;
          font-weight: 650;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .detail-value {
          color: #273142;
          font-size: 14px;
          font-weight: 650;
        }

        .results-section-title {
          font-size: 15px;
          font-weight: 750;
          margin-bottom: 10px;
        }

        .results-wrapper {
          border: 1px solid #e8ebf1;
          border-radius: 10px;
          overflow: auto;
        }

        .results-wrapper table {
          min-width: 650px;
        }

        .results-wrapper th,
        .results-wrapper td {
          padding: 11px 13px;
        }

        .mobile-summary {
          display: none;
        }

        @media (max-width: 1000px) {
          .filter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .summary-row {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 700px) {
          .admin-exams-page {
            padding: 14px;
          }

          .page-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .page-title {
            font-size: 23px;
          }

          .page-icon {
            width: 44px;
            height: 44px;
          }

          .toolbar-top {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-toggle {
            justify-content: center;
          }

          .filter-grid {
            grid-template-columns: 1fr;
          }

          .summary-row {
            grid-template-columns: 1fr;
          }

          .form-grid,
          .details-grid {
            grid-template-columns: 1fr;
          }

          .form-field.full {
            grid-column: auto;
          }

          .modal-overlay {
            padding: 10px;
          }

          .modal {
            max-height: 94vh;
          }
        }
      `}</style>

      <div className="admin-exams-container">
        <div className="page-header">
          <div className="page-title-section">
            <div className="page-icon">
              <ClipboardList size={26} />
            </div>

            <div>
              <h1 className="page-title">Exams</h1>
              <p className="page-subtitle">
                Manage examinations, schedules and results
              </p>
            </div>
          </div>

          <button className="primary-button" onClick={openCreateForm}>
            <Plus size={18} />
            Create Exam
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        <div className="toolbar">
          <div className="toolbar-top">
            <div className="search-box">
              <Search size={18} />

              <input
                className="search-input"
                type="text"
                placeholder="Search by exam, course or faculty..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <button
              className="filter-toggle"
              onClick={() => setShowFilters((value) => !value)}
            >
              <Filter size={17} />
              Filters

              {activeFilterCount > 0 && (
                <span className="filter-badge">
                  {activeFilterCount}
                </span>
              )}

              <ChevronDown
                size={15}
                style={{
                  transform: showFilters
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "0.2s",
                }}
              />
            </button>

            <button
              className="secondary-button"
              onClick={loadExams}
              title="Refresh"
            >
              <RefreshCw
                size={16}
                className={loading ? "spinner" : ""}
              />
              Refresh
            </button>
          </div>

          {showFilters && (
            <>
              <div className="filter-grid">
                <div className="filter-field">
                  <label>Course</label>

                  <select
                    value={courseId}
                    onChange={(event) => setCourseId(event.target.value)}
                  >
                    <option value="">All courses</option>

                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {getCourseName(course)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Faculty</label>

                  <select
                    value={facultyId}
                    onChange={(event) => setFacultyId(event.target.value)}
                  >
                    <option value="">All faculty</option>

                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {getFacultyName(faculty)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Semester</label>

                  <select
                    value={semester}
                    onChange={(event) => setSemester(event.target.value)}
                  >
                    <option value="">All semesters</option>

                    {semesters.map((value) => (
                      <option key={value} value={value}>
                        Semester {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>Exam Type</label>

                  <select
                    value={examType}
                    onChange={(event) => setExamType(event.target.value)}
                  >
                    <option value="">All types</option>

                    {examTypes.map((value) => (
                      <option key={value} value={value}>
                        {getExamTypeLabel(value)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-field">
                  <label>From Date</label>

                  <input
                    type="date"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                  />
                </div>

                <div className="filter-field">
                  <label>To Date</label>

                  <input
                    type="date"
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                  />
                </div>
              </div>

              <div className="filter-actions">
                <button
                  className="secondary-button"
                  onClick={resetFilters}
                >
                  Reset Filters
                </button>
              </div>
            </>
          )}
        </div>

        <div className="summary-row">
          <div className="summary-card">
            <div className="summary-label">Total Exams</div>
            <div className="summary-value">{exams.length}</div>
          </div>

          <div className="summary-card">
            <div className="summary-label">With Results</div>
            <div className="summary-value">
              {
                exams.filter(
                  (exam) => (exam._count?.results || 0) > 0
                ).length
              }
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-label">Courses Covered</div>
            <div className="summary-value">
              {
                new Set(
                  exams
                    .map(
                      (exam) =>
                        exam.courseId || exam.course?.id
                    )
                    .filter(Boolean)
                ).size
              }
            </div>
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div>
              <div className="table-title">Exam Records</div>
              <div className="table-count">
                {loading
                  ? "Loading..."
                  : `${exams.length} exam${
                      exams.length === 1 ? "" : "s"
                    } found`}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <RefreshCw
                size={26}
                className="spinner"
                style={{ marginBottom: 10 }}
              />
              <div>Loading exams...</div>
            </div>
          ) : exams.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <ClipboardList size={23} />
              </div>

              <div className="empty-title">
                No exams found
              </div>

              <div>
                Try changing the filters or create a new exam.
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Exam</th>
                    <th>Course</th>
                    <th>Faculty</th>
                    <th>Exam Date</th>
                    <th>Type</th>
                    <th>Max Marks</th>
                    <th>Results</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {exams.map((exam) => {
                    const resultCount =
                      exam._count?.results || 0;

                    return (
                      <tr key={exam.id}>
                        <td>
                          <div className="exam-title">
                            {exam.title}
                          </div>

                          <div className="exam-id">
                            ID: #{exam.id}
                          </div>
                        </td>

                        <td>
                          <div className="course-cell">
                            <div className="course-code">
                              {exam.course?.code || "-"}
                            </div>

                            <div className="course-name">
                              {exam.course?.name ||
                                "Unknown course"}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="faculty-cell">
                            <div className="faculty-name">
                              {getFacultyName(exam.faculty)}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                            }}
                          >
                            <Calendar size={15} color="#7b8494" />
                            {formatDate(exam.examDate)}
                          </div>
                        </td>

                        <td>
                          <span className="badge badge-type">
                            {getExamTypeLabel(exam.examType)}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {exam.maxMarks}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`badge ${
                              resultCount > 0
                                ? "badge-results"
                                : "badge-no-results"
                            }`}
                          >
                            {resultCount} result
                            {resultCount === 1 ? "" : "s"}
                          </span>
                        </td>

                        <td>
                          <div className="actions">
                            <button
                              className="icon-button"
                              title="View details"
                              onClick={() => openDetails(exam)}
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              className="icon-button"
                              title="Edit exam"
                              onClick={() =>
                                openEditForm(exam)
                              }
                            >
                              <Edit size={16} />
                            </button>

                            <button
                              className="icon-button delete"
                              title="Delete exam"
                              onClick={() =>
                                handleDelete(exam)
                              }
                            >
                              <Trash2 size={16} />
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
        </div>
      </div>

      {showForm && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingExam ? "Edit Exam" : "Create Exam"}
              </h2>

              <button
                className="close-button"
                onClick={closeForm}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-field full">
                    <label>Exam Title *</label>

                    <input
                      className="form-input"
                      name="title"
                      value={form.title}
                      onChange={handleFormChange}
                      placeholder="e.g. Data Structures Mid-Term"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Exam Type *</label>

                    <input
                      className="form-input"
                      name="examType"
                      value={form.examType}
                      onChange={handleFormChange}
                      placeholder="e.g. MIDTERM, ENDSEM"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Exam Date *</label>

                    <input
                      className="form-input"
                      type="datetime-local"
                      name="examDate"
                      value={form.examDate}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Maximum Marks *</label>

                    <input
                      className="form-input"
                      type="number"
                      name="maxMarks"
                      min="1"
                      step="1"
                      value={form.maxMarks}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Course *</label>

                    <select
                      className="form-select"
                      name="courseId"
                      value={form.courseId}
                      onChange={handleFormChange}
                      required
                      disabled={loadingOptions}
                    >
                      <option value="">
                        {loadingOptions
                          ? "Loading courses..."
                          : "Select course"}
                      </option>

                      {courses.map((course) => (
                        <option
                          key={course.id}
                          value={course.id}
                        >
                          {getCourseName(course)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field full">
                    <label>Faculty</label>

                    <select
                      className="form-select"
                      name="facultyId"
                      value={form.facultyId}
                      onChange={handleFormChange}
                      disabled={loadingOptions}
                    >
                      <option value="">
                        No faculty assigned
                      </option>

                      {faculties.map((faculty) => (
                        <option
                          key={faculty.id}
                          value={faculty.id}
                        >
                          {getFacultyName(faculty)}
                        </option>
                      ))}
                    </select>

                    <div className="form-help">
                      Faculty is optional. If the selected course already
                      has a faculty assigned, the backend may require the
                      same faculty.
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="spinner"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      {editingExam
                        ? "Update Exam"
                        : "Create Exam"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(selectedExam || loadingDetails) && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !loadingDetails
            ) {
              setSelectedExam(null);
            }
          }}
        >
          <div className="modal modal-large">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  {selectedExam?.title || "Exam Details"}
                </h2>

                {selectedExam && (
                  <div
                    style={{
                      color: "#7a8494",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    Exam #{selectedExam.id}
                  </div>
                )}
              </div>

              <button
                className="close-button"
                onClick={() => setSelectedExam(null)}
                disabled={loadingDetails}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {loadingDetails ? (
                <div className="loading-state">
                  <RefreshCw
                    size={26}
                    className="spinner"
                    style={{ marginBottom: 10 }}
                  />
                  <div>Loading exam details...</div>
                </div>
              ) : selectedExam ? (
                <>
                  <div className="details-grid">
                    <div className="detail-item">
                      <div className="detail-label">
                        Exam Title
                      </div>

                      <div className="detail-value">
                        {selectedExam.title}
                      </div>
                    </div>

                    <div className="detail-item">
                      <div className="detail-label">
                        Exam Type
                      </div>

                      <div className="detail-value">
                        {getExamTypeLabel(
                          selectedExam.examType
                        )}
                      </div>
                    </div>

                    <div className="detail-item">
                      <div className="detail-label">
                        Exam Date
                      </div>

                      <div className="detail-value">
                        {formatDate(selectedExam.examDate)}
                      </div>
                    </div>

                    <div className="detail-item">
                      <div className="detail-label">
                        Maximum Marks
                      </div>

                      <div className="detail-value">
                        {selectedExam.maxMarks}
                      </div>
                    </div>

                    <div className="detail-item">
                      <div className="detail-label">
                        Course
                      </div>

                      <div className="detail-value">
                        {getCourseName(selectedExam.course)}
                      </div>
                    </div>

                    <div className="detail-item">
                      <div className="detail-label">
                        Semester
                      </div>

                      <div className="detail-value">
                        {getSemester(selectedExam.course)}
                      </div>
                    </div>

                    <div className="detail-item">
                      <div className="detail-label">
                        Faculty
                      </div>

                      <div className="detail-value">
                        {getFacultyName(selectedExam.faculty)}
                      </div>
                    </div>

                    <div className="detail-item">
                      <div className="detail-label">
                        Results
                      </div>

                      <div className="detail-value">
                        {selectedExam.results?.length ??
                          selectedExam._count?.results ??
                          0}
                      </div>
                    </div>
                  </div>

                  <div className="results-section-title">
                    Exam Results
                  </div>

                  {selectedExam.results &&
                  selectedExam.results.length > 0 ? (
                    <div className="results-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Email</th>
                            <th>Marks</th>
                            <th>Grade</th>
                            <th>Grade Point</th>
                          </tr>
                        </thead>

                        <tbody>
                          {selectedExam.results.map(
                            (result) => {
                              const student = result.student;
                              const user = student?.user;

                              const studentName =
                                `${user?.firstName || ""} ${
                                  user?.lastName || ""
                                }`.trim() ||
                                `Student #${result.studentId}`;

                              return (
                                <tr key={result.id}>
                                  <td>
                                    <strong>
                                      {studentName}
                                    </strong>
                                  </td>

                                  <td>
                                    {user?.email || "-"}
                                  </td>

                                  <td>
                                    {result.marksObtained} /{" "}
                                    {selectedExam.maxMarks}
                                  </td>

                                  <td>
                                    {result.grade || "-"}
                                  </td>

                                  <td>
                                    {result.gradePoint ??
                                      "-"}
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <ClipboardList size={22} />
                      </div>

                      <div className="empty-title">
                        No results recorded
                      </div>

                      <div>
                        No student results have been added for
                        this exam yet.
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="modal-footer">
              <button
                className="secondary-button"
                onClick={() => setSelectedExam(null)}
              >
                Close
              </button>

              {selectedExam && (
                <button
                  className="primary-button"
                  onClick={() => {
                    setSelectedExam(null);
                    openEditForm(selectedExam);
                  }}
                >
                  <Edit size={16} />
                  Edit Exam
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminExams;