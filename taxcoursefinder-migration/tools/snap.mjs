import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const out = process.argv[2]; const files = process.argv.slice(3);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const f of files) {
  const w = f.includes('Mobile') ? 390 : 1440;
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  p.on('pageerror', e => console.log('ERR', f, e.message));
  await p.goto('http://127.0.0.1:8765/' + encodeURIComponent(f), { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const html = await p.evaluate(() => document.documentElement.outerHTML);
  fs.writeFileSync(out + '/' + f.replace('.dc.html', '.html'), html);
  await p.screenshot({ path: out + '/' + f.replace('.dc.html', '.png'), fullPage: true });
  console.log('ok', f, html.length);
}
await b.close();
