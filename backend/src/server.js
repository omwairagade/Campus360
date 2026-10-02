import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import prisma from "./lib/prisma.js";

// =====================================================
// Load environment variables from backend/.env
// =====================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

// ===============================
// General Routes
// ===============================
import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import studentResultRoutes from "./routes/studentResultRoutes.js";
import facultyRoutes from "./routes/facultyRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";
import examinationRoutes from "./routes/examRoutes.js";
import feeRoutes from "./routes/feeRoutes.js";
import timetableRoutes from "./routes/timetableRoutes.js";
import noticeRoutes from "./routes/noticeRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import programRoutes from "./routes/programRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";

// ===============================
// Admin Routes
// ===============================
import adminRoutes from "./routes/adminRoutes.js";
import adminStudentRoutes from "./routes/adminStudentRoutes.js";
import adminFacultyRoutes from "./routes/adminFacultyRoutes.js";
import adminDepartmentRoutes from "./routes/adminDepartmentRoutes.js";
import adminProgramRoutes from "./routes/adminProgramRoutes.js";
import adminCourseRoutes from "./routes/adminCourseRoutes.js";
import adminEnrollmentRoutes from "./routes/adminEnrollmentRoutes.js";
import adminFeeRoutes from "./routes/adminFeeRoutes.js";
import adminExamRoutes from "./routes/adminExamRoutes.js";
import adminAssignmentRoutes from "./routes/adminAssignmentRoutes.js";
import adminTimetableRoutes from "./routes/adminTimetableRoutes.js";
import adminNoticeRoutes from "./routes/adminNoticeRoutes.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import adminReportRoutes from "./routes/adminReportRoutes.js";
import adminResultRoutes from "./routes/adminResultRoutes.js";
import adminAcademicYearRoutes from "./routes/adminAcademicYearRoutes.js";
import adminFeeStructureRoutes from "./routes/adminFeeStructureRoutes.js";
import adminPaymentSettingRoutes from "./routes/adminPaymentSettingRoutes.js";

// ===============================
// App Setup
// ===============================
const app = express();
const PORT = process.env.PORT || 5000;

// ===============================
// CORS Configuration
// ===============================
const allowedOrigins = [
  "https://campus360-frontend.onrender.com",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // such as server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("CORS policy: Origin not allowed")
      );
    },
    credentials: true,
  })
);

// ===============================
// Body Parser
// ===============================
app.use(express.json());

// ===============================
// Static Uploads
// ===============================
app.use(
  "/uploads",
  express.static(path.resolve(__dirname, "../uploads"))
);

// ===============================
// General API Routes
// ===============================
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/student-results", studentResultRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/exams", examinationRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/enrollments", enrollmentRoutes);

// ===============================
// Admin API Routes
// Specific routes MUST come
// before generic /api/admin
// ===============================
app.use("/api/admin/students", adminStudentRoutes);
app.use("/api/admin/faculty", adminFacultyRoutes);
app.use("/api/admin/departments", adminDepartmentRoutes);
app.use("/api/admin/programs", adminProgramRoutes);
app.use("/api/admin/courses", adminCourseRoutes);
app.use("/api/admin/enrollments", adminEnrollmentRoutes);
app.use("/api/admin/fees", adminFeeRoutes);
app.use("/api/admin/exams", adminExamRoutes);
app.use("/api/admin/assignments", adminAssignmentRoutes);
app.use("/api/admin/timetable", adminTimetableRoutes);
app.use("/api/admin/notices", adminNoticeRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/reports", adminReportRoutes);
app.use("/api/admin/results", adminResultRoutes);
app.use("/api/admin/academic-years", adminAcademicYearRoutes);
app.use("/api/admin/fee-structures", adminFeeStructureRoutes);

app.use(
  "/api/admin/payment-settings",
  adminPaymentSettingRoutes
);

console.log("✅ Admin fee structure routes registered");

// Generic admin route MUST be last
app.use("/api/admin", adminRoutes);

// ===============================
// Root Route
// ===============================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Campus360 API is running",
  });
});

// ===============================
// Health Check
// ===============================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Campus360 backend is healthy",
    timestamp: new Date().toISOString(),
  });
});

// ===============================
// Database Test
// ===============================
app.get("/api/db-test", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "Database connection successful",
    });
  } catch (error) {
    console.error("Database test error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// ===============================
// 404 Handler
// ===============================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ===============================
// Global Error Handler
// ===============================
app.use((error, req, res, next) => {
  console.error("Global server error:", error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

// ===============================
// Start Server
// ===============================
app.listen(PORT, () => {
  console.log(
    `Campus360 backend running on http://localhost:${PORT}`
  );

  console.log("Environment variables loaded:");
  console.log("PORT:", process.env.PORT || "5000");
  console.log("MAIL_HOST:", process.env.MAIL_HOST || "NOT CONFIGURED");
  console.log("MAIL_PORT:", process.env.MAIL_PORT || "NOT CONFIGURED");
  console.log(
    "MAIL_USER:",
    process.env.MAIL_USER ? "CONFIGURED" : "NOT CONFIGURED"
  );
  console.log(
    "RAZORPAY_KEY_ID:",
    process.env.RAZORPAY_KEY_ID ? "CONFIGURED" : "NOT CONFIGURED"
  );
});