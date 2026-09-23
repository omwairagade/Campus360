import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  getAdminFaculty,
  getAdminFacultyById,
  updateAdminFacultyStatus,
} from "../controllers/adminFacultyController.js";

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN"));

/*
  GET /api/admin/faculty
*/
router.get(
  "/",
  getAdminFaculty
);

/*
  GET /api/admin/faculty/:id
*/
router.get(
  "/:id",
  getAdminFacultyById
);

/*
  PATCH /api/admin/faculty/:id/status
*/
router.patch(
  "/:id/status",
  updateAdminFacultyStatus
);

export default router;