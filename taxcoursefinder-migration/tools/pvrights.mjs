import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const w of [1440, 360]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 900 });
  await ctx.route(x => x.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/provider-rights.html`, 'utf8') }));
  const p = await ctx.newPage(); await p.goto('https://taxcoursefinder.com/provider-rights/?pv=1', { waitUntil: 'networkidle' });
  const el = p.getByText('Listing and verification are separate', { exact: true }).first(); await el.scrollIntoViewIfNeeded();
  await el.locator('xpath=ancestor::div[2]').screenshot({ path: `${S}/shots/pv-rights-${w}.png` });
  const em = p.locator('[data-tcf-copy="providers@taxcoursefinder.com"]').first(); await em.scrollIntoViewIfNeeded(); await em.click(); await p.waitForTimeout(300);
  console.log(w, 'email chip right edge', Math.round((await em.boundingBox()).x + (await em.boundingBox()).width), '| label after click:', await p.locator('[data-tcf-copy-done]').first().textContent(), '| scrollW', await p.evaluate(() => document.documentElement.scrollWidth));
  await ctx.close();
}
await b.close();
