import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
const html = fs.readFileSync(new URL('../public/admin.html', import.meta.url), 'utf8');
const adminDataSrc = fs.readFileSync(new URL('../public/js/admin-data.js', import.meta.url), 'utf8');
function fn(name) {
  const start = html.search(new RegExp('    (?:async )?function ' + name + '\\('));
  const end = html.indexOf('\n    }', start) + 6;
  if (start < 0) throw new Error('Missing function ' + name);
  return html.slice(start, end);
}
const el = () => ({ classList: { add() {}, remove() {} }, textContent: '', innerHTML: '' });
describe('admin dashboard regressions', () => {
  it('keeps the active filters and reader page across an order reload', async () => {
    const fields = { orderSearchInput: {value:'Alice'}, orderStatusFilter:{value:'pending'}, orderDateFilter:{value:'all'} };
    const ordersKit = { setBusy: vi.fn(), setError: vi.fn(), resetPage: vi.fn() };
    const ctx = vm.createContext({document:{getElementById:id=>fields[id]||el()}, LOG:{info(){},error(){}}, API_ROUTES:{ADMIN_API:{ORDERS:'/orders'}}, AdminUI:{icon:()=>'',esc:v=>v}, AdminData:{get:vi.fn()}, safeApiCall:async()=>({orders:[{id:'1',customerName:'Alice',status:'pending'},{id:'2',customerName:'Bob',status:'pending'}]}),updateStats:vi.fn(),renderOrders:vi.fn(), ordersKit, allOrders:[],filteredOrders:[]});
    vm.runInContext(fn('filterOrders') + '\n' + fn('loadOrders'),ctx);
    await ctx.loadOrders();
    expect(ctx.filteredOrders.map(o=>o.id)).toEqual(['1']);
    expect(ordersKit.resetPage).not.toHaveBeenCalled();
    ctx.filterOrders();
    expect(ordersKit.resetPage).toHaveBeenCalled();
  });
  it('defers section API loads until session restoration finishes', () => {
    const loadFinance=vi.fn(); const loadPayouts=vi.fn();
    const ctx=vm.createContext({adminSessionReady:false,pendingAdminTab:null,LOG:{info(){}},ADMIN_SECTION_META:{},closeAdminNav(){},document:{querySelectorAll:()=>[],getElementById:()=>({classList:{add(){},remove(){}}})},loadFinance,loadPayouts});
    vm.runInContext(fn('switchTab'),ctx);ctx.switchTab('finance');
    expect(ctx.pendingAdminTab).toBe('finance');expect(loadFinance).not.toHaveBeenCalled();expect(loadPayouts).not.toHaveBeenCalled();
  });
  it('refreshes every non-overview section through its tab loader', () => {
    for(const name of ['users','audit','settings','reviews','marketing','finance','notifications','cms','support','analytics','server','risk','rbac','webhooks','apikeys']) {
      const switchTab=vi.fn();const ctx=vm.createContext({adminSessionReady:true,document:{querySelector:()=>({id:'tab-'+name})},LOG:{info(){}},switchTab});
      vm.runInContext(fn('refreshAll'),ctx);ctx.refreshAll();expect(switchTab).toHaveBeenCalledWith(name);
    }
  });
  it('titles and mounts a panel for every sidebar section', () => {
    const meta = vm.runInNewContext('(' + html.match(/var ADMIN_SECTION_META = (\{[\s\S]*?\n    \})/)[1] + ')');
    const nav = [...html.matchAll(/onclick="switchTab\('([^']+)'\)" id="tab-\1"/g)].map(m => m[1]);
    expect(nav.length).toBeGreaterThan(15);
    for (const tab of nav) {
      expect(meta[tab], 'no heading for ' + tab).toBeDefined();
      expect(html, 'no panel for ' + tab).toContain('id="content-' + tab + '"');
    }
  });
  it('requests the monthly revenue rows through the shared store', async () => {
    const get=vi.fn(async()=>({data:{daily:[{date:'2026-10-20',revenue:1234}],totalRevenue:1234}}));
    const bound=[];
    const ctx=vm.createContext({revenueKit:{update:vi.fn()},revenueSummary:null,buildRevenueDailyTable:vi.fn(),AdminData:{get},bindDataset:(key,cfg,kit,apply,force)=>{bound.push({key,cfg,kit,apply,force});return Promise.resolve();}});
    vm.runInContext(fn('loadRevenueReport'),ctx);
    await ctx.loadRevenueReport(true);
    expect(bound[0].key).toBe('revenueReport');
    expect(bound[0].force).toBe(true);
    await bound[0].cfg.fetch();
    expect(get).toHaveBeenCalledWith('/admin/analytics/revenue?period=monthly');
    expect(bound[0].cfg.transform({data:{daily:[{date:'2026-10-20'}],totalRevenue:9}})).toEqual([{date:'2026-10-20'}]);
    expect(ctx.revenueSummary).toEqual({daily:[{date:'2026-10-20'}],totalRevenue:9});
  });
  it('exports cached revenue, loading it first, with quoted CSV fields', async () => {
    const revenueDaily=[];
    const loadRevenueReport=vi.fn(async()=>{revenueDaily.push({date:'2026-10-20',revenue:1234,orders:2,commission:123.4},{date:'2026-10-19',revenue:'One, "Two"',orders:1,commission:0});});
    const downloadAdminFile=vi.fn();const ctx=vm.createContext({revenueDaily,loadRevenueReport,downloadAdminFile,showErrorToast:vi.fn()});
    vm.runInContext(fn('csvEscape')+'\n'+fn('exportAnalytics'),ctx);await ctx.exportAnalytics();
    expect(loadRevenueReport).toHaveBeenCalledTimes(1);
    expect(downloadAdminFile.mock.calls[0][0]).toBe('revenue-report.csv');
    expect(downloadAdminFile.mock.calls[0][1]).toContain('2026-10-20,1234,2,123.4');
    expect(downloadAdminFile.mock.calls[0][1]).toContain('2026-10-19,"One, ""Two""",1,0');
    expect(ctx.csvEscape('One, "Two"')).toBe('"One, ""Two"""');
  });
  it('excludes invalid or missing dates from date filters',()=>{
    const fields={orderSearchInput:{value:''},orderStatusFilter:{value:''},orderDateFilter:{value:'today'}};
    const ctx=vm.createContext({document:{getElementById:id=>fields[id]},allOrders:[{id:'a',createdAt:'bad'},{id:'b'}],ordersKit:{resetPage(){}},renderOrders(){},safeToDate:()=>null});
    vm.runInContext(fn('filterOrders'),ctx);ctx.filterOrders();expect(ctx.filteredOrders.length).toBe(0);
  });
});
describe('admin data store', () => {
  function loadStore(apiHelpers) {
    const ctx = vm.createContext({ LOG: { info() {}, error() {} }, apiHelpers });
    ctx.window = ctx;
    vm.runInContext(adminDataSrc, ctx);
    return ctx;
  }
  it('hands apiHelpers.delete an options object, never a positional null body', async () => {
    const calls = [];
    const ctx = loadStore({
      delete: async (path, options) => {
        // Mirrors api-config.js: buildHeaders() reads options.headers and threw
        // on null, which made every delete action in the app fail.
        JSON.stringify(options.headers);
        calls.push([path, options]);
        return { success: true };
      },
    });
    await ctx.AdminData.delete('/admin/marketing/coupons/QRD-1');
    expect(calls[0][0]).toBe('/admin/marketing/coupons/QRD-1');
    expect(calls[0][1]).toEqual({});
  });
  it('replays a rejected request once after dropping the cached token', async () => {
    const get = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('Authentication required'), { status: 401 }))
      .mockResolvedValueOnce({ data: [] });
    const ctx = loadStore({ get });
    await expect(ctx.AdminData.get('/admin/audit')).resolves.toEqual({ data: [] });
    expect(get).toHaveBeenCalledTimes(2);
  });
  it('serves a cached dataset and refetches only when forced', async () => {
    const fetchOne = vi.fn(async () => ({ rows: [{ id: '1' }] }));
    const ctx = loadStore({ get: fetchOne });
    ctx.AdminData.define('users', { path: 'rows', ttl: 60000, fetch: fetchOne });
    const first = await ctx.AdminData.load('users');
    expect(first.rows).toEqual([{ id: '1' }]);
    expect(fetchOne).toHaveBeenCalledTimes(1);
    await ctx.AdminData.load('users');
    expect(fetchOne).toHaveBeenCalledTimes(1);
    await ctx.AdminData.reload('users');
    expect(fetchOne).toHaveBeenCalledTimes(2);
  });
});
