"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_chat_controller_1 = require("../controllers/ai-chat.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post("/", auth_middleware_1.authenticatePlatform, (0, auth_middleware_1.authorize)("SUPER_ADMIN"), ai_chat_controller_1.chat);
exports.default = router;
//# sourceMappingURL=ai-chat.routes.js.map