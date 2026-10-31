import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2], slugs = process.argv.slice(3);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const slug of slugs) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/${slug}.html`, 'utf8') }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('https://taxcoursefinder.com/' + (slug === 'home' ? '' : slug + '/') + '?pv=1', { waitUntil: 'networkidle' });
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } scrollTo(0, 0); });
  await p.waitForTimeout(1600);
  const r = await p.evaluate(() => {
    const out = [], vis = e => e.offsetParent && e.getBoundingClientRect().width > 0;
    const btns = [...document.querySelectorAll('.tcf-scope a[style*="border-radius:999px"], .tcf-scope button[style*="border-radius:999px"], .tcf-cdstrip a')].filter(vis);
    for (const a of btns) { const lh = parseFloat(getComputedStyle(a).lineHeight) || parseFloat(getComputedStyle(a).fontSize) * 1.25; const rects = [...a.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => { const r = document.createRange(); r.selectNodeContents(n); return r.getClientRects().length; }); if (rects.some(n => n > 1) || a.scrollWidth > a.clientWidth + 2) out.push('2-LINE/CLIPPED BUTTON: ' + a.textContent.trim().slice(0, 40) + ' fs=' + getComputedStyle(a).fontSize); }
    for (const el of document.querySelectorAll('.tcf-page *')) { if (!vis(el) || el.children.length) continue; const t = el.textContent.trim(); const r = el.getBoundingClientRect(); if (t.length > 6 && r.width < 34 && r.height > 120) out.push('SQUEEZED TEXT: ' + t.slice(0, 30)); }
    for (const sp of document.querySelectorAll('.tcf-scope h1 span[style*="color"], .tcf-scope h2 span[style*="color"]')) if (vis(sp) && sp.getClientRects().length > 1) out.push('SPLIT ACCENT: ' + sp.textContent.trim());
    for (const el of document.querySelectorAll('.tcf-page *')) { if (!vis(el)) continue; const r = el.getBoundingClientRect(); if (r.right > innerWidth + 2 && getComputedStyle(el).position !== 'absolute') { out.push('OVERFLOW: ' + el.tagName + ' ' + (el.textContent || '').trim().slice(0, 30) + ' right=' + Math.round(r.right)); break; } }
    return { out: [...new Set(out)], sw: document.documentElement.scrollWidth };
  });
  console.log(slug.padEnd(46), 'scrollW', r.sw, errs.length ? 'ERR ' + errs[0] : '', r.out.length ? '\n   ' + r.out.slice(0, 8).join('\n   ') : 'ok');
  await ctx.close();
}
await b.close();
