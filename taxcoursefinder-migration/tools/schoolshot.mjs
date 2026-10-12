import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [S, url, tag] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, t] of [[1440, 'd'], [390, 'm']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 500, ignoreHTTPSErrors: true });
  await ctx.addCookies(JSON.parse(fs.readFileSync(S + '/pw_cookies.json')).map(c => ({ ...c, domain: c.domain.replace(/^\./, ''), secure: true })));
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  const info = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, h1: document.querySelector('.tcf-root h1')?.textContent.trim().replace(/\s+/g, ' '), nc: (document.body.innerText.match(/Not confirmed/g) || []).length, demo: /555-0142|since 2012/.test(document.body.innerText) }));
  console.log(t, JSON.stringify(info));
  await p.screenshot({ path: `${S}/shots/school-${tag}-${t}.png`, fullPage: true });
  await ctx.close();
}
await b.close();
