import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://taxcoursefinder.com/faqs/?v=' + Date.now(), { waitUntil: 'networkidle' });
await p.evaluate(() => window.scrollTo(0, 1800)); await p.waitForTimeout(600);
console.log(JSON.stringify(await p.evaluate(() => {
  const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom), getComputedStyle(e).position, getComputedStyle(e).top]; };
  return { wrap: r('.elementor-location-header'), topbar: r('.tcf-topbar'), header: r('.tcf-header'), headInner: r('.tcf-header>div'), vars: getComputedStyle(document.documentElement).getPropertyValue('--tcf-head') + '|' + getComputedStyle(document.documentElement).getPropertyValue('--tcf-topbar') };
})));
await b.close();
