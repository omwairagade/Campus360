import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  Activity,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Layers3,
  LogOut,
  Megaphone,
  Percent,
  RefreshCw,
  School,
  ShieldAlert,
  UserPlus,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

/* ============================================================
   CONSTANTS
============================================================ */

const API_BASE_URL = "https://campus360-backend-gbf0.onrender.com/api";

/* ============================================================
   HELPERS
============================================================ */

const getToken = () =>
  localStorage.getItem("token");

const getStoredUser = () => {
  try {
    return JSON.parse(
      localStorage.getItem("user") || "{}"
    );
  } catch {
    return {};
  }
};

const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(
    safeNumber(amount)
  );
};

/* ============================================================
   COMPONENT
============================================================ */

function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [currentTime, setCurrentTime] =
    useState(new Date());

  /* ==========================================================
     LIVE CLOCK
  ========================================================== */

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setCurrentTime(
          new Date()
        );
      }, 30000);

    return () =>
      window.clearInterval(timer);
  }, []);

  /* ==========================================================
     FETCH DASHBOARD
  ========================================================== */

  const fetchDashboardStats =
    useCallback(
      async (showRefresh = false) => {
        try {
          setError("");

          if (showRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          const token = getToken();

          if (!token) {
            navigate("/");
            return;
          }

          const response =
            await fetch(
              `${API_BASE_URL}/admin/dashboard/stats`,
              {
                method: "GET",
                headers: {
                  "Content-Type":
                    "application/json",
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          let data = null;

          try {
            data =
              await response.json();
          } catch {
            data = null;
          }

          if (
            response.status === 401
          ) {
            localStorage.removeItem(
              "token"
            );

            localStorage.removeItem(
              "user"
            );

            navigate("/");
            return;
          }

          if (
            response.status === 403
          ) {
            setError(
              data?.message ||
                "You do not have permission to access the Admin Dashboard."
            );

            return;
          }

          if (!response.ok) {
            throw new Error(
              data?.message ||
                "Failed to fetch admin dashboard statistics."
            );
          }

          setStats(
            data?.data || {}
          );

          if (showRefresh) {
            setSuccess(
              "Dashboard data refreshed successfully."
            );

            window.setTimeout(() => {
              setSuccess("");
            }, 2500);
          }
        } catch (err) {
          console.error(
            "Admin dashboard error:",
            err
          );

          setError(
            err?.message ||
              "Unable to connect to the Campus360 backend."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [navigate]
    );

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  /* ==========================================================
     BACK
  ========================================================== */

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/admin/dashboard");
    }
  };

  /* ==========================================================
     LOGOUT
  ========================================================== */

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/");
  };

  /* ==========================================================
     CURRENT USER
  ========================================================== */

  const currentUser =
    useMemo(
      () => getStoredUser(),
      []
    );

  const adminName =
    currentUser?.firstName ||
    currentUser?.name ||
    "Administrator";

  /* ==========================================================
     SAFE STATS
  ========================================================== */

  const numericStats =
    useMemo(() => {
      return {
        students:
          safeNumber(
            stats?.students
          ),

        faculty:
          safeNumber(
            stats?.faculty
          ),

        users:
          safeNumber(
            stats?.users ??
              stats?.userCount
          ),

        courses:
          safeNumber(
            stats?.courses
          ),

        departments:
          safeNumber(
            stats?.departments
          ),

        programs:
          safeNumber(
            stats?.programs
          ),

        enrollments:
          safeNumber(
            stats?.enrollments ??
              stats?.enrollmentCount
          ),

        assignments:
          safeNumber(
            stats?.assignments
          ),

        feesTotal:
          safeNumber(
            stats?.fees
              ?.totalAmount
          ),

        feesPaid:
          safeNumber(
            stats?.fees
              ?.paidAmount
          ),

        feesPending:
          safeNumber(
            stats?.fees
              ?.pendingAmount
          ),

        feePendingCount:
          safeNumber(
            stats?.fees
              ?.pendingCount
          ),

        feePartialCount:
          safeNumber(
            stats?.fees
              ?.partialCount
          ),

        noticesTotal:
          safeNumber(
            stats?.notices
              ?.total
          ),

        noticesPublished:
          safeNumber(
            stats?.notices
              ?.published
          ),
      };
    }, [stats]);

  /* ==========================================================
     ANALYTICS
  ========================================================== */

  const enrollmentDensity =
    numericStats.students > 0
      ? Math.round(
          (
            numericStats.enrollments /
            numericStats.students
          ) * 10
        ) / 10
      : 0;

  const studentFacultyRatio =
    numericStats.faculty > 0
      ? Math.round(
          (
            numericStats.students /
            numericStats.faculty
          ) * 10
        ) / 10
      : 0;

  const courseFacultyRatio =
    numericStats.faculty > 0
      ? Math.round(
          (
            numericStats.courses /
            numericStats.faculty
          ) * 10
        ) / 10
      : 0;

  const feeCollectionPercentage =
    numericStats.feesTotal > 0
      ? Math.min(
          100,
          Math.round(
            (
              numericStats.feesPaid /
              numericStats.feesTotal
            ) * 100
          )
        )
      : 0;

  const feePendingPercentage =
    numericStats.feesTotal > 0
      ? Math.min(
          100,
          Math.round(
            (
              numericStats.feesPending /
              numericStats.feesTotal
            ) * 100
          )
        )
      : 0;

  const noticePublicationPercentage =
    numericStats.noticesTotal > 0
      ? Math.min(
          100,
          Math.round(
            (
              numericStats.noticesPublished /
              numericStats.noticesTotal
            ) * 100
          )
        )
      : 0;

  const academicStructureScore =
    numericStats.departments > 0 &&
    numericStats.programs > 0 &&
    numericStats.courses > 0
      ? 100
      : numericStats.courses > 0
      ? 70
      : 35;

  const institutionalHealth =
    Math.round(
      (
        feeCollectionPercentage +
        noticePublicationPercentage +
        academicStructureScore
      ) / 3
    );

  const institutionHealthLabel =
    institutionalHealth >= 80
      ? "Healthy"
      : institutionalHealth >= 60
      ? "Stable"
      : "Needs Attention";

  /* ==========================================================
     ATTENTION ITEMS
  ========================================================== */

  const adminAttentionItems =
    useMemo(() => {
      const items = [];

      if (
        numericStats.feePendingCount > 0 ||
        numericStats.feePartialCount > 0
      ) {
        items.push({
          type: "warning",

          icon: (
            <WalletCards size={20} />
          ),

          title:
            "Fee collection needs attention",

          description:
            `${
              numericStats.feePendingCount +
              numericStats.feePartialCount
            } fee record(s) are pending or partially paid.`,

          path: "/admin/fees",

          action: "Review fees",
        });
      }

      if (
        numericStats.noticesTotal > 0 &&
        numericStats.noticesPublished <
          numericStats.noticesTotal
      ) {
        items.push({
          type: "info",

          icon: (
            <Megaphone size={20} />
          ),

          title:
            "Notice publishing",

          description:
            `${
              numericStats.noticesTotal -
              numericStats.noticesPublished
            } notice(s) are not currently published.`,

          path: "/admin/notices",

          action: "Manage notices",
        });
      }

      if (
        numericStats.students > 0 &&
        numericStats.faculty === 0
      ) {
        items.push({
          type: "danger",

          icon: (
            <ShieldAlert size={20} />
          ),

          title:
            "Faculty records missing",

          description:
            "Students exist but no faculty records are currently available.",

          path: "/admin/faculty",

          action: "Manage faculty",
        });
      }

      if (
        numericStats.courses === 0 &&
        numericStats.students > 0
      ) {
        items.push({
          type: "danger",

          icon: (
            <BookOpen size={20} />
          ),

          title:
            "Academic courses missing",

          description:
            "Students exist but no academic courses are configured.",

          path: "/admin/courses",

          action: "Manage courses",
        });
      }

      return items.slice(0, 4);
    }, [numericStats]);

  /* ==========================================================
     STAT CARDS
  ========================================================== */

  const statCards = [
    {
      title: "Total Students",
      value: numericStats.students,
      icon: Users,
      description:
        "Registered students",
      path: "/admin/students",
      type: "blue",
    },

    {
      title: "Total Faculty",
      value: numericStats.faculty,
      icon: GraduationCap,
      description:
        "Teaching staff",
      path: "/admin/faculty",
      type: "purple",
    },

    {
      title: "Total Users",
      value: numericStats.users,
      icon: Users,
      description:
        "System user accounts",
      path: "/admin/users",
      type: "cyan",
    },

    {
      title: "Courses",
      value: numericStats.courses,
      icon: BookOpen,
      description:
        "Academic courses",
      path: "/admin/courses",
      type: "green",
    },

    {
      title: "Departments",
      value: numericStats.departments,
      icon: School,
      description:
        "Academic departments",
      path: "/admin/departments",
      type: "amber",
    },

    {
      title: "Programs",
      value: numericStats.programs,
      icon: LayoutDashboard,
      description:
        "Academic programs",
      path: "/admin/programs",
      type: "indigo",
    },

    {
      title: "Enrollments",
      value: numericStats.enrollments,
      icon: UserPlus,
      description:
        "Course enrollments",
      path: "/admin/enrollments",
      type: "cyan",
    },

    {
      title: "Assignments",
      value: numericStats.assignments,
      icon: ClipboardList,
      description:
        "Total assignments",
      path: "/admin/assignments",
      type: "violet",
    },
  ];

  /* ==========================================================
     QUICK ACCESS
  ========================================================== */

  const quickAccess = [
    {
      title: "Students",
      description: "Student records",
      path: "/admin/students",
      icon: Users,
    },

    {
      title: "Faculty",
      description: "Teaching staff",
      path: "/admin/faculty",
      icon: GraduationCap,
    },

    {
      title: "Departments",
      description: "Academic departments",
      path: "/admin/departments",
      icon: School,
    },

    {
      title: "Programs",
      description: "Academic programs",
      path: "/admin/programs",
      icon: LayoutDashboard,
    },

    {
      title: "Academic Years",
      description: "Manage academic years",
      path: "/admin/academic-years",
      icon: CalendarRange,
    },

    {
      title: "Fee Structures",
      description: "Configure semester fees",
      path: "/admin/fee-structures",
      icon: Layers3,
    },

    {
      title: "Courses",
      description: "Course catalog",
      path: "/admin/courses",
      icon: BookOpen,
    },

    {
      title: "Enrollments",
      description: "Student enrollments",
      path: "/admin/enrollments",
      icon: UserPlus,
    },

    {
      title: "Attendance",
      description: "Attendance records",
      path: "/admin/attendance",
      icon: ClipboardCheck,
    },

    {
      title: "Results",
      description: "Exam results",
      path: "/admin/results",
      icon: Award,
    },

    {
      title: "Fees",
      description: "Fee management",
      path: "/admin/fees",
      icon: WalletCards,
    },

    {
      title: "Assignments",
      description:
        "Assignment management",
      path: "/admin/assignments",
      icon: ClipboardList,
    },

    {
      title: "Timetable",
      description:
        "Academic schedule",
      path: "/admin/timetable",
      icon: CalendarDays,
    },

    {
      title: "Notices",
      description:
        "Campus announcements",
      path: "/admin/notices",
      icon: Megaphone,
    },

    {
      title: "Users",
      description:
        "Users and roles",
      path: "/admin/users",
      icon: Users,
    },

    {
      title: "Reports",
      description:
        "Institution reports",
      path: "/admin/reports",
      icon: BarChart3,
    },
  ];

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">

              <LayoutDashboard
                size={23}
              />

            </div>

            <div className="min-w-0">

              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                Campus360
              </p>

              <h1 className="truncate text-xl font-bold text-slate-900 md:text-2xl">
                Admin Portal
              </h1>

            </div>

          </div>

          <div className="flex items-center gap-2">

            {/* TIME */}

            <div className="hidden text-right sm:block">

              <p className="text-sm font-bold text-slate-700">

                {currentTime.toLocaleTimeString(
                  "en-IN",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}

              </p>

              <p className="text-[11px] text-slate-400">

                {currentTime.toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }
                )}

              </p>

            </div>

            {/* BACK */}

            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-slate-50 hover:text-blue-600 sm:px-4"
            >

              <ArrowLeft
                size={17}
              />

              <span className="hidden sm:inline">
                Back
              </span>

            </button>

            {/* REFRESH */}

            <button
              type="button"
              onClick={() =>
                fetchDashboardStats(
                  true
                )
              }
              disabled={refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
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

            {/* LOGOUT */}

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-500 px-3 text-sm font-semibold text-white transition hover:bg-red-600 sm:px-4"
            >

              <LogOut
                size={18}
              />

              <span className="hidden sm:inline">
                Logout
              </span>

            </button>

          </div>

        </div>

      </header>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="relative overflow-hidden rounded-3xl bg-blue-600 p-6 text-white shadow-lg sm:p-8">

          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10" />

          <div className="absolute -bottom-28 right-24 h-72 w-72 rounded-full bg-white/5" />

          <div className="relative grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">

            <div className="min-w-0">

              <div className="flex flex-wrap gap-2">

                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">

                  <ShieldAlert
                    size={14}
                  />

                  ADMINISTRATOR

                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1.5 text-xs font-bold text-emerald-100">

                  <CheckCircle2
                    size={14}
                  />

                  System Active

                </span>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    institutionHealthLabel ===
                    "Healthy"
                      ? "bg-green-400/20 text-green-100"
                      : institutionHealthLabel ===
                        "Stable"
                      ? "bg-amber-400/20 text-amber-100"
                      : "bg-red-400/20 text-red-100"
                  }`}
                >

                  Institution{" "}
                  {
                    institutionHealthLabel
                  }

                </span>

              </div>

              <h2 className="mt-4 text-2xl font-bold sm:text-3xl lg:text-4xl">

                Welcome back,{" "}
                {adminName}

              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">

                Monitor your institution, manage academic operations, track finances and oversee Campus360 from one centralized administration workspace.

              </p>

              <div className="mt-5 flex flex-wrap gap-3">

                <HeroTag
                  icon={
                    <Users size={14} />
                  }
                  text={`${numericStats.students} students`}
                />

                <HeroTag
                  icon={
                    <GraduationCap
                      size={14}
                    />
                  }
                  text={`${numericStats.faculty} faculty`}
                />

                <HeroTag
                  icon={
                    <BookOpen size={14} />
                  }
                  text={`${numericStats.courses} courses`}
                />

                <HeroTag
                  icon={
                    <WalletCards
                      size={14}
                    />
                  }
                  text={`${feeCollectionPercentage}% fees collected`}
                />

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[430px]">

              <HeroMetric
                value={
                  numericStats.students
                }
                label="Students"
              />

              <HeroMetric
                value={
                  numericStats.faculty
                }
                label="Faculty"
              />

              <HeroMetric
                value={
                  numericStats.courses
                }
                label="Courses"
              />

              <HeroMetric
                value={`${institutionalHealth}%`}
                label="Health"
              />

            </div>

          </div>

        </section>

        {/* ====================================================
            ALERTS
        ==================================================== */}

        {error && (
          <AlertBox
            type="error"
            message={error}
            onClose={() =>
              setError("")
            }
          />
        )}

        {success && (
          <AlertBox
            type="success"
            message={success}
            onClose={() =>
              setSuccess("")
            }
          />
        )}

        {/* ====================================================
            STAT CARDS
        ==================================================== */}

        {loading && !stats ? (

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {Array.from(
              { length: 8 }
            ).map(
              (_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >

                  <div className="h-11 w-11 rounded-xl bg-slate-200" />

                  <div className="mt-4 h-4 w-1/2 rounded bg-slate-200" />

                  <div className="mt-2 h-8 w-1/3 rounded bg-slate-200" />

                  <div className="mt-2 h-3 w-2/3 rounded bg-slate-200" />

                </div>
              )
            )}

          </section>

        ) : (

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {statCards.map(
              (card) => {

                const Icon =
                  card.icon;

                return (
                  <button
                    type="button"
                    key={card.title}
                    onClick={() =>
                      navigate(
                        card.path
                      )
                    }
                    className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${getCardIconClass(
                          card.type
                        )}`}
                      >

                        <Icon
                          size={21}
                        />

                      </div>

                      <ArrowRight
                        size={18}
                        className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600"
                      />

                    </div>

                    <p className="mt-4 text-sm font-medium text-slate-500">
                      {card.title}
                    </p>

                    <h3 className="mt-1 text-3xl font-bold text-slate-800">
                      {card.value}
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      {card.description}
                    </p>

                  </button>
                );
              }
            )}

          </section>

        )}

        {/* ====================================================
            INSTITUTION ANALYTICS
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                <BarChart3
                  size={22}
                />

              </div>

              <div>

                <h2 className="text-xl font-bold text-slate-800">
                  Institution Analytics
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  High-level academic, financial and communication indicators.
                </p>

              </div>

            </div>

            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                institutionHealthLabel ===
                "Healthy"
                  ? "bg-green-50 text-green-700"
                  : institutionHealthLabel ===
                    "Stable"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
              }`}
            >

              <Activity
                size={14}
              />

              Health{" "}
              {
                institutionalHealth
              }%

            </span>

          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <AnalyticsCard
              icon={
                <Users size={19} />
              }
              label="Students / Faculty"
              value={
                studentFacultyRatio
              }
              description="Average students per faculty member"
            />

            <AnalyticsCard
              icon={
                <BookOpen
                  size={19}
                />
              }
              label="Courses / Faculty"
              value={
                courseFacultyRatio
              }
              description="Average academic courses per faculty"
            />

            <AnalyticsCard
              icon={
                <UserPlus
                  size={19}
                />
              }
              label="Enrollments / Student"
              value={
                enrollmentDensity
              }
              description="Average course enrollments per student"
            />

            <AnalyticsCard
              icon={
                <Percent
                  size={19}
                />
              }
              label="Fee Collection"
              value={`${feeCollectionPercentage}%`}
              description={`${formatCurrency(
                numericStats.feesPaid
              )} collected`}
            />

          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">

            <AnalyticsBlock
              title="Financial Health"
              subtitle="Fee collection performance"
              icon={
                <WalletCards
                  size={20}
                />
              }
              iconClass="bg-green-50 text-green-600"
            >

              <ProgressMetric
                label="Fees Collected"
                value={
                  feeCollectionPercentage
                }
                detail={`${formatCurrency(
                  numericStats.feesPaid
                )} collected`}
              />

              <ProgressMetric
                label="Fees Pending"
                value={
                  feePendingPercentage
                }
                detail={`${formatCurrency(
                  numericStats.feesPending
                )} outstanding`}
                tone="amber"
              />

              <div className="mt-4 grid grid-cols-2 gap-3">

                <MiniValueCard
                  label="Pending Records"
                  value={
                    numericStats.feePendingCount
                  }
                />

                <MiniValueCard
                  label="Partial Records"
                  value={
                    numericStats.feePartialCount
                  }
                />

              </div>

            </AnalyticsBlock>

            <AnalyticsBlock
              title="Academic Structure"
              subtitle="Institution configuration"
              icon={
                <School
                  size={20}
                />
              }
              iconClass="bg-purple-50 text-purple-600"
            >

              <ProgressMetric
                label="Structure Score"
                value={
                  academicStructureScore
                }
                detail={`${numericStats.departments} departments · ${numericStats.programs} programs`}
                tone="purple"
              />

              <div className="mt-5 grid grid-cols-3 gap-3">

                <MiniValueCard
                  label="Departments"
                  value={
                    numericStats.departments
                  }
                />

                <MiniValueCard
                  label="Programs"
                  value={
                    numericStats.programs
                  }
                />

                <MiniValueCard
                  label="Courses"
                  value={
                    numericStats.courses
                  }
                />

              </div>

            </AnalyticsBlock>

            <AnalyticsBlock
              title="Campus Communication"
              subtitle="Notice publishing"
              icon={
                <Megaphone
                  size={20}
                />
              }
              iconClass="bg-blue-50 text-blue-600"
            >

              <ProgressMetric
                label="Published Notices"
                value={
                  noticePublicationPercentage
                }
                detail={`${numericStats.noticesPublished} of ${numericStats.noticesTotal} published`}
              />

              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">

                <div className="flex items-center justify-between gap-3">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                      <Bell
                        size={19}
                      />

                    </div>

                    <div>

                      <p className="text-sm font-semibold text-slate-700">
                        Total Notices
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Campus announcements
                      </p>

                    </div>

                  </div>

                  <span className="text-2xl font-bold text-slate-800">
                    {
                      numericStats.noticesTotal
                    }
                  </span>

                </div>

              </div>

            </AnalyticsBlock>

          </div>

        </section>

        {/* ====================================================
            ATTENTION CENTER
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">

              <AlertCircle
                size={22}
              />

            </div>

            <div>

              <h2 className="text-lg font-bold text-slate-800">
                Administration Attention Center
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Items that may require action from the administrator.
              </p>

            </div>

          </div>

          {adminAttentionItems.length === 0 ? (

            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">

              <CheckCircle2
                size={21}
                className="shrink-0 text-green-600"
              />

              <div>

                <p className="font-bold text-green-800">
                  No urgent issues detected
                </p>

                <p className="mt-1 text-sm text-green-700">
                  Current institutional data does not show any immediate administrative alerts.
                </p>

              </div>

            </div>

          ) : (

            <div className="mt-5 grid gap-4 md:grid-cols-2">

              {adminAttentionItems.map(
                (item, index) => (
                  <AttentionItem
                    key={`${item.title}-${index}`}
                    item={item}
                    onClick={() =>
                      navigate(
                        item.path
                      )
                    }
                  />
                )
              )}

            </div>

          )}

        </section>

        {/* ====================================================
            QUICK ACCESS
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                <Zap
                  size={21}
                />

              </div>

              <div>

                <h2 className="text-lg font-bold text-slate-800">
                  Quick Access
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Open any administration module quickly.
                </p>

              </div>

            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">

              {
                quickAccess.length
              }{" "}
              modules

            </span>

          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">

            {quickAccess.map(
              (item) => {

                const Icon =
                  item.icon;

                return (
                  <button
                    type="button"
                    key={item.path}
                    onClick={() =>
                      navigate(
                        item.path
                      )
                    }
                    className="group rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-sm"
                  >

                    <div className="flex items-start justify-between gap-2">

                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm transition group-hover:text-blue-600">

                        <Icon
                          size={19}
                        />

                      </div>

                      <ChevronRight
                        size={16}
                        className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500"
                      />

                    </div>

                    <p className="mt-3 text-sm font-bold text-slate-800">
                      {item.title}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {item.description}
                    </p>

                  </button>
                );
              }
            )}

          </div>

        </section>

        {/* ====================================================
            FINANCE + NOTICES
        ==================================================== */}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/fees"
              )
            }
            className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-green-200 hover:shadow-lg"
          >

            <div className="flex items-center justify-between gap-3">

              <div>

                <p className="text-xs font-bold uppercase tracking-wide text-green-600">
                  Finance
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-800">
                  Fee Overview
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Institution-wide collection summary.
                </p>

              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">

                <WalletCards
                  size={22}
                />

              </div>

            </div>

            <div className="mt-6">

              <div className="flex items-center justify-between">

                <span className="text-sm font-semibold text-slate-600">
                  Collection rate
                </span>

                <span className="text-lg font-bold text-green-600">
                  {
                    feeCollectionPercentage
                  }%
                </span>

              </div>

              <ProgressBar
                value={
                  feeCollectionPercentage
                }
                tone="green"
              />

            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">

              <FinanceBox
                label="Total"
                value={formatCurrency(
                  numericStats.feesTotal
                )}
              />

              <FinanceBox
                label="Collected"
                value={formatCurrency(
                  numericStats.feesPaid
                )}
                positive
              />

              <FinanceBox
                label="Pending"
                value={formatCurrency(
                  numericStats.feesPending
                )}
                warning
              />

            </div>

            <div className="mt-5 flex items-center justify-end gap-2 text-sm font-bold text-green-600">

              Manage Fees

              <ArrowRight
                size={16}
                className="transition group-hover:translate-x-1"
              />

            </div>

          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/notices"
              )
            }
            className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-lg"
          >

            <div className="flex items-center justify-between gap-3">

              <div>

                <p className="text-xs font-bold uppercase tracking-wide text-purple-600">
                  Communication
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-800">
                  Notice Overview
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Campus communication summary.
                </p>

              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">

                <Megaphone
                  size={22}
                />

              </div>

            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">

              <OverviewBox
                label="Total Notices"
                value={
                  numericStats.noticesTotal
                }
              />

              <OverviewBox
                label="Published"
                value={
                  numericStats.noticesPublished
                }
                highlight
              />

            </div>

            <div className="mt-5">

              <ProgressBar
                value={
                  noticePublicationPercentage
                }
                tone="purple"
              />

            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">

              <div className="flex items-start gap-3">

                <Bell
                  size={19}
                  className="mt-0.5 shrink-0 text-purple-600"
                />

                <div>

                  <p className="font-semibold text-slate-700">
                    Publication status
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">

                    {
                      numericStats.noticesTotal -
                      numericStats.noticesPublished
                    }{" "}
                    notice(s) are not currently published.

                  </p>

                </div>

              </div>

            </div>

            <div className="mt-5 flex items-center justify-end gap-2 text-sm font-bold text-purple-600">

              Manage Notices

              <ArrowRight
                size={16}
                className="transition group-hover:translate-x-1"
              />

            </div>

          </button>

        </section>

        {/* ====================================================
            ACADEMIC OVERVIEW
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

              <School
                size={22}
              />

            </div>

            <div>

              <h2 className="text-xl font-bold text-slate-800">
                Academic Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Core academic structure across Campus360.
              </p>

            </div>

          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <AcademicBox
              icon={
                <School
                  size={19}
                />
              }
              label="Departments"
              value={
                numericStats.departments
              }
              path="/admin/departments"
              navigate={navigate}
            />

            <AcademicBox
              icon={
                <LayoutDashboard
                  size={19}
                />
              }
              label="Programs"
              value={
                numericStats.programs
              }
              path="/admin/programs"
              navigate={navigate}
            />

            <AcademicBox
              icon={
                <BookOpen
                  size={19}
                />
              }
              label="Courses"
              value={
                numericStats.courses
              }
              path="/admin/courses"
              navigate={navigate}
            />

            <AcademicBox
              icon={
                <ClipboardList
                  size={19}
                />
              }
              label="Assignments"
              value={
                numericStats.assignments
              }
              path="/admin/assignments"
              navigate={navigate}
            />

          </div>

        </section>

        {/* ====================================================
            SYSTEM SNAPSHOT
        ==================================================== */}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">

                <Activity
                  size={22}
                />

              </div>

              <div>

                <h2 className="text-lg font-bold text-slate-800">
                  Campus360 System Snapshot
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Current operational data available to administration.
                </p>

              </div>

            </div>

            <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
              Live Data
            </span>

          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <SnapshotCard
              label="Students"
              value={
                numericStats.students
              }
              icon={
                <Users
                  size={18}
                />
              }
              description="Registered learners"
            />

            <SnapshotCard
              label="Faculty"
              value={
                numericStats.faculty
              }
              icon={
                <GraduationCap
                  size={18}
                />
              }
              description="Teaching staff"
            />

            <SnapshotCard
              label="Users"
              value={
                numericStats.users
              }
              icon={
                <Users
                  size={18}
                />
              }
              description="System user accounts"
            />

            <SnapshotCard
              label="Enrollments"
              value={
                numericStats.enrollments
              }
              icon={
                <UserPlus
                  size={18}
                />
              }
              description="Course registrations"
            />

          </div>

        </section>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <footer className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

              <ShieldAlert
                size={19}
              />

            </div>

            <div>

              <p className="text-sm font-bold text-slate-800">
                Campus360 Administration
              </p>

              <p className="text-xs text-slate-500">
                Centralized academic and institutional management.
              </p>

            </div>

          </div>

          <p className="text-xs text-slate-400">

            Last dashboard refresh:{" "}

            {
              lastUpdatedText(
                currentTime
              )
            }

          </p>

        </footer>

      </main>

    </div>
  );
}

/* ============================================================
   HERO TAG
============================================================ */

function HeroTag({
  icon,
  text,
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100">
      {icon}
      {text}
    </span>
  );
}

/* ============================================================
   HERO METRIC
============================================================ */

function HeroMetric({
  value,
  label,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center backdrop-blur">

      <p className="text-xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-[10px] font-semibold text-blue-100">
        {label}
      </p>

    </div>
  );
}

/* ============================================================
   KPI ICON COLORS
============================================================ */

function getCardIconClass(type) {
  const styles = {
    blue:
      "bg-blue-50 text-blue-600",

    purple:
      "bg-purple-50 text-purple-600",

    green:
      "bg-green-50 text-green-600",

    amber:
      "bg-amber-50 text-amber-600",

    indigo:
      "bg-indigo-50 text-indigo-600",

    cyan:
      "bg-cyan-50 text-cyan-600",

    violet:
      "bg-violet-50 text-violet-600",
  };

  return (
    styles[type] ||
    styles.blue
  );
}

/* ============================================================
   ANALYTICS CARD
============================================================ */

function AnalyticsCard({
  icon,
  label,
  value,
  description,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

      <div className="flex items-center justify-between gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
          {icon}
        </div>

        <span className="text-2xl font-bold text-slate-800">
          {value}
        </span>

      </div>

      <p className="mt-4 text-sm font-bold text-slate-700">
        {label}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>

    </div>
  );
}

/* ============================================================
   ANALYTICS BLOCK
============================================================ */

function AnalyticsBlock({
  title,
  subtitle,
  icon,
  iconClass,
  children,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

      <div className="flex items-center gap-3">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <div>

          <h3 className="font-bold text-slate-800">
            {title}
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {subtitle}
          </p>

        </div>

      </div>

      <div className="mt-5">
        {children}
      </div>

    </div>
  );
}

/* ============================================================
   PROGRESS METRIC
============================================================ */

function ProgressMetric({
  label,
  value,
  detail,
  tone = "blue",
}) {
  return (
    <div className="mb-5 last:mb-0">

      <div className="flex items-center justify-between gap-3">

        <span className="text-sm font-semibold text-slate-700">
          {label}
        </span>

        <span className="text-sm font-bold text-slate-800">

          {
            Math.max(
              0,
              Math.min(
                Number(value) || 0,
                100
              )
            )
          }%

        </span>

      </div>

      <ProgressBar
        value={value}
        tone={tone}
      />

      <p className="mt-1 text-xs text-slate-400">
        {detail}
      </p>

    </div>
  );
}

/* ============================================================
   PROGRESS BAR
============================================================ */

function ProgressBar({
  value,
  tone = "blue",
}) {
  const safeValue =
    Math.max(
      0,
      Math.min(
        Number(value) || 0,
        100
      )
    );

  const tones = {
    blue:
      "bg-blue-600",

    green:
      "bg-green-500",

    amber:
      "bg-amber-500",

    purple:
      "bg-purple-600",

    red:
      "bg-red-500",
  };

  return (
    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">

      <div
        className={`h-full rounded-full transition-all duration-500 ${
          tones[tone] ||
          tones.blue
        }`}
        style={{
          width: `${safeValue}%`,
        }}
      />

    </div>
  );
}

/* ============================================================
   MINI VALUE CARD
============================================================ */

function MiniValueCard({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-white p-3">

      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-800">
        {value}
      </p>

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
  };

  const style =
    styles[item.type] ||
    styles.info;

  return (
    <div
      className={`rounded-2xl border p-5 ${style.wrapper}`}
    >

      <div className="flex items-start gap-3">

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ${style.icon}`}
        >
          {item.icon}
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
            className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition ${style.button}`}
          >

            {item.action}

            <ArrowRight
              size={15}
            />

          </button>

        </div>

      </div>

    </div>
  );
}

/* ============================================================
   FINANCE BOX
============================================================ */

function FinanceBox({
  label,
  value,
  positive = false,
  warning = false,
}) {
  return (
    <div
      className={`rounded-xl p-4 ${
        positive
          ? "bg-green-50"
          : warning
          ? "bg-amber-50"
          : "bg-slate-50"
      }`}
    >

      <p
        className={`text-xs ${
          positive
            ? "text-green-700"
            : warning
            ? "text-amber-700"
            : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-bold ${
          positive
            ? "text-green-700"
            : warning
            ? "text-amber-700"
            : "text-slate-800"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   OVERVIEW BOX
============================================================ */

function OverviewBox({
  label,
  value,
  highlight = false,
}) {
  return (
    <div
      className={`rounded-xl p-5 ${
        highlight
          ? "bg-purple-50"
          : "bg-slate-50"
      }`}
    >

      <p
        className={`text-sm ${
          highlight
            ? "text-purple-700"
            : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-2 text-3xl font-bold ${
          highlight
            ? "text-purple-700"
            : "text-slate-800"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   ACADEMIC BOX
============================================================ */

function AcademicBox({
  icon,
  label,
  value,
  path,
  navigate,
}) {
  return (
    <button
      type="button"
      onClick={() =>
        navigate(path)
      }
      className="group rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-sm"
    >

      <div className="flex items-center justify-between gap-2">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
          {icon}
        </div>

        <ArrowRight
          size={16}
          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600"
        />

      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-800">
        {value}
      </p>

    </button>
  );
}

/* ============================================================
   SNAPSHOT CARD
============================================================ */

function SnapshotCard({
  label,
  value,
  icon,
  description,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
          {icon}
        </div>

        <span className="text-sm font-semibold text-slate-600">
          {label}
        </span>

      </div>

      <p className="mt-4 text-2xl font-bold text-slate-800">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>

    </div>
  );
}

/* ============================================================
   ALERT BOX
============================================================ */

function AlertBox({
  type,
  message,
  onClose,
}) {
  const isError =
    type === "error";

  return (
    <div
      className={`mt-6 flex items-start gap-3 rounded-2xl border p-5 ${
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
            ? "Dashboard Error"
            : "Success"}

        </p>

        <p className="mt-1 text-sm leading-6">
          {message}
        </p>

      </div>

      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-lg p-1 opacity-60 hover:bg-black/5 hover:opacity-100"
      >

        <X
          size={17}
        />

      </button>

    </div>
  );
}

/* ============================================================
   LAST UPDATED
============================================================ */

function lastUpdatedText(time) {
  return time.toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );
}

export default AdminDashboard;