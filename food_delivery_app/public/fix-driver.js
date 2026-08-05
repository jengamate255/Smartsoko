const fs = require('fs');
let c = fs.readFileSync('E:\\Project\\notsmartsoko\\Smartsoko\\food_delivery_app\\web\\driver.html', 'utf8');
// Revert the script type back to regular (remove type="module")
c = c.replace('<script type="module">\n    let state = {', '<script>\n    let state = {');
fs.writeFileSync('E:\\Project\\notsmartsoko\\Smartsoko\\food_delivery_app\\web\\driver.html', c);
console.log('Reverted driver.html');