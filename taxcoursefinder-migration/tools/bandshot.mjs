import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2], slug = process.argv[3] || 'aardvark-tax-online';
const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
for (const w of [1440, 820, 390]) {
  const p = await (await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 500, hasTouch: w < 500 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`https://taxcoursefinder.com/schools/${slug}/?course=20-hour&nc=${Date.now()}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  const info = await p.evaluate(() => ({ bands: [...document.querySelectorAll('.tcf-step')].map(b => b.id), sw: document.documentElement.scrollWidth,
    card: (() => { const c = document.querySelector('.tcfd-card'), h = document.querySelector('#tcf-school-root .tcf-screen > div'); if (!c || !h) return null; const a = c.getBoundingClientRect(), r = h.getBoundingClientRect(); return { gapTop: Math.round(a.top - r.top), gapBot: Math.round(r.bottom - a.bottom), left: Math.round(a.left) }; })() }));
  console.log(w, JSON.stringify(info), errs);
  await p.screenshot({ path: `${S}/shots/band-${slug}-${w}.png`, fullPage: true });
  await p.context().close();
}
await b.close();
