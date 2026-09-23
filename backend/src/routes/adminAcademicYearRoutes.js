import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  getAdminAcademicYears,
  getAdminAcademicYearById,
  createAdminAcademicYear,
  updateAdminAcademicYear,
  deleteAdminAcademicYear,
} from "../controllers/adminAcademicYearController.js";

const router = express.Router();

// GET /api/admin/academic-years
router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminAcademicYears
);

// GET /api/admin/academic-years/:id
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminAcademicYearById
);

// POST /api/admin/academic-years
router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  createAdminAcademicYear
);

// PATCH /api/admin/academic-years/:id
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  updateAdminAcademicYear
);

// DELETE /api/admin/academic-years/:id
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  deleteAdminAcademicYear
);

export default router;