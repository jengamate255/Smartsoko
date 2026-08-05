function runAudit() {
  const results = { issues: [], stats: {} };
  const issue = (type, severity, el, msg) => {
    if (!el) {
      results.issues.push({ type, severity, msg, x: 0, y: 0, w: 0, h: 0 });
      return;
    }
    const r = el.getBoundingClientRect();
    const tag = el.tagName ? el.tagName.toLowerCase() : '?';
    const cls = (el.className && typeof el.className === 'string') ? el.className.split(' ').slice(0, 4).join('.') : '';
    results.issues.push({ type, severity, tag, cls, text: (el.textContent || '').trim().slice(0, 60), msg, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
  };
  const vw = document.documentElement.clientWidth;
  const all = document.querySelectorAll('*');
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  results.stats.totalElements = all.length;
  results.stats.viewport = vw;

  const docW = Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0);
  if (docW > vw + 1) {
    results.stats.docScrollWidth = docW;
    issue('horizontal-overflow', 'high', document.body, 'Page scrolls horizontally: ' + docW + 'px vs viewport ' + vw + 'px');
    for (const el of all) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 2 && r.width > 40) {
        issue('overflow-element', 'high', el, 'Element extends past right edge (' + Math.round(r.right) + 'px)');
        break;
      }
    }
  }

  const textEls = document.querySelectorAll('p, span, a, button, li, td, th, label, div, h1, h2, h3, h4, h5, h6, input, select, textarea');
  let tinyCount = 0;
  for (const el of textEls) {
    if (!visible(el) || !el.textContent.trim() && el.tagName !== 'INPUT') continue;
    const s = getComputedStyle(el);
    const size = parseFloat(s.fontSize);
    if (size > 0 && size < 11 && tinyCount < 5) {
      tinyCount++;
      issue('tiny-font', 'medium', el, 'Font size ' + size + 'px');
    }
  }

  const imgs = document.querySelectorAll('img');
  let imgBroken = 0, imgNoAlt = 0;
  for (const img of imgs) {
    if (img.complete && img.naturalWidth === 0 && visible(img)) {
      imgBroken++;
      if (imgBroken < 5) issue('broken-image', 'medium', img, 'Broken image src=' + (img.src || '').slice(0, 80));
    }
    if (!img.alt && visible(img)) {
      imgNoAlt++;
      if (imgNoAlt < 5) issue('missing-alt', 'low', img, 'Image without alt text');
    }
  }
  results.stats.images = imgs.length;
  results.stats.brokenImages = imgBroken;

  const btns = document.querySelectorAll('button, a, [role=button], input[type=submit], input[type=button]');
  let unnamed = 0;
  for (const el of btns) {
    const txt = (el.textContent || '').trim();
    const aria = el.getAttribute('aria-label');
    const title = el.getAttribute('title');
    const alt = el.getAttribute('alt');
    const val = el.value;
    if (!txt && !aria && !title && !alt && !val) {
      unnamed++;
      if (unnamed < 8) issue('unnamed-control', 'medium', el, 'Button/link with no accessible name');
    }
  }
  results.stats.unnamedControls = unnamed;

  let smallTarget = 0;
  for (const el of btns) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 32 && r.height < 32 && !el.querySelector('*')) {
      smallTarget++;
      if (smallTarget < 8) issue('tiny-target', 'low', el, 'Touch target too small ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
  }
  results.stats.smallTargets = smallTarget;

  const heads = [];
  document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => { if (visible(h)) heads.push(parseInt(h.tagName[1])); });
  let skipped = 0;
  let prev = heads[0] || 1;
  for (const lvl of heads.slice(1)) {
    if (lvl > prev + 1) { skipped++; if (skipped < 3) issue('heading-skip', 'low', null, 'Heading jump h' + prev + ' -> h' + lvl); }
    prev = lvl;
  }
  results.stats.headings = heads;

  const ids = {};
  document.querySelectorAll('[id]').forEach(el => { ids[el.id] = (ids[el.id] || 0) + 1; });
  const dupIds = Object.entries(ids).filter((kv) => kv[1] > 1);
  if (dupIds.length) issue('duplicate-ids', 'medium', null, 'Duplicate IDs: ' + dupIds.slice(0, 3).map(kv => '#' + kv[0] + 'x' + kv[1]).join(', '));

  let inlineStyles = 0;
  for (const el of all) {
    if (el.style && el.style.cssText && /(width|height|margin|padding|position|display|flex|top|left|right|bottom|z-index|background|color|font-size|gap)/i.test(el.style.cssText)) {
      inlineStyles++;
    }
  }
  results.stats.inlineStyles = inlineStyles;

  const lum = (hex) => {
    const m = hex.match(/[0-9a-f]{2}/gi);
    if (!m || m.length < 3) return 0.5;
    const rgb = m.slice(0, 3).map(c => parseInt(c, 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const parseRgb = (str) => { const m2 = str.match(/([0-9.]+)/g); return m2 ? m2.slice(0, 3).map(Number) : null; };
  let lowContrast = 0;
  for (const el of textEls) {
    if (!visible(el) || !el.textContent.trim()) continue;
    if (el.textContent.trim().length < 2) continue;
    const s = getComputedStyle(el);
    if (!s.color || !s.color.includes('rgb')) continue;
    const fg = parseRgb(s.color);
    if (!fg) continue;
    let bgLum = 1;
    const bg = parseRgb(s.backgroundColor);
    if (bg && s.backgroundColor.includes('rgb') && s.backgroundColor.indexOf('0, 0, 0, 0') === -1) {
      bgLum = lum(bg.slice(0, 3).map(c => Math.round(c).toString(16).padStart(2, '0')).join(''));
    }
    const fgLum = lum(fg.slice(0, 3).map(c => Math.round(c).toString(16).padStart(2, '0')).join(''));
    const ratio = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
    if (ratio < 2.2 && parseFloat(s.fontSize) >= 11 && lowContrast < 6) {
      lowContrast++;
      issue('low-contrast', 'medium', el, 'Contrast ' + ratio.toFixed(2) + ' fg=' + s.color + ' bg=' + (s.backgroundColor || 'none'));
    }
  }
  results.stats.lowContrast = lowContrast;

  let emptyCards = 0;
  for (const el of document.querySelectorAll('section, .card, [class*=card], li')) {
    if (!visible(el)) continue;
    const hasContent = el.textContent.trim().length > 1 || el.querySelector('img, button, input');
    if (!hasContent) { emptyCards++; if (emptyCards < 5) issue('empty-container', 'low', el, 'Empty container'); }
  }
  results.stats.emptyCards = emptyCards;

  const bodyText = document.body.innerText.replace(/\s+/g, ' ').slice(0, 1200);
  results.stats.bodyText = bodyText;
  results.stats.visibleButtons = btns.length;

  results.stats.hasNav = !!document.querySelector('nav, header');
  results.stats.hasFooter = !!document.querySelector('footer');
  results.stats.placeholderOnlyInputs = Array.from(document.querySelectorAll('input')).filter(i => visible(i) && i.placeholder && !document.querySelector('label[for="' + i.id + '"]') && !i.labels.length && !i.getAttribute('aria-label') && !i.getAttribute('title')).length;

  return results;
}

module.exports = { runAudit };
