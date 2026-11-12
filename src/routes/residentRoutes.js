import { Router } from "express";

import {
  listResidents,
  showRegistrationForm,
  registerResident,
  showEditForm,
  updateResident,
  deactivateResident
} from "../controllers/residentController.js";

const router = Router();

router.get("/", listResidents);
router.get("/new", showRegistrationForm);
router.post("/", registerResident);

router.get("/:id/edit", showEditForm);
router.post("/:id", updateResident);
router.post("/:id/deactivate", deactivateResident);

export default router;