import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const pages = ['/about/','/ctec-experience-in-lieu-15-hour-course/','/ctec-live-scan-background-check/','/faqs/','/how-to-become-a-ctec-registered-tax-preparer/','/how-to-choose-a-ctec-course/','/privacy-policy/','/provider-application/','/provider-rights/','/terms-of-use/','/schools/'];
for (const u of pages) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const r = await p.goto('https://taxcoursefinder.com' + u + '?v=' + Date.now(), { waitUntil: 'networkidle' }).catch(e => null);
  if (!r || r.status() >= 400) { console.log(u, 'status', r && r.status()); await p.close(); continue; }
  const bad = await p.evaluate(() => [...document.querySelectorAll('a,button,input[type=submit]')].filter(el => {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    if (!r.width || r.height < 30 || r.height > 80) return false;
    const filled = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && !/255, 255, 255/.test(s.backgroundColor);
    const outlined = parseFloat(s.borderTopWidth) >= 1 && s.borderTopStyle !== 'none';
    if (!filled && !outlined) return false;
    if (el.closest('.dd-menu')) return false;
    return parseFloat(s.borderTopLeftRadius) < r.height / 2 - 1;
  }).map(el => { const s = getComputedStyle(el); return el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) + ' | r=' + s.borderTopLeftRadius + ' bg=' + s.backgroundColor + ' h=' + Math.round(el.getBoundingClientRect().height); }));
  console.log(u, bad.length); [...new Set(bad)].slice(0, 15).forEach(x => console.log('   ', x));
  await p.close();
}
await b.close();
