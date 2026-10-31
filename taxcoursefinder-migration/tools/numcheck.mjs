import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const slug of process.argv.slice(3)){
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/${slug}.html`, 'utf8') }));
  const p = await ctx.newPage(); await p.goto(`https://taxcoursefinder.com/${slug==='home'?'':slug+'/'}?pv=1`,{waitUntil:'networkidle'}); await p.waitForTimeout(700);
  const r = await p.evaluate(()=>{const o={};for(const el of document.querySelectorAll('.tcf-page *, main *')){ if(el.children.length) continue; const t=el.textContent.trim(); if(!/^\$?\d{1,3}$/.test(t)) continue; if(!el.offsetParent) continue; const cs=getComputedStyle(el); const k=cs.color+' / '+cs.backgroundColor; o[k]=(o[k]||'')+t+' ';} return o;});
  console.log(slug, JSON.stringify(r)); await ctx.close();
}
await b.close();
