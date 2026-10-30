import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('https://taxcoursefinder.com/schools/california-tax-courses/?v=' + Date.now(), { waitUntil: 'networkidle' });
const t = async x => p.getByText(x, { exact: true }).count();
console.log('Pace row:', await t('Pace'), '| "not confirmed" pills:', await p.locator('text=/· not confirmed/').count(), '| support badges:', await t('NOT CONFIRMED') + await t('Not confirmed'), '| errors:', errs.length);
console.log('support boxes:', await p.locator('#help, section').filter({ hasText: 'Can I get help?' }).locator('[style*="border-radius:14px;padding:22px"]').count());
for (const [name, txt] of [['learn', 'How will I learn?'], ['help', 'Can I get help?'], ['accuracy', 'Accuracy']]) {
  const el = p.getByText(txt, { exact: true }).first(); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  await p.screenshot({ path: `${S}/shots/prof-${name}.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } });
}
await b.close();
