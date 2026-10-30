import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
async function open(slug, url, w = 1440) { const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/${slug}.html`, 'utf8') })); const p = await ctx.newPage(); await p.goto('https://taxcoursefinder.com' + url + '?pv=1', { waitUntil: 'networkidle' }); return p; }
const lines = e => e.evaluate(x => Math.round(x.getBoundingClientRect().height / parseFloat(getComputedStyle(x).lineHeight)));
let p = await open('home', '/');
const h1 = p.locator('h1').first(); console.log('home h1 size', await h1.evaluate(e => getComputedStyle(e).fontSize), 'lines', await lines(h1));
await p.screenshot({ path: `${S}/shots/pv-homehero.png`, clip: { x: 0, y: 0, width: 1440, height: 800 } });
const cal = p.getByText('Key dates', { exact: true }).first(); await cal.scrollIntoViewIfNeeded(); await cal.locator('xpath=ancestor::div[4]').screenshot({ path: `${S}/shots/pv-cal.png` });
p = await open('how-to-renew-ctec-registration', '/how-to-renew-ctec-registration/');
const t = p.getByText('What the 20-hour continuing education course covers').first(); console.log('renew h2 lines', await lines(t));
await t.scrollIntoViewIfNeeded(); await t.locator('xpath=..').screenshot({ path: `${S}/shots/pv-req.png` });
p = await open('how-to-become-a-ctec-registered-tax-preparer', '/how-to-become-a-ctec-registered-tax-preparer/');
console.log('become h1 lines', await lines(p.locator('h1').first()));
await b.close();
