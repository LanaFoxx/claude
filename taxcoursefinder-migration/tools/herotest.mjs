import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, t] of [[1440, 'd'], [390, 'm']]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, isMobile: w < 500, hasTouch: w < 500 });
  p.on('pageerror', e => console.log('ERR', e.message));
  for (const u of ['', 'about/']) {
    await p.goto('https://taxcoursefinder.com/' + u + '?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    const pos = () => p.evaluate(() => { const i = document.querySelector('.tcf-hero-bg'), h = document.querySelector('.tcf-hero-fixed'); return i && h ? { img: Math.round(i.getBoundingClientRect().top), hero: Math.round(h.getBoundingClientRect().top), pos: getComputedStyle(i).position } : 'none'; });
    const a = await pos(); await p.evaluate(() => window.scrollTo(0, 300)); await p.waitForTimeout(400); const z = await pos();
    console.log(t, '/' + u, 'top', JSON.stringify(a), '-> scrolled 300', JSON.stringify(z));
    if (u === '' ) await p.screenshot({ path: `${S}/shots/hero-fixed-${t}.png` });
  }
}
await b.close();
