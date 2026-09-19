"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("SUPER_ADMIN", "ADMIN", "COORDINATOR"), dashboard_controller_1.getDashboard);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map