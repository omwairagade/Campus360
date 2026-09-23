import express from "express";

import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} from "../controllers/courseController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// =====================================================
// ADMIN COURSE ROUTES
// =====================================================

// Authentication required for all routes
router.use(authMiddleware);

// Only ADMIN users can access these routes
router.use(roleMiddleware("ADMIN"));

// =====================================================
// GET ALL COURSES
// GET /api/admin/courses
// =====================================================
router.get("/", getCourses);

// =====================================================
// GET SINGLE COURSE
// GET /api/admin/courses/:id
// =====================================================
router.get("/:id", getCourseById);

// =====================================================
// CREATE COURSE
// POST /api/admin/courses
// =====================================================
router.post("/", createCourse);

// =====================================================
// UPDATE COURSE
// PUT /api/admin/courses/:id
// =====================================================
router.put("/:id", updateCourse);

// =====================================================
// DELETE COURSE
// DELETE /api/admin/courses/:id
// =====================================================
router.delete("/:id", deleteCourse);

export default router;