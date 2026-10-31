import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2], live = process.argv[3] === 'live';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
if (!live) await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/home.html`, 'utf8') }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('https://taxcoursefinder.com/' + (live ? '?nc=' + Date.now() : '?pv=1'), { waitUntil: 'networkidle' });
await p.getByText('Filters', { exact: true }).first().click(); await p.waitForTimeout(500);
await p.screenshot({ path: S + '/shots/mfilters-top.png' });
const info = await p.evaluate(() => {
  const btn = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /^Show \d+ providers$/.test(e.textContent.trim()));
  let sheet = btn; while (sheet && getComputedStyle(sheet).position !== 'fixed') sheet = sheet.parentElement;
  const head = document.querySelector('.tcf-header').getBoundingClientRect();
  return { sheetTop: sheet && sheet.getBoundingClientRect().top, sheetZ: sheet && getComputedStyle(sheet).zIndex, headBottom: head.bottom, headZ: getComputedStyle(document.querySelector('.elementor-location-header') || document.body).zIndex,
           sheetStyle: sheet && sheet.getAttribute('style'), firstKids: sheet && [...sheet.children].map(c => c.tagName + ':' + (c.getAttribute('style') || '').slice(0, 140)) };
});
console.log(JSON.stringify(info, null, 1)); console.log('errors', errs);
await b.close();
