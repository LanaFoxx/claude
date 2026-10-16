import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
for (const u of ['', 'ctec-20-hour-course/', 'ctec-60-hour-course/', 'how-we-compare-providers/', 'faqs/', 'about/']) {
  await p.goto('https://taxcoursefinder.com/' + u + '?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
  const r = await p.evaluate(() => { const t = document.body.innerText; const m = document.querySelector('meta[name=description]')?.content || '';
    return { star: (t.match(/★/g) || []).length, rating: (t.match(/\brating/gi) || []).length, googleRev: (t.match(/google review|google rating/gi) || []).length, metaHasRating: /rating/i.test(m) }; });
  console.log('/' + u, JSON.stringify(r));
  if (u === 'ctec-20-hour-course/') await p.locator('.tcf-table').first().screenshot({ path: `${S}/shots/table-norating.png` });
}
await b.close();
