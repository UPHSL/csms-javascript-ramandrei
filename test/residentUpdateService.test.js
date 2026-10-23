import test from "node:test";
import assert from "node:assert/strict";

import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";

import { createDatabase } from "../src/database/database.js";
import { Resident } from "../src/models/Resident.js";
import { ResidentValidator } from "../src/services/ResidentValidator.js";
import { ResidentRepository } from "../src/repositories/ResidentRepository.js";
import ResidentQueryService
  from "../src/services/ResidentQueryService.js";
import ResidentUpdateService
  from "../src/services/ResidentUpdateService.js";


function createTemporaryDatabasePath() {
  const fileName =
    `csms-t06-${crypto.randomUUID()}.sqlite`;

  return path.join(
    os.tmpdir(),
    fileName
  );
}


function createUpdateSetup() {
  const databasePath =
    createTemporaryDatabasePath();

  const database =
    createDatabase(databasePath);

  const repository =
    new ResidentRepository(database);

  const validator =
    new ResidentValidator();

  const queryService =
    new ResidentQueryService(repository);

  const updateService =
    new ResidentUpdateService(
      validator,
      repository
    );

  return {
    databasePath,
    repository,
    queryService,
    updateService
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
  "valid Resident update succeeds",
  () => {
    const {
      databasePath,
      repository,
      updateService
    } = createUpdateSetup();

    try {
      const resident =
        repository.save(
          makeResident()
        );

      const result =
        updateService.updateResident(
          resident.id,
          {
            firstName: "Juan Miguel",
            lastName: "Dela Cruz",
            address: "Barangay San Antonio",
            contactNumber: "09181234567",
            email: "juan.miguel@example.com"
          }
        );

      assert.equal(
        result.success,
        true
      );

      assert.ok(
        result.resident
      );

      assert.deepEqual(
        result.errors,
        []
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
  "Resident ID is preserved after update",
  () => {
    const {
      databasePath,
      repository,
      updateService
    } = createUpdateSetup();

    try {
      const resident =
        repository.save(
          makeResident()
        );

      const originalId =
        resident.id;

      const result =
        updateService.updateResident(
          originalId,
          {
            firstName: "Maria",
            lastName: "Santos",
            address: "Barangay San Antonio",
            contactNumber: "09181234567",
            email: "maria@example.com"
          }
        );

      assert.equal(
        result.success,
        true
      );

      assert.equal(
        result.resident.id,
        originalId
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "permitted Resident information is persisted",
  () => {
    const {
      databasePath,
      repository,
      updateService
    } = createUpdateSetup();

    try {
      const resident =
        repository.save(
          makeResident()
        );

      const result =
        updateService.updateResident(
          resident.id,
          {
            firstName: "Maria",
            lastName: "Santos",
            address: "Barangay San Antonio",
            contactNumber: "09181234567",
            email: "maria@example.com"
          }
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
        storedResident.firstName,
        "Maria"
      );

      assert.equal(
        storedResident.lastName,
        "Santos"
      );

      assert.equal(
        storedResident.address,
        "Barangay San Antonio"
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
  "Resident status is preserved during update",
  () => {
    const {
      databasePath,
      repository,
      updateService
    } = createUpdateSetup();

    try {
      const activeResident =
        repository.save(
          makeResident({
            firstName: "Juan",
            lastName: "Cruz",
            status: "Active"
          })
        );

      const inactiveResident =
        repository.save(
          makeResident({
            firstName: "Maria",
            lastName: "Santos",
            status: "Inactive"
          })
        );

      const activeResult =
        updateService.updateResident(
          activeResident.id,
          {
            firstName: "Juan Miguel",
            lastName: "Dela Cruz",
            address: "Barangay San Antonio",
            contactNumber: "09181234567",
            email: "juan.miguel@example.com"
          }
        );

      const inactiveResult =
        updateService.updateResident(
          inactiveResident.id,
          {
            firstName: "Maria Anne",
            lastName: "Santos",
            address: "Barangay Santo Tomas",
            contactNumber: "09191234567",
            email: "maria.anne@example.com"
          }
        );

      assert.equal(
        activeResult.resident.status,
        "Active"
      );

      assert.equal(
        inactiveResult.resident.status,
        "Inactive"
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "invalid Resident update fails",
  () => {
    const {
      databasePath,
      repository,
      updateService
    } = createUpdateSetup();

    try {
      const resident =
        repository.save(
          makeResident()
        );

      const result =
        updateService.updateResident(
          resident.id,
          {
            firstName: "",
            lastName: "Dela Cruz",
            address: "Barangay Santo Tomas",
            contactNumber: "09181234567",
            email: "juan@example.com"
          }
        );

      assert.equal(
        result.success,
        false
      );

      assert.equal(
        result.resident,
        null
      );

      assert.ok(
        result.errors.includes("firstName")
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
  "invalid update does not modify persisted information",
  () => {
    const {
      databasePath,
      repository,
      updateService
    } = createUpdateSetup();

    try {
      const resident =
        repository.save(
          makeResident()
        );

      const result =
        updateService.updateResident(
          resident.id,
          {
            firstName: "",
            lastName: "Changed",
            address: "Changed Address",
            contactNumber: "ABC",
            email: "invalid"
          }
        );

      const storedResident =
        repository.findById(
          resident.id
        );

      assert.equal(
        result.success,
        false
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
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "updating a nonexistent Resident returns not found",
  () => {
    const {
      databasePath,
      repository,
      updateService
    } = createUpdateSetup();

    try {
      const result =
        updateService.updateResident(
          999999,
          {
            firstName: "Maria",
            lastName: "Santos",
            address: "Barangay San Antonio",
            contactNumber: "09181234567",
            email: "maria@example.com"
          }
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

      assert.deepEqual(
        result.errors,
        []
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "updating a nonexistent Resident does not create a Resident",
  () => {
    const {
      databasePath,
      repository,
      queryService,
      updateService
    } = createUpdateSetup();

    try {
      repository.save(
        makeResident()
      );

      const countBefore =
        queryService.listResidents().length;

      const result =
        updateService.updateResident(
          999999,
          {
            firstName: "Maria",
            lastName: "Santos",
            address: "Barangay San Antonio",
            contactNumber: "09181234567",
            email: "maria@example.com"
          }
        );

      const countAfter =
        queryService.listResidents().length;

      assert.equal(
        result.notFound,
        true
      );

      assert.equal(
        countAfter,
        countBefore
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "updated Resident is visible through T05 querying",
  () => {
    const {
      databasePath,
      repository,
      queryService,
      updateService
    } = createUpdateSetup();

    try {
      const resident =
        repository.save(
          makeResident({
            firstName: "Juan",
            lastName: "Cruz"
          })
        );

      updateService.updateResident(
        resident.id,
        {
          firstName: "Miguel",
          lastName: "Santos",
          address: "Barangay San Antonio",
          contactNumber: "09181234567",
          email: "miguel@example.com"
        }
      );

      const oldSearch =
        queryService.searchResidents("Juan");

      const newSearch =
        queryService.searchResidents("Miguel");

      assert.equal(
        oldSearch.length,
        0
      );

      assert.equal(
        newSearch.length,
        1
      );

      assert.equal(
        newSearch[0].id,
        resident.id
      );

      assert.equal(
        newSearch[0].firstName,
        "Miguel"
      );

      assert.equal(
        newSearch[0].lastName,
        "Santos"
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "updated information and contact number are preserved",
  () => {
    const {
      databasePath,
      repository,
      updateService
    } = createUpdateSetup();

    try {
      const resident =
        repository.save(
          makeResident({
            status: "Active"
          })
        );

      const originalId =
        resident.id;

      const result =
        updateService.updateResident(
          originalId,
          {
            firstName: "Ana",
            lastName: "Reyes",
            address: "Barangay Malabanan",
            contactNumber: "09181234567",
            email: "ana.reyes@example.com"
          }
        );

      const storedResident =
        repository.findById(
          originalId
        );

      assert.equal(
        storedResident.id,
        originalId
      );

      assert.equal(
        storedResident.firstName,
        "Ana"
      );

      assert.equal(
        storedResident.lastName,
        "Reyes"
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
        "ana.reyes@example.com"
      );

      assert.equal(
        storedResident.status,
        "Active"
      );

      assert.equal(
        result.resident.contactNumber,
        "09181234567"
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);