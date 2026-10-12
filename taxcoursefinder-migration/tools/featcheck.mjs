import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
p.on('pageerror', e => console.log('ERR', e.message));
for (const u of ['', 'ctec-20-hour-course/', 'ctec-60-hour-course/', 'provider-application/']) {
  await p.goto('https://taxcoursefinder.com/' + u + '?n=' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const btn = p.locator('button:has-text("features"), button:has-text("Features"), button:has-text("filters"), button:has-text("Filters")').first();
  if (await btn.count()) { await btn.click().catch(() => {}); await p.waitForTimeout(500); }
  const t = await p.evaluate(() => document.body.innerText);
  const has = w => new RegExp(w, 'i').test(t);
  console.log(u || 'home', JSON.stringify({ selfPaced: has('Self-paced'), pdf: has('\\bPDF\\b'), onlineVideos: has('Online videos'), bundle: has('Course bundle price'),
    gone: ['Progress tracking', 'Practice exams', 'Study features', 'Mobile friendly', 'Desktop access', 'Device', 'Digital book', 'Published package price', 'Package price'].filter(has) }));
  if (u === 'ctec-20-hour-course/') await p.screenshot({ path: S + '/shots/filters.png' });
}
await b.close();
