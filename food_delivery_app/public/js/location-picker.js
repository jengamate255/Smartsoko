(function () {
  'use strict';

  var KEY = 'smartsoko_delivery_location';
  var DEFAULT_LOCATION = 'Dar es Salaam';

  var AREAS = [
    { n: 'Dar es Salaam', c: 'Dar es Salaam', lat: -6.7924, lng: 39.2083 },
    { n: 'Sinza', c: 'Dar es Salaam', lat: -6.8006, lng: 39.2506 },
    { n: 'Mikocheni', c: 'Dar es Salaam', lat: -6.7670, lng: 39.2580 },
    { n: 'Masaki', c: 'Dar es Salaam', lat: -6.7367, lng: 39.2650 },
    { n: 'Msasani', c: 'Dar es Salaam', lat: -6.7496, lng: 39.2822 },
    { n: 'Oyster Bay', c: 'Dar es Salaam', lat: -6.7560, lng: 39.2760 },
    { n: 'Mbezi Beach', c: 'Dar es Salaam', lat: -6.7481, lng: 39.2622 },
    { n: 'Mbezi Juu', c: 'Dar es Salaam', lat: -6.8270, lng: 39.1050 },
    { n: 'Mwenge', c: 'Dar es Salaam', lat: -6.7800, lng: 39.2110 },
    { n: 'Mabibo', c: 'Dar es Salaam', lat: -6.8000, lng: 39.1980 },
    { n: 'Ubungo', c: 'Dar es Salaam', lat: -6.7960, lng: 39.1890 },
    { n: 'Kimara', c: 'Dar es Salaam', lat: -6.8210, lng: 39.1080 },
    { n: 'Kunduchi', c: 'Dar es Salaam', lat: -6.6660, lng: 39.2320 },
    { n: 'Boko', c: 'Dar es Salaam', lat: -6.6980, lng: 39.1580 },
    { n: 'Bunju', c: 'Dar es Salaam', lat: -6.6680, lng: 39.1220 },
    { n: 'Mbweni', c: 'Dar es Salaam', lat: -6.6240, lng: 39.0640 },
    { n: 'Tegeta', c: 'Dar es Salaam', lat: -6.7270, lng: 39.1390 },
    { n: 'Goba', c: 'Dar es Salaam', lat: -6.7920, lng: 39.1770 },
    { n: 'Kinondoni', c: 'Dar es Salaam', lat: -6.7862, lng: 39.2520 },
    { n: 'Kijitonyama', c: 'Dar es Salaam', lat: -6.7620, lng: 39.2170 },
    { n: 'Hananasif', c: 'Dar es Salaam', lat: -6.7600, lng: 39.2310 },
    { n: 'Makongo', c: 'Dar es Salaam', lat: -6.7480, lng: 39.2070 },
    { n: 'Regent Estate', c: 'Dar es Salaam', lat: -6.7440, lng: 39.2630 },
    { n: 'Mwenge n', c: 'Dar es Salaam', lat: -6.7800, lng: 39.2110 },
    { n: 'Manzese', c: 'Dar es Salaam', lat: -6.8140, lng: 39.2060 },
    { n: 'Tandale', c: 'Dar es Salaam', lat: -6.8160, lng: 39.2230 },
    { n: 'Magomeni', c: 'Dar es Salaam', lat: -6.7890, lng: 39.2630 },
    { n: 'Kariakoo', c: 'Dar es Salaam', lat: -6.8192, lng: 39.2440 },
    { n: 'Tabata', c: 'Dar es Salaam', lat: -6.8240, lng: 39.1920 },
    { n: 'Buguruni', c: 'Dar es Salaam', lat: -6.8200, lng: 39.2220 },
    { n: 'Ilala', c: 'Dar es Salaam', lat: -6.8240, lng: 39.2250 },
    { n: 'Kigogo', c: 'Dar es Salaam', lat: -6.7950, lng: 39.2300 },
    { n: 'Mbagala', c: 'Dar es Salaam', lat: -6.8900, lng: 39.2300 },
    { n: 'Kilimagomba', c: 'Dar es Salaam', lat: -6.8470, lng: 39.2920 },
    { n: 'Changanyikeni', c: 'Dar es Salaam', lat: -6.7800, lng: 39.1750 },
    { n: 'Kisutu', c: 'Dar es Salaam', lat: -6.8230, lng: 39.2440 },
    { n: 'Kivukoni', c: 'Dar es Salaam', lat: -6.8240, lng: 39.2910 },
    { n: 'Kigamboni', c: 'Dar es Salaam', lat: -6.8100, lng: 39.3240 },
    { n: 'Cocoa Beach', c: 'Dar es Salaam', lat: -6.7160, lng: 39.2650 },
    { n: 'Temeke', c: 'Dar es Salaam', lat: -6.9600, lng: 39.2200 },
    { n: 'Mbezi Luisi', c: 'Dar es Salaam', lat: -6.8300, lng: 39.1220 },
    { n: 'Kigali', c: 'Dar es Salaam', lat: -6.7000, lng: 39.1500 },
    { n: 'Morogoro', c: 'Morogoro', lat: -6.8230, lng: 37.5929 },
    { n: 'Dodoma', c: 'Dodoma', lat: -6.1629, lng: 35.7510 },
    { n: 'Mwanza', c: 'Mwanza', lat: -2.7954, lng: 39.9170 },
    { n: 'Arusha', c: 'Arusha', lat: -3.3869, lng: 36.6830 },
    { n: 'Mbeya', c: 'Mbeya', lat: -8.7881, lng: 35.4300 },
    { n: 'Tanga', c: 'Tanga', lat: -5.8310, lng: 37.1960 },
    { n: 'Zanzibar', c: 'Zanzibar', lat: -6.1620, lng: 39.2000 },
    { n: 'Moshi', c: 'Kilimanjaro', lat: -3.3254, lng: 37.3430 },
    { n: 'Tabora', c: 'Tabora', lat: -5.0160, lng: 32.8260 },
    { n: 'Songea', c: 'Ruvuma', lat: -10.6810, lng: 35.6400 },
    { n: 'Kigoma', c: 'Kigoma', lat: -4.8670, lng: 29.6260 },
    { n: 'Iringa', c: 'Iringa', lat: -7.7680, lng: 35.6980 },
    { n: 'Bukoba', c: 'Kagera', lat: -1.9630, lng: 31.8120 },
    { n: 'Musoma', c: 'Mara', lat: -1.0200, lng: 33.8460 }
  ];

  var current = load();
  var panel, backdrop;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var obj = JSON.parse(raw);
        if (obj && typeof obj.name === 'string' && obj.name.trim()) return obj;
      }
    } catch (ignored) {}
    return { name: DEFAULT_LOCATION };
  }

  function persist(extra) {
    current = Object.assign({}, current, extra || {}, { updatedAt: Date.now() });
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch (ignored) {}
    syncLabels();
    window.dispatchEvent(new CustomEvent('smartsoko:delivery-location', { detail: current }));
  }

  function get() {
    return current;
  }

  function setLocation(name, extra) {
    var safe = (name || '').trim();
    if (!safe) return;
    var payload = extra ? { name: safe, extra: extra } : { name: safe };
    persist(payload);
    closePanel();
  }

  function syncLabels() {
    var els = document.querySelectorAll('[data-location-value]');
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = current.name;
    }
  }

  function bindTriggers() {
    var triggers = document.querySelectorAll('[data-location-picker]');
    for (var i = 0; i < triggers.length; i++) {
      triggers[i].addEventListener('click', function () {
        openPanel();
      });
    }
  }

  function openPanel() {
    ensurePanel();
    if (panel.dataset.open === 'true') return;
    panel.dataset.open = 'true';
    backdrop.classList.remove('hidden');
    backdrop.style.display = 'flex';
    requestAnimationFrame(function () {
      backdrop.classList.remove('opacity-0');
      panel.classList.remove('translate-y-4', 'opacity-0');
    });
    renderList('');
    clearGpsMessage();
    moveFocusToSearch();
  }

  function closePanel() {
    if (!panel || panel.dataset.open !== 'true') return;
    panel.dataset.open = 'false';
    backdrop.classList.add('opacity-0');
    panel.classList.add('translate-y-4', 'opacity-0');
    setTimeout(function () {
      backdrop.classList.add('hidden');
      backdrop.style.display = 'none';
    }, 200);
  }

  function ensurePanel() {
    if (panel) return;
    var root = document.getElementById('smrtLocBackdrop');
    if (root) {
      backdrop = root;
      panel = document.getElementById('smrtLocPanel');
      wirePanel();
      return;
    }
    backdrop = document.createElement('div');
    backdrop.id = 'smrtLocBackdrop';
    backdrop.className = 'smrt-loc-fixed fixed inset-0 z-[100] hidden items-end sm:items-center justify-center p-0 sm:p-6 bg-black/50 transition-opacity duration-200 opacity-0';
    panel = document.createElement('div');
    panel.id = 'smrtLocPanel';
    panel.className = 'w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col translate-y-4 opacity-0 transition-all duration-200 max-h-[85vh]';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Choose delivery location');
    panel.innerHTML = buildMarkup();
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    wirePanel();
  }

  function buildMarkup() {
    return (
      '<div class="flex items-center justify-between px-5 pt-5 pb-3">' +
      '<h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">' +
      '<span class="material-symbols-outlined text-green-700">location_on</span>Choose delivery location</h2>' +
      '<button type="button" data-smrtloc-close aria-label="Close" class="w-9 h-9 -mr-1 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">' +
      '<span class="material-symbols-outlined">close</span></button>' +
      '</div>' +
      '<div class="px-5 pb-3">' +
      '<button type="button" data-smrtloc-gps class="w-full flex items-center gap-3 px-3.5 py-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-2xl text-left transition-colors">' +
      '<span class="material-symbols-outlined text-green-700">my_location</span>' +
      '<span class="text-sm text-green-900 font-medium">Use my current location</span>' +
      '</button>' +
      '<p id="smrtLocGpsMsg" class="text-xs text-gray-500 mt-2 min-h-4 leading-relaxed"></p>' +
      '</div>' +
      '<div class="px-5 pb-2 relative">' +
      '<span class="material-symbols-outlined absolute left-8 top-1/2 text-gray-400 text-lg -translate-y-1/2">search</span>' +
      '<input id="smrtLocSearch" type="text" placeholder="Search places, areas or cities" autocomplete="off" autocapitalize="words" ' +
      'class="w-full h-11 pl-10 pr-4 rounded-2xl border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all"/>' +
      '</div>' +
      '<ul id="smrtLocList" class="overflow-y-auto flex-1 px-2.5 py-3 space-y-0.5 max-h-[44vh] sm:max-h-[50vh]"></ul>' +
      '<div class="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">' +
      '<p class="text-xs text-gray-400 flex items-center gap-1.5 leading-relaxed">' +
      '<span class="material-symbols-outlined text-sm">directions_bike</span>' +
      'We deliver across Tanzania — choosing your area helps us personalize sellers and delivery prices.</p>' +
      '</div>'
    );
  }

  function wirePanel() {
    ensurePanelRefs();
    var closeBtn = backdrop.querySelector('[data-smrtloc-close]');
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closePanel();
    });
    var gps = backdrop.querySelector('[data-smrtloc-gps]');
    if (gps) gps.addEventListener('click', useGps);
    var search = document.getElementById('smrtLocSearch');
    if (search) {
      search.addEventListener('input', function () { renderList(search.value); });
      search.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var firstBtn = panel.querySelector('#smrtLocList [data-smrtloc-item], #smrtLocList [data-smrtloc-custom], #smrtLocList [data-smrtloc-main]');
          if (firstBtn) firstBtn.click();
        }
      });
    }
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });
  }

  function ensurePanelRefs() {
    panel = panel || document.getElementById('smrtLocPanel');
    backdrop = backdrop || document.getElementById('smrtLocBackdrop');
  }

  function moveFocusToSearch() {
    var search = document.getElementById('smrtLocSearch');
    if (search) {
      setTimeout(function () {
        if (search.value === '') search.focus();
      }, 220);
    }
  }

  function renderList(query) {
    var listEl = document.getElementById('smrtLocList');
    if (!listEl || !panel) return;
    var q = (query === 'all' ? '' : (query || '')).trim().toLowerCase();
    var html = '';
    if (!q) {
      html += groupTitle('Dar es Salaam');
      html += areasForCity('Dar es Salaam').map(function (a) { return rowHtml(a, false); }).join('');
      html += groupTitle('Cities across Tanzania');
      html += citiesOnly().map(function (a) { return rowHtml(a, true); }).join('');
    } else {
      var filtered = [];
      var matchedCity = false;
      for (var i = 0; i < AREAS.length; i++) {
        var a = AREAS[i];
        if (a.n.toLowerCase().indexOf(q) !== -1 || a.c.toLowerCase().indexOf(q) !== -1) {
          filtered.push({ a: a, city: a.c.toLowerCase() === q });
        }
      }
      if (filtered.length) {
        filtered.sort(function (x, y) {
          if (x.city !== y.city) return x.city ? -1 : 1;
          var xi = x.a.n.toLowerCase().indexOf(q);
          var yi = y.a.n.toLowerCase().indexOf(q);
          if (xi === -1 && yi === -1) return 0;
          if (xi === -1) return 1;
          if (yi === -1) return -1;
          return xi - yi;
        });
        html += filtered.map(function (x) { return rowHtml(x.a, x.a.c !== 'Dar es Salaam'); }).join('');
      } else {
        html +=
          '<li class="px-1 py-1">' +
          '<button type="button" data-smrtloc-custom="' + escapeAttr((query || '').trim()) + '" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-green-50 text-left transition-colors">' +
          '<span class="material-symbols-outlined text-green-700">add_location_alt</span>' +
          '<span class="text-sm text-gray-800"><span class="font-medium">Deliver to</span> "' + escapeHtml((query || '').trim()) + '"</span>' +
          '</button></li>';
      }
    }
    listEl.innerHTML = html;
    bindList(listEl);
  }

  function bindList(listEl) {
    var items = listEl.querySelectorAll('[data-smrtloc-item]');
    for (var i = 0; i < items.length; i++) {
      items[i].addEventListener('click', function () {
        setLocation(this.getAttribute('data-smrtloc-item'));
      });
    }
    var customs = listEl.querySelectorAll('[data-smrtloc-custom]');
    for (var j = 0; j < customs.length; j++) {
      customs[j].addEventListener('click', function () {
        setLocation(this.getAttribute('data-smrtloc-custom'));
      });
    }
    var mains = listEl.querySelectorAll('[data-smrtloc-main]');
    for (var k = 0; k < mains.length; k++) {
      mains[k].addEventListener('click', function () {
        setLocation(this.getAttribute('data-smrtloc-main'));
      });
    }
    var backs = listEl.querySelectorAll('[data-smrtloc-back]');
    for (var m = 0; m < backs.length; m++) {
      backs[m].addEventListener('click', function () {
        var search = document.getElementById('smrtLocSearch');
        renderList('');
        if (search) search.value = '';
        moveFocusToSearch();
      });
    }
  }

  function areasForCity(city) {
    return AREAS.filter(function (a) { return a.c === city; });
  }

  function citiesOnly() {
    return AREAS.filter(function (a) { return a.c !== 'Dar es Salaam'; });
  }

  function groupTitle(label) {
    return '<li class="px-3 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">' + label + '</li>';
  }

function rowHtml(a, withCity) {
    var active = current.name === a.n ? 'bg-green-50 ring-1 ring-green-200 text-green-900' : 'hover:bg-gray-100';
    var mark = current.name === a.n ? '<span class="material-symbols-outlined text-green-700 text-lg ml-auto flex-shrink-0">check</span>' : '';
    return (
      '<li><button type="button" data-smrtloc-item="' + escapeAttr(a.n) + '" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ' + active + '">' +
      '<span class="material-symbols-outlined ' + (current.name === a.n ? 'text-green-700' : 'text-gray-400') + ' text-lg flex-shrink-0">location_on</span>' +
      '<span class="min-w-0"><span class="block text-sm text-gray-800 truncate">' + escapeHtml(a.n) + '</span>' +
      (withCity && a.c ? '<span class="block text-xs text-gray-400 truncate">' + escapeHtml(a.c) + '</span>' : '') +
      '</span>' + mark + '</button></li>'
    );
  }

  function useGps() {
    if (!navigator.geolocation) {
      gpsMessage('Geolocation is not supported on this device.');
      return;
    }
    gpsMessage('Locating you...');
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        resolveGps(pos.coords.latitude, pos.coords.longitude);
      },
      function (err) {
        var msg = 'Could not detect your location. Pick a place below instead.';
        if (err && err.code === 1) msg = 'Location access was blocked. Enable it in your browser, then tap "Use my current location" again — or pick a place below.';
        gpsMessage(msg);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 }
    );
  }

  function resolveGps(lat, lng) {
    var near = nearestArea(lat, lng);
    if (!near) {
      gpsMessage('Could not pinpoint you. Pick a place below instead.');
      return;
    }
    if (near.d <= 55) {
      renderGpsView(nearestLabel(near), null, near);
    } else {
      reverseGeocode(lat, lng, function (head) {
        renderGpsView(head, near, near);
      });
    }
  }

  function renderGpsView(headName, fallbackNear, refNear) {
    clearGpsMessage();
    var listEl = document.getElementById('smrtLocList');
    if (!listEl) return;
    var alts = nearestList(refNear.lat, refNear.lng, 4, headName);
    var html = '';
    html +=
      '<li class="px-1 pb-2">' +
      '<div class="px-3.5 py-3 bg-green-50 rounded-2xl border border-green-200">' +
      '<div class="text-[11px] font-semibold text-green-700/70 uppercase tracking-wider flex items-center gap-1 mb-1.5">' +
      '<span class="material-symbols-outlined text-sm">near_me</span>Near your location</div>' +
      '<button type="button" data-smrtloc-main="' + escapeAttr(headName) + '" class="text-sm font-semibold text-green-900 hover:text-green-700 flex items-center gap-2 text-left w-full transition-colors">' +
      '<span class="material-symbols-outlined text-green-700">check_circle</span>Deliver to ' + escapeHtml(headName) + '</button>' +
      '</div>' +
      '</li>';
    if (alts.length) {
      html += groupTitle('Prefer a nearby area?');
      html += alts.map(function (a) { return rowHtml(a, true); }).join('');
    }
    html += '<li class="px-1 pt-2 text-center">' +
      '<button type="button" data-smrtloc-back class="text-xs font-semibold text-green-700 hover:underline">Browse all areas</button>' +
      '</li>';
    listEl.innerHTML = html;
    bindList(listEl);
  }

  function nearestList(lat, lng, count, excludeName) {
    var out = [];
    for (var i = 0; i < AREAS.length; i++) {
      var a = AREAS[i];
      if (a.lat == null) continue;
      if (excludeName && a.n === excludeName) continue;
      out.push({ d: km(lat, lng, a.lat, a.lng), a: a });
    }
    out.sort(function (x, y) { return x.d - y.d; });
    return out.slice(0, count).map(function (o) { return o.a; });
  }

  function nearestArea(lat, lng) {
    var best = null;
    for (var i = 0; i < AREAS.length; i++) {
      var a = AREAS[i];
      if (a.lat == null) continue;
      var d = km(lat, lng, a.lat, a.lng);
      if (!best || d < best.d) best = { area: a, d: d };
    }
    return best;
  }

  function nearestLabel(near) {
    return near.d <= 55 ? near.area.n : near.area.c + ', Tanzania';
  }

  function km(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var d2r = Math.PI / 180;
    var dLat = (lat2 - lat1) * d2r;
    var dLng = (lng2 - lng1) * d2r;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function reverseGeocode(lat, lng, cb) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 7000);
    fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + lat + '&lon=' + lng, {
      headers: { 'Accept': 'application/json' },
      signal: ctrl.signal
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        clearTimeout(timer);
        var a = (data && data.address) || {};
        var label = a.suburb || a.neighbourhood || a.city_district || a.town || a.city || a.municipality || 'Your location';
        if (label && label.toLowerCase().indexOf('netic') === 0) {
          var city = a.city || a.town || '';
          if (city && city.toLowerCase() !== label.toLowerCase()) label = label + ', ' + city;
        }
        var near = nearestArea(lat, lng);
        var fallback = near ? (near.d <= 55 ? near.area.n : near.area.c) : label;
        renderGpsView(label, near, near || { lat: lat, lng: lng, area: { n: label } });
      })
      .catch(function () {
        clearTimeout(timer);
        var near = nearestArea(lat, lng);
        var fallback = near ? (near.d <= 55 ? near.area.n : near.area.c) : 'Your location';
        renderGpsView(fallback, near, near || { lat: lat, lng: lng, area: { n: fallback } });
      });
  }

  function gpsMessage(msg) {
    var el = document.getElementById('smrtLocGpsMsg');
    if (el) el.textContent = msg;
  }

  function clearGpsMessage() {
    var el = document.getElementById('smrtLocGpsMsg');
    if (el) el.textContent = '';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }

  function init() {
    ensurePanel();
    syncLabels();
    bindTriggers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SmartLocation = {
    get: get,
    set: setLocation,
    open: openPanel,
    close: closePanel,
    on: function (fn) { window.addEventListener('smartsoko:delivery-location', function (e) { fn(e.detail, e); }); }
  };
})();