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


function createTemporaryDatabasePath() {
  const fileName =
    `csms-t05-${crypto.randomUUID()}.sqlite`;

  return path.join(
    os.tmpdir(),
    fileName
  );
}


function createQuerySetup() {
  const databasePath =
    createTemporaryDatabasePath();

  const database =
    createDatabase(databasePath);

  const repository =
    new ResidentRepository(database);

  const service =
    new ResidentQueryService(repository);

  return {
    databasePath,
    repository,
    service
  };
}


function makeResident({
  firstName,
  lastName,
  status = "Active"
}) {
  return new Resident({
    firstName,
    lastName,
    address: "Barangay Santo Tomas",
    contactNumber: "09171234567",
    email: `${firstName.toLowerCase()}@example.com`,
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
  "listResidents returns all persisted Residents",
  () => {
    const {
      databasePath,
      repository,
      service
    } = createQuerySetup();

    try {
      repository.save(
        makeResident({
          firstName: "Juan",
          lastName: "Dela Cruz"
        })
      );

      repository.save(
        makeResident({
          firstName: "Maria",
          lastName: "Santos"
        })
      );

      const residents =
        service.listResidents();

      assert.equal(
        residents.length,
        2
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);

test(
  "listResidents returns an empty collection when no Residents exist",
  () => {
    const {
      databasePath,
      repository,
      service
    } = createQuerySetup();

    try {
      const residents =
        service.listResidents();

      assert.deepEqual(
        residents,
        []
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);

test(
  "listResidents orders Residents by last name, first name, then id",
  () => {
    const {
      databasePath,
      repository,
      service
    } = createQuerySetup();

    try {
      repository.save(
        makeResident({
          firstName: "Pedro",
          lastName: "Cruz"
        })
      );

      repository.save(
        makeResident({
          firstName: "Juan",
          lastName: "Dela Cruz"
        })
      );

      repository.save(
        makeResident({
          firstName: "Ana",
          lastName: "Cruz"
        })
      );

      const residents =
        service.listResidents();

      assert.deepEqual(
        residents.map(
          (resident) =>
            `${resident.lastName}, ${resident.firstName}`
        ),
        [
          "Cruz, Ana",
          "Cruz, Pedro",
          "Dela Cruz, Juan"
        ]
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "searchResidents finds partial matches in first name",
  () => {
    const {
      databasePath,
      repository,
      service
    } = createQuerySetup();

    try {
      repository.save(
        makeResident({
          firstName: "Juan",
          lastName: "Dela Cruz"
        })
      );

      const residents =
        service.searchResidents("Jua");

      assert.equal(
        residents.length,
        1
      );

      assert.equal(
        residents[0].firstName,
        "Juan"
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "searchResidents finds partial matches in last name",
  () => {
    const {
      databasePath,
      repository,
      service
    } = createQuerySetup();

    try {
      repository.save(
        makeResident({
          firstName: "Juan",
          lastName: "Dela Cruz"
        })
      );

      const residents =
        service.searchResidents("Del");

      assert.equal(
        residents.length,
        1
      );

      assert.equal(
        residents[0].lastName,
        "Dela Cruz"
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "searchResidents is case-insensitive",
  () => {
    const {
      databasePath,
      repository,
      service
    } = createQuerySetup();

    try {
      repository.save(
        makeResident({
          firstName: "Juan",
          lastName: "Dela Cruz"
        })
      );

      const residents =
        service.searchResidents("jUaN");

      assert.equal(
        residents.length,
        1
      );

      assert.equal(
        residents[0].firstName,
        "Juan"
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "searchResidents ignores leading and trailing spaces",
  () => {
    const {
      databasePath,
      repository,
      service
    } = createQuerySetup();

    try {
      repository.save(
        makeResident({
          firstName: "Juan",
          lastName: "Dela Cruz"
        })
      );

      const residents =
        service.searchResidents("  Juan  ");

      assert.equal(
        residents.length,
        1
      );

      assert.equal(
        residents[0].firstName,
        "Juan"
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "blank search returns all Residents",
  () => {
    const {
      databasePath,
      repository,
      service
    } = createQuerySetup();

    try {
      repository.save(
        makeResident({
          firstName: "Juan",
          lastName: "Dela Cruz"
        })
      );

      repository.save(
        makeResident({
          firstName: "Maria",
          lastName: "Santos"
        })
      );

      const residents =
        service.searchResidents("   ");

      assert.equal(
        residents.length,
        2
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "search results preserve Resident information",
  () => {
    const {
      databasePath,
      repository,
      service
    } = createQuerySetup();

    try {
      const resident =
        makeResident({
        firstName: "Juan",
        lastName: "Dela Cruz"
        });

      repository.save(resident);

      const results =
        service.searchResidents("Juan");

      assert.equal(results.length, 1);

      const foundResident = results[0];

      assert.equal(
        foundResident.id,
        resident.id
      );

      assert.equal(
        foundResident.firstName,
        "Juan"
      );

      assert.equal(
        foundResident.lastName,
        "Dela Cruz"
      );

      assert.equal(
        foundResident.address,
        "Barangay Santo Tomas"
      );

      assert.equal(
        foundResident.contactNumber,
        "09171234567"
      );

      assert.equal(
        foundResident.email,
        "juan@example.com"
      );

      assert.equal(
        foundResident.status,
        "Active"
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "searchResidents returns an empty collection when there is no match",
  () => {
    const {
      databasePath,
      repository,
      service
    } = createQuerySetup();

    try {
      repository.save(
        makeResident({
          firstName: "Juan",
          lastName: "Dela Cruz"
        })
      );

      const residents =
        service.searchResidents(
          "ZzzUnknownResident"
        );

      assert.deepEqual(
        residents,
        []
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "searchResidents includes both Active and Inactive Residents",
  () => {
    const {
      databasePath,
      repository,
      service
    } = createQuerySetup();

    try {
      repository.save(
        makeResident({
          firstName: "Juan",
          lastName: "Dela Cruz",
          status: "Active"
        })
      );

      repository.save(
        makeResident({
          firstName: "Juana",
          lastName: "Santos",
          status: "Inactive"
        })
      );

      const residents =
        service.searchResidents("Juan");

      assert.equal(
        residents.length,
        2
      );

      assert.deepEqual(
        residents.map(
          (resident) => resident.status
        ).sort(),
        [
          "Active",
          "Inactive"
        ]
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);


test(
  "searchResidents returns each matching Resident only once",
  () => {
    const {
      databasePath,
      repository,
      service
    } = createQuerySetup();

    try {
      repository.save(
        makeResident({
          firstName: "Cruz",
          lastName: "Cruz"
        })
      );

      const residents =
        service.searchResidents("Cruz");

      assert.equal(
        residents.length,
        1
      );
    } finally {
      cleanup(databasePath, repository);
    }
  }
);