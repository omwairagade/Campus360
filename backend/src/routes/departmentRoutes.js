import express from "express";

import {
  createDepartment,
  getDepartments,
} from "../controllers/departmentController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// CREATE DEPARTMENT
router.post(
  "/",
  authMiddleware,
  createDepartment
);

// GET ALL DEPARTMENTS
router.get(
  "/",
  authMiddleware,
  getDepartments
);

export default router;