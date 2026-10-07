import { Router } from "express";
import { save, current } from "../controllers/headcount.controller";

const router = Router();

router.post("/save", save);
router.get("/current", current);

export default router;