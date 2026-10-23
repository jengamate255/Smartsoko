'use strict';
const HOSTS = ['smartsoko.tz', 'www.smartsoko.tz', 'firebasestorage.googleapis.com', 'storage.googleapis.com', 'images.unsplash.com', 'images.pexels.com', 'res.cloudinary.com'];
function safeImageUrl(value, env = {}) {
    try {
        const url = new URL(value);
        let supabaseHost = '';
        try { supabaseHost = new URL(env.SUPABASE_URL).hostname; } catch (_) {}
        if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
        if (![...HOSTS, supabaseHost].filter(Boolean).includes(url.hostname)) return null;
        if (/placeholder|no[-_]?image|default[-_]?image|\/logo[.\/_-]/i.test(url.pathname)) return null;
        return url.href;
    } catch (_) { return null; }
}
const normalize = value => String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function createImageFinder({ env = process.env, fetchImpl = fetch } = {}) {
    const cache = new Map();
    async function reachable(url) {
        try {
            const response = await fetchImpl(url, { method: 'HEAD', redirect: 'error', signal: AbortSignal.timeout(6000) });
            return response.ok && /^image\/(jpeg|png|webp)/i.test(response.headers.get('content-type') || '');
        } catch (_) { return false; }
    }
    async function resolve(product, products = []) {
        if (!product?.name) return { imageUrl: '', imageStatus: 'missing', imageNote: 'No product is selected for image matching.' };
        const matching = [product, ...products.filter(p => p.id !== product.id && normalize(p.name) === normalize(product.name))];
        for (const source of matching) {
            const candidates = [source.image_url, source.imageUrl, source.image, ...(Array.isArray(source.images) ? source.images : [])];
            for (const candidate of candidates) {
                const url = safeImageUrl(typeof candidate === 'object' ? candidate?.url : candidate, env);
                if (url && await reachable(url)) return { imageUrl: url, imageStatus: 'catalogue', imageProductId: source.id,
                    imageCredit: 'SmartSoko catalogue', imageSourceUrl: '', imageNote: source.id === product.id ? 'Photo attached to the featured product; URL checked.' : 'Photo from an exact-name catalogue match. Review that it represents this item.', imageNeedsReview: source.id !== product.id };
            }
        }
        if (!env.PEXELS_API_KEY) return { imageUrl: '', imageStatus: 'missing', imageNote: 'No usable product photo was found. Add a catalogue photo or configure licensed photo search.' };
        try {
            const query = new URL('https://api.pexels.com/v1/search');
            query.searchParams.set('query', String(product.name).slice(0, 120)); query.searchParams.set('per_page', '6'); query.searchParams.set('orientation', 'square');
            const response = await fetchImpl(query.href, { headers: { Authorization: env.PEXELS_API_KEY }, signal: AbortSignal.timeout(8000) });
            if (!response.ok) return { imageUrl: '', imageStatus: 'missing', imageNote: 'Licensed image search is unavailable. Add a product photo.' };
            const result = await response.json();
            const words = normalize(product.name).split(' ').filter(w => w.length > 2);
            const photos = (result.photos || []).filter(p => p.width >= 640 && p.height >= 640 && words.some(w => normalize(p.alt).split(' ').includes(w)))
                .sort((a, b) => words.filter(w => normalize(b.alt).includes(w)).length - words.filter(w => normalize(a.alt).includes(w)).length);
            for (const photo of photos) {
                const url = safeImageUrl(photo.src?.large, env);
                if (!url || !await reachable(url)) continue;
                const source = new URL(photo.url);
                if (source.protocol !== 'https:' || source.hostname !== 'www.pexels.com') continue;
                return { imageUrl: url, imageStatus: 'stock', imageSourceUrl: source.href,
                    imageCredit: 'Photo by ' + String(photo.photographer || 'Pexels contributor').slice(0, 120) + ' on Pexels',
                    imageNote: 'Illustrative stock photo, not a verified photo of this seller’s item. Review before approving.', imageNeedsReview: true };
            }
        } catch (_) { /* Fail closed; a missing image is visible in the review queue. */ }
        return { imageUrl: '', imageStatus: 'missing', imageNote: 'No suitable image was found. Add a product photo.' };
    }
    async function find(product, products = []) {
        const key = product?.id + ':' + (product?.image_url || product?.imageUrl || '');
        const cached = cache.get(key);
        if (cached && cached.until > Date.now()) return cached.value;
        const value = await resolve(product, products);
        if (cache.size > 200) cache.clear();
        cache.set(key, { until: Date.now() + 5 * 60000, value });
        return value;
    }
    return { find, configured: () => ({ catalogue: true, licensedSearch: !!env.PEXELS_API_KEY }) };
}
module.exports = { createImageFinder, safeImageUrl };
