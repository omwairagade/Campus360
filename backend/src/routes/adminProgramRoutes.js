import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  getAdminPrograms,
  getAdminProgramById,
  createAdminProgram,
  updateAdminProgram,
  deleteAdminProgram,
} from "../controllers/adminProgramController.js";

const router = express.Router();

// GET /api/admin/programs
router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminPrograms
);

// GET /api/admin/programs/:id
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminProgramById
);

// POST /api/admin/programs
router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  createAdminProgram
);

// PATCH /api/admin/programs/:id
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  updateAdminProgram
);

// DELETE /api/admin/programs/:id
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  deleteAdminProgram
);

export default router;