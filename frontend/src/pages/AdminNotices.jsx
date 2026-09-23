import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  CheckCircle,
  ChevronDown,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api";

const CATEGORIES = [
  "GENERAL",
  "ACADEMIC",
  "EXAMINATION",
  "FEES",
  "HOLIDAY",
  "EVENT",
  "URGENT",
];

const PRIORITIES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
];

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const BATCHES = ["1", "2", "3", "4", "5"];

const DIVISIONS = ["A", "B", "C", "D", "E"];

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function formatDateTime(value) {
  if (!value) return "-";

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
  if (!value) return "";

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

function getPriorityClasses(priority) {
  const value = String(priority || "").toUpperCase();

  if (value === "URGENT") {
    return "border-red-200 bg-red-100 text-red-700";
  }

  if (value === "HIGH") {
    return "border-orange-200 bg-orange-100 text-orange-700";
  }

  if (value === "LOW") {
    return "border-gray-200 bg-gray-100 text-gray-600";
  }

  return "border-blue-200 bg-blue-100 text-blue-700";
}

function getPublishClasses(isPublished) {
  return isPublished
    ? "border-green-200 bg-green-100 text-green-700"
    : "border-gray-200 bg-gray-100 text-gray-600";
}

function isTargetedNotice(notice) {
  return Boolean(
    (notice?.targetSemester !== null &&
      notice?.targetSemester !== undefined) ||
      (notice?.targetCourseId !== null &&
        notice?.targetCourseId !== undefined) ||
      (notice?.targetBatch !== null &&
        notice?.targetBatch !== undefined) ||
      (notice?.targetDivision !== null &&
        notice?.targetDivision !== undefined)
  );
}

function getTargetDescription(notice) {
  if (!isTargetedNotice(notice)) {
    return "All Students";
  }

  const parts = [];

  if (
    notice?.targetSemester !== null &&
    notice?.targetSemester !== undefined
  ) {
    parts.push(`Semester ${notice.targetSemester}`);
  }

  if (
    notice?.targetCourseId !== null &&
    notice?.targetCourseId !== undefined
  ) {
    if (notice.targetCourse) {
      parts.push(
        `${notice.targetCourse.code || ""} ${
          notice.targetCourse.name || ""
        }`.trim()
      );
    } else {
      parts.push(`Course #${notice.targetCourseId}`);
    }
  }

  if (
    notice?.targetBatch !== null &&
    notice?.targetBatch !== undefined
  ) {
    parts.push(`Batch ${notice.targetBatch}`);
  }

  if (
    notice?.targetDivision !== null &&
    notice?.targetDivision !== undefined
  ) {
    parts.push(
      `Division ${notice.targetDivision}`
    );
  }

  return parts.length > 0
    ? parts.join(" • ")
    : "Targeted";
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Bell
        size={42}
        className="mb-3 text-gray-400"
      />

      <p className="text-base font-medium text-gray-700">
        {message}
      </p>
    </div>
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
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${
          wide ? "max-w-4xl" : "max-w-3xl"
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

function TargetAudienceFields({
  form,
  setForm,
}) {
  function handleTargetTypeChange(event) {
    const value = event.target.value;

    setForm((current) => ({
      ...current,
      targetType: value,
      targetSemester:
        value === "TARGETED"
          ? current.targetSemester
          : "",
      targetCourseId:
        value === "TARGETED"
          ? current.targetCourseId
          : "",
      targetBatch:
        value === "TARGETED"
          ? current.targetBatch
          : "",
      targetDivision:
        value === "TARGETED"
          ? current.targetDivision
          : "",
      availableCourses:
        value === "TARGETED"
          ? current.availableCourses
          : [],
    }));
  }

  function handleTargetChange(event) {
    const { name, value } = event.target;

    setForm((current) => {
      const updated = {
        ...current,
        [name]: value,
      };

      if (name === "targetSemester") {
        updated.targetCourseId = "";
        updated.availableCourses =
          current.allCourses.filter(
            (course) =>
              Number(course.semester) ===
              Number(value)
          );
      }

      return updated;
    });
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-900">
          Target Audience
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Choose who should receive this notice.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Audience Type
          </label>

          <select
            name="targetType"
            value={form.targetType}
            onChange={handleTargetTypeChange}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="ALL">
              All Students
            </option>

            <option value="TARGETED">
              Targeted Students
            </option>
          </select>
        </div>

        {form.targetType === "TARGETED" && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Semester
                </label>

                <select
                  name="targetSemester"
                  value={form.targetSemester}
                  onChange={handleTargetChange}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    Select semester
                  </option>

                  {SEMESTERS.map(
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
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Batch
                </label>

                <select
                  name="targetBatch"
                  value={form.targetBatch}
                  onChange={handleTargetChange}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    All Batches
                  </option>

                  {BATCHES.map((batch) => (
                    <option
                      key={batch}
                      value={batch}
                    >
                      Batch {batch}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Division
                </label>

                <select
                  name="targetDivision"
                  value={form.targetDivision}
                  onChange={handleTargetChange}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    All Divisions
                  </option>

                  {DIVISIONS.map(
                    (division) => (
                      <option
                        key={division}
                        value={division}
                      >
                        Division {division}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Course
                </label>

                <select
                  name="targetCourseId"
                  value={form.targetCourseId}
                  onChange={handleTargetChange}
                  disabled={!form.targetSemester}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none disabled:cursor-not-allowed disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    All Courses
                  </option>

                  {form.availableCourses.map(
                    (course) => (
                      <option
                        key={course.id}
                        value={course.id}
                      >
                        {course.code} -{" "}
                        {course.name}
                      </option>
                    )
                  )}
                </select>

                {!form.targetSemester && (
                  <p className="mt-2 text-xs text-gray-500">
                    Select a semester first.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Target Preview
              </p>

              <p className="mt-2 font-semibold text-gray-900">
                {getTargetDescription({
                  targetSemester:
                    form.targetSemester
                      ? Number(
                          form.targetSemester
                        )
                      : null,
                  targetCourseId:
                    form.targetCourseId
                      ? Number(
                          form.targetCourseId
                        )
                      : null,
                  targetBatch:
                    form.targetBatch || null,
                  targetDivision:
                    form.targetDivision ||
                    null,
                  targetCourse:
                    form.availableCourses.find(
                      (course) =>
                        Number(course.id) ===
                        Number(
                          form.targetCourseId
                        )
                    ),
                })}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function createEmptyForm() {
  return {
    title: "",
    message: "",
    category: "GENERAL",
    priority: "NORMAL",
    isPublished: true,
    publishedAt: "",
    expiresAt: "",
    targetType: "ALL",
    targetSemester: "",
    targetCourseId: "",
    targetBatch: "",
    targetDivision: "",
    availableCourses: [],
    allCourses: [],
  };
}

export default function AdminNotices() {
  const navigate = useNavigate();

  const [notices, setNotices] = useState([]);
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("ALL");
  const [priorityFilter, setPriorityFilter] =
    useState("ALL");
  const [publishedFilter, setPublishedFilter] =
    useState("ALL");
  const [audienceFilter, setAudienceFilter] =
    useState("ALL");

  const [selectedNotice, setSelectedNotice] =
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
    useState(createEmptyForm());

  const [editForm, setEditForm] =
    useState(createEmptyForm());

  useEffect(() => {
    loadCourses();
    loadNotices();
  }, []);

  useEffect(() => {
    setAddForm((current) => ({
      ...current,
      allCourses: courses,
      availableCourses:
        courses.filter(
          (course) =>
            Number(course.semester) ===
            Number(current.targetSemester)
        ),
    }));

    setEditForm((current) => ({
      ...current,
      allCourses: courses,
      availableCourses:
        courses.filter(
          (course) =>
            Number(course.semester) ===
            Number(current.targetSemester)
        ),
    }));
  }, [courses]);

  async function loadCourses() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/courses`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to load courses"
        );
      }

      const loadedCourses = Array.isArray(
        data?.courses
      )
        ? data.courses
        : Array.isArray(data?.data)
        ? data.data
        : [];

      setCourses(loadedCourses);
    } catch (error) {
      console.error(
        "Load admin courses error:",
        error
      );
    }
  }

  async function loadNotices(
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

      if (categoryFilter !== "ALL") {
        params.set(
          "category",
          categoryFilter
        );
      }

      if (priorityFilter !== "ALL") {
        params.set(
          "priority",
          priorityFilter
        );
      }

      if (publishedFilter !== "ALL") {
        params.set(
          "isPublished",
          publishedFilter
        );
      }

      const query = params.toString();

      const response = await fetch(
        `${API_BASE_URL}/admin/notices${
          query ? `?${query}` : ""
        }`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to load notices"
        );
      }

      let loadedNotices =
        Array.isArray(data?.notices)
          ? data.notices
          : [];

      if (
        audienceFilter === "GLOBAL"
      ) {
        loadedNotices =
          loadedNotices.filter(
            (notice) =>
              !isTargetedNotice(notice)
          );
      }

      if (
        audienceFilter === "TARGETED"
      ) {
        loadedNotices =
          loadedNotices.filter(
            (notice) =>
              isTargetedNotice(notice)
          );
      }

      setNotices(loadedNotices);
    } catch (error) {
      console.error(
        "Load admin notices error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to load notices"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadNoticeDetails(
    noticeId
  ) {
    try {
      setFormError("");

      const response = await fetch(
        `${API_BASE_URL}/admin/notices/${noticeId}`,
        {
          headers: getAuthHeaders(),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to load notice details"
        );
      }

      setSelectedNotice(
        data?.notice || null
      );
    } catch (error) {
      console.error(
        "Load notice details error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to load notice details"
      );
    }
  }

  function openAddModal() {
    setFormError("");
    setSuccessMessage("");

    const now = new Date();

    setAddForm({
      ...createEmptyForm(),
      publishedAt:
        toDateTimeLocal(now),
      allCourses: courses,
      availableCourses: [],
    });

    setShowAddModal(true);
  }

  function openEditModal(notice) {
    setFormError("");
    setSuccessMessage("");
    setSelectedNotice(notice);

    const targeted =
      isTargetedNotice(notice);

    const semester =
      notice?.targetSemester !== null &&
      notice?.targetSemester !== undefined
        ? String(
            notice.targetSemester
          )
        : "";

    const courseId =
      notice?.targetCourseId !== null &&
      notice?.targetCourseId !== undefined
        ? String(
            notice.targetCourseId
          )
        : "";

    setEditForm({
      title: notice?.title || "",
      message: notice?.message || "",
      category:
        notice?.category || "GENERAL",
      priority:
        notice?.priority || "NORMAL",
      isPublished: Boolean(
        notice?.isPublished
      ),
      publishedAt:
        toDateTimeLocal(
          notice?.publishedAt
        ),
      expiresAt:
        toDateTimeLocal(
          notice?.expiresAt
        ),
      targetType: targeted
        ? "TARGETED"
        : "ALL",
      targetSemester: semester,
      targetCourseId: courseId,
      targetBatch:
        notice?.targetBatch || "",
      targetDivision:
        notice?.targetDivision || "",
      allCourses: courses,
      availableCourses:
        courses.filter(
          (course) =>
            Number(course.semester) ===
            Number(semester)
        ),
    });

    setShowEditModal(true);
  }

  function closeModals() {
    setShowAddModal(false);
    setShowEditModal(false);
    setFormError("");
  }

  function handleAddChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setAddForm((current) => {
      const updated = {
        ...current,
        [name]:
          type === "checkbox"
            ? checked
            : value,
      };

      if (name === "targetSemester") {
        updated.targetCourseId = "";

        updated.availableCourses =
          courses.filter(
            (course) =>
              Number(course.semester) ===
              Number(value)
          );
      }

      if (
        name === "targetType" &&
        value === "ALL"
      ) {
        updated.targetSemester = "";
        updated.targetCourseId = "";
        updated.targetBatch = "";
        updated.targetDivision = "";
        updated.availableCourses = [];
      }

      return updated;
    });
  }

  function handleEditChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setEditForm((current) => {
      const updated = {
        ...current,
        [name]:
          type === "checkbox"
            ? checked
            : value,
      };

      if (name === "targetSemester") {
        updated.targetCourseId = "";

        updated.availableCourses =
          courses.filter(
            (course) =>
              Number(course.semester) ===
              Number(value)
          );
      }

      if (
        name === "targetType" &&
        value === "ALL"
      ) {
        updated.targetSemester = "";
        updated.targetCourseId = "";
        updated.targetBatch = "";
        updated.targetDivision = "";
        updated.availableCourses = [];
      }

      return updated;
    });
  }

  function validateNoticeForm(form) {
    if (!form.title.trim()) {
      return "Please enter a notice title.";
    }

    if (!form.message.trim()) {
      return "Please enter the notice message.";
    }

    if (
      form.publishedAt &&
      form.expiresAt
    ) {
      const publishedAt = new Date(
        form.publishedAt
      );

      const expiresAt = new Date(
        form.expiresAt
      );

      if (
        Number.isNaN(
          publishedAt.getTime()
        ) ||
        Number.isNaN(
          expiresAt.getTime()
        )
      ) {
        return "Please enter valid dates.";
      }

      if (expiresAt <= publishedAt) {
        return "Expiry date must be later than publication date.";
      }
    }

    if (form.targetType === "TARGETED") {
      if (!form.targetSemester) {
        return "Please select a target semester.";
      }

      if (
        form.targetCourseId &&
        !form.availableCourses.some(
          (course) =>
            Number(course.id) ===
            Number(form.targetCourseId)
        )
      ) {
        return "Selected target course is invalid for the selected semester.";
      }
    }

    return "";
  }

  function buildNoticePayload(form) {
    return {
      title: form.title.trim(),
      message: form.message.trim(),
      category: form.category,
      priority: form.priority,
      isPublished: form.isPublished,

      publishedAt: form.publishedAt
        ? new Date(
            form.publishedAt
          ).toISOString()
        : undefined,

      expiresAt: form.expiresAt
        ? new Date(
            form.expiresAt
          ).toISOString()
        : null,

      targetSemester:
        form.targetType === "TARGETED" &&
        form.targetSemester
          ? Number(
              form.targetSemester
            )
          : null,

      targetCourseId:
        form.targetType === "TARGETED" &&
        form.targetCourseId
          ? Number(
              form.targetCourseId
            )
          : null,

      targetBatch:
        form.targetType === "TARGETED" &&
        form.targetBatch
          ? form.targetBatch
          : null,

      targetDivision:
        form.targetType === "TARGETED" &&
        form.targetDivision
          ? form.targetDivision
          : null,
    };
  }

  async function handleAddNotice(event) {
    event.preventDefault();

    try {
      setFormLoading(true);
      setFormError("");
      setSuccessMessage("");

      const validationError =
        validateNoticeForm(addForm);

      if (validationError) {
        throw new Error(
          validationError
        );
      }

      const payload =
        buildNoticePayload(addForm);

      console.log(
        "Creating notice payload:",
        payload
      );

      const response = await fetch(
        `${API_BASE_URL}/admin/notices`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(
            payload
          ),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to create notice"
        );
      }

      setSuccessMessage(
        "Notice created successfully."
      );

      setShowAddModal(false);

      await loadNotices(true);
    } catch (error) {
      console.error(
        "Create admin notice error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to create notice"
      );
    } finally {
      setFormLoading(false);
    }
  }

  async function handleEditNotice(event) {
    event.preventDefault();

    if (!selectedNotice) {
      return;
    }

    try {
      setFormLoading(true);
      setFormError("");
      setSuccessMessage("");

      const validationError =
        validateNoticeForm(editForm);

      if (validationError) {
        throw new Error(
          validationError
        );
      }

      const payload =
        buildNoticePayload(editForm);

      console.log(
        "Updating notice payload:",
        payload
      );

      const response = await fetch(
        `${API_BASE_URL}/admin/notices/${selectedNotice.id}`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(
            payload
          ),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to update notice"
        );
      }

      setSuccessMessage(
        "Notice updated successfully."
      );

      setShowEditModal(false);

      await loadNotices(true);

      await loadNoticeDetails(
        selectedNotice.id
      );
    } catch (error) {
      console.error(
        "Update admin notice error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to update notice"
      );
    } finally {
      setFormLoading(false);
    }
  }

  async function handleStatusChange(notice) {
    try {
      setFormError("");
      setSuccessMessage("");

      const nextStatus =
        !notice.isPublished;

      const response = await fetch(
        `${API_BASE_URL}/admin/notices/${notice.id}/status`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            isPublished: nextStatus,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to update notice status"
        );
      }

      setSuccessMessage(
        nextStatus
          ? "Notice published successfully."
          : "Notice unpublished successfully."
      );

      await loadNotices(true);

      if (
        selectedNotice?.id ===
        notice.id
      ) {
        await loadNoticeDetails(
          notice.id
        );
      }
    } catch (error) {
      console.error(
        "Update notice status error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to update notice status"
      );
    }
  }

  async function handleDeleteNotice(notice) {
    if (!notice) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${notice.title}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setFormError("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_BASE_URL}/admin/notices/${notice.id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to delete notice"
        );
      }

      setSuccessMessage(
        "Notice deleted successfully."
      );

      if (
        selectedNotice?.id ===
        notice.id
      ) {
        setSelectedNotice(null);
      }

      await loadNotices(true);
    } catch (error) {
      console.error(
        "Delete notice error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to delete notice"
      );
    }
  }

  const stats = useMemo(() => {
    const total = notices.length;

    const published = notices.filter(
      (notice) => notice.isPublished
    ).length;

    const unpublished =
      total - published;

    const urgent = notices.filter(
      (notice) =>
        String(
          notice.priority || ""
        ).toUpperCase() ===
        "URGENT"
    ).length;

    const targeted = notices.filter(
      (notice) =>
        isTargetedNotice(notice)
    ).length;

    return {
      total,
      published,
      unpublished,
      urgent,
      targeted,
    };
  }, [notices]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <Bell size={16} />

              <span>Admin</span>

              <span>/</span>

              <span>Notices</span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              Notices Management
            </h1>

            <p className="mt-1 text-gray-600">
              Manage announcements and college notices.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/admin/dashboard"
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              ← Back to Dashboard
            </button>

            <button
              type="button"
              onClick={() =>
                loadNotices(true)
              }
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw
                size={18}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={
                openAddModal
              }
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={18} />

              Create Notice
            </button>
          </div>
        </div>

        {/* SUCCESS */}
        {successMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            <CheckCircle size={20} />

            <span className="font-medium">
              {successMessage}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage(
                  ""
                )
              }
              className="ml-auto"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* ERROR */}
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
                className="ml-auto"
              >
                <X size={18} />
              </button>
            </div>
          )}

        {/* STATS */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Total Notices
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Published
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {stats.published}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Unpublished
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-600">
              {stats.unpublished}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Urgent
            </p>

            <p className="mt-2 text-3xl font-bold text-red-600">
              {stats.urgent}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Targeted
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {stats.targeted}
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="relative flex-1">
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
                    event.key === "Enter"
                  ) {
                    loadNotices(true);
                  }
                }}
                placeholder="Search notices..."
                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="relative min-w-[170px]">
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">
                  All Categories
                </option>

                {CATEGORIES.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <div className="relative min-w-[170px]">
              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">
                  All Priorities
                </option>

                {PRIORITIES.map(
                  (priority) => (
                    <option
                      key={priority}
                      value={priority}
                    >
                      {priority}
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <div className="relative min-w-[170px]">
              <select
                value={publishedFilter}
                onChange={(event) =>
                  setPublishedFilter(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">
                  All Visibility
                </option>

                <option value="true">
                  Published
                </option>

                <option value="false">
                  Unpublished
                </option>
              </select>

              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <div className="relative min-w-[170px]">
              <select
                value={audienceFilter}
                onChange={(event) =>
                  setAudienceFilter(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">
                  All Audiences
                </option>

                <option value="GLOBAL">
                  Global
                </option>

                <option value="TARGETED">
                  Targeted
                </option>
              </select>

              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                loadNotices(true)
              }
              className="rounded-xl bg-gray-900 px-5 py-3 font-medium text-white transition hover:bg-gray-800"
            >
              Search
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex items-center gap-3 text-gray-600">
                <Loader2
                  size={24}
                  className="animate-spin"
                />

                Loading notices...
              </div>
            </div>
          ) : notices.length === 0 ? (
            <EmptyState message="No notices found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px]">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Notice
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Category
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Priority
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Audience
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Published
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Expires
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {notices.map(
                    (notice) => (
                      <tr
                        key={notice.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {notice.title}
                          </p>

                          <p className="mt-1 max-w-md truncate text-sm text-gray-500">
                            {
                              notice.message
                            }
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            Notice #
                            {notice.id}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {
                              notice.category
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityClasses(
                              notice.priority
                            )}`}
                          >
                            {
                              notice.priority
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                                isTargetedNotice(
                                  notice
                                )
                                  ? "border-blue-200 bg-blue-100 text-blue-700"
                                  : "border-gray-200 bg-gray-100 text-gray-600"
                              }`}
                            >
                              {isTargetedNotice(
                                notice
                              )
                                ? "TARGETED"
                                : "ALL STUDENTS"}
                            </span>

                            <p className="max-w-xs text-xs leading-5 text-gray-500">
                              {getTargetDescription(
                                notice
                              )}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPublishClasses(
                              notice.isPublished
                            )}`}
                          >
                            {notice.isPublished
                              ? "Published"
                              : "Unpublished"}
                          </span>

                          <p className="mt-2 text-xs text-gray-500">
                            {formatDateTime(
                              notice.publishedAt
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {notice.expiresAt
                            ? formatDateTime(
                                notice.expiresAt
                              )
                            : "No expiry"}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                loadNoticeDetails(
                                  notice.id
                                )
                              }
                              className="rounded-lg border border-gray-300 p-2 text-gray-700 transition hover:bg-gray-100"
                              title="View notice"
                            >
                              <Eye
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  notice
                                )
                              }
                              className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100"
                              title="Edit notice"
                            >
                              <Pencil
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(
                                  notice
                                )
                              }
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                notice.isPublished
                                  ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                                  : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                              }`}
                            >
                              {notice.isPublished
                                ? "Unpublish"
                                : "Publish"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteNotice(
                                  notice
                                )
                              }
                              className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                              title="Delete notice"
                            >
                              <Trash2
                                size={16}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DETAILS MODAL */}
        {selectedNotice &&
          !showAddModal &&
          !showEditModal && (
            <Modal
              title="Notice Details"
              onClose={() =>
                setSelectedNotice(
                  null
                )
              }
              wide
            >
              <div className="space-y-6">
                <div className="rounded-xl border bg-gray-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {
                          selectedNotice.title
                        }
                      </h3>

                      <p className="mt-2 text-sm text-gray-500">
                        Notice #
                        {
                          selectedNotice.id
                        }
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {
                          selectedNotice.category
                        }
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityClasses(
                          selectedNotice.priority
                        )}`}
                      >
                        {
                          selectedNotice.priority
                        }
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPublishClasses(
                          selectedNotice.isPublished
                        )}`}
                      >
                        {selectedNotice.isPublished
                          ? "Published"
                          : "Unpublished"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 whitespace-pre-wrap rounded-xl border bg-white p-4 text-gray-700">
                    {
                      selectedNotice.message
                    }
                  </div>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Target Audience
                  </p>

                  <p className="mt-2 font-semibold text-gray-900">
                    {getTargetDescription(
                      selectedNotice
                    )}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-gray-500">
                        Semester
                      </p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {selectedNotice.targetSemester ??
                          "All"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-gray-500">
                        Course
                      </p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {selectedNotice.targetCourse
                          ? `${selectedNotice.targetCourse.code} - ${selectedNotice.targetCourse.name}`
                          : "All"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-gray-500">
                        Batch
                      </p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {selectedNotice.targetBatch ||
                          "All"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-3">
                      <p className="text-xs text-gray-500">
                        Division
                      </p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {selectedNotice.targetDivision ||
                          "All"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-gray-500">
                      Published At
                    </p>

                    <p className="mt-2 font-semibold text-gray-900">
                      {formatDateTime(
                        selectedNotice.publishedAt
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-gray-500">
                      Expires At
                    </p>

                    <p className="mt-2 font-semibold text-gray-900">
                      {selectedNotice.expiresAt
                        ? formatDateTime(
                            selectedNotice.expiresAt
                          )
                        : "No expiry"}
                    </p>
                  </div>

                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-gray-500">
                      Created At
                    </p>

                    <p className="mt-2 font-semibold text-gray-900">
                      {formatDateTime(
                        selectedNotice.createdAt
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      openEditModal(
                        selectedNotice
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 font-medium text-blue-600 transition hover:bg-blue-100"
                  >
                    <Pencil size={17} />
                    Edit Notice
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(
                        selectedNotice
                      )
                    }
                    className="rounded-xl border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {selectedNotice.isPublished
                      ? "Unpublish"
                      : "Publish"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedNotice(
                        null
                      )
                    }
                    className="rounded-xl border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
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
            title="Create Notice"
            onClose={closeModals}
            wide
          >
            <form
              onSubmit={handleAddNotice}
              className="space-y-5"
            >
              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Title
                </label>

                <input
                  type="text"
                  name="title"
                  value={addForm.title}
                  onChange={
                    handleAddChange
                  }
                  placeholder="Enter notice title"
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Message
                </label>

                <textarea
                  name="message"
                  value={addForm.message}
                  onChange={
                    handleAddChange
                  }
                  rows="6"
                  placeholder="Enter notice message..."
                  required
                  className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Category
                  </label>

                  <select
                    name="category"
                    value={
                      addForm.category
                    }
                    onChange={
                      handleAddChange
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {CATEGORIES.map(
                      (category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Priority
                  </label>

                  <select
                    name="priority"
                    value={
                      addForm.priority
                    }
                    onChange={
                      handleAddChange
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {PRIORITIES.map(
                      (priority) => (
                        <option
                          key={priority}
                          value={priority}
                        >
                          {priority}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <TargetAudienceFields
                form={addForm}
                setForm={setAddForm}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Publication Date
                  </label>

                  <input
                    type="datetime-local"
                    name="publishedAt"
                    value={
                      addForm.publishedAt
                    }
                    onChange={
                      handleAddChange
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Expiry Date
                  </label>

                  <input
                    type="datetime-local"
                    name="expiresAt"
                    value={
                      addForm.expiresAt
                    }
                    onChange={
                      handleAddChange
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-gray-50 px-4 py-3">
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={
                    addForm.isPublished
                  }
                  onChange={
                    handleAddChange
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />

                <span className="text-sm font-semibold text-gray-700">
                  Publish notice immediately
                </span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModals}
                  className="rounded-xl border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {formLoading && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  Create Notice
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* EDIT MODAL */}
        {showEditModal &&
          selectedNotice && (
            <Modal
              title="Edit Notice"
              onClose={closeModals}
              wide
            >
              <form
                onSubmit={handleEditNotice}
                className="space-y-5"
              >
                {formError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0"
                    />

                    <span>{formError}</span>
                  </div>
                )}

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">
                    Notice ID
                  </p>

                  <p className="mt-1 font-bold text-gray-900">
                    #{selectedNotice.id}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Title
                  </label>

                  <input
                    type="text"
                    name="title"
                    value={editForm.title}
                    onChange={
                      handleEditChange
                    }
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Message
                  </label>

                  <textarea
                    name="message"
                    value={
                      editForm.message
                    }
                    onChange={
                      handleEditChange
                    }
                    rows="6"
                    required
                    className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Category
                    </label>

                    <select
                      name="category"
                      value={
                        editForm.category
                      }
                      onChange={
                        handleEditChange
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {CATEGORIES.map(
                        (category) => (
                          <option
                            key={category}
                            value={category}
                          >
                            {category}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Priority
                    </label>

                    <select
                      name="priority"
                      value={
                        editForm.priority
                      }
                      onChange={
                        handleEditChange
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {PRIORITIES.map(
                        (priority) => (
                          <option
                            key={priority}
                            value={priority}
                          >
                            {priority}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <TargetAudienceFields
                  form={editForm}
                  setForm={setEditForm}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Publication Date
                    </label>

                    <input
                      type="datetime-local"
                      name="publishedAt"
                      value={
                        editForm.publishedAt
                      }
                      onChange={
                        handleEditChange
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Expiry Date
                    </label>

                    <input
                      type="datetime-local"
                      name="expiresAt"
                      value={
                        editForm.expiresAt
                      }
                      onChange={
                        handleEditChange
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-gray-50 px-4 py-3">
                  <input
                    type="checkbox"
                    name="isPublished"
                    checked={
                      editForm.isPublished
                    }
                    onChange={
                      handleEditChange
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />

                  <span className="text-sm font-semibold text-gray-700">
                    Notice is published
                  </span>
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={
                      closeModals
                    }
                    className="rounded-xl border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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