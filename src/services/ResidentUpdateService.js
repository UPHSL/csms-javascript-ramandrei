import { Resident } from "../models/Resident.js";

export default class ResidentUpdateService {
  constructor(validator, repository) {
    this.validator = validator;
    this.repository = repository;
  }

  updateResident(residentId, proposedInformation) {
    const existingResident =
      this.repository.findById(residentId);

    if (!existingResident) {
      return {
        success: false,
        resident: null,
        errors: [],
        notFound: true
      };
    }

    const updatedResident =
      new Resident({
        id: existingResident.id,
        firstName: proposedInformation.firstName,
        lastName: proposedInformation.lastName,
        address: proposedInformation.address,
        contactNumber: proposedInformation.contactNumber,
        email: proposedInformation.email,
        status: existingResident.status
      });

    const errors =
      this.validator.validate(updatedResident);

    if (errors.length > 0) {
      return {
        success: false,
        resident: null,
        errors,
        notFound: false
      };
    }

    const savedResident =
      this.repository.update(updatedResident);

    return {
      success: true,
      resident: savedResident,
      errors: [],
      notFound: false
    };
  }
}