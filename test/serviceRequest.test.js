import test from "node:test";
import assert from "node:assert/strict";

import { ServiceRequest } from "../src/models/ServiceRequest.js";


test(
  "Service Request can be created",
  () => {
    const request =
      new ServiceRequest({
        residentId: 25,
        serviceType: "Barangay Clearance",
        description: "Request for employment requirement",
        dateRequested: "2026-09-26"
      });

    assert.ok(request);
  }
);


test(
  "Service Request information is accessible",
  () => {
    const request =
      new ServiceRequest({
        residentId: 25,
        serviceType: "Barangay Clearance",
        description: "Request for employment requirement",
        dateRequested: "2026-09-26"
      });

    assert.equal(
      request.residentId,
      25
    );

    assert.equal(
      request.serviceType,
      "Barangay Clearance"
    );

    assert.equal(
      request.description,
      "Request for employment requirement"
    );

    assert.equal(
      request.dateRequested,
      "2026-09-26"
    );
  }
);


test(
  "Resident ID is preserved",
  () => {
    const request =
      new ServiceRequest({
        residentId: 25,
        serviceType: "Certificate Request",
        description: "Request for certificate",
        dateRequested: "2026-09-26"
      });

    assert.equal(
      request.residentId,
      25
    );
  }
);


test(
  "New Service Request has an unassigned ID",
  () => {
    const request =
      new ServiceRequest({
        residentId: 25,
        serviceType: "Permit Request",
        description: "Request for permit",
        dateRequested: "2026-09-26"
      });

    assert.equal(
      request.id,
      null
    );
  }
);


test(
  "New Service Request defaults to Pending",
  () => {
    const request =
      new ServiceRequest({
        residentId: 25,
        serviceType: "Community Assistance",
        description: "Request for assistance",
        dateRequested: "2026-09-26"
      });

    assert.equal(
      request.status,
      "Pending"
    );
  }
);


test(
  "Service Request information is independent between objects",
  () => {
    const firstRequest =
      new ServiceRequest({
        residentId: 25,
        serviceType: "Barangay Clearance",
        description: "Employment requirement",
        dateRequested: "2026-09-26"
      });

    const secondRequest =
      new ServiceRequest({
        residentId: 30,
        serviceType: "Permit Request",
        description: "Business requirement",
        dateRequested: "2026-09-27"
      });

    assert.notEqual(
      firstRequest.residentId,
      secondRequest.residentId
    );

    assert.notEqual(
      firstRequest.serviceType,
      secondRequest.serviceType
    );

    assert.notEqual(
      firstRequest.description,
      secondRequest.description
    );

    assert.notEqual(
      firstRequest.dateRequested,
      secondRequest.dateRequested
    );
  }
);