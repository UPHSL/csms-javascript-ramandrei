
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

import { createDatabase } from "./database/database.js";
import { ResidentRepository } from "./repositories/ResidentRepository.js";

import ResidentDeactivationService from "./services/ResidentDeactivationService.js";
import ResidentQueryService from "./services/ResidentQueryService.js";
import ResidentRegistrationService from "./services/ResidentRegistrationService.js";
import ResidentUpdateService from "./services/ResidentUpdateService.js";
import { ResidentValidator } from "./services/ResidentValidator.js";

import { notFound } from "./middleware/notFound.js";
import residentRoutes from "./routes/residentRoutes.js";
import mainRoutes from "./routes/index.js";
import serviceRequestRoutes from "./routes/serviceRequestRoutes.js";

import { ServiceRequestRepository } from "./repositories/ServiceRequestRepository.js";

import ServiceRequestQueryService from "./services/ServiceRequestQueryService.js";
import ServiceRequestStatusService from "./services/ServiceRequestStatusService.js";
import ServiceRequestSubmissionService from "./services/ServiceRequestSubmissionService.js";
import { ServiceRequestValidator } from "./services/ServiceRequestValidator.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const defaultDatabasePath = path.join(
  currentDirectory,
  "..",
  "data",
  "csms.sqlite"
);

/**
 * Create and configure the CSMS Express application.
 *
 * @param {{ databasePath?: string }} options
 * @returns {import("express").Express} Configured Express application.
 */
export function createApp({
  databasePath = defaultDatabasePath
} = {}) {
  const app = express();

  app.disable("x-powered-by");

  app.set("views", path.join(currentDirectory, "views"));
  app.set("view engine", "ejs");

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(currentDirectory, "..", "public")));

  // Initialize the database and existing Resident dependencies.
  const database = createDatabase(databasePath);
  const residentRepository = new ResidentRepository(database);
  const residentValidator = new ResidentValidator();

  const serviceRequestRepository =
  new ServiceRequestRepository(database);

const serviceRequestValidator =
  new ServiceRequestValidator();

  // Share existing business services with the routes that need them.
    app.locals.residentRepository = residentRepository;

  app.locals.residentServices = {
    query: new ResidentQueryService(residentRepository),
    registration: new ResidentRegistrationService(
      residentValidator,
      residentRepository
    ),
    update: new ResidentUpdateService(
      residentValidator,
      residentRepository
    ),
    deactivation: new ResidentDeactivationService(residentRepository)
  };

app.locals.serviceRequestRepository =
  serviceRequestRepository;

app.locals.serviceRequestServices = {
  query: new ServiceRequestQueryService(
    serviceRequestRepository
  ),

  submission: new ServiceRequestSubmissionService(
    serviceRequestValidator,
    residentRepository,
    serviceRequestRepository
  ),

  status: new ServiceRequestStatusService(
    serviceRequestRepository
  )
};

app.use(mainRoutes);
app.use("/residents", residentRoutes);
app.use("/service-requests", serviceRequestRoutes);

app.use(notFound);

  return app;
}
