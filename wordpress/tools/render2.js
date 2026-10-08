const { chromium } = require(process.env.PW);
const fs = require('fs');
(async () => {
  const [src, out] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('file://' + src);
  await p.waitForTimeout(4000);
  const tag = () => p.evaluate(async () => {
    const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
    for (const img of document.querySelectorAll('img')) {
      if (img.dataset.sha) continue;
      const buf = await (await fetch(img.src)).arrayBuffer();
      img.setAttribute('data-sha', hex(await crypto.subtle.digest('SHA-256', buf)));
    }
  });
  for (const s of ['home','about','services','projects','contact']) {
    await p.locator(`header nav a[href="#${s}"]`).first().click();
    await p.waitForTimeout(1500);
    await tag();
    fs.writeFileSync(`${out}/${s}.main.html`, await p.evaluate(() => document.querySelector('main').outerHTML));
  }
  await tag();
  fs.writeFileSync(`${out}/header.html`, await p.evaluate(() => document.querySelector('header').outerHTML));
  fs.writeFileSync(`${out}/footer.html`, await p.evaluate(() => document.querySelector('footer').outerHTML));
  const css = await p.evaluate(() => { const out = []; for (const ss of document.styleSheets) { try { for (const r of ss.cssRules) if (/\.scp\d|sc-/.test(r.cssText)) out.push(r.cssText); } catch (e) {} } return out.join('\n'); });
  fs.writeFileSync(`${out}/scp.css`, css);
  await b.close();
})();
