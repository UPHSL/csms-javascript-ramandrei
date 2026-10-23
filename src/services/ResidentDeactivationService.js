export default class ResidentDeactivationService {
  constructor(repository) {
    this.repository = repository;
  }

  deactivateResident(residentId) {
    const resident =
      this.repository.findById(residentId);

    if (!resident) {
      return {
        success: false,
        resident: null,
        notFound: true,
        alreadyInactive: false
      };
    }

    if (resident.status === "Inactive") {
      return {
        success: true,
        resident,
        notFound: false,
        alreadyInactive: true
      };
    }

    const updatedResident =
      this.repository.deactivateById(
        residentId
      );

    return {
      success: true,
      resident: updatedResident,
      notFound: false,
      alreadyInactive: false
    };
  }
}