const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../../public/js/merchant-menu.js'), 'utf8');

function menu(values = {}) {
    const controls = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, { value }]));
    const window = {};
    vm.runInNewContext(source, { window, document: { getElementById: id => controls[id] } });
    return window.MerchantMenu;
}
const products = [
    { id: 'fish', name: 'Tuna Fish', category: 'Specials', description: 'Fresh catch', price: 15000, isAvailable: true },
    { id: 'juice', name: 'Mango juice', category: 'Drinks', price: 3000, isAvailable: false, stockQuantity: 8 },
    { id: 'rice', name: 'Rice bowl', category: 'Specials', price: 5000, stockQuantity: 0 },
    { id: 'greens', name: 'Garden greens', category: 'Vegetables', price: 2000, stockQuantity: 10 },
];

test('search combines with real categories and availability without changing source products', () => {
    const view = menu({ menuSearch: ' FRESH ', menuFilter: 'Specials', menuAvailability: 'available' });
    assert.deepEqual(Array.from(view.filter(products), p => p.id), ['fish']);
    assert.equal(products.length, 4);
});

test('paused listings and depleted stock remain separately discoverable', () => {
    assert.deepEqual(Array.from(menu({ menuAvailability: 'paused' }).filter(products), p => p.id), ['juice']);
    assert.deepEqual(Array.from(menu({ menuAvailability: 'out-of-stock' }).filter(products), p => p.id), ['rice']);
    assert.deepEqual(Array.from(menu({ menuAvailability: 'available' }).filter(products), p => p.id), ['fish', 'greens']);
});

test('numeric price sorting never reorders the loaded catalogue', () => {
    const snapshot = products.map(p => p.id);
    assert.deepEqual(Array.from(menu({ menuSort: 'price-low' }).filter(products), p => p.id), ['greens', 'juice', 'rice', 'fish']);
    assert.deepEqual(Array.from(menu({ menuSort: 'price-high' }).filter(products), p => p.id), ['fish', 'rice', 'juice', 'greens']);
    assert.deepEqual(products.map(p => p.id), snapshot);
});

test('legacy stock and missing availability retain their supported meaning', () => {
    const view = menu();
    assert.equal(view.stateOf({ stock: 0 }).available, false);
    assert.equal(view.stateOf({ stockQuantity: 2, stock: 0 }).stock, 2);
    assert.equal(view.stateOf({ stock: -1 }).stock, null);
    assert.equal(view.stateOf({}).available, true);
    assert.equal(view.stateOf({ isAvailable: false }).paused, true);
});
