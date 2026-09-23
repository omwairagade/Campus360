import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  getAdminReportSummary,
  getDepartmentReport,
  getCourseReport,
  getExamPerformanceReport,
  getFeeReport,
  getAssignmentReport,
} from "../controllers/adminReportController.js";

const router = express.Router();

/*
  ==========================================
  ADMIN REPORTS ROUTES
  ==========================================
*/

// Overall report summary
router.get(
  "/summary",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminReportSummary
);

// Department-wise report
router.get(
  "/departments",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getDepartmentReport
);

// Course-wise report
router.get(
  "/courses",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getCourseReport
);

// Exam performance report
router.get(
  "/exams",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getExamPerformanceReport
);

// Fee collection report
router.get(
  "/fees",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getFeeReport
);

// Assignment submission report
router.get(
  "/assignments",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAssignmentReport
);

export default router;