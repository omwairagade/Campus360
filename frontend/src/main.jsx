import React from "react";
import ReactDOM from "react-dom/client";

import {
BrowserRouter,
Navigate,
Route,
Routes,
useLocation,
} from "react-router-dom";

import "./index.css";

// ================================================================
// AUTHENTICATION
// ================================================================

import Login from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import VerifyOtp from "./pages/VerifyOtp.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";

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

import {
getLoggedInUser,
} from "./api";

// ================================================================
// AUTHENTICATION HELPERS
// ================================================================

const getUser = () => {
return getLoggedInUser();
};

const getRole = () => {
const user = getUser();

if (!user?.role) {
return null;
}

return String(
user.role
).toUpperCase();
};

// ================================================================
// DEFAULT DASHBOARD BY ROLE
// ================================================================

const getDashboardPath = (
role
) => {
if (role === "ADMIN") {
return "/admin/dashboard";
}

if (
role === "FACULTY" ||
role === "TEACHER"
) {
return "/faculty/dashboard";
}

return "/dashboard";
};

// ================================================================
// PROTECTED ROUTE
// ================================================================

const ProtectedRoute = ({
children,
allowedRoles = [],
}) => {
const location = useLocation();

const token =
localStorage.getItem("token");

const user = getUser();

const role = getRole();

// --------------------------------------------------------------
// NOT LOGGED IN
// --------------------------------------------------------------

if (!token) {
return ( <Navigate
     to="/"
     replace
   />
);
}

// --------------------------------------------------------------
// FIRST LOGIN PASSWORD CHANGE
// --------------------------------------------------------------

if (
user?.mustChangePassword === true &&
location.pathname !== "/change-password"
) {
return ( <Navigate
     to="/change-password"
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
return ( <Navigate
     to={getDashboardPath(role)}
     replace
   />
);
}

return children;
};

// ================================================================
// CHANGE PASSWORD ROUTE GUARD
// ================================================================

const ChangePasswordRoute = () => {
const token =
localStorage.getItem("token");

const user = getUser();

if (!token) {
return ( <Navigate
     to="/"
     replace
   />
);
}

if (
user?.mustChangePassword !== true
) {
return (
<Navigate
to={getDashboardPath(
getRole()
)}
replace
/>
);
}

return <ChangePassword />;
};

// ================================================================
// APP
// ================================================================

const App = () => {
return ( <Routes>


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

  <Route
    path="/change-password"
    element={<ChangePasswordRoute />}
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
<React.StrictMode> <BrowserRouter> <App /> </BrowserRouter>
</React.StrictMode>
);
