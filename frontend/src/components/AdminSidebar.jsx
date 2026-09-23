import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  School,
  UserCog,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

const navigationItems = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Students",
    path: "/admin/students",
    icon: Users,
  },
  {
    label: "Faculty",
    path: "/admin/faculty",
    icon: GraduationCap,
  },
  {
    label: "Departments",
    path: "/admin/departments",
    icon: School,
  },
  {
    label: "Programs",
    path: "/admin/programs",
    icon: BarChart3,
  },
  {
    label: "Courses",
    path: "/admin/courses",
    icon: BookOpen,
  },
  {
    label: "Enrollments",
    path: "/admin/enrollments",
    icon: ClipboardList,
  },
  {
    label: "Fees",
    path: "/admin/fees",
    icon: WalletCards,
  },
  {
    label: "Exams",
    path: "/admin/exams",
    icon: CalendarDays,
  },
  {
    label: "Assignments",
    path: "/admin/assignments",
    icon: ClipboardList,
  },
  {
    label: "Timetable",
    path: "/admin/timetable",
    icon: CalendarDays,
  },
  {
    label: "Notices",
    path: "/admin/notices",
    icon: Megaphone,
  },
  {
    label: "Users",
    path: "/admin/users",
    icon: UserCog,
  },
  {
    label: "Reports",
    path: "/admin/reports",
    icon: FileBarChart,
  },
];

function AdminSidebar({
  isOpen = true,
  onClose,
  collapsed = false,
  onToggleCollapse,
}) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <>
      {/* ================= MOBILE OVERLAY ================= */}

      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      {/* ================= SIDEBAR ================= */}

      <aside
        className={`
          fixed left-0 top-0 z-40 flex h-screen flex-col
          border-r border-slate-200 bg-white
          shadow-sm transition-all duration-300
          ${collapsed ? "w-20" : "w-64"}
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* ================= BRAND ================= */}

        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">

          <div
            className={`flex items-center gap-3 ${
              collapsed
                ? "w-full justify-center"
                : ""
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <School size={21} />
            </div>

            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold text-slate-800">
                  Campus360
                </h1>

                <p className="text-[11px] text-slate-500">
                  Admin Portal
                </p>
              </div>
            )}
          </div>

          {/* Mobile close */}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 md:hidden"
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>

        </div>

        {/* ================= NAVIGATION ================= */}

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">

          <div className="space-y-1">

            {navigationItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `
                    group flex items-center rounded-xl
                    px-3 py-2.5 text-sm font-medium
                    transition
                    ${
                      collapsed
                        ? "justify-center"
                        : "gap-3"
                    }
                    ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }
                    `
                  }
                  title={
                    collapsed
                      ? item.label
                      : undefined
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={19}
                        className="shrink-0"
                      />

                      {!collapsed && (
                        <span className="truncate">
                          {item.label}
                        </span>
                      )}

                      {!collapsed &&
                        isActive && (
                          <span className="ml-auto h-2 w-2 rounded-full bg-white" />
                        )}
                    </>
                  )}
                </NavLink>
              );
            })}

          </div>

        </nav>

        {/* ================= BOTTOM ACTIONS ================= */}

        <div className="shrink-0 space-y-2 border-t border-slate-200 bg-white p-3">

          {/* Logout */}

          <button
            type="button"
            onClick={handleLogout}
            title={
              collapsed
                ? "Logout"
                : undefined
            }
            className={`
              flex w-full items-center rounded-xl
              py-2.5 text-sm font-medium
              text-red-600 transition
              hover:bg-red-50
              ${
                collapsed
                  ? "justify-center"
                  : "justify-center gap-2"
              }
            `}
          >
            <LogOut size={18} />

            {!collapsed && (
              <span>Logout</span>
            )}
          </button>

          {/* Collapse */}

          <button
            type="button"
            onClick={onToggleCollapse}
            title={
              collapsed
                ? "Expand menu"
                : "Collapse menu"
            }
            className={`
              flex w-full items-center rounded-xl
              border border-slate-200
              py-2.5 text-sm font-medium
              text-slate-600 transition
              hover:bg-slate-50
              ${
                collapsed
                  ? "justify-center"
                  : "justify-center gap-2"
              }
            `}
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <>
                <ChevronLeft size={18} />
                <span>
                  Collapse Menu
                </span>
              </>
            )}
          </button>

        </div>

      </aside>
    </>
  );
}

export default AdminSidebar;