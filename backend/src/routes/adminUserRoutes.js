import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  getAdminUsers,
  getAdminUserById,
  updateAdminUserStatus,
  getAdminUserStats,
} from "../controllers/adminUserController.js";

const router = express.Router();

/*
  ==========================================
  ADMIN USERS ROUTES
  ==========================================
*/

/*
  IMPORTANT:
  /stats must come before /:id
  so "stats" is not treated as a user ID.
*/

// Get user statistics
router.get(
  "/stats",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminUserStats
);

// Get all users
router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminUsers
);

// Get user details
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminUserById
);

// Activate / deactivate user
router.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware("ADMIN"),
  updateAdminUserStatus
);

export default router;