import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2], live = process.argv[3] === 'live';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
if (!live) await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/home.html`, 'utf8') }));
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('https://taxcoursefinder.com/' + (live ? '?nc=' + Date.now() : '?pv=1'), { waitUntil: 'networkidle' });
for (let i = 0; i < 4; i++) { const more = p.getByText(/Show (\d+ )?more|more providers/i).first(); if (await more.count() && await more.isVisible()) { await more.click(); await p.waitForTimeout(300); } }
const links = await p.evaluate(() => [...document.querySelectorAll('a')].filter(a => /→$/.test(a.textContent.trim()) && a.offsetParent && /View course|Visit school|Browse CTEC|View packages/.test(a.textContent)).map(a => {
  const card = a.closest('div[style*="border-radius"]') || a.parentElement; return [a.textContent.trim(), a.getAttribute('href'), card.innerText.replace(/\s+/g, ' ').slice(0, 140)]; }));
links.forEach(l => console.log(l.join(' | ')));
const h = await p.getByText('The Income Tax School').first(); if (await h.count()) { await h.scrollIntoViewIfNeeded(); await p.screenshot({ path: S + '/shots/mob-cards.png' }); }
console.log('links', links.length, 'errors', errs, 'scrollW', await p.evaluate(() => document.documentElement.scrollWidth));
await b.close();
