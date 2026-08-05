async function run() {
  const baseUrl = 'http://localhost:3000/api';
  const now = Date.now();
  const customerId = `e2e-customer-${now}`;
  const sellerId = `e2e-seller-${now}`;

  const orderPayload = {
    customerId,
    sellerId,
    items: [{ id: 'item-1', name: 'Map Test Item', quantity: 1, price: 9000 }],
    total: 12000,
    deliveryAddress: 'Kariakoo, Dar es Salaam',
    customerAddress: 'Kariakoo, Dar es Salaam',
    customerPhone: '+255700000111',
    deliveryLat: -6.8002,
    deliveryLng: 39.2828,
    customerLat: -6.8002,
    customerLng: 39.2828,
    sellerLat: -6.7924,
    sellerLng: 39.2083,
    pickupLat: -6.7924,
    pickupLng: 39.2083,
    status: 'pending'
  };

  const createRes = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload),
  });
  if (!createRes.ok) throw new Error(`Create order failed: ${createRes.status}`);
  const created = await createRes.json();

  const requiredLocationKeys = ['deliveryLat', 'deliveryLng', 'sellerLat', 'sellerLng', 'pickupLat', 'pickupLng'];
  const missing = requiredLocationKeys.filter((k) => created[k] === undefined || created[k] === null);
  if (missing.length) throw new Error(`Order creation response missing location keys: ${missing.join(', ')}`);

  console.log(JSON.stringify({
    ok: true,
    orderId: created.id,
    customerId,
    requiredLocationKeys
  }, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
