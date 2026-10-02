import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  Clock3,
  Edit3,
  Eye,
  Filter,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
} from "../api";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const CLASS_TYPES = [
  "Lecture",
  "Practical",
  "Tutorial",
  "Lab",
];

const BATCH_OPTIONS = [
  { value: "ALL", label: "All Batches" },
  {
    value: "COMMON",
    label: "Common / All Batches",
  },
  { value: "1", label: "Batch 1" },
  { value: "2", label: "Batch 2" },
  { value: "3", label: "Batch 3" },
];

function handleAuthError(error) {
  const message = String(
    error?.message || ""
  ).toLowerCase();

  if (
    message.includes("401") ||
    message.includes("unauthorized") ||
    message.includes("authentication") ||
    message.includes("token")
  ) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
    return true;
  }

  return false;
}

function getDayName(dayOfWeek) {
  const day = DAYS.find(
    (item) =>
      item.value === Number(dayOfWeek)
  );

  return day?.label || "-";
}

function getFacultyName(faculty) {
  if (!faculty?.user) {
    return "Not Assigned";
  }

  const fullName =
    `${faculty.user.firstName || ""} ${
      faculty.user.lastName || ""
    }`.trim();

  return fullName || "Not Assigned";
}

function getBatchLabel(batch) {
  if (
    batch === null ||
    batch === undefined ||
    String(batch).trim() === ""
  ) {
    return "Common / All";
  }

  const normalizedBatch =
    String(batch);

  if (normalizedBatch === "1") {
    return "Batch 1";
  }

  if (normalizedBatch === "2") {
    return "Batch 2";
  }

  if (normalizedBatch === "3") {
    return "Batch 3";
  }

  return `Batch ${normalizedBatch}`;
}

function getBatchBadgeClass(batch) {
  if (
    batch === null ||
    batch === undefined ||
    String(batch).trim() === ""
  ) {
    return "bg-slate-100 text-slate-700";
  }

  if (String(batch) === "1") {
    return "bg-blue-50 text-blue-700";
  }

  if (String(batch) === "2") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (String(batch) === "3") {
    return "bg-violet-50 text-violet-700";
  }

  return "bg-gray-100 text-gray-700";
}

function getTimeSortValue(time) {
  if (!time) {
    return Number.MAX_SAFE_INTEGER;
  }

  const parts = String(time).split(":");

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  return hours * 60 + minutes;
}

function formatTime(time) {
  if (!time) return "-";

  const parts = String(time).split(":");

  if (parts.length < 2) {
    return time;
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return time;
  }

  const date = new Date();

  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <CalendarDays
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
          wide
            ? "max-w-5xl"
            : "max-w-2xl"
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

export default function AdminTimetable() {
  const navigate = useNavigate();
  const [timetable, setTimetable] =
    useState([]);
  const [courses, setCourses] =
    useState([]);
  const [facultyList, setFacultyList] =
    useState([]);

  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [
    formDataLoading,
    setFormDataLoading,
  ] = useState(false);

  const [search, setSearch] =
    useState("");
  const [
    courseFilter,
    setCourseFilter,
  ] = useState("ALL");
  const [
    facultyFilter,
    setFacultyFilter,
  ] = useState("ALL");
  const [dayFilter, setDayFilter] =
    useState("ALL");
  const [
    classTypeFilter,
    setClassTypeFilter,
  ] = useState("ALL");
  const [
    batchFilter,
    setBatchFilter,
  ] = useState("ALL");

  const [
    selectedEntry,
    setSelectedEntry,
  ] = useState(null);

  const [
    showAddModal,
    setShowAddModal,
  ] = useState(false);
  const [
    showEditModal,
    setShowEditModal,
  ] = useState(false);

  const [formLoading, setFormLoading] =
    useState(false);
  const [formError, setFormError] =
    useState("");
  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [addForm, setAddForm] =
    useState({
      courseId: "",
      facultyId: "",
      dayOfWeek: "1",
      startTime: "",
      endTime: "",
      room: "",
      classType: "Lecture",
      batch: "",
    });

  const [editForm, setEditForm] =
    useState({
      courseId: "",
      facultyId: "",
      dayOfWeek: "1",
      startTime: "",
      endTime: "",
      room: "",
      classType: "Lecture",
      batch: "",
    });

  useEffect(() => {
    loadInitialData();
  }, []);

  // ============================================================
  // INITIAL DATA
  // ============================================================

  async function loadInitialData() {
    await Promise.all([
      loadTimetable(),
      loadCourses(),
      loadFaculty(),
    ]);
  }

  // ============================================================
  // LOAD TIMETABLE
  // ============================================================

  async function loadTimetable(
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

      if (dayFilter !== "ALL") {
        params.set(
          "dayOfWeek",
          dayFilter
        );
      }

      if (
        classTypeFilter !==
        "ALL"
      ) {
        params.set(
          "classType",
          classTypeFilter
        );
      }

      if (
        batchFilter !== "ALL"
      ) {
        if (
          batchFilter ===
          "COMMON"
        ) {
          params.set("batch", "");
        } else {
          params.set(
            "batch",
            batchFilter
          );
        }
      }

      const query =
        params.toString();

      const endpoint = `/admin/timetable${
        query ? `?${query}` : ""
      }`;

      const data = await apiGet(
        endpoint
      );

      setTimetable(
        Array.isArray(
          data?.timetable
        )
          ? data.timetable
          : Array.isArray(
              data?.data
            )
          ? data.data
          : []
      );
    } catch (error) {
      console.error(
        "Load admin timetable error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      setFormError(
        error.message ||
          "Unable to load timetable"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ============================================================
  // LOAD COURSES
  // ============================================================

  async function loadCourses() {
    try {
      const data = await apiGet("/courses");

      setCourses(
        Array.isArray(data?.courses)
          ? data.courses
          : Array.isArray(data?.data)
          ? data.data
          : []
      );
    } catch (error) {
      console.error(
        "Load timetable courses error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      setFormError(
        error.message ||
          "Unable to load courses"
      );
    }
  }

  // ============================================================
  // LOAD FACULTY
  // ============================================================

  async function loadFaculty() {
    try {
      const data = await apiGet(
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
        "Load timetable faculty error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      setFormError(
        error.message ||
          "Unable to load faculty"
      );
    }
  }

  // ============================================================
  // ENSURE FORM DATA
  // ============================================================

  async function ensureFormDataLoaded() {
    try {
      if (
        courses.length > 0 &&
        facultyList.length > 0
      ) {
        return;
      }

      setFormDataLoading(true);

      await Promise.all([
        courses.length === 0
          ? loadCourses()
          : Promise.resolve(),

        facultyList.length === 0
          ? loadFaculty()
          : Promise.resolve(),
      ]);
    } finally {
      setFormDataLoading(false);
    }
  }

  // ============================================================
  // LOAD ENTRY DETAILS
  // ============================================================

  async function loadEntryDetails(
    entryId
  ) {
    try {
      setFormError("");

      const data =
        await apiGet(
          `/admin/timetable/${entryId}`
        );

      setSelectedEntry(
        data?.timetable ||
          data?.data ||
          null
      );
    } catch (error) {
      console.error(
        "Load timetable details error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      setFormError(
        error.message ||
          "Unable to load timetable details"
      );
    }
  }

  // ============================================================
  // OPEN ADD MODAL
  // ============================================================

  async function openAddModal() {
    setFormError("");
    setSuccessMessage("");

    setAddForm({
      courseId: "",
      facultyId: "",
      dayOfWeek: "1",
      startTime: "",
      endTime: "",
      room: "",
      classType: "Lecture",
      batch: "",
    });

    await ensureFormDataLoaded();

    setShowAddModal(true);
  }

  // ============================================================
  // OPEN EDIT MODAL
  // ============================================================

  async function openEditModal(
    entry
  ) {
    setFormError("");
    setSuccessMessage("");

    await ensureFormDataLoaded();

    setSelectedEntry(entry);

    setEditForm({
      courseId: String(
        entry?.courseId ??
          entry?.course?.id ??
          ""
      ),

      facultyId:
        entry?.facultyId === null ||
        entry?.facultyId ===
          undefined
          ? ""
          : String(
              entry.facultyId
            ),

      dayOfWeek: String(
        entry?.dayOfWeek ?? 1
      ),

      startTime:
        entry?.startTime || "",

      endTime:
        entry?.endTime || "",

      room: entry?.room || "",

      classType:
        entry?.classType ||
        "Lecture",

      batch:
        entry?.batch === null ||
        entry?.batch ===
          undefined
          ? ""
          : String(entry.batch),
    });

    setShowEditModal(true);
  }

  // ============================================================
  // CLOSE MODALS
  // ============================================================

  function closeModals() {
    setShowAddModal(false);
    setShowEditModal(false);
    setFormError("");
  }

  // ============================================================
  // FORM HANDLERS
  // ============================================================

  function handleAddChange(event) {
    const {
      name,
      value,
    } = event.target;

    setAddForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleEditChange(event) {
    const {
      name,
      value,
    } = event.target;

    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  // ============================================================
  // TIME VALIDATION
  // ============================================================

  function validateTimeRange(
    startTime,
    endTime
  ) {
    if (!startTime || !endTime) {
      return "Start time and end time are required";
    }

    if (
      getTimeSortValue(
        startTime
      ) >=
      getTimeSortValue(
        endTime
      )
    ) {
      return "End time must be later than start time";
    }

    return "";
  }

  // ============================================================
  // CREATE ENTRY
  // ============================================================

  async function handleAddEntry(
    event
  ) {
    event.preventDefault();

    try {
      setFormLoading(true);
      setFormError("");
      setSuccessMessage("");

      if (!addForm.courseId) {
        throw new Error(
          "Please select a course"
        );
      }

      const timeError =
        validateTimeRange(
          addForm.startTime,
          addForm.endTime
        );

      if (timeError) {
        throw new Error(
          timeError
        );
      }

      await apiPost(
        "/admin/timetable",
        {
          courseId: Number(
            addForm.courseId
          ),

          facultyId:
            addForm.facultyId ||
            null,

          dayOfWeek: Number(
            addForm.dayOfWeek
          ),

          startTime:
            addForm.startTime,

          endTime:
            addForm.endTime,

          room:
            addForm.room.trim() ||
            null,

          classType:
            addForm.classType,

          batch:
            addForm.batch || null,
        }
      );

      setSuccessMessage(
        "Timetable entry created successfully."
      );

      setShowAddModal(false);

      await loadTimetable(true);
    } catch (error) {
      console.error(
        "Create timetable entry error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      setFormError(
        error.message ||
          "Unable to create timetable entry"
      );
    } finally {
      setFormLoading(false);
    }
  }

  // ============================================================
  // UPDATE ENTRY
  // ============================================================

  async function handleEditEntry(
    event
  ) {
    event.preventDefault();

    if (!selectedEntry) {
      return;
    }

    try {
      setFormLoading(true);
      setFormError("");
      setSuccessMessage("");

      if (!editForm.courseId) {
        throw new Error(
          "Please select a course"
        );
      }

      const timeError =
        validateTimeRange(
          editForm.startTime,
          editForm.endTime
        );

      if (timeError) {
        throw new Error(
          timeError
        );
      }

      await apiPatch(
        `/admin/timetable/${selectedEntry.id}`,
        {
          courseId: Number(
            editForm.courseId
          ),

          facultyId:
            editForm.facultyId ||
            null,

          dayOfWeek: Number(
            editForm.dayOfWeek
          ),

          startTime:
            editForm.startTime,

          endTime:
            editForm.endTime,

          room:
            editForm.room.trim() ||
            null,

          classType:
            editForm.classType,

          batch:
            editForm.batch || null,
        }
      );

      setSuccessMessage(
        "Timetable entry updated successfully."
      );

      setShowEditModal(false);

      await loadTimetable(true);

      await loadEntryDetails(
        selectedEntry.id
      );
    } catch (error) {
      console.error(
        "Update timetable entry error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      setFormError(
        error.message ||
          "Unable to update timetable entry"
      );
    } finally {
      setFormLoading(false);
    }
  }

  // ============================================================
  // DELETE ENTRY
  // ============================================================

  async function handleDeleteEntry(
    entry
  ) {
    if (!entry) {
      return;
    }

    const courseName =
      entry.course?.name ||
      entry.course?.code ||
      "this timetable entry";

    const confirmed =
      window.confirm(
        `Delete the timetable entry for "${courseName}" on ${getDayName(
          entry.dayOfWeek
        )} from ${formatTime(
          entry.startTime
        )} to ${formatTime(
          entry.endTime
        )}${
          entry.batch
            ? ` for Batch ${entry.batch}`
            : ""
        }?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setFormError("");
      setSuccessMessage("");

      await apiDelete(
        `/admin/timetable/${entry.id}`
      );

      setSuccessMessage(
        "Timetable entry deleted successfully."
      );

      if (
        selectedEntry?.id ===
        entry.id
      ) {
        setSelectedEntry(null);
      }

      await loadTimetable(true);
    } catch (error) {
      console.error(
        "Delete timetable entry error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      setFormError(
        error.message ||
          "Unable to delete timetable entry"
      );
    }
  }

  // ============================================================
  // SORTED TIMETABLE
  // ============================================================

  const sortedTimetable =
    useMemo(() => {
      return [...timetable].sort(
        (a, b) => {
          if (
            Number(
              a.dayOfWeek
            ) !==
            Number(
              b.dayOfWeek
            )
          ) {
            return (
              Number(
                a.dayOfWeek
              ) -
              Number(
                b.dayOfWeek
              )
            );
          }

          const timeDifference =
            getTimeSortValue(
              a.startTime
            ) -
            getTimeSortValue(
              b.startTime
            );

          if (
            timeDifference !==
            0
          ) {
            return timeDifference;
          }

          const batchA =
            a.batch === null ||
            a.batch ===
              undefined
              ? 0
              : Number(a.batch);

          const batchB =
            b.batch === null ||
            b.batch ===
              undefined
              ? 0
              : Number(b.batch);

          return batchA - batchB;
        }
      );
    }, [timetable]);

  // ============================================================
  // STATS
  // ============================================================

  const stats = useMemo(() => {
    const total =
      timetable.length;

    const uniqueCourses =
      new Set(
        timetable
          .map(
            (entry) =>
              entry.courseId ??
              entry.course?.id
          )
          .filter(Boolean)
      ).size;

    const uniqueFaculty =
      new Set(
        timetable
          .map(
            (entry) =>
              entry.facultyId ??
              entry.faculty?.id
          )
          .filter(Boolean)
      ).size;

    const practicals =
      timetable.filter(
        (entry) =>
          String(
            entry.classType ||
              ""
          ).toLowerCase() ===
          "practical"
      ).length;

    const commonEntries =
      timetable.filter(
        (entry) =>
          entry.batch ===
            null ||
          entry.batch ===
            undefined ||
          String(
            entry.batch
          ).trim() === ""
      ).length;

    const batch1Entries =
      timetable.filter(
        (entry) =>
          String(
            entry.batch
          ) === "1"
      ).length;

    const batch2Entries =
      timetable.filter(
        (entry) =>
          String(
            entry.batch
          ) === "2"
      ).length;

    const batch3Entries =
      timetable.filter(
        (entry) =>
          String(
            entry.batch
          ) === "3"
      ).length;

    return {
      total,
      uniqueCourses,
      uniqueFaculty,
      practicals,
      commonEntries,
      batch1Entries,
      batch2Entries,
      batch3Entries,
    };
  }, [timetable]);

  // ============================================================
  // CLASS TYPES
  // ============================================================

  const filteredClassTypes =
    useMemo(() => {
      const types = new Set(
        timetable
          .map(
            (entry) =>
              entry.classType
          )
          .filter(Boolean)
      );

      return Array.from(
        types
      ).sort();
    }, [timetable]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* ==================================================== */}
        {/* HEADER */}
        {/* ==================================================== */}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <CalendarDays
                size={16}
              />

              <span>Admin</span>
              <span>/</span>
              <span>
                Timetable
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              Timetable Management
            </h1>

            <p className="mt-1 text-gray-600">
              Manage class schedules,
              rooms, faculty and batch
              assignments.
            </p>
          </div>

<div className="flex flex-wrap gap-3">
  <button
    type="button"
    onClick={() => navigate("/admin/dashboard")}
    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
  >
    <ArrowLeft size={18} />
    Back to Dashboard
  </button>

  <button
    type="button"
    onClick={() => loadTimetable(true)}
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
    onClick={openAddModal}
    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-700"
  >
    <Plus size={18} />
    Add Timetable Entry
  </button>
</div>
        </div>

        {/* ==================================================== */}
        {/* SUCCESS */}
        {/* ==================================================== */}

        {successMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            <CheckCircle
              size={20}
            />

            <span className="font-medium">
              {successMessage}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage("")
              }
              className="ml-auto"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* ==================================================== */}
        {/* ERROR */}
        {/* ==================================================== */}

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

        {/* ==================================================== */}
        {/* STATS */}
        {/* ==================================================== */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Schedule Entries
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Courses Scheduled
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {stats.uniqueCourses}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Faculty Assigned
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {stats.uniqueFaculty}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Practical Sessions
            </p>

            <p className="mt-2 text-3xl font-bold text-purple-600">
              {stats.practicals}
            </p>
          </div>
        </div>

        {/* ==================================================== */}
        {/* BATCH SUMMARY */}
        {/* ==================================================== */}

        <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Filter size={19} />
            </div>

            <div>
              <h2 className="font-bold text-gray-900">
                Batch Schedule Overview
              </h2>

              <p className="text-sm text-gray-500">
                Distribution of timetable entries by batch.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">
                Common
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-700">
                {
                  stats.commonEntries
                }
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-medium text-blue-600">
                Batch 1
              </p>

              <p className="mt-1 text-2xl font-bold text-blue-700">
                {
                  stats.batch1Entries
                }
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-medium text-emerald-600">
                Batch 2
              </p>

              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {
                  stats.batch2Entries
                }
              </p>
            </div>

            <div className="rounded-xl bg-violet-50 p-4">
              <p className="text-xs font-medium text-violet-600">
                Batch 3
              </p>

              <p className="mt-1 text-2xl font-bold text-violet-700">
                {
                  stats.batch3Entries
                }
              </p>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* FILTERS */}
        {/* ==================================================== */}

        <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Filter size={17} />
            Schedule Filters
          </div>

          <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
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
                    loadTimetable(
                      true
                    );
                  }
                }}
                placeholder="Search room, course, faculty or batch..."
                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="relative">
              <select
                value={batchFilter}
                onChange={(event) =>
                  setBatchFilter(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {BATCH_OPTIONS.map(
                  (batch) => (
                    <option
                      key={
                        batch.value
                      }
                      value={
                        batch.value
                      }
                    >
                      {batch.label}
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
                value={dayFilter}
                onChange={(event) =>
                  setDayFilter(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">
                  All Days
                </option>

                {DAYS.map((day) => (
                  <option
                    key={
                      day.value
                    }
                    value={
                      day.value
                    }
                  >
                    {day.label}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <div className="relative">
              <select
                value={courseFilter}
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

              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <div className="relative">
              <select
                value={facultyFilter}
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
                      key={
                        faculty.id
                      }
                      value={
                        faculty.id
                      }
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
                  classTypeFilter
                }
                onChange={(event) =>
                  setClassTypeFilter(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">
                  All Class Types
                </option>

                {CLASS_TYPES.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  )
                )}

                {filteredClassTypes
                  .filter(
                    (type) =>
                      !CLASS_TYPES.includes(
                        type
                      )
                  )
                  .map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
              </select>

              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() =>
                loadTimetable(true)
              }
              className="rounded-xl bg-gray-900 px-5 py-3 font-medium text-white transition hover:bg-gray-800"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* TABLE */}
        {/* ==================================================== */}

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex items-center gap-3 text-gray-600">
                <Loader2
                  size={24}
                  className="animate-spin"
                />

                Loading timetable...
              </div>
            </div>
          ) : sortedTimetable.length ===
            0 ? (
            <EmptyState message="No timetable entries found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px]">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Day
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Time
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Course
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Faculty
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Room
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Type
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Batch
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {sortedTimetable.map(
                    (entry) => (
                      <tr
                        key={
                          entry.id
                        }
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <span className="font-semibold text-gray-900">
                            {getDayName(
                              entry.dayOfWeek
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Clock3
                              size={16}
                              className="text-gray-400"
                            />

                            <div>
                              <p className="font-medium text-gray-800">
                                {formatTime(
                                  entry.startTime
                                )}
                              </p>

                              <p className="text-xs text-gray-500">
                                to{" "}
                                {formatTime(
                                  entry.endTime
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {entry.course
                              ?.code ||
                              "-"}
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            {entry.course
                              ?.name ||
                              "-"}
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

                            <div>
                              <p className="font-medium text-gray-800">
                                {getFacultyName(
                                  entry.faculty
                                )}
                              </p>

                              <p className="text-xs text-gray-500">
                                {entry
                                  .faculty
                                  ?.employeeId ||
                                  "Not assigned"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-gray-700">
                            <MapPin
                              size={16}
                              className="text-gray-400"
                            />

                            {entry.room ||
                              "Not assigned"}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {
                              entry.classType
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getBatchBadgeClass(
                              entry.batch
                            )}`}
                          >
                            {getBatchLabel(
                              entry.batch
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                loadEntryDetails(
                                  entry.id
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
                                  entry
                                )
                              }
                              className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100"
                              title="Edit entry"
                            >
                              <Edit3
                                size={16}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteEntry(
                                  entry
                                )
                              }
                              className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                              title="Delete entry"
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

        {/* ==================================================== */}
        {/* DETAILS MODAL */}
        {/* ==================================================== */}

        {selectedEntry &&
          !showAddModal &&
          !showEditModal && (
            <Modal
              title="Timetable Details"
              onClose={() =>
                setSelectedEntry(
                  null
                )
              }
            >
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">
                      Course
                    </p>

                    <p className="mt-1 text-xl font-bold text-gray-900">
                      {selectedEntry
                        .course
                        ?.code ||
                        "-"}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      {selectedEntry
                        .course
                        ?.name ||
                        "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">
                      Class Type
                    </p>

                    <span className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {
                        selectedEntry.classType
                      }
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border p-4">
                    <div className="flex items-center gap-2">
                      <CalendarDays
                        size={18}
                        className="text-gray-400"
                      />

                      <p className="text-sm text-gray-500">
                        Day
                      </p>
                    </div>

                    <p className="mt-2 text-lg font-bold text-gray-900">
                      {getDayName(
                        selectedEntry.dayOfWeek
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="flex items-center gap-2">
                      <Clock3
                        size={18}
                        className="text-gray-400"
                      />

                      <p className="text-sm text-gray-500">
                        Time
                      </p>
                    </div>

                    <p className="mt-2 text-lg font-bold text-gray-900">
                      {formatTime(
                        selectedEntry.startTime
                      )}{" "}
                      –{" "}
                      {formatTime(
                        selectedEntry.endTime
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-gray-500">
                      Batch
                    </p>

                    <span
                      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getBatchBadgeClass(
                        selectedEntry.batch
                      )}`}
                    >
                      {getBatchLabel(
                        selectedEntry.batch
                      )}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <div className="flex items-center gap-2">
                      <MapPin
                        size={18}
                        className="text-gray-400"
                      />

                      <p className="text-sm text-gray-500">
                        Room
                      </p>
                    </div>

                    <p className="mt-2 text-lg font-bold text-gray-900">
                      {selectedEntry.room ||
                        "Not assigned"}
                    </p>
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="flex items-center gap-2">
                      <UserRound
                        size={18}
                        className="text-gray-400"
                      />

                      <p className="text-sm text-gray-500">
                        Faculty
                      </p>
                    </div>

                    <p className="mt-2 text-lg font-bold text-gray-900">
                      {getFacultyName(
                        selectedEntry.faculty
                      )}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {selectedEntry
                        .faculty
                        ?.employeeId ||
                        "Not assigned"}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      openEditModal(
                        selectedEntry
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 font-medium text-blue-600 transition hover:bg-blue-100"
                  >
                    <Edit3 size={17} />
                    Edit Entry
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedEntry(
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

        {/* ==================================================== */}
        {/* ADD MODAL */}
        {/* ==================================================== */}

        {showAddModal && (
          <Modal
            title="Add Timetable Entry"
            onClose={
              closeModals
            }
          >
            <form
              onSubmit={
                handleAddEntry
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

              {formDataLoading && (
                <div className="flex items-center gap-3 rounded-xl border bg-gray-50 px-4 py-3 text-gray-600">
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />

                  Loading courses and
                  faculty...
                </div>
              )}

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
                        {getFacultyName(
                          faculty
                        )}{" "}
                        —{" "}
                        {faculty.employeeId ||
                          `Faculty #${faculty.id}`}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Day
                </label>

                <select
                  name="dayOfWeek"
                  value={
                    addForm.dayOfWeek
                  }
                  onChange={
                    handleAddChange
                  }
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {DAYS.map(
                    (day) => (
                      <option
                        key={
                          day.value
                        }
                        value={
                          day.value
                        }
                      >
                        {day.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Start Time
                  </label>

                  <input
                    type="time"
                    name="startTime"
                    value={
                      addForm.startTime
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
                    End Time
                  </label>

                  <input
                    type="time"
                    name="endTime"
                    value={
                      addForm.endTime
                    }
                    onChange={
                      handleAddChange
                    }
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Room
                  </label>

                  <input
                    type="text"
                    name="room"
                    value={
                      addForm.room
                    }
                    onChange={
                      handleAddChange
                    }
                    placeholder="e.g. GD 401"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Class Type
                  </label>

                  <select
                    name="classType"
                    value={
                      addForm.classType
                    }
                    onChange={
                      handleAddChange
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {CLASS_TYPES.map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Batch
                </label>

                <select
                  name="batch"
                  value={
                    addForm.batch
                  }
                  onChange={
                    handleAddChange
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    Common / All Batches
                  </option>

                  <option value="1">
                    Batch 1
                  </option>

                  <option value="2">
                    Batch 2
                  </option>

                  <option value="3">
                    Batch 3
                  </option>
                </select>

                <p className="mt-1 text-xs text-gray-500">
                  Choose a specific batch
                  for batch-wise sessions.
                </p>
              </div>

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
                  disabled={
                    formLoading ||
                    formDataLoading
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {formLoading && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  Create Entry
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ==================================================== */}
        {/* EDIT MODAL */}
        {/* ==================================================== */}

        {showEditModal &&
          selectedEntry && (
            <Modal
              title="Edit Timetable Entry"
              onClose={
                closeModals
              }
            >
              <form
                onSubmit={
                  handleEditEntry
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
                  <p className="text-sm text-gray-500">
                    Timetable Entry
                  </p>

                  <p className="mt-1 font-bold text-gray-900">
                    #
                    {
                      selectedEntry.id
                    }
                  </p>
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
                          {getFacultyName(
                            faculty
                          )}{" "}
                          —{" "}
                          {faculty.employeeId ||
                            `Faculty #${faculty.id}`}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Day
                  </label>

                  <select
                    name="dayOfWeek"
                    value={
                      editForm.dayOfWeek
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {DAYS.map(
                      (day) => (
                        <option
                          key={
                            day.value
                          }
                          value={
                            day.value
                          }
                        >
                          {day.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Start Time
                    </label>

                    <input
                      type="time"
                      name="startTime"
                      value={
                        editForm.startTime
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
                      End Time
                    </label>

                    <input
                      type="time"
                      name="endTime"
                      value={
                        editForm.endTime
                      }
                      onChange={
                        handleEditChange
                      }
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Room
                    </label>

                    <input
                      type="text"
                      name="room"
                      value={
                        editForm.room
                      }
                      onChange={
                        handleEditChange
                      }
                      placeholder="e.g. GD 401"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Class Type
                    </label>

                    <select
                      name="classType"
                      value={
                        editForm.classType
                      }
                      onChange={
                        handleEditChange
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {CLASS_TYPES.map(
                        (type) => (
                          <option
                            key={type}
                            value={type}
                          >
                            {type}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Batch
                  </label>

                  <select
                    name="batch"
                    value={
                      editForm.batch
                    }
                    onChange={
                      handleEditChange
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">
                      Common / All Batches
                    </option>

                    <option value="1">
                      Batch 1
                    </option>

                    <option value="2">
                      Batch 2
                    </option>

                    <option value="3">
                      Batch 3
                    </option>
                  </select>

                  <p className="mt-1 text-xs text-gray-500">
                    Change the batch for
                    this session.
                  </p>
                </div>

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
                    disabled={
                      formLoading
                    }
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