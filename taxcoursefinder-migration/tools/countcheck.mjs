import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', e => console.log('ERR', e.message));
for (const s of ['', 'ctec-20-hour-course/', 'ctec-60-hour-course/']) {
  await p.goto('https://taxcoursefinder.com/' + s + '?n=' + Date.now(), { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  console.log('/' + s, JSON.stringify(await p.evaluate(() => ({ hero: (document.body.innerText.match(/\d+ CTEC-APPROVED PROVIDERS[^\n]*/i) || [''])[0], list: (document.querySelector('.tcf-root h2')?.innerText || ''), search: document.querySelector('.tcf-root input[placeholder]')?.placeholder,
    itemlist: [...document.querySelectorAll('script.tcfd-course-list')].map(x => JSON.parse(x.textContent).numberOfItems), first: [...document.querySelectorAll('[id^=provider-]')].slice(0, 3).map(e => e.id) }))));
}
await b.close();
