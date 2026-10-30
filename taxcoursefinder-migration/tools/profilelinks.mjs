import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, mob] of [[1440, false], [390, true]]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, isMobile: mob });
  await p.goto('https://taxcoursefinder.com/?v=' + Date.now(), { waitUntil: 'networkidle' });
  const links = await p.evaluate(() => [...document.querySelectorAll('a[href*="/schools/"]')].filter(a => a.offsetParent).map(a => a.textContent.trim().slice(0, 30) + ' -> ' + a.getAttribute('href')));
  console.log(w, 'profile links visible:', links.length); console.log('  ', links.slice(0, 4).join('\n   '));
  const first = p.locator('a[href*="/schools/"]').filter({ hasText: /\w/ }).first();
  const href = await first.getAttribute('href');
  const r = await p.goto(new URL(href, 'https://taxcoursefinder.com').href, { waitUntil: 'networkidle' });
  console.log('  profile opens:', r.status(), (await p.locator('h1').first().textContent()).trim());
  if (mob) await p.screenshot({ path: `${S}/shots/profile-m.png` });
  await p.close();
}
await b.close();
