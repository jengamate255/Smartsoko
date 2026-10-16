// Layout-only behavior for the responsive merchant navigation and appearance.
const navigation = document.querySelector('.mw-navigation');
const desktopLayout = window.matchMedia('(min-width: 961px)');
const updateOrientation = () => navigation?.setAttribute('aria-orientation', desktopLayout.matches ? 'vertical' : 'horizontal');
updateOrientation();
desktopLayout.addEventListener('change', updateOrientation);

const pulseToggle = document.getElementById('merchantPulseToggle');
const secondaryPulse = document.getElementById('merchantSecondaryPulse');
const phoneLayout = window.matchMedia('(max-width: 640px)');
let pulseExpanded = false;
const updatePulse = () => {
  if (!pulseToggle || !secondaryPulse) return;
  const collapsed = phoneLayout.matches && !pulseExpanded;
  if (collapsed && secondaryPulse.contains(document.activeElement)) pulseToggle.focus();
  secondaryPulse.hidden = collapsed;
  document.querySelector('.mw-counter-metrics')?.classList.toggle('mw-pulse-compact', collapsed);
  pulseToggle.setAttribute('aria-expanded', String(!collapsed));
  const label = document.getElementById('merchantPulseLabel');
  if (label) label.textContent = collapsed ? 'Show all metrics' : 'Hide extra metrics';
};
pulseToggle?.addEventListener('click', () => { pulseExpanded = !pulseExpanded; updatePulse(); });
phoneLayout.addEventListener('change', updatePulse);
updatePulse();

const businessDate = document.getElementById('merchantBusinessDate');
if (businessDate) {
  const today = new Date();
  businessDate.textContent = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Dar_es_Salaam',
  }).format(today);
  businessDate.dateTime = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Africa/Dar_es_Salaam',
  }).format(today);
}

try {
  const preference = localStorage.getItem('smartsoko_theme') || localStorage.getItem('theme');
  if (preference === 'dark' || preference === 'light') {
    document.documentElement.classList.toggle('dark', preference === 'dark');
    document.documentElement.classList.toggle('light', preference !== 'dark');
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = preference === 'dark';
  }
} catch (_) { /* The workspace remains usable when browser storage is blocked. */ }
