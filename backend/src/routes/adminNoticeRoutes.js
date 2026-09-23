import express from "express";

import {
  getAllAdminNotices,
  getAdminNoticeById,
  createAdminNotice,
  updateAdminNotice,
  updateAdminNoticeStatus,
  deleteAdminNotice,
} from "../controllers/adminNoticeController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/",
  getAllAdminNotices
);

router.get(
  "/:id",
  getAdminNoticeById
);

router.post(
  "/",
  createAdminNotice
);

router.patch(
  "/:id",
  updateAdminNotice
);

router.patch(
  "/:id/status",
  updateAdminNoticeStatus
);

router.delete(
  "/:id",
  deleteAdminNotice
);

export default router;