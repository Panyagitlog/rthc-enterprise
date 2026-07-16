import { Router } from "express";
import {
  createCompany,
  getCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
} from "../controllers/company.controller";

import {
  authenticate,
  authorize,
} from "../middleware/auth.middleware";

const router = Router();

/**
 * Get all companies
 * Accessible by all logged-in users
 */
router.get(
  "/",
  authenticate,
  getCompanies
);

/**
 * Get company by ID
 */
router.get(
  "/:id",
  authenticate,
  getCompany
);

/**
 * Create company
 * SUPER_ADMIN & ADMIN
 */
router.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN"),
  createCompany
);

/**
 * Update company
 * SUPER_ADMIN & ADMIN
 */
router.put(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN"),
  updateCompany
);

/**
 * Delete company
 * SUPER_ADMIN only
 */
router.delete(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN"),
  deleteCompany
);

export default router;