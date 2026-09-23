import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  getAdminDashboardStats,
} from "../controllers/adminController.js";

const router = express.Router();

// All generic admin routes require authentication
router.use(authMiddleware);

// =====================================================
// ADMIN DASHBOARD
// GET /api/admin/dashboard/stats
// =====================================================
router.get(
  "/dashboard/stats",
  roleMiddleware("ADMIN"),
  getAdminDashboardStats
);

export default router;