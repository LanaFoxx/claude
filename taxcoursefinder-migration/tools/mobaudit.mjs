import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2], mode = process.argv[3] || 'live';
const pages = (process.argv[4] || '/,/ctec-20-hour-course/,/ctec-60-hour-course/,/ctec-requirements/,/how-to-become-a-ctec-registered-tax-preparer/,/how-to-renew-ctec-registration/,/how-to-choose-a-ctec-course/,/how-we-compare-providers/,/faqs/,/about/,/provider-rights/,/provider-application/,/privacy-policy/,/terms-of-use/,/ctec-live-scan-background-check/,/ctec-experience-in-lieu-15-hour-course/').split(',');
const widths = (process.argv[5] || '360,390,430,600,768,820,1024,1180').split(',').map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const out = {};
for (const u of pages) for (const w of widths) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 900, hasTouch: w < 1100, deviceScaleFactor: 1 });
  if (mode !== 'live') { const slug = u === '/' ? 'home' : u.replace(/\//g, ''); if (fs.existsSync(`${S}/pv/${slug}.html`)) await ctx.route(x => x.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/${slug}.html`, 'utf8') })); }
  const p = await ctx.newPage();
  await p.goto('https://taxcoursefinder.com' + u + '?pv=' + Date.now(), { waitUntil: 'networkidle' }).catch(() => {});
  await p.waitForTimeout(400);
  const r = await p.evaluate((w) => {
    const de = document.documentElement, issues = [];
    if (de.scrollWidth > w + 1) issues.push('page scrolls sideways: ' + de.scrollWidth + 'px');
    const desc = el => (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') + ' "' + (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) + '"');
    const over = [], tiny = [], grids = [];
    for (const el of document.querySelectorAll('.tcf-scope *')) {
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
      const rc = el.getBoundingClientRect(); if (!rc.width || !rc.height) continue;
      const cs = getComputedStyle(el);
      if (rc.right > w + 2 && cs.position !== 'fixed' && !el.closest('[style*="overflow:hidden"],[style*="overflow-x:auto"],[style*="overflow:auto"]')) over.push(desc(el) + ' right=' + Math.round(rc.right));
      if (el.children.length === 0 && el.textContent.trim().length > 2 && parseFloat(cs.fontSize) < 12) tiny.push(desc(el) + ' ' + cs.fontSize);
      if (cs.display === 'grid' && w < 700) { const cols = cs.gridTemplateColumns.split(' ').length; if (cols >= 3) grids.push(desc(el) + ' cols=' + cols); }
    }
    if (over.length) issues.push('overflow x' + over.length + ': ' + over.slice(0, 3).join(' | '));
    if (tiny.length) issues.push('tiny text x' + tiny.length + ': ' + tiny.slice(0, 2).join(' | '));
    if (grids.length) issues.push('3+ col grid on phone x' + grids.length + ': ' + grids.slice(0, 2).join(' | '));
    return issues;
  }, w);
  if (r.length) { out[u] = out[u] || {}; out[u][w] = r; }
  await ctx.close();
}
for (const [u, ws] of Object.entries(out)) { console.log('##', u); for (const [w, is] of Object.entries(ws)) console.log('  ', w, is.join(' || ').slice(0, 600)); }
console.log('pages with issues:', Object.keys(out).length);
await b.close();
