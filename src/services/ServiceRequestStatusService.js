const SUPPORTED_STATUSES = new Set([
  "Pending",
  "In Progress",
  "Completed",
  "Cancelled"
]);

const ALLOWED_TRANSITIONS = {
  Pending: new Set([
    "In Progress",
    "Cancelled"
  ]),
  "In Progress": new Set([
    "Completed",
    "Cancelled"
  ]),
  Completed: new Set(),
  Cancelled: new Set()
};

export default class ServiceRequestStatusService {
  constructor(repository) {
    this.repository = repository;
  }

  updateStatus(serviceRequestId, requestedStatus) {
    const serviceRequest =
      this.repository.findById(
        serviceRequestId
      );

    if (!serviceRequest) {
      return {
        success: false,
        serviceRequest: null,
        notFound: true,
        unsupportedStatus: false,
        invalidTransition: false
      };
    }

    if (!SUPPORTED_STATUSES.has(requestedStatus)) {
      return {
        success: false,
        serviceRequest: null,
        notFound: false,
        unsupportedStatus: true,
        invalidTransition: false
      };
    }

    const allowedTargets =
      ALLOWED_TRANSITIONS[
        serviceRequest.status
      ];

    if (!allowedTargets.has(requestedStatus)) {
      return {
        success: false,
        serviceRequest: null,
        notFound: false,
        unsupportedStatus: false,
        invalidTransition: true
      };
    }

    const updatedServiceRequest =
      this.repository.updateStatus(
        serviceRequestId,
        requestedStatus
      );

    return {
      success: true,
      serviceRequest: updatedServiceRequest,
      notFound: false,
      unsupportedStatus: false,
      invalidTransition: false
    };
  }
}