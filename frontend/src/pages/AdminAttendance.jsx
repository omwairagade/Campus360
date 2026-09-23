import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Filter,
  GraduationCap,
  RefreshCw,
  Search,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";

const API_BASE_URL = "http://localhost:5000/api";

const AdminAttendance = () => {
  const [records, setRecords] = useState([]);

  const [summary, setSummary] = useState({
    totalRecords: 0,
    present: 0,
    absent: 0,
    late: 0,
    attended: 0,
    attendancePercentage: 0,
  });

  const [filters, setFilters] = useState({
    date: "",
    courseId: "",
    facultyId: "",
    studentId: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    date: "",
    courseId: "",
    facultyId: "",
    studentId: "",
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const fetchAttendance = useCallback(
    async (currentFilters, isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          logout();
          return;
        }

        const params = new URLSearchParams();

        if (currentFilters.date) {
          params.append("date", currentFilters.date);
        }

        if (currentFilters.courseId) {
          params.append("courseId", currentFilters.courseId);
        }

        if (currentFilters.facultyId) {
          params.append("facultyId", currentFilters.facultyId);
        }

        if (currentFilters.studentId) {
          params.append("studentId", currentFilters.studentId);
        }

        const query = params.toString();

        const url = query
          ? `${API_BASE_URL}/attendance/admin?${query}`
          : `${API_BASE_URL}/attendance/admin`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.status === 401) {
          logout();
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              data?.error ||
              "Failed to load attendance records."
          );
        }

        if (!data?.success) {
          throw new Error(
            data?.message ||
              "Failed to load attendance records."
          );
        }

        setRecords(
          Array.isArray(data.records)
            ? data.records
            : []
        );

        setSummary({
          totalRecords: Number(
            data?.summary?.totalRecords || 0
          ),
          present: Number(
            data?.summary?.present || 0
          ),
          absent: Number(
            data?.summary?.absent || 0
          ),
          late: Number(
            data?.summary?.late || 0
          ),
          attended: Number(
            data?.summary?.attended || 0
          ),
          attendancePercentage: Number(
            data?.summary?.attendancePercentage || 0
          ),
        });
      } catch (err) {
        console.error(
          "Admin attendance error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load attendance records."
        );

        setRecords([]);

        setSummary({
          totalRecords: 0,
          present: 0,
          absent: 0,
          late: 0,
          attended: 0,
          attendancePercentage: 0,
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchAttendance(appliedFilters);
  }, [fetchAttendance, appliedFilters]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const applyFilters = (event) => {
    event.preventDefault();

    setAppliedFilters({
      date: filters.date,
      courseId: filters.courseId.trim(),
      facultyId: filters.facultyId.trim(),
      studentId: filters.studentId.trim(),
    });
  };

  const resetFilters = () => {
    const emptyFilters = {
      date: "",
      courseId: "",
      facultyId: "",
      studentId: "",
    };

    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "-";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStudentName = (student) => {
    if (!student) {
      return "Unknown Student";
    }

    const name = [
      student.firstName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      name ||
      student.email ||
      `Student #${student.id}`
    );
  };

  const getFacultyName = (faculty) => {
    if (!faculty) {
      return "Unknown Faculty";
    }

    const name = [
      faculty.firstName,
      faculty.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      name ||
      faculty.email ||
      `Faculty #${faculty.id}`
    );
  };

  const getStatusConfig = (status) => {
    const normalized = String(status || "")
      .toUpperCase()
      .trim();

    if (normalized === "PRESENT") {
      return {
        label: "Present",
        className:
          "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
      };
    }

    if (normalized === "ABSENT") {
      return {
        label: "Absent",
        className:
          "bg-red-50 text-red-700 border-red-200",
        icon: XCircle,
      };
    }

    if (normalized === "LATE") {
      return {
        label: "Late",
        className:
          "bg-amber-50 text-amber-700 border-amber-200",
        icon: Clock3,
      };
    }

    return {
      label: status || "Unknown",
      className:
        "bg-slate-50 text-slate-700 border-slate-200",
      icon: AlertCircle,
    };
  };

  const summaryCards = [
    {
      title: "Total Records",
      value: summary.totalRecords,
      description: "Attendance entries",
      icon: ClipboardCheck,
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      title: "Present",
      value: summary.present,
      description: "Students present",
      icon: CheckCircle2,
      iconClass:
        "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Absent",
      value: summary.absent,
      description: "Students absent",
      icon: XCircle,
      iconClass: "bg-red-50 text-red-600",
    },
    {
      title: "Late",
      value: summary.late,
      description: "Late attendance",
      icon: Clock3,
      iconClass: "bg-amber-50 text-amber-600",
    },
    {
      title: "Attendance",
      value: `${summary.attendancePercentage.toFixed(
        1
      )}%`,
      description: `${summary.attended} attended`,
      icon: GraduationCap,
      iconClass:
        "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <ClipboardCheck size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Attendance Management
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Monitor and review student attendance
                records
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              fetchAttendance(
                appliedFilters,
                true
              )
            }
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={17}
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
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {card.title}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {card.value}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {card.description}
                    </p>
                  </div>

                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconClass}`}
                  >
                    <Icon size={19} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Filter size={18} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Attendance Filters
              </h2>

              <p className="text-xs text-slate-500">
                Filter attendance records
              </p>
            </div>
          </div>

          <form
            onSubmit={applyFilters}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5"
          >
            {/* Date */}
            <div>
              <label
                htmlFor="attendance-date"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Date
              </label>

              <div className="relative">
                <CalendarDays
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="attendance-date"
                  type="date"
                  name="date"
                  value={filters.date}
                  onChange={handleFilterChange}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Course */}
            <div>
              <label
                htmlFor="course-id"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Course ID
              </label>

              <div className="relative">
                <ClipboardCheck
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="course-id"
                  type="number"
                  min="1"
                  name="courseId"
                  value={filters.courseId}
                  onChange={handleFilterChange}
                  placeholder="e.g. 1"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Faculty */}
            <div>
              <label
                htmlFor="faculty-id"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Faculty ID
              </label>

              <div className="relative">
                <UserRound
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="faculty-id"
                  type="number"
                  min="1"
                  name="facultyId"
                  value={filters.facultyId}
                  onChange={handleFilterChange}
                  placeholder="e.g. 1"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Student */}
            <div>
              <label
                htmlFor="student-id"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Student ID
              </label>

              <div className="relative">
                <Users
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="student-id"
                  type="number"
                  min="1"
                  name="studentId"
                  value={filters.studentId}
                  onChange={handleFilterChange}
                  placeholder="e.g. 1"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Search size={17} />
                Apply
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                title="Reset filters"
              >
                <X size={17} />
                <span className="hidden xl:inline">
                  Reset
                </span>
              </button>
            </div>
          </form>

          {/* Active filters */}
          {(appliedFilters.date ||
            appliedFilters.courseId ||
            appliedFilters.facultyId ||
            appliedFilters.studentId) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <span className="text-xs font-semibold text-slate-500">
                Active:
              </span>

              {appliedFilters.date && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  Date: {appliedFilters.date}
                </span>
              )}

              {appliedFilters.courseId && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  Course: {appliedFilters.courseId}
                </span>
              )}

              {appliedFilters.facultyId && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  Faculty:{" "}
                  {appliedFilters.facultyId}
                </span>
              )}

              {appliedFilters.studentId && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  Student:{" "}
                  {appliedFilters.studentId}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Unable to load attendance
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Records */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Attendance Records
              </h2>

              <p className="text-xs text-slate-500">
                {records.length} record
                {records.length === 1
                  ? ""
                  : "s"} found
              </p>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {summary.attendancePercentage.toFixed(
                1
              )}
              % attendance
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
              <RefreshCw
                size={28}
                className="animate-spin text-blue-600"
              />

              <p className="text-sm font-medium text-slate-500">
                Loading attendance records...
              </p>
            </div>
          ) : records.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <ClipboardCheck size={26} />
              </div>

              <h3 className="mt-4 text-base font-semibold text-slate-800">
                No attendance records found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                Try changing or clearing the filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Course
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Faculty
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Batch / Division
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Semester
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {records.map((record) => {
                    const statusConfig =
                      getStatusConfig(
                        record.status
                      );

                    const StatusIcon =
                      statusConfig.icon;

                    return (
                      <tr
                        key={record.id}
                        className="transition hover:bg-slate-50"
                      >
                        {/* Date */}
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex items-center gap-2">
                            <CalendarDays
                              size={16}
                              className="text-slate-400"
                            />

                            <span className="text-sm font-medium text-slate-700">
                              {formatDate(
                                record.date
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Student */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
                              {String(
                                record.student
                                  ?.firstName ||
                                  "S"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {getStudentName(
                                  record.student
                                )}
                              </p>

                              <p className="truncate text-xs text-slate-400">
                                {record.student
                                  ?.email ||
                                  `Student ID: ${
                                    record.student
                                      ?.id || "-"
                                  }`}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Course */}
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {record.course?.code ||
                              `Course #${
                                record.course?.id ||
                                "-"
                              }`}
                          </p>

                          <p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500">
                            {record.course?.name ||
                              "Unknown Course"}
                          </p>
                        </td>

                        {/* Faculty */}
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-700">
                            {getFacultyName(
                              record.faculty
                            )}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {record.faculty
                              ?.employeeId ||
                              `Faculty ID: ${
                                record.faculty
                                  ?.id || "-"
                              }`}
                          </p>
                        </td>

                        {/* Batch / Division */}
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {record.student
                              ?.batch && (
                              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                {
                                  record.student
                                    .batch
                                }
                              </span>
                            )}

                            {record.student
                              ?.division && (
                              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                                Div{" "}
                                {
                                  record.student
                                    .division
                                }
                              </span>
                            )}

                            {!record.student
                              ?.batch &&
                              !record.student
                                ?.division && (
                                <span className="text-xs text-slate-400">
                                  -
                                </span>
                              )}
                          </div>
                        </td>

                        {/* Semester */}
                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-600">
                            {record.student
                              ?.semester ||
                              record.course
                                ?.semester ||
                              "-"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusConfig.className}`}
                          >
                            <StatusIcon
                              size={14}
                            />

                            {
                              statusConfig.label
                            }
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} />

            <span>
              Attendance data is loaded from the
              campus ERP backend.
            </span>
          </div>

          <span>
            Total displayed:{" "}
            <strong className="text-slate-700">
              {records.length}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdminAttendance;