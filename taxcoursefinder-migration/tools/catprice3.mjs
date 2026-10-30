import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const u of ['https://cataxcourses.com/product/ctec-60-hours-course/', 'https://cataxcourses.com/product/ctec-20-hours-renewal-course/']) {
  const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(e => null); await p.waitForTimeout(4000);
  if (!r) { console.log(u, 'failed'); continue; }
  const t = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  console.log('##', u, r.status());
  for (const m of [...t.matchAll(/.{0,60}\$\d[\d,.]*.{0,40}/g)].slice(0, 8)) console.log('  ', m[0]);
}
await b.close();
