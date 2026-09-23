import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  getAdminAssignments,
  getAdminAssignmentById,
  createAdminAssignment,
  updateAdminAssignment,
  deleteAdminAssignment,
} from "../controllers/adminAssignmentController.js";

const router = express.Router();

/*
  ==========================================
  ADMIN ASSIGNMENTS ROUTES
  ==========================================
*/

// Get all assignments
router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminAssignments
);

// Get assignment details
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminAssignmentById
);

// Create assignment
router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  createAdminAssignment
);

// Update assignment
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  updateAdminAssignment
);

// Delete assignment
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  deleteAdminAssignment
);

export default router;