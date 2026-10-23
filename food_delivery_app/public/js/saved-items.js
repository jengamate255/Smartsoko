(() => {
  const container = document.getElementById('savedItems');
  const node = (tag, text) => { const el = document.createElement(tag); el.textContent = text; return el; };
  function savedIds() {
    try {
      const saved = JSON.parse(localStorage.getItem('smartsoko_wishlist') || '[]');
      return Array.isArray(saved) ? [...new Set(saved.filter(id => typeof id === 'string'))] : [];
    } catch (_) { return []; }
  }
  async function render() {
    const ids = savedIds();
    container.replaceChildren();
    if (!ids.length) { container.append(node('p', 'No saved items yet. Save a product to find it here.')); return; }
    const svc = window.crossPlatformService;
    if (!svc || !svc.isReady()) {
      await new Promise(resolve => {
        document.addEventListener('data-service-ready', resolve, { once: true });
        setTimeout(resolve, 5000);
      });
    }
    for (const id of ids) {
      const card = node('article', ''), row = node('div', ''); row.className = 'row';
      const link = node('a', 'View saved product'); link.href = '/product?id=' + encodeURIComponent(id);
      const remove = node('button', 'Remove'); remove.type = 'button';
      remove.onclick = () => {
        try { localStorage.setItem('smartsoko_wishlist', JSON.stringify(savedIds().filter(saved => saved !== id))); render(); }
        catch (_) { container.prepend(node('p', 'Could not update saved items. Please try again.')); }
      };
      row.append(link, remove); card.append(row); container.append(card);
      try {
        const data = await svc.get('products', id);
        if (!data) throw new Error('Product unavailable');
        link.textContent = data.name || 'View saved product';
        card.append(node('p', 'TSh ' + Number(data.price || 0).toLocaleString()));
      } catch (_) { card.append(node('p', 'Product details are currently unavailable. You can retry by opening the product.')); }
    }
  }
  render();
})();
