import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  getAdminFeeStructures,
  getAdminFeeStructureById,
  createAdminFeeStructure,
  updateAdminFeeStructure,
  deleteAdminFeeStructure,
} from "../controllers/adminFeeStructureController.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminFeeStructures
);

router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminFeeStructureById
);

router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  createAdminFeeStructure
);

router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  updateAdminFeeStructure
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  deleteAdminFeeStructure
);

export default router;