import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const s of ['', 'ctec-20-hour-course/', 'ctec-60-hour-course/']) {
  await p.goto('https://taxcoursefinder.com/' + s + '?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const lines = await p.evaluate(() => { const out = []; document.querySelectorAll('.tcf-root h1,.tcf-root h2,.tcf-root h3,.tcf-root p,.tcf-root summary,.tcf-root [style*="text-transform:uppercase"]').forEach(e => { const t = e.innerText.trim().replace(/\s+/g, ' '); if (/(20|60)[- ]?hour|\bCE\b|\bQE\b/i.test(t) && t.length < 220) out.push(e.tagName + ': ' + t); }); return [...new Set(out)]; });
  console.log('== /' + s); lines.slice(0, 40).forEach(l => console.log('  ' + l));
}
await b.close();
