import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  getAdminExams,
  getAdminExamById,
  createAdminExam,
  updateAdminExam,
  deleteAdminExam,
} from "../controllers/adminExamController.js";

const router = express.Router();

// =====================================================
// GET ALL EXAMS
// GET /api/admin/exams
// =====================================================
router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminExams
);

// =====================================================
// GET SINGLE EXAM
// GET /api/admin/exams/:id
// =====================================================
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminExamById
);

// =====================================================
// CREATE EXAM
// POST /api/admin/exams
// =====================================================
router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  createAdminExam
);

// =====================================================
// UPDATE EXAM
// PATCH /api/admin/exams/:id
// =====================================================
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  updateAdminExam
);

// =====================================================
// DELETE EXAM
// DELETE /api/admin/exams/:id
// =====================================================
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  deleteAdminExam
);

export default router;