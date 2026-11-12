import test from "node:test";
import assert from "node:assert/strict";

import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";

import { createDatabase } from "../src/database/database.js";
import { ServiceRequest } from "../src/models/ServiceRequest.js";

import {
  ServiceRequestRepository
} from "../src/repositories/ServiceRequestRepository.js";

import ServiceRequestQueryService
  from "../src/services/ServiceRequestQueryService.js";

import ServiceRequestStatusService
  from "../src/services/ServiceRequestStatusService.js";


function createTemporaryDatabasePath() {
  return path.join(
    os.tmpdir(),
    `csms-t11-${crypto.randomUUID()}.sqlite`
  );
}


function createQuerySetup() {
  const databasePath =
    createTemporaryDatabasePath();

  const database =
    createDatabase(databasePath);

  const repository =
    new ServiceRequestRepository(database);

  const queryService =
    new ServiceRequestQueryService(repository);

  const statusService =
    new ServiceRequestStatusService(repository);

  return {
    databasePath,
    database,
    repository,
    queryService,
    statusService
  };
}


function makeServiceRequest({
  residentId = 25,
  serviceType = "Barangay Clearance",
  description = "Employment requirement",
  dateRequested = "2026-09-15"
} = {}) {
  return new ServiceRequest({
    residentId,
    serviceType,
    description,
    dateRequested
  });
}


// Save a request to SQLite and, when needed,
// use the legitimate T10 workflow to reach its status.
function persistRequest(setup, options = {}) {
  const {
    status: targetStatus = "Pending",
    ...requestInformation
  } = options;

  const request =
    setup.repository.save(
      makeServiceRequest(requestInformation)
    );

  if (targetStatus === "In Progress") {
    const result = setup.statusService.updateStatus(
      request.id,
      "In Progress"
    );

    assert.equal(result.success, true);
  } else if (targetStatus === "Completed") {
    const firstResult = setup.statusService.updateStatus(
      request.id,
      "In Progress"
    );

    assert.equal(firstResult.success, true);

    const secondResult = setup.statusService.updateStatus(
      request.id,
      "Completed"
    );

    assert.equal(secondResult.success, true);
  } else if (targetStatus === "Cancelled") {
    const result = setup.statusService.updateStatus(
      request.id,
      "Cancelled"
    );

    assert.equal(result.success, true);
  } else {
    assert.equal(targetStatus, "Pending");
  }

  return setup.repository.findById(request.id);
}


function cleanup(setup) {
  setup.database.close();

  if (fs.existsSync(setup.databasePath)) {
    fs.unlinkSync(setup.databasePath);
  }
}


// Test 1
test(
  "listServiceRequests returns all persisted Service Requests",
  () => {
    const setup = createQuerySetup();

    try {
      const first = persistRequest(setup, {
        serviceType: "Barangay Clearance"
      });

      const second = persistRequest(setup, {
        serviceType: "Permit Request"
      });

      const third = persistRequest(setup, {
        serviceType: "Community Assistance"
      });

      const results =
        setup.queryService.listServiceRequests();

      assert.equal(results.length, 3);

      const resultIds =
        results.map((request) => request.id);

      assert.ok(resultIds.includes(first.id));
      assert.ok(resultIds.includes(second.id));
      assert.ok(resultIds.includes(third.id));
    } finally {
      cleanup(setup);
    }
  }
);


// Test 2
test(
  "empty listing returns an empty collection",
  () => {
    const setup = createQuerySetup();

    try {
      const results =
        setup.queryService.listServiceRequests();

      assert.deepEqual(results, []);
    } finally {
      cleanup(setup);
    }
  }
);


// Test 3
test(
  "listing orders by date descending and then ID descending",
  () => {
    const setup = createQuerySetup();

    try {
      // Intentionally insert them in a different order.
      const older =
        persistRequest(setup, {
          dateRequested: "2026-09-15"
        });

      const newerFirst =
        persistRequest(setup, {
          dateRequested: "2026-09-18"
        });

      const newerSecond =
        persistRequest(setup, {
          dateRequested: "2026-09-18"
        });

      const oldest =
        persistRequest(setup, {
          dateRequested: "2026-09-10"
        });

      const results =
        setup.queryService.listServiceRequests();

      assert.deepEqual(
        results.map((request) => request.id),
        [
          newerSecond.id,
          newerFirst.id,
          older.id,
          oldest.id
        ]
      );
    } finally {
      cleanup(setup);
    }
  }
);


// Test 4
test(
  "viewServiceRequest retrieves an existing request by ID",
  () => {
    const setup = createQuerySetup();

    try {
      const saved =
        persistRequest(setup, {
          serviceType: "Permit Request",
          description: "Business permit requirement"
        });

      const result =
        setup.queryService.viewServiceRequest(
          saved.id
        );

      assert.ok(result);
      assert.equal(result.id, saved.id);
      assert.equal(result.serviceType, "Permit Request");
      assert.equal(
        result.description,
        "Business permit requirement"
      );
    } finally {
      cleanup(setup);
    }
  }
);


// Test 5
test(
  "viewing an unknown ID returns null without creating a request",
  () => {
    const setup = createQuerySetup();

    try {
      persistRequest(setup);

      const countBefore =
        setup.repository.findAll().length;

      const result =
        setup.queryService.viewServiceRequest(999999);

      const countAfter =
        setup.repository.findAll().length;

      assert.equal(result, null);
      assert.equal(countAfter, countBefore);
    } finally {
      cleanup(setup);
    }
  }
);


// Test 6
test(
  "partial service-type search is case-insensitive",
  () => {
    const setup = createQuerySetup();

    try {
      const matching =
        persistRequest(setup, {
          serviceType: "Barangay Clearance"
        });

      persistRequest(setup, {
        serviceType: "Permit Request"
      });

      const result =
        setup.queryService.searchServiceRequests(
          "cLeAr"
        );

      assert.equal(result.success, true);
      assert.equal(result.serviceRequests.length, 1);
      assert.equal(
        result.serviceRequests[0].id,
        matching.id
      );
    } finally {
      cleanup(setup);
    }
  }
);


// Test 7
test(
  "partial description search is case-insensitive",
  () => {
    const setup = createQuerySetup();

    try {
      const matching =
        persistRequest(setup, {
          serviceType: "Barangay Clearance",
          description:
            "Requesting clearance for employment requirements."
        });

      persistRequest(setup, {
        serviceType: "Permit Request",
        description: "Business documentation"
      });

      const result =
        setup.queryService.searchServiceRequests(
          "eMpLoYmEnT"
        );

      assert.equal(result.success, true);
      assert.equal(result.serviceRequests.length, 1);
      assert.equal(
        result.serviceRequests[0].id,
        matching.id
      );
    } finally {
      cleanup(setup);
    }
  }
);


// Test 8
test(
  "blank search returns all requests in the same order as listing",
  () => {
    const setup = createQuerySetup();

    try {
      persistRequest(setup, {
        dateRequested: "2026-09-10"
      });

      persistRequest(setup, {
        dateRequested: "2026-09-18"
      });

      persistRequest(setup, {
        dateRequested: "2026-09-15"
      });

      const listed =
        setup.queryService.listServiceRequests();

      const searched =
        setup.queryService.searchServiceRequests(
          "      "
        );

      assert.equal(searched.success, true);

      assert.deepEqual(
        searched.serviceRequests.map(
          (request) => request.id
        ),
        listed.map((request) => request.id)
      );
    } finally {
      cleanup(setup);
    }
  }
);


// Test 9
test(
  "no text match returns an empty collection",
  () => {
    const setup = createQuerySetup();

    try {
      persistRequest(setup, {
        serviceType: "Barangay Clearance",
        description: "Employment requirement"
      });

      const result =
        setup.queryService.searchServiceRequests(
          "ZzzUnknownService"
        );

      assert.equal(result.success, true);
      assert.deepEqual(result.serviceRequests, []);
    } finally {
      cleanup(setup);
    }
  }
);


// Test 10
test(
  "status filter returns only matching requests",
  () => {
    const setup = createQuerySetup();

    try {
      const pending =
        persistRequest(setup, {
          serviceType: "Barangay Clearance",
          status: "Pending"
        });

      persistRequest(setup, {
        serviceType: "Permit Request",
        status: "In Progress"
      });

      persistRequest(setup, {
        serviceType: "Certificate Request",
        status: "Completed"
      });

      const result =
        setup.queryService.searchServiceRequests(
          "",
          "Pending"
        );

      assert.equal(result.success, true);
      assert.ok(result.serviceRequests.length > 0);

      assert.ok(
        result.serviceRequests.every(
          (request) => request.status === "Pending"
        )
      );

      assert.ok(
        result.serviceRequests.some(
          (request) => request.id === pending.id
        )
      );
    } finally {
      cleanup(setup);
    }
  }
);


// Test 11
test(
  "unfiltered listing includes all four lifecycle statuses",
  () => {
    const setup = createQuerySetup();

    try {
      persistRequest(setup, {
        status: "Pending"
      });

      persistRequest(setup, {
        status: "In Progress"
      });

      persistRequest(setup, {
        status: "Completed"
      });

      persistRequest(setup, {
        status: "Cancelled"
      });

      const results =
        setup.queryService.listServiceRequests();

      const statuses =
        new Set(
          results.map((request) => request.status)
        );

      assert.deepEqual(
        [...statuses].sort(),
        [
          "Cancelled",
          "Completed",
          "In Progress",
          "Pending"
        ]
      );
    } finally {
      cleanup(setup);
    }
  }
);


// Test 12
test(
  "combined text search and status filter apply both conditions",
  () => {
    const setup = createQuerySetup();

    try {
      const matchesBoth =
        persistRequest(setup, {
          serviceType: "Barangay Clearance",
          description: "Employment requirement",
          status: "Pending"
        });

      // Matches the text but not the status.
      persistRequest(setup, {
        serviceType: "Barangay Clearance",
        description: "Scholarship requirement",
        status: "Completed"
      });

      // Matches the status but not the search term.
      persistRequest(setup, {
        serviceType: "Community Assistance",
        description: "Employment support",
        status: "Pending"
      });

      // Matches neither condition.
      persistRequest(setup, {
        serviceType: "Permit Request",
        description: "General documentation",
        status: "Cancelled"
      });

      const result =
        setup.queryService.searchServiceRequests(
          "clearance",
          "Pending"
        );

      assert.equal(result.success, true);

      assert.deepEqual(
        result.serviceRequests.map(
          (request) => request.id
        ),
        [matchesBoth.id]
      );
    } finally {
      cleanup(setup);
    }
  }
);


// Test 13
test(
  "matching request is returned only once when both fields match",
  () => {
    const setup = createQuerySetup();

    try {
      const matching =
        persistRequest(setup, {
          serviceType: "Community Assistance",
          description:
            "Assistance requested for medical support"
        });

      const result =
        setup.queryService.searchServiceRequests(
          "assistance"
        );

      assert.equal(result.success, true);
      assert.equal(result.serviceRequests.length, 1);
      assert.equal(
        result.serviceRequests[0].id,
        matching.id
      );
    } finally {
      cleanup(setup);
    }
  }
);


// Test 14
test(
  "query results preserve complete Service Request information",
  () => {
    const setup = createQuerySetup();

    try {
      const saved =
        persistRequest(setup, {
          residentId: 42,
          serviceType: "Certificate Request",
          description:
            "Certificate for employment purposes",
          dateRequested: "2026-09-18",
          status: "In Progress"
        });

      const result =
        setup.queryService.searchServiceRequests(
          "employment",
          "In Progress"
        );

      assert.equal(result.success, true);
      assert.equal(result.serviceRequests.length, 1);

      const found = result.serviceRequests[0];

      assert.equal(found.id, saved.id);
      assert.equal(found.residentId, 42);
      assert.equal(
        found.serviceType,
        "Certificate Request"
      );
      assert.equal(
        found.description,
        "Certificate for employment purposes"
      );
      assert.equal(
        found.dateRequested,
        "2026-09-18"
      );
      assert.equal(found.status, "In Progress");
    } finally {
      cleanup(setup);
    }
  }
);


// Additional test
test(
  "unsupported status filter is rejected",
  () => {
    const setup = createQuerySetup();

    try {
      persistRequest(setup);

      const result =
        setup.queryService.searchServiceRequests(
          "",
          "Approved"
        );

      assert.equal(result.success, false);
      assert.equal(result.unsupportedStatus, true);
      assert.ok(result.errors.includes("status"));
      assert.deepEqual(result.serviceRequests, []);
    } finally {
      cleanup(setup);
    }
  }
);