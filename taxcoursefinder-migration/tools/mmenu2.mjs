import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2], slug = process.argv[3] || 'home';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
if (slug !== 'live') await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/${slug}.html`, 'utf8') }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('https://taxcoursefinder.com/' + (slug === 'live' ? '?nc=' + Date.now() : (slug === 'home' ? '' : slug + '/') + '?pv=1'), { waitUntil: 'networkidle' });
await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(300);
await p.click('[data-tcf-menu-toggle]'); await p.waitForTimeout(400);
const r = await p.evaluate(() => { const n = document.querySelector('.tcf-header nav.tcf-nav').getBoundingClientRect(); return { top: Math.round(n.top), bottom: Math.round(n.bottom), vh: innerHeight, scrollY }; });
console.log('menu box', JSON.stringify(r));
await p.screenshot({ path: S + '/shots/mmenu-full.png' });
await p.getByText('Compare Courses').first().click(); await p.waitForTimeout(800);
console.log('after link: open?', await p.evaluate(() => document.querySelector('.tcf-header').classList.contains('tcf-menu-open')));
if (slug === 'home' || slug === 'live') {
  await p.getByText('Filters', { exact: true }).first().click(); await p.waitForTimeout(500);
  await p.screenshot({ path: S + '/shots/mfilters-new.png' });
  await p.getByRole('button', { name: 'Close filters' }).click(); await p.waitForTimeout(400);
  console.log('filters closed:', !(await p.getByText(/of \d+ providers match/).count()));
}
console.log('errors', errs);
await b.close();
