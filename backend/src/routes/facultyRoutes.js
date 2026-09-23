import express from "express";

import {
  createFaculty,
  getFaculty,
  getMyFacultyProfile,
  getMyFacultyCourses,
  getFacultyById,
} from "../controllers/facultyController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Logged-In Faculty Routes
|--------------------------------------------------------------------------
| These MUST come before /:id
|--------------------------------------------------------------------------
*/

// GET CURRENT FACULTY PROFILE
router.get(
  "/me",
  authMiddleware,
  getMyFacultyProfile
);

// GET CURRENT FACULTY COURSES
router.get(
  "/my-courses",
  authMiddleware,
  getMyFacultyCourses
);

/*
|--------------------------------------------------------------------------
| General Faculty Routes
|--------------------------------------------------------------------------
*/

// CREATE FACULTY
router.post(
  "/",
  authMiddleware,
  createFaculty
);

// GET ALL FACULTY
router.get(
  "/",
  authMiddleware,
  getFaculty
);

// GET SINGLE FACULTY
// Keep this LAST because it uses /:id
router.get(
  "/:id",
  authMiddleware,
  getFacultyById
);

export default router;