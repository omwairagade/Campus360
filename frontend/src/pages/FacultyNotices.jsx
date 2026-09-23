import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  AlertCircle,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  EyeOff,
  Filter,
  GraduationCap,
  Layers3,
  LibraryBig,
  List,
  LayoutGrid,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  Target,
  Users,
  X,
} from "lucide-react";

import {
  apiGet,
  apiPost,
  apiPut,
  logoutUser,
} from "../api";

/* ============================================================
   CONSTANTS
============================================================ */

const CATEGORIES = [
  "GENERAL",
  "ACADEMIC",
  "EXAMINATION",
  "FEES",
  "EVENT",
  "HOLIDAY",
  "URGENT",
];

const PRIORITIES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
];

const SEMESTERS = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
];

const BATCHES = [
  "1",
  "2",
  "3",
  "4",
  "5",
];

const DIVISIONS = [
  "A",
  "B",
  "C",
  "D",
  "E",
];

const emptyForm = {
  title: "",
  message: "",
  category: "GENERAL",
  priority: "NORMAL",
  isPublished: true,
  publishedAt: "",
  expiresAt: "",
  audienceType: "ALL",
  targetSemester: "",
  targetCourseId: "",
  targetBatch: "",
  targetDivision: "",
};

/* ============================================================
   HELPERS
============================================================ */

function formatLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

function formatDateTime(value) {
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
    return String(value);
  }

  return date.toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

function getLocalDateTimeValue(
  date
) {
  if (
    !(date instanceof Date) ||
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const pad = (value) =>
    String(value).padStart(
      2,
      "0"
    );

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(
    date.getDate()
  )}T${pad(
    date.getHours()
  )}:${pad(
    date.getMinutes()
  )}`;
}

function isTargetedNotice(
  notice
) {
  return (
    notice?.targetSemester != null ||
    notice?.targetCourseId != null ||
    notice?.targetBatch != null ||
    notice?.targetDivision != null
  );
}

function getNoticeStatus(
  notice
) {
  if (!notice?.isPublished) {
    return "draft";
  }

  if (
    notice?.expiresAt &&
    new Date(
      notice.expiresAt
    ).getTime() < Date.now()
  ) {
    return "expired";
  }

  return "published";
}

function getPriorityClasses(
  priority
) {
  switch (
    String(priority || "")
      .toUpperCase()
  ) {
    case "URGENT":
      return "bg-red-50 text-red-700";
    case "HIGH":
      return "bg-orange-50 text-orange-700";
    case "LOW":
      return "slate";
    default:
      return "bg-indigo-50 text-indigo-700";
  }
}

function getCategoryClasses(
  category
) {
  switch (
    String(category || "")
      .toUpperCase()
  ) {
    case "URGENT":
      return "bg-red-50 text-red-700";
    case "EXAMINATION":
      return "bg-amber-50 text-amber-700";
    case "ACADEMIC":
      return "bg-blue-50 text-blue-700";
    case "EVENT":
      return "bg-purple-50 text-purple-700";
    case "HOLIDAY":
      return "bg-pink-50 text-pink-700";
    case "FEES":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

function FacultyNotices() {
  const navigate =
    useNavigate();

  const [
    notices,
    setNotices,
  ] = useState([]);

  const [
    courses,
    setCourses,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadingCourses,
    setLoadingCourses,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingNotice,
    setEditingNotice,
  ] = useState(null);

  const [
    form,
    setForm,
  ] = useState(emptyForm);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("ALL");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState("ALL");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("ALL");

  const [
    audienceFilter,
    setAudienceFilter,
  ] = useState("ALL");

  const [
    sortBy,
    setSortBy,
  ] = useState("newest");

  const [
    viewMode,
    setViewMode,
  ] = useState("grid");

  /* ==========================================================
     LOAD NOTICES
  ========================================================== */

  const fetchNotices = async (
    isRefresh = false
  ) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response =
        await apiGet(
          "/notices"
        );

      const loadedNotices =
        response?.notices ||
        response?.data?.notices ||
        response?.data ||
        [];

      setNotices(
        Array.isArray(
          loadedNotices
        )
          ? loadedNotices
          : []
      );
    } catch (err) {
      console.error(
        "Faculty notices error:",
        err
      );

      const message =
        err?.message ||
        "Unable to load announcements.";

      setError(message);

      if (
        /authentication|unauthorized|forbidden|token/i.test(
          message
        )
      ) {
        logoutUser();
        navigate("/");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* ==========================================================
     LOAD FACULTY COURSES
  ========================================================== */

  const fetchCourses =
    async () => {
      try {
        setLoadingCourses(true);

        let response;

        try {
          response =
            await apiGet(
              "/faculty/my-courses"
            );
        } catch {
          response =
            await apiGet(
              "/faculty/courses"
            );
        }

        const loadedCourses =
          response?.courses ||
          response?.data?.courses ||
          response?.data ||
          [];

        setCourses(
          Array.isArray(
            loadedCourses
          )
            ? loadedCourses
            : []
        );
      } catch (err) {
        console.error(
          "Faculty courses error:",
          err
        );
      } finally {
        setLoadingCourses(false);
      }
    };

  useEffect(() => {
    fetchNotices();
    fetchCourses();
  }, []);

  /* ==========================================================
     FORM HELPERS
  ========================================================== */

  const updateForm = (
    field,
    value
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]:
          value,
      })
    );

    setError("");
    setSuccess("");
  };

  const openCreateForm =
    () => {
      setEditingNotice(null);

      setForm({
        ...emptyForm,
        publishedAt:
          getLocalDateTimeValue(
            new Date()
          ),
      });

      setShowForm(true);
      setError("");
      setSuccess("");
    };

  const openEditForm = (
    notice
  ) => {
    setEditingNotice(
      notice
    );

    setForm({
      title:
        notice?.title ||
        "",
      message:
        notice?.message ||
        "",
      category:
        notice?.category ||
        "GENERAL",
      priority:
        notice?.priority ||
        "NORMAL",
      isPublished:
        Boolean(
          notice?.isPublished
        ),
      publishedAt:
        notice?.publishedAt
          ? getLocalDateTimeValue(
              new Date(
                notice.publishedAt
              )
            )
          : "",
      expiresAt:
        notice?.expiresAt
          ? getLocalDateTimeValue(
              new Date(
                notice.expiresAt
              )
            )
          : "",
      audienceType:
        isTargetedNotice(
          notice
        )
          ? "TARGETED"
          : "ALL",
      targetSemester:
        notice?.targetSemester ??
        "",
      targetCourseId:
        notice?.targetCourseId ??
        "",
      targetBatch:
        notice?.targetBatch ||
        "",
      targetDivision:
        notice?.targetDivision ||
        "",
    });

    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingNotice(null);
    setForm(
      emptyForm
    );
  };

  /* ==========================================================
     TARGET COURSES
  ========================================================== */

  const targetCourses =
    useMemo(() => {
      if (
        !form.targetSemester
      ) {
        return courses;
      }

      return courses.filter(
        (course) =>
          Number(
            course?.semester
          ) ===
          Number(
            form.targetSemester
          )
      );
    }, [
      courses,
      form.targetSemester,
    ]);

  /* ==========================================================
     AUDIENCE
  ========================================================== */

  const handleAudienceChange =
    (value) => {
      if (value === "ALL") {
        setForm(
          (current) => ({
            ...current,
            audienceType:
              "ALL",
            targetSemester:
              "",
            targetCourseId:
              "",
            targetBatch:
              "",
            targetDivision:
              "",
          })
        );
      } else {
        updateForm(
          "audienceType",
          "TARGETED"
        );
      }
    };

  /* ==========================================================
     SUBMIT
  ========================================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      try {
        setSaving(true);
        setError("");
        setSuccess("");

        if (
          !form.title.trim()
        ) {
          throw new Error(
            "Announcement title is required."
          );
        }

        if (
          !form.message.trim()
        ) {
          throw new Error(
            "Announcement message is required."
          );
        }

        if (
          form.expiresAt &&
          form.publishedAt &&
          new Date(
            form.expiresAt
          ).getTime() <=
            new Date(
              form.publishedAt
            ).getTime()
        ) {
          throw new Error(
            "Expiry date and time must be after the publish date and time."
          );
        }

        const payload = {
          title:
            form.title.trim(),
          message:
            form.message.trim(),
          category:
            form.category,
          priority:
            form.priority,
          isPublished:
            Boolean(
              form.isPublished
            ),
          publishedAt:
            form.publishedAt ||
            undefined,
          expiresAt:
            form.expiresAt ||
            undefined,
        };

        if (
          form.audienceType ===
          "TARGETED"
        ) {
          payload.targetSemester =
            form.targetSemester ||
            undefined;

          payload.targetCourseId =
            form.targetCourseId ||
            undefined;

          payload.targetBatch =
            form.targetBatch ||
            undefined;

          payload.targetDivision =
            form.targetDivision ||
            undefined;

          if (
            !payload.targetSemester &&
            !payload.targetCourseId &&
            !payload.targetBatch &&
            !payload.targetDivision
          ) {
            throw new Error(
              "Select at least one targeting option."
            );
          }
        } else {
          payload.targetSemester =
            null;
          payload.targetCourseId =
            null;
          payload.targetBatch =
            null;
          payload.targetDivision =
            null;
        }

        let response;

        if (
          editingNotice?.id
        ) {
          response =
            await apiPut(
              `/notices/${editingNotice.id}`,
              payload
            );

          setSuccess(
            response?.message ||
              "Announcement updated successfully."
          );
        } else {
          response =
            await apiPost(
              "/notices",
              payload
            );

          setSuccess(
            response?.message ||
              "Announcement published successfully."
          );
        }

        setShowForm(false);
        setEditingNotice(null);
        setForm(
          emptyForm
        );

        await fetchNotices(
          true
        );
      } catch (err) {
        console.error(
          "Save announcement error:",
          err
        );

        const message =
          err?.message ||
          "Unable to save announcement.";

        setError(message);

        if (
          /authentication|unauthorized|forbidden|token/i.test(
            message
          )
        ) {
          logoutUser();
          navigate("/");
        }
      } finally {
        setSaving(false);
      }
    };

  /* ==========================================================
     FILTERED NOTICES
  ========================================================== */

  const filteredNotices =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      const result =
        notices.filter(
          (notice) => {
            const matchesSearch =
              !search ||
              String(
                notice?.title ||
                  ""
              )
                .toLowerCase()
                .includes(
                  search
                ) ||
              String(
                notice?.message ||
                  ""
              )
                .toLowerCase()
                .includes(
                  search
                ) ||
              String(
                notice?.category ||
                  ""
              )
                .toLowerCase()
                .includes(
                  search
                ) ||
              String(
                notice?.priority ||
                  ""
              )
                .toLowerCase()
                .includes(
                  search
                );

            const matchesCategory =
              categoryFilter ===
                "ALL" ||
              notice?.category ===
                categoryFilter;

            const matchesPriority =
              priorityFilter ===
                "ALL" ||
              notice?.priority ===
                priorityFilter;

            const status =
              getNoticeStatus(
                notice
              );

            const matchesStatus =
              statusFilter ===
                "ALL" ||
              status ===
                statusFilter;

            const audience =
              isTargetedNotice(
                notice
              )
                ? "TARGETED"
                : "ALL";

            const matchesAudience =
              audienceFilter ===
                "ALL" ||
              audience ===
                audienceFilter;

            return (
              matchesSearch &&
              matchesCategory &&
              matchesPriority &&
              matchesStatus &&
              matchesAudience
            );
          }
        );

      return [...result].sort(
        (a, b) => {
          if (
            sortBy ===
            "oldest"
          ) {
            return (
              new Date(
                a?.createdAt ||
                  a?.publishedAt ||
                  0
              ).getTime() -
              new Date(
                b?.createdAt ||
                  b?.publishedAt ||
                  0
              ).getTime()
            );
          }

          if (
            sortBy ===
            "priority"
          ) {
            const rank = {
              URGENT: 4,
              HIGH: 3,
              NORMAL: 2,
              LOW: 1,
            };

            return (
              (rank[
                b?.priority
              ] || 0) -
              (rank[
                a?.priority
              ] || 0)
            );
          }

          if (
            sortBy ===
            "title"
          ) {
            return String(
              a?.title || ""
            ).localeCompare(
              String(
                b?.title || ""
              )
            );
          }

          return (
            new Date(
              b?.createdAt ||
                b?.publishedAt ||
                0
            ).getTime() -
            new Date(
              a?.createdAt ||
                a?.publishedAt ||
                0
            ).getTime()
          );
        }
      );
    }, [
      notices,
      searchTerm,
      categoryFilter,
      priorityFilter,
      statusFilter,
      audienceFilter,
      sortBy,
    ]);

  /* ==========================================================
     COUNTS
  ========================================================== */

  const publishedCount =
    notices.filter(
      (notice) =>
        getNoticeStatus(
          notice
        ) === "published"
    ).length;

  const draftCount =
    notices.filter(
      (notice) =>
        getNoticeStatus(
          notice
        ) === "draft"
    ).length;

  const expiredCount =
    notices.filter(
      (notice) =>
        getNoticeStatus(
          notice
        ) === "expired"
    ).length;

  const urgentCount =
    notices.filter(
      (notice) =>
        notice?.priority ===
          "URGENT" ||
        notice?.category ===
          "URGENT"
    ).length;

  const targetedCount =
    notices.filter(
      isTargetedNotice
    ).length;

  const normalCount =
    notices.filter(
      (notice) =>
        notice?.priority ===
        "NORMAL"
    ).length;

  const highPriorityCount =
    notices.filter(
      (notice) =>
        notice?.priority ===
          "HIGH" ||
        notice?.priority ===
          "URGENT"
    ).length;

  const hasFilters =
    Boolean(
      searchTerm.trim()
    ) ||
    categoryFilter !==
      "ALL" ||
    priorityFilter !==
      "ALL" ||
    statusFilter !==
      "ALL" ||
    audienceFilter !==
      "ALL";

  const clearFilters =
    () => {
      setSearchTerm("");
      setCategoryFilter("ALL");
      setPriorityFilter("ALL");
      setStatusFilter("ALL");
      setAudienceFilter("ALL");
      setSortBy("newest");
    };

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">

        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex min-w-0 items-center gap-3">

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/faculty/dashboard"
                  )
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                title="Back to dashboard"
              >
                <ArrowLeft
                  size={19}
                />
              </button>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <Bell size={22} />
              </div>

              <div className="min-w-0">

                <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                  Faculty Portal
                </p>

                <h1 className="truncate text-xl font-bold md:text-2xl">
                  Announcements
                </h1>

                <p className="hidden text-sm text-slate-500 sm:block">
                  Communicate with your students
                </p>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <button
                type="button"
                onClick={() => {
                  fetchNotices(
                    true
                  );
                  fetchCourses();
                }}
                disabled={
                  refreshing
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
              >

                <RefreshCw
                  size={17}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                <span className="hidden sm:inline">
                  {refreshing
                    ? "Refreshing..."
                    : "Refresh"}
                </span>

              </button>

              <button
                type="button"
                onClick={
                  openCreateForm
                }
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 sm:px-4"
              >

                <Plus size={18} />

                <span className="hidden sm:inline">
                  New Announcement
                </span>

                <span className="sm:hidden">
                  New
                </span>

              </button>

            </div>

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ====================================================
            ALERTS
        ==================================================== */}

        {error && (
          <AlertMessage
            type="error"
            message={
              error
            }
            onClose={() =>
              setError("")
            }
            onRetry={() =>
              fetchNotices(
                true
              )
            }
          />
        )}

        {success && (
          <AlertMessage
            type="success"
            message={
              success
            }
            onClose={() =>
              setSuccess("")
            }
          />
        )}

        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-indigo-600 p-6 text-white shadow-lg sm:p-8">

          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10" />

          <div className="absolute -bottom-20 right-32 h-52 w-52 rounded-full bg-white/5" />

          <div className="relative flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">

            <div className="max-w-3xl">

              <div className="mb-3 flex flex-wrap gap-2">

                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                  Communication Center
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
                  {publishedCount} active
                </span>

              </div>

              <h2 className="text-2xl font-bold sm:text-3xl">
                Keep students informed
              </h2>

              <p className="mt-2 text-sm leading-6 text-indigo-100 sm:text-base">
                Publish academic updates, exam reminders, events and targeted notices for the students you teach.
              </p>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              <HeroMetric
                label="Total"
                value={
                  notices.length
                }
              />

              <HeroMetric
                label="Published"
                value={
                  publishedCount
                }
              />

              <HeroMetric
                label="Targeted"
                value={
                  targetedCount
                }
              />

              <HeroMetric
                label="Urgent"
                value={
                  urgentCount
                }
              />

            </div>

          </div>

        </section>

        {/* ====================================================
            SUMMARY
        ==================================================== */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

          <SummaryCard
            icon={
              <Bell size={21} />
            }
            title="Total"
            value={
              notices.length
            }
            description="All announcements"
          />

          <SummaryCard
            icon={
              <Send size={21} />
            }
            title="Published"
            value={
              publishedCount
            }
            description="Visible announcements"
            type="green"
          />

          <SummaryCard
            icon={
              <EyeOff size={21} />
            }
            title="Drafts"
            value={
              draftCount
            }
            description="Not yet published"
            type="slate"
          />

          <SummaryCard
            icon={
              <Clock3 size={21} />
            }
            title="Expired"
            value={
              expiredCount
            }
            description="Past expiry"
            type="amber"
          />

          <SummaryCard
            icon={
              <Target size={21} />
            }
            title="Targeted"
            value={
              targetedCount
            }
            description="Specific audiences"
            type="purple"
          />

          <SummaryCard
            icon={
              <AlertCircle
                size={21}
              />
            }
            title="Priority"
            value={
              highPriorityCount
            }
            description="High or urgent"
            type="red"
          />

        </section>

        {/* ====================================================
            QUICK INSIGHTS
        ==================================================== */}

        {!loading &&
          notices.length > 0 && (
            <section className="mt-6 grid gap-4 md:grid-cols-3">

              <InsightCard
                icon={
                  <CheckCircle2
                    size={20}
                  />
                }
                title="Normal Priority"
                value={
                  normalCount
                }
                text="Announcements with standard priority."
                type="green"
              />

              <InsightCard
                icon={
                  <Target size={20} />
                }
                title="Audience Reach"
                value={
                  `${notices.length ? Math.round(
                    (publishedCount /
                      notices.length) *
                      100
                  ) : 0}%`
                }
                text="Current publication rate."
                type="blue"
              />

              <InsightCard
                icon={
                  <Layers3 size={20} />
                }
                title="Courses Available"
                value={
                  courses.length
                }
                text="Courses available for targeting."
                type="purple"
              />

            </section>
          )}

        {/* ====================================================
            FILTERS
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-4">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Filter size={19} />
                </div>

                <div>

                  <h2 className="font-bold text-slate-800">
                    Announcement Filters
                  </h2>

                  <p className="text-xs text-slate-500">
                    Search and organize your announcements.
                  </p>

                </div>

              </div>

              <div className="flex items-center gap-2">

                <span className="hidden text-xs font-semibold text-slate-400 sm:inline">
                  View
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setViewMode(
                      "grid"
                    )
                  }
                  className={`rounded-lg p-2 ${
                    viewMode ===
                    "grid"
                      ? "bg-indigo-100 text-indigo-600"
                      : "text-slate-400 hover:bg-slate-100"
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid
                    size={17}
                  />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setViewMode(
                      "list"
                    )
                  }
                  className={`rounded-lg p-2 ${
                    viewMode ===
                    "list"
                      ? "bg-indigo-100 text-indigo-600"
                      : "text-slate-400 hover:bg-slate-100"
                  }`}
                  title="List view"
                >
                  <List size={17} />
                </button>

              </div>

            </div>

            {/* SEARCH */}

            <div className="relative">

              <Search
                size={19}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
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
                placeholder="Search title, message, category or priority..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-11 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchTerm(
                      ""
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
                >
                  <X size={16} />
                </button>
              )}

            </div>

            {/* FILTER ROW */}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

              <SelectFilter
                label="Category"
                value={
                  categoryFilter
                }
                onChange={
                  setCategoryFilter
                }
                options={[
                  {
                    value: "ALL",
                    label:
                      "All Categories",
                  },
                  ...CATEGORIES.map(
                    (
                      category
                    ) => ({
                      value:
                        category,
                      label:
                        formatLabel(
                          category
                        ),
                    })
                  ),
                ]}
              />

              <SelectFilter
                label="Priority"
                value={
                  priorityFilter
                }
                onChange={
                  setPriorityFilter
                }
                options={[
                  {
                    value: "ALL",
                    label:
                      "All Priorities",
                  },
                  ...PRIORITIES.map(
                    (
                      priority
                    ) => ({
                      value:
                        priority,
                      label:
                        formatLabel(
                          priority
                        ),
                    })
                  ),
                ]}
              />

              <SelectFilter
                label="Status"
                value={
                  statusFilter
                }
                onChange={
                  setStatusFilter
                }
                options={[
                  {
                    value: "ALL",
                    label:
                      "All Statuses",
                  },
                  {
                    value:
                      "published",
                    label:
                      "Published",
                  },
                  {
                    value:
                      "draft",
                    label:
                      "Draft",
                  },
                  {
                    value:
                      "expired",
                    label:
                      "Expired",
                  },
                ]}
              />

              <SelectFilter
                label="Audience"
                value={
                  audienceFilter
                }
                onChange={
                  setAudienceFilter
                }
                options={[
                  {
                    value: "ALL",
                    label:
                      "All Audiences",
                  },
                  {
                    value: "ALL",
                    label:
                      "All Students",
                  },
                  {
                    value:
                      "TARGETED",
                    label:
                      "Targeted",
                  },
                ].filter(
                  (
                    item,
                    index,
                    array
                  ) =>
                    array.findIndex(
                      (
                        other
                      ) =>
                        other.value ===
                        item.value
                    ) ===
                    index
                )}
              />

              <SelectFilter
                label="Sort By"
                value={
                  sortBy
                }
                onChange={
                  setSortBy
                }
                options={[
                  {
                    value:
                      "newest",
                    label:
                      "Newest First",
                  },
                  {
                    value:
                      "oldest",
                    label:
                      "Oldest First",
                  },
                  {
                    value:
                      "priority",
                    label:
                      "Priority",
                  },
                  {
                    value:
                      "title",
                    label:
                      "Title",
                  },
                ]}
              />

            </div>

            {/* STATUS */}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">

                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 font-semibold">

                  <SlidersHorizontal
                    size={13}
                  />

                  Showing{" "}
                  <span className="text-slate-800">
                    {
                      filteredNotices.length
                    }
                  </span>{" "}
                  of{" "}
                  <span className="text-slate-800">
                    {
                      notices.length
                    }
                  </span>

                </span>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 font-bold text-indigo-600 hover:bg-indigo-100"
                  >
                    <X size={13} />
                    Clear Filters
                  </button>
                )}

              </div>

              <p className="text-xs font-medium text-slate-400">
                {filteredNotices.length} result
                {filteredNotices.length !==
                1
                  ? "s"
                  : ""}
              </p>

            </div>

          </div>

        </section>

        {/* ====================================================
            NOTICE LIST
        ==================================================== */}

        <section className="mt-8">

          {loading ? (
            <div className="grid gap-5 lg:grid-cols-2">

              {[
                1,
                2,
                3,
                4,
              ].map(
                (item) => (
                  <NoticeSkeleton
                    key={
                      item
                    }
                  />
                )
              )}

            </div>
          ) : filteredNotices.length ===
            0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">

                <Megaphone
                  size={30}
                />

              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-800">
                No announcements found
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {hasFilters
                  ? "No announcements match the current search and filters."
                  : "Create your first announcement to communicate with your students."}
              </p>

              <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">

                {hasFilters && (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <X size={17} />
                    Clear Filters
                  </button>
                )}

                <button
                  type="button"
                  onClick={
                    openCreateForm
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  <Plus size={17} />
                  New Announcement
                </button>

              </div>

            </div>
          ) : viewMode ===
            "grid" ? (
            <div className="grid gap-5 lg:grid-cols-2">

              {filteredNotices.map(
                (notice) => (
                  <NoticeCard
                    key={
                      notice.id
                    }
                    notice={
                      notice
                    }
                    onEdit={() =>
                      openEditForm(
                        notice
                      )
                    }
                  />
                )
              )}

            </div>
          ) : (
            <NoticeList
              notices={
                filteredNotices
              }
              onEdit={
                openEditForm
              }
            />
          )}

        </section>

      </main>

      {/* ======================================================
          CREATE / EDIT MODAL
      ====================================================== */}

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm">

          <div className="flex min-h-full items-center justify-center py-4">

            <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">

              {/* MODAL HEADER */}

              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-6">

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

                    {editingNotice ? (
                      <Edit3 size={21} />
                    ) : (
                      <Megaphone
                        size={21}
                      />
                    )}

                  </div>

                  <div className="min-w-0">

                    <h2 className="truncate text-lg font-bold text-slate-800">
                      {editingNotice
                        ? "Edit Announcement"
                        : "New Announcement"}
                    </h2>

                    <p className="hidden text-sm text-slate-500 sm:block">
                      Configure content, audience and publication settings.
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  disabled={
                    saving
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <X size={20} />
                </button>

              </div>

              {/* MODAL FORM */}

              <form
                onSubmit={
                  handleSubmit
                }
              >

                <div className="max-h-[75vh] space-y-6 overflow-y-auto p-5 sm:p-6">

                  {/* CONTENT */}

                  <div className="rounded-2xl border border-slate-200 bg-white">

                    <div className="border-b border-slate-100 px-4 py-3">

                      <p className="text-sm font-bold text-slate-800">
                        Announcement Content
                      </p>

                    </div>

                    <div className="space-y-5 p-4">

                      <div>

                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Title
                        </label>

                        <input
                          type="text"
                          value={
                            form.title
                          }
                          onChange={(event) =>
                            updateForm(
                              "title",
                              event.target
                                .value
                            )
                          }
                          placeholder="Enter announcement title"
                          maxLength={
                            200
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                        />

                        <div className="mt-1 flex justify-end">

                          <span className="text-[10px] font-medium text-slate-400">
                            {
                              form.title
                                .length
                            }
                            /200
                          </span>

                        </div>

                      </div>

                      <div>

                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Message
                        </label>

                        <textarea
                          value={
                            form.message
                          }
                          onChange={(event) =>
                            updateForm(
                              "message",
                              event.target
                                .value
                            )
                          }
                          placeholder="Write the announcement message..."
                          rows={6}
                          maxLength={
                            5000
                          }
                          className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                        />

                        <div className="mt-1 flex justify-between">

                          <span className="text-[10px] text-slate-400">
                            Use clear and student-friendly wording.
                          </span>

                          <span className="text-[10px] font-medium text-slate-400">
                            {
                              form.message
                                .length
                            }
                            /5000
                          </span>

                        </div>

                      </div>

                      <div className="grid gap-4 md:grid-cols-2">

                        <FormSelect
                          label="Category"
                          value={
                            form.category
                          }
                          onChange={(
                            value
                          ) =>
                            updateForm(
                              "category",
                              value
                            )
                          }
                          options={CATEGORIES.map(
                            (
                              category
                            ) => ({
                              value:
                                category,
                              label:
                                formatLabel(
                                  category
                                ),
                            })
                          )}
                        />

                        <FormSelect
                          label="Priority"
                          value={
                            form.priority
                          }
                          onChange={(
                            value
                          ) =>
                            updateForm(
                              "priority",
                              value
                            )
                          }
                          options={PRIORITIES.map(
                            (
                              priority
                            ) => ({
                              value:
                                priority,
                              label:
                                formatLabel(
                                  priority
                                ),
                            })
                          )}
                        />

                      </div>

                    </div>

                  </div>

                  {/* AUDIENCE */}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">

                    <div className="flex items-start gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                        <Users size={20} />
                      </div>

                      <div>

                        <h3 className="font-bold text-slate-800">
                          Target Audience
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Choose whether this announcement should reach everyone or a specific student group.
                        </p>

                      </div>

                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">

                      <AudienceButton
                        active={
                          form.audienceType ===
                          "ALL"
                        }
                        onClick={() =>
                          handleAudienceChange(
                            "ALL"
                          )
                        }
                        icon={
                          <Users
                            size={18}
                          />
                        }
                        title="All Students"
                        description="Visible to all students."
                      />

                      <AudienceButton
                        active={
                          form.audienceType ===
                          "TARGETED"
                        }
                        onClick={() =>
                          handleAudienceChange(
                            "TARGETED"
                          )
                        }
                        icon={
                          <Target
                            size={18}
                          />
                        }
                        title="Targeted Students"
                        description="Target semester, course, batch or division."
                      />

                    </div>

                    {form.audienceType ===
                      "TARGETED" && (
                      <div className="mt-5 space-y-4 border-t border-slate-200 pt-5">

                        <div className="grid gap-4 md:grid-cols-2">

                          <TargetSelect
                            label="Semester"
                            icon={
                              <GraduationCap
                                size={16}
                              />
                            }
                            value={
                              form.targetSemester
                            }
                            onChange={(
                              value
                            ) =>
                              updateForm(
                                "targetSemester",
                                value
                              )
                            }
                            options={[
                              {
                                value:
                                  "",
                                label:
                                  "Any Semester",
                              },
                              ...SEMESTERS.map(
                                (
                                  semester
                                ) => ({
                                  value:
                                    semester,
                                  label:
                                    `Semester ${semester}`,
                                })
                              ),
                            ]}
                          />

                          <TargetSelect
                            label="Course"
                            icon={
                              <BookOpen
                                size={16}
                              />
                            }
                            value={
                              form.targetCourseId
                            }
                            onChange={(
                              value
                            ) =>
                              updateForm(
                                "targetCourseId",
                                value
                              )
                            }
                            disabled={
                              loadingCourses
                            }
                            options={[
                              {
                                value:
                                  "",
                                label:
                                  loadingCourses
                                    ? "Loading courses..."
                                    : "Any Course",
                              },
                              ...targetCourses.map(
                                (
                                  course
                                ) => ({
                                  value:
                                    course.id,
                                  label:
                                    `${course.code || "COURSE"} - ${course.name || "Course"}`,
                                })
                              ),
                            ]}
                          />

                        </div>

                        <div className="grid gap-4 md:grid-cols-2">

                          <TargetSelect
                            label="Batch"
                            icon={
                              <Layers3
                                size={16}
                              />
                            }
                            value={
                              form.targetBatch
                            }
                            onChange={(
                              value
                            ) =>
                              updateForm(
                                "targetBatch",
                                value
                              )
                            }
                            options={[
                              {
                                value:
                                  "",
                                label:
                                  "Any Batch",
                              },
                              ...BATCHES.map(
                                (
                                  batch
                                ) => ({
                                  value:
                                    batch,
                                  label:
                                    `Batch ${batch}`,
                                })
                              ),
                            ]}
                          />

                          <TargetSelect
                            label="Division"
                            icon={
                              <LibraryBig
                                size={16}
                              />
                            }
                            value={
                              form.targetDivision
                            }
                            onChange={(
                              value
                            ) =>
                              updateForm(
                                "targetDivision",
                                value
                              )
                            }
                            options={[
                              {
                                value:
                                  "",
                                label:
                                  "Any Division",
                              },
                              ...DIVISIONS.map(
                                (
                                  division
                                ) => ({
                                  value:
                                    division,
                                  label:
                                    `Division ${division}`,
                                })
                              ),
                            ]}
                          />

                        </div>

                        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-xs leading-5 text-indigo-700">

                          <div className="flex items-start gap-2">

                            <Target
                              size={15}
                              className="mt-0.5 shrink-0"
                            />

                            <p>

                              <strong>
                                Targeting rule:
                              </strong>{" "}
                              students must match every selected filter. Leave a filter empty to include all values for that field.

                            </p>

                          </div>

                        </div>

                      </div>
                    )}

                  </div>

                  {/* SCHEDULING */}

                  <div className="rounded-2xl border border-slate-200 bg-white">

                    <div className="border-b border-slate-100 px-4 py-3">

                      <p className="text-sm font-bold text-slate-800">
                        Publication Settings
                      </p>

                    </div>

                    <div className="space-y-5 p-4">

                      <div className="grid gap-4 md:grid-cols-2">

                        <DateInput
                          label="Publish Date & Time"
                          icon={
                            <CalendarDays
                              size={17}
                            />
                          }
                          value={
                            form.publishedAt
                          }
                          onChange={(
                            value
                          ) =>
                            updateForm(
                              "publishedAt",
                              value
                            )
                          }
                        />

                        <DateInput
                          label="Expiry Date & Time"
                          icon={
                            <Clock3
                              size={17}
                            />
                          }
                          value={
                            form.expiresAt
                          }
                          onChange={(
                            value
                          ) =>
                            updateForm(
                              "expiresAt",
                              value
                            )
                          }
                        />

                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                        <label className="flex cursor-pointer items-start gap-3">

                          <input
                            type="checkbox"
                            checked={
                              form.isPublished
                            }
                            onChange={(event) =>
                              updateForm(
                                "isPublished",
                                event.target
                                  .checked
                              )
                            }
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                          />

                          <span>

                            <span className="flex items-center gap-2 font-semibold text-slate-800">

                              {form.isPublished ? (
                                <Eye
                                  size={16}
                                  className="text-green-600"
                                />
                              ) : (
                                <EyeOff
                                  size={16}
                                  className="text-slate-500"
                                />
                              )}

                              {form.isPublished
                                ? "Publish announcement"
                                : "Save as draft"}

                            </span>

                            <span className="mt-1 block text-xs leading-5 text-slate-500">

                              {form.isPublished
                                ? "Students can see this announcement when the publication time is reached."
                                : "Students will not see this announcement until it is published."}

                            </span>

                          </span>

                        </label>

                      </div>

                    </div>

                  </div>

                </div>

                {/* MODAL FOOTER */}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">

                  <button
                    type="button"
                    onClick={
                      closeForm
                    }
                    disabled={
                      saving
                    }
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {saving ? (
                      <>
                        <RefreshCw
                          size={17}
                          className="animate-spin"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Send size={17} />

                        {editingNotice
                          ? "Update Announcement"
                          : form.isPublished
                          ? "Publish Announcement"
                          : "Save Draft"}
                      </>
                    )}

                  </button>

                </div>

              </form>

            </div>

          </div>

        </div>
      )}

    </div>
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
   SUMMARY CARD
============================================================ */

function SummaryCard({
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
    slate:
      "bg-slate-100 text-slate-600",
    amber:
      "bg-amber-50 text-amber-600",
    purple:
      "bg-purple-50 text-purple-600",
    red:
      "bg-red-50 text-red-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          styles[type] ||
          styles.indigo
        }`}
      >
        {icon}
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-3xl font-bold text-slate-900">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-xs text-slate-400">
          {description}
        </p>
      )}

    </div>
  );
}

/* ============================================================
   INSIGHT CARD
============================================================ */

function InsightCard({
  icon,
  title,
  value,
  text,
  type,
}) {
  const styles = {
    green:
      "bg-green-50 text-green-600",
    blue:
      "bg-blue-50 text-blue-600",
    purple:
      "bg-purple-50 text-purple-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center gap-3">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            styles[type]
          }`}
        >
          {icon}
        </div>

        <div>

          <p className="text-xs font-semibold text-slate-400">
            {title}
          </p>

          <p className="text-xl font-bold text-slate-800">
            {value}
          </p>

        </div>

      </div>

      <p className="mt-3 text-xs leading-5 text-slate-400">
        {text}
      </p>

    </div>
  );
}

/* ============================================================
   ALERT MESSAGE
============================================================ */

function AlertMessage({
  type,
  message,
  onClose,
  onRetry,
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
            ? "Announcement error"
            : "Success"}
        </p>

        <p className="mt-1 text-sm leading-6">
          {message}
        </p>

        {isError &&
          onRetry && (
            <button
              type="button"
              onClick={
                onRetry
              }
              className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-200"
            >
              Retry
            </button>
          )}

      </div>

      <button
        type="button"
        onClick={
          onClose
        }
        className="shrink-0 rounded-lg p-1 text-current opacity-60 hover:bg-black/5 hover:opacity-100"
      >
        <X size={17} />
      </button>

    </div>
  );
}

/* ============================================================
   SELECT FILTER
============================================================ */

function SelectFilter({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <div>

      <label className="mb-2 block text-xs font-bold text-slate-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target
              .value
          )
        }
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      >

        {options.map(
          (option) => (
            <option
              key={`${label}-${option.value}`}
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

    </div>
  );
}

/* ============================================================
   FORM SELECT
============================================================ */

function FormSelect({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target
              .value
          )
        }
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      >

        {options.map(
          (option) => (
            <option
              key={`${label}-${option.value}`}
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

    </div>
  );
}

/* ============================================================
   TARGET SELECT
============================================================ */

function TargetSelect({
  label,
  icon,
  value,
  onChange,
  options,
  disabled = false,
}) {
  return (
    <div>

      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">

        <span className="text-indigo-600">
          {icon}
        </span>

        {label}

      </label>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target
              .value
          )
        }
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
      >

        {options.map(
          (option) => (
            <option
              key={`${label}-${option.value}`}
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

    </div>
  );
}

/* ============================================================
   DATE INPUT
============================================================ */

function DateInput({
  label,
  icon,
  value,
  onChange,
}) {
  return (
    <div>

      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">

        <span className="text-indigo-600">
          {icon}
        </span>

        {label}

      </label>

      <input
        type="datetime-local"
        value={value}
        onChange={(event) =>
          onChange(
            event.target
              .value
          )
        }
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
      />

    </div>
  );
}

/* ============================================================
   AUDIENCE BUTTON
============================================================ */

function AudienceButton({
  active,
  onClick,
  icon,
  title,
  description,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-indigo-500 bg-indigo-50 shadow-sm"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >

      <div className="flex items-center gap-3">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            active
              ? "bg-indigo-100 text-indigo-600"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {icon}
        </div>

        <div>

          <p className="font-semibold text-slate-800">
            {title}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>

        </div>

      </div>

    </button>
  );
}

/* ============================================================
   NOTICE CARD
============================================================ */

function NoticeCard({
  notice,
  onEdit,
}) {
  const status =
    getNoticeStatus(
      notice
    );

  const targeted =
    isTargetedNotice(
      notice
    );

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg">

      <div
        className={`h-1 ${
          status ===
          "published"
            ? "bg-green-500"
            : status ===
                "expired"
              ? "bg-amber-500"
              : "bg-slate-300"
        }`}
      />

      <div className="p-5 sm:p-6">

        <div className="flex items-start justify-between gap-4">

          <div className="min-w-0 flex-1">

            <div className="flex flex-wrap gap-2">

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${getCategoryClasses(
                  notice?.category
                )}`}
              >
                {formatLabel(
                  notice?.category ||
                    "GENERAL"
                )}
              </span>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${getPriorityClasses(
                  notice?.priority
                )}`}
              >
                {formatLabel(
                  notice?.priority ||
                    "NORMAL"
                )}
              </span>

              <StatusBadge
                status={
                  status
                }
              />

              {targeted && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                  TARGETED
                </span>
              )}

            </div>

            <h2 className="mt-4 break-words text-lg font-bold leading-7 text-slate-800">
              {notice?.title ||
                "Untitled Announcement"}
            </h2>

          </div>

          <button
            type="button"
            onClick={onEdit}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
            title="Edit announcement"
          >
            <Edit3 size={17} />
          </button>

        </div>

        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
          {notice?.message ||
            "No message available."}
        </p>

        {/* TARGET */}

        {targeted && (
          <div className="mt-5 rounded-2xl bg-indigo-50 p-4">

            <div className="flex items-center gap-2">

              <Target
                size={16}
                className="text-indigo-600"
              />

              <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                Target Audience
              </p>

            </div>

            <div className="mt-3 flex flex-wrap gap-2">

              {notice?.targetSemester !=
                null && (
                <TargetPill
                  icon={
                    <GraduationCap
                      size={13}
                    />
                  }
                  text={`Semester ${notice.targetSemester}`}
                />
              )}

              {notice?.targetCourse && (
                <TargetPill
                  icon={
                    <BookOpen
                      size={13}
                    />
                  }
                  text={`${notice.targetCourse.code || "COURSE"} - ${notice.targetCourse.name || "Course"}`}
                />
              )}

              {notice?.targetCourseId !=
                null &&
                !notice?.targetCourse && (
                  <TargetPill
                    icon={
                      <BookOpen
                        size={13}
                      />
                    }
                    text={`Course ID ${notice.targetCourseId}`}
                  />
                )}

              {notice?.targetBatch && (
                <TargetPill
                  icon={
                    <Layers3
                      size={13}
                    />
                  }
                  text={`Batch ${notice.targetBatch}`}
                />
              )}

              {notice?.targetDivision && (
                <TargetPill
                  icon={
                    <LibraryBig
                      size={13}
                    />
                  }
                  text={`Division ${notice.targetDivision}`}
                />
              )}

            </div>

          </div>
        )}

        {/* META */}

        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">

          <MetaItem
            icon={
              <CalendarDays
                size={14}
              />
            }
            label="Published"
            value={formatDateTime(
              notice?.publishedAt
            )}
          />

          <MetaItem
            icon={
              <Clock3
                size={14}
              />
            }
            label="Expires"
            value={
              notice?.expiresAt
                ? formatDateTime(
                    notice.expiresAt
                  )
                : "No expiry"
            }
          />

        </div>

      </div>

    </article>
  );
}

/* ============================================================
   NOTICE LIST
============================================================ */

function NoticeList({
  notices,
  onEdit,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="hidden grid-cols-[1.7fr_0.8fr_0.8fr_0.8fr_1.4fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-[10px] font-bold uppercase tracking-wide text-slate-400 lg:grid">

        <span>
          Announcement
        </span>

        <span>
          Category
        </span>

        <span>
          Priority
        </span>

        <span>
          Status
        </span>

        <span>
          Published
        </span>

        <span>
          Action
        </span>

      </div>

      <div className="divide-y divide-slate-100">

        {notices.map(
          (notice) => {

            const status =
              getNoticeStatus(
                notice
              );

            return (
              <div
                key={
                  notice.id
                }
                className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 lg:grid-cols-[1.7fr_0.8fr_0.8fr_0.8fr_1.4fr_auto] lg:items-center"
              >

                <div className="min-w-0">

                  <p className="break-words font-bold text-slate-800">
                    {notice?.title ||
                      "Untitled"}
                  </p>

                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                    {
                      notice?.message
                    }
                  </p>

                  {isTargetedNotice(
                    notice
                  ) && (
                    <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-2 py-1 text-[9px] font-bold text-indigo-700">
                      TARGETED
                    </span>
                  )}

                </div>

                <div>

                  <p className="text-xs text-slate-400 lg:hidden">
                    Category
                  </p>

                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold lg:mt-0 ${getCategoryClasses(
                      notice?.category
                    )}`}
                  >
                    {formatLabel(
                      notice?.category
                    )}
                  </span>

                </div>

                <div>

                  <p className="text-xs text-slate-400 lg:hidden">
                    Priority
                  </p>

                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold lg:mt-0 ${getPriorityClasses(
                      notice?.priority
                    )}`}
                  >
                    {formatLabel(
                      notice?.priority
                    )}
                  </span>

                </div>

                <div>

                  <p className="text-xs text-slate-400 lg:hidden">
                    Status
                  </p>

                  <div className="mt-1 lg:mt-0">

                    <StatusBadge
                      status={
                        status
                      }
                    />

                  </div>

                </div>

                <div>

                  <p className="text-xs text-slate-400 lg:hidden">
                    Published
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-700 lg:mt-0">
                    {formatDateTime(
                      notice?.publishedAt
                    )}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    onEdit(
                      notice
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-50 px-3.5 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                >

                  <Edit3
                    size={14}
                  />

                  Edit

                </button>

              </div>
            );
          }
        )}

      </div>

    </div>
  );
}

/* ============================================================
   STATUS BADGE
============================================================ */

function StatusBadge({
  status,
}) {
  const config = {
    published: {
      label: "PUBLISHED",
      className:
        "bg-green-50 text-green-700",
      icon: (
        <Eye size={11} />
      ),
    },
    draft: {
      label: "DRAFT",
      className:
        "bg-slate-100 text-slate-500",
      icon: (
        <EyeOff
          size={11}
        />
      ),
    },
    expired: {
      label: "EXPIRED",
      className:
        "bg-amber-50 text-amber-700",
      icon: (
        <Clock3 size={11} />
      ),
    },
  };

  const item =
    config[
      status
    ] || config.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${item.className}`}
    >
      {item.icon}
      {item.label}
    </span>
  );
}

/* ============================================================
   TARGET PILL
============================================================ */

function TargetPill({
  icon,
  text,
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700">

      {icon}

      <span className="truncate">
        {text}
      </span>

    </span>
  );
}

/* ============================================================
   META ITEM
============================================================ */

function MetaItem({
  icon,
  label,
  value,
}) {
  return (
    <div className="flex items-start gap-2 text-xs text-slate-500">

      <span className="mt-0.5 text-indigo-600">
        {icon}
      </span>

      <div className="min-w-0">

        <p className="font-semibold text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 break-words font-medium text-slate-600">
          {value}
        </p>

      </div>

    </div>
  );
}

/* ============================================================
   NOTICE SKELETON
============================================================ */

function NoticeSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">

      <div className="h-1 bg-slate-200" />

      <div className="space-y-5 p-5 sm:p-6">

        <div className="flex gap-2">

          <div className="h-6 w-20 rounded-full bg-slate-200" />

          <div className="h-6 w-20 rounded-full bg-slate-200" />

          <div className="h-6 w-20 rounded-full bg-slate-200" />

        </div>

        <div className="h-6 w-3/4 rounded bg-slate-200" />

        <div className="space-y-2">

          <div className="h-4 w-full rounded bg-slate-100" />

          <div className="h-4 w-5/6 rounded bg-slate-100" />

          <div className="h-4 w-2/3 rounded bg-slate-100" />

        </div>

        <div className="rounded-2xl bg-slate-100 p-5">

          <div className="h-4 w-32 rounded bg-slate-200" />

          <div className="mt-3 flex gap-2">

            <div className="h-7 w-24 rounded bg-slate-200" />

            <div className="h-7 w-20 rounded bg-slate-200" />

          </div>

        </div>

        <div className="grid grid-cols-2 gap-3">

          <div className="h-12 rounded bg-slate-100" />

          <div className="h-12 rounded bg-slate-100" />

        </div>

      </div>

    </div>
  );
}

export default FacultyNotices;