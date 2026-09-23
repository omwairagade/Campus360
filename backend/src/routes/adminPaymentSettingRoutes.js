import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  getPaymentSetting,
  updatePaymentSetting,
} from "../controllers/adminPaymentSettingController.js";

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  getPaymentSetting
);

router.patch(
  "/",
  authMiddleware,
  roleMiddleware("ADMIN"),
  updatePaymentSetting
);

export default router;