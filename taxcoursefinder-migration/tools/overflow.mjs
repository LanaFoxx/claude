import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const s of process.argv.slice(2)) {
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await m.goto('http://127.0.0.1:8765/__' + s + '.html', { waitUntil: 'networkidle' });
  const r = await m.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > 392 && r.width > 0; }).filter(e => ![...e.children].some(c => c.getBoundingClientRect().right > 392)).slice(0, 6).map(e => e.tagName + ' ' + Math.round(e.getBoundingClientRect().right) + ' ' + (e.getAttribute('style') || '').slice(0, 90) + ' | ' + (e.textContent || '').trim().slice(0, 40)));
  console.log('==', s); r.forEach(x => console.log('  ', x));
}
await b.close();
