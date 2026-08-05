const fs = require('fs');
const files = ['home.html', 'main.html', 'customer.html', 'discovery.html', 'supabase.html', 'cart.html', 'product.html', 'index_marketplace.html'];
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/media="print" onload="this\.media='all'"/g, '');
  fs.writeFileSync(f, c);
});
console.log('Done');