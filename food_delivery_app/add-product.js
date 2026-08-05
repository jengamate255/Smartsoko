const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');
const app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = app.firestore();

const merchantId = 'YG1BCXEFmG3tTmqCitiW';
const product = {
  merchantId: merchantId,
  name: 'Test Product Pineapple',
  description: 'Fresh pineapple from the farm',
  price: 5000,
  originalPrice: 6000,
  category: 'Fruits',
  available: true,
  featured: false,
  stockQuantity: 50,
  unit: 'piece',
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
};

db.collection('products').add(product)
  .then(ref => { console.log('Product added with ID:', ref.id); process.exit(0); })
  .catch(err => { console.error('Failed:', err); process.exit(1); });
