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
    path.join(os.tmpdir(), "csms-t14-")
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

  assert.equal(
    result.success,
    true,
    `Test Resident could not be persisted: ${(result.errors ?? []).join(", ")}`
  );

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

async function getDashboard(app) {
  return request(app)
    .get("/dashboard")
    .expect(200)
    .expect("Content-Type", /html/);
}

/**
 * Checks that a dashboard metric label is followed by
 * its expected value in the rendered HTML.
 *
 * The allowed distance accommodates common dashboard
 * card markup while keeping the assertion meaningful.
 */

function assertMetric(html, label, expectedValue) {
  const actualLabel =
    label === "Open Service Requests" ? "Open Requests" : label;

  const cards = [
    ...html.matchAll(
      /<article\b[^>]*class="[^"]*\bdashboard-stat\b[^"]*"[^>]*>([\s\S]*?)<\/article>/g
    )
  ];

  const matchingCard = cards.find(([, cardHtml]) => {
    const heading = cardHtml.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/);

    return heading &&
      heading[1].trim() === actualLabel;
  });

  assert.ok(
    matchingCard,
    `Dashboard metric "${actualLabel}" was not found.`
  );

  const number = matchingCard[1].match(
    /<p\b[^>]*class="[^"]*\bdashboard-number\b[^"]*"[^>]*>\s*(\d+)\s*<\/p>/
  );

  assert.ok(
    number,
    `Dashboard metric "${actualLabel}" has no displayed number.`
  );

  assert.equal(
    Number(number[1]),
    Number(expectedValue),
    `Expected dashboard metric "${label}" to display ${expectedValue}.`
  );
}


/**
 * Returns the current persisted dashboard data through
 * the existing repository and query service interfaces.
 */
function getPersistedState(app) {
  return {
    residents: app.locals.residentServices.query.listResidents(),
    serviceRequests:
      app.locals.serviceRequestServices.query.listServiceRequests()
  };
}

/* =========================================
   TEST 1
   Dashboard Page Loads
========================================= */

test("T14 Test 1: Dashboard page loads successfully", async () => {
  await withTestApp(async (app) => {
    const response = await getDashboard(app);

    assert.match(response.text, /Dashboard/);
  });
});

/* =========================================
   TEST 2
   Empty Database Displays Zero Counts
========================================= */

test("T14 Test 2: Empty database displays zero dashboard counts", async () => {
  await withTestApp(async (app) => {
    const response = await getDashboard(app);

    assertMetric(response.text, "Total Residents", 0);
    assertMetric(response.text, "Active Residents", 0);
    assertMetric(response.text, "Inactive Residents", 0);

    assertMetric(response.text, "Total Service Requests", 0);
    assertMetric(response.text, "Pending", 0);
    assertMetric(response.text, "In Progress", 0);
    assertMetric(response.text, "Completed", 0);
    assertMetric(response.text, "Cancelled", 0);
    assertMetric(response.text, "Open Service Requests", 0);
  });
});

/* =========================================
   TEST 3
   Total Residents Count
========================================= */

test("T14 Test 3: Dashboard displays the correct total Residents", async () => {
  await withTestApp(async (app) => {
    persistResident(app);
    persistResident(app, {
      firstName: "Jordan",
      lastName: "Rivera",
      email: "jordan@example.com"
    });
    persistResident(app, {
      firstName: "Alex",
      lastName: "Santos",
      email: "alex@example.com"
    });

    const response = await getDashboard(app);

    assertMetric(response.text, "Total Residents", 3);
  });
});

/* =========================================
   TEST 4
   Active and Inactive Resident Counts
========================================= */

test("T14 Test 4: Dashboard displays correct Active and Inactive Resident counts", async () => {
  await withTestApp(async (app) => {
    persistResident(app, {
      firstName: "Active",
      lastName: "One"
    });

    persistResident(app, {
      firstName: "Active",
      lastName: "Two",
      email: "active.two@example.com"
    });

    persistResident(app, {
      firstName: "Inactive",
      lastName: "One",
      email: "inactive.one@example.com",
      status: "Inactive"
    });

    const response = await getDashboard(app);

    assertMetric(response.text, "Total Residents", 3);
    assertMetric(response.text, "Active Residents", 2);
    assertMetric(response.text, "Inactive Residents", 1);

    assert.equal(
      2 + 1,
      3,
      "Active and Inactive counts should reconcile with total Residents."
    );
  });
});

/* =========================================
   TEST 5
   Total Service Request Count
========================================= */

test("T14 Test 5: Dashboard displays the correct total Service Requests", async () => {
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

    const response = await getDashboard(app);

    assertMetric(response.text, "Total Service Requests", 3);
  });
});

/* =========================================
   TEST 6
   Service Request Counts Per Status
========================================= */

test("T14 Test 6: Dashboard displays correct Service Request counts per status", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    persistServiceRequest(app, resident.id, {
      serviceType: "Pending Request"
    });

    const inProgress = persistServiceRequest(app, resident.id, {
      serviceType: "In Progress Request"
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

    const response = await getDashboard(app);

    assertMetric(response.text, "Total Service Requests", 4);
    assertMetric(response.text, "Pending", 1);
    assertMetric(response.text, "In Progress", 1);
    assertMetric(response.text, "Completed", 1);
    assertMetric(response.text, "Cancelled", 1);
  });
});

/* =========================================
   TEST 7
   Service Request Counts Reconcile
========================================= */

test("T14 Test 7: Service Request status counts reconcile with the total", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    persistServiceRequest(app, resident.id);

    const inProgress = persistServiceRequest(app, resident.id);
    transitionRequest(app, inProgress.id, "In Progress");

    const completed = persistServiceRequest(app, resident.id);
    transitionRequest(app, completed.id, "In Progress");
    transitionRequest(app, completed.id, "Completed");

    const cancelled = persistServiceRequest(app, resident.id);
    transitionRequest(app, cancelled.id, "Cancelled");

    const response = await getDashboard(app);

    assertMetric(response.text, "Total Service Requests", 4);

    const pending = 1;
    const inProgressCount = 1;
    const completedCount = 1;
    const cancelledCount = 1;

    assert.equal(
      pending + inProgressCount + completedCount + cancelledCount,
      4,
      "All status counts should reconcile with the total Service Requests."
    );
  });
});

/* =========================================
   TEST 8
   Open Service Requests Calculation
========================================= */

test("T14 Test 8: Open Service Requests equal Pending plus In Progress", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    persistServiceRequest(app, resident.id, {
      serviceType: "Pending One"
    });

    persistServiceRequest(app, resident.id, {
      serviceType: "Pending Two"
    });

    const inProgress = persistServiceRequest(app, resident.id, {
      serviceType: "In Progress One"
    });
    transitionRequest(app, inProgress.id, "In Progress");

    const completed = persistServiceRequest(app, resident.id, {
      serviceType: "Completed One"
    });
    transitionRequest(app, completed.id, "In Progress");
    transitionRequest(app, completed.id, "Completed");

    const cancelled = persistServiceRequest(app, resident.id, {
      serviceType: "Cancelled One"
    });
    transitionRequest(app, cancelled.id, "Cancelled");

    const response = await getDashboard(app);

    assertMetric(response.text, "Pending", 2);
    assertMetric(response.text, "In Progress", 1);
    assertMetric(response.text, "Open Service Requests", 3);

    assert.equal(
      2 + 1,
      3,
      "Open requests should exclude Completed and Cancelled requests."
    );
  });
});

/* =========================================
   TEST 9
   Resident Deactivation Updates Dashboard
========================================= */

test("T14 Test 9: Deactivating a Resident updates dashboard counts without changing total", async () => {
  await withTestApp(async (app) => {
    const firstResident = persistResident(app);

    persistResident(app, {
      firstName: "Jordan",
      lastName: "Rivera",
      email: "jordan@example.com"
    });

    const before = await getDashboard(app);

    assertMetric(before.text, "Total Residents", 2);
    assertMetric(before.text, "Active Residents", 2);
    assertMetric(before.text, "Inactive Residents", 0);

    const result =
      app.locals.residentServices.deactivation
        .deactivateResident(firstResident.id);

    assert.equal(result.success, true);

    const after = await getDashboard(app);

    assertMetric(after.text, "Total Residents", 2);
    assertMetric(after.text, "Active Residents", 1);
    assertMetric(after.text, "Inactive Residents", 1);
  });
});

/* =========================================
   TEST 10
   Pending to In Progress Updates Dashboard
========================================= */

test("T14 Test 10: Pending to In Progress transition updates dashboard metrics", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    const serviceRequest = persistServiceRequest(
      app,
      resident.id
    );

    const before = await getDashboard(app);

    assertMetric(before.text, "Total Service Requests", 1);
    assertMetric(before.text, "Pending", 1);
    assertMetric(before.text, "In Progress", 0);
    assertMetric(before.text, "Open Service Requests", 1);

    transitionRequest(app, serviceRequest.id, "In Progress");

    const after = await getDashboard(app);

    assertMetric(after.text, "Total Service Requests", 1);
    assertMetric(after.text, "Pending", 0);
    assertMetric(after.text, "In Progress", 1);
    assertMetric(after.text, "Open Service Requests", 1);
  });
});

/* =========================================
   TEST 11
   In Progress to Completed or Cancelled
========================================= */

test("T14 Test 11: Completing or cancelling an open request decreases open count", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    const completed = persistServiceRequest(
      app,
      resident.id,
      {
        serviceType: "Completed Request"
      }
    );

    const cancelled = persistServiceRequest(
      app,
      resident.id,
      {
        serviceType: "Cancelled Request"
      }
    );

    transitionRequest(app, completed.id, "In Progress");
    transitionRequest(app, cancelled.id, "In Progress");

    const before = await getDashboard(app);

    assertMetric(before.text, "Total Service Requests", 2);
    assertMetric(before.text, "In Progress", 2);
    assertMetric(before.text, "Open Service Requests", 2);

    transitionRequest(app, completed.id, "Completed");
    transitionRequest(app, cancelled.id, "Cancelled");

    const after = await getDashboard(app);

    assertMetric(after.text, "Total Service Requests", 2);
    assertMetric(after.text, "In Progress", 0);
    assertMetric(after.text, "Completed", 1);
    assertMetric(after.text, "Cancelled", 1);
    assertMetric(after.text, "Open Service Requests", 0);
  });
});

/* =========================================
   TEST 12
   Recent Requests Are Limited to Five
========================================= */

test("T14 Test 12: Recent Service Requests displays a maximum of five records", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    for (let index = 1; index <= 7; index += 1) {
      persistServiceRequest(app, resident.id, {
        serviceType: `Recent Request ${index}`,
        dateRequested: `2026-09-${String(index).padStart(2, "0")}`
      });
    }

    const response = await getDashboard(app);

    for (let index = 3; index <= 7; index += 1) {
      assert.match(
        response.text,
        new RegExp(`Recent Request ${index}`)
      );
    }

    assert.doesNotMatch(response.text, /Recent Request 1(?!\d)/);
    assert.doesNotMatch(response.text, /Recent Request 2(?!\d)/);
  });
});

/* =========================================
   TEST 13
   Recent Requests Ordering
========================================= */

test("T14 Test 13: Recent Service Requests use date DESC and ID DESC ordering", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    const first = persistServiceRequest(app, resident.id, {
      serviceType: "First Created Same Date",
      dateRequested: "2026-09-03"
    });

    const older = persistServiceRequest(app, resident.id, {
      serviceType: "Older Request",
      dateRequested: "2026-09-01"
    });

    const second = persistServiceRequest(app, resident.id, {
      serviceType: "Second Created Same Date",
      dateRequested: "2026-09-03"
    });

    const response = await getDashboard(app);

    const secondPosition =
      response.text.indexOf("Second Created Same Date");

    const firstPosition =
      response.text.indexOf("First Created Same Date");

    const olderPosition =
      response.text.indexOf("Older Request");

    assert.ok(secondPosition >= 0);
    assert.ok(firstPosition >= 0);
    assert.ok(olderPosition >= 0);

    assert.ok(
      secondPosition < firstPosition,
      "Higher ID should appear first when dates are equal."
    );

    assert.ok(
      firstPosition < olderPosition,
      "More recent dates should appear before older dates."
    );

    assert.ok(second.id > first.id);
  });
});

/* =========================================
   TEST 14
   Terminal Requests Can Appear in Recent List
========================================= */

test("T14 Test 14: Completed and Cancelled requests can appear in recent records", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    const completed = persistServiceRequest(
      app,
      resident.id,
      {
        serviceType: "Recently Completed Request",
        dateRequested: "2026-09-05"
      }
    );

    transitionRequest(app, completed.id, "In Progress");
    transitionRequest(app, completed.id, "Completed");

    const cancelled = persistServiceRequest(
      app,
      resident.id,
      {
        serviceType: "Recently Cancelled Request",
        dateRequested: "2026-09-04"
      }
    );

    transitionRequest(app, cancelled.id, "Cancelled");

    const response = await getDashboard(app);

    assert.match(response.text, /Recently Completed Request/);
    assert.match(response.text, /Recently Cancelled Request/);
    assert.match(response.text, /Completed/);
    assert.match(response.text, /Cancelled/);
  });
});

/* =========================================
   TEST 15
   Dashboard GET Is Read-Only
========================================= */

test("T14 Test 15: Dashboard GET does not modify persisted records", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    const serviceRequest = persistServiceRequest(
      app,
      resident.id
    );

    const before = getPersistedState(app);

    const dashboardPaths = [
      "/dashboard",
      "/dashboard"
    ];

    for (const url of dashboardPaths) {
      await request(app)
        .get(url)
        .expect(200);
    }

    const after = getPersistedState(app);

    assert.deepEqual(
      after.residents,
      before.residents,
      "Dashboard GET unexpectedly modified Resident records."
    );

    assert.deepEqual(
      after.serviceRequests,
      before.serviceRequests,
      "Dashboard GET unexpectedly modified Service Request records."
    );

    const savedRequest =
      app.locals.serviceRequestRepository
        .findById(serviceRequest.id);

    assert.ok(savedRequest);
    assert.equal(savedRequest.status, "Pending");
  });
});


/* =========================================
   T15 TEST 4
   Cross-Feature Regression:
   Resident Deactivation and Dashboard
========================================= */

test(
  "T15 Test 4: Resident deactivation through the route updates Resident Management and Dashboard",
  async () => {
    await withTestApp(async (app) => {
      const resident = persistResident(app, {
        firstName: "CrossFeature",
        lastName: "Regression",
        email: "crossfeature@example.com"
      });

      // Confirm the initial Resident state.
      const initialResident =
        app.locals.residentRepository.findById(
          resident.id
        );

      assert.ok(initialResident);
      assert.equal(initialResident.status, "Active");

      const beforeDashboard = await getDashboard(app);

      assertMetric(
        beforeDashboard.text,
        "Total Residents",
        1
      );

      assertMetric(
        beforeDashboard.text,
        "Active Residents",
        1
      );

      assertMetric(
        beforeDashboard.text,
        "Inactive Residents",
        0
      );

      // Deactivate through the actual HTTP route.
      const deactivationResponse = await request(app)
        .post(`/residents/${resident.id}/deactivate`)
        .expect(303);

      assert.equal(
        deactivationResponse.headers.location,
        "/residents?notice=deactivated"
      );

      // Verify the Resident Management module.
      const residentListResponse = await request(app)
        .get("/residents")
        .expect(200);

      assert.match(
        residentListResponse.text,
        /CrossFeature Regression/
      );

      assert.match(
        residentListResponse.text,
        /Inactive/
      );

      // Verify persisted Resident data.
      const savedResident =
        app.locals.residentRepository.findById(
          resident.id
        );

      assert.ok(savedResident);
      assert.equal(savedResident.status, "Inactive");
      assert.equal(savedResident.id, resident.id);

      // Verify that the Dashboard reflects the same change.
      const afterDashboard = await getDashboard(app);

      assertMetric(
        afterDashboard.text,
        "Total Residents",
        1
      );

      assertMetric(
        afterDashboard.text,
        "Active Residents",
        0
      );

      assertMetric(
        afterDashboard.text,
        "Inactive Residents",
        1
      );
    });
  }
);
