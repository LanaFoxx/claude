import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2], url = process.argv[3], name = process.argv[4];
const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
for (const w of [1350, 390]) {
  const p = await (await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 500 })).newPage();
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  await p.screenshot({ path: `${S}/shots/${name}-${w}.png`, fullPage: true });
  await p.context().close();
}
await b.close();
