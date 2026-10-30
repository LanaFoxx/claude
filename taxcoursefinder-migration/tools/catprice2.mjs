import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const u of ['https://cataxcourses.com/product/ctec-20-hours-renewal-course/', 'https://cataxcourses.com/product/ctec-60-hours-course/', 'https://cataxcourses.com/book-add-ons/']) {
  const r = await p.goto(u, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => null); if (!r) { console.log(u, 'failed'); continue; }
  console.log('##', u, r.status());
  console.log('  selects:', JSON.stringify(await p.$$eval('select', ss => ss.map(s => [s.name, [...s.options].map(o => o.textContent.trim())]))));
  console.log('  variations:', (await p.$eval('form.variations_form', f => f.getAttribute('data-product_variations')).catch(() => '')).slice(0, 1500));
  const t = (await p.evaluate(() => document.querySelector('main, .product, body').innerText)).replace(/\s+/g, ' ');
  for (const m of [...t.matchAll(/.{0,70}\$\d[\d,.]*.{0,50}/g)].slice(0, 8)) console.log('  ', m[0]);
}
await b.close();
