// Shared presentation only: existing pages own authentication, catalogue and payments.
(() => {
  const page = document.body.dataset.stitchPage;
  const commerce = document.body.classList.contains('ss-commerce');
  const main = document.querySelector('main');
  if (main && !main.id) main.id = 'stitchMain';
  if (main) {
    const skip = document.createElement('a');
    skip.className = 'ss-skip'; skip.href = '#' + main.id; skip.textContent = 'Skip to content';
    document.body.prepend(skip);
    if (!main.hasAttribute('tabindex')) main.tabIndex = -1;
  }
  const icons = {
    home: '<path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9 20v-7h6v7"/>',
    shop: '<path d="M3 9h18l-2 11H5L3 9Z"/><path d="m8 9 4-6 4 6"/>',
    orders: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    wallet: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18m-5 4h5v4h-5z"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    support: '<path d="M4 13v-1a8 8 0 0 1 16 0v1M4 12H3v6h4v-6H4Zm16 0h1v6h-4v-6h3Zm0 6v1a2 2 0 0 1-2 2h-5"/>'
  };
  const svg = key => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">' + icons[key] + '</svg>';
  let opener;
  const support = document.createElement('section');
  support.id = 'stitchSupport'; support.className = 'ss-support-popover'; support.hidden = true;
  support.setAttribute('role', 'dialog'); support.setAttribute('aria-labelledby', 'stitchSupportTitle');
  support.innerHTML = '<button type="button" class="ss-support-close" aria-label="Minimize customer service">×</button><span class="ss-eyebrow">A LITTLE HELP, FROM A REAL PERSON</span><h2 id="stitchSupportTitle">We’re here for you.</h2><p>Contact a SmartSoko customer service associate about your order or account.</p><a href="mailto:info@smartsoko.co.tz?subject=SmartSoko%20customer%20service">Email customer service ↗</a>';
  const launcher = document.createElement('button');
  launcher.type = 'button'; launcher.className = 'ss-support-launcher'; launcher.innerHTML = svg('support');
  launcher.setAttribute('aria-label', 'Open customer service'); launcher.setAttribute('aria-controls', support.id); launcher.setAttribute('aria-expanded', 'false');
  function openSupport(event) { event?.preventDefault(); opener = document.activeElement; support.hidden = false; launcher.setAttribute('aria-expanded', 'true'); support.querySelector('button').focus(); }
  function closeSupport() { support.hidden = true; launcher.setAttribute('aria-expanded', 'false'); (opener?.isConnected ? opener : launcher).focus(); }
  launcher.addEventListener('click', () => support.hidden ? openSupport() : closeSupport());
  support.querySelector('button').addEventListener('click', closeSupport);
  support.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closeSupport(); } });
  if (commerce) {
    document.body.append(support, launcher);
  }
  // Seller messaging was removed from the customer journey by product direction.
  document.querySelectorAll('button,a').forEach(control => {
    if (/chat with sellers?/i.test(control.textContent)) control.remove();
  });
  if (commerce) {
    const socialPaths = [
      ['Facebook', '<path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.5 1.6-1.5h1.7V3.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.4H7.5v3.2h2.7V21h3.3Z"/>'],
      ['X', '<path d="M18.9 3H22l-6.8 7.8L23 21h-6.1l-4.8-6.3L6.6 21H3.4l7.3-8.5L3 3h6.3l4.4 5.8L18.9 3Zm-1.1 16.2h1.7L8.4 4.7H6.6l11.2 14.5Z"/>'],
      ['Instagram', '<path fill-rule="evenodd" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm6-4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/>']
    ];
    document.querySelectorAll('footer:not(.fixed)').forEach(footer => {
      const social = [...footer.querySelectorAll('a')].find(a => /^(facebook|alternate_email|camera)$/.test(a.textContent.trim()) && a.getAttribute('href') === '#');
      if (social) {
        const group = social.parentElement; group.className = 'ss-footer-socials';
        group.innerHTML = socialPaths.map(([label, graphic]) => '<span class="ss-social-icon" role="img" aria-label="' + label + ' — official link coming soon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + graphic + '</svg></span>').join('') + '<small>Official links coming soon</small>';
      }
      footer.querySelectorAll('a[href="#"]').forEach(link => {
        if (/help|contact|faq/i.test(link.textContent)) link.addEventListener('click', openSupport);
        if (/delivery|track/i.test(link.textContent)) link.href = '/track-order';
      });
    });
  }
})();
