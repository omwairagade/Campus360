import express from "express";

import {
  markAttendance,
  getFacultyCourseAttendance,
  markFacultyAttendance,
  getMyAttendance,
  getMyCourseAttendance,
  getAdminAttendance,
  getAdminAttendanceSummary,
} from "../controllers/attendanceController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| FACULTY - SINGLE STUDENT ATTENDANCE
|--------------------------------------------------------------------------
*/
router.post(
  "/mark",
  authMiddleware,
  markAttendance
);

/*
|--------------------------------------------------------------------------
| FACULTY - GET COURSE ATTENDANCE
|--------------------------------------------------------------------------
*/
router.get(
  "/faculty/course/:courseId",
  authMiddleware,
  getFacultyCourseAttendance
);

/*
|--------------------------------------------------------------------------
| FACULTY - MARK MULTIPLE STUDENTS ATTENDANCE
|--------------------------------------------------------------------------
*/
router.post(
  "/faculty/mark",
  authMiddleware,
  markFacultyAttendance
);

/*
|--------------------------------------------------------------------------
| STUDENT - GET MY ATTENDANCE
|--------------------------------------------------------------------------
*/
router.get(
  "/my",
  authMiddleware,
  getMyAttendance
);

/*
|--------------------------------------------------------------------------
| STUDENT - GET MY COURSE-WISE ATTENDANCE
|--------------------------------------------------------------------------
*/
router.get(
  "/my/courses",
  authMiddleware,
  getMyCourseAttendance
);

/*
|--------------------------------------------------------------------------
| ADMIN - GET ATTENDANCE
|--------------------------------------------------------------------------
*/
router.get(
  "/admin",
  authMiddleware,
  getAdminAttendance
);

/*
|--------------------------------------------------------------------------
| ADMIN - GET ATTENDANCE SUMMARY
|--------------------------------------------------------------------------
*/
router.get(
  "/admin/summary",
  authMiddleware,
  getAdminAttendanceSummary
);

export default router;