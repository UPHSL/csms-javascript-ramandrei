
import { Router } from "express";

import {
  listServiceRequests,
  showSubmissionForm,
  submitServiceRequest,
  showServiceRequest,
  startProcessing,
  completeServiceRequest,
  cancelServiceRequest
} from "../controllers/serviceRequestController.js";

const router = Router();

// Listing, searching, and filtering
router.get("/", listServiceRequests);

// Submission
router.get("/new", showSubmissionForm);
router.post("/", submitServiceRequest);

// Viewing details
router.get("/:id", showServiceRequest);

// Controlled workflow actions
router.post("/:id/start-processing", startProcessing);
router.post("/:id/complete", completeServiceRequest);
router.post("/:id/cancel", cancelServiceRequest);

export default router;
