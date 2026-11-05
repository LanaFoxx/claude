import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const w of [1477, 1100, 900, 390]) {
  const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('https://taxcoursefinder.com/schools/a-b-office-income-tax-training-school/?nc='+Date.now(),{waitUntil:'networkidle'}); await p.waitForTimeout(1500);
  const r = await p.evaluate(()=>{const h=document.querySelector('#tcf-school-root .tcf-screen > div').getBoundingClientRect(), c=document.querySelector('.tcfd-card').getBoundingClientRect(); return {heroTop:Math.round(h.top+scrollY),heroBot:Math.round(h.bottom+scrollY),cardTop:Math.round(c.top+scrollY),cardBot:Math.round(c.bottom+scrollY),pos:getComputedStyle(document.querySelector('.tcfd-card')).position, gapTop:Math.round(c.top-h.top), gapBot:Math.round(h.bottom-c.bottom)};});
  console.log(w, JSON.stringify(r), errs);
  await p.screenshot({path:`${S}/shots/card-${w}.png`});
  if (w===1477) { await p.mouse.wheel(0,900); await p.waitForTimeout(500); await p.screenshot({path:`${S}/shots/card-${w}-scrolled.png`}); }
  await p.context().close();
}
await b.close();
