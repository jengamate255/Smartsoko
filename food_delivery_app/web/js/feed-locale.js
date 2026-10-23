// Keep the legacy feed readable when its optional translation bundle is absent.
(() => {
  if (window.I18N) return;
  const words = {
    en: {'feed.swipeHint':'Swipe up for more','feed.addToCart':'Add to cart','cta.share':'Share','nav.support':'Support','cart.addedToCart':'Added to cart'},
    sw: {'feed.swipeHint':'Sogeza juu kuona zaidi','feed.addToCart':'Weka kwenye kikapu','cta.share':'Shiriki','nav.support':'Msaada','cart.addedToCart':'Imeongezwa kwenye kikapu'}
  };
  let language = 'en';
  try { language = localStorage.getItem('smartsoko_feed_language') || 'en'; } catch (_) {}
  const t = key => (words[language] || words.en)[key] || words.en[key] || key;
  window.I18N = {
    t,
    getLang: () => language,
    setLang: value => { language = value === 'sw' ? 'sw' : 'en'; try { localStorage.setItem('smartsoko_feed_language',language); } catch (_) {} },
    apply: root => root.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); })
  };
})();
