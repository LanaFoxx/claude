import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
for (const [w, n] of [[800, 'd'], [390, 'm']]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto('file:///home/user/claude/taxcoursefinder-migration/email/provider-verification-email.html', { waitUntil: 'networkidle' });
  await p.screenshot({ path: `/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad/shots/email-${n}.png`, fullPage: true });
}
await b.close(); console.log('ok');
