import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const u of ['https://www.cataxcourses.com/', 'https://www.cataxcourses.com/20-hour-ctec-continuing-education', 'https://www.cataxcourses.com/ctec-continuing-education']) {
  const r = await p.goto(u, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => null);
  if (!r) { console.log(u, 'failed'); continue; }
  const t = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  console.log('##', u, r.status());
  for (const m of t.matchAll(/.{0,90}\$\d[\d,.]*.{0,60}/g)) console.log('  ', m[0]);
  console.log('  links:', (await p.$$eval('a', as => as.map(a => a.textContent.trim().slice(0, 40) + '|' + a.href).filter(x => /20|60|ce|course|bundle|shop|product/i.test(x)).slice(0, 25))).join('\n   '));
}
await b.close();
