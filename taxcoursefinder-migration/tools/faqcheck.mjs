import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
for (const slug of ['1-0-4-0-and-more-continuing-education', 'federal-direct-tax-services']) {
  const r = await p.goto(`https://taxcoursefinder.com/schools/${slug}/?v=` + Date.now(), { waitUntil: 'networkidle' });
  console.log(slug, r.status(), '| School FAQ:', await p.locator('text=School FAQ').count(), '| Edition:', await p.locator('text=Edition / tax year').count(), '| FAQ tab:', await p.locator('a[href="#faq"]').count(), '| errors:', errs.length);
}
await b.close();
