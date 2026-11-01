import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const S = process.argv[2], live = process.argv[3]==='live';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [slug,w,sel] of [['home',1280,'text=Final CTEC renewal deadline, text=CTEC renewal deadline'],['home',390,'[data-cdm-note]'],['ctec-20-hour-course',390,'[data-cdm-note]']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w<500, hasTouch: w<500 });
  if(!live) await ctx.route(u => u.href.includes('?pv='), r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(`${S}/pv/${slug}.html`, 'utf8') }));
  const p = await ctx.newPage(); await p.goto(`https://taxcoursefinder.com/${slug==='home'?'':slug+'/'}?${live?'nc='+Date.now():'pv=1'}`,{waitUntil:'networkidle'}); await p.waitForTimeout(900);
  const txt = await p.evaluate(()=>{const q=s=>[...document.querySelectorAll(s)].filter(e=>e.offsetParent).map(e=>e.textContent.trim().replace(/\s+/g,' ')).slice(0,3); return {top:q('[data-tcf-cd]'), strip:q('[data-cd-title]'), cdm:q('[data-cdm-title]').concat(q('[data-cdm-long]'),q('[data-cdm-note]')), badge:q('[data-tcf-dl-short]'), h2:[...document.querySelectorAll('h2')].filter(h=>/deadline/i.test(h.textContent)&&h.offsetParent).map(h=>h.textContent.trim().replace(/\s+/g,' ')), notes:[...document.querySelectorAll('p')].filter(x=>/extended/.test(x.textContent)&&x.offsetParent).map(x=>x.textContent.trim().slice(0,120))};});
  console.log(slug,w,JSON.stringify(txt));
  await ctx.close();
}
await b.close();
