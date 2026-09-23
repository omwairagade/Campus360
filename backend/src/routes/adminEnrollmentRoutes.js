import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  getAdminEnrollments,
  getAdminEnrollmentById,
  createAdminEnrollment,
  deleteAdminEnrollment,
} from "../controllers/adminEnrollmentController.js";

const router = express.Router();

// Get all enrollments
router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminEnrollments
);

// Get one enrollment
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminEnrollmentById
);

// Create enrollment
router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  createAdminEnrollment
);

// Delete enrollment
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  deleteAdminEnrollment
);

export default router;