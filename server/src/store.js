const { v4: uuidv4 } = require('uuid');

const now = Date.now();
const hr = 3600000;

const drivers = new Map();
const tokens = new Map();
const orders = new Map();
const earnings = new Map();
const wsClients = new Map();

function seed() {
  const driverId = 'driver_001';
  drivers.set(driverId, {
    id: driverId,
    full_name: 'Dave Mwangi',
    phone: '+254712345678',
    email: 'dave@example.com',
    vehicle_type: 'Motorcycle',
    vehicle_plate: 'KCA 123X',
    photo_url: null,
    rating: 4.8,
    total_deliveries: 342,
    is_online: false,
    is_verified: true,
  });

  const sampleOrders = [
    {
      id: 'order_001',
      pickup_name: 'Java House',
      pickup_address: 'Moi Avenue, Nairobi',
      pickup_lat: -1.286389,
      pickup_lng: 36.817223,
      dropoff_name: 'Emily Kamau',
      dropoff_address: 'Kilimani, Nairobi',
      dropoff_lat: -1.290278,
      dropoff_lng: 36.785556,
      customer_name: 'Emily Kamau',
      customer_phone: '+254722111222',
      items: [
        { name: 'Cappuccino', quantity: 2, price: 4.5, notes: 'Extra hot' },
        { name: 'Chicken Wrap', quantity: 1, price: 8.0, notes: null },
      ],
      total_amount: 17.0,
      delivery_fee: 3.5,
      status: 'PENDING',
      estimated_distance: 3.2,
      estimated_duration: '12 min',
      created_at: now - 2 * hr,
      updated_at: now - 2 * hr,
      delivery_instructions: 'Call upon arrival',
    },
    {
      id: 'order_002',
      pickup_name: 'Artcaffe',
      pickup_address: 'Westlands, Nairobi',
      pickup_lat: -1.268333,
      pickup_lng: 36.813889,
      dropoff_name: 'James Ochieng',
      dropoff_address: 'Parklands, Nairobi',
      dropoff_lat: -1.267222,
      dropoff_lng: 36.810278,
      customer_name: 'James Ochieng',
      customer_phone: '+254733444555',
      items: [
        { name: 'Grilled Chicken', quantity: 1, price: 12.0, notes: 'Extra sauce' },
        { name: 'Fries', quantity: 2, price: 4.0, notes: null },
        { name: 'Soda', quantity: 1, price: 1.5, notes: 'Coke Zero' },
      ],
      total_amount: 21.5,
      delivery_fee: 4.0,
      status: 'PENDING',
      estimated_distance: 5.1,
      estimated_duration: '18 min',
      created_at: now - 1.5 * hr,
      updated_at: now - 1.5 * hr,
      delivery_instructions: null,
    },
    {
      id: 'order_003',
      pickup_name: 'KFC',
      pickup_address: 'CBD, Nairobi',
      pickup_lat: -1.283333,
      pickup_lng: 36.816667,
      dropoff_name: 'Sarah Wanjiku',
      dropoff_address: 'South B, Nairobi',
      dropoff_lat: -1.310556,
      dropoff_lng: 36.828333,
      customer_name: 'Sarah Wanjiku',
      customer_phone: '+254711333777',
      items: [
        { name: 'Bucket Meal', quantity: 1, price: 15.0, notes: 'Extra spicy' },
        { name: 'Coleslaw', quantity: 1, price: 2.0, notes: null },
      ],
      total_amount: 17.0,
      delivery_fee: 5.0,
      status: 'PENDING',
      estimated_distance: 6.8,
      estimated_duration: '25 min',
      created_at: now - hr,
      updated_at: now - hr,
      delivery_instructions: 'Leave at gate',
    },
    {
      id: 'order_004',
      pickup_name: 'Pizza Inn',
      pickup_address: 'Lavington, Nairobi',
      pickup_lat: -1.278333,
      pickup_lng: 36.780556,
      dropoff_name: 'Peter Ngugi',
      dropoff_address: 'Kileleshwa, Nairobi',
      dropoff_lat: -1.273056,
      dropoff_lng: 36.790556,
      customer_name: 'Peter Ngugi',
      customer_phone: '+254755888999',
      items: [
        { name: 'Pepperoni Pizza', quantity: 1, price: 14.0, notes: 'Large' },
        { name: 'Garlic Bread', quantity: 2, price: 3.0, notes: null },
      ],
      total_amount: 20.0,
      delivery_fee: 3.0,
      status: 'PENDING',
      estimated_distance: 2.1,
      estimated_duration: '8 min',
      created_at: now - 0.5 * hr,
      updated_at: now - 0.5 * hr,
      delivery_instructions: null,
    },
  ];

  const historyOrders = [
    {
      id: 'hist_001',
      pickup_name: 'Cafe Deli',
      pickup_address: 'Ngong Road, Nairobi',
      pickup_lat: -1.293889,
      pickup_lng: 36.780556,
      dropoff_name: 'Anne Muthoni',
      dropoff_address: 'Madaraka, Nairobi',
      dropoff_lat: -1.305278,
      dropoff_lng: 36.795556,
      customer_name: 'Anne Muthoni',
      customer_phone: '+254700111222',
      items: [{ name: 'Club Sandwich', quantity: 1, price: 7.0, notes: null }],
      total_amount: 7.0,
      delivery_fee: 2.5,
      status: 'DELIVERED',
      estimated_distance: 2.5,
      estimated_duration: '10 min',
      created_at: now - 24 * hr,
      updated_at: now - 24 * hr + 30 * 60000,
      delivery_instructions: null,
    },
    {
      id: 'hist_002',
      pickup_name: 'Sushi Bar',
      pickup_address: 'Eastleigh, Nairobi',
      pickup_lat: -1.276667,
      pickup_lng: 36.847222,
      dropoff_name: 'Brian Kiprop',
      dropoff_address: 'Buruburu, Nairobi',
      dropoff_lat: -1.266944,
      dropoff_lng: 36.863889,
      customer_name: 'Brian Kiprop',
      customer_phone: '+254722333444',
      items: [{ name: 'California Roll', quantity: 2, price: 10.0, notes: null }],
      total_amount: 20.0,
      delivery_fee: 4.0,
      status: 'DELIVERED',
      estimated_distance: 4.8,
      estimated_duration: '20 min',
      created_at: now - 48 * hr,
      updated_at: now - 48 * hr + 45 * 60000,
      delivery_instructions: null,
    },
  ];

  for (const o of sampleOrders) orders.set(o.id, o);
  for (const o of historyOrders) orders.set(o.id, o);

  earnings.set(driverId, {
    today_amount: 18.5,
    today_deliveries: 5,
    weekly_amount: 345.0,
    weekly_deliveries: 28,
    daily_breakdown: [
      { date: 'Mon', amount: 52.0, deliveries: 4 },
      { date: 'Tue', amount: 68.5, deliveries: 6 },
      { date: 'Wed', amount: 45.0, deliveries: 3 },
      { date: 'Thu', amount: 72.0, deliveries: 5 },
      { date: 'Fri', amount: 89.0, deliveries: 7 },
      { date: 'Sat', amount: 18.5, deliveries: 3 },
      { date: 'Sun', amount: 0, deliveries: 0 },
    ],
  });
}

seed();

module.exports = { drivers, tokens, orders, earnings, wsClients };
