import test from "node:test";
import assert from "node:assert/strict";

import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";

import { createDatabase } from "../src/database/database.js";
import { Resident } from "../src/models/Resident.js";
import { ResidentRepository } from "../src/repositories/ResidentRepository.js";
import ResidentQueryService
  from "../src/services/ResidentQueryService.js";
import ResidentDeactivationService
  from "../src/services/ResidentDeactivationService.js";


function createTemporaryDatabasePath() {
  const fileName =
    `csms-t07-${crypto.randomUUID()}.sqlite`;

  return path.join(
    os.tmpdir(),
    fileName
  );
}


function createDeactivationSetup() {
  const databasePath =
    createTemporaryDatabasePath();

  const database =
    createDatabase(databasePath);

  const repository =
    new ResidentRepository(database);

  const queryService =
    new ResidentQueryService(repository);

  const deactivationService =
    new ResidentDeactivationService(repository);

  return {
    databasePath,
    repository,
    queryService,
    deactivationService
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


function cleanup(databasePath, repository) {
  repository.close();

  if (fs.existsSync(databasePath)) {
    fs.unlinkSync(databasePath);
  }
}


test(
  "Active Resident can be deactivated",
  () => {
    const {
      databasePath,
      repository,
      deactivationService
    } = createDeactivationSetup();

    try {
      const resident =
        repository.save(
          makeResident({
            status: "Active"
          })
        );

      const result =
        deactivationService.deactivateResident(
          resident.id
        );

      assert.equal(
        result.success,
        true
      );

      assert.ok(
        result.resident
      );

      assert.equal(
        result.resident.status,
        "Inactive"
      );

      assert.equal(
        result.alreadyInactive,
        false
      );

      assert.equal(
        result.notFound,
        false
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "Resident status becomes Inactive in persistence",
  () => {
    const {
      databasePath,
      repository,
      deactivationService
    } = createDeactivationSetup();

    try {
      const resident =
        repository.save(
          makeResident({
            status: "Active"
          })
        );

      deactivationService.deactivateResident(
        resident.id
      );

      const storedResident =
        repository.findById(
          resident.id
        );

      assert.ok(
        storedResident
      );

      assert.equal(
        storedResident.status,
        "Inactive"
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "Resident ID is preserved after deactivation",
  () => {
    const {
      databasePath,
      repository,
      deactivationService
    } = createDeactivationSetup();

    try {
      const resident =
        repository.save(
          makeResident()
        );

      const originalId =
        resident.id;

      const result =
        deactivationService.deactivateResident(
          originalId
        );

      assert.equal(
        result.success,
        true
      );

      assert.equal(
        result.resident.id,
        originalId
      );

      const storedResident =
        repository.findById(
          originalId
        );

      assert.equal(
        storedResident.id,
        originalId
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "Resident information is preserved during deactivation",
  () => {
    const {
      databasePath,
      repository,
      deactivationService
    } = createDeactivationSetup();

    try {
      const resident =
        repository.save(
          makeResident({
            firstName: "Juan",
            lastName: "Dela Cruz",
            address: "Barangay Santo Tomas",
            contactNumber: "09171234567",
            email: "juan@example.com",
            status: "Active"
          })
        );

      deactivationService.deactivateResident(
        resident.id
      );

      const storedResident =
        repository.findById(
          resident.id
        );

      assert.equal(
        storedResident.firstName,
        "Juan"
      );

      assert.equal(
        storedResident.lastName,
        "Dela Cruz"
      );

      assert.equal(
        storedResident.address,
        "Barangay Santo Tomas"
      );

      assert.equal(
        storedResident.contactNumber,
        "09171234567"
      );

      assert.equal(
        storedResident.email,
        "juan@example.com"
      );

      assert.equal(
        storedResident.status,
        "Inactive"
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "Deactivated Resident remains persisted and retrievable",
  () => {
    const {
      databasePath,
      repository,
      deactivationService
    } = createDeactivationSetup();

    try {
      const resident =
        repository.save(
          makeResident({
            status: "Active"
          })
        );

      deactivationService.deactivateResident(
        resident.id
      );

      const storedResident =
        repository.findById(
          resident.id
        );

      assert.ok(
        storedResident
      );

      assert.equal(
        storedResident.id,
        resident.id
      );

      assert.equal(
        storedResident.status,
        "Inactive"
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "Deactivated Resident remains available through T05 querying",
  () => {
    const {
      databasePath,
      repository,
      queryService,
      deactivationService
    } = createDeactivationSetup();

    try {
      const resident =
        repository.save(
          makeResident({
            firstName: "Juan",
            lastName: "Dela Cruz",
            status: "Active"
          })
        );

      deactivationService.deactivateResident(
        resident.id
      );

      const results =
        queryService.searchResidents(
          "Juan"
        );

      assert.equal(
        results.length,
        1
      );

      assert.equal(
        results[0].id,
        resident.id
      );

      assert.equal(
        results[0].status,
        "Inactive"
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "Already-Inactive Resident is handled safely",
  () => {
    const {
      databasePath,
      repository,
      deactivationService
    } = createDeactivationSetup();

    try {
      const resident =
        repository.save(
          makeResident({
            firstName: "Maria",
            lastName: "Santos",
            address: "Barangay Malabanan",
            contactNumber: "09181234567",
            email: "maria@example.com",
            status: "Inactive"
          })
        );

      const result =
        deactivationService.deactivateResident(
          resident.id
        );

      const storedResident =
        repository.findById(
          resident.id
        );

      assert.equal(
        result.success,
        true
      );

      assert.equal(
        result.alreadyInactive,
        true
      );

      assert.equal(
        result.notFound,
        false
      );

      assert.equal(
        storedResident.id,
        resident.id
      );

      assert.equal(
        storedResident.status,
        "Inactive"
      );

      assert.equal(
        storedResident.firstName,
        "Maria"
      );

      assert.equal(
        storedResident.lastName,
        "Santos"
      );

      assert.equal(
        storedResident.address,
        "Barangay Malabanan"
      );

      assert.equal(
        storedResident.contactNumber,
        "09181234567"
      );

      assert.equal(
        storedResident.email,
        "maria@example.com"
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "Nonexistent Resident is handled safely",
  () => {
    const {
      databasePath,
      repository,
      deactivationService
    } = createDeactivationSetup();

    try {
      const result =
        deactivationService.deactivateResident(
          999999
        );

      assert.equal(
        result.success,
        false
      );

      assert.equal(
        result.resident,
        null
      );

      assert.equal(
        result.notFound,
        true
      );

      assert.equal(
        result.alreadyInactive,
        false
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "Nonexistent deactivation does not create or delete records",
  () => {
    const {
      databasePath,
      repository,
      queryService,
      deactivationService
    } = createDeactivationSetup();

    try {
      repository.save(
        makeResident({
          firstName: "Juan",
          lastName: "Cruz"
        })
      );

      repository.save(
        makeResident({
          firstName: "Maria",
          lastName: "Santos"
        })
      );

      const residentsBefore =
        queryService.listResidents();

      const result =
        deactivationService.deactivateResident(
          999999
        );

      const residentsAfter =
        queryService.listResidents();

      assert.equal(
        result.notFound,
        true
      );

      assert.equal(
        residentsAfter.length,
        residentsBefore.length
      );

      assert.deepEqual(
        residentsAfter.map(
          (resident) => ({
            id: resident.id,
            firstName: resident.firstName,
            lastName: resident.lastName,
            status: resident.status
          })
        ),
        residentsBefore.map(
          (resident) => ({
            id: resident.id,
            firstName: resident.firstName,
            lastName: resident.lastName,
            status: resident.status
          })
        )
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "Deactivating one Resident does not affect another",
  () => {
    const {
      databasePath,
      repository,
      deactivationService
    } = createDeactivationSetup();

    try {
      const firstResident =
        repository.save(
          makeResident({
            firstName: "Juan",
            lastName: "Cruz",
            address: "Barangay Santo Tomas",
            contactNumber: "09171234567",
            email: "juan@example.com",
            status: "Active"
          })
        );

      const secondResident =
        repository.save(
          makeResident({
            firstName: "Maria",
            lastName: "Santos",
            address: "Barangay Malabanan",
            contactNumber: "09181234567",
            email: "maria@example.com",
            status: "Active"
          })
        );

      deactivationService.deactivateResident(
        firstResident.id
      );

      const storedFirstResident =
        repository.findById(
          firstResident.id
        );

      const storedSecondResident =
        repository.findById(
          secondResident.id
        );

      assert.equal(
        storedFirstResident.status,
        "Inactive"
      );

      assert.equal(
        storedSecondResident.status,
        "Active"
      );

      assert.equal(
        storedSecondResident.firstName,
        "Maria"
      );

      assert.equal(
        storedSecondResident.lastName,
        "Santos"
      );

      assert.equal(
        storedSecondResident.address,
        "Barangay Malabanan"
      );

      assert.equal(
        storedSecondResident.contactNumber,
        "09181234567"
      );

      assert.equal(
        storedSecondResident.email,
        "maria@example.com"
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);