import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createImageFinder, safeImageUrl } = require('../server/src/services/marketing-images');
const imageResponse = () => ({ ok: true, headers: { get: () => 'image/jpeg' } });
describe('marketing image selection', () => {
    it('rejects private hosts, credentials, redirects targets and placeholders', () => {
        for (const url of ['https://localhost/image.jpg','https://127.0.0.1/image.jpg','http://smartsoko.tz/image.jpg','https://user:password@smartsoko.tz/image.jpg','https://smartsoko.tz/placeholder.svg','https://evil.example/image.jpg']) expect(safeImageUrl(url)).toBeNull();
        expect(safeImageUrl('https://smartsoko.tz/rice.jpg')).toBeTruthy();
    });
    it('selects the actual product photo and caches repeated channel requests', async () => {
        let calls = 0;
        const finder = createImageFinder({ env: {}, fetchImpl: async () => { calls++; return imageResponse(); } });
        const product = { id: 'rice', name: 'Rice', image_url: 'https://smartsoko.tz/rice.jpg' };
        const result = await finder.find(product); await finder.find(product);
        expect(result.imageStatus).toBe('catalogue'); expect(result.imageNeedsReview).toBe(false); expect(calls).toBe(1);
    });
    it('uses exact-name matches and never another unrelated product photo', async () => {
        const finder = createImageFinder({ env: {}, fetchImpl: async () => imageResponse() });
        const product = { id: 'rice', name: 'White rice' };
        const candidates = [{ id: 'bread', name: 'Bread', image_url: 'https://smartsoko.tz/bread.jpg' },{ id: 'rice2', name: 'White Rice', image_url: 'https://smartsoko.tz/rice.jpg' }];
        const result = await finder.find(product, candidates);
        expect(result.imageProductId).toBe('rice2'); expect(result.imageNeedsReview).toBe(true);
    });
    it('broken images fail visibly instead of being marked usable', async () => {
        const finder = createImageFinder({ env: {}, fetchImpl: async () => ({ ok: false }) });
        const result = await finder.find({ id: 'rice', name: 'Rice', image_url: 'https://smartsoko.tz/rice.jpg' });
        expect(result.imageStatus).toBe('missing'); expect(result.imageUrl).toBe('');
    });
    it('licensed stock images retain attribution and always require review', async () => {
        const finder = createImageFinder({ env: { PEXELS_API_KEY: 'test-secret' }, fetchImpl: async (url, options) => {
            if (url.startsWith('https://api.pexels.com/')) {
                expect(options.headers.Authorization).toBe('test-secret');
                return { ok: true, json: async () => ({ photos: [{ width: 1200, height: 900, alt: 'Bowl of rice', src: { large: 'https://images.pexels.com/rice.jpeg' }, url: 'https://www.pexels.com/photo/rice-1/', photographer: 'Photographer' }] }) };
            }
            return imageResponse();
        } });
        const result = await finder.find({ id: 'rice', name: 'Rice' });
        expect(result.imageStatus).toBe('stock'); expect(result.imageNeedsReview).toBe(true); expect(result.imageCredit).toContain('Photographer');
        expect(JSON.stringify(result)).not.toContain('test-secret');
    });
});
