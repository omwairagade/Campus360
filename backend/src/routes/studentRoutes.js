import express from "express";

import {
  createStudentProfile,
  getStudentProfile,
  updateStudentProfile,
  changeStudentPassword,
  getFacultyStudents,
} from "../controllers/studentController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ============================================================
// FACULTY
// ============================================================

router.get(
  "/faculty/students",
  authMiddleware,
  getFacultyStudents
);

// ============================================================
// STUDENT PROFILE
// ============================================================

// Create profile
router.post(
  "/profile",
  authMiddleware,
  createStudentProfile
);

// Get profile
router.get(
  "/profile",
  authMiddleware,
  getStudentProfile
);

// Update profile
router.patch(
  "/profile",
  authMiddleware,
  updateStudentProfile
);

// ============================================================
// STUDENT PASSWORD
// ============================================================

router.post(
  "/change-password",
  authMiddleware,
  changeStudentPassword
);

export default router;