import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  getAdminTimetable,
  getAdminTimetableById,
  createAdminTimetable,
  updateAdminTimetable,
  deleteAdminTimetable,
} from "../controllers/adminTimetableController.js";

const router = express.Router();

// =====================================================
// GET ALL TIMETABLE ENTRIES
// GET /api/admin/timetable
// =====================================================
router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminTimetable
);

// =====================================================
// GET SINGLE TIMETABLE ENTRY
// GET /api/admin/timetable/:id
// =====================================================
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminTimetableById
);

// =====================================================
// CREATE TIMETABLE ENTRY
// POST /api/admin/timetable
// =====================================================
router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  createAdminTimetable
);

// =====================================================
// UPDATE TIMETABLE ENTRY
// PATCH /api/admin/timetable/:id
// =====================================================
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  updateAdminTimetable
);

// =====================================================
// DELETE TIMETABLE ENTRY
// DELETE /api/admin/timetable/:id
// =====================================================
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  deleteAdminTimetable
);

export default router;