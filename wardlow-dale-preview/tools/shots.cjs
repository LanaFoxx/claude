// Screenshots + layout checks of the preview page at the QA widths (logged out).
//   node tools/shots.cjs <outdir> [widths...]
const { chromium } = require('playwright');
const fs = require('fs');
const URL_ = process.env.WD_URL || 'https://staging129.dreamweb.digital/new-design/';
const outDir = process.argv[2] || 'shots';
const widths = process.argv.slice(3).map(Number).filter(Boolean);
const W = widths.length ? widths : [1440, 1300, 1100, 900, 768, 390];
fs.mkdirSync(outDir, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const report = {};
  for (const w of W) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    await p.goto(URL_ + (URL_.includes('?') ? '&' : '?') + 'nocache=' + Date.now(), { waitUntil: 'networkidle', timeout: 120000 });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
    await p.waitForTimeout(800);
    report[w] = await p.evaluate(() => {
      const r = { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, h1: document.querySelectorAll('h1').length };
      r.imgsNoAlt = [...document.querySelectorAll('#wd-2026 img')].filter((i) => !i.hasAttribute('alt')).map((i) => i.src.split('/').pop());
      r.imgs = [...document.querySelectorAll('#wd-2026 img')].filter((i) => i.offsetParent).map((i) => `${i.src.split('/').pop()} alt="${i.alt}"`);
      const nums = [...document.querySelectorAll('.wd-num')].map((e) => Math.round(e.getBoundingClientRect().top));
      r.statsOneRow = nums.length === 3 && new Set(nums).size === 1;
      const steps = [...document.querySelectorAll('.wd-step')].map((e) => Math.round(e.getBoundingClientRect().top));
      r.stepsOneRow = steps.length === 5 && new Set(steps).size === 1;
      // elements wider than the viewport
      r.overflow = [...document.querySelectorAll('#wd-2026 *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.right > window.innerWidth + 1) && getComputedStyle(e).position !== 'fixed' && !e.closest('.wd-hero-photo') && !e.closest('[aria-hidden]'); }).slice(0, 8).map((e) => e.className.toString().slice(0, 60));
      return r;
    });
    await p.screenshot({ path: `${outDir}/new-${w}.png`, fullPage: true });
    await ctx.close();
    console.log(w, JSON.stringify(report[w]).slice(0, 900));
  }
  fs.writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 1));
  await b.close();
})();
