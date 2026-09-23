import express from "express";

import {
  enrollStudent,
  getMyEnrollments,
  updateCourseProgress,
  removeEnrollment,
} from "../controllers/enrollmentController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ENROLL LOGGED-IN STUDENT IN A COURSE
router.post(
  "/",
  authMiddleware,
  enrollStudent
);

// GET LOGGED-IN STUDENT ENROLLMENTS
router.get(
  "/my-enrollments",
  authMiddleware,
  getMyEnrollments
);

// UPDATE COURSE PROGRESS
router.put(
  "/:courseId/progress",
  authMiddleware,
  updateCourseProgress
);

// REMOVE LOGGED-IN STUDENT FROM A COURSE
router.delete(
  "/:courseId",
  authMiddleware,
  removeEnrollment
);

export default router;