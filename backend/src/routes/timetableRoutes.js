import express from "express";

import {
  createTimetableEntry,
  getMyTimetable,
  getMyFacultyTimetable,
  getTimetable,
  updateTimetableEntry,
  deleteTimetableEntry,
} from "../controllers/timetableController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| FACULTY TIMETABLE
|--------------------------------------------------------------------------
*/

// GET TIMETABLE FOR LOGGED-IN FACULTY
router.get(
  "/faculty/my-timetable",
  authMiddleware,
  getMyFacultyTimetable
);

/*
|--------------------------------------------------------------------------
| STUDENT TIMETABLE
|--------------------------------------------------------------------------
*/

// GET LOGGED-IN STUDENT TIMETABLE
router.get(
  "/my-timetable",
  authMiddleware,
  getMyTimetable
);

/*
|--------------------------------------------------------------------------
| GENERAL TIMETABLE
|--------------------------------------------------------------------------
*/

// CREATE TIMETABLE ENTRY
router.post(
  "/",
  authMiddleware,
  createTimetableEntry
);

// GET ALL TIMETABLE ENTRIES
router.get(
  "/",
  authMiddleware,
  getTimetable
);

// UPDATE TIMETABLE ENTRY
router.put(
  "/:id",
  authMiddleware,
  updateTimetableEntry
);

// DELETE TIMETABLE ENTRY
router.delete(
  "/:id",
  authMiddleware,
  deleteTimetableEntry
);

export default router;