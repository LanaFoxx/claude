import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://taxcoursefinder.com/?v=' + Date.now(), { waitUntil: 'networkidle' });
const r = await p.evaluate(() => {
  const pick = el => { if (!el) return null; const s = getComputedStyle(el); return { t: el.textContent.trim().slice(0, 30), font: s.font, pad: s.padding, rad: s.borderRadius, bg: s.backgroundColor, border: s.border, shadow: s.boxShadow, h: el.getBoundingClientRect().height }; };
  const all = [...document.querySelectorAll('a,button')];
  return [pick(document.querySelector('.tcf-nav-cta')), pick(document.querySelector('.tcf-nav-btn')),
    pick(all.find(a => a.textContent.trim() === 'View course')), pick(all.find(a => /^\s*Search\s*$/.test(a.textContent))), pick(all.find(a => /See all filters/.test(a.textContent)))];
});
console.log(JSON.stringify(r, null, 1));
await b.close();
