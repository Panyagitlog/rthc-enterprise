"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const company_controller_1 = require("../controllers/company.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * Get all companies
 * Accessible by all logged-in users
 */
router.get("/", auth_middleware_1.authenticate, company_controller_1.getCompanies);
/**
 * Get company by ID
 */
router.get("/:id", auth_middleware_1.authenticate, company_controller_1.getCompany);
/**
 * Create company
 * SUPER_ADMIN & ADMIN
 */
router.post("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("SUPER_ADMIN", "ADMIN"), company_controller_1.createCompany);
/**
 * Update company
 * SUPER_ADMIN & ADMIN
 */
router.put("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("SUPER_ADMIN", "ADMIN"), company_controller_1.updateCompany);
/**
 * Delete company
 * SUPER_ADMIN only
 */
router.delete("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("SUPER_ADMIN"), company_controller_1.deleteCompany);
exports.default = router;
//# sourceMappingURL=company.routes.js.map