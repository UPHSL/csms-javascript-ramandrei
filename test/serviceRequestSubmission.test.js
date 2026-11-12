import test from "node:test";
import assert from "node:assert/strict";

import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";

import { createDatabase } from "../src/database/database.js";
import { Resident } from "../src/models/Resident.js";
import { ServiceRequest } from "../src/models/ServiceRequest.js";

import { ResidentRepository } from "../src/repositories/ResidentRepository.js";
import {
  ServiceRequestRepository
} from "../src/repositories/ServiceRequestRepository.js";

import {
  ServiceRequestValidator
} from "../src/services/ServiceRequestValidator.js";

import ServiceRequestSubmissionService
  from "../src/services/ServiceRequestSubmissionService.js";


function createTemporaryDatabasePath() {
  const fileName =
    `csms-t09-${crypto.randomUUID()}.sqlite`;

  return path.join(
    os.tmpdir(),
    fileName
  );
}


function createSubmissionSetup() {
  const databasePath =
    createTemporaryDatabasePath();

  const database =
    createDatabase(databasePath);

  const residentRepository =
    new ResidentRepository(database);

  const serviceRequestRepository =
    new ServiceRequestRepository(database);

  const validator =
    new ServiceRequestValidator();

  const submissionService =
    new ServiceRequestSubmissionService(
      validator,
      residentRepository,
      serviceRequestRepository
    );

  return {
    databasePath,
    database,
    residentRepository,
    serviceRequestRepository,
    submissionService
  };
}


function makeResident({
  firstName = "Juan",
  lastName = "Dela Cruz",
  address = "Barangay Santo Tomas",
  contactNumber = "09171234567",
  email = "juan@example.com",
  status = "Active"
} = {}) {
  return new Resident({
    firstName,
    lastName,
    address,
    contactNumber,
    email,
    status
  });
}


function makeServiceRequest({
  id = null,
  residentId,
  serviceType = "Barangay Clearance",
  description = "Request for employment requirement",
  dateRequested = "2026-09-15",
  status = "Pending"
} = {}) {
  return new ServiceRequest({
    id,
    residentId,
    serviceType,
    description,
    dateRequested,
    status
  });
}


function countServiceRequests(database) {
  const statement =
    database.prepare(
      "SELECT COUNT(*) AS count FROM service_requests"
    );

  const row =
    statement.get();

  return Number(row.count);
}


function cleanup(databasePath, database) {
  database.close();

  if (fs.existsSync(databasePath)) {
    fs.unlinkSync(databasePath);
  }
}


test(
  "valid Service Request submission succeeds",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService
    } = createSubmissionSetup();

    try {
      const resident =
        residentRepository.save(
          makeResident()
        );

      const request =
        makeServiceRequest({
          residentId: resident.id
        });

      const result =
        submissionService.submitServiceRequest(
          request
        );

      assert.equal(
        result.success,
        true
      );

      assert.ok(
        result.serviceRequest
      );

      assert.deepEqual(
        result.errors,
        []
      );

      assert.equal(
        result.residentNotFound,
        false
      );

      assert.equal(
        result.residentInactive,
        false
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


test(
  "submitted Service Request receives a generated ID",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService
    } = createSubmissionSetup();

    try {
      const resident =
        residentRepository.save(
          makeResident()
        );

      const request =
        makeServiceRequest({
          residentId: resident.id
        });

      assert.equal(
        request.id,
        null
      );

      const result =
        submissionService.submitServiceRequest(
          request
        );

      assert.equal(
        result.success,
        true
      );

      assert.notEqual(
        result.serviceRequest.id,
        null
      );

      assert.notEqual(
        result.serviceRequest.id,
        undefined
      );

      assert.equal(
        Number.isInteger(
          result.serviceRequest.id
        ),
        true
      );

      assert.ok(
        result.serviceRequest.id > 0
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


test(
  "submitted Service Request is persisted and retrievable",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      serviceRequestRepository,
      submissionService
    } = createSubmissionSetup();

    try {
      const resident =
        residentRepository.save(
          makeResident()
        );

      const request =
        makeServiceRequest({
          residentId: resident.id
        });

      const result =
        submissionService.submitServiceRequest(
          request
        );

      const storedRequest =
        serviceRequestRepository.findById(
          result.serviceRequest.id
        );

      assert.ok(
        storedRequest
      );

      assert.equal(
        storedRequest.id,
        result.serviceRequest.id
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


test(
  "submitted Service Request information is preserved",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      serviceRequestRepository,
      submissionService
    } = createSubmissionSetup();

    try {
      const resident =
        residentRepository.save(
          makeResident()
        );

      const request =
        makeServiceRequest({
          residentId: resident.id,
          serviceType: "Certificate Request",
          description:
            "Request for employment verification",
          dateRequested: "2026-09-15"
        });

      const result =
        submissionService.submitServiceRequest(
          request
        );

      const storedRequest =
        serviceRequestRepository.findById(
          result.serviceRequest.id
        );

      assert.equal(
        storedRequest.residentId,
        resident.id
      );

      assert.equal(
        storedRequest.serviceType,
        "Certificate Request"
      );

      assert.equal(
        storedRequest.description,
        "Request for employment verification"
      );

      assert.equal(
        storedRequest.dateRequested,
        "2026-09-15"
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


test(
  "submitted Service Request status is Pending",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      serviceRequestRepository,
      submissionService
    } = createSubmissionSetup();

    try {
      const resident =
        residentRepository.save(
          makeResident()
        );

      const request =
        new ServiceRequest({
          residentId: resident.id,
          serviceType: "Permit Request",
          description: "Request for permit",
          dateRequested: "2026-09-15"
        });

      const result =
        submissionService.submitServiceRequest(
          request
        );

      const storedRequest =
        serviceRequestRepository.findById(
          result.serviceRequest.id
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


test(
  "blank Service Request service type fails validation",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService
    } = createSubmissionSetup();

    try {
      const resident =
        residentRepository.save(
          makeResident()
        );

      const request =
        makeServiceRequest({
          residentId: resident.id,
          serviceType: "   "
        });

      const result =
        submissionService.submitServiceRequest(
          request
        );

      assert.equal(
        result.success,
        false
      );

      assert.equal(
        result.serviceRequest,
        null
      );

      assert.ok(
        result.errors.includes(
          "serviceType"
        )
      );

      assert.equal(
        result.residentNotFound,
        false
      );

      assert.equal(
        result.residentInactive,
        false
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


test(
  "blank Service Request description fails validation",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService
    } = createSubmissionSetup();

    try {
      const resident =
        residentRepository.save(
          makeResident()
        );

      const request =
        makeServiceRequest({
          residentId: resident.id,
          description: ""
        });

      const result =
        submissionService.submitServiceRequest(
          request
        );

      assert.equal(
        result.success,
        false
      );

      assert.equal(
        result.serviceRequest,
        null
      );

      assert.ok(
        result.errors.includes(
          "description"
        )
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


test(
  "invalid Service Request does not reach persistence",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService
    } = createSubmissionSetup();

    try {
      const resident =
        residentRepository.save(
          makeResident()
        );

      const request =
        makeServiceRequest({
          residentId: resident.id,
          serviceType: ""
        });

      const countBefore =
        countServiceRequests(database);

      const result =
        submissionService.submitServiceRequest(
          request
        );

      const countAfter =
        countServiceRequests(database);

      assert.equal(
        result.success,
        false
      );

      assert.equal(
        countAfter,
        countBefore
      );

      assert.equal(
        request.id,
        null
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


test(
  "nonexistent Resident prevents submission",
  () => {
    const {
      databasePath,
      database,
      submissionService
    } = createSubmissionSetup();

    try {
      const request =
        makeServiceRequest({
          residentId: 999999
        });

      const result =
        submissionService.submitServiceRequest(
          request
        );

      assert.equal(
        result.success,
        false
      );

      assert.equal(
        result.serviceRequest,
        null
      );

      assert.equal(
        result.residentNotFound,
        true
      );

      assert.equal(
        result.residentInactive,
        false
      );

      assert.equal(
        request.id,
        null
      );

      assert.equal(
        countServiceRequests(database),
        0
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


test(
  "Inactive Resident cannot submit a new Service Request",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService
    } = createSubmissionSetup();

    try {
      const resident =
        residentRepository.save(
          makeResident({
            status: "Inactive"
          })
        );

      const result =
        submissionService.submitServiceRequest(
          makeServiceRequest({
            residentId: resident.id
          })
        );

      const storedResident =
        residentRepository.findById(
          resident.id
        );

      assert.equal(
        result.success,
        false
      );

      assert.equal(
        result.serviceRequest,
        null
      );

      assert.equal(
        result.residentNotFound,
        false
      );

      assert.equal(
        result.residentInactive,
        true
      );

      assert.equal(
        storedResident.status,
        "Inactive"
      );

      assert.equal(
        countServiceRequests(database),
        0
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


test(
  "non-Pending initial status is rejected",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService
    } = createSubmissionSetup();

    try {
      const resident =
        residentRepository.save(
          makeResident()
        );

      const request =
        makeServiceRequest({
          residentId: resident.id,
          status: "Completed"
        });

      const result =
        submissionService.submitServiceRequest(
          request
        );

      assert.equal(
        result.success,
        false
      );

      assert.equal(
        result.serviceRequest,
        null
      );

      assert.ok(
        result.errors.includes(
          "status"
        )
      );

      assert.equal(
        countServiceRequests(database),
        0
      );

      assert.equal(
        request.id,
        null
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


test(
  "Service Request persists across separate repository access",
  () => {
    const databasePath =
      createTemporaryDatabasePath();

    const database1 =
      createDatabase(databasePath);

    const residentRepository1 =
      new ResidentRepository(database1);

    const serviceRequestRepository1 =
      new ServiceRequestRepository(database1);

    const validator =
      new ServiceRequestValidator();

    const submissionService =
      new ServiceRequestSubmissionService(
        validator,
        residentRepository1,
        serviceRequestRepository1
      );

    try {
      const resident =
        residentRepository1.save(
          makeResident()
        );

      const request =
        makeServiceRequest({
          residentId: resident.id
        });

      const result =
        submissionService.submitServiceRequest(
          request
        );

      assert.equal(
        result.success,
        true
      );

      const savedId =
        result.serviceRequest.id;

      database1.close();

      const database2 =
        createDatabase(databasePath);

      try {
        const serviceRequestRepository2 =
          new ServiceRequestRepository(
            database2
          );

        const storedRequest =
          serviceRequestRepository2.findById(
            savedId
          );

        assert.ok(
          storedRequest
        );

        assert.equal(
          storedRequest.id,
          savedId
        );

        assert.equal(
          storedRequest.residentId,
          resident.id
        );

        assert.equal(
          storedRequest.status,
          "Pending"
        );
      } finally {
        database2.close();
      }
    } finally {
      if (fs.existsSync(databasePath)) {
        fs.unlinkSync(databasePath);
      }
    }
  }
);


test(
  "Service Request submission does not modify the Resident",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService
    } = createSubmissionSetup();

    try {
      const resident =
        residentRepository.save(
          makeResident({
            firstName: "Juan",
            lastName: "Dela Cruz",
            address: "Barangay Santo Tomas",
            contactNumber: "09171234567",
            email: "juan@example.com",
            status: "Active"
          })
        );

      const residentBefore =
        residentRepository.findById(
          resident.id
        );

      const result =
        submissionService.submitServiceRequest(
          makeServiceRequest({
            residentId: resident.id
          })
        );

      assert.equal(
        result.success,
        true
      );

      const residentAfter =
        residentRepository.findById(
          resident.id
        );

      assert.equal(
        residentAfter.id,
        residentBefore.id
      );

      assert.equal(
        residentAfter.firstName,
        residentBefore.firstName
      );

      assert.equal(
        residentAfter.lastName,
        residentBefore.lastName
      );

      assert.equal(
        residentAfter.address,
        residentBefore.address
      );

      assert.equal(
        residentAfter.contactNumber,
        residentBefore.contactNumber
      );

      assert.equal(
        residentAfter.email,
        residentBefore.email
      );

      assert.equal(
        residentAfter.status,
        residentBefore.status
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);


test(
  "invalid date prevents Service Request submission",
  () => {
    const {
      databasePath,
      database,
      residentRepository,
      submissionService
    } = createSubmissionSetup();

    try {
      const resident =
        residentRepository.save(
          makeResident()
        );

      const request =
        makeServiceRequest({
          residentId: resident.id,
          dateRequested: "2026-02-30"
        });

      const result =
        submissionService.submitServiceRequest(
          request
        );

      assert.equal(
        result.success,
        false
      );

      assert.equal(
        result.serviceRequest,
        null
      );

      assert.ok(
        result.errors.includes(
          "dateRequested"
        )
      );

      assert.equal(
        countServiceRequests(database),
        0
      );
    } finally {
      cleanup(databasePath, database);
    }
  }
);