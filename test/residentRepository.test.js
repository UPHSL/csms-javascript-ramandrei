import assert from "node:assert/strict";
import test from "node:test";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { createDatabase } from "../src/database/database.js";
import { Resident } from "../src/models/Resident.js";
import { ResidentRepository } from "../src/repositories/ResidentRepository.js";

function createTestDatabase() {
  const testDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "csms-resident-test-")
  );

  const databasePath = path.join(testDirectory, "test.db");

  const database = createDatabase(databasePath);

  return {
    database,
    databasePath,
    testDirectory
  };
}

function cleanupTestDatabase(database, testDirectory) {
  database.close();

  fs.rmSync(testDirectory, {
    recursive: true,
    force: true
  });
}

function createValidResident() {
  return new Resident({
    firstName: "Juan",
    lastName: "Dela Cruz",
    address: "Barangay Santo Tomas",
    contactNumber: "09171234567",
    email: "juan@example.com",
    status: "Active"
  });
}

test("resident can be persisted", () => {
  const {
    database,
    testDirectory
  } = createTestDatabase();

  try {
    const repository = new ResidentRepository(database);
    const resident = createValidResident();

    repository.save(resident);

    assert.ok(resident.id !== null);
  } finally {
    cleanupTestDatabase(database, testDirectory);
  }
});

test("resident receives a database-generated identifier", () => {
  const {
    database,
    testDirectory
  } = createTestDatabase();

  try {
    const repository = new ResidentRepository(database);
    const resident = createValidResident();

    assert.equal(resident.id, null);

    repository.save(resident);

    assert.equal(typeof resident.id, "number");
    assert.ok(resident.id > 0);
  } finally {
    cleanupTestDatabase(database, testDirectory);
  }
});

test("resident can be retrieved by identifier", () => {
  const {
    database,
    testDirectory
  } = createTestDatabase();

  try {
    const repository = new ResidentRepository(database);
    const resident = createValidResident();

    repository.save(resident);

    const retrievedResident = repository.findById(resident.id);

    assert.ok(retrievedResident instanceof Resident);
    assert.equal(retrievedResident.id, resident.id);
  } finally {
    cleanupTestDatabase(database, testDirectory);
  }
});

test("resident information is preserved after persistence", () => {
  const {
    database,
    testDirectory
  } = createTestDatabase();

  try {
    const repository = new ResidentRepository(database);
    const resident = createValidResident();

    repository.save(resident);

    const retrievedResident = repository.findById(resident.id);

    assert.equal(retrievedResident.firstName, "Juan");
    assert.equal(retrievedResident.lastName, "Dela Cruz");
    assert.equal(
      retrievedResident.address,
      "Barangay Santo Tomas"
    );
    assert.equal(
      retrievedResident.contactNumber,
      "09171234567"
    );
    assert.equal(
      retrievedResident.email,
      "juan@example.com"
    );
    assert.equal(retrievedResident.status, "Active");
  } finally {
    cleanupTestDatabase(database, testDirectory);
  }
});

test("active resident status is preserved after persistence", () => {
  const {
    database,
    testDirectory
  } = createTestDatabase();

  try {
    const repository = new ResidentRepository(database);

    const resident = new Resident({
      firstName: "Maria",
      lastName: "Santos",
      address: "Barangay Santo Tomas",
      contactNumber: "09181234567",
      email: "maria@example.com",
      status: "Active"
    });

    repository.save(resident);

    const retrievedResident = repository.findById(resident.id);

    assert.equal(retrievedResident.status, "Active");
  } finally {
    cleanupTestDatabase(database, testDirectory);
  }
});

test("findById returns null when resident does not exist", () => {
  const {
    database,
    testDirectory
  } = createTestDatabase();

  try {
    const repository = new ResidentRepository(database);

    const result = repository.findById(999999);

    assert.equal(result, null);
  } finally {
    cleanupTestDatabase(database, testDirectory);
  }
});

test("resident persists across separate repository instances", () => {
  const tempDir = mkdtempSync(
    join(tmpdir(), "csms-resident-test-")
  );

  const databasePath = join(tempDir, "residents.sqlite");

  const database1 = new DatabaseSync(databasePath);

  database1.exec(`
    CREATE TABLE IF NOT EXISTS residents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      address TEXT NOT NULL,
      contact_number TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT NOT NULL
    )
  `);

  const repository1 = new ResidentRepository(database1);

  const resident = new Resident({
    firstName: "Juan",
    lastName: "Dela Cruz",
    address: "Barangay Santo Tomas",
    contactNumber: "09171234567",
    email: "juan@example.com"
  });

  repository1.save(resident);

  const residentId = resident.id;

  repository1.close();

  const database2 = new DatabaseSync(databasePath);
  const repository2 = new ResidentRepository(database2);

  const retrieved = repository2.findById(residentId);

  assert.ok(retrieved);
  assert.equal(retrieved.id, residentId);
  assert.equal(retrieved.firstName, "Juan");
  assert.equal(retrieved.lastName, "Dela Cruz");
  assert.equal(retrieved.address, "Barangay Santo Tomas");
  assert.equal(retrieved.contactNumber, "09171234567");
  assert.equal(retrieved.email, "juan@example.com");
  assert.equal(retrieved.status, "Active");

  repository2.close();

  rmSync(tempDir, { recursive: true, force: true });
});

test("multiple residents can be persisted independently", () => {
  const {
    database,
    testDirectory
  } = createTestDatabase();

  try {
    const repository = new ResidentRepository(database);

    const residentOne = new Resident({
      firstName: "Juan",
      lastName: "Dela Cruz",
      address: "Barangay Santo Tomas",
      contactNumber: "09171234567",
      email: "juan@example.com",
      status: "Active"
    });

    const residentTwo = new Resident({
      firstName: "Maria",
      lastName: "Santos",
      address: "Barangay San Jose",
      contactNumber: "09181234567",
      email: "maria@example.com",
      status: "Inactive"
    });

    repository.save(residentOne);
    repository.save(residentTwo);

    const retrievedOne = repository.findById(residentOne.id);
    const retrievedTwo = repository.findById(residentTwo.id);

    assert.notEqual(retrievedOne.id, retrievedTwo.id);

    assert.equal(retrievedOne.firstName, "Juan");
    assert.equal(retrievedTwo.firstName, "Maria");

    assert.equal(
      retrievedOne.contactNumber,
      "09171234567"
    );

    assert.equal(
      retrievedTwo.contactNumber,
      "09181234567"
    );
  } finally {
    cleanupTestDatabase(database, testDirectory);
  }
});