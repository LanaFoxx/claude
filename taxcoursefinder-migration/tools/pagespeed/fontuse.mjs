import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const u of ['/','/ctec-20-hour-course/','/schools/california-tax-courses/']) for (const w of [412,1350]) {
  const p = await (await b.newContext({viewport:{width:w,height:900}})).newPage();
  await p.goto('https://taxcoursefinder.com'+u,{waitUntil:'networkidle'});
  const r = await p.evaluate(()=>{const o={};for(const el of document.querySelectorAll('body *')){ if(!el.childNodes.length) continue; const t=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).length; if(!t) continue; const r=el.getBoundingClientRect(); if(!r.width) continue; const f=getComputedStyle(el).fontFamily.split(',')[0].replace(/"/g,''); const k=f+(r.top<900?' ABOVE':''); o[k]=o[k]||[]; if(o[k].length<3)o[k].push(el.textContent.trim().slice(0,30));} return o;});
  console.log(u,w,JSON.stringify(r));
  await p.context().close();
}
await b.close();
