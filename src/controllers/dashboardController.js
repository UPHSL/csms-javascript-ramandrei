export function showDashboard(request, response) {
  const dashboardData =
    request.app.locals.dashboardService.getDashboardData();

  return response.status(200).render(
    "dashboard",
    {
      pageTitle: "Dashboard",
      ...dashboardData
    }
  );
}