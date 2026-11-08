
import { ServiceRequest } from "../models/ServiceRequest.js";

const noticeMessages = {
  submitted: "Service Request submitted successfully.",
  started: "Service Request is now In Progress.",
  completed: "Service Request completed successfully.",
  cancelled: "Service Request cancelled successfully.",
  "invalid-transition":
    "This workflow action is not allowed for the current Service Request status."
};

function readString(value) {
  return typeof value === "string" ? value : "";
}

function getFormData(body = {}) {
  return {
    residentId: readString(body.residentId),
    serviceType: readString(body.serviceType),
    description: readString(body.description),
    dateRequested: readString(body.dateRequested)
  };
}

function parseServiceRequestId(value) {
  if (
    typeof value !== "string" ||
    !/^[1-9]\d*$/.test(value)
  ) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
}

function showNotFound(response) {
  return response.status(404).render(
    "service-requests/not-found",
    {
      pageTitle: "Service Request Not Found",
      message: "The requested Service Request could not be found."
    }
  );
}

export function listServiceRequests(request, response) {
  const searchTerm = readString(request.query.search);
  const selectedStatus = readString(request.query.status);

  const statusFilter =
    selectedStatus === "" || selectedStatus === "All Statuses"
      ? null
      : selectedStatus;

  const result =
    request.app.locals.serviceRequestServices.query
      .searchServiceRequests(searchTerm, statusFilter);

  const notice =
    typeof request.query.notice === "string"
      ? noticeMessages[request.query.notice] ?? null
      : null;

  if (!result.success) {
    return response.status(400).render(
      "service-requests/index",
      {
        pageTitle: "Service Request Management",
        serviceRequests: [],
        searchTerm,
        selectedStatus,
        noticeMessage: notice,
        errorMessage: "The selected status filter is not supported."
      }
    );
  }

  return response.status(200).render(
    "service-requests/index",
    {
      pageTitle: "Service Request Management",
      serviceRequests: result.serviceRequests,
      searchTerm,
      selectedStatus,
      noticeMessage: notice,
      errorMessage: null
    }
  );
}

export function showSubmissionForm(request, response) {
  return response.status(200).render(
    "service-requests/new",
    {
      pageTitle: "Submit Service Request",
      serviceRequest: getFormData(),
      errors: [],
      errorMessage: null
    }
  );
}

export function submitServiceRequest(request, response) {
  const formData = getFormData(request.body);

  const rawResidentId = formData.residentId.trim();

  const residentId =
    rawResidentId === "" ? NaN : Number(rawResidentId);

  const serviceRequest = new ServiceRequest({
    id: null,
    residentId,
    serviceType: formData.serviceType,
    description: formData.description,
    dateRequested: formData.dateRequested,
    status: "Pending"
  });

  const result =
    request.app.locals.serviceRequestServices.submission
      .submitServiceRequest(serviceRequest);

  
  if (!result.success) {
    let errorMessage =
      "Please correct the Service Request information.";

    if (result.residentNotFound) {
      errorMessage = "Resident not found.";
    } else if (result.residentInactive) {
      errorMessage =
        "Inactive Residents cannot submit new Service Requests.";
    } else {
      const validationMessages = {
        residentId: "Resident ID is required.",
        serviceType: "Service type is required.",
        description: "Service request description is required.",
        dateRequested: "Date requested is required."
      };

      const specificErrors = (result.errors ?? [])
        .map((error) => {
          const field =
            typeof error === "string"
              ? error
              : error.field ?? error.path ?? error.message;

          return validationMessages[field] ?? null;
        })
        .filter(Boolean);

      if (specificErrors.length > 0) {
        errorMessage += ` ${specificErrors.join(" ")}`;
      }
    }

    return response.status(400).render(
      "service-requests/new",
      {
        pageTitle: "Submit Service Request",
        serviceRequest: formData,
        errors: result.errors ?? [],
        errorMessage
      }
    );
  }


  return response.redirect(
    303,
    "/service-requests?notice=submitted"
  );
}

export function showServiceRequest(request, response) {
  const serviceRequestId =
    parseServiceRequestId(request.params.id);

  if (serviceRequestId === null) {
    return showNotFound(response);
  }

  const serviceRequest =
    request.app.locals.serviceRequestServices.query
      .viewServiceRequest(serviceRequestId);

  if (!serviceRequest) {
    return showNotFound(response);
  }

  const notice =
    typeof request.query.notice === "string"
      ? noticeMessages[request.query.notice] ?? null
      : null;

  return response.status(200).render(
    "service-requests/details",
    {
      pageTitle: "Service Request Details",
      serviceRequest,
      noticeMessage: notice
    }
  );
}

function changeServiceRequestStatus(
  request,
  response,
  requestedStatus,
  successNotice
) {
  const serviceRequestId =
    parseServiceRequestId(request.params.id);

  if (serviceRequestId === null) {
    return showNotFound(response);
  }

  const result =
    request.app.locals.serviceRequestServices.status
      .updateStatus(serviceRequestId, requestedStatus);

  if (result.notFound) {
    return showNotFound(response);
  }

  if (!result.success) {
    return response.redirect(
      303,
      `/service-requests/${serviceRequestId}?notice=invalid-transition`
    );
  }

  return response.redirect(
    303,
    `/service-requests/${serviceRequestId}?notice=${successNotice}`
  );
}

export function startProcessing(request, response) {
  return changeServiceRequestStatus(
    request,
    response,
    "In Progress",
    "started"
  );
}

export function completeServiceRequest(request, response) {
  return changeServiceRequestStatus(
    request,
    response,
    "Completed",
    "completed"
  );
}

export function cancelServiceRequest(request, response) {
  return changeServiceRequestStatus(
    request,
    response,
    "Cancelled",
    "cancelled"
  );
}
