import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://taxcoursefinder.com/schools/1-0-4-0-and-more-continuing-education/?v=' + Date.now(), { waitUntil: 'networkidle' });
for (const y of [0, 300, 500, 700, 1200, 2500]) {
  await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(300);
  const r = await p.evaluate(() => { const bar = document.querySelector('.tcfd-subnav-bar').getBoundingClientRect(); const c = document.querySelector('.tcfd-card').getBoundingClientRect();
    const overlap = c.top < bar.bottom && c.bottom > bar.top; const top = document.elementFromPoint(c.left + 30, Math.max(bar.top + 20, c.top + 5));
    return { barTop: Math.round(bar.top), cardTop: Math.round(c.top), overlap, cardOnTop: overlap ? !!top.closest('.tcfd-card') : null }; });
  console.log('scroll', y, JSON.stringify(r));
  if (y === 500) await p.screenshot({ path: `${S}/shots/cardbar.png`, clip: { x: 700, y: 0, width: 740, height: 600 } });
}
await b.close();
