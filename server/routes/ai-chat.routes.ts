import { Router } from "express";
import { chat } from "../controllers/ai-chat.controller";
import { authenticatePlatform, authorize } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authenticatePlatform, authorize("SUPER_ADMIN"), chat);

export default router;
