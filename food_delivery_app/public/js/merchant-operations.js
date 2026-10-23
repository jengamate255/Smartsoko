import { merchantRequest } from './merchant-request.js?v=2';
import { updateOrderAlerts } from './merchant-alert-state.js';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => value == null ? 'Not available' : 'TSh ' + Number(value).toLocaleString('en-TZ');
const time = value => value ? new Date(value).toLocaleString('en-GB', {timeZone:'Africa/Dar_es_Salaam'}) : 'Never';
const state = {ready:false, profile:null, synced:null, attempts:0, timer:null, busy:false, cache:new Map(), caps:new Set(), seen:new Set(), baseline:false, attention:[], sound:false, notifications:false};
let alertState={};
window.merchantFreshReads = new Set();
window.merchantReadSnapshot = path => {
  const cached=state.cache.get(path);
  return cached?.uid===window.auth?.currentUser?.uid ? cached.body : null;
};
const main = $('merchantMain');
window.merchantSelectedId = new URLSearchParams(location.search).get('merchantId') || '';
const banner = document.createElement('aside');
banner.className = 'mo-banner'; banner.id = 'merchantConnection'; banner.setAttribute('role','status');
banner.innerHTML = '<div><strong id="moConnectionLabel">Connecting to your store…</strong><small id="moConnectionDetail">Waiting for a verified store connection.</small></div><button id="moReconnect" type="button">Reconnect</button><a href="/login" id="moSignIn" hidden>Sign in again</a><label id="moStorePicker" hidden>Admin: select store <select id="moSelectedStore"><option value="">Choose a store</option></select></label>';
main.prepend(banner);
window.merchantConnectionReady = false;

function errorAt(id, error) { const el=$(id); if(el) {el.className='mo-error';el.textContent=error.message || String(error);} }
function statusAt(id, message) { const el=$(id); if(el) {el.className='';el.textContent=message;} }
function cap(name) { return state.caps.has(name); }
function gate() {
  document.querySelectorAll('[data-mo-cap]').forEach(el => { el.hidden = !cap(el.dataset.moCap); });
  document.querySelectorAll('[data-mo-write]').forEach(el => {
    const required=el.closest('#inventoryTab')?'/inventory':el.closest('#teamTab')?'/staff':null;
    el.disabled = !state.ready || !cap(el.dataset.moWrite) || el.closest('form')?.dataset.busy==='true' || required && !window.merchantFreshReads.has(required);
  });
  document.querySelectorAll('#storeInfoForm input,#storeInfoForm textarea,#storeInfoForm select,#storeInfoForm button,#businessHoursForm input,#businessHoursForm button').forEach(el=>{el.disabled=!state.ready || !cap('settings.write');});
  const payout=$('payoutBtn'); if(payout) payout.disabled=!state.ready || !cap('payments.write') || !window.merchantFreshReads.has('/balance');
}
function connected(profile) {
  if (state.profile && profile.id !== state.profile.id) {state.cache.clear();alertState={};state.attention=[];}
  state.profile=profile;state.caps=new Set(profile.capabilities || []);state.ready=true;state.synced=new Date().toISOString();state.attempts=0;
  clearTimeout(state.timer);window.merchantConnectionReady=true;
  banner.dataset.state='connected';$('moConnectionLabel').textContent='Store connected';
  $('moConnectionDetail').textContent='Last verified sync: '+time(state.synced)+'. Times shown in Tanzania time.';
  $('moSignIn').hidden=true;gate();
  if(profile.platformAdmin)chooseStore();
  document.querySelectorAll('.mo-section-state').forEach(el=>{el.textContent='';});
}
function disconnected(message, auth=false) {
  state.ready=false;window.merchantConnectionReady=false;banner.dataset.state='disconnected';
  window.merchantFreshReads.clear();
  $('moConnectionLabel').textContent=navigator.onLine===false?'You are offline':auth?'Your session needs attention':'Store connection interrupted';
  $('moConnectionDetail').textContent=message+(state.synced?' Last successful sync: '+time(state.synced)+'. Previously loaded data is stale.':' No store data has loaded yet.');
  $('moSignIn').hidden=!auth;
  document.querySelectorAll('[role=tabpanel]').forEach(el=>el.dataset.moStale=String(!!state.synced));
  document.querySelectorAll('.mo-section-state').forEach(el=>{el.textContent='Reconnect your store to load current data. Changes are disabled.';});
  gate();
  clearTimeout(state.timer);
  if(!auth && navigator.onLine!==false && state.attempts<5) state.timer=setTimeout(reconnect,Math.min(60000,2000*2**state.attempts));
}
async function reconnect() {
  if(state.busy || navigator.onLine===false || !window.auth?.currentUser) return;
  state.busy=true;state.attempts++;$('moReconnect').disabled=true;
  try {await window.retryMerchantDashboard?.(); if(state.ready) await loadVisible();}
  finally {state.busy=false;$('moReconnect').disabled=false;}
}
$('moReconnect').addEventListener('click',()=>{state.attempts=0;reconnect();});
window.addEventListener('offline',()=>disconnected('Your last successful data stays on this page. Nothing will be sent while offline.'));
window.addEventListener('online',()=>{state.attempts=0;reconnect();});
window.addEventListener('merchant:response',event=>{
  const {path,method,body}=event.detail;
  if(method==='GET'){window.merchantFreshReads.add(path.split('?')[0]);gate();
    const section=path.startsWith('/inventory')?'inventoryTab':path.startsWith('/staff')?'teamTab':path.startsWith('/orders')?'ordersTab':path.startsWith('/balance')?'financeTab':path==='/profile'?'profileTab':null;
    if(section && $(section))$(section).dataset.moStale='false';
  }
  if(path==='/profile' && method==='GET') connected(body.data);
  if(method==='GET' && state.profile) state.cache.set(path,{body,at:new Date().toISOString(),uid:window.auth?.currentUser?.uid});
});
window.addEventListener('merchant:failure',event=>{
  const {path,status,message,method}=event.detail;
  if(path==='/profile' || status===401 || !status || status>=500) disconnected(message,status===401);
  if(path==='/profile' && status===409) {clearTimeout(state.timer);chooseStore();}
});
let choosingStore=false;
async function chooseStore(){if(choosingStore)return;choosingStore=true;try{const response=await merchantRequest('/stores');$('moSelectedStore').innerHTML='<option value="">Choose a store</option>'+response.data.map(store=>`<option value="${esc(store.id)}">${esc(store.name)}</option>`).join('');$('moSelectedStore').value=window.merchantSelectedId;$('moStorePicker').hidden=false;if(!state.ready){$('moConnectionLabel').textContent='Select a store to manage';$('moConnectionDetail').textContent='You are signed in as a platform administrator. Choose a store to open its workspace.';}}catch(error){$('moConnectionDetail').textContent=error.message;}finally{choosingStore=false;}}
$('moSelectedStore').addEventListener('change',()=>{if($('moSelectedStore').value)location.href='/merchant?merchantId='+encodeURIComponent($('moSelectedStore').value);});
async function api(path, options={}) {
  const method=options.method || 'GET';
  try {const response=await merchantRequest(path,options);if(response.stale)disconnected('Could not refresh this section. Showing the last successful snapshot.');return response.data;}
  catch(error) {
    if(method==='GET' && ![401,403].includes(error.status) && state.cache.has(path)) {
      disconnected('Could not refresh '+path.split('?')[0]+'. Showing the last successful snapshot.');
      return state.cache.get(path).body.data;
    }
    throw error;
  }
}
async function submit(form, status, operation) {
  if(form.dataset.busy==='true') return;
  form.dataset.busy='true';const button=form.querySelector('[type=submit]');if(button)button.disabled=true;
  statusAt(status,'Saving…');
  try {await operation(new FormData(form));statusAt(status,'Saved. Refreshing current data…');await loadVisible();statusAt(status,'Saved.');}
  catch(error) {errorAt(status,error);disconnected('A save did not complete. Refresh before trying again; it will not be replayed automatically.');}
  finally {form.dataset.busy='false';gate();}
}
function table(headers,rows) {return '<div class="mo-scroll"><table><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+(rows.length ? rows.map(row=>'<tr>'+row.map(cell=>'<td>'+esc(cell)+'</td>').join('')+'</tr>').join('') : '<tr><td colspan="'+headers.length+'" class="mi-table-empty">No records yet.</td></tr>')+'</tbody></table></div>';}
function panel(id,label,capability,html) {
  const nav=document.querySelector('[role=tablist]');const button=document.createElement('button');
  button.type='button';button.className='tab-btn';button.id='mw-'+id+'-nav';button.setAttribute('role','tab');button.setAttribute('aria-controls',id+'Tab');button.setAttribute('aria-selected','false');button.tabIndex=-1;button.textContent=label;button.dataset.moCap=capability;button.setAttribute('onclick',`switchTab('${id}', this)`);nav.append(button);
  const section=document.createElement('section');section.id=id+'Tab';section.className='tab-content hidden mo-card';section.dataset.moPanel='true';section.setAttribute('role','tabpanel');section.setAttribute('aria-labelledby',button.id);section.innerHTML=html;main.insertBefore(section,main.querySelector('.mw-footer'));
  button.addEventListener('click',()=>loadVisible());
}
panel('inventory','Inventory','inventory.read',`
<header class="mi-page-heading"><div><span class="mi-eyebrow">YOUR STOCKROOM</span><h2>Inventory & reordering</h2><p>Keep the essentials in stock and your next delivery in hand.</p></div><a href="#miPurchaseDraft" class="mi-heading-link" data-mo-cap="purchases.write"><span class="material-symbols-outlined" aria-hidden="true">add</span>Purchase draft</a></header>
<p id="moInventoryStatus" role="status"></p><div id="moStockSummary" class="mo-grid"></div>
<section class="mi-section" aria-labelledby="miStockTitle"><div class="mi-section-heading"><span class="mi-section-icon material-symbols-outlined" aria-hidden="true">inventory_2</span><div><h3 id="miStockTitle">Stock overview</h3><p>Reorder suggestions bring stock to twice its alert threshold.</p></div></div><div id="moStockRows"></div></section>
<div class="mi-work-grid">
<form id="moReorderForm" class="mi-section mi-purchase" data-mo-cap="purchases.write"><div class="mi-section-heading" id="miPurchaseDraft"><span class="mi-section-icon material-symbols-outlined" aria-hidden="true">shopping_bag</span><div><span class="mi-eyebrow">PLAN YOUR NEXT RESTOCK</span><h3>New purchase draft</h3></div><span class="mi-draft-label">Draft</span></div><p>Review quantities and supplier prices before saving.</p><label>Supplier<select id="moSupplier" name="supplierId" required></select></label><label>Product<select id="moReorderProduct" name="productId" required></select></label><div class="mo-grid"><label>Quantity<input name="quantity" type="number" min="1" step="1" required placeholder="e.g. 20"></label><label>Unit cost (TZS)<input name="unitCost" type="number" min="0" step="1" required placeholder="e.g. 2,500"></label></div><div class="mi-form-end"><small>Saved as a draft for your review.</small><button type="submit" data-mo-write="purchases.write">Save purchase draft<span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></button></div></form>
<form id="moAdjustForm" class="mi-section" data-mo-cap="inventory.write"><div class="mi-section-heading"><span class="mi-section-icon material-symbols-outlined" aria-hidden="true">tune</span><div><h3>Adjust stock</h3><p>Record a count correction or a stock change.</p></div></div><label>Product<select name="productId" id="moAdjustProduct" required></select></label><div class="mo-grid"><label>Quantity change<input name="delta" type="number" step="1" required placeholder="e.g. 5 or -2"></label><label>Reason<input name="reason" maxlength="300" required placeholder="e.g. Stock count correction"></label></div><button type="submit" data-mo-write="inventory.write">Record adjustment</button></form>
<form id="moSupplierForm" class="mi-section" data-mo-cap="suppliers.write"><div class="mi-section-heading"><span class="mi-section-icon material-symbols-outlined" aria-hidden="true">local_shipping</span><div><h3>Add a supplier</h3><p>Keep your restocking contacts close.</p></div></div><div class="mo-grid"><label>Supplier name<input name="name" required maxlength="150" placeholder="Business or contact name"></label><label>Phone<input name="phone" type="tel" placeholder="Supplier phone number"></label></div><button type="submit" data-mo-write="suppliers.write">Add supplier</button></form>
</div>
<form id="moThresholdForm" class="mi-section mi-threshold" data-mo-cap="inventory.write"><div><h3>Low-stock alerts</h3><p>Set the default quantity that signals it’s time to restock.</p></div><label>Alert below<input name="threshold" type="number" min="0" max="10000" required></label><button type="submit" data-mo-write="inventory.write">Save threshold</button></form>
<div class="mi-history-grid"><section class="mi-section" data-mo-cap="purchases.read" aria-label="Purchase orders"><div id="moPurchaseRows"></div></section><section class="mi-section" aria-labelledby="miMovementTitle"><div class="mi-section-heading"><span class="mi-section-icon material-symbols-outlined" aria-hidden="true">history</span><div><h3 id="miMovementTitle">Recent stock movements</h3><p>Your latest inventory changes, in one place.</p></div></div><div id="moMovementRows"></div></section></div>`);
panel('team','Team & activity','staff.read',`<h2>Team & activity</h2><p>Invite a colleague by their verified sign-in email. Cashiers use Sales; fulfilment staff use Delivery. Access is limited to the selected role.</p><p id="moTeamStatus" role="status"></p><div id="moStaffRows"></div>
<form id="moStaffForm" data-mo-cap="staff.manage"><h3>Invite a team member</h3><div class="mo-grid"><label>Name<input name="name" required maxlength="150"></label><label>Email<input name="email" type="email" required></label><label>Role<select name="role"><option value="sales">Sales / cashier</option><option value="delivery">Delivery / fulfilment</option><option value="inventory">Inventory</option><option value="accountant">Accountant</option><option value="manager">Manager</option></select></label></div><button type="submit" data-mo-write="staff.manage">Create invitation</button></form><p id="moInviteResult" role="status"></p><h3 data-mo-cap="audit.read">Recent activity</h3><div id="moActivityRows" data-mo-cap="audit.read"></div>`);
const finance=document.createElement('section');finance.className='mo-card';finance.innerHTML='<h2>Profit & reconciliation</h2><p>Sales exclude cancelled and refunded orders. Profit is unavailable when order costs or commission are missing. Payouts remain separate unless explicitly linked to an order.</p><p>The balance above uses an estimated 10% platform commission. Recorded fees below may differ; payout requests are checked against prior requests by the server.</p><div class="mo-toolbar"><label>Period<select id="moFinanceDays"><option value="7">7 days</option><option value="30" selected>30 days</option><option value="90">90 days</option></select></label><button id="moFinanceExport" type="button">Export reconciliation CSV</button></div><p id="moFinanceStatus" role="status"></p><div id="moFinanceMetrics" class="mo-grid"></div><div id="moFinanceRows"></div><h3>Payout history</h3><div id="moPayoutRows"></div>';$('financeTab').append(finance);
for(const id of ['analyticsTab','financeTab','profileTab']) {const note=document.createElement('p');note.className='mo-section-state';note.setAttribute('role','status');note.textContent='Connecting to your store…';$(id).prepend(note);}
const alerts=document.createElement('section');alerts.className='mo-card';alerts.innerHTML='<h3>Order alerts</h3><div class="mo-toolbar"><label><input id="moSound" type="checkbox"> Play a sound</label><button id="moNotifications" type="button">Enable browser notifications</button><button id="moAcknowledge" type="button">Acknowledge alerts</button></div><p id="moAlertStatus" role="status">Alerts start after your store connects.</p>';$('ordersTab').prepend(alerts);

let inventory=[];
async function loadInventory() {
  if(!state.ready)return;statusAt('moInventoryStatus','Loading inventory…');
  try {
    inventory=await api('/inventory');
    $('moStockSummary').innerHTML=`<div class="mo-metric">Products<strong>${inventory.length}</strong></div><div class="mo-metric">Need reordering<strong>${inventory.filter(p=>p.stockQuantity<=p.minStock).length}</strong></div>`;
    $('moStockRows').innerHTML=table(['Product','In stock','Threshold','Suggested reorder'],inventory.map(p=>[p.name,p.stockQuantity,p.minStock,Math.max(0,2*p.minStock-p.stockQuantity)]));
    const options='<option value="">Choose a product</option>'+inventory.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');$('moAdjustProduct').innerHTML=options;$('moReorderProduct').innerHTML=options;
    if(cap('inventory.write')) {const config=await api('/config/low-stock-threshold');$('moThresholdForm').elements.threshold.value=config.threshold;}
    if(cap('suppliers.read')) {const suppliers=await api('/suppliers');$('moSupplier').innerHTML='<option value="">Choose supplier</option>'+suppliers.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');}
    if(cap('purchases.read')) {const purchases=await api('/purchases');$('moPurchaseRows').innerHTML='<h3>Purchase orders</h3>'+table(['Reference','Supplier','Status','Total'],purchases.map(p=>[p.id,p.supplierName,p.status,money(p.totalCost)]));}
    const moves=await api('/inventory/movements?limit=30');$('moMovementRows').innerHTML=table(['When','Product','Change','Reason'],moves.map(m=>[time(m.ts || m.createdAt),m.productId,m.delta,m.reason || m.type]));
    statusAt('moInventoryStatus',inventory.length?'Inventory loaded.':'No products yet. Add products from Menu.');gate();
  } catch(error){errorAt('moInventoryStatus',error);}
}
$('moThresholdForm').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'moInventoryStatus',f=>api('/config/low-stock-threshold',{method:'PUT',body:JSON.stringify({threshold:Number(f.get('threshold'))})}));});
$('moAdjustForm').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'moInventoryStatus',f=>{const delta=Number(f.get('delta'));if(!Number.isInteger(delta)||!delta)throw new Error('Enter a non-zero whole quantity.');return api('/inventory/adjust',{method:'POST',body:JSON.stringify({productId:f.get('productId'),delta,type:'adjustment',reason:f.get('reason')})});});});
$('moSupplierForm').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'moInventoryStatus',f=>api('/suppliers',{method:'POST',body:JSON.stringify(Object.fromEntries(f))}));});
$('moReorderProduct').addEventListener('change',()=>{const product=inventory.find(p=>p.id===$('moReorderProduct').value);if(product){$('moReorderForm').elements.quantity.value=Math.max(1,2*product.minStock-product.stockQuantity);$('moReorderForm').elements.unitCost.value=product.cost ?? '';}});
$('moReorderForm').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'moInventoryStatus',f=>{const product=inventory.find(p=>p.id===f.get('productId'));return api('/purchases',{method:'POST',body:JSON.stringify({supplierId:f.get('supplierId'),items:[{productId:product.id,name:product.name,quantity:Number(f.get('quantity')),unitCost:Number(f.get('unitCost'))}],notes:'Merchant reorder draft — review before sending to supplier'})});});});

let team=[];
const permissionsForm=document.createElement('form');permissionsForm.id='moPermissionsForm';permissionsForm.dataset.moCap='staff.manage';permissionsForm.innerHTML='<h3>Additional permissions</h3><p>Role permissions remain enabled. Select additional access for this colleague.</p><label>Team member<select id="moPermissionMember" name="member" required></select></label><div id="moPermissionChoices" class="mo-grid"></div><button type="submit" data-mo-write="staff.manage">Save additional permissions</button>';$('moStaffForm').after(permissionsForm);
function renderPermissions(){const member=team.find(m=>m.id===$('moPermissionMember').value);$('moPermissionChoices').innerHTML=member?[...state.caps].map(c=>`<label><span><input type="checkbox" name="capability" value="${esc(c)}" ${member.capabilities.includes(c)?'checked':''} ${(member.baseCapabilities||[]).includes(c)?'disabled':''}> ${esc(c)}${(member.baseCapabilities||[]).includes(c)?' (role)':''}</span></label>`).join(''):'';}
$('moPermissionMember').addEventListener('change',renderPermissions);
permissionsForm.addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'moTeamStatus',f=>api('/staff/'+encodeURIComponent(f.get('member'))+'/capabilities',{method:'PUT',body:JSON.stringify({capabilities:f.getAll('capability')})}));});
async function loadTeam() {
  if(!state.ready)return;statusAt('moTeamStatus','Loading team…');
  try {
    const members=await api('/staff');team=members;$('moStaffRows').innerHTML=table(['Name','Email','Role','Access','Status'],members.map(m=>[m.name,m.email,m.role,m.capabilities.join(', '),m.active?'Active':'Inactive']));
    $('moPermissionMember').innerHTML='<option value="">Choose a colleague</option>'+members.filter(m=>m.active).map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');renderPermissions();
    if(cap('staff.manage')) for(const member of members.filter(m=>m.active)) {const button=document.createElement('button');button.type='button';button.textContent='Deactivate '+member.name;button.dataset.moWrite='staff.manage';button.addEventListener('click',async()=>{if(!confirm('Deactivate access for '+member.name+'?'))return;button.disabled=true;try{await api('/staff/'+encodeURIComponent(member.id),{method:'DELETE'});await loadTeam();}catch(error){errorAt('moTeamStatus',error);}finally{gate();}});$('moStaffRows').append(button);}
    if(cap('audit.read')) {const rows=await api('/activity');$('moActivityRows').innerHTML=rows.length?table(['When','Who','Action','Resource'],rows.map(r=>[time(r.ts),r.actorEmail || r.actorId,r.action,r.resourceType+' '+r.resourceId])):'<p>No recorded activity yet.</p>';}
    statusAt('moTeamStatus','Team loaded.');gate();
  } catch(error){errorAt('moTeamStatus',error);}
}
$('moStaffForm').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'moTeamStatus',async f=>{const member=await api('/staff',{method:'POST',body:JSON.stringify(Object.fromEntries(f))});$('moInviteResult').textContent='Invitation created for '+member.email+'. Share this sign-in link: '+location.origin+'/login . They must sign in with that verified email. No email was sent automatically.';});});

let financeData=null;
let financeSequence=0;
async function loadFinance() {
  if(!state.ready)return;const sequence=++financeSequence;financeData=null;$('moFinanceExport').disabled=true;statusAt('moFinanceStatus','Loading reconciliation…');
  try {
    if(cap('reports.read')) {
      const data=await api('/insights?days='+$('moFinanceDays').value);if(sequence!==financeSequence)return;financeData=data;$('moFinanceExport').disabled=false;const s=financeData.summary;
      $('moFinanceMetrics').innerHTML=[['Sales',s.revenue],['Refunded order totals',s.refunds],['Recorded fees',s.fees],['Expenses',s.expenses],['Net profit',s.netProfit]].map(([label,value])=>`<div class="mo-metric">${esc(label)}<strong>${esc(money(value))}</strong></div>`).join('');
      $('moFinanceRows').innerHTML=table(['Order','Status','Payment','Total','Refund','Fees','Payout'],financeData.rows.map(r=>[r.id,r.status,r.paymentStatus,money(r.total),money(r.refund),money(r.deliveryFee+r.serviceFee+(r.commission||0))+(r.commission==null?' + unknown commission':''),r.payoutStatus]));
    } else {$('moFinanceRows').textContent='Your role does not include financial reporting.';$('moFinanceExport').disabled=true;}
    const payouts=await api('/payouts?limit=50');if(sequence!==financeSequence)return;$('moPayoutRows').innerHTML=payouts.length?table(['Requested','Reference','Amount','Status'],payouts.map(p=>[time(p.createdAt),p.id,money(p.amount),p.status])):'<p>No payout requests found.</p>';
    statusAt('moFinanceStatus','Reconciliation loaded.');
  } catch(error){if(sequence===financeSequence)errorAt('moFinanceStatus',error);}
}
$('moFinanceDays').addEventListener('change',loadFinance);
function csvCell(value){let s=String(value??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
$('moFinanceExport').addEventListener('click',()=>{
  if(!financeData)return;const fields=['id','createdAt','status','paymentStatus','total','refund','deliveryFee','serviceFee','commission','payoutStatus'];
  const csv=[fields,...financeData.rows.map(row=>fields.map(f=>row[f]))].map(row=>row.map(csvCell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='smartsoko-reconciliation-'+$('moFinanceDays').value+'-days.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
let analyticsSequence=0;
async function loadAnalytics() {
  const container=$('popularItems');
  if(!state.ready){container.textContent='Reconnect your store to load analytics.';return;}
  const sequence=++analyticsSequence;
  try {
    const data=await api('/insights?days='+($('analyticsPeriod')?.value || '7'));
    if(sequence!==analyticsSequence)return;
    container.innerHTML=data.topProducts.length?table(['Product','Units','Sales'],data.topProducts.map(p=>[p.name,p.units,money(p.revenue)])):'<p>No sales in this period.</p>';
    $('peakHours').innerHTML=table(['Hour (EAT)','Orders'],data.peakHours.slice(0,5).map(p=>[p.hour+':00',p.count]));
    $('categorySales').innerHTML=table(['Category','Sales'],data.categories.map(c=>[c.category,money(c.revenue)]));
    let chart=$('moRevenueSeries');if(!chart){chart=document.createElement('div');chart.id='moRevenueSeries';const canvas=$('revenueChart');if(canvas){canvas.hidden=true;canvas.after(chart);}}
    if(chart){chart.className='mo-card';const max=Math.max(1,...data.daily.map(d=>d.revenue));chart.innerHTML=data.daily.map(d=>`<div class="mo-chart-row"><span>${esc(d.day.slice(5))}</span><div><div class="mo-bar" style="width:${Math.max(0,d.revenue/max*100)}%"></div></div><span>${esc(money(d.revenue))}</span></div>`).join('');}
  }catch(error){if(sequence===analyticsSequence)container.textContent='Could not load analytics: '+error.message;}
}
window.merchantWorkspace={loadAnalytics,async exportAnalytics(){
  if(!state.ready)return;
  try{const data=await api('/insights?days='+($('analyticsPeriod')?.value||'7'));const csv=[['day','revenue','orders'],...data.daily.map(row=>[row.day,row.revenue,row.orders])].map(row=>row.map(csvCell).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='smartsoko-sales.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){$('popularItems').textContent=error.message;}
}};
async function loadVisible(){if(!$('inventoryTab').classList.contains('hidden'))await loadInventory();else if(!$('teamTab').classList.contains('hidden'))await loadTeam();else if(!$('financeTab').classList.contains('hidden'))await loadFinance();else if(!$('analyticsTab').classList.contains('hidden'))await loadAnalytics();}
document.querySelectorAll('.tab-btn').forEach(button=>button.addEventListener('click',()=>{if(button.getAttribute('onclick')?.includes("'finance'"))loadFinance();}));

let audio=null;
try {state.sound=localStorage.getItem('merchantOrderSound')==='true';}catch(_){}
$('moSound').checked=state.sound;
$('moSound').addEventListener('change',async()=>{state.sound=$('moSound').checked;try{localStorage.setItem('merchantOrderSound',String(state.sound));}catch(_){}if(state.sound){const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){audio ||= new Audio();await audio.resume();}}});
$('moNotifications').addEventListener('click',async()=>{if(!('Notification' in window)){statusAt('moAlertStatus','This browser does not support notifications.');return;}try{state.notifications=await Notification.requestPermission()==='granted';statusAt('moAlertStatus',state.notifications?'Browser notifications enabled for this session.':'Notifications are blocked. In-page alerts remain enabled.');}catch(error){errorAt('moAlertStatus',error);}});
function sound(){if(!state.sound||!audio)return;const oscillator=audio.createOscillator();const gain=audio.createGain();gain.gain.value=.08;oscillator.connect(gain);gain.connect(audio.destination);oscillator.frequency.value=660;oscillator.start();oscillator.stop(audio.currentTime+.2);}
$('moAcknowledge').addEventListener('click',()=>{alertState.acknowledged ||= new Set();for(const item of state.attention)alertState.acknowledged.add(item.key);state.attention=[];alertState.attention=[];statusAt('moAlertStatus','Current alerts acknowledged. New orders will still alert you.');});
async function pollOrders(){
  if(state.ready && cap('orders.read') && !document.hidden){
    try{
      const orders=await api('/orders?status=pending&limit=200');
      if(!state.ready)throw new Error('Alerts paused until the store reconnects.');
      alertState=updateOrderAlerts(alertState,orders);const next=alertState.attention;state.attention=next;
      if(alertState.emit.length)sound();
      if(state.notifications&&Notification.permission==='granted')for(const item of alertState.emit)new Notification(item.late?'Order waiting over 10 minutes':'New order',{body:'Open your SmartSoko order desk.',tag:item.key});
      statusAt('moAlertStatus',next.length?`${next.length} order alert(s), ${next.filter(n=>n.late).length} overdue. Open Orders and refresh to review.`:'No new order alerts. Checking every 30 seconds while this page is visible.');
    }catch(error){errorAt('moAlertStatus',error);}
  }
  setTimeout(pollOrders,30000);
}
setTimeout(pollOrders,4000);
for(const [id,capability] of [['mw-menu-nav','products.read'],['mw-analytics-nav','reports.read'],['mw-finance-nav','payments.read'],['mw-promotions-nav','products.write'],['mw-reviews-nav','products.read'],['mw-profile-nav','settings.read']]) {if($(id))$(id).dataset.moCap=capability;}
document.querySelectorAll('[onclick*="openAddMenuItem"],[onclick*="openPromoModal"]').forEach(button=>{button.dataset.moWrite=button.getAttribute('onclick').includes('Promo')?'products.write':'products.write';});
gate();
