window.StoreShare = {
  whatsapp(storeName, storeUrl) {
    const text = encodeURIComponent(`Check out ${storeName} on SmartSoko! ${storeUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  },

  facebook(storeUrl) {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`, '_blank');
  },

  twitter(storeName, storeUrl) {
    const text = encodeURIComponent(`Check out ${storeName} on SmartSoko`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(storeUrl)}`, '_blank');
  },

  copyLink(storeUrl) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(storeUrl).then(() => this.showToast('Link copied!')).catch(() => this.fallbackCopy(storeUrl));
    } else {
      this.fallbackCopy(storeUrl);
    }
  },

  fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    this.showToast('Link copied!');
  },

  showQR(storeUrl, storeName) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4';
    overlay.innerHTML = `<div class="bg-surface rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl">
      <h3 class="font-headline font-bold text-lg mb-4">Scan to visit ${storeName}</h3>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(storeUrl)}" alt="QR Code" class="mx-auto rounded-2xl mb-4" width="250" height="250">
      <p class="text-sm text-on-surface-variant mb-4 break-all">${storeUrl}</p>
      <button onclick="this.closest('.fixed').remove()" class="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-semibold">Close</button>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  },

  showShareModal(storeName, storeUrl) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4';
    overlay.innerHTML = `<div class="bg-surface rounded-3xl p-6 max-w-sm w-full shadow-2xl">
      <h3 class="font-headline font-bold text-lg mb-1">Share ${storeName}</h3>
      <p class="text-sm text-on-surface-variant mb-6">Choose how to share your store</p>
      <div class="grid grid-cols-4 gap-4 mb-6">
        <button onclick="StoreShare.whatsapp('${storeName.replace(/'/g, "\\'")}','${storeUrl}');this.closest('.fixed').remove()" class="flex flex-col items-center gap-1 p-3 rounded-2xl hover:bg-surface-container transition"><div class="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center"><span class="material-symbols-outlined text-white">chat</span></div><span class="text-xs font-medium text-on-surface">WhatsApp</span></button>
        <button onclick="StoreShare.facebook('${storeUrl}');this.closest('.fixed').remove()" class="flex flex-col items-center gap-1 p-3 rounded-2xl hover:bg-surface-container transition"><div class="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center"><span class="material-symbols-outlined text-white">facebook</span></div><span class="text-xs font-medium text-on-surface">Facebook</span></button>
        <button onclick="StoreShare.twitter('${storeName.replace(/'/g, "\\'")}','${storeUrl}');this.closest('.fixed').remove()" class="flex flex-col items-center gap-1 p-3 rounded-2xl hover:bg-surface-container transition"><div class="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center"><span class="material-symbols-outlined text-white">X</span></div><span class="text-xs font-medium text-on-surface">Twitter</span></button>
        <button onclick="StoreShare.showQR('${storeUrl}','${storeName.replace(/'/g, "\\'")}');this.closest('.fixed').remove()" class="flex flex-col items-center gap-1 p-3 rounded-2xl hover:bg-surface-container transition"><div class="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center"><span class="material-symbols-outlined text-white">qr_code</span></div><span class="text-xs font-medium text-on-surface">QR Code</span></button>
      </div>
      <div class="flex items-center gap-2 p-3 bg-surface-container rounded-xl mb-4"><input type="text" value="${storeUrl}" readonly class="flex-1 bg-transparent text-sm outline-none" id="shareLinkInput"><button onclick="StoreShare.copyLink('${storeUrl}')" class="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold">Copy</button></div>
      <button onclick="this.closest('.fixed').remove()" class="w-full py-2.5 rounded-xl border border-outline-variant font-medium text-sm hover:bg-surface-container transition">Close</button>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  },

  showToast(msg) {
    const el = document.createElement('div');
    el.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-xl z-50 text-sm';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }
};