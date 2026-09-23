import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  getAdminResults,
  getAdminResultById,
  createAdminResult,
  updateAdminResult,
  deleteAdminResult,
} from "../controllers/adminResultController.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Admin Result Routes
|--------------------------------------------------------------------------
| Base path:
| /api/admin/results
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminResults
);

router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminResultById
);

router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  createAdminResult
);

router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  updateAdminResult
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  deleteAdminResult
);

export default router;