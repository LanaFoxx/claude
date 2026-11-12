// Interaction QA on the live preview: links, tel, sticky header, focus rings, phone bar, form submit.
//   node tools/qa.cjs [--submit]
const { chromium } = require('playwright');
const URL_ = process.env.WD_URL || 'https://staging129.dreamweb.digital/new-design/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL_, { waitUntil: 'networkidle' });
  const links = await p.evaluate(() => [...document.querySelectorAll('#wd-2026 a[href]')].map((a) => a.getAttribute('href')));
  const bad = links.filter((h) => !(h === '#' || /^#[a-z-]+$/.test(h) || h === '/new-design/' || h === 'tel:4043828008'));
  console.log('links:', links.length, 'unique:', [...new Set(links)].join(' '), '| unexpected:', JSON.stringify(bad));
  await p.evaluate(() => window.scrollTo(0, 3000)); await p.waitForTimeout(400);
  console.log('sticky header top at scroll 3000:', await p.evaluate(() => Math.round(document.querySelector('.wd-hdr').getBoundingClientRect().top)));
  await p.evaluate(() => window.scrollTo(0, 0));
  // Tab through the first 40 focusable items and record the focus outline
  const rings = [];
  for (let i = 0; i < 40; i++) {
    await p.keyboard.press('Tab');
    rings.push(await p.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); const inWd = !!e.closest('#wd-2026'); return inWd ? `${(e.innerText || e.getAttribute('aria-label') || e.name || e.tagName).trim().slice(0, 22)}:${cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 ? 'ring' : 'NO-RING'}` : null; }));
  }
  console.log('focus:', rings.filter(Boolean).join(' | '));
  // case-review anchor
  await p.click('.wd-hero-btn a'); await p.waitForTimeout(1200);
  console.log('hero CTA -> form top:', await p.evaluate(() => Math.round(document.querySelector('#case-review').getBoundingClientRect().top)), 'hash', await p.evaluate(() => location.hash));
  await p.close();
  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(URL_, { waitUntil: 'networkidle' });
  const vis = () => m.evaluate(() => getComputedStyle(document.querySelector('.wd-mbar')).display);
  console.log('phone bar display:', await vis());
  await m.focus('.wd-form textarea'); await m.waitForTimeout(200);
  console.log('phone bar while typing:', await vis(), '| counter:', await m.evaluate(() => document.querySelector('.wd-count')?.textContent), 'maxlength', await m.evaluate(() => document.querySelector('.wd-form textarea').maxLength));
  if (process.argv.includes('--submit')) {
    await m.fill('#form-field-name', 'QA Test (Dream Web Digital)');
    await m.fill('#form-field-phone', '404-555-0100');
    await m.click('.wd-form .elementor-field-option:nth-child(2) label');
    console.log('checked:', await m.evaluate(() => document.querySelector('.wd-form input[type=radio]:checked')?.value));
    await m.fill('#form-field-message', 'Automated QA submission from the /new-design/ preview build. Please ignore.');
    console.log('counter after typing:', await m.evaluate(() => document.querySelector('.wd-count').textContent));
    await m.click('.wd-form button[type=submit]');
    await m.waitForSelector('.wd-form .elementor-message', { timeout: 60000 });
    console.log('form result:', await m.evaluate(() => document.querySelector('.wd-form .elementor-message').className + ' :: ' + document.querySelector('.wd-form .elementor-message').textContent));
  }
  await b.close();
})();
