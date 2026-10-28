import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, t] of [[1440, 'd'], [390, 'm']]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, isMobile: w < 500 });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('https://taxcoursefinder.com/how-to-renew-ctec-registration/?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const h = () => p.evaluate(() => { const hd = document.querySelector('.tcf-header'); const r = hd.getBoundingClientRect(); const logo = hd.querySelector('img'); return { top: Math.round(r.top), height: Math.round(r.height), logoVisible: !!logo && logo.offsetParent !== null }; });
  console.log(t, 'at top', JSON.stringify(await h()));
  await p.mouse.wheel(0, 1600); await p.waitForTimeout(700);
  console.log(t, 'scrolled', JSON.stringify(await h()));
  await p.screenshot({ path: `${S}/shots/head-${t}.png`, clip: { x: 0, y: 0, width: w, height: 240 } });
  await p.mouse.wheel(0, -5000); await p.waitForTimeout(700);
  console.log(t, 'back to top', JSON.stringify(await h()));
}
await b.close();
