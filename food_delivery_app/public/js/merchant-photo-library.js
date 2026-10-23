(() => {
  function close() {
    window.exitMerchantDialog?.('imageGalleryModal');
    document.getElementById('imageGalleryModal')?.remove();
    const editor = document.getElementById('addMenuModal');
    if (editor && !editor.classList.contains('hidden')) window.enterMerchantDialog?.('addMenuModal');
  }
  function open(products) {
    if (document.getElementById('imageGalleryModal')) return;
    const modal = document.createElement('div');
    modal.id = 'imageGalleryModal'; modal.className = 'me-library-backdrop'; modal.tabIndex = -1;
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'meLibraryTitle');
    modal.innerHTML = '<div class="me-library"><header><div><span class="me-kicker">YOUR PRODUCT PHOTOS</span><h3 id="meLibraryTitle">Choose from your library</h3></div><button type="button" class="me-close" aria-label="Close photo library"><span class="material-symbols-outlined" aria-hidden="true">close</span></button></header><div id="galleryGrid" class="me-library-grid"></div></div>';
    const grid = modal.querySelector('#galleryGrid'), seen = new Set();
    for (const product of products) {
      const path = product.imageUrl || product.image;
      if (!path || seen.has(path)) continue;
      seen.add(path);
      const button = document.createElement('button'); button.type = 'button';
      const img = document.createElement('img'); img.src = path; img.alt = product.name || 'Product photo'; img.loading = 'lazy';
      img.onerror = () => { img.onerror = null; img.src = 'images/placeholder.svg'; };
      const label = document.createElement('span'); label.textContent = product.name || 'Product photo';
      button.append(img, label); button.addEventListener('click', () => window.selectGalleryImage(path)); grid.append(button);
    }
    if (!seen.size) {
      const empty = document.createElement('p'); empty.className = 'me-library-empty';
      empty.textContent = 'No saved product photos yet. Upload a photo in the product editor to get started.'; grid.append(empty);
    }
    modal.querySelector('.me-close').addEventListener('click', close);
    modal.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } });
    document.body.append(modal); window.enterMerchantDialog?.('imageGalleryModal');
  }
  window.MerchantPhotoLibrary = { open, close };
})();
