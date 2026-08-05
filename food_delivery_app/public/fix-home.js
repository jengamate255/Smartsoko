const fs = require('fs');
let c = fs.readFileSync('home.html', 'utf8');
// Add overflow-x: hidden to body
c = c.replace('body { font-family:', 'body { overflow-x: hidden; font-family:');
fs.writeFileSync('home.html', c);
console.log('Fixed home.html overflow');