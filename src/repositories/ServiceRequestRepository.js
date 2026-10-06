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

  close() {
    this.database.close();
  }
}