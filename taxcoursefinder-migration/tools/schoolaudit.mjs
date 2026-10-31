import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const feed = JSON.parse(fs.readFileSync(S + '/pre/api.json'));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
let n = 0;
for (const pr of feed.providers) for (const [c, flag] of [['20-hour', 'offers_20_hour_ce'], ['60-hour', 'offers_60_hour_qe']]) {
  if (!pr[flag] || !pr.school_url) continue;
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const res = await p.goto(pr.school_url + '?course=' + c + '&nc=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
  const r = await p.evaluate(() => {
    const out = [], vis = e => e.offsetParent && e.getBoundingClientRect().width > 0;
    for (const a of document.querySelectorAll('.tcf-scope a[style*="border-radius:999px"], .tcf-scope button[style*="border-radius:999px"]')) { if (!vis(a)) continue; const h = a.getBoundingClientRect().height, fs = parseFloat(getComputedStyle(a).fontSize); if (h > fs * 2.9 + 30) out.push('tall button: ' + a.textContent.trim().slice(0, 30)); }
    const row = document.querySelector('.tcfd-idrow'); if (row && getComputedStyle(row).flexDirection !== 'column') out.push('logo row not stacked');
    const cr = document.querySelector('.tcfd-crumbs'); if (cr && cr.getBoundingClientRect().height > 40) out.push('breadcrumb wraps');
    const sn = document.querySelector('.tcfd-subnav'); if (sn) for (const a of sn.querySelectorAll('a')) { if (!vis(a)) continue; const q = a.getBoundingClientRect(); if (q.right > innerWidth + 1 || q.left < -1) out.push('subnav item off screen: ' + a.textContent.trim()); }
    if (document.documentElement.scrollWidth > innerWidth + 1) out.push('sideways scroll');
    return out;
  });
  n++;
  if (res.status() !== 200 || r.length || errs.length) console.log(res.status(), pr.name, c, r, errs);
  await p.close();
}
console.log('checked', n, 'school/course pages');
await b.close();
