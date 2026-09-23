import express from "express";

import {
  getMyFees,
  getFeeById,
  createFee,
  recordPayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../controllers/feeController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ============================================================
// STUDENT
// ============================================================

router.get(
  "/my-fees",
  authMiddleware,
  getMyFees
);

router.post(
  "/:id/create-order",
  authMiddleware,
  createRazorpayOrder
);

router.post(
  "/verify-payment",
  authMiddleware,
  verifyRazorpayPayment
);

router.get(
  "/:id",
  authMiddleware,
  getFeeById
);

// ============================================================
// ADMIN / FACULTY
// ============================================================

router.post(
  "/",
  authMiddleware,
  createFee
);

router.post(
  "/:id/payment",
  authMiddleware,
  recordPayment
);

export default router;