import express from "express";

import {
  createProgram,
  getPrograms,
} from "../controllers/programController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// CREATE PROGRAM
router.post(
  "/",
  authMiddleware,
  createProgram
);

// GET ALL PROGRAMS
router.get(
  "/",
  authMiddleware,
  getPrograms
);

export default router;