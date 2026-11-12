const { chromium } = require('playwright');
const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ storageState: 'state.json', acceptDownloads: true }); const p = await ctx.newPage();
  await p.goto('https://staging129.dreamweb.digital/wp-admin/export.php', { waitUntil: 'domcontentloaded' });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 300000 }), p.click('#submit')]);
  await dl.saveAs(process.argv[2]);
  console.log(fs.statSync(process.argv[2]).size);
  await ctx.storageState({ path: 'state.json' });
  await b.close();
})();
