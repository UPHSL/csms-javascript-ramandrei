
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import request from "supertest";

import { createApp } from "../src/app.js";
import { Resident } from "../src/models/Resident.js";
import { ServiceRequest } from "../src/models/ServiceRequest.js";

/* =========================================
   TEST HELPERS
========================================= */

async function withTestApp(run) {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "csms-t13-")
  );

  const databasePath = path.join(
    temporaryDirectory,
    "test.sqlite"
  );

  let app;

  try {
    app = createApp({ databasePath });
    await run(app);
  } finally {
    if (app?.locals.residentRepository) {
      app.locals.residentRepository.close();
    }

    fs.rmSync(temporaryDirectory, {
      recursive: true,
      force: true
    });
  }
}

function persistResident(app, overrides = {}) {
  const resident = new Resident({
    firstName: "Taylor",
    lastName: "Sample",
    address: "123 Test Street",
    contactNumber: "09171234567",
    email: "taylor.sample@example.com",
    status: "Active",
    ...overrides
  });

  const result =
    app.locals.residentServices.registration.registerResident(
      resident
    );

  assert.equal(result.success, true);

  return result.resident;
}

function persistServiceRequest(app, residentId, overrides = {}) {
  const serviceRequest = new ServiceRequest({
    id: null,
    residentId,
    serviceType: "Barangay Clearance",
    description: "Requesting barangay clearance.",
    dateRequested: "2026-09-01",
    status: "Pending",
    ...overrides
  });

  const result =
    app.locals.serviceRequestServices.submission
      .submitServiceRequest(serviceRequest);

  assert.equal(
    result.success,
    true,
    "Service Request should be persisted successfully."
  );

  return result.serviceRequest;
}

function transitionRequest(app, id, status) {
  const result =
    app.locals.serviceRequestServices.status
      .updateStatus(id, status);

  assert.equal(result.success, true);

  return result.serviceRequest;
}

function validForm(overrides = {}) {
  return {
    residentId: "1",
    serviceType: "Barangay Clearance",
    description: "Requesting barangay clearance.",
    dateRequested: "2026-09-01",
    ...overrides
  };
}

/* =========================================
   TEST 1
   Service Request Management Page Loads
========================================= */

test("T13 Test 1: Service Request Management page loads", async () => {
  await withTestApp(async (app) => {
    const response = await request(app)
      .get("/service-requests")
      .expect(200)
      .expect("Content-Type", /html/);

    assert.match(response.text, /Service Request Management/);
  });
});

/* =========================================
   TEST 2
   Persisted Service Requests Are Displayed
========================================= */

test("T13 Test 2: Persisted Service Requests are displayed", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    persistServiceRequest(app, resident.id, {
      serviceType: "Barangay Clearance"
    });

    persistServiceRequest(app, resident.id, {
      serviceType: "Streetlight Repair"
    });

    persistServiceRequest(app, resident.id, {
      serviceType: "Road Maintenance"
    });

    const response = await request(app)
      .get("/service-requests")
      .expect(200);

    assert.match(response.text, /Barangay Clearance/);
    assert.match(response.text, /Streetlight Repair/);
    assert.match(response.text, /Road Maintenance/);
  });
});

/* =========================================
   TEST 3
   Required Ordering Is Preserved
========================================= */

test("T13 Test 3: Listing preserves date DESC and ID DESC ordering", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    const first = persistServiceRequest(app, resident.id, {
      serviceType: "First Created",
      dateRequested: "2026-09-03"
    });

    const second = persistServiceRequest(app, resident.id, {
      serviceType: "Second Created",
      dateRequested: "2026-09-01"
    });

    const third = persistServiceRequest(app, resident.id, {
      serviceType: "Third Created",
      dateRequested: "2026-09-03"
    });

    const response = await request(app)
      .get("/service-requests")
      .expect(200);

    const firstPosition =
      response.text.indexOf(`<td>${first.id}</td>`);

    const secondPosition =
      response.text.indexOf(`<td>${second.id}</td>`);

    const thirdPosition =
      response.text.indexOf(`<td>${third.id}</td>`);

    assert.ok(thirdPosition < firstPosition);
    assert.ok(firstPosition < secondPosition);
  });
});

/* =========================================
   TEST 4
   Text Search Uses T11 Behavior
========================================= */

test("T13 Test 4: Search supports partial case-insensitive matching", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    persistServiceRequest(app, resident.id, {
      serviceType: "Barangay Clearance",
      description: "Employment documentation."
    });

    persistServiceRequest(app, resident.id, {
      serviceType: "Streetlight Repair",
      description: "Report a broken streetlight."
    });

    persistServiceRequest(app, resident.id, {
      serviceType: "Document Assistance",
      description: "Assistance with employment requirements."
    });

    const typeSearch = await request(app)
      .get("/service-requests")
      .query({ search: "CLEARANCE" })
      .expect(200);

    assert.match(typeSearch.text, /Barangay Clearance/);
    assert.doesNotMatch(typeSearch.text, /Streetlight Repair/);
    assert.doesNotMatch(typeSearch.text, /Document Assistance/);

    const descriptionSearch = await request(app)
      .get("/service-requests")
      .query({ search: "EMPLOYMENT" })
      .expect(200);

    assert.match(descriptionSearch.text, /Barangay Clearance/);
    assert.match(descriptionSearch.text, /Document Assistance/);
    assert.doesNotMatch(descriptionSearch.text, /Streetlight Repair/);
  });
});

/* =========================================
   TEST 5
   Status Filter Uses T11 Behavior
========================================= */

test("T13 Test 5: Status filter displays only matching requests", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    persistServiceRequest(app, resident.id, {
      serviceType: "Pending Request"
    });

    const inProgress = persistServiceRequest(app, resident.id, {
      serviceType: "Processing Request"
    });
    transitionRequest(app, inProgress.id, "In Progress");

    const completed = persistServiceRequest(app, resident.id, {
      serviceType: "Completed Request"
    });
    transitionRequest(app, completed.id, "In Progress");
    transitionRequest(app, completed.id, "Completed");

    const cancelled = persistServiceRequest(app, resident.id, {
      serviceType: "Cancelled Request"
    });
    transitionRequest(app, cancelled.id, "Cancelled");

    const response = await request(app)
      .get("/service-requests")
      .query({ status: "In Progress" })
      .expect(200);

    assert.match(response.text, /Processing Request/);
    assert.doesNotMatch(response.text, /Pending Request/);
    assert.doesNotMatch(response.text, /Completed Request/);
    assert.doesNotMatch(response.text, /Cancelled Request/);
  });
});

/* =========================================
   TEST 6
   Combined Search and Status Filter
========================================= */

test("T13 Test 6: Search and status filters use AND behavior", async () => {
  await withTestApp(async (app) => {
    const resident = await persistResident(app);

    // Matches both search term and status.
    await persistServiceRequest(app, resident.id, {
      serviceType: "Barangay Clearance",
      description: "Requesting an official clearance document.",
      status: "Pending"
    });

    // Matches search term only.
    const inProgressRequest = await persistServiceRequest(
      app,
      resident.id,
      {
        serviceType: "Barangay Clearance",
        description: "Requesting an official clearance document.",
        status: "Pending"
      }
    );

    await transitionRequest(
      app,
      inProgressRequest.id,
      "In Progress"
    );

    // Matches status only.
    await persistServiceRequest(app, resident.id, {
      serviceType: "Streetlight Repair",
      description: "Reporting a broken streetlight near the park.",
      status: "Pending"
    });

    // Matches neither.
    const completedRequest = await persistServiceRequest(
      app,
      resident.id,
      {
        serviceType: "Streetlight Repair",
        description: "Reporting a streetlight outage.",
        status: "Pending"
      }
    );

    await transitionRequest(
      app,
      completedRequest.id,
      "In Progress"
    );

    await transitionRequest(
      app,
      completedRequest.id,
      "Completed"
    );

    const response = await request(app)
      .get("/service-requests")
      .query({
        search: "clearance",
        status: "Pending"
      });

    assert.equal(response.status, 200);

    assert.match(response.text, /Barangay Clearance/);
    assert.doesNotMatch(response.text, /Streetlight Repair/);

    // Only the request matching BOTH conditions should appear.
    const clearanceMatches = response.text.match(
      /Barangay Clearance/g
    );

    assert.equal(clearanceMatches?.length, 1);
  });
});

/* =========================================
   TEST 7
   Submission Form Is Accessible
========================================= */

test("T13 Test 7: Submission form contains required fields", async () => {
  await withTestApp(async (app) => {
    const response = await request(app)
      .get("/service-requests/new")
      .expect(200)
      .expect("Content-Type", /html/);

    for (const field of [
      "residentId",
      "serviceType",
      "description",
      "dateRequested"
    ]) {
      assert.ok(response.text.includes(`name="${field}"`));
    }

    assert.doesNotMatch(response.text, /name="id"/);
    assert.doesNotMatch(response.text, /name="status"/);
    assert.match(response.text, /Pending status/);
  });
});

/* =========================================
   TEST 8
   Valid Submission Persists Pending Request
========================================= */

test("T13 Test 8: Valid submission persists a Pending request", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    const response = await request(app)
      .post("/service-requests")
      .type("form")
      .send(validForm({
        residentId: String(resident.id)
      }))
      .expect(303);

    assert.equal(
      response.headers.location,
      "/service-requests?notice=submitted"
    );

    const savedRequests =
      app.locals.serviceRequestServices.query
        .listServiceRequests();

    assert.equal(savedRequests.length, 1);

    const saved = savedRequests[0];

    assert.ok(Number.isInteger(saved.id));
    assert.ok(saved.id > 0);
    assert.equal(saved.residentId, resident.id);
    assert.equal(saved.serviceType, "Barangay Clearance");
    assert.equal(saved.description, "Requesting barangay clearance.");
    assert.equal(saved.dateRequested, "2026-09-01");
    assert.equal(saved.status, "Pending");
  });
});

/* =========================================
   TEST 9
   Invalid Submission Shows Feedback
========================================= */

test("T13 Test 9: Invalid submission displays validation feedback", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    const response = await request(app)
      .post("/service-requests")
      .type("form")
      .send(validForm({
        residentId: String(resident.id),
        serviceType: "   "
      }))
      .expect(400);

    assert.match(
      response.text,
      /Please correct the Service Request information/
    );

    assert.match(
      response.text,
      /Service type is required/
    );

    assert.equal(
      app.locals.serviceRequestServices.query
        .listServiceRequests().length,
      0
    );
  });
});

/* =========================================
   TEST 10
   Missing Resident Submission Is Rejected
========================================= */

test("T13 Test 10: Missing Resident submission is rejected", async () => {
  await withTestApp(async (app) => {
    const response = await request(app)
      .post("/service-requests")
      .type("form")
      .send(validForm({
        residentId: "999999"
      }))
      .expect(400);

    assert.match(response.text, /Resident not found/);

    assert.equal(
      app.locals.serviceRequestServices.query
        .listServiceRequests().length,
      0
    );
  });
});

/* =========================================
   TEST 11
   Inactive Resident Submission Is Rejected
========================================= */

test("T13 Test 11: Inactive Resident submission is rejected", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    const result =
      app.locals.residentServices.deactivation
        .deactivateResident(resident.id);

    assert.equal(result.success, true);

    const response = await request(app)
      .post("/service-requests")
      .type("form")
      .send(validForm({
        residentId: String(resident.id)
      }))
      .expect(400);

    assert.match(
      response.text,
      /Inactive Residents cannot submit new Service Requests/
    );

    assert.equal(
      app.locals.serviceRequestServices.query
        .listServiceRequests().length,
      0
    );
  });
});

/* =========================================
   TEST 12
   Existing Service Request Details Can Be Viewed
========================================= */

test("T13 Test 12: Existing Service Request details are displayed", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    const serviceRequest = persistServiceRequest(
      app,
      resident.id,
      {
        serviceType: "Barangay Clearance",
        description: "Required for employment application.",
        dateRequested: "2026-09-05"
      }
    );

    const response = await request(app)
      .get(`/service-requests/${serviceRequest.id}`)
      .expect(200);

    assert.match(response.text, new RegExp(String(serviceRequest.id)));
    assert.match(response.text, new RegExp(String(resident.id)));
    assert.match(response.text, /Barangay Clearance/);
    assert.match(response.text, /Required for employment application/);
    assert.match(response.text, /2026-09-05/);
    assert.match(response.text, /Pending/);
  });
});

/* =========================================
   TEST 13
   Missing Service Request View Is Handled
========================================= */

test("T13 Test 13: Missing Service Request returns controlled 404", async () => {
  await withTestApp(async (app) => {
    const response = await request(app)
      .get("/service-requests/999999")
      .expect(404)
      .expect("Content-Type", /html/);

    assert.match(response.text, /Service Request Not Found/);
  });
});

/* =========================================
   TEST 14
   Pending Request Can Start Processing
========================================= */

test("T13 Test 14: Pending request can start processing", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);
    const serviceRequest = persistServiceRequest(app, resident.id);

    const response = await request(app)
      .post(
        `/service-requests/${serviceRequest.id}/start-processing`
      )
      .expect(303);

    assert.equal(
      response.headers.location,
      `/service-requests/${serviceRequest.id}?notice=started`
    );

    const saved =
      app.locals.serviceRequestRepository
        .findById(serviceRequest.id);

    assert.equal(saved.id, serviceRequest.id);
    assert.equal(saved.residentId, resident.id);
    assert.equal(saved.status, "In Progress");
  });
});

/* =========================================
   TEST 15
   Pending Request Can Be Cancelled
========================================= */

test("T13 Test 15: Pending request can be cancelled", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);
    const serviceRequest = persistServiceRequest(app, resident.id);

    await request(app)
      .post(
        `/service-requests/${serviceRequest.id}/cancel`
      )
      .expect(303);

    const saved =
      app.locals.serviceRequestRepository
        .findById(serviceRequest.id);

    assert.ok(saved);
    assert.equal(saved.status, "Cancelled");
    assert.equal(saved.id, serviceRequest.id);
  });
});

/* =========================================
   TEST 16
   In-Progress Request Can Be Completed
========================================= */

test("T13 Test 16: In-Progress request can be completed", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);
    const serviceRequest = persistServiceRequest(app, resident.id);

    transitionRequest(app, serviceRequest.id, "In Progress");

    await request(app)
      .post(
        `/service-requests/${serviceRequest.id}/complete`
      )
      .expect(303);

    const saved =
      app.locals.serviceRequestRepository
        .findById(serviceRequest.id);

    assert.ok(saved);
    assert.equal(saved.status, "Completed");
    assert.equal(saved.id, serviceRequest.id);
  });
});

/* =========================================
   TEST 17
   In-Progress Request Can Be Cancelled
========================================= */

test("T13 Test 17: In-Progress request can be cancelled", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);
    const serviceRequest = persistServiceRequest(app, resident.id);

    transitionRequest(app, serviceRequest.id, "In Progress");

    await request(app)
      .post(
        `/service-requests/${serviceRequest.id}/cancel`
      )
      .expect(303);

    const saved =
      app.locals.serviceRequestRepository
        .findById(serviceRequest.id);

    assert.ok(saved);
    assert.equal(saved.status, "Cancelled");
  });
});

/* =========================================
   TEST 18
   Invalid Direct Transition Is Rejected
========================================= */

test("T13 Test 18: Invalid direct transition remains rejected by T10", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);
    const serviceRequest = persistServiceRequest(app, resident.id);

    const response = await request(app)
      .post(
        `/service-requests/${serviceRequest.id}/complete`
      )
      .expect(303);

    assert.equal(
      response.headers.location,
      `/service-requests/${serviceRequest.id}?notice=invalid-transition`
    );

    const saved =
      app.locals.serviceRequestRepository
        .findById(serviceRequest.id);

    assert.ok(saved);
    assert.equal(saved.status, "Pending");
  });
});

/* =========================================
   TEST 19
   Completed and Cancelled Requests Remain Visible
========================================= */

test("T13 Test 19: Terminal requests remain listable, searchable, filterable, and viewable", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    const completed = persistServiceRequest(app, resident.id, {
      serviceType: "Completed Clearance"
    });

    transitionRequest(app, completed.id, "In Progress");
    transitionRequest(app, completed.id, "Completed");

    const cancelled = persistServiceRequest(app, resident.id, {
      serviceType: "Cancelled Streetlight"
    });

    transitionRequest(app, cancelled.id, "Cancelled");

    // Listing
    const listing = await request(app)
      .get("/service-requests")
      .expect(200);

    assert.match(listing.text, /Completed Clearance/);
    assert.match(listing.text, /Cancelled Streetlight/);

    // Searching
    const searching = await request(app)
      .get("/service-requests")
      .query({ search: "Completed Clearance" })
      .expect(200);

    assert.match(searching.text, /Completed Clearance/);

    // Filtering
    const filtering = await request(app)
      .get("/service-requests")
      .query({ status: "Cancelled" })
      .expect(200);

    assert.match(filtering.text, /Cancelled Streetlight/);
    assert.doesNotMatch(filtering.text, /Completed Clearance/);

    // Viewing
    for (const item of [
      {
        id: completed.id,
        status: "Completed"
      },
      {
        id: cancelled.id,
        status: "Cancelled"
      }
    ]) {
      const details = await request(app)
        .get(`/service-requests/${item.id}`)
        .expect(200);

      assert.match(details.text, new RegExp(item.status));
      assert.match(details.text, /No further workflow actions/);
    }
  });
});

/* =========================================
   TEST 20
   GET Requests Do Not Change Service Request State
========================================= */

test("T13 Test 20: GET requests do not modify Service Request state", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    const serviceRequest = persistServiceRequest(
      app,
      resident.id
    );

    const initialRequests =
      app.locals.serviceRequestServices.query
        .listServiceRequests();

    const initialCount = initialRequests.length;

    const getPaths = [
      "/service-requests",
      "/service-requests?search=clearance",
      "/service-requests?status=Pending",
      "/service-requests?search=clearance&status=Pending",
      "/service-requests/new",
      `/service-requests/${serviceRequest.id}`
    ];

    for (const url of getPaths) {
      await request(app)
        .get(url)
        .expect(200);

      const saved =
        app.locals.serviceRequestRepository
          .findById(serviceRequest.id);

      assert.ok(saved);
      assert.equal(
        saved.status,
        "Pending",
        `GET ${url} unexpectedly changed Service Request status`
      );

      const currentRequests =
        app.locals.serviceRequestServices.query
          .listServiceRequests();

      assert.equal(
        currentRequests.length,
        initialCount,
        `GET ${url} unexpectedly created a Service Request`
      );
    }
  });
});


/* =========================================
   T15 TEST 3
   Read-only GET requests preserve all persisted fields
========================================= */

test(
  "T15 Test 3: Read-only GET requests preserve the complete Service Request records",
  async () => {
    await withTestApp(async (app) => {
      const resident = persistResident(app);

      const pendingRequest = persistServiceRequest(
        app,
        resident.id,
        {
          serviceType: "Barangay Clearance",
          description: "Pending request snapshot test."
        }
      );

      const inProgressRequest = persistServiceRequest(
        app,
        resident.id,
        {
          serviceType: "Streetlight Repair",
          description: "In-progress request snapshot test."
        }
      );

      transitionRequest(
        app,
        inProgressRequest.id,
        "In Progress"
      );

      const getAllRequests = () =>
        app.locals.serviceRequestServices.query
          .listServiceRequests();

      // Capture every persisted Service Request field.
      const before = getAllRequests();

      const getPaths = [
        "/service-requests",
        "/service-requests?search=clearance",
        "/service-requests?status=Pending",
        "/service-requests?search=streetlight&status=In%20Progress",
        "/service-requests/new",
        `/service-requests/${pendingRequest.id}`,
        `/service-requests/${inProgressRequest.id}`
      ];

      for (const url of getPaths) {
        await request(app)
          .get(url)
          .expect(200);

        const after = getAllRequests();

        assert.deepEqual(
          after,
          before,
          `GET ${url} unexpectedly changed persisted Service Request records`
        );
      }
    });
  }
);
