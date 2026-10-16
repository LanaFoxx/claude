import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const slugs = ['', 'ctec-20-hour-course/', 'ctec-60-hour-course/', 'ctec-requirements/', 'how-to-become-a-ctec-registered-tax-preparer/', 'how-to-renew-ctec-registration/', 'how-to-choose-a-ctec-course/', 'how-we-compare-providers/', 'faqs/', 'about/', 'provider-rights/', 'provider-application/', 'ctec-live-scan-background-check/', 'ctec-experience-in-lieu-15-hour-course/'];
for (const s of slugs) {
  await p.goto('https://taxcoursefinder.com/' + s + '?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const btn = p.locator('button:has-text("See all filters"), button:has-text("Filters")').first(); if (await btn.count()) { await btn.click().catch(() => {}); await p.waitForTimeout(400); }
  const hits = await p.evaluate(() => (document.body.innerText.match(/[^\n.]{0,40}self[- ]?paced[^\n.]{0,30}/gi) || []));
  if (hits.length) console.log('/' + s, hits);
}
console.log('scan done');
await b.close();
