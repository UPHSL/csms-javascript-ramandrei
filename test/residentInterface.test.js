
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import request from "supertest";

import { createApp } from "../src/app.js";
import { Resident } from "../src/models/Resident.js";

/**
 * Create an Express application with an isolated temporary database.
 * Each test gets its own database so test data cannot leak between tests.
 */
async function withTestApp(run) {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "csms-t12-")
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

/**
 * Persist a test Resident through the established registration service.
 */
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

function validForm(overrides = {}) {
  return {
    firstName: "Jordan",
    lastName: "Rivera",
    address: "456 Community Street",
    contactNumber: "09912345678",
    email: "jordan.rivera@example.com",
    ...overrides
  };
}

// Test 1 — Resident Management page loads successfully.
test("T12 Test 1: Resident Management page loads", async () => {
  await withTestApp(async (app) => {
    const response = await request(app)
      .get("/residents")
      .expect(200)
      .expect("Content-Type", /html/);

    assert.match(response.text, /Resident Management/);
    assert.match(response.text, /Resident Records/);
  });
});

// Test 2 — Persisted Residents are represented in the list.
test("T12 Test 2: List displays persisted Residents", async () => {
  await withTestApp(async (app) => {
    persistResident(app, {
      firstName: "Alice",
      lastName: "Santos",
      email: "alice.santos@example.com"
    });

    persistResident(app, {
      firstName: "Brian",
      lastName: "Cruz",
      email: "brian.cruz@example.com"
    });

    const response = await request(app)
      .get("/residents")
      .expect(200);

    assert.match(response.text, /Alice Santos/);
    assert.match(response.text, /Brian Cruz/);
  });
});

// Test 3 — Search supports partial and case-insensitive matching.
test("T12 Test 3: Search uses existing search behavior", async () => {
  await withTestApp(async (app) => {
    persistResident(app, {
      firstName: "Alphonse",
      lastName: "Matching",
      email: "alphonse@example.com"
    });

    persistResident(app, {
      firstName: "Beatrice",
      lastName: "Other",
      email: "beatrice@example.com"
    });

    const response = await request(app)
      .get("/residents")
      .query({ search: "ALP" })
      .expect(200);

    assert.match(response.text, /Alphonse Matching/);
    assert.doesNotMatch(response.text, /Beatrice Other/);
  });
});

// Test 4 — Blank or whitespace search returns all Residents.
test("T12 Test 4: Blank search displays all Residents", async () => {
  await withTestApp(async (app) => {
    persistResident(app, {
      firstName: "First",
      lastName: "Person",
      email: "first@example.com"
    });

    persistResident(app, {
      firstName: "Second",
      lastName: "Person",
      email: "second@example.com"
    });

    const response = await request(app)
      .get("/residents")
      .query({ search: "   " })
      .expect(200);

    assert.match(response.text, /First Person/);
    assert.match(response.text, /Second Person/);
  });
});

// Test 5 — Registration form renders all required fields.
test("T12 Test 5: Registration form is accessible", async () => {
  await withTestApp(async (app) => {
    const response = await request(app)
      .get("/residents/new")
      .expect(200)
      .expect("Content-Type", /html/);

    for (const field of [
      "firstName",
      "lastName",
      "address",
      "contactNumber",
      "email"
    ]) {
      assert.ok(
        response.text.includes(`name="${field}"`),
        `Registration form is missing ${field}`
      );
    }

    assert.doesNotMatch(response.text, /name="id"/);
    assert.doesNotMatch(response.text, /name="status"/);
  });
});

// Test 6 — Valid registration persists an Active Resident with an ID.
test("T12 Test 6: Valid registration persists Resident", async () => {
  await withTestApp(async (app) => {
    const response = await request(app)
      .post("/residents")
      .type("form")
      .send(validForm())
      .expect(303);

    assert.equal(
      response.headers.location,
      "/residents?notice=registered"
    );

    const residents =
      app.locals.residentServices.query.listResidents();

    assert.equal(residents.length, 1);

    const resident = residents[0];

    assert.ok(Number.isInteger(resident.id));
    assert.ok(resident.id > 0);
    assert.equal(resident.status, "Active");
    assert.equal(resident.firstName, "Jordan");

    const listResponse = await request(app)
      .get("/residents")
      .expect(200);

    assert.match(listResponse.text, /Jordan Rivera/);
    assert.match(listResponse.text, /Active/);
  });
});

// Test 7 — Invalid registration shows feedback and persists nothing.
test("T12 Test 7: Invalid registration is rejected", async () => {
  await withTestApp(async (app) => {
    const response = await request(app)
      .post("/residents")
      .type("form")
      .send(validForm({ contactNumber: "123" }))
      .expect(400);

    assert.match(
      response.text,
      /Please correct the highlighted information/
    );

    assert.match(
      response.text,
      /valid 11-digit mobile number/
    );

    assert.equal(
      app.locals.residentServices.query.listResidents().length,
      0
    );
  });
});

// Test 8 — Edit form shows existing fields without editable ID/status.
test("T12 Test 8: Edit form displays existing Resident", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    const response = await request(app)
      .get(`/residents/${resident.id}/edit`)
      .expect(200);

    assert.match(response.text, /Taylor/);
    assert.match(response.text, /Sample/);
    assert.match(response.text, /123 Test Street/);
    assert.match(response.text, /09171234567/);
    assert.match(response.text, /taylor.sample@example.com/);
    assert.match(response.text, /Active/);

    for (const field of [
      "firstName",
      "lastName",
      "address",
      "contactNumber",
      "email"
    ]) {
      assert.ok(
        response.text.includes(`name="${field}"`),
        `Edit form is missing ${field}`
      );
    }

    assert.match(response.text, /readonly/);
    assert.doesNotMatch(response.text, /name="id"/);
    assert.doesNotMatch(response.text, /name="status"/);
  });
});

// Test 9 — Valid updates persist while preserving ID and status.
test("T12 Test 9: Valid update persists changes", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app, {
      status: "Inactive"
    });

    const originalId = resident.id;
    const originalStatus = resident.status;

    const response = await request(app)
      .post(`/residents/${resident.id}`)
      .type("form")
      .send(validForm({
        address: "789 Updated Avenue"
      }))
      .expect(303);

    assert.equal(
      response.headers.location,
      "/residents?notice=updated"
    );

    const updated =
      app.locals.residentRepository.findById(originalId);

    assert.ok(updated);
    assert.equal(updated.id, originalId);
    assert.equal(updated.status, originalStatus);
    assert.equal(updated.firstName, "Jordan");
    assert.equal(updated.lastName, "Rivera");
    assert.equal(updated.address, "789 Updated Avenue");
    assert.equal(updated.contactNumber, "09912345678");
    assert.equal(updated.email, "jordan.rivera@example.com");
  });
});

// Test 10 — Invalid updates show feedback and leave persisted data unchanged.
test("T12 Test 10: Invalid update does not modify Resident", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    const before =
      app.locals.residentRepository.findById(resident.id);

    const response = await request(app)
      .post(`/residents/${resident.id}`)
      .type("form")
      .send(validForm({
        firstName: "Changed Name",
        address: "An address that must not be saved",
        contactNumber: "invalid"
      }))
      .expect(400);

    assert.match(
      response.text,
      /Please correct the highlighted information/
    );

    assert.match(
      response.text,
      /valid 11-digit mobile number/
    );

    const after =
      app.locals.residentRepository.findById(resident.id);

    assert.deepEqual(after, before);
  });
});

// Test 11 — Missing Resident edit returns a controlled 404 page.
test("T12 Test 11: Missing Resident edit is handled safely", async () => {
  await withTestApp(async (app) => {
    const response = await request(app)
      .get("/residents/999999/edit")
      .expect(404)
      .expect("Content-Type", /html/);

    assert.match(response.text, /Resident Not Found/);
    assert.match(response.text, /could not be found/);
  });
});

// Test 12 — Deactivation changes status without deleting the Resident.
test("T12 Test 12: Active Resident can be deactivated", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    const response = await request(app)
      .post(`/residents/${resident.id}/deactivate`)
      .expect(303);

    assert.equal(
      response.headers.location,
      "/residents?notice=deactivated"
    );

    const saved =
      app.locals.residentRepository.findById(resident.id);

    assert.ok(saved);
    assert.equal(saved.id, resident.id);
    assert.equal(saved.status, "Inactive");
  });
});

// Test 13 — Inactive Resident remains visible in the list.
test("T12 Test 13: Inactive Resident remains visible", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    await request(app)
      .post(`/residents/${resident.id}/deactivate`)
      .expect(303);

    const response = await request(app)
      .get("/residents")
      .expect(200);

    assert.match(response.text, /Taylor Sample/);
    assert.match(response.text, /Inactive/);

    assert.equal(
      app.locals.residentRepository.findById(resident.id).status,
      "Inactive"
    );
  });
});

// Test 14 — Normal GET requests must never deactivate a Resident.
test("T12 Test 14: GET requests do not change Resident status", async () => {
  await withTestApp(async (app) => {
    const resident = persistResident(app);

    const getPaths = [
      "/residents",
      `/residents?search=${encodeURIComponent("Taylor")}`,
      `/residents/${resident.id}/edit`,
      "/residents/new"
    ];

    for (const url of getPaths) {
      await request(app)
        .get(url)
        .expect(200);

      const saved =
        app.locals.residentRepository.findById(resident.id);

      assert.ok(saved, `Resident disappeared after GET ${url}`);
      assert.equal(
        saved.status,
        "Active",
        `GET ${url} unexpectedly changed Resident status`
      );
    }
  });
});
