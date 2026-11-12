import { Router } from "express";

import { showHealth } from "../controllers/healthController.js";
import { showHome } from "../controllers/homeController.js";
import { showDashboard } from "../controllers/dashboardController.js";

const router = Router();

router.get("/", showHome);
router.get("/health", showHealth);
router.get("/dashboard", showDashboard);

export default router;