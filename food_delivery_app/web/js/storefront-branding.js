/**
 * Storefront Branding — Customize your public store page
 *  - File uploads (logo + banner) to /api/upload
 *  - 4 theme presets + custom primary/secondary color
 *  - Slogan, WhatsApp, Instagram, TikTok, Facebook, X
 *  - Store hours with open/closed per day
 *  - 24h Story / Status (auto-expires)
 *  - Verified badge request
 *  - Live phone-frame preview
 *  - QR code + shareable link
 *  - Persists to Firestore via window.sbSave() (or localStorage fallback)
 *
 * Safe to load on any page. Mounts only if a [data-sb-editor] node is found.
 */
(function () {
  const PRESETS = {
    bongo:  { name: 'Bongo Sunset', primary: '#E63946', secondary: '#ff6600', banner: 'linear-gradient(135deg,#E63946 0%,#ff6600 50%,#F4A261 100%)' },
    ocean:  { name: 'Ocean Breeze', primary: '#06A77D', secondary: '#0ea5e9', banner: 'linear-gradient(135deg,#06A77D 0%,#0ea5e9 100%)' },
    forest: { name: 'Forest',       primary: '#16a34a', secondary: '#064e3b', banner: 'linear-gradient(135deg,#064e3b 0%,#16a34a 100%)' },
    sunset: { name: 'Bongo Purple', primary: '#7c3aed', secondary: '#db2777', banner: 'linear-gradient(135deg,#7c3aed 0%,#db2777 60%,#f59e0b 100%)' }
  };

  const DAYS = [
    { id: 'sun', sw: 'Jumapili', en: 'Sunday' },
    { id: 'mon', sw: 'Jumatatu', en: 'Monday' },
    { id: 'tue', sw: 'Jumanne', en: 'Tuesday' },
    { id: 'wed', sw: 'Jumatano', en: 'Wednesday' },
    { id: 'thu', sw: 'Alhamisi', en: 'Thursday' },
    { id: 'fri', sw: 'Ijumaa',   en: 'Friday' },
    { id: 'sat', sw: 'Jumamosi', en: 'Saturday' }
  ];

  const DEFAULT_HOURS = {
    mon: { open: '07:00', close: '21:00', closed: false },
    tue: { open: '07:00', close: '21:00', closed: false },
    wed: { open: '07:00', close: '21:00', closed: false },
    thu: { open: '07:00', close: '21:00', closed: false },
    fri: { open: '07:00', close: '22:00', closed: false },
    sat: { open: '08:00', close: '22:00', closed: false },
    sun: { open: '09:00', close: '20:00', closed: false }
  };

  const DEFAULT_STATE = {
    logoUrl: '',
    bannerUrl: '',
    bannerPreset: '',
    primaryColor: '#ff6600',
    secondaryColor: '#E63946',
    slogan: '',
    about: '',
    whatsapp: '',
    instagram: '',
    tiktok: '',
    facebook: '',
    x: '',
    hours: JSON.parse(JSON.stringify(DEFAULT_HOURS)),
    storyEnabled: false,
    storyText: '',
    storyEmoji: '🔥',
    storyExpiresAt: 0,
    verified: false,
    verifiedRequested: false
  };

  // ── Storage ─────────────────────────────────────────────
  const STORE_KEY = 'smartsoko_storefront_branding';

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return clone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      return Object.assign(clone(DEFAULT_STATE), parsed, {
        hours: Object.assign(clone(DEFAULT_HOURS), parsed.hours || {})
      });
    } catch (_) { return clone(DEFAULT_STATE); }
  }
  function saveLocal(s) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (_) {}
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ── Upload helper ──────────────────────────────────────
  async function uploadFile(file) {
    if (!file) return null;
    if (file.size > 5 * 1024 * 1024) { alert('Image too large (max 5MB)'); return null; }
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = async () => {
        try {
          const r = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, dataUrl: fr.result })
          });
          const j = await r.json();
          if (j && j.url) resolve(j.url);
          else { console.warn('Upload failed', j); resolve(null); }
        } catch (e) {
          console.error('Upload error', e);
          resolve(null);
        }
      };
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(file);
    });
  }

  // ── Helper: build public store URL ──────────────────────
  function publicUrl(sellerId) {
    return `${location.origin}/store?sellerId=${encodeURIComponent(sellerId)}`;
  }

  // ── Render helpers ──────────────────────────────────────
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s); }

  function renderLogoPreview(host, url) {
    if (!host) return;
    if (url) {
      host.innerHTML = `<img src="${esc(url)}" alt="Logo" onerror="this.outerHTML='<span class=&quot;material-symbols-outlined&quot;>storefront</span>'">`;
    } else {
      host.innerHTML = `<span class="material-symbols-outlined">storefront</span>`;
    }
  }
  function renderBannerPreview(host, url) {
    if (!host) return;
    if (url) {
      host.style.backgroundImage = `url(${JSON.stringify(url)})`;
      host.innerHTML = '';
    } else {
      host.style.backgroundImage = '';
      host.innerHTML = '<div class="sb-upload-placeholder"><span class="material-symbols-outlined">image</span>Drop banner here</div>';
    }
  }

  // ── Mount the editor into a host element ───────────────
  function mountEditor(host, opts) {
    opts = opts || {};
    const sellerId = opts.sellerId || 'demo';
    const initial = opts.initial
      ? Object.assign(clone(DEFAULT_STATE), opts.initial, {
          hours: Object.assign(clone(DEFAULT_HOURS), opts.initial.hours || {})
        })
      : load();

    // Expose public store URL to the editor
    host.dataset.publicUrl = publicUrl(sellerId);
    host.dataset.sellerId = sellerId;

    host.innerHTML = `
      <div class="sb-editor-grid">
        <!-- EDITOR (LEFT) -->
        <div class="sb-editor">
          <div class="sb-tabs" role="tablist">
            <button type="button" class="sb-tab active" data-tab="look">
              <span class="material-symbols-outlined" style="font-size:16px">palette</span> Mwonekano
            </button>
            <button type="button" class="sb-tab" data-tab="contact">
              <span class="material-symbols-outlined" style="font-size:16px">contact_page</span> Mawasiliano
            </button>
            <button type="button" class="sb-tab" data-tab="hours">
              <span class="material-symbols-outlined" style="font-size:16px">schedule</span> Masaa
            </button>
            <button type="button" class="sb-tab" data-tab="story">
              <span class="material-symbols-outlined" style="font-size:16px">campaign</span> Story
            </button>
            <button type="button" class="sb-tab" data-tab="verify">
              <span class="material-symbols-outlined" style="font-size:16px">verified</span> Verified
            </button>
          </div>

          <!-- LOOK -->
          <div class="sb-tab-content active" data-tab-content="look">
            <div class="sb-section" style="display:flex; gap:12px; align-items:flex-start;">
              <div>
                <label class="sb-label">Logo</label>
                <label class="sb-upload sb-upload-logo" id="sbLogoUpload">
                  <span class="sb-upload-placeholder"><span class="material-symbols-outlined">storefront</span></span>
                  <input type="file" accept="image/*" data-sb-logo-input>
                </label>
                <p class="sb-hint">PNG / JPG · max 5MB</p>
              </div>
              <div style="flex:1">
                <label class="sb-label">Jina la Duka</label>
                <input type="text" class="sb-input" data-sb-field="storeName" placeholder="Mama Amina Duka" value="${esc(opts.storeName || '')}">
                <label class="sb-label" style="margin-top:10px">Slogan</label>
                <input type="text" class="sb-input" data-sb-field="slogan" placeholder="Mama ntilie bora Kariakoo" maxlength="60" value="${esc(initial.slogan || '')}">
                <p class="sb-hint">Mfano: "Vitumbua vya kila asubuhi tangu 1998"</p>
              </div>
            </div>

            <div class="sb-section">
              <label class="sb-label">Banner / Picha ya Cover</label>
              <label class="sb-upload sb-upload-banner" id="sbBannerUpload">
                <div class="sb-upload-placeholder"><span class="material-symbols-outlined">image</span>Pakia picha au weka URL</div>
              </label>
              <input type="text" class="sb-input" data-sb-field="bannerUrl" placeholder="Au weka URL ya picha..." style="margin-top:8px" value="${esc(initial.bannerUrl || '')}">
            </div>

            <div class="sb-section">
              <label class="sb-label">Theme Preset</label>
              <div class="sb-presets">
                <button type="button" class="sb-preset sb-preset-bongo"  data-preset="bongo">Bongo</button>
                <button type="button" class="sb-preset sb-preset-ocean"  data-preset="ocean">Ocean</button>
                <button type="button" class="sb-preset sb-preset-forest" data-preset="forest">Forest</button>
                <button type="button" class="sb-preset sb-preset-sunset" data-preset="sunset">Purple</button>
              </div>
              <div class="sb-color-row">
                <div style="flex:1">
                  <label class="sb-label">Primary</label>
                  <input type="color" data-sb-field="primaryColor" value="${esc(initial.primaryColor || '#ff6600')}">
                </div>
                <div style="flex:1">
                  <label class="sb-label">Secondary</label>
                  <input type="color" data-sb-field="secondaryColor" value="${esc(initial.secondaryColor || '#E63946')}">
                </div>
              </div>
            </div>

            <div class="sb-section">
              <label class="sb-label">Kuhusu Soko / Our Story</label>
              <textarea class="sb-textarea" data-sb-field="about" placeholder="Sema hadithi ya duka lako..." maxlength="500">${esc(initial.about || '')}</textarea>
              <p class="sb-hint">Hadi vibambo 500. Andika kwa Kiswahili au Kiingereza.</p>
            </div>
          </div>

          <!-- CONTACT -->
          <div class="sb-tab-content" data-tab-content="contact">
            <div class="sb-section">
              <label class="sb-label">WhatsApp (click-to-chat)</label>
              <div class="sb-socials">
                <div class="sb-social-row">
                  <div class="sb-social-icon whatsapp"><span class="material-symbols-outlined">chat</span></div>
                  <input type="tel" class="sb-input" data-sb-field="whatsapp" placeholder="255712345678" value="${esc(initial.whatsapp || '')}">
                </div>
                <div class="sb-social-row">
                  <div class="sb-social-icon instagram"><span class="material-symbols-outlined">photo_camera</span></div>
                  <input type="text" class="sb-input" data-sb-field="instagram" placeholder="@mama_amina" value="${esc(initial.instagram || '')}">
                </div>
                <div class="sb-social-row">
                  <div class="sb-social-icon tiktok"><span class="material-symbols-outlined">music_note</span></div>
                  <input type="text" class="sb-input" data-sb-field="tiktok" placeholder="@mama_amina" value="${esc(initial.tiktok || '')}">
                </div>
                <div class="sb-social-row">
                  <div class="sb-social-icon facebook"><span class="material-symbols-outlined">thumb_up</span></div>
                  <input type="text" class="sb-input" data-sb-field="facebook" placeholder="mama.amina" value="${esc(initial.facebook || '')}">
                </div>
                <div class="sb-social-row">
                  <div class="sb-social-icon x"><span class="material-symbols-outlined">close</span></div>
                  <input type="text" class="sb-input" data-sb-field="x" placeholder="@mama_amina" value="${esc(initial.x || '')}">
                </div>
              </div>
              <p class="sb-hint">Weka jina la mtumiaji (bila @) — tutaongeza kiambishi automatically.</p>
            </div>
          </div>

          <!-- HOURS -->
          <div class="sb-tab-content" data-tab-content="hours">
            <div class="sb-section">
              <label class="sb-label">Masaa ya Ufunguzi</label>
              <p class="sb-hint" style="margin-top:0;margin-bottom:10px">Weka saa za kufungua duka. Tutaonyesha 'Open' / 'Closed' kwa wateja moja kwa moja.</p>
              <div class="sb-hours" id="sbHours">
                ${DAYS.map(d => {
                  const h = (initial.hours && initial.hours[d.id]) || DEFAULT_HOURS[d.id];
                  return `
                    <div class="sb-hours-row ${h.closed ? 'sb-closed' : ''}" data-day="${d.id}">
                      <span class="sb-day">${esc(d.sw)}</span>
                      <input type="time" data-sb-hours="${d.id}-open"  value="${esc(h.open)}">
                      <input type="time" data-sb-hours="${d.id}-close" value="${esc(h.close)}">
                      <button type="button" class="sb-hours-toggle ${h.closed ? 'off' : ''}" data-sb-hours-toggle="${d.id}" title="Funga / Fungua">
                        <span class="material-symbols-outlined" style="font-size:16px">${h.closed ? 'close' : 'check'}</span>
                      </button>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- STORY -->
          <div class="sb-tab-content" data-tab-content="story">
            <div class="sb-section">
              <label class="sb-label">24h Story / Status</label>
              <p class="sb-hint" style="margin-top:0;margin-bottom:10px">Onyesha tangazo kwa masaa 24 — kisha litaisha lenyewe.</p>
              <div class="sb-story-toggle">
                <span>Washa story</span>
                <div class="sb-switch ${initial.storyEnabled ? 'on' : ''}" data-sb-story-toggle></div>
              </div>
              <div style="display:flex; gap:8px">
                <input type="text" class="sb-input" style="max-width:60px" data-sb-field="storyEmoji" value="${esc(initial.storyEmoji || '🔥')}" maxlength="2">
                <input type="text" class="sb-input" data-sb-field="storyText" placeholder="Mfano: Samaki mpya imefika! 🐟" maxlength="80" value="${esc(initial.storyText || '')}">
              </div>
            </div>
          </div>

          <!-- VERIFY -->
          <div class="sb-tab-content" data-tab-content="verify">
            <div class="sb-section">
              <label class="sb-label">Verified Badge</label>
              <div class="sb-verified-row ${initial.verified ? 'verified' : ''}" id="sbVerifiedRow">
                <span class="material-symbols-outlined" style="font-size:18px">${initial.verified ? 'verified' : 'shield'}</span>
                <div>
                  <div>${initial.verified ? 'Duka lako limehakikiwa ✓' : 'Omba kupata alama ya verified'}</div>
                  <div style="font-size:11px; opacity:.8; font-weight:500">${initial.verified ? 'Wateja wataona tiketi ya bluu kwenye jina lako.' : 'Tutakuchukulia umeidhinishwa ndani ya masaa 24.'}</div>
                </div>
                ${initial.verified ? '' : `<button type="button" data-sb-verify>${initial.verifiedRequested ? 'Inasubiri...' : 'Omba sasa'}</button>`}
              </div>
            </div>
          </div>

          <!-- SAVE BAR -->
          <div class="sb-savebar">
            <div class="sb-status" id="sbStatus">Haijawahi kuhifadhiwa</div>
            <button type="button" class="sb-preview-btn" id="sbPreviewBtn">
              <span class="material-symbols-outlined" style="font-size:16px">open_in_new</span>
              Fungua
            </button>
            <button type="button" class="sb-save-btn" id="sbSaveBtn">
              <span class="material-symbols-outlined" style="font-size:16px">save</span>
              Hifadhi
            </button>
          </div>
        </div>

        <!-- PREVIEW (RIGHT) -->
        <div class="sb-preview-wrap">
          <div style="text-align:center; font-size:12px; color:#666; margin-bottom:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em">
            Live Preview
          </div>
          <div class="sb-preview" id="sbPreview">
            <!-- Filled by renderPreview() -->
          </div>
        </div>
      </div>
    `;

    // ── Wire field listeners ─────────────────────────────
    function collectFromForm() {
      const s = clone(state);
      host.querySelectorAll('[data-sb-field]').forEach(el => {
        const k = el.getAttribute('data-sb-field');
        s[k] = el.value;
      });
      // Hours
      DAYS.forEach(d => {
        const row = host.querySelector(`[data-day="${d.id}"]`);
        if (!row) return;
        const closed = row.classList.contains('sb-closed');
        const openV  = row.querySelector(`[data-sb-hours="${d.id}-open"]`).value || '08:00';
        const closeV = row.querySelector(`[data-sb-hours="${d.id}-close"]`).value || '20:00';
        s.hours[d.id] = { open: openV, close: closeV, closed };
      });
      return s;
    }
    function applyToForm(s) {
      host.querySelectorAll('[data-sb-field]').forEach(el => {
        const k = el.getAttribute('data-sb-field');
        if (Object.prototype.hasOwnProperty.call(s, k)) el.value = s[k] || '';
      });
      // Hours
      DAYS.forEach(d => {
        const h = s.hours[d.id] || DEFAULT_HOURS[d.id];
        const row = host.querySelector(`[data-day="${d.id}"]`);
        if (!row) return;
        row.classList.toggle('sb-closed', !!h.closed);
        row.querySelector(`[data-sb-hours="${d.id}-open"]`).value  = h.open  || '08:00';
        row.querySelector(`[data-sb-hours="${d.id}-close"]`).value = h.close || '20:00';
        const t = row.querySelector(`[data-sb-hours-toggle="${d.id}"]`);
        t.classList.toggle('off', !!h.closed);
        t.querySelector('.material-symbols-outlined').textContent = h.closed ? 'close' : 'check';
      });
      // Logo + banner previews
      renderLogoPreview(host.querySelector('#sbLogoUpload'), s.logoUrl);
      renderBannerPreview(host.querySelector('#sbBannerUpload'), s.bannerUrl);
      // Preset highlight
      host.querySelectorAll('[data-preset]').forEach(p => p.classList.toggle('active', p.dataset.preset === s.bannerPreset));
      // Story switch
      const sw = host.querySelector('[data-sb-story-toggle]');
      if (sw) sw.classList.toggle('on', !!s.storyEnabled);
      // Verified row
      const vr = host.querySelector('#sbVerifiedRow');
      if (vr) {
        vr.classList.toggle('verified', !!s.verified);
        vr.querySelector('.material-symbols-outlined').textContent = s.verified ? 'verified' : 'shield';
      }
    }

    let state = initial;
    let saveTimer = null;
    function setStatus(msg, type) {
      const el = host.querySelector('#sbStatus');
      if (!el) return;
      el.textContent = msg;
      el.className = 'sb-status' + (type ? ' ' + type : '');
    }
    function sync() {
      state = collectFromForm();
      // Apply primary color to editor accents
      host.style.setProperty('--sb-primary', state.primaryColor || '#ff6600');
      renderPreview(host, state, host.dataset.publicUrl);
      // Auto-save to local
      saveLocal(state);
      setStatus('Imebadilishwa (hijahifadhiwa server)', '');
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => setStatus('Tayari kuhifadhi', ''), 1200);
    }

    // Field events
    host.addEventListener('input',  sync);
    host.addEventListener('change', sync);

    // Tab switching
    host.querySelectorAll('.sb-tab').forEach(t => {
      t.addEventListener('click', () => {
        host.querySelectorAll('.sb-tab').forEach(x => x.classList.toggle('active', x === t));
        const id = t.dataset.tab;
        host.querySelectorAll('.sb-tab-content').forEach(c => c.classList.toggle('active', c.dataset.tabContent === id));
      });
    });

    // Theme presets
    host.querySelectorAll('[data-preset]').forEach(p => {
      p.addEventListener('click', () => {
        const k = p.dataset.preset;
        const preset = PRESETS[k];
        if (!preset) return;
        state.primaryColor = preset.primary;
        state.secondaryColor = preset.secondary;
        state.bannerPreset = k;
        applyToForm(state);
        sync();
      });
    });

    // Logo upload
    host.querySelector('[data-sb-logo-input]').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      setStatus('Inapakia logo...', 'saving');
      const url = await uploadFile(file);
      if (url) {
        state.logoUrl = url;
        applyToForm(state);
        sync();
      } else {
        setStatus('Imeshindwa kupakia logo', 'error');
      }
    });

    // Banner file upload (clicking the upload box opens file picker; the URL field is separate)
    const bannerUpload = host.querySelector('#sbBannerUpload');
    let bannerFileInput = bannerUpload.querySelector('input[type=file]');
    if (!bannerFileInput) {
      bannerFileInput = document.createElement('input');
      bannerFileInput.type = 'file';
      bannerFileInput.accept = 'image/*';
      bannerFileInput.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer';
      bannerUpload.appendChild(bannerFileInput);
    }
    bannerFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      setStatus('Inapakia banner...', 'saving');
      const url = await uploadFile(file);
      if (url) {
        state.bannerUrl = url;
        applyToForm(state);
        sync();
      } else {
        setStatus('Imeshindwa kupakia banner', 'error');
      }
    });

    // Hours toggle buttons
    host.querySelectorAll('[data-sb-hours-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.sb-hours-row');
        row.classList.toggle('sb-closed');
        sync();
      });
    });

    // Story switch
    const storySw = host.querySelector('[data-sb-story-toggle]');
    if (storySw) {
      storySw.addEventListener('click', () => {
        state.storyEnabled = !state.storyEnabled;
        storySw.classList.toggle('on', state.storyEnabled);
        if (state.storyEnabled && !state.storyExpiresAt) {
          state.storyExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
        }
        if (!state.storyEnabled) state.storyExpiresAt = 0;
        sync();
      });
    }

    // Verified request
    const vbtn = host.querySelector('[data-sb-verify]');
    if (vbtn) {
      vbtn.addEventListener('click', () => {
        state.verifiedRequested = true;
        vbtn.textContent = 'Inasubiri...';
        vbtn.disabled = true;
        sync();
      });
    }

    // Save button
    host.querySelector('#sbSaveBtn').addEventListener('click', async () => {
      const btn = host.querySelector('#sbSaveBtn');
      btn.disabled = true;
      setStatus('Inahifadhi...', 'saving');
      try {
        // Optional server save via window.sbSave hook
        if (typeof window.sbSave === 'function') {
          await window.sbSave(state, host.dataset.sellerId);
        } else {
          // Fallback: just persist locally + simulate success
          await new Promise(r => setTimeout(r, 400));
        }
        saveLocal(state);
        setStatus('Imehifadhiwa! ✓', 'saved');
        setTimeout(() => setStatus('Imehifadhiwa', ''), 1800);
      } catch (e) {
        setStatus('Imeshindwa kuhifadhi: ' + (e.message || e), 'error');
      } finally {
        btn.disabled = false;
      }
    });

    // Preview (open in new tab)
    host.querySelector('#sbPreviewBtn').addEventListener('click', () => {
      // Persist to a temp key so the new tab can pick it up
      try { sessionStorage.setItem('smartsoko_storefront_preview', JSON.stringify(state)); } catch (_) {}
      window.open(host.dataset.publicUrl, '_blank');
    });

    // Initial render
    applyToForm(state);
    sync();
    setStatus('Imehifadhiwa', '');

    // Expose for external use
    return {
      getState: () => clone(state),
      refresh: sync
    };
  }

  // ── Live preview inside the phone frame ────────────────
  function renderPreview(host, s, publicUrl) {
    const pv = host.querySelector('#sbPreview');
    if (!pv) return;
    // Auto-expire story
    const now = Date.now();
    const showStory = s.storyEnabled && s.storyText && (!s.storyExpiresAt || s.storyExpiresAt > now);

    // Today / now
    const dayKey = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()];
    const todayHours = s.hours[dayKey] || DEFAULT_HOURS[dayKey];
    let isOpen = false;
    if (todayHours && !todayHours.closed) {
      const nowM = new Date().getHours() * 60 + new Date().getMinutes();
      const [oh, om] = (todayHours.open || '08:00').split(':').map(Number);
      const [ch, cm] = (todayHours.close || '20:00').split(':').map(Number);
      isOpen = nowM >= oh * 60 + om && nowM <= ch * 60 + cm;
    }

    // Banner style
    let bannerStyle = '';
    if (s.bannerUrl) {
      bannerStyle = `background-image:url(${JSON.stringify(s.bannerUrl)});background-size:cover;background-position:center;`;
    } else if (s.bannerPreset && PRESETS[s.bannerPreset]) {
      bannerStyle = `background-image:${PRESETS[s.bannerPreset].banner};`;
    } else {
      bannerStyle = `background:linear-gradient(135deg, ${s.primaryColor || '#ff6600'} 0%, ${s.secondaryColor || '#E63946'} 100%);`;
    }

    // WhatsApp link
    const waLink = s.whatsapp
      ? `https://wa.me/${String(s.whatsapp).replace(/[^0-9]/g, '')}`
      : '#';

    // Social links
    const social = (cls, val, base) => {
      if (!val) return '';
      const handle = String(val).replace(/^@/, '').trim();
      return `<a href="${base}${encodeURIComponent(handle)}" target="_blank" rel="noopener" class="${cls}"><span class="material-symbols-outlined">${cls === 'whatsapp' ? 'chat' : cls === 'instagram' ? 'photo_camera' : cls === 'tiktok' ? 'music_note' : cls === 'facebook' ? 'thumb_up' : 'close'}</span></a>`;
    };

    pv.innerHTML = `
      <div class="sb-pv-banner" style="${bannerStyle}">
        ${s.bannerUrl || s.bannerPreset ? '' : `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.4);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">${esc(PRESETS[s.bannerPreset] ? PRESETS[s.bannerPreset].name + ' Theme' : 'Cover Image')}</div>`}
      </div>
      <div class="sb-pv-head">
        <div class="sb-pv-logo">${s.logoUrl ? `<img src="${esc(s.logoUrl)}" alt="">` : `<span class="material-symbols-outlined">storefront</span>`}</div>
        <div class="sb-pv-titles">
          <h2>${esc(host.closest('[data-store-name]')?.dataset.storeName || 'Duka Lako')} ${s.verified ? '<span class="material-symbols-outlined" style="font-size:14px;color:#2563eb;font-variation-settings:\'FILL\' 1;">verified</span>' : ''}</h2>
          ${s.slogan ? `<div class="sb-pv-slogan">"${esc(s.slogan)}"</div>` : ''}
        </div>
      </div>
      <div class="sb-pv-status-bar">
        <div class="sb-pv-dot ${isOpen ? '' : 'closed'}"></div>
        <span>${isOpen ? 'Open · inafungua sasa' : 'Closed · imefungwa'}</span>
        <span style="margin-left:auto">${Object.values(s.hours).filter(h => !h.closed).length}/7 days</span>
      </div>
      ${showStory ? `
        <div class="sb-pv-story">
          <span style="font-size:20px">${esc(s.storyEmoji || '🔥')}</span>
          <span>${esc(s.storyText)}</span>
        </div>
      ` : ''}
      <div class="sb-pv-cta">
        <button class="sb-pv-order" style="background:${esc(s.primaryColor || '#ff6600')}" onclick="event.preventDefault();alert('Hii ni preview tu. Wateja wataona ukurasa wa duka halisi.')">
          <span class="material-symbols-outlined" style="font-size:14px">shopping_bag</span> Order
        </button>
        ${s.whatsapp ? `<a class="sb-pv-whatsapp" href="${esc(waLink)}" target="_blank" rel="noopener" style="text-decoration:none;flex:1">
          <button class="sb-pv-whatsapp" style="width:100%">
            <span class="material-symbols-outlined" style="font-size:14px">chat</span> WhatsApp
          </button>
        </a>` : ''}
      </div>
      ${s.about ? `
        <div class="sb-pv-about">
          <h4>Our Story</h4>
          ${esc(s.about)}
        </div>
      ` : ''}
      <div class="sb-pv-hours">
        <h4>Masaa ya Ufunguzi</h4>
        ${DAYS.map(d => {
          const h = s.hours[d.id] || DEFAULT_HOURS[d.id];
          const isToday = d.id === dayKey;
          return `<div class="sb-pv-hours-row ${isToday ? 'today' : ''} ${h.closed ? 'closed' : ''}">
            <span>${esc(d.sw)}</span>
            <span>${h.closed ? 'Imefungwa' : `${esc(h.open)} - ${esc(h.close)}`}</span>
          </div>`;
        }).join('')}
      </div>
      ${(s.instagram || s.tiktok || s.facebook || s.x) ? `
        <div class="sb-pv-socials">
          ${social('whatsapp', s.whatsapp, 'https://wa.me/')}
          ${social('instagram', s.instagram, 'https://instagram.com/')}
          ${social('tiktok', s.tiktok, 'https://tiktok.com/@')}
          ${social('facebook', s.facebook, 'https://facebook.com/')}
          ${social('x', s.x, 'https://x.com/')}
        </div>
      ` : ''}
      <div class="sb-pv-share">
        <button onclick="navigator.clipboard.writeText('${esc(publicUrl)}');alert('Link imenakiliwa!')">
          <span class="material-symbols-outlined" style="font-size:14px">link</span> Copy Link
        </button>
        <button onclick="window.StoreShare && StoreShare.whatsapp('${esc((host.closest('[data-store-name]')?.dataset.storeName) || 'Duka')}','${esc(publicUrl)}')">
          <span class="material-symbols-outlined" style="font-size:14px">share</span> WhatsApp
        </button>
        <button onclick="alert('QR Code: ${esc(publicUrl)}')">
          <span class="material-symbols-outlined" style="font-size:14px">qr_code_2</span> QR
        </button>
      </div>
    `;
  }

  // ── Public API ─────────────────────────────────────────
  window.StorefrontBranding = {
    mount: mountEditor,
    PRESETS, DAYS, DEFAULT_STATE,
    load, save: saveLocal
  };

  // Auto-mount any [data-sb-editor] on the page
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-sb-editor]').forEach(el => {
      const sellerId = el.dataset.sbEditor || el.dataset.sellerId || 'demo';
      const storeName = el.dataset.storeName || '';
      mountEditor(el, { sellerId, storeName });
    });
  });
})();
