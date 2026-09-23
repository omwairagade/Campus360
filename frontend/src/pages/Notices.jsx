import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Clock,
  RefreshCw,
  Search,
  AlertCircle,
  Megaphone,
  Info,
  GraduationCap,
  FileText,
  Filter,
  X,
  ChevronRight,
} from "lucide-react";

import { apiGet, logoutUser } from "../api";

const Notices = () => {
  const navigate = useNavigate();

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [priority, setPriority] = useState("ALL");

  const [selectedNotice, setSelectedNotice] = useState(null);

  const fetchNotices = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await apiGet("/notices/published");

      const data = response?.data ?? response;

      const noticeList = Array.isArray(data?.notices)
        ? data.notices
        : Array.isArray(data?.data?.notices)
        ? data.data.notices
        : Array.isArray(data)
        ? data
        : [];

      setNotices(noticeList);
    } catch (err) {
      console.error("Fetch notices error:", err);

      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load notices.";

      setError(message);

      const authError = /token|authentication|unauthorized|forbidden|401|403/i.test(
        message
      );

      if (authError) {
        logoutUser();
        navigate("/");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const categories = useMemo(() => {
    const values = notices
      .map((notice) => String(notice?.category || "GENERAL").toUpperCase())
      .filter(Boolean);

    return ["ALL", ...new Set(values)];
  }, [notices]);

  const priorities = useMemo(() => {
    const values = notices
      .map((notice) => String(notice?.priority || "NORMAL").toUpperCase())
      .filter(Boolean);

    return ["ALL", ...new Set(values)];
  }, [notices]);

  const filteredNotices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notices.filter((notice) => {
      const title = String(notice?.title || "").toLowerCase();
      const message = String(notice?.message || "").toLowerCase();
      const noticeCategory = String(
        notice?.category || "GENERAL"
      ).toUpperCase();
      const noticePriority = String(
        notice?.priority || "NORMAL"
      ).toUpperCase();

      const matchesSearch =
        !query ||
        title.includes(query) ||
        message.includes(query) ||
        noticeCategory.toLowerCase().includes(query);

      const matchesCategory =
        category === "ALL" || noticeCategory === category;

      const matchesPriority =
        priority === "ALL" || noticePriority === priority;

      return matchesSearch && matchesCategory && matchesPriority;
    });
  }, [notices, search, category, priority]);

  const highPriorityCount = useMemo(
    () =>
      notices.filter(
        (notice) =>
          String(notice?.priority || "").toUpperCase() === "HIGH"
      ).length,
    [notices]
  );

  const urgentCount = useMemo(
    () =>
      notices.filter(
        (notice) =>
          String(notice?.priority || "").toUpperCase() === "URGENT"
      ).length,
    [notices]
  );

  const formatDate = (value) => {
    if (!value) return "Not specified";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not specified";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (value) => {
    if (!value) return "Not specified";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not specified";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCategoryIcon = (value) => {
    const normalized = String(value || "GENERAL").toUpperCase();

    if (
      normalized.includes("EXAM") ||
      normalized.includes("ACADEMIC")
    ) {
      return GraduationCap;
    }

    if (
      normalized.includes("ASSIGN") ||
      normalized.includes("NOTICE")
    ) {
      return FileText;
    }

    if (
      normalized.includes("EVENT") ||
      normalized.includes("ACTIVITY")
    ) {
      return Megaphone;
    }

    return Info;
  };

  const getCategoryClass = (value) => {
    const normalized = String(value || "GENERAL").toUpperCase();

    if (
      normalized.includes("EXAM") ||
      normalized.includes("ACADEMIC")
    ) {
      return "category-academic";
    }

    if (
      normalized.includes("EVENT") ||
      normalized.includes("ACTIVITY")
    ) {
      return "category-event";
    }

    if (
      normalized.includes("ASSIGN") ||
      normalized.includes("NOTICE")
    ) {
      return "category-notice";
    }

    return "category-general";
  };

  const getPriorityClass = (value) => {
    const normalized = String(value || "NORMAL").toUpperCase();

    if (normalized === "URGENT") {
      return "priority-urgent";
    }

    if (normalized === "HIGH") {
      return "priority-high";
    }

    if (normalized === "LOW") {
      return "priority-low";
    }

    return "priority-normal";
  };

  const getPriorityLabel = (value) => {
    const normalized = String(value || "NORMAL").toUpperCase();

    if (normalized === "URGENT") return "Urgent";
    if (normalized === "HIGH") return "High";
    if (normalized === "LOW") return "Low";

    return "Normal";
  };

  const getTargetText = (notice) => {
    const targets = [];

    if (notice?.targetSemester !== null && notice?.targetSemester !== undefined) {
      targets.push(`Semester ${notice.targetSemester}`);
    }

    if (notice?.targetBatch) {
      targets.push(`Batch ${notice.targetBatch}`);
    }

    if (notice?.targetDivision) {
      targets.push(`Division ${notice.targetDivision}`);
    }

    if (notice?.targetCourse) {
      if (notice.targetCourse.code) {
        targets.push(notice.targetCourse.code);
      } else if (notice.targetCourse.name) {
        targets.push(notice.targetCourse.name);
      }
    }

    if (targets.length === 0) {
      return "All Students";
    }

    return targets.join(" • ");
  };

  const getCreatorName = (notice) => {
    const firstName =
      notice?.createdBy?.user?.firstName ||
      notice?.createdBy?.firstName ||
      "";

    const lastName =
      notice?.createdBy?.user?.lastName ||
      notice?.createdBy?.lastName ||
      "";

    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || "Campus360 Administration";
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("ALL");
    setPriority("ALL");
  };

  const hasFilters =
    search.trim() !== "" ||
    category !== "ALL" ||
    priority !== "ALL";

  return (
    <div className="notices-page">
      <style>{styles}</style>

      <div className="notices-container">
        {/* Header */}
        <div className="page-header">
          <div className="header-left">
            <button
              className="back-button"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft size={18} />
              <span>Back to Dashboard</span>
            </button>

            <div className="title-section">
              <div className="title-icon">
                <Bell size={25} />
              </div>

              <div>
                <h1>Notices</h1>
                <p>
                  Stay updated with important college announcements
                  and notifications.
                </p>
              </div>
            </div>
          </div>

          <button
            className="refresh-button"
            onClick={() => fetchNotices(true)}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={17}
              className={refreshing ? "spin" : ""}
            />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="error-alert">
            <div className="error-icon">
              <AlertCircle size={20} />
            </div>

            <div className="error-content">
              <strong>Unable to load notices</strong>
              <span>{error}</span>
            </div>

            <button
              className="retry-button"
              onClick={() => fetchNotices()}
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats */}
        {!loading && !error && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">
                <Bell size={21} />
              </div>

              <div>
                <span className="stat-label">Total Notices</span>
                <strong>{notices.length}</strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon orange">
                <AlertCircle size={21} />
              </div>

              <div>
                <span className="stat-label">High Priority</span>
                <strong>{highPriorityCount}</strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon red">
                <Megaphone size={21} />
              </div>

              <div>
                <span className="stat-label">Urgent</span>
                <strong>{urgentCount}</strong>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">
                <FileText size={21} />
              </div>

              <div>
                <span className="stat-label">Showing</span>
                <strong>{filteredNotices.length}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filter-panel">
          <div className="filter-heading">
            <Filter size={18} />
            <span>Find Notices</span>
          </div>

          <div className="filter-row">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search notices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {search && (
                <button
                  className="clear-search"
                  onClick={() => setSearch("")}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="filter-select"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === "ALL"
                    ? "All Categories"
                    : item}
                </option>
              ))}
            </select>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="filter-select"
            >
              {priorities.map((item) => (
                <option key={item} value={item}>
                  {item === "ALL"
                    ? "All Priorities"
                    : item}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                className="clear-filter-button"
                onClick={clearFilters}
              >
                <X size={16} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="loading-grid">
            {[1, 2, 3, 4].map((item) => (
              <div className="notice-skeleton" key={item}>
                <div className="skeleton-line small" />
                <div className="skeleton-line title" />
                <div className="skeleton-line" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            ))}
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Bell size={32} />
            </div>

            <h2>
              {hasFilters
                ? "No matching notices"
                : "No notices available"}
            </h2>

            <p>
              {hasFilters
                ? "Try changing your search or filters."
                : "There are currently no published notices for you."}
            </p>

            {hasFilters && (
              <button
                className="primary-button"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="notice-list">
            {filteredNotices.map((notice) => {
              const CategoryIcon = getCategoryIcon(
                notice.category
              );

              const categoryClass = getCategoryClass(
                notice.category
              );

              const priorityClass = getPriorityClass(
                notice.priority
              );

              return (
                <article
                  className={`notice-card ${priorityClass}`}
                  key={notice.id}
                  onClick={() => setSelectedNotice(notice)}
                >
                  <div className={`notice-icon ${categoryClass}`}>
                    <CategoryIcon size={22} />
                  </div>

                  <div className="notice-main">
                    <div className="notice-top-row">
                      <div className="notice-badges">
                        <span
                          className={`category-badge ${categoryClass}`}
                        >
                          {String(
                            notice.category || "GENERAL"
                          ).toUpperCase()}
                        </span>

                        <span
                          className={`priority-badge ${priorityClass}`}
                        >
                          {getPriorityLabel(notice.priority)}
                        </span>
                      </div>

                      <span className="notice-date">
                        <Calendar size={14} />
                        {formatDate(notice.publishedAt)}
                      </span>
                    </div>

                    <h2>{notice.title}</h2>

                    <p className="notice-preview">
                      {notice.message}
                    </p>

                    <div className="notice-footer">
                      <div className="notice-meta">
                        <span>
                          <Clock size={14} />
                          {formatDateTime(notice.publishedAt)}
                        </span>

                        <span className="target-text">
                          {getTargetText(notice)}
                        </span>
                      </div>

                      <button
                        className="read-more"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedNotice(notice);
                        }}
                      >
                        Read More
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Notice Details Modal */}
      {selectedNotice && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedNotice(null)}
        >
          <div
            className="notice-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-wrapper">
                <div
                  className={`modal-icon ${getCategoryClass(
                    selectedNotice.category
                  )}`}
                >
                  {React.createElement(
                    getCategoryIcon(selectedNotice.category),
                    { size: 22 }
                  )}
                </div>

                <div>
                  <div className="modal-badges">
                    <span
                      className={`category-badge ${getCategoryClass(
                        selectedNotice.category
                      )}`}
                    >
                      {String(
                        selectedNotice.category || "GENERAL"
                      ).toUpperCase()}
                    </span>

                    <span
                      className={`priority-badge ${getPriorityClass(
                        selectedNotice.priority
                      )}`}
                    >
                      {getPriorityLabel(selectedNotice.priority)}
                    </span>
                  </div>

                  <h2>{selectedNotice.title}</h2>
                </div>
              </div>

              <button
                className="modal-close"
                onClick={() => setSelectedNotice(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-content">
              <div className="notice-detail-message">
                {selectedNotice.message}
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <span>Published</span>
                  <strong>
                    {formatDateTime(
                      selectedNotice.publishedAt
                    )}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Expires</span>
                  <strong>
                    {selectedNotice.expiresAt
                      ? formatDateTime(
                          selectedNotice.expiresAt
                        )
                      : "No expiry"}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Audience</span>
                  <strong>
                    {getTargetText(selectedNotice)}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Published By</span>
                  <strong>
                    {getCreatorName(selectedNotice)}
                  </strong>
                </div>
              </div>

              {selectedNotice.targetCourse && (
                <div className="course-target-box">
                  <GraduationCap size={19} />

                  <div>
                    <span>Target Course</span>
                    <strong>
                      {selectedNotice.targetCourse.code
                        ? `${selectedNotice.targetCourse.code} — `
                        : ""}
                      {selectedNotice.targetCourse.name ||
                        "Course"}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="modal-done-button"
                onClick={() => setSelectedNotice(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = `
  * {
    box-sizing: border-box;
  }

  .notices-page {
    min-height: 100vh;
    background: #f5f7fb;
    color: #172033;
    padding: 28px;
  }

  .notices-container {
    width: 100%;
    max-width: 1450px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .header-left {
    min-width: 0;
  }

  .back-button {
    border: 0;
    background: transparent;
    color: #52627a;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0;
    margin-bottom: 18px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .back-button:hover {
    color: #1769ff;
  }

  .title-section {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .title-icon {
    width: 54px;
    height: 54px;
    border-radius: 16px;
    background: #eaf2ff;
    color: #1769ff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .title-section h1 {
    margin: 0 0 5px;
    font-size: 30px;
    line-height: 1.15;
    color: #14213d;
  }

  .title-section p {
    margin: 0;
    color: #69778d;
    font-size: 14px;
  }

  .refresh-button {
    border: 1px solid #dbe3ef;
    background: #ffffff;
    color: #334155;
    border-radius: 10px;
    padding: 10px 15px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(20, 33, 61, 0.04);
  }

  .refresh-button:hover {
    border-color: #1769ff;
    color: #1769ff;
  }

  .refresh-button:disabled {
    opacity: 0.65;
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

  .error-alert {
    display: flex;
    align-items: center;
    gap: 14px;
    background: #fff4f4;
    border: 1px solid #ffd6d6;
    border-radius: 14px;
    padding: 14px 16px;
    margin-bottom: 20px;
  }

  .error-icon {
    color: #dc2626;
    display: flex;
  }

  .error-content {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
  }

  .error-content strong {
    font-size: 14px;
    color: #991b1b;
  }

  .error-content span {
    color: #7f1d1d;
    font-size: 13px;
  }

  .retry-button {
    border: 0;
    background: #dc2626;
    color: white;
    border-radius: 8px;
    padding: 8px 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 20px;
  }

  .stat-card {
    background: #ffffff;
    border: 1px solid #e5eaf2;
    border-radius: 16px;
    padding: 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 3px 14px rgba(20, 33, 61, 0.04);
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .stat-icon.blue {
    background: #eaf2ff;
    color: #1769ff;
  }

  .stat-icon.orange {
    background: #fff4df;
    color: #d97706;
  }

  .stat-icon.red {
    background: #ffe9e9;
    color: #dc2626;
  }

  .stat-icon.green {
    background: #eaf9f0;
    color: #159447;
  }

  .stat-card > div:last-child {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .stat-label {
    color: #718096;
    font-size: 12px;
    font-weight: 600;
  }

  .stat-card strong {
    font-size: 24px;
    color: #18243b;
  }

  .filter-panel {
    background: #ffffff;
    border: 1px solid #e5eaf2;
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 20px;
    box-shadow: 0 3px 14px rgba(20, 33, 61, 0.04);
  }

  .filter-heading {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #334155;
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 12px;
  }

  .filter-row {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .search-box {
    flex: 1;
    min-width: 220px;
    height: 42px;
    border: 1px solid #dce3ed;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 12px;
    color: #7b8799;
    background: #fbfcfe;
  }

  .search-box:focus-within {
    border-color: #1769ff;
    box-shadow: 0 0 0 3px rgba(23, 105, 255, 0.08);
  }

  .search-box input {
    border: 0;
    outline: 0;
    background: transparent;
    flex: 1;
    min-width: 0;
    font-size: 14px;
    color: #1e293b;
  }

  .clear-search {
    border: 0;
    background: transparent;
    color: #8793a5;
    display: flex;
    cursor: pointer;
    padding: 2px;
  }

  .filter-select {
    height: 42px;
    min-width: 160px;
    border: 1px solid #dce3ed;
    border-radius: 10px;
    background: #fbfcfe;
    padding: 0 12px;
    color: #334155;
    outline: none;
    cursor: pointer;
  }

  .filter-select:focus {
    border-color: #1769ff;
  }

  .clear-filter-button {
    height: 42px;
    border: 1px solid #dce3ed;
    background: #ffffff;
    color: #64748b;
    border-radius: 10px;
    padding: 0 13px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-weight: 600;
    white-space: nowrap;
  }

  .clear-filter-button:hover {
    color: #1769ff;
    border-color: #1769ff;
  }

  .notice-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .notice-card {
    background: #ffffff;
    border: 1px solid #e3e8f0;
    border-left: 4px solid #cbd5e1;
    border-radius: 16px;
    padding: 18px;
    display: flex;
    gap: 16px;
    cursor: pointer;
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      border-color 0.18s ease;
    box-shadow: 0 3px 14px rgba(20, 33, 61, 0.04);
  }

  .notice-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(20, 33, 61, 0.08);
  }

  .notice-card.priority-urgent {
    border-left-color: #dc2626;
  }

  .notice-card.priority-high {
    border-left-color: #f59e0b;
  }

  .notice-card.priority-normal {
    border-left-color: #1769ff;
  }

  .notice-card.priority-low {
    border-left-color: #64748b;
  }

  .notice-icon {
    width: 48px;
    height: 48px;
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .category-academic {
    background: #eaf2ff;
    color: #1769ff;
  }

  .category-event {
    background: #f5edff;
    color: #7c3aed;
  }

  .category-notice {
    background: #fff3df;
    color: #d97706;
  }

  .category-general {
    background: #eef2f7;
    color: #475569;
  }

  .notice-main {
    min-width: 0;
    flex: 1;
  }

  .notice-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 7px;
  }

  .notice-badges {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px;
  }

  .category-badge,
  .priority-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 4px 9px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.35px;
  }

  .priority-badge.priority-urgent {
    background: #ffe7e7;
    color: #b91c1c;
  }

  .priority-badge.priority-high {
    background: #fff2d8;
    color: #b45309;
  }

  .priority-badge.priority-normal {
    background: #eaf2ff;
    color: #1757c2;
  }

  .priority-badge.priority-low {
    background: #edf1f5;
    color: #52627a;
  }

  .notice-date {
    color: #7a879a;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }

  .notice-main h2 {
    margin: 0 0 7px;
    font-size: 18px;
    color: #17233b;
  }

  .notice-preview {
    margin: 0;
    color: #637188;
    line-height: 1.6;
    font-size: 13px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .notice-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid #edf0f4;
  }

  .notice-meta {
    display: flex;
    align-items: center;
    gap: 15px;
    min-width: 0;
    color: #8290a3;
    font-size: 11px;
  }

  .notice-meta span {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .target-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .read-more {
    border: 0;
    background: transparent;
    color: #1769ff;
    font-weight: 700;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    cursor: pointer;
    white-space: nowrap;
  }

  .read-more:hover {
    text-decoration: underline;
  }

  .loading-grid {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .notice-skeleton {
    height: 175px;
    background: #ffffff;
    border: 1px solid #e5eaf2;
    border-radius: 16px;
    padding: 20px;
    overflow: hidden;
    position: relative;
  }

  .notice-skeleton::after {
    content: "";
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.75),
      transparent
    );
    animation: shimmer 1.4s infinite;
  }

  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }

  .skeleton-line {
    height: 12px;
    width: 70%;
    border-radius: 8px;
    background: #edf1f6;
    margin-bottom: 12px;
  }

  .skeleton-line.small {
    width: 25%;
  }

  .skeleton-line.title {
    width: 45%;
    height: 18px;
    margin-bottom: 16px;
  }

  .skeleton-line.short {
    width: 35%;
  }

  .empty-state {
    background: #ffffff;
    border: 1px solid #e5eaf2;
    border-radius: 18px;
    padding: 65px 20px;
    text-align: center;
    box-shadow: 0 3px 14px rgba(20, 33, 61, 0.04);
  }

  .empty-icon {
    width: 70px;
    height: 70px;
    margin: 0 auto 17px;
    border-radius: 50%;
    background: #eef3fa;
    color: #728198;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .empty-state h2 {
    margin: 0 0 8px;
    color: #26344c;
    font-size: 20px;
  }

  .empty-state p {
    margin: 0 auto 20px;
    color: #758399;
    font-size: 14px;
  }

  .primary-button {
    border: 0;
    background: #1769ff;
    color: white;
    border-radius: 9px;
    padding: 10px 16px;
    font-weight: 700;
    cursor: pointer;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.56);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 1000;
  }

  .notice-modal {
    width: 100%;
    max-width: 720px;
    max-height: 90vh;
    overflow: hidden;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 25px 70px rgba(15, 23, 42, 0.25);
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    padding: 20px;
    border-bottom: 1px solid #edf0f4;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
  }

  .modal-title-wrapper {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    min-width: 0;
  }

  .modal-icon {
    width: 45px;
    height: 45px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .modal-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-bottom: 7px;
  }

  .modal-title-wrapper h2 {
    margin: 0;
    color: #17233b;
    font-size: 21px;
    line-height: 1.3;
  }

  .modal-close {
    width: 35px;
    height: 35px;
    border: 0;
    border-radius: 9px;
    background: #f3f5f8;
    color: #68768a;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
  }

  .modal-close:hover {
    background: #e8ecf2;
    color: #26344c;
  }

  .modal-content {
    overflow-y: auto;
    padding: 22px;
  }

  .notice-detail-message {
    white-space: pre-wrap;
    color: #45546b;
    line-height: 1.75;
    font-size: 14px;
    background: #f8fafc;
    border: 1px solid #e9eef4;
    border-radius: 13px;
    padding: 17px;
    margin-bottom: 20px;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .detail-item {
    background: #f8fafc;
    border: 1px solid #e9eef4;
    border-radius: 12px;
    padding: 13px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .detail-item span {
    color: #7a879a;
    font-size: 11px;
    font-weight: 600;
  }

  .detail-item strong {
    color: #273650;
    font-size: 13px;
  }

  .course-target-box {
    margin-top: 14px;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 13px;
    border-radius: 12px;
    background: #eef5ff;
    color: #1769ff;
  }

  .course-target-box div {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .course-target-box span {
    color: #6e7d94;
    font-size: 11px;
  }

  .course-target-box strong {
    color: #24436d;
    font-size: 13px;
  }

  .modal-footer {
    padding: 15px 20px;
    border-top: 1px solid #edf0f4;
    display: flex;
    justify-content: flex-end;
  }

  .modal-done-button {
    border: 0;
    background: #1769ff;
    color: #ffffff;
    border-radius: 9px;
    padding: 10px 18px;
    font-weight: 700;
    cursor: pointer;
  }

  @media (max-width: 1000px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .filter-row {
      flex-wrap: wrap;
    }

    .search-box {
      flex: 1 1 100%;
    }

    .filter-select {
      flex: 1;
    }
  }

  @media (max-width: 700px) {
    .notices-page {
      padding: 17px;
    }

    .page-header {
      flex-direction: column;
      gap: 15px;
    }

    .refresh-button {
      align-self: flex-start;
    }

    .title-section {
      align-items: flex-start;
    }

    .title-section h1 {
      font-size: 25px;
    }

    .title-section p {
      line-height: 1.5;
    }

    .stats-grid {
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .stat-card {
      padding: 13px;
    }

    .stat-icon {
      width: 38px;
      height: 38px;
    }

    .stat-card strong {
      font-size: 20px;
    }

    .filter-select {
      min-width: 0;
      width: 100%;
      flex: 1 1 100%;
    }

    .clear-filter-button {
      width: 100%;
      justify-content: center;
    }

    .notice-card {
      padding: 14px;
      gap: 11px;
    }

    .notice-icon {
      width: 42px;
      height: 42px;
    }

    .notice-top-row {
      align-items: flex-start;
      flex-direction: column;
      gap: 7px;
    }

    .notice-main h2 {
      font-size: 16px;
    }

    .notice-footer {
      align-items: flex-start;
      flex-direction: column;
      gap: 10px;
    }

    .notice-meta {
      width: 100%;
      flex-wrap: wrap;
      gap: 8px 13px;
    }

    .read-more {
      padding: 0;
    }

    .detail-grid {
      grid-template-columns: 1fr;
    }

    .notice-modal {
      max-height: 94vh;
      border-radius: 16px;
    }
  }

  @media (max-width: 450px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }

    .title-icon {
      width: 46px;
      height: 46px;
    }

    .title-section h1 {
      font-size: 22px;
    }

    .notice-icon {
      display: none;
    }

    .notice-modal {
      width: calc(100vw - 20px);
    }
  }
`;

export default Notices;