const http = require('http');

console.log('Testing server connection with Node.js http client...');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Response: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.on('timeout', () => {
  console.error('Request timed out');
  req.destroy();
});

req.end();