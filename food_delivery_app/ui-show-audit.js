const r = require('./ui-shots/deep-audit.json');
const pages = process.argv[2] ? process.argv[2].split(',') : Object.keys(r);
for (const p of pages) {
  const d = r[p];
  if (!d) { console.log('=== ' + p + ' === MISSING'); continue; }
  console.log('=== ' + p + ' ===');
  if (d.error) { console.log(' ERROR: ' + d.error); continue; }
  console.log('  stats: heads=' + JSON.stringify(d.headings) + ' unnamed=' + d.unnamedControls + ' targets=' + d.smallTargets + ' contrast=' + d.lowContrast + ' inline=' + d.inlineStyles + ' empty=' + d.emptyCards + ' plchldr=' + d.placeholderOnlyInputs + ' nav=' + d.hasNav + ' foot=' + d.hasFooter);
  console.log('  console: ' + JSON.stringify(d.consoleErrors || []));
  for (const i of (d.issues || [])) {
    console.log(' [' + i.severity + '] ' + i.type + ' <' + i.tag + '> ' + (i.cls || '').slice(0, 30) + ' @' + i.x + ',' + i.y + ' ' + i.w + 'x' + i.h + ' "' + (i.text || '').slice(0, 40) + '" - ' + i.msg.slice(0, 100));
  }
  if (!d.issues.length) console.log(' (no issues recorded)');
}
