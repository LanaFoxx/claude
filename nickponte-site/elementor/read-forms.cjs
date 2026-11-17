// Read-only: the email/actions settings of Nick's existing Elementor forms, so the rebuilt forms send to the same place.
const { chromium } = require('playwright');
const fs = require('fs');
const SITE = 'https://nickponterealty.com';
const IDS = { valuation: 5644, offmarket: 295, contact: 31, buyerGuide: 5725, sellerGuide: 5742 };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  for (let a = 0; a < 5; a++) {
    await p.goto(`${SITE}/wp-login.php`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {}); await p.waitForTimeout(2500);
    try { await p.fill('#user_login', process.env.WPU, { timeout: 20000 }); await p.fill('#user_pass', process.env.WPP); await Promise.all([p.waitForNavigation({ timeout: 60000 }).catch(() => {}), p.click('#wp-submit')]); } catch (e) { continue; }
    await p.goto(`${SITE}/wp-admin/`, { waitUntil: 'domcontentloaded' }); if (await p.$('#adminmenu')) break;
  }
  const out = {};
  for (const [k, id] of Object.entries(IDS)) {
    await p.goto(`${SITE}/wp-admin/post.php?post=${id}&action=elementor`, { waitUntil: 'load', timeout: 180000 }).catch(() => {});
    await p.waitForFunction(() => window.elementor && elementor.documents?.getCurrent?.()?.container, null, { timeout: 120000 }).catch(() => {});
    out[k] = await p.evaluate(() => {
      const forms = [];
      const walk = (els) => els.forEach((e) => { if (e.widgetType === 'form') forms.push(e.settings); if (e.elements) walk(e.elements); });
      walk(elementor.documents.getCurrent().config.elements);
      const keep = /^(form_name|form_fields|submit_actions|email_|webhooks|mailchimp|activecampaign|redirect|success_message|error_message|required_field_message|invalid_message|form_id|custom_messages|button_text|_id)/;
      return forms.map((s) => Object.fromEntries(Object.entries(s).filter(([key]) => keep.test(key))));
    }).catch((e) => 'ERR ' + e.message);
    console.log(k, id, JSON.stringify(out[k]).slice(0, 600));
  }
  fs.writeFileSync(__dirname + '/forms-live.json', JSON.stringify(out, null, 1));
  await b.close();
})();
