import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const [S, url, submit] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, t] of [[1440, 'd'], [390, 'm']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 500, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  const info = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h1: document.querySelector('.tcf-root h1')?.textContent.trim(),
    hdr: !!document.querySelector('.tcf-header') && getComputedStyle(document.querySelector('.tcf-header')).display, inputs: document.querySelectorAll('.tcf-root input,.tcf-root select,.tcf-root textarea').length, school: document.querySelector('[name=school_name]')?.value }));
  console.log(t, JSON.stringify(info));
  await p.screenshot({ path: `${S}/shots/profile-${t}.png`, fullPage: false });
  if (t === 'd' && submit) {
    await p.fill('[name=school_name]', 'TEST Claude QA School');
    await p.fill('[name=ctec_number]', 'TEST-0000');
    await p.selectOption('[name=approved_types]', 'both');
    await p.fill('[name=contact_name]', 'QA Tester');
    await p.fill('[name=contact_email]', 'qa@example.com');
    await p.fill('[name=about]', 'Test submission from automated QA. Safe to delete.');
    await p.check('[name=offered]');
    await p.fill('[name=price]', '$69.95');
    await p.selectOption('[name=pace]', 'self_paced');
    await p.click('button:has-text("Video lessons")');
    await p.selectOption('[name=reporting_time]', '24h');
    await p.click('button:has-text("60-Hour QE Course")');
    console.log('qe tab offered unchecked:', !(await p.isChecked('[name=offered]')));
    await p.click('button:has-text("20-Hour CE Course")');
    console.log('ce kept:', await p.inputValue('[name=price]'), await p.inputValue('[name=pace]'));
    await p.selectOption('[name=chat]', 'staffed');
    await p.selectOption('[name=tz]', 'PT');
    await p.fill('[name=faqs]', 'Is this a test?\nYes, delete it.\n\nSecond question?\nSecond answer.');
    await p.setInputFiles('[name=logo]', S + '/pf/shot.png');
    await p.fill('[name=sample_url]', 'https://example.com/sample');
    console.log('logo kept after rerender:', await p.evaluate(() => document.querySelector('[name=logo]').files.length));
    await p.check('[name=confirm]');
    await p.waitForTimeout(5500);
    await p.click('button[type=submit]');
    await p.waitForFunction(() => /Thanks\.|role="alert"/.test(document.querySelector(".tcf-root").innerHTML), null, { timeout: 45000 }).catch(() => {});
    console.log('result:', await p.evaluate(() => document.querySelector('.tcf-root').innerText.match(/Thanks\. Your details are in review\.|role|Something.*|Please.*|Too many.*/)?.[0]), await p.evaluate(() => localStorage.getItem('tcf_profile_form')));
    await p.screenshot({ path: `${S}/shots/profile-done.png` });
  }
  await ctx.close();
}
await b.close();
