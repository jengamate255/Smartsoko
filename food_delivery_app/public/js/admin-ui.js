/*
 * AdminUI — shared presentation primitives for the admin dashboard.
 *
 * Exists because each of the 37 tab loaders previously built its own markup,
 * which is how the action buttons ended up rendering raw Material Symbols
 * ligature names ("visibility", "shopping_bag") as visible text. Every icon in
 * this kit goes through AdminUI.icon(), so the font class can never be forgotten.
 */
(function (global) {
  'use strict';

  var ICON_FONT = 'material-symbols-outlined';

  function esc(value) {
    if (value === null || value === undefined || value === false) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function icon(name, opts) {
    var o = opts || {};
    var cls = ICON_FONT;
    if (o.filled) cls += ' filled-icon';
    if (o.cls) cls += ' ' + o.cls;
    var aria = o.label ? ' role="img" aria-label="' + esc(o.label) + '"' : ' aria-hidden="true"';
    return '<span class="' + cls + '"' + aria + '>' + esc(name) + '</span>';
  }

  /* ── Taxonomy ───────────────────────────────────────────────────────────
     The users API carries both "merchant" and "seller" for the same concept.
     They render as one chip so counts and filters stop splitting.           */
  var ROLE_ALIASES = { seller: 'merchant', merchant: 'merchant', customer: 'customer',
    driver: 'driver', rider: 'driver', admin: 'admin', superadmin: 'admin' };

  function normRole(value) {
    var key = String(value || '').toLowerCase().trim();
    return ROLE_ALIASES[key] || key || 'unknown';
  }

  var STATUS_TONES = {
    active: 'success', online: 'success', verified: 'success', delivered: 'success',
    completed: 'success', paid: 'success', resolved: 'success', ready: 'success',
    ready_for_delivery: 'success', in_stock: 'success', true: 'success',
    pending: 'warning', unverified: 'warning', processing: 'warning', accepted: 'info',
    confirmed: 'info', preparing: 'info', assigned: 'info', dispatched: 'info',
    picked_up: 'info', out_for_delivery: 'info', in_transit: 'info', shipped: 'info',
    info: 'info', online_pending: 'warning',
    cancelled: 'danger', rejected: 'danger', deleted: 'danger', suspended: 'danger',
    failed: 'danger', error: 'danger', out_of_stock: 'danger', low_stock: 'danger',
    offline: 'muted', busy: 'warning', inactive: 'muted', unknown: 'muted',
    draft: 'muted', false: 'muted'
  };

  function toneFor(value) {
    return STATUS_TONES[String(value || '').toLowerCase().trim()] || 'muted';
  }

  function chip(value, opts) {
    var o = opts || {};
    var tone = o.tone || toneFor(value);
    var label = o.label !== undefined ? o.label : humanize(value);
    return '<span class="ak-chip ak-chip--' + tone + '">' + esc(label) + '</span>';
  }

  function humanize(value) {
    var s = String(value === null || value === undefined ? '' : value);
    if (!s) return '—';
    return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function money(amount, currency) {
    var n = Number(amount);
    if (!isFinite(n)) return '—';
    return (currency || 'TSh') + ' ' + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function initials(name, email) {
    var source = (name && String(name).trim()) || (email && String(email).split('@')[0]) || '';
    if (!source) return '?';
    var parts = source.split(/[\s._@-]+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0].charAt(0) + (parts[1] ? parts[1].charAt(0) : '')).toUpperCase();
  }

  /* Identity cell: real name first, email/phone as the subordinate line.
     Previously rows fell back to a literal "User" label with no hierarchy. */
  function identity(primary, secondary, opts) {
    var o = opts || {};
    var known = primary && String(primary).trim() && !o.placeholder;
    var label = known ? primary : (secondary ? String(secondary).split('@')[0] : 'Unnamed');
    var avatar = '<div class="ak-avatar' + (known ? '' : ' ak-avatar--muted') + '">' + esc(initials(known ? primary : secondary)) + '</div>';
    return '<div class="ak-id">' + avatar + '<div class="ak-truncate">' +
      '<div class="ak-cell-strong ak-truncate">' + esc(label) + '</div>' +
      (secondary ? '<div class="ak-cell-sub ak-truncate">' + esc(secondary) + '</div>' : '') +
      '</div></div>';
  }

  /* ── Static fragments ─────────────────────────────────────────────────── */
  function statCard(cfg) {
    var c = cfg || {};
    return '<div class="ak-card ak-stat' + (c.tone ? ' ak-stat--' + c.tone : '') + '">' +
      '<div><div class="ak-stat-label">' + esc(c.label) + '</div>' +
      '<div class="ak-stat-value"' + (c.id ? ' id="' + esc(c.id) + '"' : '') + '>' + (c.htmlValue || esc(c.value === undefined || c.value === null ? '—' : c.value)) + '</div>' +
      (c.hint ? '<div class="ak-stat-hint">' + esc(c.hint) + '</div>' : '') + '</div>' +
      (c.icon ? '<div class="ak-stat-icon">' + icon(c.icon) + '</div>' : '') + '</div>';
  }

  function emptyState(cfg) {
    var c = cfg || {};
    return '<div class="ak-state">' +
      '<div class="ak-state-icon">' + icon(c.icon || 'inbox') + '</div>' +
      '<div class="ak-state-title">' + esc(c.title || 'Nothing here yet') + '</div>' +
      (c.hint ? '<div class="ak-state-hint">' + esc(c.hint) + '</div>' : '') +
      (c.actionLabel ? '<div style="margin-top:14px"><button class="ak-btn ak-btn--primary ak-btn--sm" data-ak-empty-action>' +
        icon(c.actionIcon || 'add') + esc(c.actionLabel) + '</button></div>' : '') +
      '</div>';
  }

  /* Distinct from emptyState on purpose: a failed request must never be
     presented as an empty dataset. */
  function errorState(cfg) {
    var c = cfg || {};
    return '<div class="ak-state ak-state--error">' +
      '<div class="ak-state-icon">' + icon('cloud_off') + '</div>' +
      '<div class="ak-state-title">Couldn’t load this data</div>' +
      '<div class="ak-state-hint">' + esc(c.message || 'The request failed.') + '</div>' +
      '<div style="margin-top:14px"><button class="ak-btn ak-btn--sm" data-ak-retry>' +
      icon('refresh') + 'Try again</button></div></div>';
  }

  function skeletonRows(count, cols) {
    var n = count || 5, c = cols || 5, html = '';
    for (var r = 0; r < n; r++) {
      var cells = '';
      for (var i = 0; i < c; i++) {
        cells += '<td><div class="ak-skel" style="height:13px;width:' + (i === 0 ? 60 : 40) + '%"></div></td>';
      }
      html += '<tr>' + cells + '</tr>';
    }
    return html;
  }

  /* ── Toasts ───────────────────────────────────────────────────────────── */
  var toastHost = null;
  function toast(message, tone, ms) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'ak-toasts';
      toastHost.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastHost);
    }
    var el = document.createElement('div');
    el.className = 'ak-toast' + (tone ? ' ak-toast--' + tone : '');
    el.innerHTML = icon(tone === 'error' ? 'error' : tone === 'success' ? 'check_circle' : 'info') +
      '<span>' + esc(message) + '</span>';
    toastHost.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, ms || 3600);
  }

  /* ── Modal + confirm ──────────────────────────────────────────────────── */
  function modal(cfg) {
    var c = cfg || {};
    var root = document.createElement('div');
    root.className = 'ak-modal-root open';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML =
      '<div class="ak-modal' + (c.wide ? ' ak-modal--wide' : '') + '">' +
        '<div class="ak-modal-head"><div class="ak-modal-title">' + esc(c.title || '') + '</div>' +
        '<button class="ak-iconbtn" data-ak-close aria-label="Close dialog">' + icon('close') + '</button></div>' +
        '<div class="ak-modal-body">' + (c.bodyHtml || '') + '</div>' +
        '<div class="ak-modal-foot">' + (c.footHtml || '') + '</div>' +
      '</div>';

    var api = {
      el: root,
      body: root.querySelector('.ak-modal-body'),
      foot: root.querySelector('.ak-modal-foot'),
      close: function () {
        document.removeEventListener('keydown', onKey);
        if (root.parentNode) root.parentNode.removeChild(root);
        if (typeof c.onClose === 'function') c.onClose();
      }
    };

    function onKey(e) { if (e.key === 'Escape') api.close(); }
    root.addEventListener('click', function (e) {
      if (e.target === root && c.dismissible !== false) api.close();
      if (e.target.closest('[data-ak-close]')) api.close();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(root);
    var first = root.querySelector('input,select,textarea,button:not([data-ak-close])');
    if (first) first.focus();
    return api;
  }

  /* Destructive actions used to fire on a single click from a 10-button row. */
  function confirm(cfg) {
    var c = cfg || {};
    return new Promise(function (resolve) {
      var tone = c.tone === 'danger' ? 'danger' : 'primary';
      var m = modal({
        title: c.title || 'Are you sure?',
        bodyHtml: '<p style="font-size:13.5px;color:var(--ak-text-sec);line-height:1.6">' +
          (c.bodyHtml || esc(c.body || '')) + '</p>',
        footHtml: '<button class="ak-btn" data-ak-no>Cancel</button>' +
          '<button class="ak-btn ak-btn--' + tone + '" data-ak-yes>' +
          icon(c.confirmIcon || (tone === 'danger' ? 'warning' : 'check')) + esc(c.confirmLabel || 'Confirm') + '</button>',
        onClose: function () { resolve(false); }
      });
      m.el.addEventListener('click', function (e) {
        if (e.target.closest('[data-ak-yes]')) { m._ok = true; m.close(); resolve(true); }
        else if (e.target.closest('[data-ak-no]')) m.close();
      });
    });
  }

  /* ── Row actions ────────────────────────────────────────────────────────
     Up to `inline` non-destructive actions render as icon buttons; everything
     else folds into an overflow menu. Destructive actions always live in the
     menu and require confirmation.                                         */
  function actionsCell(actions, row, index) {
    var list = (typeof actions === 'function' ? actions(row, index) : actions) || [];
    var visible = list.filter(function (a) {
      if (!a) return false;
      return typeof a.visible === 'function' ? !!a.visible(row, index) : a.visible !== false;
    });
    var inline = visible.filter(function (a) { return a.tone !== 'danger'; }).slice(0, 2);
    var inlineSet = inline.slice();
    var menu = visible.filter(function (a) { return inlineSet.indexOf(a) === -1; });

    var html = '<div class="ak-actions">';
    inline.forEach(function (a) {
      html += '<button class="ak-iconbtn" type="button" data-ak-act="' + a._i + '" title="' + esc(a.label) +
        '" aria-label="' + esc(a.label) + '">' + icon(a.icon) + '</button>';
    });
    if (menu.length) {
      html += '<div class="ak-overflow"><button class="ak-iconbtn" type="button" data-ak-menu aria-haspopup="true" ' +
        'aria-label="More actions">' + icon('more_vert') + '</button><div class="ak-menu" role="menu">' +
        menu.map(function (a) {
          return '<button class="ak-menu-item' + (a.tone === 'danger' ? ' ak-menu-item--danger' : '') +
            '" role="menuitem" type="button" data-ak-act="' + a._i + '">' +
            icon(a.icon || 'chevron_right') + esc(a.label) + '</button>';
        }).join('') + '</div></div>';
    }
    return html + '</div>';
  }

  function table(container, config) {
    var cfg = config || {};
    var host = typeof container === 'string' ? document.querySelector(container) : container;
    if (!host) return null;

    var columns = cfg.columns || [];
    var pageSize = cfg.pageSize === 0 ? 0 : (cfg.pageSize || 25);
    var state = { rows: cfg.rows || [], page: 1, sortKey: cfg.sortKey || null, sortDir: cfg.sortDir || 'desc', stale: null };

    columns.forEach(function (col, i) {
      if (!col.key && !col.render) col.key = 'c' + i;
    });
    (cfg.actions || []).forEach(function (a, i) { a._i = i; });

    host.innerHTML =
      '<div class="ak-card"><div data-ak-stale></div>' +
      '<div class="ak-table-wrap"><table class="ak-table"><thead><tr></tr></thead><tbody></tbody></table></div>' +
      '<div data-ak-pager class="ak-pager"></div></div>';

    var thead = host.querySelector('thead tr');
    var tbody = host.querySelector('tbody');
    var pager = host.querySelector('[data-ak-pager]');
    var staleBar = host.querySelector('[data-ak-stale]');

    function valueOf(col, row) {
      if (col.value) return col.value(row);
      if (col.key) return row[col.key];
      return '';
    }

    function colCount() { return columns.length + (cfg.selectable ? 1 : 0); }

    function renderHead() {
      var selectCell = cfg.selectable ? '<th style="width:38px"><input type="checkbox" data-ak-all aria-label="Select all rows"></th>' : '';
      thead.innerHTML = selectCell + columns.map(function (col) {
        var sortable = col.sortable !== false && (col.value || col.key) && !col.actions;
        var ind = '';
        var aria = '';
        if (sortable && state.sortKey === col.key) {
          ind = icon(state.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward', { cls: 'ak-sort-ind' });
          aria = ' aria-sort="' + (state.sortDir === 'asc' ? 'ascending' : 'descending') + '"';
        } else if (sortable) {
          ind = '<span class="ak-sort-ind material-symbols-outlined" aria-hidden="true"></span>';
        }
        return '<th' + (sortable ? ' data-sortable data-key="' + esc(col.key) + '"' : '') + aria +
          (col.align ? ' style="text-align:' + col.align + '"' : '') +
          (col.width ? ' style="width:' + col.width + '"' : '') + '>' + esc(col.label) + ind + '</th>';
      }).join('');
    }

    function sortedRows() {
      if (!state.sortKey) return state.rows.slice();
      var col = columns.filter(function (c) { return c.key === state.sortKey; })[0];
      if (!col) return state.rows.slice();
      var dir = state.sortDir === 'asc' ? 1 : -1;
      return state.rows.slice().sort(function (a, b) {
        var av = valueOf(col, a), bv = valueOf(col, b);
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        var at = String(av === null || av === undefined ? '' : av).toLowerCase();
        var bt = String(bv === null || bv === undefined ? '' : bv).toLowerCase();
        if (at < bt) return -1 * dir;
        if (at > bt) return 1 * dir;
        return 0;
      });
    }

    function renderStale() {
      if (!state.stale) { staleBar.innerHTML = ''; return; }
      staleBar.innerHTML = '<div class="ak-stale">' + icon('cloud_off') +
        '<span>Showing the last data that loaded — ' + esc(state.stale) + '</span>' +
        '<button class="ak-btn ak-btn--sm" data-ak-stale-retry>' + icon('refresh') + 'Retry</button></div>';
    }

    function pageSlice(rows) {
      if (!pageSize) return rows;
      return rows.slice((state.page - 1) * pageSize, state.page * pageSize);
    }

    function renderBody(pageRows, total) {
      if (!state.rows.length) {
        tbody.innerHTML = '<tr><td colspan="' + colCount() + '" style="padding:0">' +
          emptyState(typeof cfg.empty === 'function' ? cfg.empty() : cfg.empty) + '</td></tr>';
        pager.innerHTML = '';
        return;
      }
      tbody.innerHTML = pageRows.map(function (row, i) {
        var cells = columns.map(function (col) {
          var content = col.render ? col.render(row, i) : esc(valueOf(col, row));
          return '<td' + (col.align ? ' style="text-align:' + col.align + '"' : '') +
            (col.actions ? ' class="ak-cell-actions" style="text-align:right"' : '') + '>' + content + '</td>';
        }).join('');
        if (cfg.selectable) {
          cells = '<td><input type="checkbox" data-ak-row aria-label="Select row"></td>' + cells;
        }
        return '<tr data-ak-row-index="' + i + '">' + cells + '</tr>';
      }).join('');
      renderPager(total);
    }

    function renderPager(total) {
      if (!pageSize || total <= pageSize) { pager.innerHTML = '<span class="ak-pager-info">' + total + (total === 1 ? ' record' : ' records') + '</span>'; return; }
      var pages = Math.ceil(total / pageSize);
      state.page = Math.min(Math.max(1, state.page), pages);
      pager.innerHTML =
        '<span class="ak-pager-info">' + ((state.page - 1) * pageSize + 1) + '–' +
        Math.min(total, state.page * pageSize) + ' of ' + total + '</span>' +
        '<div class="ak-pager-ctrl">' +
        '<button class="ak-btn ak-btn--sm" data-ak-prev' + (state.page === 1 ? ' disabled' : '') + '>' + icon('chevron_left') + '</button>' +
        '<span class="ak-pager-page">' + state.page + ' / ' + pages + '</span>' +
        '<button class="ak-btn ak-btn--sm" data-ak-next' + (state.page === pages ? ' disabled' : '') + '>' + icon('chevron_right') + '</button>' +
        '</div>';
    }

    function render() {
      renderHead();
      renderStale();
      var rows = sortedRows();
      if (pageSize) {
        var pages = Math.max(1, Math.ceil(rows.length / pageSize));
        state.page = Math.min(Math.max(1, state.page), pages);
      }
      renderBody(pageSlice(rows), rows.length);
    }

    function actionAt(i) {
      return (cfg.actions || []).filter(function (a) { return a._i === i; })[0];
    }

    function runAction(a, row) {
      if (!a) return;
      // confirm:false opts out — used when the action opens its own dedicated dialog.
      if (a.confirm === false) { a.onClick(row); return; }
      if (a.tone === 'danger' || a.confirm) {
        var c = typeof a.confirm === 'function' ? a.confirm(row) : a.confirm;
        confirm({
          title: (c && c.title) || a.label,
          body: (c && c.body) || 'This cannot be undone.',
          bodyHtml: c && c.bodyHtml,
          confirmLabel: (c && c.confirmLabel) || a.label,
          tone: a.tone === 'danger' ? 'danger' : 'primary'
        }).then(function (ok) { if (ok) a.onClick(row); });
        return;
      }
      a.onClick(row);
    }

    host.addEventListener('click', function (e) {
      var sort = e.target.closest('th[data-sortable]');
      if (sort) {
        var key = sort.getAttribute('data-key');
        if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        else { state.sortKey = key; state.sortDir = 'asc'; }
        render();
        return;
      }
      var menuBtn = e.target.closest('[data-ak-menu]');
      if (menuBtn) {
        var menu = menuBtn.parentNode.querySelector('.ak-menu');
        var wasOpen = menu.classList.contains('open');
        closeAllMenus();
        if (!wasOpen) menu.classList.add('open');
        return;
      }
      if (!e.target.closest('.ak-overflow')) closeAllMenus();

      var actBtn = e.target.closest('[data-ak-act]');
      if (actBtn) {
        var tr = actBtn.closest('tr');
        if (!tr) return;
        var idx = Number(tr.getAttribute('data-ak-row-index'));
        runAction(actionAt(Number(actBtn.getAttribute('data-ak-act'))), pageSlice(sortedRows())[idx]);
        closeAllMenus();
        return;
      }
      if (e.target.closest('[data-ak-prev]')) { state.page--; render(); return; }
      if (e.target.closest('[data-ak-next]')) { state.page++; render(); return; }
      if (e.target.closest('[data-ak-stale-retry]')) { state.stale = null; renderStale(); if (cfg.onRetry) cfg.onRetry(); return; }
      if (e.target.closest('[data-ak-empty-action]')) {
        var emptyCfg = typeof cfg.empty === 'function' ? cfg.empty() : cfg.empty;
        if (emptyCfg && emptyCfg.onAction) emptyCfg.onAction();
      }
      if (e.target.closest('[data-ak-retry]') && cfg.onRetry) cfg.onRetry();
    });

    function closeAllMenus() {
      host.querySelectorAll('.ak-menu.open').forEach(function (m) { m.classList.remove('open'); });
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAllMenus(); });

    host.addEventListener('change', function (e) {
      if (e.target.matches('[data-ak-all]')) {
        host.querySelectorAll('[data-ak-row]').forEach(function (cb) { cb.checked = e.target.checked; });
        emitSelection();
      } else if (e.target.matches('[data-ak-row]')) {
        emitSelection();
      }
    });

    function emitSelection() {
      if (!cfg.onSelect) return;
      var rows = pageSlice(sortedRows());
      var selected = [];
      host.querySelectorAll('tbody tr').forEach(function (tr, i) {
        var cb = tr.querySelector('[data-ak-row]');
        if (cb && cb.checked && rows[i] !== undefined) selected.push(rows[i]);
      });
      cfg.onSelect(selected);
    }

    render();

    return {
      update: function (rows) { state.rows = rows || []; state.stale = null; render(); },
      setError: function (message) {
        tbody.innerHTML = '<tr><td colspan="' + colCount() + '" style="padding:0">' +
          errorState({ message: message }) + '</td></tr>';
        pager.innerHTML = '';
      },
      setStale: function (message) { state.stale = message; renderStale(); },
      setBusy: function () {
        tbody.innerHTML = skeletonRows(Math.min(state.rows.length || 5, 8), colCount());
        pager.innerHTML = '';
      },
      resetPage: function () { state.page = 1; },
      rows: function () { return state.rows; }
    };
  }

  global.AdminUI = {
    esc: esc, icon: icon, chip: chip, toneFor: toneFor, normRole: normRole, humanize: humanize,
    money: money, initials: initials, identity: identity,
    statCard: statCard, emptyState: emptyState, errorState: errorState, skeletonRows: skeletonRows,
    table: table, actionsCell: actionsCell, modal: modal, confirm: confirm, toast: toast
  };
})(window);
