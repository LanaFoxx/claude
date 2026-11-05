import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const slug of ['faqs','ctec-20-hour-course','home']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/${slug}.html`, 'utf8') }));
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(`https://taxcoursefinder.com/${slug==='home'?'':slug+'/'}?pv=1`,{waitUntil:'networkidle'}); await p.waitForTimeout(900);
  const n = await p.locator('.tcf-faq-btn').count();
  let r='';
  if (n) { const btn=p.locator('.tcf-faq-btn').first(); await btn.scrollIntoViewIfNeeded(); const before=await p.locator('.tcf-faq-a:visible').count(); await btn.tap(); await p.waitForTimeout(200); const after=await p.locator('.tcf-faq-a:visible').count(); const ae=await btn.getAttribute('aria-expanded');
    await btn.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(200); const after2=await p.locator('.tcf-faq-a:visible').count();
    const st = await btn.evaluate(e=>{const c=getComputedStyle(e);return c.color+' '+c.backgroundColor+' '+c.fontSize+' '+c.borderTopWidth});
    await p.screenshot({path:`${S}/shots/faq-${slug}.png`}); r=`btns ${n} visible answers ${before}->${after}->${after2} aria ${ae} style ${st}`; }
  console.log(slug, r, errs); await ctx.close();
}
await b.close();
