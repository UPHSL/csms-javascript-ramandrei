const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ServiceRequestValidator {
  validate(serviceRequest) {
    const errors = [];

    if (serviceRequest.id !== null) {
      errors.push("id");
    }

    if (!this.isValidResidentId(serviceRequest.residentId)) {
      errors.push("residentId");
    }

    if (this.isBlank(serviceRequest.serviceType)) {
      errors.push("serviceType");
    }

    if (this.isBlank(serviceRequest.description)) {
      errors.push("description");
    }

    if (!this.isValidDate(serviceRequest.dateRequested)) {
      errors.push("dateRequested");
    }

    if (serviceRequest.status !== "Pending") {
      errors.push("status");
    }

    return errors;
  }

  isValid(serviceRequest) {
    return this.validate(serviceRequest).length === 0;
  }

  isBlank(value) {
    return (
      typeof value !== "string" ||
      value.trim().length === 0
    );
  }

  isValidResidentId(value) {
    return (
      Number.isInteger(value) &&
      value > 0
    );
  }

  isValidDate(value) {
    if (
      typeof value !== "string" ||
      !DATE_PATTERN.test(value)
    ) {
      return false;
    }

    const date = new Date(`${value}T00:00:00Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().startsWith(value)
    );
  }
}