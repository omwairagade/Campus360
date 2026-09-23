import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  createAdminStudent,
  getAdminStudents,
  getAdminStudentById,
  updateAdminStudent,
  updateAdminStudentStatus,
} from "../controllers/adminStudentController.js";

const router = express.Router();

/*
  ==========================================
  ADMIN STUDENT ROUTES
  ==========================================
*/

router.use(authMiddleware);
router.use(roleMiddleware("ADMIN"));

/*
  Create student
  POST /api/admin/students
*/
router.post(
  "/",
  createAdminStudent
);

/*
  Get all students
  GET /api/admin/students
*/
router.get(
  "/",
  getAdminStudents
);

/*
  Get student details
  GET /api/admin/students/:id
*/
router.get(
  "/:id",
  getAdminStudentById
);

/*
  Update academic group
  PATCH /api/admin/students/:id
*/
router.patch(
  "/:id",
  updateAdminStudent
);

/*
  Activate / deactivate student account
  PATCH /api/admin/students/:id/status
*/
router.patch(
  "/:id/status",
  updateAdminStudentStatus
);

export default router;