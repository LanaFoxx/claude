import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const pages = ['/', '/about/', '/how-we-compare-providers/', '/ctec-20-hour-course/', '/ctec-60-hour-course/'];
const re = /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.? \d{1,2}, 20\d\d/g;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const tz of ['America/Los_Angeles', 'Pacific/Honolulu', 'Asia/Tokyo']) {
  for (const [w, mob] of [[1440, false], [390, true]]) {
    const ctx = await b.newContext({ timezoneId: tz, viewport: { width: w, height: 900 }, isMobile: mob });
    for (const u of pages) {
      const p = await ctx.newPage();
      let initial = '';
      p.on('response', async r => { if (r.url().split('?')[0] === 'https://taxcoursefinder.com' + u && r.request().resourceType() === 'document') initial = await r.text().catch(() => ''); });
      await p.goto('https://taxcoursefinder.com' + u + '?nc=' + Date.now(), { waitUntil: 'networkidle' });
      await p.waitForTimeout(500);
      const rendered = await p.evaluate(() => document.body.innerText);
      const ssrDates = [...new Set((initial.replace(/<script[\s\S]*?<\/script>|<template[\s\S]*?<\/template>/g, '').replace(/<[^>]+>/g, ' ').match(re) || []))];
      const jsDates = [...new Set(rendered.match(re) || [])];
      const skip = await p.evaluate(() => !!document.getElementById('content') && !!document.querySelector('a.skip-link[href="#content"]'));
      console.log(tz.padEnd(20), String(w).padEnd(5), u.padEnd(28), 'html:', JSON.stringify(ssrDates), 'js:', JSON.stringify(jsDates), 'skip:', skip);
      await p.close();
    }
    await ctx.close();
  }
}
await b.close();
