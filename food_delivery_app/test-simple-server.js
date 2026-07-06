const express = require('express');
const app = express();
const PORT = 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send('SmartSoko Server Running');
});

app.listen(PORT, () => {
  console.log(`✅ Simple test server running on port ${PORT}`);
  console.log(`🌐 Test URL: http://localhost:${PORT}/health`);
});