import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, isMobile: true, ignoreHTTPSErrors: true });
await ctx.addCookies(JSON.parse(fs.readFileSync(S + '/pw_cookies.json')).map(c => ({ ...c, domain: c.domain.replace(/^\./, ''), secure: true })));
const p = await ctx.newPage();
await p.goto('https://taxcoursefinder.com/schools/1st-attempt-at-your-pace-online/', { waitUntil: 'networkidle' });
console.log(await p.evaluate(() => {
  const hero = document.querySelector('.tcf-root .tcf-screen > div');
  const out = [];
  const walk = (el, d) => { if (d > 3) return; for (const c of el.children) { const r = c.getBoundingClientRect(); out.push(' '.repeat(d * 2) + c.tagName + ' y=' + Math.round(r.top + scrollY) + ' h=' + Math.round(r.height) + ' w=' + Math.round(r.width) + ' x=' + Math.round(r.left) + ' | ' + (c.getAttribute('style') || '').slice(0, 110)); walk(c, d + 1); } };
  walk(hero, 0); return out.join('\n');
}));
await b.close();
