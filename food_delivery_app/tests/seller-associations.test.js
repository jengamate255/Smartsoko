import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { planSellerRepairs, enrichOrders } = require('../server/src/services/seller-associations');
const sellers = [{ id: 's1', name: 'Store One' }, { id: 's2', name: 'Store Two' }];
describe('historical seller association recovery', () => {
    it('recovers unanimous item snapshot IDs in JSON strings without changing the source order', () => {
        const order = { id: 'o1', items: JSON.stringify([{ id: 'p', merchantId: 's1' }]) };
        const plan = planSellerRepairs([order], sellers)[0];
        expect(plan).toMatchObject({ status: 'repairable', sellerId: 's1', expectedItems: order.items });
        expect(enrichOrders([order], sellers)[0]).toMatchObject({ sellerId: 's1', sellerName: 'Store One' });
        expect(order.sellerId).toBeUndefined();
    });
    it('never overwrites existing IDs or guesses from missing/mixed/orphan seller snapshots', () => {
        const orders = [
            { id: 'a', restaurant_id: 'orphan', items: [{ sellerId: 's1' }] },
            { id: 'b', items: [{ sellerId: 's1' }, { sellerId: 's2' }] },
            { id: 'c', items: [{ sellerId: 's1' }, {}] },
            { id: 'd', items: '{bad json' },
        ];
        expect(planSellerRepairs(orders, sellers).map(x => x.status)).toEqual(['invalid_reference', 'unresolved', 'unresolved', 'unresolved']);
    });
    it('marks current catalog matches for human review and resolves legacy restaurant names', () => {
        expect(planSellerRepairs([{ id: 'o', items: [{ id: 'p' }] }], sellers, [{ id: 'p', seller_id: 's1' }])[0].status).toBe('review_required');
        expect(enrichOrders([{ id: 'o', restaurantId: 's2' }], sellers)[0].sellerName).toBe('Store Two');
    });
});
