const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
  await p.goto('https://staging129.dreamweb.digital/wp-login.php', { waitUntil: 'domcontentloaded' });
  await p.fill('#user_login', process.env.WPU); await p.fill('#user_pass', process.env.WPP);
  await Promise.all([p.waitForNavigation({ timeout: 90000 }).catch(()=>{}), p.click('#wp-submit')]);
  await p.waitForTimeout(3000);
  console.log(p.url(), await p.title());
  await ctx.storageState({ path: 'state.json' }); await b.close();
})();
