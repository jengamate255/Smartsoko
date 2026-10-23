import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const read = name => fs.readFileSync(new URL('../public/' + name, import.meta.url), 'utf8');

function discovery(fetch) {
  const html = read('discovery.html');
  const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('let allProducts'));
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { value: id === 'sortSelect' ? 'default' : '', textContent: '', innerHTML: '', classList: { add() {}, remove() {}, toggle() {} }, replaceChildren() {}, append() {}, addEventListener() {} });
    return elements.get(id);
  };
  const context = vm.createContext({
    window: {}, document: { getElementById: element, querySelectorAll: () => [], addEventListener() {}, createElement: () => element(Math.random()), body: { append() {} } },
    localStorage: { getItem: () => null }, fetch, AbortSignal, URL, URLSearchParams,
    location: { href: 'http://test/discovery', search: '' }, history: { replaceState() {} }, console: { error() {} },
    ShoppingUI: { cards() {} }, setTimeout,
  });
  vm.runInContext(script, context);
  return { context, element };
}

describe('customer discovery regressions', () => {
  it('matches API category capitalization and legacy aliases', () => {
    const { context } = discovery(() => new Promise(() => {}));
    expect(vm.runInContext("categoryKey('Fruits') === categoryKey('fruits')", context)).toBe(true);
    expect(vm.runInContext("categoryKey('Grocery') === categoryKey('groceries')", context)).toBe(true);
  });
  it('keeps a catalog failure visible when a customer changes filters', async () => {
    const { context, element } = discovery(async () => ({ headers: { get: () => 'text/html' } }));
    await vm.runInContext('loadProducts()', context);
    expect(element('resultsCount').textContent).toBe('Products unavailable');
    expect(element('productsGrid').innerHTML).toContain('Retry');
    vm.runInContext("filterByCategory('fruits')", context);
    expect(element('productsGrid').innerHTML).toContain('Retry');
    expect(element('resultsCount').textContent).toBe('Products unavailable');
  });
});

describe('signup validation', () => {
  it('rejects a password without the advertised special character before creating an account', async () => {
    const script = [...read('signup.html').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('let signupInProgress'));
    const elements = Object.fromEntries(Object.entries({ fullName: 'QA Customer', email: 'qa@example.com', phone: '0700000000', password: 'Password123', confirmPassword: 'Password123', agreeTerms: '' }).map(([id, value]) => [id, { value, checked: true, classList: { add() {}, remove() {} } }]));
    elements.errorMsg = { classList: { add() {}, remove() {} } };
    elements.errorText = { textContent: '' };
    elements.signupCard = { classList: { add() {}, remove() {} } };
    const context = vm.createContext({ window: {}, setTimeout: () => {}, document: { getElementById: id => elements[id], querySelector: () => ({ value: 'customer' }), addEventListener() {} } });
    vm.runInContext(script, context);
    await vm.runInContext('createAccount()', context);
    expect(elements.errorText.textContent).toContain('special character');
  });
});
