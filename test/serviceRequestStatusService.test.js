import test from "node:test";
import assert from "node:assert/strict";

import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";

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
  ServiceRequestValidator
} from "../src/services/ServiceRequestValidator.js";

import ServiceRequestSubmissionService
  from "../src/services/ServiceRequestSubmissionService.js";

import ServiceRequestStatusService
  from "../src/services/ServiceRequestStatusService.js";


function createTemporaryDatabasePath() {
  const fileName =
    `csms-t10-${crypto.randomUUID()}.sqlite`;

  return path.join(
    os.tmpdir(),
    fileName
  );
}


function createStatusSetup() {
  const databasePath =
    createTemporaryDatabasePath();

  const database =
    createDatabase(databasePath);

  const residentRepository =
    new ResidentRepository(database);

  const serviceRequestRepository =
    new ServiceRequestRepository(database);

  const serviceRequestValidator =
    new ServiceRequestValidator();

  const submissionService =
    new ServiceRequestSubmissionService(
      serviceRequestValidator,
      residentRepository,
      serviceRequestRepository
    );

  const statusService =
    new ServiceRequestStatusService(
      serviceRequestRepository
    );

  return {
    databasePath,
    database,
    residentRepository,
    serviceRequestRepository,
    submissionService,
    statusService
  };
}


function makeResident() {
  return new Resident({
    firstName: "Juan",
    lastName: "Dela Cruz",
    address: "Barangay Santo Tomas",
    contactNumber: "09171234567",
    email: "juan@example.com",
    status: "Active"
  });
}


function makeServiceRequest(residentId) {
  return new ServiceRequest({
    residentId,
    serviceType: "Barangay Clearance",
    description:
      "Request for employment requirement",
    dateRequested: "2026-09-15"
  });
}


function submitPendingRequest(
  residentRepository,
  submissionService
) {
  const resident =
    residentRepository.save(
      makeResident()
    );

  const request =
    makeServiceRequest(
      resident.id
    );

  const result =
    submissionService.submitServiceRequest(
      request
    );

  assert.equal(
    result.success,
    true
  );

  return result.serviceRequest;
}


function cleanup(databasePath, database) {
  database.close();

  if (fs.existsSync(databasePath)) {
    fs.unlinkSync(databasePath);
  }
}


// Test 1
test(
  "Pending can move to In Progress",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService,
      serviceRequestRepository,
      statusService
    } = createStatusSetup();

    try {
      const serviceRequest =
        submitPendingRequest(
          residentRepository,
          submissionService
        );

      const result =
        statusService.updateStatus(
          serviceRequest.id,
          "In Progress"
        );

      const storedRequest =
        serviceRequestRepository.findById(
          serviceRequest.id
        );

      assert.equal(
        result.success,
        true
      );

      assert.equal(
        storedRequest.status,
        "In Progress"
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


// Test 2
test(
  "Pending can move to Cancelled",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService,
      serviceRequestRepository,
      statusService
    } = createStatusSetup();

    try {
      const serviceRequest =
        submitPendingRequest(
          residentRepository,
          submissionService
        );

      const result =
        statusService.updateStatus(
          serviceRequest.id,
          "Cancelled"
        );

      const storedRequest =
        serviceRequestRepository.findById(
          serviceRequest.id
        );

      assert.equal(
        result.success,
        true
      );

      assert.equal(
        storedRequest.status,
        "Cancelled"
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


// Test 3
test(
  "In Progress can move to Completed",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService,
      serviceRequestRepository,
      statusService
    } = createStatusSetup();

    try {
      const serviceRequest =
        submitPendingRequest(
          residentRepository,
          submissionService
        );

      const firstResult =
        statusService.updateStatus(
          serviceRequest.id,
          "In Progress"
        );

      assert.equal(
        firstResult.success,
        true
      );

      const secondResult =
        statusService.updateStatus(
          serviceRequest.id,
          "Completed"
        );

      const storedRequest =
        serviceRequestRepository.findById(
          serviceRequest.id
        );

      assert.equal(
        secondResult.success,
        true
      );

      assert.equal(
        storedRequest.status,
        "Completed"
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


// Test 4
test(
  "In Progress can move to Cancelled",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService,
      serviceRequestRepository,
      statusService
    } = createStatusSetup();

    try {
      const serviceRequest =
        submitPendingRequest(
          residentRepository,
          submissionService
        );

      const firstResult =
        statusService.updateStatus(
          serviceRequest.id,
          "In Progress"
        );

      assert.equal(
        firstResult.success,
        true
      );

      const secondResult =
        statusService.updateStatus(
          serviceRequest.id,
          "Cancelled"
        );

      const storedRequest =
        serviceRequestRepository.findById(
          serviceRequest.id
        );

      assert.equal(
        secondResult.success,
        true
      );

      assert.equal(
        storedRequest.status,
        "Cancelled"
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


// Test 5
test(
  "Pending cannot move directly to Completed",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService,
      serviceRequestRepository,
      statusService
    } = createStatusSetup();

    try {
      const serviceRequest =
        submitPendingRequest(
          residentRepository,
          submissionService
        );

      const result =
        statusService.updateStatus(
          serviceRequest.id,
          "Completed"
        );

      const storedRequest =
        serviceRequestRepository.findById(
          serviceRequest.id
        );

      assert.equal(
        result.success,
        false
      );

      assert.equal(
        result.invalidTransition,
        true
      );

      assert.equal(
        storedRequest.status,
        "Pending"
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


// Test 6
test(
  "In Progress cannot return to Pending",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService,
      serviceRequestRepository,
      statusService
    } = createStatusSetup();

    try {
      const serviceRequest =
        submitPendingRequest(
          residentRepository,
          submissionService
        );

      const firstResult =
        statusService.updateStatus(
          serviceRequest.id,
          "In Progress"
        );

      assert.equal(
        firstResult.success,
        true
      );

      const secondResult =
        statusService.updateStatus(
          serviceRequest.id,
          "Pending"
        );

      const storedRequest =
        serviceRequestRepository.findById(
          serviceRequest.id
        );

      assert.equal(
        secondResult.success,
        false
      );

      assert.equal(
        secondResult.invalidTransition,
        true
      );

      assert.equal(
        storedRequest.status,
        "In Progress"
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


// Test 7
test(
  "Completed is terminal",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService,
      serviceRequestRepository,
      statusService
    } = createStatusSetup();

    try {
      const serviceRequest =
        submitPendingRequest(
          residentRepository,
          submissionService
        );

      statusService.updateStatus(
        serviceRequest.id,
        "In Progress"
      );

      const completedResult =
        statusService.updateStatus(
          serviceRequest.id,
          "Completed"
        );

      assert.equal(
        completedResult.success,
        true
      );

      const result =
        statusService.updateStatus(
          serviceRequest.id,
          "Cancelled"
        );

      const storedRequest =
        serviceRequestRepository.findById(
          serviceRequest.id
        );

      assert.equal(
        result.success,
        false
      );

      assert.equal(
        result.invalidTransition,
        true
      );

      assert.equal(
        storedRequest.status,
        "Completed"
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


// Test 8
test(
  "Cancelled is terminal",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService,
      serviceRequestRepository,
      statusService
    } = createStatusSetup();

    try {
      const serviceRequest =
        submitPendingRequest(
          residentRepository,
          submissionService
        );

      const cancelledResult =
        statusService.updateStatus(
          serviceRequest.id,
          "Cancelled"
        );

      assert.equal(
        cancelledResult.success,
        true
      );

      const result =
        statusService.updateStatus(
          serviceRequest.id,
          "Pending"
        );

      const storedRequest =
        serviceRequestRepository.findById(
          serviceRequest.id
        );

      assert.equal(
        result.success,
        false
      );

      assert.equal(
        result.invalidTransition,
        true
      );

      assert.equal(
        storedRequest.status,
        "Cancelled"
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


// Test 9
test(
  "Unsupported status is rejected",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService,
      serviceRequestRepository,
      statusService
    } = createStatusSetup();

    try {
      const serviceRequest =
        submitPendingRequest(
          residentRepository,
          submissionService
        );

      const result =
        statusService.updateStatus(
          serviceRequest.id,
          "Approved"
        );

      const storedRequest =
        serviceRequestRepository.findById(
          serviceRequest.id
        );

      assert.equal(
        result.success,
        false
      );

      assert.equal(
        result.unsupportedStatus,
        true
      );

      assert.equal(
        storedRequest.status,
        "Pending"
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


// Test 10
test(
  "Nonexistent Service Request is handled safely",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService,
      serviceRequestRepository,
      statusService
    } = createStatusSetup();

    try {
      const existingRequest =
        submitPendingRequest(
          residentRepository,
          submissionService
        );

      const result =
        statusService.updateStatus(
          999999,
          "In Progress"
        );

      const existingAfter =
        serviceRequestRepository.findById(
          existingRequest.id
        );

      assert.equal(
        result.success,
        false
      );

      assert.equal(
        result.notFound,
        true
      );

      assert.equal(
        result.serviceRequest,
        null
      );

      assert.ok(
        existingAfter
      );

      assert.equal(
        existingAfter.status,
        "Pending"
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


// Test 11
test(
  "Successful transition preserves Service Request information",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService,
      serviceRequestRepository,
      statusService
    } = createStatusSetup();

    try {
      const serviceRequest =
        submitPendingRequest(
          residentRepository,
          submissionService
        );

      const original =
        serviceRequestRepository.findById(
          serviceRequest.id
        );

      const result =
        statusService.updateStatus(
          serviceRequest.id,
          "In Progress"
        );

      const updated =
        serviceRequestRepository.findById(
          serviceRequest.id
        );

      assert.equal(
        result.success,
        true
      );

      assert.equal(
        updated.id,
        original.id
      );

      assert.equal(
        updated.residentId,
        original.residentId
      );

      assert.equal(
        updated.serviceType,
        original.serviceType
      );

      assert.equal(
        updated.description,
        original.description
      );

      assert.equal(
        updated.dateRequested,
        original.dateRequested
      );

      assert.equal(
        updated.status,
        "In Progress"
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


// Test 12
test(
  "Invalid transition does not modify persistence",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService,
      serviceRequestRepository,
      statusService
    } = createStatusSetup();

    try {
      const serviceRequest =
        submitPendingRequest(
          residentRepository,
          submissionService
        );

      const original =
        serviceRequestRepository.findById(
          serviceRequest.id
        );

      const result =
        statusService.updateStatus(
          serviceRequest.id,
          "Completed"
        );

      const storedRequest =
        serviceRequestRepository.findById(
          serviceRequest.id
        );

      assert.equal(
        result.success,
        false
      );

      assert.equal(
        storedRequest.id,
        original.id
      );

      assert.equal(
        storedRequest.residentId,
        original.residentId
      );

      assert.equal(
        storedRequest.serviceType,
        original.serviceType
      );

      assert.equal(
        storedRequest.description,
        original.description
      );

      assert.equal(
        storedRequest.dateRequested,
        original.dateRequested
      );

      assert.equal(
        storedRequest.status,
        "Pending"
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


// Test 13
test(
  "Same-status request is rejected",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService,
      serviceRequestRepository,
      statusService
    } = createStatusSetup();

    try {
      const serviceRequest =
        submitPendingRequest(
          residentRepository,
          submissionService
        );

      const result =
        statusService.updateStatus(
          serviceRequest.id,
          "Pending"
        );

      const storedRequest =
        serviceRequestRepository.findById(
          serviceRequest.id
        );

      assert.equal(
        result.success,
        false
      );

      assert.equal(
        result.invalidTransition,
        true
      );

      assert.equal(
        storedRequest.status,
        "Pending"
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


// Student-designed test
test(
  "Service Request can complete through the full valid workflow",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService,
      serviceRequestRepository,
      statusService
    } = createStatusSetup();

    try {
      const serviceRequest =
        submitPendingRequest(
          residentRepository,
          submissionService
        );

      const inProgressResult =
        statusService.updateStatus(
          serviceRequest.id,
          "In Progress"
        );

      assert.equal(
        inProgressResult.success,
        true
      );

      const completedResult =
        statusService.updateStatus(
          serviceRequest.id,
          "Completed"
        );

      assert.equal(
        completedResult.success,
        true
      );

      const storedRequest =
        serviceRequestRepository.findById(
          serviceRequest.id
        );

      assert.equal(
        storedRequest.status,
        "Completed"
      );

      assert.equal(
        storedRequest.id,
        serviceRequest.id
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);