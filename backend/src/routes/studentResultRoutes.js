import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

import {
  getMyResults,
} from "../controllers/studentResultController.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Student Result Routes
|--------------------------------------------------------------------------
| Base path:
| /api/student-results
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authMiddleware,
  roleMiddleware("STUDENT"),
  getMyResults
);

export default router;