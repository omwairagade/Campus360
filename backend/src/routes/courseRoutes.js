import express from "express";

import {
  createCourse,
  getCourses,
  getMyCourses,
  getAvailableCourses,
  getCourseById,
  updateCourse,
} from "../controllers/courseController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// =====================================================
// CREATE COURSE
// =====================================================

router.post(
  "/",
  authMiddleware,
  createCourse
);

// =====================================================
// GET ALL COURSES
// =====================================================

router.get(
  "/",
  authMiddleware,
  getCourses
);

// =====================================================
// GET COURSES FOR LOGGED-IN STUDENT
// =====================================================

router.get(
  "/my-courses",
  authMiddleware,
  getMyCourses
);

// =====================================================
// GET AVAILABLE COURSES FOR LOGGED-IN STUDENT
// =====================================================

router.get(
  "/available",
  authMiddleware,
  getAvailableCourses
);

// =====================================================
// UPDATE COURSE
// =====================================================

router.put(
  "/:id",
  authMiddleware,
  updateCourse
);

// =====================================================
// GET SINGLE COURSE
// =====================================================

router.get(
  "/:id",
  authMiddleware,
  getCourseById
);

export default router;