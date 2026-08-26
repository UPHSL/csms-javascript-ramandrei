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

  close() {
    this.database.close();
  }
}