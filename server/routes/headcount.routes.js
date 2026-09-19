"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const headcount_controller_1 = require("../controllers/headcount.controller");
const router = (0, express_1.Router)();
router.post("/save", headcount_controller_1.save);
router.get("/current", headcount_controller_1.current);
exports.default = router;
//# sourceMappingURL=headcount.routes.js.map