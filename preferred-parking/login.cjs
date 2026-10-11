const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({});
  const ctx = await b.newContext(); const p = await ctx.newPage();
  await p.goto('https://public.preferredparking.com/wp-admin', {waitUntil:'networkidle'});
  await p.fill('#user_login', process.env.WPU); await p.fill('#user_pass', process.env.WPP);
  await Promise.all([p.waitForNavigation({timeout:60000}), p.click('#wp-submit')]);
  console.log(p.url(), await p.title());
  await ctx.storageState({ path: process.env.STATE });
  await b.close();
})();
