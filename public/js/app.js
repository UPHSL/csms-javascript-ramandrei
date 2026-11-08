
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('appSidebar');
  const toggle = document.querySelector('[data-sidebar-toggle]');

  if (!sidebar || !toggle) return;

  const closeSidebar = () => {
    sidebar.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('sidebar-open');
  };

  toggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('is-open');

    toggle.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('sidebar-open', isOpen);
  });

  sidebar.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeSidebar);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSidebar();
  });

  document.addEventListener('click', (event) => {
    if (
      sidebar.classList.contains('is-open') &&
      !sidebar.contains(event.target) &&
      !toggle.contains(event.target)
    ) {
      closeSidebar();
    }
  });
});
