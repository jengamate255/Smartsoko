// Shared focus and background management for the existing merchant dialogs.
(() => {
  let active = null;
  const controls = () => Array.from(active.modal.querySelectorAll(
    'button, a[href], input:not([type=hidden]), select, textarea, [tabindex]'
  )).filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length && !el.closest('[inert]'));

  window.enterMerchantDialog = id => {
    const modal = document.getElementById(id);
    if (!modal || active?.modal === modal) return;
    if (active) window.exitMerchantDialog(active.modal.id);
    const opener = document.activeElement;
    const inert = [];
    // Dialogs are nested in main: disable siblings at each ancestor level,
    // never the ancestor that contains the active dialog.
    for (let branch = modal; branch.parentElement; branch = branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && !sibling.inert) { sibling.inert = true; inert.push(sibling); }
      }
      if (branch.parentElement === document.body) break;
    }
    active = { modal, opener, inert, overflow: document.body.style.overflow };
    document.body.style.overflow = 'hidden';
    const field = controls().find(el => el.matches('input, textarea, select'));
    (field || controls()[0] || modal).focus({ preventScroll: true });
  };

  window.exitMerchantDialog = id => {
    if (!active || active.modal.id !== id) return;
    const previous = active;
    active = null;
    previous.inert.forEach(el => { el.inert = false; });
    document.body.style.overflow = previous.overflow;
    if (previous.opener?.isConnected && !previous.opener.closest('[inert]')) {
      previous.opener.focus({ preventScroll: true });
    }
  };

  document.addEventListener('keydown', event => {
    if (!active || event.key !== 'Tab') return;
    const available = controls();
    const index = available.indexOf(document.activeElement);
    if (!available.length) { event.preventDefault(); active.modal.focus(); return; }
    if (event.shiftKey && index <= 0) { event.preventDefault(); available.at(-1).focus(); }
    else if (!event.shiftKey && (index === -1 || index === available.length - 1)) {
      event.preventDefault(); available[0].focus();
    }
  });
  document.addEventListener('focusin', event => {
    if (active && !active.modal.contains(event.target)) (controls()[0] || active.modal).focus();
  });
})();
