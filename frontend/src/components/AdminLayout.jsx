import { useState } from "react";
import AdminSidebar from "./AdminSidebar.jsx";

function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() =>
          setSidebarCollapsed(
            (current) => !current
          )
        }
      />

      <div
        className={`
          min-h-screen
          transition-all
          duration-300
          ${
            sidebarCollapsed
              ? "md:ml-20"
              : "md:ml-64"
          }
        `}
      >
        {/* Mobile navigation button */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 md:hidden"
          aria-label="Open admin navigation"
        >
          <span className="text-lg font-bold">
            ☰
          </span>
        </button>

        {children}
      </div>
    </div>
  );
}

export default AdminLayout;