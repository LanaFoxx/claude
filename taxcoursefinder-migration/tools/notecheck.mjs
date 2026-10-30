import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, mob] of [[1440, false], [390, true]]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, isMobile: mob });
  await p.goto('https://taxcoursefinder.com/schools/1-0-4-0-and-more-continuing-education/?v=' + Date.now(), { waitUntil: 'networkidle' });
  const el = p.getByText(/^Opens .* in a new tab$/).first(); await el.scrollIntoViewIfNeeded();
  const row = el.locator('xpath=..');
  console.log(w, 'lines:', await row.evaluate(r => [...r.children].map(c => Math.round(c.getBoundingClientRect().height)).join('/')), '| scrollW', await p.evaluate(() => document.documentElement.scrollWidth));
  if (w === 1440) await row.locator('xpath=..').screenshot({ path: `${S}/shots/note.png` });
  await p.close();
}
await b.close();
