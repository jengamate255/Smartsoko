// Keep support available without leaving the full card on screen.
(() => {
  const panel = document.getElementById('customer-service');
  const close = document.getElementById('customerServiceMinimize');
  const launcher = document.getElementById('customerServiceLauncher');
  if (!panel || !close || !launcher) return;
  const preferenceKey = 'smartsoko_support_minimized';

  function setMinimized(minimized, moveFocus = false) {
    panel.hidden = minimized;
    launcher.hidden = !minimized;
    launcher.setAttribute('aria-expanded', String(!minimized));
    panel.closest('.sf-footer-top')?.classList.toggle('sf-support-minimized', minimized);
    try { sessionStorage.setItem(preferenceKey, String(minimized)); } catch (_) { /* Optional preference. */ }
    if (moveFocus) (minimized ? launcher : close).focus({ preventScroll: true });
  }

  function reopen(event) {
    event?.preventDefault();
    setMinimized(false, true);
    panel.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  close.addEventListener('click', () => setMinimized(true, true));
  launcher.addEventListener('click', reopen);
  document.querySelectorAll('a[href="#customer-service"]').forEach(link => link.addEventListener('click', reopen));
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); setMinimized(true, true); }
  });
  let minimized = false;
  try { minimized = sessionStorage.getItem(preferenceKey) === 'true'; } catch (_) { /* Storage may be disabled. */ }
  setMinimized(minimized);
})();
