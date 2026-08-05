const fs = require('fs');
let c = fs.readFileSync('home.html', 'utf8');

// Fix 1: Remove -mx-4 from cat-scroll (causes horizontal overflow)
c = c.replace('class="cat-scroll hide-scrollbar -mx-4 px-4"', 'class="cat-scroll hide-scrollbar px-4"');

// Fix 2: Add hidden state to cart sidebar so it doesn't contribute to scrollWidth
c = c.replace('id="cartSidebar" class="fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl z-50 transform translate-x-full transition-transform duration-300"', 'id="cartSidebar" class="fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl z-50 transform translate-x-full transition-transform duration-300 hidden"');

fs.writeFileSync('home.html', c);
console.log('Fixed home.html');