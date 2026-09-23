import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
} from "../api";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 16);
}

function getFacultyName(faculty) {
  if (!faculty?.user) {
    return "Not Assigned";
  }

  const name =
    `${faculty.user.firstName || ""} ${
      faculty.user.lastName || ""
    }`.trim();

  return name || "Not Assigned";
}

function getStudentName(student) {
  const name =
    `${student?.user?.firstName || ""} ${
      student?.user?.lastName || ""
    }`.trim();

  return name || "-";
}

function getAssignmentStatus(assignment) {
  if (!assignment?.dueDate) {
    return {
      label: "No Due Date",
      key: "NO_DATE",
      className:
        "bg-gray-100 text-gray-700",
    };
  }

  const due = new Date(assignment.dueDate);

  if (Number.isNaN(due.getTime())) {
    return {
      label: "Invalid Date",
      key: "INVALID",
      className:
        "bg-gray-100 text-gray-700",
    };
  }

  const now = new Date();

  if (due < now) {
    return {
      label: "Overdue",
      key: "OVERDUE",
      className:
        "bg-red-50 text-red-700",
    };
  }

  const hours =
    (due.getTime() - now.getTime()) /
    (1000 * 60 * 60);

  if (hours <= 48) {
    return {
      label: "Due Soon",
      key: "DUE_SOON",
      className:
        "bg-orange-50 text-orange-700",
    };
  }

  return {
    label: "Upcoming",
    key: "UPCOMING",
    className:
      "bg-green-50 text-green-700",
  };
}

function getDaysDifference(value) {
  if (!value) {
    return null;
  }

  const due = new Date(value);

  if (Number.isNaN(due.getTime())) {
    return null;
  }

  const now = new Date();

  const diff =
    due.getTime() - now.getTime();

  return Math.ceil(
    diff / (1000 * 60 * 60 * 24)
  );
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${
          wide ? "max-w-6xl" : "max-w-2xl"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  message,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <ClipboardList
        size={44}
        className="mb-3 text-gray-300"
      />

      <p className="font-medium text-gray-600">
        {message}
      </p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  description,
  iconClassName,
  valueClassName = "text-gray-900",
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">
            {label}
          </p>

          <p
            className={`mt-2 text-3xl font-bold ${valueClassName}`}
          >
            {value}
          </p>

          {description && (
            <p className="mt-2 text-xs text-gray-500">
              {description}
            </p>
          )}
        </div>

        <div
          className={`rounded-xl p-3 ${
            iconClassName ||
            "bg-blue-50 text-blue-600"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminAssignments() {
  const navigate = useNavigate();

  const [assignments, setAssignments] =
    useState([]);

  const [courses, setCourses] =
    useState([]);

  const [facultyList, setFacultyList] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [loadingFormData, setLoadingFormData] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [courseFilter, setCourseFilter] =
    useState("ALL");

  const [facultyFilter, setFacultyFilter] =
    useState("ALL");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [sortBy, setSortBy] =
    useState("dueDateAsc");

  const [viewMode, setViewMode] =
    useState("table");

  const [selectedAssignment, setSelectedAssignment] =
    useState(null);

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [formLoading, setFormLoading] =
    useState(false);

  const [formError, setFormError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [addForm, setAddForm] =
    useState({
      title: "",
      description: "",
      dueDate: "",
      maxMarks: "100",
      courseId: "",
      facultyId: "",
    });

  const [editForm, setEditForm] =
    useState({
      title: "",
      description: "",
      dueDate: "",
      maxMarks: "",
      courseId: "",
      facultyId: "",
    });

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    await Promise.all([
      loadAssignments(),
      loadCourses(),
      loadFaculty(),
    ]);
  }

  async function loadAssignments(
    showRefreshLoader = false
  ) {
    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setFormError("");

      const params =
        new URLSearchParams();

      if (search.trim()) {
        params.set(
          "search",
          search.trim()
        );
      }

      if (courseFilter !== "ALL") {
        params.set(
          "courseId",
          courseFilter
        );
      }

      if (facultyFilter !== "ALL") {
        params.set(
          "facultyId",
          facultyFilter
        );
      }

      const query =
        params.toString();

      const endpoint =
        `/admin/assignments${
          query ? `?${query}` : ""
        }`;

      const data =
        await apiGet(endpoint);

      setAssignments(
        Array.isArray(
          data?.assignments
        )
          ? data.assignments
          : []
      );
    } catch (error) {
      console.error(
        "Load admin assignments error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to load assignments"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadCourses() {
    try {
      const data =
        await apiGet(
          "/admin/courses"
        );

      setCourses(
        Array.isArray(
          data?.courses
        )
          ? data.courses
          : Array.isArray(
              data?.data
            )
          ? data.data
          : []
      );
    } catch (error) {
      console.error(
        "Load courses error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to load courses"
      );
    }
  }

  async function loadFaculty() {
    try {
      const data =
        await apiGet(
          "/admin/faculty"
        );

      setFacultyList(
        Array.isArray(
          data?.faculty
        )
          ? data.faculty
          : Array.isArray(
              data?.data
            )
          ? data.data
          : []
      );
    } catch (error) {
      console.error(
        "Load faculty error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to load faculty"
      );
    }
  }

  async function loadAssignmentDetails(
    assignmentId
  ) {
    try {
      setFormError("");

      const data =
        await apiGet(
          `/admin/assignments/${assignmentId}`
        );

      setSelectedAssignment(
        data?.assignment ||
          data?.data ||
          null
      );
    } catch (error) {
      console.error(
        "Load assignment details error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to load assignment details"
      );
    }
  }

  async function ensureFormDataLoaded() {
    if (
      courses.length > 0 &&
      facultyList.length > 0
    ) {
      return;
    }

    try {
      setLoadingFormData(true);

      await Promise.all([
        courses.length === 0
          ? loadCourses()
          : Promise.resolve(),

        facultyList.length === 0
          ? loadFaculty()
          : Promise.resolve(),
      ]);
    } finally {
      setLoadingFormData(false);
    }
  }

  async function openAddModal() {
    setFormError("");
    setSuccessMessage("");

    setAddForm({
      title: "",
      description: "",
      dueDate: "",
      maxMarks: "100",
      courseId: "",
      facultyId: "",
    });

    await ensureFormDataLoaded();

    setShowAddModal(true);
  }

  async function openEditModal(
    assignment
  ) {
    setFormError("");
    setSuccessMessage("");

    await ensureFormDataLoaded();

    setSelectedAssignment(
      assignment
    );

    setEditForm({
      title:
        assignment?.title || "",

      description:
        assignment?.description ||
        "",

      dueDate:
        toDateTimeLocal(
          assignment?.dueDate
        ),

      maxMarks:
        String(
          assignment?.maxMarks ?? ""
        ),

      courseId:
        String(
          assignment?.courseId ??
            assignment?.course?.id ??
            ""
        ),

      facultyId:
        assignment?.facultyId ===
          null ||
        assignment?.facultyId ===
          undefined
          ? ""
          : String(
              assignment.facultyId
            ),
    });

    setShowEditModal(true);
  }

  function closeModals() {
    setShowAddModal(false);
    setShowEditModal(false);
    setFormError("");
  }

  function handleAddChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setAddForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }

  function handleEditChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setEditForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }

  async function handleAddAssignment(
    event
  ) {
    event.preventDefault();

    try {
      setFormLoading(true);
      setFormError("");
      setSuccessMessage("");

      if (!addForm.title.trim()) {
        throw new Error(
          "Please enter an assignment title"
        );
      }

      if (!addForm.dueDate) {
        throw new Error(
          "Please select a due date"
        );
      }

      if (
        addForm.maxMarks === "" ||
        Number(addForm.maxMarks) <= 0
      ) {
        throw new Error(
          "Please enter valid maximum marks"
        );
      }

      if (!addForm.courseId) {
        throw new Error(
          "Please select a course"
        );
      }

      await apiPost(
        "/admin/assignments",
        {
          title:
            addForm.title.trim(),

          description:
            addForm.description.trim() ||
            null,

          dueDate:
            new Date(
              addForm.dueDate
            ).toISOString(),

          maxMarks:
            Number(
              addForm.maxMarks
            ),

          courseId:
            Number(
              addForm.courseId
            ),

          facultyId:
            addForm.facultyId
              ? Number(
                  addForm.facultyId
                )
              : null,
        }
      );

      setSuccessMessage(
        "Assignment created successfully."
      );

      setShowAddModal(false);

      await loadAssignments(true);
    } catch (error) {
      console.error(
        "Create assignment error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to create assignment"
      );
    } finally {
      setFormLoading(false);
    }
  }

  async function handleEditAssignment(
    event
  ) {
    event.preventDefault();

    if (!selectedAssignment) {
      return;
    }

    try {
      setFormLoading(true);
      setFormError("");
      setSuccessMessage("");

      if (!editForm.title.trim()) {
        throw new Error(
          "Please enter an assignment title"
        );
      }

      if (!editForm.dueDate) {
        throw new Error(
          "Please select a due date"
        );
      }

      if (
        editForm.maxMarks === "" ||
        Number(editForm.maxMarks) <= 0
      ) {
        throw new Error(
          "Please enter valid maximum marks"
        );
      }

      if (!editForm.courseId) {
        throw new Error(
          "Please select a course"
        );
      }

      await apiPatch(
        `/admin/assignments/${selectedAssignment.id}`,
        {
          title:
            editForm.title.trim(),

          description:
            editForm.description.trim() ||
            null,

          dueDate:
            new Date(
              editForm.dueDate
            ).toISOString(),

          maxMarks:
            Number(
              editForm.maxMarks
            ),

          courseId:
            Number(
              editForm.courseId
            ),

          facultyId:
            editForm.facultyId
              ? Number(
                  editForm.facultyId
                )
              : null,
        }
      );

      setSuccessMessage(
        "Assignment updated successfully."
      );

      setShowEditModal(false);

      await loadAssignments(true);

      await loadAssignmentDetails(
        selectedAssignment.id
      );
    } catch (error) {
      console.error(
        "Update assignment error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to update assignment"
      );
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteAssignment(
    assignment
  ) {
    if (!assignment) {
      return;
    }

    const submissionCount =
      assignment?._count
        ?.submissions || 0;

    const confirmed =
      window.confirm(
        `Delete "${assignment.title}"?\n\nThis assignment has ${submissionCount} submission(s). Deleting it will also delete its associated submissions.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setFormError("");
      setSuccessMessage("");

      const data =
        await apiDelete(
          `/admin/assignments/${assignment.id}`
        );

      setSuccessMessage(
        `Assignment deleted successfully. Submissions removed: ${
          data?.deletedSubmissions ?? 0
        }.`
      );

      if (
        selectedAssignment?.id ===
        assignment.id
      ) {
        setSelectedAssignment(null);
      }

      await loadAssignments(true);
    } catch (error) {
      console.error(
        "Delete assignment error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to delete assignment"
      );
    }
  }

  const stats = useMemo(() => {
    const now = new Date();

    const total =
      assignments.length;

    const upcoming =
      assignments.filter(
        (assignment) =>
          assignment?.dueDate &&
          new Date(
            assignment.dueDate
          ) >= now
      ).length;

    const overdue =
      assignments.filter(
        (assignment) =>
          assignment?.dueDate &&
          new Date(
            assignment.dueDate
          ) < now
      ).length;

    const dueSoon =
      assignments.filter(
        (assignment) => {
          if (!assignment?.dueDate) {
            return false;
          }

          const due =
            new Date(
              assignment.dueDate
            );

          if (
            Number.isNaN(
              due.getTime()
            )
          ) {
            return false;
          }

          const hours =
            (due.getTime() -
              now.getTime()) /
            (1000 * 60 * 60);

          return (
            hours >= 0 &&
            hours <= 48
          );
        }
      ).length;

    const submissions =
      assignments.reduce(
        (
          totalCount,
          assignment
        ) =>
          totalCount +
          Number(
            assignment?._count
              ?.submissions || 0
          ),
        0
      );

    const assignedCount =
      assignments.filter(
        (assignment) =>
          assignment?.faculty
      ).length;

    const unassignedCount =
      Math.max(
        total - assignedCount,
        0
      );

    const totalMaxMarks =
      assignments.reduce(
        (sum, assignment) =>
          sum +
          Number(
            assignment?.maxMarks || 0
          ),
        0
      );

    const averageMaxMarks =
      total > 0
        ? Math.round(
            totalMaxMarks / total
          )
        : 0;

    const coverage =
      total > 0
        ? Math.round(
            (assignedCount /
              total) *
              100
          )
        : 0;

    return {
      total,
      upcoming,
      overdue,
      dueSoon,
      submissions,
      assignedCount,
      unassignedCount,
      averageMaxMarks,
      coverage,
    };
  }, [assignments]);

  const filteredAssignments =
    useMemo(() => {
      let result =
        [...assignments];

      if (statusFilter !== "ALL") {
        result =
          result.filter(
            (assignment) =>
              getAssignmentStatus(
                assignment
              ).key ===
              statusFilter
          );
      }

      result.sort(
        (a, b) => {
          if (
            sortBy ===
            "dueDateAsc"
          ) {
            return (
              new Date(
                a?.dueDate || 0
              ).getTime() -
              new Date(
                b?.dueDate || 0
              ).getTime()
            );
          }

          if (
            sortBy ===
            "dueDateDesc"
          ) {
            return (
              new Date(
                b?.dueDate || 0
              ).getTime() -
              new Date(
                a?.dueDate || 0
              ).getTime()
            );
          }

          if (
            sortBy ===
            "titleAsc"
          ) {
            return String(
              a?.title || ""
            ).localeCompare(
              String(
                b?.title || ""
              )
            );
          }

          if (
            sortBy ===
            "marksDesc"
          ) {
            return (
              Number(
                b?.maxMarks || 0
              ) -
              Number(
                a?.maxMarks || 0
              )
            );
          }

          if (
            sortBy ===
            "submissionsDesc"
          ) {
            return (
              Number(
                b?._count
                  ?.submissions ||
                  0
              ) -
              Number(
                a?._count
                  ?.submissions ||
                  0
              )
            );
          }

          return 0;
        }
      );

      return result;
    }, [
      assignments,
      statusFilter,
      sortBy,
    ]);

  const analytics = useMemo(() => {
    const courseMap =
      new Map();

    const facultyMap =
      new Map();

    let highestSubmissionAssignment =
      null;

    let nearestDeadline =
      null;

    assignments.forEach(
      (assignment) => {
        const courseName =
          assignment?.course
            ?.code ||
          assignment?.course
            ?.name ||
          "Unknown Course";

        courseMap.set(
          courseName,
          (courseMap.get(
            courseName
          ) || 0) + 1
        );

        const facultyName =
          assignment?.faculty
            ? getFacultyName(
                assignment.faculty
              )
            : "Not Assigned";

        facultyMap.set(
          facultyName,
          (facultyMap.get(
            facultyName
          ) || 0) + 1
        );

        const submissions =
          Number(
            assignment?._count
              ?.submissions || 0
          );

        if (
          !highestSubmissionAssignment ||
          submissions >
            Number(
              highestSubmissionAssignment
                ?._count
                ?.submissions || 0
            )
        ) {
          highestSubmissionAssignment =
            assignment;
        }

        if (
          assignment?.dueDate
        ) {
          const due =
            new Date(
              assignment.dueDate
            );

          if (
            !Number.isNaN(
              due.getTime()
            ) &&
            due >= new Date() &&
            (!nearestDeadline ||
              due <
                new Date(
                  nearestDeadline.dueDate
                ))
          ) {
            nearestDeadline =
              assignment;
          }
        }
      }
    );

    const courseDistribution =
      Array.from(
        courseMap.entries()
      )
        .map(
          ([name, count]) => ({
            name,
            count,
          })
        )
        .sort(
          (a, b) =>
            b.count - a.count
        )
        .slice(0, 6);

    const facultyDistribution =
      Array.from(
        facultyMap.entries()
      )
        .map(
          ([name, count]) => ({
            name,
            count,
          })
        )
        .sort(
          (a, b) =>
            b.count - a.count
        )
        .slice(0, 6);

    const maxCourseCount =
      Math.max(
        ...courseDistribution.map(
          (item) => item.count
        ),
        1
      );

    return {
      courseDistribution,
      facultyDistribution,
      maxCourseCount,
      highestSubmissionAssignment,
      nearestDeadline,
    };
  }, [assignments]);

  const handleBackToDashboard =
    () => {
      navigate(
        "/admin/dashboard"
      );
    };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* HERO */}
        <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-6 text-white shadow-lg md:p-8">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-blue-300/10 blur-3xl" />

          <div className="relative">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm text-blue-100">
                  <ClipboardList size={16} />
                  <span>Admin</span>
                  <span>/</span>
                  <span>Assignments</span>
                </div>

                <h1 className="text-3xl font-bold md:text-4xl">
                  Assignments Management
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 md:text-base">
                  Manage assignment lifecycle,
                  faculty allocation, deadlines,
                  submissions and academic
                  delivery from one place.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={
                    handleBackToDashboard
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 font-medium text-white backdrop-blur transition hover:bg-white/20"
                >
                  <ArrowLeft
                    size={18}
                  />
                  Back to Dashboard
                </button>

                <button
                  type="button"
                  onClick={() =>
                    loadAssignments(true)
                  }
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 font-medium text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-60"
                >
                  <RefreshCw
                    size={18}
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

                <button
                  type="button"
                  onClick={
                    openAddModal
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
                >
                  <Plus size={18} />
                  Add Assignment
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <ClipboardList
                    size={20}
                    className="text-blue-200"
                  />
                  <div>
                    <p className="text-xs text-blue-200">
                      Total Assignments
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {stats.total}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <Clock3
                    size={20}
                    className="text-orange-200"
                  />
                  <div>
                    <p className="text-xs text-blue-200">
                      Due Soon
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {stats.dueSoon}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <Users
                    size={20}
                    className="text-purple-200"
                  />
                  <div>
                    <p className="text-xs text-blue-200">
                      Submissions
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {stats.submissions}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <Target
                    size={20}
                    className="text-green-200"
                  />
                  <div>
                    <p className="text-xs text-blue-200">
                      Faculty Coverage
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {stats.coverage}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ALERTS */}
        {successMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            <CheckCircle2
              size={20}
              className="shrink-0"
            />

            <span className="font-medium">
              {successMessage}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage("")
              }
              className="ml-auto rounded-lg p-1 transition hover:bg-green-100"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {formError &&
          !showAddModal &&
          !showEditModal && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0"
              />

              <span className="font-medium">
                {formError}
              </span>

              <button
                type="button"
                onClick={() =>
                  setFormError("")
                }
                className="ml-auto rounded-lg p-1 transition hover:bg-red-100"
              >
                <X size={18} />
              </button>
            </div>
          )}

        {/* KPI GRID */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total Assignments"
            value={stats.total}
            description={`${courses.length} courses available`}
            icon={
              <ClipboardList size={24} />
            }
            iconClassName="bg-blue-50 text-blue-600"
          />

          <KpiCard
            label="Upcoming"
            value={stats.upcoming}
            description={`${stats.dueSoon} due within 48 hours`}
            icon={
              <CalendarDays size={24} />
            }
            iconClassName="bg-green-50 text-green-600"
            valueClassName="text-green-600"
          />

          <KpiCard
            label="Overdue"
            value={stats.overdue}
            description="Assignments past deadline"
            icon={
              <AlertCircle size={24} />
            }
            iconClassName="bg-red-50 text-red-600"
            valueClassName="text-red-600"
          />

          <KpiCard
            label="Average Max Marks"
            value={stats.averageMaxMarks}
            description={`${stats.submissions} total submissions`}
            icon={
              <Target size={24} />
            }
            iconClassName="bg-purple-50 text-purple-600"
            valueClassName="text-purple-600"
          />
        </div>

        {/* ANALYTICS */}
        <div className="mb-6 grid gap-6 xl:grid-cols-3">

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-600">
                  Assignment Analytics
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  Academic delivery snapshot
                </h2>
              </div>

              <BarChart3
                size={22}
                className="text-gray-400"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Faculty Assigned
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {stats.assignedCount}
                </p>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{
                      width: `${stats.coverage}%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  {stats.coverage}% allocation coverage
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Unassigned
                </p>

                <p className="mt-2 text-2xl font-bold text-orange-600">
                  {stats.unassignedCount}
                </p>

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Assign faculty before publishing
                  academic workload where required.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Submission Activity
                </p>

                <p className="mt-2 text-2xl font-bold text-purple-600">
                  {stats.submissions}
                </p>

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Total submissions tracked across
                  visible assignments.
                </p>
              </div>

            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  Assignments by Course
                </h3>

                <span className="text-xs text-gray-500">
                  Top courses
                </span>
              </div>

              <div className="space-y-3">
                {analytics.courseDistribution.length ===
                0 ? (
                  <p className="text-sm text-gray-500">
                    No course analytics available.
                  </p>
                ) : (
                  analytics.courseDistribution.map(
                    (item) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-3"
                      >
                        <div className="w-28 shrink-0 truncate text-sm font-medium text-gray-700">
                          {item.name}
                        </div>

                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{
                              width: `${Math.max(
                                8,
                                (item.count /
                                  analytics.maxCourseCount) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>

                        <span className="w-8 text-right text-sm font-semibold text-gray-700">
                          {item.count}
                        </span>
                      </div>
                    )
                  )
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-600">
                  Attention Center
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  What needs action
                </h2>
              </div>

              <TrendingUp
                size={22}
                className="text-gray-400"
              />
            </div>

            <div className="space-y-3">

              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-red-100 p-2 text-red-600">
                    <AlertCircle
                      size={18}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-red-900">
                      Overdue
                    </p>

                    <p className="mt-1 text-xs text-red-700">
                      {stats.overdue} assignment(s)
                      require monitoring.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-orange-100 p-2 text-orange-600">
                    <Clock3
                      size={18}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-orange-900">
                      Due Soon
                    </p>

                    <p className="mt-1 text-xs text-orange-700">
                      {stats.dueSoon} assignment(s)
                      are due within 48 hours.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-yellow-100 p-2 text-yellow-600">
                    <UserRound
                      size={18}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-yellow-900">
                      Faculty Allocation
                    </p>

                    <p className="mt-1 text-xs text-yellow-700">
                      {stats.unassignedCount} assignment(s)
                      are currently unassigned.
                    </p>
                  </div>
                </div>
              </div>

              {analytics.nearestDeadline ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                      <CalendarDays
                        size={18}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-blue-900">
                        Next Deadline
                      </p>

                      <p className="mt-1 truncate text-xs font-medium text-blue-800">
                        {
                          analytics
                            .nearestDeadline
                            .title
                        }
                      </p>

                      <p className="mt-1 text-xs text-blue-700">
                        {formatDateTime(
                          analytics
                            .nearestDeadline
                            .dueDate
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-100 p-2 text-green-600">
                      <CheckCircle2
                        size={18}
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-green-900">
                        Schedule Clear
                      </p>

                      <p className="mt-1 text-xs text-green-700">
                        No upcoming deadline detected.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* FILTER TOOLBAR */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">

          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Assignment Directory
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Showing{" "}
                <span className="font-semibold text-gray-700">
                  {filteredAssignments.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-700">
                  {assignments.length}
                </span>{" "}
                assignments.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() =>
                  setViewMode("table")
                }
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  viewMode === "table"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Table
              </button>

              <button
                type="button"
                onClick={() =>
                  setViewMode("cards")
                }
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  viewMode === "cards"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Cards
              </button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">

            <div className="relative xl:col-span-2">
              <Search
                size={19}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    loadAssignments(true);
                  }
                }}
                placeholder="Search title, description, course or faculty..."
                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="relative">
              <select
                value={
                  courseFilter
                }
                onChange={(event) =>
                  setCourseFilter(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">
                  All Courses
                </option>

                {courses.map(
                  (course) => (
                    <option
                      key={course.id}
                      value={course.id}
                    >
                      {course.code} —{" "}
                      {course.name}
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <div className="relative">
              <select
                value={
                  facultyFilter
                }
                onChange={(event) =>
                  setFacultyFilter(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">
                  All Faculty
                </option>

                {facultyList.map(
                  (faculty) => (
                    <option
                      key={faculty.id}
                      value={faculty.id}
                    >
                      {getFacultyName(
                        faculty
                      )}
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <div className="relative">
              <select
                value={
                  statusFilter
                }
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">
                  All Status
                </option>

                <option value="UPCOMING">
                  Upcoming
                </option>

                <option value="DUE_SOON">
                  Due Soon
                </option>

                <option value="OVERDUE">
                  Overdue
                </option>

                <option value="NO_DATE">
                  No Due Date
                </option>
              </select>

              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="relative w-full sm:max-w-xs">
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="dueDateAsc">
                  Sort: Due Date ↑
                </option>

                <option value="dueDateDesc">
                  Sort: Due Date ↓
                </option>

                <option value="titleAsc">
                  Sort: Title A–Z
                </option>

                <option value="marksDesc">
                  Sort: Max Marks
                </option>

                <option value="submissionsDesc">
                  Sort: Submissions
                </option>
              </select>

              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  loadAssignments(true)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                <Search size={16} />
                Apply Search
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCourseFilter("ALL");
                  setFacultyFilter("ALL");
                  setStatusFilter("ALL");
                  setSortBy("dueDateAsc");
                  loadAssignments(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* ASSIGNMENT CONTENT */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="flex items-center gap-3 text-gray-600">
                <Loader2
                  size={25}
                  className="animate-spin"
                />
                Loading assignments...
              </div>
            </div>
          ) : filteredAssignments.length ===
            0 ? (
            <EmptyState
              message="No assignments found for the selected filters."
            />
          ) : viewMode ===
            "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px]">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Assignment
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Course
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Faculty
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Due Date
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Marks
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Submissions
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredAssignments.map(
                    (assignment) => {
                      const status =
                        getAssignmentStatus(
                          assignment
                        );

                      const days =
                        getDaysDifference(
                          assignment.dueDate
                        );

                      const submissionCount =
                        Number(
                          assignment?._count
                            ?.submissions ||
                            0
                        );

                      return (
                        <tr
                          key={
                            assignment.id
                          }
                          className="transition hover:bg-gray-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                                <FileText
                                  size={19}
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900">
                                  {
                                    assignment.title
                                  }
                                </p>

                                <p className="mt-1 max-w-[320px] truncate text-sm text-gray-500">
                                  {
                                    assignment.description ||
                                    "No description"
                                  }
                                </p>

                                <p className="mt-1 text-xs text-gray-400">
                                  Assignment #
                                  {
                                    assignment.id
                                  }
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-gray-800">
                              {
                                assignment.course
                                  ?.code ||
                                "-"
                              }
                            </p>

                            <p className="mt-1 max-w-[210px] truncate text-sm text-gray-500">
                              {
                                assignment.course
                                  ?.name ||
                                "-"
                              }
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              Semester{" "}
                              {
                                assignment
                                  .course
                                  ?.semester ??
                                "-"
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="rounded-full bg-gray-100 p-2">
                                <UserRound
                                  size={15}
                                  className="text-gray-500"
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800">
                                  {getFacultyName(
                                    assignment.faculty
                                  )}
                                </p>

                                <p className="text-xs text-gray-500">
                                  {
                                    assignment
                                      .faculty
                                      ?.employeeId ||
                                    "Not assigned"
                                  }
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p
                              className={`font-semibold ${
                                status.key ===
                                "OVERDUE"
                                  ? "text-red-600"
                                  : status.key ===
                                    "DUE_SOON"
                                  ? "text-orange-600"
                                  : "text-gray-800"
                              }`}
                            >
                              {formatDate(
                                assignment.dueDate
                              )}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {formatDateTime(
                                assignment.dueDate
                              )}
                            </p>

                            {days !==
                              null &&
                              !Number.isNaN(
                                days
                              ) && (
                                <p className="mt-1 text-xs text-gray-400">
                                  {days < 0
                                    ? `${Math.abs(
                                        days
                                      )} day(s) late`
                                    : days ===
                                      0
                                    ? "Due today"
                                    : `${days} day(s) remaining`}
                                </p>
                              )}
                          </td>

                          <td className="px-5 py-4">
                            <span className="font-semibold text-gray-800">
                              {assignment.maxMarks ??
                                "-"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                                <Users
                                  size={15}
                                />
                              </div>

                              <span className="text-sm font-semibold text-gray-800">
                                {
                                  submissionCount
                                }
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
                            >
                              {
                                status.label
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  loadAssignmentDetails(
                                    assignment.id
                                  )
                                }
                                className="rounded-lg border border-gray-300 p-2 text-gray-700 transition hover:bg-gray-100"
                                title="View details"
                              >
                                <Eye
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    assignment
                                  )
                                }
                                className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100"
                                title="Edit assignment"
                              >
                                <Pencil
                                  size={16}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteAssignment(
                                    assignment
                                  )
                                }
                                className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                                title="Delete assignment"
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredAssignments.map(
                (assignment) => {
                  const status =
                    getAssignmentStatus(
                      assignment
                    );

                  const days =
                    getDaysDifference(
                      assignment.dueDate
                    );

                  const submissionCount =
                    Number(
                      assignment?._count
                        ?.submissions ||
                      0
                    );

                  return (
                    <div
                      key={
                        assignment.id
                      }
                      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                            <FileText
                              size={19}
                            />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate font-bold text-gray-900">
                              {
                                assignment.title
                              }
                            </h3>

                            <p className="mt-1 text-xs text-gray-400">
                              #{assignment.id}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <p className="mt-4 min-h-[42px] text-sm leading-6 text-gray-600">
                        {
                          assignment.description ||
                          "No description provided."
                        }
                      </p>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">
                            Course
                          </p>

                          <p className="mt-1 font-semibold text-gray-900">
                            {
                              assignment.course
                                ?.code ||
                              "-"
                            }
                          </p>
                        </div>

                        <div className="rounded-xl bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">
                            Max Marks
                          </p>

                          <p className="mt-1 font-semibold text-gray-900">
                            {
                              assignment.maxMarks ??
                              "-"
                            }
                          </p>
                        </div>

                        <div className="rounded-xl bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">
                            Submissions
                          </p>

                          <p className="mt-1 font-semibold text-purple-600">
                            {
                              submissionCount
                            }
                          </p>
                        </div>

                        <div className="rounded-xl bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">
                            Due
                          </p>

                          <p className="mt-1 font-semibold text-gray-900">
                            {formatDate(
                              assignment.dueDate
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                        <div className="rounded-full bg-gray-100 p-2">
                          <UserRound
                            size={15}
                            className="text-gray-500"
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-800">
                            {getFacultyName(
                              assignment.faculty
                            )}
                          </p>

                          <p className="text-xs text-gray-500">
                            {
                              assignment.faculty
                                ?.employeeId ||
                              "Not assigned"
                            }
                          </p>
                        </div>
                      </div>

                      {days !==
                        null && (
                        <div
                          className={`mt-4 rounded-xl px-3 py-2 text-xs font-medium ${
                            days < 0
                              ? "bg-red-50 text-red-700"
                              : days <=
                                2
                              ? "bg-orange-50 text-orange-700"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          {days < 0
                            ? `${Math.abs(
                                days
                              )} day(s) past deadline`
                            : days ===
                              0
                            ? "Due today"
                            : `${days} day(s) remaining`}
                        </div>
                      )}

                      <div className="mt-5 flex justify-end gap-2 border-t pt-4">
                        <button
                          type="button"
                          onClick={() =>
                            loadAssignmentDetails(
                              assignment.id
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                          <Eye
                            size={15}
                          />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(
                              assignment
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-100"
                        >
                          <Pencil
                            size={15}
                          />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteAssignment(
                              assignment
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                        >
                          <Trash2
                            size={15}
                          />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* DETAILS MODAL */}
        {selectedAssignment &&
          !showAddModal &&
          !showEditModal && (
            <Modal
              title="Assignment Details"
              onClose={() =>
                setSelectedAssignment(
                  null
                )
              }
              wide
            >
              <div className="space-y-6">

                <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-600">
                        Assignment #
                        {
                          selectedAssignment.id
                        }
                      </p>

                      <h3 className="mt-1 text-2xl font-bold text-gray-900">
                        {
                          selectedAssignment.title
                        }
                      </h3>

                      <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                        {
                          selectedAssignment.description ||
                          "No description provided."
                        }
                      </p>
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
                        getAssignmentStatus(
                          selectedAssignment
                        ).className
                      }`}
                    >
                      {
                        getAssignmentStatus(
                          selectedAssignment
                        ).label
                      }
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border bg-gray-50 p-5">
                    <p className="text-sm text-gray-500">
                      Course
                    </p>

                    <p className="mt-1 text-xl font-bold text-gray-900">
                      {
                        selectedAssignment
                          .course
                          ?.code ||
                        "-"
                      }
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      {
                        selectedAssignment
                          .course
                          ?.name ||
                        "-"
                      }
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      Semester:{" "}
                      {
                        selectedAssignment
                          .course
                          ?.semester ??
                        "-"
                      }
                    </p>
                  </div>

                  <div className="rounded-xl border bg-gray-50 p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-white p-2 text-gray-600 shadow-sm">
                        <UserRound
                          size={18}
                        />
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">
                          Assigned Faculty
                        </p>

                        <p className="mt-1 font-bold text-gray-900">
                          {getFacultyName(
                            selectedAssignment.faculty
                          )}
                        </p>

                        <p className="text-xs text-gray-500">
                          {
                            selectedAssignment
                              .faculty
                              ?.employeeId ||
                            "No employee ID"
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-gray-500">
                      Due Date
                    </p>

                    <p className="mt-1 font-bold text-gray-900">
                      {
                        formatDateTime(
                          selectedAssignment.dueDate
                        )
                      }
                    </p>
                  </div>

                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-gray-500">
                      Maximum Marks
                    </p>

                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {
                        selectedAssignment.maxMarks
                      }
                    </p>
                  </div>

                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-gray-500">
                      Submissions
                    </p>

                    <p className="mt-1 text-2xl font-bold text-purple-600">
                      {
                        selectedAssignment
                          .submissions
                          ?.length ??
                        selectedAssignment
                          ?._count
                          ?.submissions ??
                        0
                      }
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Faculty Information
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Faculty member currently linked to
                        this assignment.
                      </p>
                    </div>

                    <UserRound
                      size={21}
                      className="text-gray-400"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Name
                      </p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {getFacultyName(
                          selectedAssignment.faculty
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Employee ID
                      </p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {
                          selectedAssignment
                            .faculty
                            ?.employeeId ||
                          "-"
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Email
                      </p>

                      <p className="mt-1 break-all font-semibold text-gray-900">
                        {
                          selectedAssignment
                            .faculty
                            ?.user
                            ?.email ||
                          "-"
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Student Submissions
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Submission and grading activity
                        associated with this assignment.
                      </p>
                    </div>

                    <div className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
                      {
                        selectedAssignment
                          .submissions
                          ?.length ??
                        selectedAssignment
                          ?._count
                          ?.submissions ??
                        0
                      }{" "}
                      submissions
                    </div>
                  </div>

                  {!selectedAssignment
                    .submissions ||
                  selectedAssignment
                    .submissions
                    .length ===
                    0 ? (
                    <div className="rounded-xl border border-dashed p-8">
                      <EmptyState
                        message="No student submissions yet."
                      />
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[920px]">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                                Student
                              </th>

                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                                Enrollment
                              </th>

                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                                Submitted
                              </th>

                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                                Status
                              </th>

                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                                Marks
                              </th>

                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                                Remarks
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y">
                            {selectedAssignment.submissions.map(
                              (
                                submission
                              ) => (
                                <tr
                                  key={
                                    submission.id
                                  }
                                  className="transition hover:bg-gray-50"
                                >
                                  <td className="px-4 py-3">
                                    <p className="text-sm font-semibold text-gray-800">
                                      {getStudentName(
                                        submission.student
                                      )}
                                    </p>

                                    <p className="mt-1 text-xs text-gray-500">
                                      {
                                        submission
                                          .student
                                          ?.user
                                          ?.email ||
                                        "-"
                                      }
                                    </p>
                                  </td>

                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {
                                      submission
                                        .student
                                        ?.enrollmentNumber ||
                                      "-"
                                    }
                                  </td>

                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {
                                      formatDateTime(
                                        submission.submittedAt
                                      )
                                    }
                                  </td>

                                  <td className="px-4 py-3">
                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                        submission.status ===
                                        "GRADED"
                                          ? "bg-green-50 text-green-700"
                                          : submission.status ===
                                            "LATE"
                                          ? "bg-orange-50 text-orange-700"
                                          : "bg-blue-50 text-blue-700"
                                      }`}
                                    >
                                      {
                                        submission.status ||
                                        "PENDING"
                                      }
                                    </span>
                                  </td>

                                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                                    {
                                      submission.marksObtained ??
                                      "-"
                                    }
                                  </td>

                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {
                                      submission.remarks ||
                                      "-"
                                    }
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
                  <button
                    type="button"
                    onClick={() =>
                      openEditModal(
                        selectedAssignment
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 font-medium text-blue-600 transition hover:bg-blue-100"
                  >
                    <Pencil
                      size={17}
                    />
                    Edit Assignment
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteAssignment(
                        selectedAssignment
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 font-medium text-red-600 transition hover:bg-red-100"
                  >
                    <Trash2
                      size={17}
                    />
                    Delete
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedAssignment(
                        null
                      )
                    }
                    className="rounded-xl border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </Modal>
          )}

        {/* ADD MODAL */}
        {showAddModal && (
          <Modal
            title="Add Assignment"
            onClose={
              closeModals
            }
          >
            <form
              onSubmit={
                handleAddAssignment
              }
              className="space-y-5"
            >
              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    {formError}
                  </span>
                </div>
              )}

              {loadingFormData && (
                <div className="flex items-center gap-3 rounded-xl border bg-gray-50 px-4 py-4 text-gray-600">
                  <Loader2
                    size={19}
                    className="animate-spin"
                  />

                  Loading courses and faculty...
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Assignment Title
                </label>

                <input
                  type="text"
                  name="title"
                  value={
                    addForm.title
                  }
                  onChange={
                    handleAddChange
                  }
                  placeholder="e.g. Binary Trees Assignment"
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Description
                </label>

                <textarea
                  name="description"
                  value={
                    addForm.description
                  }
                  onChange={
                    handleAddChange
                  }
                  rows={4}
                  placeholder="Enter assignment instructions..."
                  className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Due Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    name="dueDate"
                    value={
                      addForm.dueDate
                    }
                    onChange={
                      handleAddChange
                    }
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Maximum Marks
                  </label>

                  <input
                    type="number"
                    name="maxMarks"
                    value={
                      addForm.maxMarks
                    }
                    onChange={
                      handleAddChange
                    }
                    min="1"
                    step="1"
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Course
                </label>

                <select
                  name="courseId"
                  value={
                    addForm.courseId
                  }
                  onChange={
                    handleAddChange
                  }
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    Select course
                  </option>

                  {courses.map(
                    (course) => (
                      <option
                        key={
                          course.id
                        }
                        value={
                          course.id
                        }
                      >
                        {course.code} —{" "}
                        {
                          course.name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Faculty
                </label>

                <select
                  name="facultyId"
                  value={
                    addForm.facultyId
                  }
                  onChange={
                    handleAddChange
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    Not Assigned
                  </option>

                  {facultyList.map(
                    (faculty) => (
                      <option
                        key={
                          faculty.id
                        }
                        value={
                          faculty.id
                        }
                      >
                        {
                          getFacultyName(
                            faculty
                          )
                        }{" "}
                        —{" "}
                        {
                          faculty.employeeId ||
                          `Faculty #${faculty.id}`
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={
                    closeModals
                  }
                  className="rounded-xl border border-gray-300 px-5 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    formLoading ||
                    loadingFormData
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {formLoading && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  Create Assignment
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* EDIT MODAL */}
        {showEditModal &&
          selectedAssignment && (
            <Modal
              title="Edit Assignment"
              onClose={
                closeModals
              }
            >
              <form
                onSubmit={
                  handleEditAssignment
                }
                className="space-y-5"
              >
                {formError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0"
                    />

                    <span>
                      {formError}
                    </span>
                  </div>
                )}

                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Assignment ID
                      </p>

                      <p className="mt-1 font-bold text-gray-900">
                        #
                        {
                          selectedAssignment.id
                        }
                      </p>
                    </div>

                    <FileText
                      size={22}
                      className="text-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Assignment Title
                  </label>

                  <input
                    type="text"
                    name="title"
                    value={
                      editForm.title
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Description
                  </label>

                  <textarea
                    name="description"
                    value={
                      editForm.description
                    }
                    onChange={
                      handleEditChange
                    }
                    rows={4}
                    className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Due Date & Time
                    </label>

                    <input
                      type="datetime-local"
                      name="dueDate"
                      value={
                        editForm.dueDate
                      }
                      onChange={
                        handleEditChange
                      }
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Maximum Marks
                    </label>

                    <input
                      type="number"
                      name="maxMarks"
                      value={
                        editForm.maxMarks
                      }
                      onChange={
                        handleEditChange
                      }
                      min="1"
                      step="1"
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Course
                  </label>

                  <select
                    name="courseId"
                    value={
                      editForm.courseId
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">
                      Select course
                    </option>

                    {courses.map(
                      (course) => (
                        <option
                          key={
                            course.id
                          }
                          value={
                            course.id
                          }
                        >
                          {course.code} —{" "}
                          {
                            course.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Faculty
                  </label>

                  <select
                    name="facultyId"
                    value={
                      editForm.facultyId
                    }
                    onChange={
                      handleEditChange
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">
                      Not Assigned
                    </option>

                    {facultyList.map(
                      (faculty) => (
                        <option
                          key={
                            faculty.id
                          }
                          value={
                            faculty.id
                          }
                        >
                          {
                            getFacultyName(
                              faculty
                            )
                          }{" "}
                          —{" "}
                          {
                            faculty.employeeId ||
                            `Faculty #${faculty.id}`
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    type="button"
                    onClick={
                      closeModals
                    }
                    className="rounded-xl border border-gray-300 px-5 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      formLoading
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {formLoading && (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    )}

                    Save Changes
                  </button>
                </div>
              </form>
            </Modal>
          )}
      </div>
    </div>
  );
}