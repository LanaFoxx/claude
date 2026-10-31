import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const jobs = [['ctec-20-hour-course','/ctec-20-hour-course/',['PACE10','Subject','Find Your Next','CTEC renewal deadline']],
 ['home','/',['Get listed free','any time.']],
 ['ctec-live-scan-background-check','/ctec-live-scan-background-check/',['Answer the background']],
 ['about','/about/',['unless specifically']]];
for (const [slug,url,txts] of jobs) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/${slug}.html`, 'utf8') }));
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('https://taxcoursefinder.com'+url+'?pv=1',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
  let i=0; for (const t of txts) { const l = p.getByText(t).first(); try { await l.scrollIntoViewIfNeeded({timeout:4000}); await p.evaluate(()=>scrollBy(0,-200)); await p.waitForTimeout(300); await p.screenshot({path:`${S}/shots/b-${slug}-${i++}.png`}); } catch(e){ console.log('miss',slug,t);} }
  if (errs.length) console.log(slug, errs); await ctx.close();
}
await b.close();
