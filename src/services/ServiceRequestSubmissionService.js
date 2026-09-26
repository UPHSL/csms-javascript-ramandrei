export default class ServiceRequestSubmissionService {
  constructor(
    serviceRequestValidator,
    residentRepository,
    serviceRequestRepository
  ) {
    this.serviceRequestValidator =
      serviceRequestValidator;

    this.residentRepository =
      residentRepository;

    this.serviceRequestRepository =
      serviceRequestRepository;
  }

  submitServiceRequest(serviceRequest) {
    const errors =
      this.serviceRequestValidator.validate(
        serviceRequest
      );

    if (errors.length > 0) {
      return {
        success: false,
        serviceRequest: null,
        errors,
        residentNotFound: false,
        residentInactive: false
      };
    } 

    const resident =
      this.residentRepository.findById(
        serviceRequest.residentId
      );

    if (!resident) {
      return {
        success: false,
        serviceRequest: null,
        errors: [],
        residentNotFound: true,
        residentInactive: false
      };
    }

    if (resident.status !== "Active") {
      return {
        success: false,
        serviceRequest: null,
        errors: [],
        residentNotFound: false,
        residentInactive: true
      };
    }

    const savedServiceRequest =
      this.serviceRequestRepository.save(
        serviceRequest
      );

    return {
      success: true,
      serviceRequest: savedServiceRequest,
      errors: [],
      residentNotFound: false,
      residentInactive: false
    };
  }
}