/* SmartSoko shared toast helper — inline, non-blocking notifications. */
(function () {
  'use strict';

  function ensureRoot() {
    let root = document.getElementById('sk-toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'sk-toast-root';
      root.setAttribute('role', 'status');
      root.setAttribute('aria-live', 'polite');
      document.body.appendChild(root);
    }
    return root;
  }

  var ICONS = {
    success: 'check_circle',
    error: 'error',
    info: 'info'
  };

  /**
   * window.skToast.show('Added to cart', 'success'|'error'|'info', {duration})
   * Returns the toast element (auto-removes after `duration` ms, default 3200).
   */
  function show(message, type, opts) {
    type = type || 'info';
    opts = opts || {};
    var root = ensureRoot();
    var el = document.createElement('div');
    el.className = 'sk-toast sk-toast-' + type;
    el.innerHTML =
      '<span class="material-symbols-outlined" aria-hidden="true">' + (ICONS[type] || ICONS.info) + '</span>' +
      '<span class="flex-1"></span>';
    el.querySelector('.flex-1').textContent = String(message || '');
    root.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add('sk-toast-in');
    });
    var ttl = typeof opts.duration === 'number' ? opts.duration : 3200;
    setTimeout(function () {
      el.classList.remove('sk-toast-in');
      setTimeout(function () { el.remove(); }, 300);
    }, ttl);
    return el;
  }

  window.skToast = {
    show: show,
    success: function (m, o) { return show(m, 'success', o); },
    error: function (m, o) { return show(m, 'error', o); },
    info: function (m, o) { return show(m, 'info', o); }
  };
})();
