/* Catalogue presentation uses supplied data; cart and payment rules stay with their services. */
(() => {
  const money = n => 'TSh ' + Number(n || 0).toLocaleString();
  function node(tag, cls, text) { const el = document.createElement(tag); el.className = cls; if (text !== undefined) el.textContent = text; return el; }
  function feedback(product, message) {
    let bar = document.getElementById('shoppingFeedback');
    if (!bar) {
      bar = node('section','shopping-feedback'); bar.id = 'shoppingFeedback';
      const status = node('span',''); status.setAttribute('role','status');
      const link = node('a','','View basket →'); link.href = '/cart';
      const close = node('button','','×'); close.type = 'button'; close.setAttribute('aria-label','Dismiss basket update'); close.onclick = () => { bar.hidden = true; };
      bar.append(status,link,close); document.body.append(bar);
    }
    let count = 0;
    try { count = JSON.parse(localStorage.getItem('smartsoko_cart') || '[]').filter(p => p.id === product.id).reduce((n,p) => n + (p.quantity || 1),0); } catch (_) {}
    bar.firstChild.textContent = message || product.name + ' added' + (count ? ' · ' + count + ' in your basket' : ''); bar.hidden = false;
    if (message) return;
    document.querySelectorAll('[data-add-product]').forEach(button => {
      if (button.dataset.addProduct !== String(product.id)) return;
      button.textContent = '✓'; button.setAttribute('aria-label', product.name + ' added. Add another');
    });
  }
  function cards(container, items, dealsOnly = false) {
    if (!container) return;
    container.replaceChildren();
    items.forEach(product => {
      const card = node('article','shop-card');
      const link = node('a','shop-card-link'); link.href = '/product?id=' + encodeURIComponent(product.id);
      const media = node('div','shop-card-media');
      const image = node('img',''); image.alt = product.name; image.loading = 'lazy'; image.decoding = 'async';
      const fallback = () => { image.remove(); media.classList.add('shop-no-photo'); if (!media.querySelector('.shop-photo-label')) media.append(node('span','shop-photo-label','Photo coming soon')); };
      if (product.imageUrl && !/placeholder|default-product/.test(product.imageUrl)) { image.src = product.imageUrl; image.onerror = fallback; media.append(image); } else fallback();
      const original = Number(product.originalPrice), price = Number(product.price);
      const discount = original > price && price > 0;
      if (dealsOnly && discount) media.append(node('span','shop-discount',Math.round((original-price)/original*100) + '% off'));
      const details = node('div','shop-card-details');
      details.append(node('span','shop-category',product.category || 'Marketplace'),node('h3','',product.name),node('p','shop-seller',product.seller || 'SmartSoko'));
      if (product.rating > 0 && product.reviewCount > 0) details.append(node('span','shop-rating','★ '+Number(product.rating).toFixed(1)+' · '+product.reviewCount+' reviews'));
      link.append(media,details);
      const bottom = node('div','shop-card-bottom'); const prices = node('div','shop-prices');
      prices.append(node('strong','',money(price)));
      if (discount) prices.append(node('s','',money(original)));
      if (product.unit) prices.append(node('small','',/^per\s/i.test(product.unit) ? product.unit : 'per '+product.unit));
      const button = node('button','shop-add','+'); button.type='button'; button.dataset.addProduct=product.id; button.setAttribute('aria-label','Add '+product.name+' to basket');
      button.onclick=()=>window.addToCart(product.id);
      bottom.append(prices,button); card.append(link,bottom);
      if (Number.isFinite(product.stockQuantity) && product.stockQuantity >= 0) card.append(node('small','shop-stock',product.stockQuantity === 0 ? 'Out of stock' : product.stockQuantity + ' available'));
      if (product.stockQuantity === 0) { button.disabled=true; button.textContent='—'; }
      container.append(card);
    });
  }
  window.ShoppingUI = {cards, feedback};
  const mainPhoto = document.getElementById('mainProductImg');
  if (mainPhoto) {
    const media = mainPhoto.closest('.ss-product-media');
    const label = node('span','shopping-photo-missing','A product photo hasn’t been added yet');
    media.append(label);
    function photoState() {
      const missing = /default-product|placeholder/.test(mainPhoto.getAttribute('src') || '');
      media.classList.toggle('shopping-photo-unavailable',missing); label.hidden = !missing;
      const thumbs = document.getElementById('thumbButton1')?.parentElement;
      if (thumbs) thumbs.hidden = missing;
    }
    new MutationObserver(photoState).observe(mainPhoto,{attributes:true,attributeFilter:['src']}); photoState();
  }
})();
