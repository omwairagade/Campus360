import express from "express";

import {
  createAssignment,
  getMyFacultyAssignments,
  getFacultyAssignmentById,
  getMyAssignments,
  submitAssignment,
  getAssignmentById,
  gradeAssignment,
} from "../controllers/assignmentController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import uploadAssignmentFile from "../middleware/uploadMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| FACULTY ROUTES
|--------------------------------------------------------------------------
| These routes MUST appear before /:id
|--------------------------------------------------------------------------
*/

// GET ASSIGNMENTS CREATED BY LOGGED-IN FACULTY
router.get(
  "/faculty/my-assignments",
  authMiddleware,
  getMyFacultyAssignments
);

// GET ONE FACULTY ASSIGNMENT + SUBMISSIONS
router.get(
  "/faculty/:id",
  authMiddleware,
  getFacultyAssignmentById
);

/*
|--------------------------------------------------------------------------
| GENERAL ASSIGNMENT ROUTES
|--------------------------------------------------------------------------
*/

// CREATE ASSIGNMENT
router.post(
  "/",
  authMiddleware,
  createAssignment
);

// GET LOGGED-IN STUDENT ASSIGNMENTS
router.get(
  "/my-assignments",
  authMiddleware,
  getMyAssignments
);

// SUBMIT ASSIGNMENT WITH FILE
router.post(
  "/:id/submit",
  authMiddleware,
  uploadAssignmentFile.single("assignmentFile"),
  submitAssignment
);

// GRADE ASSIGNMENT SUBMISSION
router.put(
  "/submissions/:submissionId/grade",
  authMiddleware,
  gradeAssignment
);

// GET SINGLE ASSIGNMENT
router.get(
  "/:id",
  authMiddleware,
  getAssignmentById
);

export default router;