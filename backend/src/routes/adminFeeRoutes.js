import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  getAdminFees,
  getAdminFeeById,
  createAdminFee,
  updateAdminFee,
  createAdminFeePayment,
  getAdminFeePayments,
} from "../controllers/adminFeeController.js";

import {
  getPaymentSetting,
  updatePaymentSetting,
} from "../controllers/adminPaymentSettingController.js";

const router = express.Router();

/*
  ==========================================
  ADMIN FEES & PAYMENTS ROUTES
  ==========================================
*/

/*
  IMPORTANT:
  Payment-setting routes MUST come before /:id routes.
  Otherwise Express treats "payment-setting"
  as a fee ID.
*/

// Get online payment setting
router.get(
  "/payment-setting",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getPaymentSetting
);

// Update online payment setting
router.patch(
  "/payment-setting",
  authMiddleware,
  roleMiddleware("ADMIN"),
  updatePaymentSetting
);

// Get all fee records
router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminFees
);

// Get fee details
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminFeeById
);

// Create new fee
router.post(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  createAdminFee
);

// Update fee
router.patch(
  "/:id",
  authMiddleware,
  roleMiddleware("ADMIN"),
  updateAdminFee
);

// Get payments for a fee
router.get(
  "/:id/payments",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getAdminFeePayments
);

// Add payment to a fee
router.post(
  "/:id/payments",
  authMiddleware,
  roleMiddleware("ADMIN"),
  createAdminFeePayment
);

export default router;