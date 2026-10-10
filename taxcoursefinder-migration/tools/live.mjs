import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2]; const slugs = process.argv.slice(3);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
for (const sl of slugs) {
  for (const [w, tag] of [[1440, 'd'], [390, 'm']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 500, ignoreHTTPSErrors: true });
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log('ERR', sl, e.message));
    p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', sl, m.text().slice(0, 150)); });
    await p.goto('https://taxcoursefinder.com/' + (sl === 'home' ? '' : sl + '/') + '?nocache=' + Date.now(), { waitUntil: 'networkidle', timeout: 60000 });
    await p.waitForTimeout(1000);
    const info = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, title: document.title, h1: document.querySelector('h1')?.textContent.trim().slice(0, 60) }));
    await p.screenshot({ path: `${S}/shots/live-${sl}-${tag}.png`, fullPage: true });
    console.log(sl, tag, JSON.stringify(info));
    await ctx.close();
  }
}
await b.close();
