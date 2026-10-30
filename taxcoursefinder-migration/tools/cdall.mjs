import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [u, w] of [['/', 1440], ['/faqs/', 1440], ['/schools/california-tax-courses/', 1440], ['/about/', 390]]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, isMobile: w < 800 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('https://taxcoursefinder.com' + u + '?v=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  const strips = p.locator('[data-tcf-cdstrip]');
  console.log(u, w, 'strips:', await strips.count(), '|', (await strips.first().innerText()).replace(/\s+/g, ' '), '| errors:', errs.length);
  if (u === '/faqs/') { await strips.first().scrollIntoViewIfNeeded(); await strips.first().screenshot({ path: `${S}/shots/cdstrip.png` }); }
  if (u.startsWith('/schools')) { const a = p.getByText('Accuracy', { exact: true }).first(); await a.scrollIntoViewIfNeeded(); await a.locator('xpath=../../..').screenshot({ path: `${S}/shots/accband.png` });
    const row = p.getByText('Unlimited exam attempts?', { exact: true }); console.log('   attempts row:', await row.count() ? (await row.locator('xpath=..').innerText()).replace(/\s+/g, ' ') : 'none'); }
  await p.close();
}
await b.close();
