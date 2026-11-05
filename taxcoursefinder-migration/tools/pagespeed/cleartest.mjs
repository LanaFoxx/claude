import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [slug,w] of [['ctec-20-hour-course',1350],['home',1350],['ctec-60-hour-course',390]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w<500, hasTouch: w<500 });
  await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/${slug}.html`, 'utf8') }));
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(`https://taxcoursefinder.com/${slug==='home'?'':slug+'/'}?pv=1`,{waitUntil:'networkidle'}); await p.waitForTimeout(900);
  const rows=()=>p.locator('.tcf-trow:visible').count();
  const c0 = await p.locator('.tcf-clear-filters:visible').count(); const r0=await rows();
  const chips = p.locator('[data-hv="5"]:visible'); await chips.nth(0).click(); await p.waitForTimeout(300); await chips.nth(1).click(); await p.waitForTimeout(300);
  const c1 = await p.locator('.tcf-clear-filters:visible').count(); const r1=await rows();
  if (c1) { const btn=p.locator('.tcf-clear-filters:visible').first(); await btn.scrollIntoViewIfNeeded(); await p.evaluate(()=>scrollBy(0,-150)); await p.screenshot({path:`${S}/shots/clear-${slug}-${w}.png`}); await btn.click(); await p.waitForTimeout(300); }
  const c2 = await p.locator('.tcf-clear-filters:visible').count(); const r2=await rows();
  console.log(slug,w,'clear btn',c0,c1,c2,'rows',r0,r1,r2,errs); await ctx.close();
}
await b.close();
