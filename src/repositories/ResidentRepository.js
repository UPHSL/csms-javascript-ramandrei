import { Resident } from "../models/Resident.js";

export class ResidentRepository {
  constructor(database) {
    this.database = database;
  }

  save(resident) {
    const statement = this.database.prepare(`
      INSERT INTO residents (
        first_name,
        last_name,
        address,
        contact_number,
        email,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = statement.run(
      resident.firstName,
      resident.lastName,
      resident.address,
      resident.contactNumber,
      resident.email,
      resident.status
    );

    resident.id = Number(result.lastInsertRowid);

    return resident;
  }

  findById(residentId) {
    const statement = this.database.prepare(`
      SELECT
        id,
        first_name,
        last_name,
        address,
        contact_number,
        email,
        status
      FROM residents
      WHERE id = ?
    `);

    const row = statement.get(residentId);

    if (!row) {
      return null;
    }

    return new Resident({
      id: Number(row.id),
      firstName: row.first_name,
      lastName: row.last_name,
      address: row.address,
      contactNumber: row.contact_number,
      email: row.email,
      status: row.status
    });
  }

  findAll() {
    const statement = this.database.prepare(`
      SELECT
        id,
        first_name,
        last_name,
        address,
        contact_number,
        email,
        status
      FROM residents
      ORDER BY
        LOWER(last_name) ASC,
        LOWER(first_name) ASC,
        id ASC
    `);

    const rows = statement.all();

    return rows.map((row) => this.toResident(row));
  }

  searchByName(searchTerm) {
    const pattern = `%${searchTerm}%`;

    const statement = this.database.prepare(`
      SELECT
        id,
        first_name,
        last_name,
        address,
        contact_number,
        email,
        status
      FROM residents
      WHERE
        LOWER(first_name) LIKE LOWER(?)
        OR LOWER(last_name) LIKE LOWER(?)
      ORDER BY
        LOWER(last_name) ASC,
        LOWER(first_name) ASC,
        id ASC
    `);

    const rows = statement.all(pattern, pattern);

    return rows.map((row) => this.toResident(row));
  }

  toResident(row) {
    return new Resident({
      id: Number(row.id),
      firstName: row.first_name,
      lastName: row.last_name,
      address: row.address,
      contactNumber: row.contact_number,
      email: row.email,
      status: row.status
    });
  }

  close() {
    this.database.close();
  }
}