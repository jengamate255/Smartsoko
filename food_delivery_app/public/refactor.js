const fs = require('fs');
const path = require('path');

const htmlFile = path.join(__dirname, 'merchant.html');
const cssDir = path.join(__dirname, 'css');
const cssFile = path.join(cssDir, 'merchant.css');

let content = fs.readFileSync(htmlFile, 'utf8');

const startTag = '<style>';
const endTag = '</style>';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex > -1 && endIndex > -1) {
  const css = content.substring(startIndex + startTag.length, endIndex).trim();
  
  if (!fs.existsSync(cssDir)) {
    fs.mkdirSync(cssDir);
  }
  
  fs.writeFileSync(cssFile, css);
  
  const newHtml = content.substring(0, startIndex) + 
                  '<link rel="stylesheet" href="css/merchant.css">\n' + 
                  content.substring(endIndex + endTag.length);
                  
  fs.writeFileSync(htmlFile, newHtml);
  console.log('Successfully extracted CSS to css/merchant.css');
} else {
  console.log('Could not find style tags.');
}
