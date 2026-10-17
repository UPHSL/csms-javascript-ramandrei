const SUPPORTED_STATUSES = new Set([
  "Pending",
  "In Progress",
  "Completed",
  "Cancelled"
]);

export default class ServiceRequestQueryService {
  constructor(repository) {
    this.repository = repository;
  }

  listServiceRequests() {
    return this.repository.findAll();
  }

  viewServiceRequest(serviceRequestId) {
    return this.repository.findById(
      serviceRequestId
    );
  }

  searchServiceRequests(
    searchTerm = "",
    statusFilter = null
  ) {
    const normalizedSearchTerm =
      String(searchTerm ?? "").trim();

    const hasStatusFilter =
      statusFilter !== null &&
      statusFilter !== undefined &&
      statusFilter !== "";

    if (
      hasStatusFilter &&
      !SUPPORTED_STATUSES.has(statusFilter)
    ) {
      return {
        success: false,
        serviceRequests: [],
        errors: ["status"],
        unsupportedStatus: true
      };
    }

    const normalizedStatusFilter =
      hasStatusFilter ? statusFilter : null;

    let serviceRequests;

    if (
      normalizedSearchTerm === "" &&
      normalizedStatusFilter === null
    ) {
      serviceRequests =
        this.listServiceRequests();
    } else {
      serviceRequests =
        this.repository.searchAndFilter(
          normalizedSearchTerm,
          normalizedStatusFilter
        );
    }

    return {
      success: true,
      serviceRequests,
      errors: [],
      unsupportedStatus: false
    };
  }
}