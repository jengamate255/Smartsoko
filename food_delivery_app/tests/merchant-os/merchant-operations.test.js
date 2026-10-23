import {describe,it,expect} from 'vitest';
import insightsModule from '../../server/src/services/merchant-insights.js';
import capabilities from '../../server/src/middleware/capabilities.js';
import {updateOrderAlerts} from '../../public/js/merchant-alert-state.js';

describe('merchant operations',()=>{
  it('reconciliation excludes refunds/cancellations and uses Tanzania daily buckets',()=>{
    const today=new Date().toISOString().slice(0,10);
    const rows=[
      {id:'paid',status:'COMPLETED',total:10000,cost:3000,commission:1000,deliveryFee:500,serviceFee:200,createdAt:today+'T00:00:00Z',items:[{name:'Rice',quantity:2,price:5000}]},
      {id:'refunded',status:'REFUNDED',total:5000,createdAt:today+'T00:00:00Z'},
      {id:'cancelled',status:'cancelled',total:20000,createdAt:today+'T00:00:00Z'},
    ];
    const report=insightsModule.insights(rows,[{amount:1000,date:today}],7);
    expect(report.summary.revenue).toBe(10000);
    expect(report.summary.refunds).toBe(5000);
    expect(report.summary.fees).toBe(1700);
    expect(report.summary.netProfit).toBe(4300);
    expect(report.topProducts[0].units).toBe(2);
    expect(report.peakHours).toEqual([{hour:3,count:1}]);
  });
  it('unknown costs and commissions cannot produce an invented profit',()=>{
    const report=insightsModule.insights([{id:'a',total:5000,status:'completed',createdAt:new Date().toISOString()}],[],7);
    expect(report.summary.netProfit).toBeNull();
    expect(report.rows[0].payoutStatus).toBe('Not linked to a payout');
  });
  it('new and overdue alerts notify once, persist until acknowledgement, and clear on fulfilment',()=>{
    const now=Date.now();const order={id:'a',status:'pending',createdAt:new Date(now).toISOString()};
    let state=updateOrderAlerts({},[],now);
    state=updateOrderAlerts(state,[order],now);
    expect(state.emit).toHaveLength(1);
    state=updateOrderAlerts(state,[order],now+100);
    expect(state.emit).toHaveLength(0);expect(state.attention).toHaveLength(1);
    state.acknowledged.add('a:new');
    state=updateOrderAlerts(state,[order],now+200);
    expect(state.attention).toHaveLength(0);
    state=updateOrderAlerts(state,[order],now+600001);
    expect(state.emit[0].key).toBe('a:overdue');
    state=updateOrderAlerts(state,[{...order,status:'accepted'}],now+600002);
    expect(state.attention).toHaveLength(0);
  });
  it('initial existing orders do not flood the merchant with new-order notifications',()=>{
    const now=Date.now();const state=updateOrderAlerts({},[{id:'old',status:'pending',createdAt:new Date(now-700000).toISOString()}],now);
    expect(state.emit).toHaveLength(0);expect(state.attention[0].late).toBe(true);
  });
  it('staff tenant and capabilities come from active membership, not client claims',async()=>{
    const db={where:async(table)=>table==='staff'?[{id:'staff-1',merchantId:'store-A',staffRole:'inventory',active:true,capabilities:[]}]:[]};
    const req={user:{uid:'verified-user',email:'a@example.com',emailVerified:true,role:'customer'}};
    expect(await capabilities.resolveMerchant(db,null,req)).toBe('store-A');
    expect(req.user.role).toBe('inventory');
    expect(capabilities.hasCapability(req.user,'inventory.write')).toBe(true);
    expect(capabilities.hasCapability(req.user,'payments.write')).toBe(false);
    expect(await capabilities.resolveMerchant(db,null,{user:{uid:'x',email:'a@example.com',emailVerified:false}})).toBeNull();
  });
});
