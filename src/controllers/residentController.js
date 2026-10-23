import { Resident } from "../models/Resident.js";

const noticeMessages = {
  registered: "Resident registered successfully.",
  updated: "Resident information updated successfully.",
  deactivated: "Resident deactivated successfully.",
  "already-inactive": "This resident is already inactive."
};

function getFormData(body = {}) {
  return {
    firstName: body.firstName ?? "",
    lastName: body.lastName ?? "",
    address: body.address ?? "",
    contactNumber: body.contactNumber ?? "",
    email: body.email ?? ""
  };
}

function parseResidentId(value) {
  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function showNotFound(response) {
  return response.status(404).render("residents/not-found", {
    pageTitle: "Resident Not Found",
    message: "The requested resident could not be found."
  });
}

export function listResidents(request, response) {
  const searchTerm =
    typeof request.query.search === "string"
      ? request.query.search.trim()
      : "";

  const services = request.app.locals.residentServices;

  const residents = services.query.searchResidents(searchTerm);

  const notice =
    typeof request.query.notice === "string"
      ? noticeMessages[request.query.notice] ?? null
      : null;

  return response.status(200).render("residents/index", {
    pageTitle: "Resident Management",
    residents,
    searchTerm,
    noticeMessage: notice
  });
}

export function showRegistrationForm(request, response) {
  return response.status(200).render("residents/new", {
    pageTitle: "Register Resident",
    resident: getFormData(),
    errors: [],
    errorMessage: null
  });
}

export function registerResident(request, response) {
  const formData = getFormData(request.body);

  const resident = new Resident({
    ...formData,
    status: "Active"
  });

  const result =
    request.app.locals.residentServices.registration
      .registerResident(resident);

  if (!result.success) {
    return response.status(400).render("residents/new", {
      pageTitle: "Register Resident",
      resident: formData,
      errors: result.errors,
      errorMessage: "Please correct the highlighted information."
    });
  }

  return response.redirect(303, "/residents?notice=registered");
}

export function showEditForm(request, response) {
  const residentId = parseResidentId(request.params.id);

  if (residentId === null) {
    return showNotFound(response);
  }

  const resident =
    request.app.locals.residentRepository.findById(residentId);

  if (!resident) {
    return showNotFound(response);
  }

  return response.status(200).render("residents/edit", {
    pageTitle: "Edit Resident",
    resident,
    errors: [],
    errorMessage: null
  });
}

export function updateResident(request, response) {
  const residentId = parseResidentId(request.params.id);

  if (residentId === null) {
    return showNotFound(response);
  }

  const repository = request.app.locals.residentRepository;
  const existingResident = repository.findById(residentId);

  if (!existingResident) {
    return showNotFound(response);
  }

  const formData = getFormData(request.body);

  const result =
    request.app.locals.residentServices.update
      .updateResident(residentId, formData);

  if (result.notFound) {
    return showNotFound(response);
  }

  if (!result.success) {
    return response.status(400).render("residents/edit", {
      pageTitle: "Edit Resident",
      resident: {
        ...formData,
        id: existingResident.id,
        status: existingResident.status
      },
      errors: result.errors,
      errorMessage: "Please correct the highlighted information."
    });
  }

  return response.redirect(303, "/residents?notice=updated");
}

export function deactivateResident(request, response) {
  const residentId = parseResidentId(request.params.id);

  if (residentId === null) {
    return showNotFound(response);
  }

  const result =
    request.app.locals.residentServices.deactivation
      .deactivateResident(residentId);

  if (result.notFound) {
    return showNotFound(response);
  }

  if (result.alreadyInactive) {
    return response.redirect(
      303,
      "/residents?notice=already-inactive"
    );
  }

  return response.redirect(303, "/residents?notice=deactivated");
}