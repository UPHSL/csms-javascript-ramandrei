export default class DashboardQueryService {
  constructor(residentRepository, serviceRequestRepository) {
    this.residentRepository = residentRepository;
    this.serviceRequestRepository = serviceRequestRepository;
  }

  getDashboardData() {
    const totalResidents =
      this.residentRepository.countAll();

    const activeResidents =
      this.residentRepository.countByStatus("Active");

    const inactiveResidents =
      this.residentRepository.countByStatus("Inactive");

    const totalServiceRequests =
      this.serviceRequestRepository.countAll();

    const pendingServiceRequests =
      this.serviceRequestRepository.countByStatus("Pending");

    const inProgressServiceRequests =
      this.serviceRequestRepository.countByStatus("In Progress");

    const completedServiceRequests =
      this.serviceRequestRepository.countByStatus("Completed");

    const cancelledServiceRequests =
      this.serviceRequestRepository.countByStatus("Cancelled");

    return {
      residents: {
        total: totalResidents,
        active: activeResidents,
        inactive: inactiveResidents
      },

      serviceRequests: {
        total: totalServiceRequests,
        pending: pendingServiceRequests,
        inProgress: inProgressServiceRequests,
        completed: completedServiceRequests,
        cancelled: cancelledServiceRequests,
        open: pendingServiceRequests + inProgressServiceRequests
      },

      recentServiceRequests:
        this.serviceRequestRepository.findRecent(5)
    };
  }
}