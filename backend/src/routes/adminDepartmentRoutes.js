import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  getAdminDepartments,
  getAdminDepartmentById,
  createAdminDepartment,
  updateAdminDepartment,
  deleteAdminDepartment,
} from "../controllers/adminDepartmentController.js";

const router = express.Router();

// GET /api/admin/departments
router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminDepartments
);

// GET /api/admin/departments/:id
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminDepartmentById
);

// POST /api/admin/departments
router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  createAdminDepartment
);

// PATCH /api/admin/departments/:id
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  updateAdminDepartment
);

// DELETE /api/admin/departments/:id
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  deleteAdminDepartment
);

export default router;