import express from "express";

import {
  createExam,
  getMyFacultyExams,
  getFacultyExamById,
  getMyExams,
  getMyResults,
  saveExamResult,
  getMyCGPA,
} from "../controllers/examController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| FACULTY ROUTES
|--------------------------------------------------------------------------
*/

// GET EXAMS FOR LOGGED-IN FACULTY
router.get(
  "/faculty/my-exams",
  authMiddleware,
  getMyFacultyExams
);

// GET ONE FACULTY EXAM + STUDENTS + RESULTS
router.get(
  "/faculty/:id",
  authMiddleware,
  getFacultyExamById
);

/*
|--------------------------------------------------------------------------
| GENERAL EXAM ROUTES
|--------------------------------------------------------------------------
*/

// CREATE EXAM
router.post(
  "/",
  authMiddleware,
  createExam
);

// GET EXAMS FOR LOGGED-IN STUDENT
router.get(
  "/my-exams",
  authMiddleware,
  getMyExams
);

// GET STUDENT RESULTS
router.get(
  "/my-results",
  authMiddleware,
  getMyResults
);

// GET STUDENT CGPA
router.get(
  "/my-cgpa",
  authMiddleware,
  getMyCGPA
);

// SAVE / UPDATE EXAM RESULT
router.put(
  "/:examId/results",
  authMiddleware,
  saveExamResult
);

export default router;