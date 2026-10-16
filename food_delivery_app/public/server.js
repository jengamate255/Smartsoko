const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.static(__dirname));

const htmlPages = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));
htmlPages.forEach(f => {
  const route = '/' + f.replace(/\.html$/, '');
  if (route !== '/index') {
    app.get(route, (req, res) => res.sendFile(path.join(__dirname, f)));
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

module.exports = app;
