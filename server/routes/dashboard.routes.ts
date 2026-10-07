import { Router } from "express";
import { getDashboard } from "../controllers/dashboard.controller";
import {
  authenticate,
  authorize,
} from "../middleware/auth.middleware";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize(
    "SUPER_ADMIN",
    "ADMIN",
    "COORDINATOR"
  ),
  getDashboard
);

export default router;