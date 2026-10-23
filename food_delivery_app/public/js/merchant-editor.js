// Product-editor presentation. The existing merchant page owns validation and saves.
(() => {
  const $ = id => document.getElementById(id);
  const form = $('menuEditorForm');
  if (!form) return;
  const draft = document.createElement('span');
  draft.className = 'me-draft-status'; draft.setAttribute('role','status');
  form.querySelector('.me-footer').prepend(draft);
  form.addEventListener('input', () => { draft.textContent = 'Unsaved edits'; });
  function preview() {
    $('mePreviewName').textContent = $('menuItemName').value.trim() || 'Your product name';
    const price = Number($('menuItemPrice').value);
    $('mePreviewPrice').textContent = price > 0 ? 'TSh ' + price.toLocaleString() : 'Add a price';
  }
  function stockTracking() {
    const tracked = $('menuItemTrackStock').checked;
    const stock = $('menuItemStock');
    stock.disabled = !tracked;
    stock.required = tracked;
    if (!tracked) stock.value = '';
    else if (stock.value === '' || Number(stock.value) < 0) stock.value = '0';
    $('meStockHint').textContent = tracked ? 'This quantity is saved to your inventory.' : 'Existing stock stays unchanged. New products start at zero.';
  }
  window.syncMerchantEditor = () => {
    draft.textContent = '';
    const stock = $('menuItemStock');
    $('menuItemTrackStock').checked = !$('menuItemId').value || (stock.value !== '' && Number(stock.value) >= 0);
    stockTracking(); preview();
    $('menuEditorOptions').open = false;
    form.querySelector('.me-body').scrollTop = 0;
  };
  $('menuItemTrackStock').addEventListener('change', stockTracking);
  $('menuItemName').addEventListener('input', preview);
  $('menuItemPrice').addEventListener('input', preview);
  $('meRemovePhoto').addEventListener('click', () => {
    $('menuItemImage').value = '';
    $('menuItemImageFile').value = '';
    $('imagePreviewContainer').classList.add('hidden');
    $('imagePreview').removeAttribute('src');
  });
})();
