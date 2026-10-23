// Bounded, read-only localhost load audit. Does not log response bodies or credentials.
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const base = 'http://localhost:3000';
const percentile = (values, p) => values[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)];
async function run(name, urls, concurrency, total, pauseMs = 0) {
  let cursor = 0;
  const results = [];
  const started = performance.now();
  await Promise.all(Array.from({length: concurrency}, async () => {
    while (cursor < total) {
      const index = cursor++;
      const start = performance.now();
      try {
        const response = await fetch(base + urls[index % urls.length], {signal: AbortSignal.timeout(15000)});
        const bytes = (await response.arrayBuffer()).byteLength;
        results.push({status: response.status, ms: performance.now() - start, bytes});
      } catch (error) {
        results.push({status: 'network-error', ms: performance.now() - start, error: error.name});
      }
      if (pauseMs) await new Promise(resolve => setTimeout(resolve, pauseMs));
    }
  }));
  const elapsed = performance.now() - started;
  const latencies = results.map(r => r.ms).sort((a,b) => a-b);
  const statuses = {};
  for (const r of results) statuses[r.status] = (statuses[r.status] || 0) + 1;
  const round = n => Math.round(n * 10) / 10;
  return {name, urls, concurrency, requests: total, statuses,
    throughputPerSecond: round(total / (elapsed / 1000)), durationMs: round(elapsed),
    latencyMs: {p50: round(percentile(latencies, .5)), p95: round(percentile(latencies, .95)), max: round(latencies.at(-1))}};
}
(async () => {
  const report = {timestamp: new Date().toISOString(), base,
    limitations: ['Local HTTP read-only test; no checkout, payout, or database writes.',
      'Merchant authenticated workflows blocked by missing Firebase auth backend.',
      'Closed-loop short bursts measure this machine, not production capacity.'], results: []};
  const assets = ['/merchant', '/js/merchant-app.js?v=5', '/css/merchant-workspace.css?v=3', '/dist/tailwind.css'];
  for (const concurrency of [1, 10, 30]) report.results.push(await run('merchant HTML/assets', assets, concurrency, 120));
  report.results.push(await run('merchant HTML/assets paced sustained load', assets, 30, 3000, 150));
  for (const concurrency of [1, 5, 10]) report.results.push(await run('public catalog', ['/api/products?limit=20', '/api/categories'], concurrency, 20));
  report.results.push(await run('merchant unauthenticated guard (expected 401)', ['/api/merchant/profile'], 5, 10));
  const output = path.join(__dirname, '..', 'logs', 'merchant-load-audit.json');
  fs.mkdirSync(path.dirname(output), {recursive:true});
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
