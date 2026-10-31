import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [label, iso, tz] of [['Oct 31 11:58 PM PT (viewer in New York)', '2026-11-01T06:58:00Z', 'America/New_York'], ['Nov 1 12:01 AM PT (viewer in LA)', '2026-11-01T07:01:00Z', 'America/Los_Angeles'], ['Jan 10 2027', '2027-01-10T18:00:00Z', 'America/Los_Angeles']]) {
  for (const w of [1440, 390]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, timezoneId: tz, isMobile: w < 500 });
    await ctx.clock.install({ time: new Date(iso) });
    await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/home.html`, 'utf8') }));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('https://taxcoursefinder.com/?pv=1', { waitUntil: 'load' }); await p.clock.runFor(2000);
    const r = await p.evaluate(() => ({
      top: (document.querySelector('[data-tcf-cd]') || {}).innerText, strip: (document.querySelector('[data-tcf-cdstrip]') || {}).innerText,
      section: [...document.querySelectorAll('h2')].map(h => h.closest('div').parentElement.innerText).find(t => /Final CTEC renewal deadline:|CTEC renewal deadline:/.test(t)) }));
    console.log('==', label, w); console.log(' top:', (r.top || '').replace(/\s+/g, ' ')); console.log(' strip:', (r.strip || '').replace(/\s+/g, ' '));
    if (w === 1440) console.log(' section:', (r.section || '').replace(/\s+/g, ' ').slice(0, 330));
    if (errs.length) console.log(' errors', errs);
    if (label.startsWith('Nov') && w === 1440) { const h = p.getByText('Time left before your registration lapses').first(); if (await h.count()) { await h.scrollIntoViewIfNeeded(); await p.screenshot({ path: S + '/shots/late-section.png' }); } }
    await ctx.close();
  }
}
await b.close();
