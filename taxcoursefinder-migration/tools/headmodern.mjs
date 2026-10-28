import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, t] of [[1440, 'd'], [1024, 't'], [390, 'm']]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, isMobile: w < 500, hasTouch: w < 500, deviceScaleFactor: w < 500 ? 2 : 1 });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('https://taxcoursefinder.com/?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  console.log(t, 'topbar:', JSON.stringify(await p.evaluate(() => document.querySelector('.tcf-topbar')?.innerText.replace(/\s+/g, ' '))));
  await p.screenshot({ path: `${S}/shots/hm-${t}.png`, clip: { x: 0, y: 0, width: w, height: w < 500 ? 140 : 150 } });
  await p.mouse.wheel(0, 1400); await p.waitForTimeout(600);
  console.log(t, 'scrolled header top/height:', JSON.stringify(await p.evaluate(() => { const r = document.querySelector('.tcf-header').getBoundingClientRect(); const tb = document.querySelector('.tcf-topbar').getBoundingClientRect(); return { headerTop: Math.round(r.top), h: Math.round(r.height), topbarBottom: Math.round(tb.bottom) }; })));
  if (t === 'd') { await p.locator('.tcf-header nav .dd').first().hover(); await p.waitForTimeout(400); await p.screenshot({ path: `${S}/shots/hm-d-menu.png`, clip: { x: 700, y: 0, width: 740, height: 460 } }); }
  if (t === 'm') { console.log('mobile home countdown:', await p.evaluate(() => (document.body.innerText.match(/(CTEC renewal deadline|Late renewal closes)[^\n]*/) || [''])[0])); }
}
await b.close();
