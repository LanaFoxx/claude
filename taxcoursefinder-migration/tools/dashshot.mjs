import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const cookies = fs.readFileSync(S + '/cj.txt', 'utf8').split('\n').filter(l => l && !l.startsWith('#') || l.startsWith('#HttpOnly_')).map(l => l.replace(/^#HttpOnly_/, '')).map(l => l.split('\t')).filter(p => p.length >= 7)
  .map(p => ({ name: p[5], value: p[6], domain: p[0].replace(/^\./, ''), path: p[2], secure: p[3] === 'TRUE', httpOnly: true }));
const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); await ctx.addCookies(cookies);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
for (const v of ['', 'outreach', 'preview&school=webce', 'settings']) {
  await p.goto('https://taxcoursefinder.com/wp-admin/admin.php?page=tcfd-dashboard' + (v ? '&view=' + v : ''), { waitUntil: 'networkidle' });
  await p.screenshot({ path: `${S}/shots/dash-${v.split('&')[0] || 'overview'}.png`, fullPage: true });
}
console.log(errs);
await b.close();
