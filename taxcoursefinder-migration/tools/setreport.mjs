import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [S] = process.argv.slice(2);
const jobs = [[44, { ce: 'next_day' }], [63, { ce: '24h', qe: '24h' }]];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addCookies(JSON.parse(fs.readFileSync(S + '/pw_cookies.json')).map(c => ({ ...c, domain: c.domain.replace(/^\./, ''), secure: true })));
const p = await ctx.newPage();
for (const [id, vals] of jobs) {
  await p.goto(`https://taxcoursefinder.com/wp-admin/post.php?post=${id}&action=edit`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#publish', { timeout: 60000 });
  for (const [c, v] of Object.entries(vals)) {
    const ok = await p.evaluate(([c, v]) => { const el = document.querySelector(`select[name="acf[field_tcfd_school_${c}][field_tcfd_sc_${c}_reporting_time]"]`); if (!el) return 'missing'; el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); return el.value; }, [c, v]);
    console.log(id, c, ok);
  }
  await Promise.all([p.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 90000 }), p.click('#publish')]);
  console.log(id, 'saved', (await p.locator('#message').innerText().catch(() => '')).slice(0, 40));
}
await b.close();
