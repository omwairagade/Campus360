import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useLocation,
} from "react-router-dom";

import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Receipt,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  TrendingUp,
  Clock,
  CheckCircle,
  Megaphone,
  AlertCircle,
  RefreshCw,
  UserRound,
  Award,
  ChevronRight,
  BarChart3,
  Target,
  CircleAlert,
  Activity,
  CheckCircle2,
} from "lucide-react";

import {
  apiGet,
  logoutUser,
} from "../api";

function Dashboard() {
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [student, setStudent] =
    useState(null);

  const [attendance, setAttendance] =
    useState(null);

  const [timetable, setTimetable] =
    useState([]);

  const [assignments, setAssignments] =
    useState([]);

  const [cgpa, setCgpa] =
    useState(0);

  const [notices, setNotices] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  // ============================================================
  // NAVIGATION
  // ============================================================

  const navigationItems = useMemo(
    () => [
      {
        name: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "Courses",
        path: "/courses",
        icon: BookOpen,
      },
      {
        name: "Timetable",
        path: "/timetable",
        icon: CalendarDays,
      },
      {
        name: "Attendance",
        path: "/attendance",
        icon: ClipboardCheck,
      },
      {
        name: "Assignments",
        path: "/assignments",
        icon: FileText,
      },
      {
        name: "Examinations",
        path: "/examinations",
        icon: GraduationCap,
      },
      {
        name: "Results",
        path: "/results",
        icon: TrendingUp,
      },
      {
        name: "Fees",
        path: "/fees",
        icon: Receipt,
      },
      {
        name: "Notices",
        path: "/notices",
        icon: Bell,
      },
      {
        name: "Settings",
        path: "/settings",
        icon: Settings,
      },
    ],
    []
  );

  // ============================================================
  // LOAD DASHBOARD DATA
  // ============================================================

  const fetchDashboardData = useCallback(
    async ({
      isRefresh = false,
    } = {}) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const requests = [
          {
            name: "profile",
            request: apiGet(
              "/student/profile"
            ),
          },
          {
            name: "attendance",
            request: apiGet(
              "/attendance/my"
            ),
          },
          {
            name: "timetable",
            request: apiGet(
              "/timetable/my-timetable"
            ),
          },
          {
            name: "assignments",
            request: apiGet(
              "/assignments/my-assignments"
            ),
          },
          {
            name: "cgpa",
            request: apiGet(
              "/exams/my-cgpa"
            ),
          },
          {
            name: "notices",
            request: apiGet(
              "/notices/published"
            ),
          },
        ];

        const results =
          await Promise.allSettled(
            requests.map(
              (item) => item.request
            )
          );

        const failures = [];

        results.forEach(
          (result, index) => {
            const service =
              requests[index].name;

            if (
              result.status ===
              "fulfilled"
            ) {
              const data =
                result.value;

              if (
                service ===
                "profile"
              ) {
                setStudent(
                  data?.student ||
                    data?.data?.student ||
                    data?.data ||
                    null
                );
              }

              if (
                service ===
                "attendance"
              ) {
                setAttendance(
                  data || null
                );
              }

              if (
                service ===
                "timetable"
              ) {
                const timetableList =
                  data?.timetable ||
                  data?.data?.timetable ||
                  data?.data ||
                  [];

                setTimetable(
                  Array.isArray(
                    timetableList
                  )
                    ? timetableList
                    : []
                );
              }

              if (
                service ===
                "assignments"
              ) {
                const assignmentList =
                  data?.assignments ||
                  data?.data?.assignments ||
                  data?.data ||
                  [];

                setAssignments(
                  Array.isArray(
                    assignmentList
                  )
                    ? assignmentList
                    : []
                );
              }

              if (
                service ===
                "cgpa"
              ) {
                const value =
                  data?.cgpa ??
                  data?.data?.cgpa ??
                  0;

                setCgpa(
                  Number(value) || 0
                );
              }

              if (
                service ===
                "notices"
              ) {
                const noticeList =
                  data?.notices ||
                  data?.data?.notices ||
                  data?.data ||
                  [];

                setNotices(
                  Array.isArray(
                    noticeList
                  )
                    ? noticeList
                    : []
                );
              }
            } else {
              const reason =
                result.reason;

              if (
                /token|authentication|unauthorized|forbidden/i.test(
                  reason?.message || ""
                )
              ) {
                logoutUser();
                window.location.href =
                  "/";
                return;
              }

              failures.push({
                service,
                message:
                  reason?.message ||
                  "Request failed",
              });
            }
          }
        );

        if (
          failures.length > 0
        ) {
          const readableNames =
            failures.map(
              (failure) => {
                const names = {
                  profile:
                    "profile",
                  attendance:
                    "attendance",
                  timetable:
                    "timetable",
                  assignments:
                    "assignments",
                  cgpa:
                    "results",
                  notices:
                    "notices",
                };

                return (
                  names[
                    failure.service
                  ] ||
                  failure.service
                );
              }
            );

          setError(
            `Some dashboard data could not be loaded: ${readableNames.join(
              ", "
            )}. Other information is still available.`
          );

          console.error(
            "Dashboard partial loading failures:",
            failures
          );
        }
      } catch (err) {
        console.error(
          "Dashboard error:",
          err
        );

        if (
          /token|authentication|unauthorized|forbidden/i.test(
            err?.message || ""
          )
        ) {
          logoutUser();
          window.location.href =
            "/";
          return;
        }

        setError(
          err?.message ||
            "Something went wrong while loading the dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    logoutUser();
    window.location.href = "/";
  };

  // ============================================================
  // CLOSE MOBILE SIDEBAR AFTER NAVIGATION
  // ============================================================

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // ============================================================
  // STUDENT INFO
  // ============================================================

  const studentFullName =
    student?.user
      ? `${student.user.firstName || ""} ${
          student.user.lastName || ""
        }`.trim()
      : "";

  const displayName =
    studentFullName ||
    student?.name ||
    "Student";

  const programName =
    student?.programRel?.name ||
    student?.program?.name ||
    "Program unavailable";

  const departmentName =
    student?.departmentRel?.name ||
    student?.department?.name ||
    "Department unavailable";

  const departmentCode =
    student?.departmentRel?.code ||
    student?.department?.code ||
    "-";

  // ============================================================
  // TODAY
  // ============================================================

  const currentDate =
    new Date();

  const currentDay =
    currentDate.getDay();

  const todayNumber =
    currentDay === 0
      ? 7
      : currentDay;

  const todayName =
    currentDate.toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
      }
    );

  const todayDate =
    currentDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );

  const todaySchedule =
    useMemo(() => {
      return timetable
        .filter(
          (item) =>
            Number(
              item?.dayOfWeek
            ) === todayNumber
        )
        .sort(
          (a, b) =>
            String(
              a?.startTime || ""
            ).localeCompare(
              String(
                b?.startTime || ""
              )
            )
        );
    }, [
      timetable,
      todayNumber,
    ]);

  // ============================================================
  // ASSIGNMENTS
  // ============================================================

  const normalizedAssignments =
    useMemo(() => {
      return assignments.map(
        (assignment) => {
          const status =
            String(
              assignment?.submission
                ?.status ||
                assignment?.status ||
                "PENDING"
            ).toUpperCase();

          return {
            ...assignment,
            dashboardStatus:
              status,
          };
        }
      );
    }, [assignments]);

  const pendingAssignments =
    normalizedAssignments.filter(
      (assignment) =>
        assignment.dashboardStatus ===
          "PENDING" ||
        assignment.dashboardStatus ===
          "LATE"
    );

  const submittedAssignments =
    normalizedAssignments.filter(
      (assignment) =>
        assignment.dashboardStatus ===
          "SUBMITTED" ||
        assignment.dashboardStatus ===
          "GRADED"
    );

  const gradedAssignments =
    normalizedAssignments.filter(
      (assignment) =>
        assignment.dashboardStatus ===
        "GRADED"
    );

  const assignmentCompletion =
    assignments.length > 0
      ? Math.round(
          (submittedAssignments.length /
            assignments.length) *
            100
        )
      : 0;

  const gradingProgress =
    submittedAssignments.length >
      0
      ? Math.round(
          (gradedAssignments.length /
            submittedAssignments.length) *
            100
        )
      : 0;

  // ============================================================
  // ATTENDANCE
  // ============================================================

  const attendancePercentage =
    Number(
      attendance?.summary
        ?.attendancePercentage ??
        attendance?.attendancePercentage ??
        0
    );

  const attendedClasses =
    Number(
      attendance?.summary
        ?.attendedClasses ??
        attendance?.attendedClasses ??
        0
    );

  const totalClasses =
    Number(
      attendance?.summary
        ?.totalClasses ??
        attendance?.totalClasses ??
        0
    );

  const safeAttendancePercentage =
    Math.max(
      0,
      Math.min(
        attendancePercentage,
        100
      )
    );

  // ============================================================
  // ACADEMIC STATUS
  // ============================================================

  const academicStatus =
    attendancePercentage < 65
      ? {
          label:
            "Needs attention",
          description:
            "Attendance is below the recommended level.",
          container:
            "bg-red-50 border-red-200",
          icon:
            "bg-red-100 text-red-600",
          text:
            "text-red-700",
          dot:
            "bg-red-500",
        }
      : pendingAssignments.length >=
        3
      ? {
          label:
            "Action required",
          description:
            "You have several assignments pending.",
          container:
            "bg-amber-50 border-amber-200",
          icon:
            "bg-amber-100 text-amber-600",
          text:
            "text-amber-700",
          dot:
            "bg-amber-500",
        }
      : {
          label:
            "On track",
          description:
            "Your current academic activity looks good.",
          container:
            "bg-green-50 border-green-200",
          icon:
            "bg-green-100 text-green-600",
          text:
            "text-green-700",
          dot:
            "bg-green-500",
        };

  // ============================================================
  // ACADEMIC SCORE
  // ============================================================

  const academicScore =
    Math.round(
      ((Math.min(
        Math.max(cgpa, 0),
        10
      ) /
        10) *
        40) +
        (Math.min(
          safeAttendancePercentage,
          100
        ) *
          0.4) +
        (assignmentCompletion *
          0.2)
    );

  // ============================================================
  // ATTENTION ITEMS
  // ============================================================

  const attentionItems =
    useMemo(() => {
      const items = [];

      if (
        attendancePercentage <
        75
      ) {
        items.push({
          icon: ClipboardCheck,
          title:
            "Improve attendance",
          description:
            attendancePercentage < 65
              ? "Your attendance is below 65%. Attend upcoming classes regularly."
              : "Your attendance is below 75%. Try to attend upcoming classes consistently.",
          path: "/attendance",
          action: "View attendance",
          type:
            attendancePercentage <
            65
              ? "danger"
              : "warning",
        });
      }

      if (
        pendingAssignments.length >
        0
      ) {
        items.push({
          icon: FileText,
          title:
            "Pending assignments",
          description: `${pendingAssignments.length} assignment${
            pendingAssignments.length ===
            1
              ? ""
              : "s"
          } need your attention.`,
          path: "/assignments",
          action:
            "Open assignments",
          type: "warning",
        });
      }

      if (
        notices.some(
          (notice) =>
            notice?.priority ===
              "URGENT" ||
            notice?.priority ===
              "HIGH"
        )
      ) {
        items.push({
          icon: Megaphone,
          title:
            "Important notice",
          description:
            "There is a high-priority campus announcement.",
          path: "/notices",
          action: "Read notices",
          type: "info",
        });
      }

      if (
        assignments.length >
          0 &&
        assignmentCompletion <
          50
      ) {
        items.push({
          icon: Activity,
          title:
            "Complete more work",
          description:
            "Less than half of your current assignments are submitted.",
          path: "/assignments",
          action:
            "Continue assignments",
          type: "info",
        });
      }

      return items.slice(
        0,
        4
      );
    }, [
      attendancePercentage,
      pendingAssignments.length,
      notices,
      assignments.length,
      assignmentCompletion,
    ]);

  // ============================================================
  // GREETING
  // ============================================================

  const currentHour =
    currentDate.getHours();

  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 17
      ? "Good afternoon"
      : "Good evening";

  // ============================================================
  // NOTICE STYLE
  // ============================================================

  const getNoticeStyle =
    (notice) => {
      if (
        notice?.priority ===
        "URGENT"
      ) {
        return {
          container:
            "bg-red-50 border-red-200",
          icon:
            "bg-red-100 text-red-600",
        };
      }

      if (
        notice?.priority ===
        "HIGH"
      ) {
        return {
          container:
            "bg-orange-50 border-orange-200",
          icon:
            "bg-orange-100 text-orange-600",
        };
      }

      return {
        container:
          "bg-gray-50 border-gray-100",
        icon:
          "bg-blue-100 text-blue-600",
      };
    };

  // ============================================================
  // ASSIGNMENT STATUS STYLE
  // ============================================================

  const getAssignmentStatusStyle =
    (status) => {
      if (
        status === "SUBMITTED"
      ) {
        return "bg-blue-100 text-blue-700";
      }

      if (
        status === "GRADED"
      ) {
        return "bg-green-100 text-green-700";
      }

      if (
        status === "LATE"
      ) {
        return "bg-orange-100 text-orange-700";
      }

      return "bg-yellow-100 text-yellow-700";
    };

  const attendanceStatus =
    attendancePercentage >= 75
      ? {
          label:
            "Good attendance",
          className:
            "text-green-600",
          bar:
            "bg-green-500",
        }
      : attendancePercentage >=
        65
      ? {
          label:
            "Monitor attendance",
          className:
            "text-orange-600",
          bar:
            "bg-orange-500",
        }
      : {
          label:
            "Attendance is low",
          className:
            "text-red-600",
          bar:
            "bg-red-500",
        };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">

        <div className="w-full max-w-sm text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full w-2/3 rounded-full bg-blue-600 animate-pulse" />
          </div>

          <p className="mt-5 text-gray-700 font-semibold">
            Loading Campus360...
          </p>

          <p className="mt-1 text-sm text-gray-400">
            Preparing your academic dashboard
          </p>

        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* ========================================================
          MOBILE OVERLAY
      ======================================================== */}

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      {/* ========================================================
          SIDEBAR
      ======================================================== */}

      <aside
        className={
          "fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-50 w-72 bg-white " +
          "border-r border-gray-200 transform transition-transform duration-300 " +
          "shadow-2xl lg:shadow-none " +
          (sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0")
        }
      >

        <div className="h-full flex flex-col">

          {/* LOGO */}

          <div className="h-20 px-5 flex items-center justify-between border-b border-gray-200 shrink-0">

            <Link
              to="/dashboard"
              className="group flex items-center gap-3 min-w-0"
            >

              <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-100 transition group-hover:scale-105">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>

              <div className="min-w-0">

                <h1 className="text-xl font-bold text-gray-800 tracking-tight">
                  Campus360
                </h1>

                <p className="text-xs text-gray-500">
                  Student Portal
                </p>

              </div>

            </Link>

            <button
              type="button"
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 transition"
              onClick={() =>
                setSidebarOpen(false)
              }
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

          </div>

          {/* STUDENT CARD */}

          <div className="px-4 py-4 border-b border-gray-200 shrink-0">

            <div className="rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-white border border-blue-100 p-4">

              <div className="flex items-center gap-3">

                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center ring-4 ring-blue-100 shadow-sm shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>

                <div className="min-w-0 flex-1">

                  <p className="font-bold text-gray-800 truncate">
                    {displayName}
                  </p>

                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {student?.enrollmentNumber ||
                      "Student"}
                  </p>

                </div>

              </div>

              <div className="mt-3 flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <span
                    className={`h-2.5 w-2.5 rounded-full ${academicStatus.dot}`}
                  />

                  <span
                    className={`text-xs font-bold ${academicStatus.text}`}
                  >
                    {academicStatus.label}
                  </span>

                </div>

                <span className="text-[10px] font-bold text-gray-400">
                  Score {academicScore}/100
                </span>

              </div>

            </div>

          </div>

          {/* NAVIGATION */}

          <nav className="flex-1 px-3 py-4 overflow-y-auto">

            <div className="px-3 mb-3 flex items-center justify-between">

              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.16em]">
                Main Menu
              </p>

              <span className="text-[10px] text-gray-300 font-medium">
                {navigationItems.length}
              </span>

            </div>

            <div className="space-y-1">

              {navigationItems.map(
                (item) => {

                  const Icon =
                    item.icon;

                  const active =
                    location.pathname ===
                    item.path;

                  return (
                    <Link
                      key={
                        item.path
                      }
                      to={
                        item.path
                      }
                      onClick={() =>
                        setSidebarOpen(
                          false
                        )
                      }
                      className={
                        "group relative flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 " +
                        (active
                          ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900")
                      }
                    >

                      {active && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white/90" />
                      )}

                      <span
                        className={
                          "flex h-9 w-9 items-center justify-center rounded-lg transition " +
                          (active
                            ? "bg-white/15 text-white"
                            : "bg-gray-50 text-gray-500 group-hover:bg-white group-hover:text-blue-600")
                        }
                      >
                        <Icon className="w-5 h-5" />
                      </span>

                      <span className="font-semibold text-sm flex-1">
                        {item.name}
                      </span>

                      <ChevronRight
                        className={
                          "w-4 h-4 transition-all " +
                          (active
                            ? "text-white/70 translate-x-0"
                            : "text-gray-300 -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0")
                        }
                      />

                    </Link>
                  );
                }
              )}

              {/* LOGOUT */}

              <div className="pt-2 mt-2 border-t border-gray-100">

                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 text-left"
                >

                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-500 group-hover:bg-white">

                    <LogOut className="w-5 h-5" />

                  </span>

                  <span className="font-semibold text-sm flex-1">
                    Logout
                  </span>

                  <ChevronRight
                    className="w-4 h-4 text-red-200 transition group-hover:translate-x-1 group-hover:text-red-400"
                  />

                </button>

              </div>

            </div>

          </nav>

          {/* SIDEBAR FOOTER */}

          <div className="px-4 py-3 border-t border-gray-200 shrink-0 bg-white">

            <div className="flex items-center justify-between text-[11px] text-gray-400">

              <span>
                Campus360 ERP
              </span>

              <span>
                Student
              </span>

            </div>

          </div>

        </div>

      </aside>

      {/* ========================================================
          MAIN CONTENT
      ======================================================== */}

      <div className="flex-1 min-w-0">

        {/* TOP HEADER */}

        <header className="sticky top-0 z-30 min-h-20 bg-white/95 backdrop-blur border-b border-gray-200 flex items-center justify-between gap-4 px-4 sm:px-5 lg:px-8 py-4">

          <div className="flex items-center gap-3 sm:gap-4 min-w-0">

            <button
              type="button"
              className="lg:hidden shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition"
              onClick={() =>
                setSidebarOpen(true)
              }
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>

            <div className="min-w-0">

              <h2 className="text-xl font-bold text-gray-800 truncate sm:text-2xl">
                {greeting},{" "}
                {displayName} 👋
              </h2>

              <p className="text-sm text-gray-500 mt-1 truncate hidden sm:block">
                Here's your academic overview for today.
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">

            <button
              type="button"
              onClick={() =>
                fetchDashboardData({
                  isRefresh: true,
                })
              }
              disabled={refreshing}
              className="flex h-10 w-10 sm:w-auto sm:px-4 rounded-xl bg-gray-100 hover:bg-gray-200 items-center justify-center gap-2 transition disabled:opacity-60"
              title="Refresh dashboard"
              aria-label="Refresh dashboard"
            >

              <RefreshCw
                className={
                  "w-5 h-5 text-gray-600 " +
                  (refreshing
                    ? "animate-spin"
                    : "")
                }
              />

              <span className="hidden sm:inline text-sm font-semibold text-gray-700">
                {refreshing
                  ? "Refreshing"
                  : "Refresh"}
              </span>

            </button>

            <Link
              to="/notices"
              className="relative w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
              title="View notices"
              aria-label="View notices"
            >

              <Bell className="w-5 h-5 text-gray-600" />

              {notices.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                  {notices.length > 9
                    ? "9+"
                    : notices.length}
                </span>
              )}

            </Link>

          </div>

        </header>

        <main className="p-4 sm:p-5 lg:p-8">

          {/* ======================================================
              PAGE DATE + STATUS
          ====================================================== */}

          <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            <div>

              <p className="text-sm font-medium text-gray-400">
                Today
              </p>

              <p className="text-lg font-bold text-gray-800 mt-1">
                {todayName},{" "}
                {todayDate}
              </p>

            </div>

            <div className="flex flex-wrap items-center gap-3">

              <div
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 ${academicStatus.container}`}
              >

                <span
                  className={`h-2 w-2 rounded-full ${academicStatus.dot}`}
                />

                <span className="text-xs font-bold">
                  {academicStatus.label}
                </span>

              </div>

              <div className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-3.5 py-2 text-sm text-gray-500 shadow-sm">

                <UserRound className="w-4 h-4 text-blue-500" />

                <span className="font-medium">
                  {student?.enrollmentNumber ||
                    "Student Portal"}
                </span>

              </div>

            </div>

          </div>

          {/* ======================================================
              ERROR
          ====================================================== */}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 flex items-start gap-3 shadow-sm">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-red-600 shrink-0">
                <AlertCircle size={19} />
              </div>

              <div className="min-w-0 flex-1">

                <p className="font-bold">
                  Dashboard data issue
                </p>

                <p className="text-sm mt-1 leading-6">
                  {error}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  fetchDashboardData({
                    isRefresh: true,
                  })
                }
                className="shrink-0 px-3.5 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold transition"
              >
                Retry
              </button>

            </div>
          )}

          {/* ======================================================
              ACADEMIC OVERVIEW
          ====================================================== */}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 mb-6">

            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">

              <div className="min-w-0">

                <div className="flex items-center gap-2">

                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <GraduationCap className="w-5 h-5" />
                  </span>

                  <p className="text-sm font-semibold text-blue-600">
                    Current Program
                  </p>

                </div>

                <h3 className="text-2xl font-bold text-gray-800 mt-3">
                  {programName}
                </h3>

                <p className="text-gray-500 mt-1">
                  Semester{" "}
                  {student?.semester ||
                    "-"}{" "}
                  •{" "}
                  {departmentName}
                </p>

                <div className="flex flex-wrap gap-2 mt-4">

                  {student?.batch && (
                    <span className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                      Batch{" "}
                      {student.batch}
                    </span>
                  )}

                  {student?.division && (
                    <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                      Division{" "}
                      {String(
                        student.division
                      ).toUpperCase()}
                    </span>
                  )}

                  {student?.status && (
                    <span
                      className={
                        "px-3 py-1.5 rounded-full text-xs font-bold border " +
                        (String(
                          student.status
                        ).toUpperCase() ===
                        "ACTIVE"
                          ? "bg-green-50 text-green-700 border-green-100"
                          : "bg-gray-100 text-gray-600 border-gray-200")
                      }
                    >
                      {student.status}
                    </span>
                  )}

                </div>

              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                <InfoBox
                  label="Enrollment"
                  value={
                    student?.enrollmentNumber ||
                    "-"
                  }
                />

                <InfoBox
                  label="Semester"
                  value={
                    student?.semester ||
                    "-"
                  }
                />

                <InfoBox
                  label="Department"
                  value={
                    departmentCode
                  }
                />

                <InfoBox
                  label="Admission Year"
                  value={
                    student?.admissionYear ||
                    "-"
                  }
                />

              </div>

            </div>

          </div>

          {/* ======================================================
              SUMMARY CARDS
          ====================================================== */}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">

            {/* CGPA */}

            <SummaryDashboardCard
              title="Current CGPA"
              value={cgpa.toFixed(2)}
              subtitle="From examination results"
              icon={
                <Award className="w-6 h-6 text-yellow-600" />
              }
              iconBg="bg-yellow-100"
              valueClass="text-gray-800"
            />

            {/* ATTENDANCE */}

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:-translate-y-0.5 hover:shadow-md transition">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="text-sm text-gray-500">
                    Attendance
                  </p>

                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {attendancePercentage.toFixed(
                      1
                    )}
                    %
                  </p>

                  <p
                    className={
                      "text-xs mt-2 font-bold " +
                      attendanceStatus.className
                    }
                  >
                    {
                      attendanceStatus.label
                    }
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    {attendedClasses}{" "}
                    of{" "}
                    {totalClasses}{" "}
                    classes
                  </p>

                </div>

                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>

              </div>

              <div className="mt-4 h-1.5 rounded-full bg-gray-100 overflow-hidden">

                <div
                  className={`h-full rounded-full transition-all duration-500 ${attendanceStatus.bar}`}
                  style={{
                    width: `${safeAttendancePercentage}%`,
                  }}
                />

              </div>

            </div>

            {/* ASSIGNMENTS */}

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:-translate-y-0.5 hover:shadow-md transition">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="text-sm text-gray-500">
                    Pending Assignments
                  </p>

                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {
                      pendingAssignments.length
                    }
                  </p>

                  <p className="text-xs text-gray-500 mt-2">
                    {submittedAssignments.length}{" "}
                    completed of{" "}
                    {assignments.length}
                  </p>

                </div>

                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>

              </div>

              <div className="mt-4 h-1.5 rounded-full bg-gray-100 overflow-hidden">

                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{
                    width: `${assignmentCompletion}%`,
                  }}
                />

              </div>

              <p className="mt-1 text-[11px] text-gray-400">
                {assignmentCompletion}% submitted
              </p>

            </div>

            {/* TODAY */}

            <SummaryDashboardCard
              title="Today's Classes"
              value={
                todaySchedule.length
              }
              subtitle={todayName}
              icon={
                <Clock className="w-6 h-6 text-purple-600" />
              }
              iconBg="bg-purple-100"
              valueClass="text-gray-800"
            />

          </div>

          {/* ======================================================
              STUDENT ANALYTICS
          ====================================================== */}

          <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <BarChart3 className="w-5 h-5" />
                </div>

                <div>

                  <h3 className="text-lg font-bold text-gray-800">
                    Academic Analytics
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    Quick view of your current academic progress
                  </p>

                </div>

              </div>

              <div
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${academicStatus.container}`}
              >

                <span
                  className={`h-2 w-2 rounded-full ${academicStatus.dot}`}
                />

                <span
                  className={`text-xs font-bold ${academicStatus.text}`}
                >
                  {academicStatus.label}
                </span>

              </div>

            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">

              <AnalyticsMetric
                label="Academic Score"
                value={`${academicScore}/100`}
                description="Combined progress indicator"
                icon={
                  <Target className="w-5 h-5" />
                }
                progress={
                  academicScore
                }
              />

              <AnalyticsMetric
                label="Assignment Completion"
                value={`${assignmentCompletion}%`}
                description={`${submittedAssignments.length} submitted`}
                icon={
                  <FileText className="w-5 h-5" />
                }
                progress={
                  assignmentCompletion
                }
              />

              <AnalyticsMetric
                label="Grading Progress"
                value={`${gradingProgress}%`}
                description={`${gradedAssignments.length} graded`}
                icon={
                  <CheckCircle2 className="w-5 h-5" />
                }
                progress={
                  gradingProgress
                }
              />

            </div>

            <div className="mt-5 rounded-xl bg-gray-50 border border-gray-100 p-4">

              <div className="flex flex-wrap items-center justify-between gap-2">

                <div className="flex items-center gap-2">

                  <Activity className="w-4 h-4 text-indigo-600" />

                  <p className="text-sm font-bold text-gray-700">
                    Academic status
                  </p>

                </div>

                <p className="text-xs text-gray-500">
                  {academicStatus.description}
                </p>

              </div>

            </div>

          </section>

          {/* ======================================================
              ATTENTION CENTER
          ====================================================== */}

          <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <CircleAlert className="w-5 h-5" />
              </div>

              <div>

                <h3 className="text-lg font-bold text-gray-800">
                  Attention Center
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  Important actions from your current dashboard
                </p>

              </div>

            </div>

            {attentionItems.length ===
            0 ? (

              <div className="mt-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">

                <CheckCircle2
                  size={20}
                  className="shrink-0 text-green-600"
                />

                <div>

                  <p className="font-semibold text-green-800">
                    Everything looks good
                  </p>

                  <p className="mt-1 text-sm text-green-700">
                    No important academic action is currently required.
                  </p>

                </div>

              </div>

            ) : (

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">

                {attentionItems.map(
                  (item, index) => (
                    <AttentionItem
                      key={`${item.title}-${index}`}
                      item={item}
                      onClick={() =>
                        window.location.href =
                          item.path
                      }
                    />
                  )
                )}

              </div>

            )}

          </section>

          {/* ======================================================
              TODAY + ASSIGNMENTS
          ====================================================== */}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* TODAY'S SCHEDULE */}

            <DashboardSection
              title="Today's Schedule"
              subtitle={todayName}
              icon={
                <CalendarDays className="w-5 h-5 text-blue-600" />
              }
              linkText="View All"
              linkTo="/timetable"
            >

              {todaySchedule.length ===
              0 ? (

                <EmptyDashboard
                  icon={
                    <CalendarDays className="w-10 h-10 text-gray-300" />
                  }
                  text="No classes scheduled for today."
                  linkText="Check full timetable"
                  linkTo="/timetable"
                />

              ) : (

                <div className="space-y-3">

                  {todaySchedule.map(
                    (item) => (

                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-blue-100 hover:bg-blue-50/40 transition"
                      >

                        <div className="min-w-24 text-sm font-bold text-blue-600">

                          {
                            item.startTime
                          }{" "}
                          -{" "}
                          {
                            item.endTime
                          }

                        </div>

                        <div className="w-px h-10 bg-gray-200" />

                        <div className="min-w-0 flex-1">

                          <p className="font-bold text-gray-800 truncate">

                            {item
                              .course
                              ?.name ||
                              item?.courseName ||
                              "Course"}

                          </p>

                          <p className="text-sm text-gray-500 mt-1 truncate">

                            {item.room ||
                              "Room not assigned"}{" "}
                            •{" "}
                            {item.classType ||
                              "Lecture"}

                          </p>

                        </div>

                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />

                      </div>

                    )
                  )}

                </div>

              )}

            </DashboardSection>

            {/* ASSIGNMENTS */}

            <DashboardSection
              title="Assignments"
              subtitle="Recent academic tasks"
              icon={
                <FileText className="w-5 h-5 text-blue-600" />
              }
              linkText="View All"
              linkTo="/assignments"
            >

              {assignments.length ===
              0 ? (

                <EmptyDashboard
                  icon={
                    <FileText className="w-10 h-10 text-gray-300" />
                  }
                  text="No assignments available."
                />

              ) : (

                <div className="space-y-3">

                  {normalizedAssignments
                    .slice(0, 4)
                    .map(
                      (
                        assignment
                      ) => {

                        return (
                          <div
                            key={
                              assignment.id
                            }
                            className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-blue-100 hover:bg-blue-50/40 transition"
                          >

                            <div className="min-w-0">

                              <p className="font-bold text-gray-800 truncate">
                                {
                                  assignment.title
                                }
                              </p>

                              <p className="text-sm text-gray-500 mt-1 truncate">

                                {assignment
                                  .course
                                  ?.name ||
                                  assignment?.courseName ||
                                  "Course"}

                              </p>

                            </div>

                            <div className="text-right shrink-0">

                              <span
                                className={
                                  "inline-flex px-3 py-1.5 rounded-full text-xs font-bold " +
                                  getAssignmentStatusStyle(
                                    assignment.dashboardStatus
                                  )
                                }
                              >
                                {
                                  assignment.dashboardStatus
                                }
                              </span>

                              <p className="text-xs text-gray-500 mt-2">

                                {assignment.dueDate
                                  ? new Date(
                                      assignment.dueDate
                                    ).toLocaleDateString(
                                      "en-IN",
                                      {
                                        day: "2-digit",
                                        month:
                                          "short",
                                      }
                                    )
                                  : "-"}

                              </p>

                            </div>

                          </div>
                        );
                      }
                    )}

                </div>

              )}

            </DashboardSection>

          </div>

          {/* ======================================================
              NOTICES
          ====================================================== */}

          <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm">

            <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4">

              <div>

                <div className="flex items-center gap-2">

                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <Megaphone className="w-5 h-5" />
                  </span>

                  <h3 className="text-lg font-bold text-gray-800">
                    Latest Notices
                  </h3>

                </div>

                <p className="text-sm text-gray-500 mt-2">
                  Latest campus announcements
                </p>

              </div>

              <Link
                to="/notices"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>

            </div>

            <div className="p-6">

              {notices.length ===
              0 ? (

                <EmptyDashboard
                  icon={
                    <Bell className="w-10 h-10 text-gray-300" />
                  }
                  text="No notices available."
                />

              ) : (

                <div className="space-y-3">

                  {notices
                    .slice(0, 3)
                    .map(
                      (notice) => {

                        const style =
                          getNoticeStyle(
                            notice
                          );

                        return (
                          <div
                            key={
                              notice.id
                            }
                            className={
                              "border rounded-2xl p-4 hover:shadow-sm transition " +
                              style.container
                            }
                          >

                            <div className="flex items-start gap-4">

                              <div
                                className={
                                  "w-10 h-10 rounded-xl flex items-center justify-center " +
                                  "flex-shrink-0 " +
                                  style.icon
                                }
                              >

                                {notice.priority ===
                                    "URGENT" ||
                                notice.priority ===
                                    "HIGH" ? (
                                  <AlertCircle className="w-5 h-5" />
                                ) : (
                                  <Megaphone className="w-5 h-5" />
                                )}

                              </div>

                              <div className="min-w-0 flex-1">

                                <div className="flex flex-wrap items-center gap-2">

                                  <h4 className="font-bold text-gray-800">
                                    {
                                      notice.title
                                    }
                                  </h4>

                                  {notice.category && (
                                    <span className="px-2.5 py-1 rounded-full bg-white/70 text-xs font-bold text-gray-600">
                                      {
                                        notice.category
                                      }
                                    </span>
                                  )}

                                  {notice.priority !==
                                    "NORMAL" && (
                                    <span className="px-2.5 py-1 rounded-full bg-white/70 text-xs font-bold text-gray-700">
                                      {
                                        notice.priority
                                      }
                                    </span>
                                  )}

                                </div>

                                <p className="text-sm text-gray-600 mt-2 line-clamp-2 leading-6">
                                  {
                                    notice.message
                                  }
                                </p>

                                <p className="text-xs text-gray-500 mt-3">

                                  {notice.publishedAt
                                    ? new Date(
                                        notice.publishedAt
                                      ).toLocaleDateString(
                                        "en-IN",
                                        {
                                          day: "2-digit",
                                          month:
                                            "short",
                                          year:
                                            "numeric",
                                        }
                                      )
                                    : "-"}

                                </p>

                              </div>

                            </div>

                          </div>
                        );
                      }
                    )}

                </div>

              )}

            </div>

          </div>

          {/* ======================================================
              QUICK ACCESS
          ====================================================== */}

          <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">

            <div className="flex items-center justify-between gap-4">

              <div>

                <div className="flex items-center gap-2">

                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <LayoutDashboard className="w-5 h-5" />
                  </span>

                  <h3 className="text-lg font-bold text-gray-800">
                    Quick Access
                  </h3>

                </div>

                <p className="text-sm text-gray-500 mt-2">
                  Jump to frequently used academic sections
                </p>

              </div>

            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-5">

              <QuickAccessCard
                to="/courses"
                icon={
                  <BookOpen className="w-6 h-6 text-blue-600" />
                }
                title="Courses"
                hover="hover:bg-blue-50 hover:border-blue-100"
              />

              <QuickAccessCard
                to="/attendance"
                icon={
                  <ClipboardCheck className="w-6 h-6 text-green-600" />
                }
                title="Attendance"
                hover="hover:bg-green-50 hover:border-green-100"
              />

              <QuickAccessCard
                to="/assignments"
                icon={
                  <FileText className="w-6 h-6 text-yellow-600" />
                }
                title="Assignments"
                hover="hover:bg-yellow-50 hover:border-yellow-100"
              />

              <QuickAccessCard
                to="/examinations"
                icon={
                  <GraduationCap className="w-6 h-6 text-purple-600" />
                }
                title="Examinations"
                hover="hover:bg-purple-50 hover:border-purple-100"
              />

              <QuickAccessCard
                to="/results"
                icon={
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                }
                title="Results"
                hover="hover:bg-indigo-50 hover:border-indigo-100"
              />

              <QuickAccessCard
                to="/fees"
                icon={
                  <Receipt className="w-6 h-6 text-red-600" />
                }
                title="Fees"
                hover="hover:bg-red-50 hover:border-red-100"
              />

            </div>

          </div>

        </main>

      </div>

    </div>
  );
}

/* ============================================================
   INFO BOX
============================================================ */

function InfoBox({
  label,
  value,
}) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-4">

      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1.5 font-bold text-gray-800 break-words">
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryDashboardCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  valueClass,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:-translate-y-0.5 hover:shadow-md transition">

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-sm text-gray-500">
            {title}
          </p>

          <p
            className={`text-3xl font-bold mt-2 ${valueClass}`}
          >
            {value}
          </p>

          <p className="text-xs text-gray-500 mt-2">
            {subtitle}
          </p>

        </div>

        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
        >
          {icon}
        </div>

      </div>

    </div>
  );
}

/* ============================================================
   ANALYTICS METRIC
============================================================ */

function AnalyticsMetric({
  label,
  value,
  description,
  icon,
  progress,
}) {
  const safeProgress =
    Math.max(
      0,
      Math.min(
        Number(progress) || 0,
        100
      )
    );

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">

      <div className="flex items-center justify-between gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
          {icon}
        </div>

        <span className="text-xl font-bold text-gray-800">
          {value}
        </span>

      </div>

      <p className="mt-4 text-sm font-bold text-gray-700">
        {label}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {description}
      </p>

      <div className="mt-3 h-1.5 rounded-full bg-gray-200 overflow-hidden">

        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-500"
          style={{
            width: `${safeProgress}%`,
          }}
        />

      </div>

    </div>
  );
}

/* ============================================================
   DASHBOARD SECTION
============================================================ */

function DashboardSection({
  title,
  subtitle,
  icon,
  linkText,
  linkTo,
  children,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">

      <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4">

        <div>

          <div className="flex items-center gap-2">

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              {icon}
            </span>

            <h3 className="text-lg font-bold text-gray-800">
              {title}
            </h3>

          </div>

          <p className="text-sm text-gray-500 mt-2">
            {subtitle}
          </p>

        </div>

        {linkText &&
          linkTo && (
            <Link
              to={linkTo}
              className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 shrink-0"
            >
              {linkText}
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}

      </div>

      <div className="p-6">
        {children}
      </div>

    </div>
  );
}

/* ============================================================
   ATTENTION ITEM
============================================================ */

function AttentionItem({
  item,
  onClick,
}) {
  const styles = {
    danger: {
      wrapper:
        "border-red-200 bg-red-50",
      icon:
        "bg-white text-red-600",
      title:
        "text-red-900",
      text:
        "text-red-700",
      button:
        "bg-red-600 hover:bg-red-700",
    },

    warning: {
      wrapper:
        "border-amber-200 bg-amber-50",
      icon:
        "bg-white text-amber-600",
      title:
        "text-amber-900",
      text:
        "text-amber-700",
      button:
        "bg-amber-600 hover:bg-amber-700",
    },

    info: {
      wrapper:
        "border-blue-200 bg-blue-50",
      icon:
        "bg-white text-blue-600",
      title:
        "text-blue-900",
      text:
        "text-blue-700",
      button:
        "bg-blue-600 hover:bg-blue-700",
    },
  };

  const style =
    styles[item.type] ||
    styles.info;

  const Icon =
    item.icon;

  return (
    <div
      className={`rounded-2xl border p-5 ${style.wrapper}`}
    >

      <div className="flex items-start gap-3">

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${style.icon}`}
        >
          <Icon size={19} />
        </div>

        <div className="min-w-0 flex-1">

          <p
            className={`font-bold ${style.title}`}
          >
            {item.title}
          </p>

          <p
            className={`mt-1 text-sm leading-6 ${style.text}`}
          >
            {item.description}
          </p>

          <button
            type="button"
            onClick={onClick}
            className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition ${style.button}`}
          >
            {item.action}

            <ArrowRightIcon />

          </button>

        </div>

      </div>

    </div>
  );
}

/* ============================================================
   ARROW ICON
============================================================ */

function ArrowRightIcon() {
  return (
    <ChevronRight
      size={15}
    />
  );
}

/* ============================================================
   EMPTY DASHBOARD
============================================================ */

function EmptyDashboard({
  icon,
  text,
  linkText,
  linkTo,
}) {
  return (
    <div className="text-center py-8">

      <div className="flex justify-center">
        {icon}
      </div>

      <p className="text-gray-500 mt-3">
        {text}
      </p>

      {linkText &&
        linkTo && (
          <Link
            to={linkTo}
            className="inline-flex items-center gap-1 mt-3 text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            {linkText}
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}

    </div>
  );
}

/* ============================================================
   QUICK ACCESS CARD
============================================================ */

function QuickAccessCard({
  to,
  icon,
  title,
  hover,
}) {
  return (
    <Link
      to={to}
      className={`group p-4 rounded-xl bg-gray-50 transition-all text-center border border-transparent ${hover}`}
    >

      <div className="flex justify-center">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm transition group-hover:scale-105">
          {icon}
        </div>

      </div>

      <p className="text-sm font-bold text-gray-700 mt-3">
        {title}
      </p>

    </Link>
  );
}

export default Dashboard;