// Simple test to check if port 3000 is accessible
const net = require('net');

const client = new net.Socket();
client.setTimeout(5000);

client.connect({ port: 3000, host: 'localhost' }, () => {
  console.log('✅ TCP connection to port 3000 successful');
  client.write('GET /health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n');
});

client.on('data', (data) => {
  console.log('📡 Received data:');
  console.log(data.toString());
  client.destroy();
});

client.on('error', (err) => {
  console.log('❌ Connection error:', err.message);
});

client.on('timeout', () => {
  console.log('⏰ Connection timed out');
  client.destroy();
});

client.on('close', () => {
  console.log('🔌 Connection closed');
});