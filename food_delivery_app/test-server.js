const http = require('http');
const server = http.createServer((req, res) => {
  res.end('OK');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Listening on 3000');
  console.log('Server address:', server.address());
  
  // Test connection
  const http = require('http');
  http.get('http://localhost:3000/', (res) => {
    console.log('Test connection status:', res.statusCode);
    process.exit(0);
  }).on('error', (err) => {
    console.error('Test connection failed:', err);
    process.exit(1);
  });
});