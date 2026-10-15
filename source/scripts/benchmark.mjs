import { createDemoItems } from '../src/data/demo-items.ts';
import { createSearchIndex, matchesSearch } from '../src/domain/search.ts';
import { aggregateReport, DEFAULT_REPORTS } from '../src/domain/reporting.ts';

// Hàm trên Node/máy hiện tại; không phải số đo render hoặc mạng của browser.
for (const count of [1000, 5000]) {
  const items = createDemoItems(count);
  const start = performance.now();
  const index = createSearchIndex(items);
  const indexMs = performance.now() - start;
  const search = [], reporting = [];
  for (let attempt = 0; attempt < 50; attempt++) {
    let begin = performance.now();
    items.filter(item => matchesSearch(item, 'chuyen vien mau a', index));
    search.push(performance.now() - begin);
    begin = performance.now();
    DEFAULT_REPORTS.forEach(config => aggregateReport(items, config, 'vpLeader'));
    reporting.push(performance.now() - begin);
  }
  const p95 = samples => [...samples].sort((a, b) => a - b)[Math.floor(samples.length * 0.95)];
  console.log(JSON.stringify({ rows: count, indexMs: +indexMs.toFixed(2), searchP95Ms: +p95(search).toFixed(2), reportsP95Ms: +p95(reporting).toFixed(2), runtime: process.version }));
}
