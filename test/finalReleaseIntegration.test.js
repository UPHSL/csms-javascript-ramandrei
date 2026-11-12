import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createDatabase } from "../src/database/database.js";

import { Resident } from "../src/models/Resident.js";
import { ServiceRequest } from "../src/models/ServiceRequest.js";

import {
  ResidentRepository
} from "../src/repositories/ResidentRepository.js";

import {
  ServiceRequestRepository
} from "../src/repositories/ServiceRequestRepository.js";

import {
  ResidentValidator
} from "../src/services/ResidentValidator.js";

import {
  ServiceRequestValidator
} from "../src/services/ServiceRequestValidator.js";

import ResidentRegistrationService
  from "../src/services/ResidentRegistrationService.js";

import ServiceRequestSubmissionService
  from "../src/services/ServiceRequestSubmissionService.js";

import ServiceRequestStatusService
  from "../src/services/ServiceRequestStatusService.js";


test(
  "T16 integration: registered resident can submit and complete a service request that remains persisted after reopening the database",
  () => {
    const temporaryDirectory =
      fs.mkdtempSync(
        path.join(os.tmpdir(), "csms-t16-")
      );

    const databasePath =
      path.join(
        temporaryDirectory,
        "csms.sqlite"
      );

    let database = null;

    try {
      // 1. Initialize a real SQLite database.
      database = createDatabase(databasePath);

      const residentRepository =
        new ResidentRepository(database);

      const serviceRequestRepository =
        new ServiceRequestRepository(database);

      const residentRegistrationService =
        new ResidentRegistrationService(
          new ResidentValidator(),
          residentRepository
        );

      const serviceRequestSubmissionService =
        new ServiceRequestSubmissionService(
          new ServiceRequestValidator(),
          residentRepository,
          serviceRequestRepository
        );

      const serviceRequestStatusService =
        new ServiceRequestStatusService(
          serviceRequestRepository
        );

      // 2. Establish a known starting state.
      assert.equal(
        residentRepository.countAll(),
        0
      );

      assert.equal(
        serviceRequestRepository.countAll(),
        0
      );

      // 3. Register a resident through the registration service.
      const resident =
        new Resident({
          firstName: "Maria",
          lastName: "Santos",
          address: "Barangay Santo Tomas",
          contactNumber: "09181234567",
          email: "maria.santos@example.com"
        });

      const registrationResult =
        residentRegistrationService.registerResident(
          resident
        );

      assert.equal(
        registrationResult.success,
        true
      );

      assert.ok(
        registrationResult.resident.id > 0
      );

      const residentId =
        registrationResult.resident.id;

      assert.equal(
        registrationResult.resident.status,
        "Active"
      );

      assert.equal(
        residentRepository.countAll(),
        1
      );

      // 4. Submit a service request using the registered resident.
      const serviceRequest =
        new ServiceRequest({
          residentId,
          serviceType: "Barangay Clearance",
          description:
            "Request for employment requirement",
          dateRequested: "2026-09-15"
        });

      const submissionResult =
        serviceRequestSubmissionService.submitServiceRequest(
          serviceRequest
        );

      assert.equal(
        submissionResult.success,
        true
      );

      assert.ok(
        submissionResult.serviceRequest.id > 0
      );

      const serviceRequestId =
        submissionResult.serviceRequest.id;

      assert.equal(
        submissionResult.serviceRequest.residentId,
        residentId
      );

      assert.equal(
        submissionResult.serviceRequest.status,
        "Pending"
      );

      assert.equal(
        serviceRequestRepository.countAll(),
        1
      );

      // 5. Complete the valid service request workflow.
      const inProgressResult =
        serviceRequestStatusService.updateStatus(
          serviceRequestId,
          "In Progress"
        );

      assert.equal(
        inProgressResult.success,
        true
      );

      const completedResult =
        serviceRequestStatusService.updateStatus(
          serviceRequestId,
          "Completed"
        );

      assert.equal(
        completedResult.success,
        true
      );

      // 6. Close the original database connection.
      database.close();
      database = null;

      // 7. Reopen the same SQLite database using fresh repositories.
      database = createDatabase(databasePath);

      const reopenedResidentRepository =
        new ResidentRepository(database);

      const reopenedServiceRequestRepository =
        new ServiceRequestRepository(database);

      // 8. Verify that both records remain persisted.
      const persistedResident =
        reopenedResidentRepository.findById(
          residentId
        );

      const persistedServiceRequest =
        reopenedServiceRequestRepository.findById(
          serviceRequestId
        );

      assert.ok(persistedResident);
      assert.ok(persistedServiceRequest);

      assert.equal(
        persistedResident.id,
        residentId
      );

      assert.equal(
        persistedResident.firstName,
        "Maria"
      );

      assert.equal(
        persistedResident.lastName,
        "Santos"
      );

      assert.equal(
        persistedResident.status,
        "Active"
      );

      assert.equal(
        persistedServiceRequest.id,
        serviceRequestId
      );

      assert.equal(
        persistedServiceRequest.residentId,
        residentId
      );

      assert.equal(
        persistedServiceRequest.serviceType,
        "Barangay Clearance"
      );

      assert.equal(
        persistedServiceRequest.description,
        "Request for employment requirement"
      );

      assert.equal(
        persistedServiceRequest.dateRequested,
        "2026-09-15"
      );

      assert.equal(
        persistedServiceRequest.status,
        "Completed"
      );

      assert.equal(
        reopenedResidentRepository.countAll(),
        1
      );

      assert.equal(
        reopenedServiceRequestRepository.countAll(),
        1
      );
    } finally {
      if (database !== null) {
        database.close();
      }

      fs.rmSync(
        temporaryDirectory,
        {
          recursive: true,
          force: true
        }
      );
    }
  }
);
