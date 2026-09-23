import express from "express";

import {
  getPublishedNotices,
  getAllNotices,
  createNotice,
  updateNotice,
  deleteNotice,
} from "../controllers/noticeController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Student
router.get("/published", authMiddleware, getPublishedNotices);

// Admin / Faculty
router.get("/", authMiddleware, getAllNotices);
router.post("/", authMiddleware, createNotice);
router.put("/:id", authMiddleware, updateNotice);
router.delete("/:id", authMiddleware, deleteNotice);

export default router;