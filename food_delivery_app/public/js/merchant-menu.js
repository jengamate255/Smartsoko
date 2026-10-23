// Presentation and local catalogue filtering. Writes use the page's existing handlers.
(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const stateOf = item => {
    const raw = item.stockQuantity ?? item.stock;
    const stock = raw === undefined || raw === null || Number(raw) < 0 ? null : Number(raw);
    return { stock, paused: item.isAvailable === false, available: item.isAvailable !== false && stock !== 0 };
  };
  function filter(products) {
    const query = ($('menuSearch')?.value || '').trim().toLocaleLowerCase();
    const category = $('menuFilter')?.value || 'all';
    const status = $('menuAvailability')?.value || 'all';
    const sort = $('menuSort')?.value || 'default';
    const items = products.filter(item => {
      const state = stateOf(item);
      return (!query || [item.name, item.category, item.description].some(value => String(value || '').toLocaleLowerCase().includes(query)))
        && (category === 'all' || (item.category || 'General') === category)
        && (status === 'all' || status === 'available' && state.available || status === 'paused' && state.paused || status === 'out-of-stock' && state.stock === 0);
    });
    if (sort === 'name') items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    if (sort === 'price-low') items.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sort === 'price-high') items.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    return items;
  }
  function render(items, products, seller, actions) {
    const container = $('menuItemsList');
    const available = products.filter(p => stateOf(p).available).length;
    const counts = new Map();
    products.forEach(p => { const category = p.category || 'General'; counts.set(category, (counts.get(category) || 0) + 1); });
    const top = [...counts].sort((a, b) => b[1] - a[1])[0];
    $('totalMenuItems').textContent = products.length;
    $('availableMenuItems').textContent = available;
    $('outOfStockItems').textContent = products.length - available;
    $('topCategory').textContent = top ? top[0] : '—';
    $('menuItemCount').textContent = products.length;
    $('availableItems').textContent = available + ' available';
    const categorySelect = $('menuFilter'), selectedCategory = categorySelect.value;
    categorySelect.replaceChildren(new Option('All categories', 'all'), ...[...counts.keys()].sort().map(name => new Option(name, name)));
    categorySelect.value = counts.has(selectedCategory) ? selectedCategory : 'all';
    $('menuResults').textContent = items.length + ' of ' + products.length + ' products';
    if (!items.length) {
      container.innerHTML = '<div class="mm-empty"><span class="material-symbols-outlined" aria-hidden="true">inventory_2</span><h3>' + (products.length ? 'No products match your filters' : 'Your menu starts here') + '</h3><p>' + (products.length ? 'Try a different search or clear your filters.' : 'Add your first product with a photo, price and category.') + '</p></div>';
      actions.selection();
      return;
    }
    container.innerHTML = items.map(item => {
      const state = stateOf(item);
      const status = state.paused ? 'Paused' : state.stock === 0 ? 'Out of stock' : 'Available';
      const stock = state.stock === null ? 'Stock not tracked' : state.stock + ' in stock';
      const name = esc(item.name || 'Unnamed product'), tags = Array.isArray(item.tags) ? item.tags : [];
      return `<article class="mm-product" data-product-id="${esc(item.id)}">
        <div class="mm-product-image"><img src="${esc(item.imageUrl || item.image || 'images/placeholder.svg')}" alt="${name}" loading="lazy" onerror="this.onerror=null;this.src='images/placeholder.svg';" />
          <label class="mm-select"><input type="checkbox" class="product-select-cb" value="${esc(item.id)}" aria-label="Select ${name}" /></label>
        </div>
        <div class="mm-product-content">
          <div class="mm-product-top"><span class="mm-category">${esc(item.category || 'General')}</span><span class="mm-status" data-state="${state.paused ? 'paused' : state.stock === 0 ? 'empty' : 'available'}">${status}</span></div>
          <h3>${name}</h3><p class="mm-description">${esc(item.description || 'Add a description to help customers choose.')}</p>
          ${tags.length ? '<div class="mm-tags">' + tags.map(tag => '<span>' + esc(tag) + '</span>').join('') + '</div>' : ''}
          ${item.availableFrom || item.availableTo ? '<p class="mm-schedule">' + esc(item.availableFrom || 'Opening') + ' – ' + esc(item.availableTo || 'Closing') + '</p>' : ''}
          ${item.variations ? '<p class="mm-schedule">' + esc(String(item.variations).split(',').length) + ' variations</p>' : ''}
          <div class="mm-product-price"><strong>TSh ${Number(item.price || 0).toLocaleString()}</strong><span>${esc(stock)}</span><button type="button" class="mm-price-edit" data-menu-price data-mo-write="products.write" aria-label="Change price of ${name}">Change price</button></div>
          <div class="mm-product-actions">
            <button type="button" data-menu-action="edit" data-mo-write="products.write"><span class="material-symbols-outlined" aria-hidden="true">edit</span>Edit</button>
            <button type="button" data-menu-action="availability" data-mo-write="products.write"><span class="material-symbols-outlined" aria-hidden="true">${state.paused ? 'play_arrow' : 'pause'}</span>${state.paused ? 'Enable' : 'Pause'}</button>
            <button type="button" data-menu-action="delete" data-mo-write="products.write" class="mm-remove" aria-label="Remove ${name}"><span class="material-symbols-outlined" aria-hidden="true">delete</span></button>
          </div>
        </div>
      </article>`;
    }).join('');
    container.querySelectorAll('.product-select-cb').forEach(input => input.addEventListener('change', actions.selection));
    container.querySelectorAll('[data-menu-action]').forEach(button => {
      button.disabled = window.merchantConnectionReady !== true || Boolean(seller?.capabilities && !seller.capabilities.includes('products.write'));
      button.addEventListener('click', () => actions[button.dataset.menuAction](button.closest('[data-product-id]').dataset.productId));
    });
    container.querySelectorAll('[data-menu-price]').forEach(button => {
      button.disabled = window.merchantConnectionReady !== true || Boolean(seller?.capabilities && !seller.capabilities.includes('products.write'));
      button.addEventListener('click', () => {
        if (button.disabled) return;
        const card = button.closest('[data-product-id]');
        const item = products.find(product => String(product.id) === card.dataset.productId);
        if (!item || !actions.quickPrice) return;
        const form = document.createElement('form'); form.className = 'mm-quick-price';
        const label = document.createElement('label'); label.textContent = 'Price (TSh)';
        const input = document.createElement('input'); input.type = 'number'; input.min = '0'; input.step = 'any'; input.required = true; input.value = item.price; label.append(input);
        const save = document.createElement('button'); save.type = 'submit'; save.textContent = 'Save';
        const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel';
        const status = document.createElement('span'); status.setAttribute('role','status');
        cancel.onclick = () => { form.remove(); button.hidden = false; button.focus(); };
        form.append(label,save,cancel,status); button.hidden = true; button.after(form); input.focus(); input.select();
        form.onsubmit = async event => {
          event.preventDefault(); if (save.disabled || !form.reportValidity()) return;
          save.disabled = cancel.disabled = true; status.textContent = 'Saving…';
          try { await actions.quickPrice(item.id,Number(input.value)); }
          catch (error) { status.textContent = 'Could not save price: ' + error.message; save.disabled = cancel.disabled = false; }
        };
      });
    });
    actions.selection();
  }
  window.MerchantMenu = { filter, render, stateOf };
})();
