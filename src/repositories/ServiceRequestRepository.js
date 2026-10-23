import { ServiceRequest } from "../models/ServiceRequest.js";

export class ServiceRequestRepository {
  constructor(database) {
    this.database = database;
  }

  save(serviceRequest) {
    const statement = this.database.prepare(`
      INSERT INTO service_requests (
        resident_id,
        service_type,
        description,
        date_requested,
        status
      )
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = statement.run(
      serviceRequest.residentId,
      serviceRequest.serviceType,
      serviceRequest.description,
      serviceRequest.dateRequested,
      serviceRequest.status
    );

    serviceRequest.id =
      Number(result.lastInsertRowid);

    return serviceRequest;
  }

  findById(serviceRequestId) {
    const statement = this.database.prepare(`
      SELECT
        id,
        resident_id,
        service_type,
        description,
        date_requested,
        status
      FROM service_requests
      WHERE id = ?
    `);

    const row =
      statement.get(serviceRequestId);

    if (!row) {
      return null;
    }

    return this.toServiceRequest(row);
  }

  updateStatus(serviceRequestId, status) {
    const statement = this.database.prepare(`
      UPDATE service_requests
      SET status = ?
      WHERE id = ?
    `);

    statement.run(
      status,
      serviceRequestId
    );

    return this.findById(serviceRequestId);
  }

  toServiceRequest(row) {
    return new ServiceRequest({
      id: Number(row.id),
      residentId: Number(row.resident_id),
      serviceType: row.service_type,
      description: row.description,
      dateRequested: row.date_requested,
      status: row.status
    });
  }

  findAll() {
  const statement = this.database.prepare(`
    SELECT
      id,
      resident_id,
      service_type,
      description,
      date_requested,
      status
    FROM service_requests
    ORDER BY
      date_requested DESC,
      id DESC
  `);

  const rows = statement.all();

  return rows.map(
    (row) => this.toServiceRequest(row)
  );
}

  searchAndFilter(searchTerm = "", statusFilter = null) {
  const conditions = [];
  const parameters = [];

  const normalizedSearchTerm =
    String(searchTerm ?? "").trim();

  if (normalizedSearchTerm !== "") {
    const pattern = `%${normalizedSearchTerm}%`;

    conditions.push(`
      (
        LOWER(service_type) LIKE LOWER(?)
        OR LOWER(description) LIKE LOWER(?)
      )
    `);

    parameters.push(pattern, pattern);
  }

  if (
    statusFilter !== null &&
    statusFilter !== undefined &&
    statusFilter !== ""
  ) {
    conditions.push("status = ?");
    parameters.push(statusFilter);
  }

  let sql = `
    SELECT
      id,
      resident_id,
      service_type,
      description,
      date_requested,
      status
    FROM service_requests
  `;

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }

  sql += `
    ORDER BY
      date_requested DESC,
      id DESC
  `;

  const statement = this.database.prepare(sql);

  const rows = statement.all(...parameters);

  return rows.map(
    (row) => this.toServiceRequest(row)
  );
}
  
  close() {
    this.database.close();
  }
}