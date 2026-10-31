import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const jobs = [['ctec-20-hour-course','/ctec-20-hour-course/',['[style*="grid-template-columns:1.2fr 90px 2fr"]','[data-cdm-note]']],
 ['home','/',['.tcf-m-br','footer p']],
 ['ctec-live-scan-background-check','/ctec-live-scan-background-check/',['[style*="font:300 52px/1 Manrope"]']]];
for (const [slug,url,sels] of jobs) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/${slug}.html`, 'utf8') }));
  const p = await ctx.newPage();
  await p.goto('https://taxcoursefinder.com'+url+'?pv=1',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
  let i=0; for (const s of sels) { const l = p.locator(s).locator('visible=true').first(); try { await l.scrollIntoViewIfNeeded({timeout:4000}); await p.evaluate(()=>scrollBy(0,-250)); await p.waitForTimeout(300); await p.screenshot({path:`${S}/shots/c-${slug}-${i++}.png`}); } catch(e){ console.log('miss',slug,s);} }
  await ctx.close();
}
await b.close();
