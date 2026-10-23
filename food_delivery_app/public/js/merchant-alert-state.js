// Pure alert bookkeeping: reconnects never re-notify an already reported key.
export function updateOrderAlerts(previous, orders, now = Date.now()) {
  const known = new Set(previous.known || []);
  const notified = new Set(previous.notified || []);
  const acknowledged = new Set(previous.acknowledged || []);
  const active = new Map((previous.attention || []).map(item => [item.key,item]));
  const pending = new Set(); const emit=[];
  for (const order of orders) {
    if (String(order.status || '').toLowerCase() !== 'pending') continue;
    pending.add(order.id);
    const late=now-new Date(order.createdAt).getTime()>=600000;
    const key=order.id+(late?':overdue':':new');
    if ((late || previous.baseline && !known.has(order.id)) && !acknowledged.has(key)) {
      const item={key,id:order.id,late};active.set(key,item);
      if(previous.baseline && !notified.has(key)){emit.push(item);notified.add(key);}
    }
    known.add(order.id);
  }
  const attention=[...active.values()].filter(item=>pending.has(item.id) && !acknowledged.has(item.key));
  return {known,notified,acknowledged,attention,baseline:true,emit};
}
