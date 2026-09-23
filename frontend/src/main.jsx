import React from "react";
import ReactDOM from "react-dom/client";

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import "./index.css";

// ================================================================
// AUTHENTICATION
// ================================================================

import Login from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import VerifyOtp from "./pages/VerifyOtp.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

// ================================================================
// STUDENT PAGES
// ================================================================

import Dashboard from "./pages/Dashboard.jsx";
import Courses from "./pages/Courses.jsx";
import Attendance from "./pages/Attendance.jsx";
import Timetable from "./pages/Timetable.jsx";
import Assignments from "./pages/Assignments.jsx";
import Examinations from "./pages/Examinations.jsx";
import Results from "./pages/Results.jsx";
import Fees from "./pages/Fees.jsx";
import Notices from "./pages/Notices.jsx";
import Settings from "./pages/Settings.jsx";

// ================================================================
// FACULTY PAGES
// ================================================================

import FacultyDashboard from "./pages/FacultyDashboard.jsx";
import FacultyCourses from "./pages/FacultyCourses.jsx";
import FacultyCourseDetails from "./pages/FacultyCourseDetails.jsx";
import FacultyAttendance from "./pages/FacultyAttendance.jsx";
import FacultyAssignments from "./pages/FacultyAssignments.jsx";
import FacultyAssignmentDetails from "./pages/FacultyAssignmentDetails.jsx";
import FacultyExaminations from "./pages/FacultyExaminations.jsx";
import FacultyExamResults from "./pages/FacultyExamResults.jsx";
import FacultyStudents from "./pages/FacultyStudents.jsx";
import FacultyTimetable from "./pages/FacultyTimetable.jsx";
import FacultyNotices from "./pages/FacultyNotices.jsx";

// ================================================================
// ADMIN PAGES
// ================================================================

import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminStudents from "./pages/AdminStudents.jsx";
import AdminFaculty from "./pages/AdminFaculty.jsx";
import AdminDepartments from "./pages/AdminDepartments.jsx";
import AdminPrograms from "./pages/AdminPrograms.jsx";
import AdminAcademicYears from "./pages/AdminAcademicYears.jsx";
import AdminFeeStructures from "./pages/AdminFeeStructures.jsx";
import AdminCourses from "./pages/AdminCourses.jsx";
import AdminEnrollments from "./pages/AdminEnrollments.jsx";
import AdminFees from "./pages/AdminFees.jsx";
import AdminExams from "./pages/AdminExams.jsx";
import AdminAssignments from "./pages/AdminAssignments.jsx";
import AdminTimetable from "./pages/AdminTimetable.jsx";
import AdminNotices from "./pages/AdminNotices.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminReports from "./pages/AdminReports.jsx";
import AdminAttendance from "./pages/AdminAttendance.jsx";
import AdminResults from "./pages/AdminResults.jsx";

import { getLoggedInUser } from "./api";

// ================================================================
// AUTHENTICATION HELPERS
// ================================================================

const getRole = () => {
  const user = getLoggedInUser();

  if (!user?.role) {
    return null;
  }

  return String(user.role).toUpperCase();
};

// ================================================================
// PROTECTED ROUTE
// ================================================================

const ProtectedRoute = ({
  children,
  allowedRoles = [],
}) => {
  const token = localStorage.getItem("token");
  const role = getRole();

  // --------------------------------------------------------------
  // NOT LOGGED IN
  // --------------------------------------------------------------

  if (!token) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  // --------------------------------------------------------------
  // LOGGED IN BUT WRONG ROLE
  // --------------------------------------------------------------

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(role)
  ) {
    if (role === "ADMIN") {
      return (
        <Navigate
          to="/admin/dashboard"
          replace
        />
      );
    }

    if (
      role === "FACULTY" ||
      role === "TEACHER"
    ) {
      return (
        <Navigate
          to="/faculty/dashboard"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
};

// ================================================================
// APP
// ================================================================

const App = () => {
  return (
    <Routes>

      {/* ==========================================================
          AUTHENTICATION
      ========================================================== */}

      <Route
        path="/"
        element={<Login />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/verify-otp"
        element={<VerifyOtp />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* ==========================================================
          STUDENT ROUTES
      ========================================================== */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/courses"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <Courses />
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <Attendance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/timetable"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <Timetable />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assignments"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <Assignments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/examinations"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <Examinations />
          </ProtectedRoute>
        }
      />

      <Route
        path="/results"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <Results />
          </ProtectedRoute>
        }
      />

      <Route
        path="/fees"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <Fees />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notices"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <Notices />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute
            allowedRoles={["STUDENT"]}
          >
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* ==========================================================
          FACULTY ROUTES
      ========================================================== */}

      <Route
        path="/faculty/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={[
              "FACULTY",
              "TEACHER",
            ]}
          >
            <FacultyDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty/courses"
        element={
          <ProtectedRoute
            allowedRoles={[
              "FACULTY",
              "TEACHER",
            ]}
          >
            <FacultyCourses />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty/courses/:id"
        element={
          <ProtectedRoute
            allowedRoles={[
              "FACULTY",
              "TEACHER",
            ]}
          >
            <FacultyCourseDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty/attendance"
        element={
          <ProtectedRoute
            allowedRoles={[
              "FACULTY",
              "TEACHER",
            ]}
          >
            <FacultyAttendance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty/assignments"
        element={
          <ProtectedRoute
            allowedRoles={[
              "FACULTY",
              "TEACHER",
            ]}
          >
            <FacultyAssignments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty/assignments/:id"
        element={
          <ProtectedRoute
            allowedRoles={[
              "FACULTY",
              "TEACHER",
            ]}
          >
            <FacultyAssignmentDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty/examinations"
        element={
          <ProtectedRoute
            allowedRoles={[
              "FACULTY",
              "TEACHER",
            ]}
          >
            <FacultyExaminations />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty/examinations/:id"
        element={
          <ProtectedRoute
            allowedRoles={[
              "FACULTY",
              "TEACHER",
            ]}
          >
            <FacultyExamResults />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty/students"
        element={
          <ProtectedRoute
            allowedRoles={[
              "FACULTY",
              "TEACHER",
            ]}
          >
            <FacultyStudents />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty/timetable"
        element={
          <ProtectedRoute
            allowedRoles={[
              "FACULTY",
              "TEACHER",
            ]}
          >
            <FacultyTimetable />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty/notices"
        element={
          <ProtectedRoute
            allowedRoles={[
              "FACULTY",
              "TEACHER",
            ]}
          >
            <FacultyNotices />
          </ProtectedRoute>
        }
      />

      {/* ==========================================================
          ADMIN ROUTES
      ========================================================== */}

      {/* ----------------------------------------------------------
          ADMIN DASHBOARD
      ---------------------------------------------------------- */}

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN STUDENTS
      ---------------------------------------------------------- */}

      <Route
        path="/admin/students"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminStudents />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN FACULTY
      ---------------------------------------------------------- */}

      <Route
        path="/admin/faculty"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminFaculty />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN DEPARTMENTS
      ---------------------------------------------------------- */}

      <Route
        path="/admin/departments"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminDepartments />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN PROGRAMS
      ---------------------------------------------------------- */}

      <Route
        path="/admin/programs"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminPrograms />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN ACADEMIC YEARS
      ---------------------------------------------------------- */}

      <Route
        path="/admin/academic-years"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminAcademicYears />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN FEE STRUCTURES
      ---------------------------------------------------------- */}

      <Route
        path="/admin/fee-structures"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminFeeStructures />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN COURSES
      ---------------------------------------------------------- */}

      <Route
        path="/admin/courses"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminCourses />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN ENROLLMENTS
      ---------------------------------------------------------- */}

      <Route
        path="/admin/enrollments"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminEnrollments />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN FEES
      ---------------------------------------------------------- */}

      <Route
        path="/admin/fees"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminFees />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN EXAMS
      ---------------------------------------------------------- */}

      <Route
        path="/admin/exams"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminExams />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN ASSIGNMENTS
      ---------------------------------------------------------- */}

      <Route
        path="/admin/assignments"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminAssignments />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN TIMETABLE
      ---------------------------------------------------------- */}

      <Route
        path="/admin/timetable"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminTimetable />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN NOTICES
      ---------------------------------------------------------- */}

      <Route
        path="/admin/notices"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminNotices />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN USERS
      ---------------------------------------------------------- */}

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminUsers />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN REPORTS
      ---------------------------------------------------------- */}

      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminReports />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN ATTENDANCE
      ---------------------------------------------------------- */}

      <Route
        path="/admin/attendance"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminAttendance />
          </ProtectedRoute>
        }
      />

      {/* ----------------------------------------------------------
          ADMIN RESULTS
      ---------------------------------------------------------- */}

      <Route
        path="/admin/results"
        element={
          <ProtectedRoute
            allowedRoles={["ADMIN"]}
          >
            <AdminResults />
          </ProtectedRoute>
        }
      />

      {/* ==========================================================
          FALLBACK
      ========================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
};

// ================================================================
// REACT ROOT
// ================================================================

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);