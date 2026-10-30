import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
// directory (preview of what will be published)
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/home.html`, 'utf8') }));
const p = await ctx.newPage(); await p.goto('https://taxcoursefinder.com/?pv=1', { waitUntil: 'networkidle' });
await p.locator('input[placeholder^="Search"]').first().fill('California Tax Courses'); await p.waitForTimeout(800);
const row = p.locator('.tcf-trow').first();
console.log('directory row:', (await row.innerText()).replace(/\s+/g, ' '), '| profile links:', await p.locator('a[href*="/schools/"]').count());
await p.screenshot({ path: `${S}/shots/opt-dir.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } });
await ctx.close();
// profile as editor (profiles are off for visitors now)
const c2 = await b.newContext({ viewport: { width: 1440, height: 1000 } }); await c2.addCookies(JSON.parse(fs.readFileSync(S + '/pw_cookies.json', 'utf8')));
const q = await c2.newPage(); const errs = []; q.on('pageerror', e => errs.push(e.message));
await q.goto('https://taxcoursefinder.com/schools/california-tax-courses/?v=' + Date.now(), { waitUntil: 'networkidle' });
const h = q.getByText('How will I learn?', { exact: true }).first(); await h.scrollIntoViewIfNeeded(); await q.waitForTimeout(300);
await h.locator('xpath=ancestor::section[1]').screenshot({ path: `${S}/shots/opt-ce.png` });
console.log('CE card price:', (await q.locator('.tcfd-card').first().innerText()).split('\n').slice(0, 3).join(' | '));
await q.locator('button', { hasText: '60-Hour QE Course' }).first().click(); await q.waitForTimeout(500);
await h.scrollIntoViewIfNeeded(); await h.locator('xpath=ancestor::section[1]').screenshot({ path: `${S}/shots/opt-qe.png` });
console.log('errors:', errs.length, '| hint line:', await q.getByText(/required every year to renew an existing/).count());
// visitor
const v = await b.newPage(); const r = await v.goto('https://taxcoursefinder.com/schools/california-tax-courses/?v=' + Date.now()); console.log('visitor profile status:', r.status());
await b.close();
