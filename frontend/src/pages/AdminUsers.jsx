import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  apiGet,
  apiPatch,
} from "../api";

const ROLES = [
  "ALL",
  "STUDENT",
  "FACULTY",
  "ADMIN",
  "PARENT",
];

const ROLE_META = {
  STUDENT: {
    label: "Student",
    classes:
      "border-blue-200 bg-blue-50 text-blue-700",
  },
  FACULTY: {
    label: "Faculty",
    classes:
      "border-purple-200 bg-purple-50 text-purple-700",
  },
  ADMIN: {
    label: "Admin",
    classes:
      "border-red-200 bg-red-50 text-red-700",
  },
  PARENT: {
    label: "Parent",
    classes:
      "border-orange-200 bg-orange-50 text-orange-700",
  },
};

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

function getFullName(user) {
  return (
    `${user?.firstName || ""} ${
      user?.lastName || ""
    }`.trim() || "Unknown User"
  );
}

function getInitials(user) {
  const first = String(
    user?.firstName || ""
  ).trim();

  const last = String(
    user?.lastName || ""
  ).trim();

  const initials =
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

  if (initials) {
    return initials;
  }

  return String(
    user?.email || "U"
  )
    .charAt(0)
    .toUpperCase();
}

function getRoleLabel(role) {
  return (
    ROLE_META[role]?.label ||
    role ||
    "Unknown"
  );
}

function getRoleClasses(role) {
  return (
    ROLE_META[role]?.classes ||
    "border-gray-200 bg-gray-50 text-gray-700"
  );
}

function getProfileId(user) {
  if (!user) return "-";

  if (user.role === "STUDENT") {
    return (
      user.student?.enrollmentNumber ||
      "-"
    );
  }

  if (user.role === "FACULTY") {
    return (
      user.faculty?.employeeId || "-"
    );
  }

  return `User #${user.id}`;
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
            ? "max-w-4xl"
            : "max-w-3xl"
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
            aria-label="Close"
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

function EmptyState({ message }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
        <Users
          size={30}
          className="text-gray-400"
        />
      </div>

      <p className="font-semibold text-gray-800">
        {message}
      </p>

      <p className="mt-1 text-sm text-gray-500">
        Try changing your search or filter
        criteria.
      </p>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-gray-500">
              {description}
            </p>
          )}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);

  const [stats, setStats] =
    useState({
      total: 0,
      active: 0,
      inactive: 0,
      roles: {
        students: 0,
        faculty: 0,
        admins: 0,
        parents: 0,
      },
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState("ALL");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [formError, setFormError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData(
    showRefreshLoader = false
  ) {
    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setFormError("");

      await Promise.all([
        loadUsers(),
        loadUserStats(),
      ]);
    } catch (error) {
      console.error(
        "Load admin users data error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to load user data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadUsers() {
    const params =
      new URLSearchParams();

    if (search.trim()) {
      params.set(
        "search",
        search.trim()
      );
    }

    if (roleFilter !== "ALL") {
      params.set(
        "role",
        roleFilter
      );
    }

    if (statusFilter !== "ALL") {
      params.set(
        "isActive",
        statusFilter
      );
    }

    const query =
      params.toString();

    const data = await apiGet(
      `/admin/users${
        query ? `?${query}` : ""
      }`
    );

    setUsers(
      Array.isArray(data?.users)
        ? data.users
        : []
    );
  }

  async function loadUserStats() {
    const data = await apiGet(
      "/admin/users/stats"
    );

    setStats(
      data?.stats || {
        total: 0,
        active: 0,
        inactive: 0,
        roles: {
          students: 0,
          faculty: 0,
          admins: 0,
          parents: 0,
        },
      }
    );
  }

  async function loadUserDetails(
    userId
  ) {
    try {
      setDetailsLoading(true);
      setFormError("");

      const data = await apiGet(
        `/admin/users/${userId}`
      );

      setSelectedUser(
        data?.user || null
      );
    } catch (error) {
      console.error(
        "Load user details error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to load user details."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleStatusChange(
    user
  ) {
    const nextStatus =
      !user.isActive;

    const actionText =
      nextStatus
        ? "activate"
        : "deactivate";

    const confirmed =
      window.confirm(
        `Are you sure you want to ${actionText} ${getFullName(
          user
        )}'s account?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setFormError("");
      setSuccessMessage("");

      await apiPatch(
        `/admin/users/${user.id}/status`,
        {
          isActive: nextStatus,
        }
      );

      setSuccessMessage(
        nextStatus
          ? `${getFullName(
              user
            )}'s account was activated successfully.`
          : `${getFullName(
              user
            )}'s account was deactivated successfully.`
      );

      await loadData(true);

      if (
        selectedUser?.id ===
        user.id
      ) {
        await loadUserDetails(
          user.id
        );
      }
    } catch (error) {
      console.error(
        "Update user status error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to update user status."
      );
    }
  }

  function handleSearch() {
    loadData(true);
  }

  function clearFilters() {
    setSearch("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");

    setTimeout(() => {
      loadData(true);
    }, 0);
  }

  const visibleRoleStats =
    useMemo(
      () => [
        {
          label: "Students",
          value:
            stats.roles?.students ||
            0,
        },
        {
          label: "Faculty",
          value:
            stats.roles?.faculty ||
            0,
        },
        {
          label: "Admins",
          value:
            stats.roles?.admins ||
            0,
        },
        {
          label: "Parents",
          value:
            stats.roles?.parents ||
            0,
        },
      ],
      [stats]
    );

  function getProfileSummary(
    user
  ) {
    if (!user) {
      return null;
    }

    if (
      user.role === "STUDENT" &&
      user.student
    ) {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Enrollment Number
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {
                user.student
                  .enrollmentNumber
              }
            </p>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Semester
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {
                user.student
                  .semester
              }
            </p>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Admission Year
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {
                user.student
                  .admissionYear
              }
            </p>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Phone
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {user.student.phone ||
                "-"}
            </p>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4 sm:col-span-2">
            <p className="text-sm text-gray-500">
              Academic Group
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              Batch{" "}
              {user.student.batch ||
                "-"}{" "}
              · Division{" "}
              {user.student.division ||
                "-"}
            </p>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4 sm:col-span-2">
            <p className="text-sm text-gray-500">
              Department
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {user.student
                .departmentRel
                ?.name || "-"}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {user.student
                .departmentRel
                ?.code || ""}
            </p>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4 sm:col-span-2">
            <p className="text-sm text-gray-500">
              Program
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {user.student
                .programRel
                ?.name || "-"}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {user.student
                .programRel
                ?.code || ""}
            </p>
          </div>
        </div>
      );
    }

    if (
      user.role === "FACULTY" &&
      user.faculty
    ) {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Employee ID
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {
                user.faculty
                  .employeeId
              }
            </p>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Designation
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {
                user.faculty
                  .designation
              }
            </p>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4 sm:col-span-2">
            <p className="text-sm text-gray-500">
              Department
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {user.faculty
                .department
                ?.name || "-"}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {user.faculty
                .department
                ?.code || ""}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border bg-gray-50 p-4">
        <p className="text-sm text-gray-500">
          Account Type
        </p>

        <p className="mt-1 font-semibold text-gray-900">
          {getRoleLabel(
            user.role
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <ShieldCheck size={16} />

              <span>Admin</span>

              <span>/</span>

              <span>Users</span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              Users & Roles
            </h1>

            <p className="mt-1 text-gray-600">
              Manage users, roles and account
              access across Campus360.
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
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              ← Back to Dashboard
            </button>

            <button
              type="button"
              onClick={() =>
                loadData(true)
              }
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
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
          </div>
        </div>

        {/* SUCCESS MESSAGE */}
        {successMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0"
            />

            <span className="font-medium">
              {successMessage}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage("")
              }
              className="ml-auto rounded-lg p-1 hover:bg-green-100"
              aria-label="Close success message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {formError &&
          !selectedUser && (
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
                className="ml-auto rounded-lg p-1 hover:bg-red-100"
                aria-label="Close error message"
              >
                <X size={17} />
              </button>
            </div>
          )}

        {/* MAIN STATS */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Users"
            value={stats.total}
            icon={
              <Users size={21} />
            }
            description="Registered Campus360 accounts"
          />

          <StatCard
            title="Active Users"
            value={stats.active}
            icon={
              <UserCheck size={21} />
            }
            description="Accounts currently enabled"
          />

          <StatCard
            title="Inactive Users"
            value={stats.inactive}
            icon={
              <UserX size={21} />
            }
            description="Accounts currently disabled"
          />

          <StatCard
            title="Students / Faculty"
            value={`${stats.roles?.students || 0} / ${
              stats.roles?.faculty || 0
            }`}
            icon={
              <ShieldCheck
                size={21}
              />
            }
            description="Academic user distribution"
          />
        </div>

        {/* ROLE SUMMARY */}
        <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
              <Users
                size={18}
                className="text-gray-600"
              />
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">
                User Distribution
              </h2>

              <p className="text-sm text-gray-500">
                Current accounts grouped by
                role
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {visibleRoleStats.map(
              (item) => (
                <div
                  key={item.label}
                  className="rounded-xl border bg-gray-50 px-4 py-3"
                >
                  <p className="text-sm text-gray-500">
                    {item.label}
                  </p>

                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {item.value}
                  </p>
                </div>
              )
            )}
          </div>
        </div>

        {/* FILTERS */}
        <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
              <Filter
                size={18}
                className="text-gray-600"
              />
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">
                Search & Filters
              </h2>

              <p className="text-sm text-gray-500">
                Find users by name, email,
                role or account status.
              </p>
            </div>
          </div>

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
                    handleSearch();
                  }
                }}
                placeholder="Search by name or email..."
                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="relative min-w-[190px]">
              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {ROLES.map(
                  (role) => (
                    <option
                      key={role}
                      value={role}
                    >
                      {role === "ALL"
                        ? "All Roles"
                        : getRoleLabel(
                            role
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

            <div className="relative min-w-[190px]">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">
                  All Statuses
                </option>

                <option value="true">
                  Active
                </option>

                <option value="false">
                  Inactive
                </option>
              </select>

              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <button
              type="button"
              onClick={handleSearch}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search size={18} />
              Search
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>

        {/* RESULT SUMMARY */}
        {!loading && (
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-800">
                {users.length}
              </span>{" "}
              user
              {users.length === 1
                ? ""
                : "s"}
            </p>

            {(search ||
              roleFilter !== "ALL" ||
              statusFilter !== "ALL") && (
              <p className="text-sm text-gray-500">
                Filters applied
              </p>
            )}
          </div>
        )}

        {/* USER TABLE */}
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="flex items-center gap-3 text-gray-600">
                <Loader2
                  size={24}
                  className="animate-spin"
                />

                <span>
                  Loading users...
                </span>
              </div>
            </div>
          ) : users.length === 0 ? (
            <EmptyState message="No users found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px]">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      User
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Role
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Profile ID
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Created
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {users.map(
                    (user) => (
                      <tr
                        key={user.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                              {getInitials(
                                user
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-semibold text-gray-900">
                                {getFullName(
                                  user
                                )}
                              </p>

                              <p className="truncate text-sm text-gray-500">
                                {user.email ||
                                  "-"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getRoleClasses(
                              user.role
                            )}`}
                          >
                            {getRoleLabel(
                              user.role
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700">
                          <span className="font-medium">
                            {getProfileId(
                              user
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                              user.isActive
                                ? "border-green-200 bg-green-50 text-green-700"
                                : "border-gray-200 bg-gray-100 text-gray-600"
                            }`}
                          >
                            {user.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {formatDateTime(
                            user.createdAt
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                loadUserDetails(
                                  user.id
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                              title="View user details"
                            >
                              <Eye
                                size={16}
                              />

                              View
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(
                                  user
                                )
                              }
                              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                user.isActive
                                  ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                  : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                              }`}
                            >
                              {user.isActive ? (
                                <>
                                  <UserX
                                    size={15}
                                  />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <UserCheck
                                    size={15}
                                  />
                                  Activate
                                </>
                              )}
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

        {/* USER DETAILS MODAL */}
        {selectedUser && (
          <Modal
            title="User Details"
            wide
            onClose={() => {
              setSelectedUser(null);
              setFormError("");
            }}
          >
            <div className="space-y-6">
              {detailsLoading ? (
                <div className="flex min-h-[250px] items-center justify-center">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Loader2
                      size={24}
                      className="animate-spin"
                    />

                    Loading user details...
                  </div>
                </div>
              ) : (
                <>
                  {/* PROFILE HEADER */}
                  <div className="flex flex-col gap-4 rounded-2xl border bg-gray-50 p-5 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-gray-600 shadow-sm">
                      {getInitials(
                        selectedUser
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-2xl font-bold text-gray-900">
                        {getFullName(
                          selectedUser
                        )}
                      </h3>

                      <p className="mt-1 truncate text-gray-600">
                        {selectedUser.email ||
                          "-"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRoleClasses(
                            selectedUser.role
                          )}`}
                        >
                          {getRoleLabel(
                            selectedUser.role
                          )}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            selectedUser.isActive
                              ? "border-green-200 bg-green-100 text-green-700"
                              : "border-gray-200 bg-gray-100 text-gray-600"
                          }`}
                        >
                          {selectedUser.isActive
                            ? "Active Account"
                            : "Inactive Account"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ACCOUNT INFORMATION */}
                  <div>
                    <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
                      Account Information
                    </h4>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border p-4">
                        <p className="text-sm text-gray-500">
                          User ID
                        </p>

                        <p className="mt-1 font-semibold text-gray-900">
                          #
                          {
                            selectedUser.id
                          }
                        </p>
                      </div>

                      <div className="rounded-xl border p-4">
                        <p className="text-sm text-gray-500">
                          Profile ID
                        </p>

                        <p className="mt-1 font-semibold text-gray-900">
                          {getProfileId(
                            selectedUser
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border p-4">
                        <p className="text-sm text-gray-500">
                          Email
                        </p>

                        <p className="mt-1 break-all font-semibold text-gray-900">
                          {selectedUser.email ||
                            "-"}
                        </p>
                      </div>

                      <div className="rounded-xl border p-4">
                        <p className="text-sm text-gray-500">
                          Role
                        </p>

                        <p className="mt-1 font-semibold text-gray-900">
                          {getRoleLabel(
                            selectedUser.role
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border p-4">
                        <p className="text-sm text-gray-500">
                          Created At
                        </p>

                        <p className="mt-1 font-semibold text-gray-900">
                          {formatDateTime(
                            selectedUser.createdAt
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border p-4">
                        <p className="text-sm text-gray-500">
                          Last Updated
                        </p>

                        <p className="mt-1 font-semibold text-gray-900">
                          {formatDateTime(
                            selectedUser.updatedAt
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* PROFILE INFORMATION */}
                  <div>
                    <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
                      Profile Information
                    </h4>

                    {getProfileSummary(
                      selectedUser
                    )}
                  </div>

                  {/* ERROR */}
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

                  {/* ACTIONS */}
                  <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          selectedUser
                        )
                      }
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-medium ${
                        selectedUser.isActive
                          ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                          : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                      }`}
                    >
                      {selectedUser.isActive ? (
                        <>
                          <UserX
                            size={17}
                          />
                          Deactivate Account
                        </>
                      ) : (
                        <>
                          <UserCheck
                            size={17}
                          />
                          Activate Account
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(
                          null
                        );
                        setFormError("");
                      }}
                      className="rounded-xl border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}