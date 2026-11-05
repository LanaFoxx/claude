import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1.75 });
const p = await ctx.newPage(); const c = await ctx.newCDPSession(p);
await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await c.send('Profiler.enable'); await c.send('Profiler.setSamplingInterval', { interval: 200 }); await c.send('Profiler.start');
await p.goto(process.argv[2], { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
const { profile } = await c.send('Profiler.stop');
// self time per function
const self = {}; const dt = profile.timeDeltas; const idx = {}; profile.nodes.forEach(n => idx[n.id] = n);
const cnt = {}; profile.samples.forEach((s, i) => cnt[s] = (cnt[s] || 0) + (dt[i] || 0));
// total time incl children
const parent = {}; profile.nodes.forEach(n => (n.children || []).forEach(ch => parent[ch] = n.id));
const tot = {};
for (const [id, t] of Object.entries(cnt)) { let cur = +id; const seen = new Set(); while (cur) { const n = idx[cur]; const k = n.callFrame.functionName + ' @' + n.callFrame.url.slice(-30) + ':' + n.callFrame.lineNumber; if (!seen.has(k)) { tot[k] = (tot[k] || 0) + t; seen.add(k); } cur = parent[cur]; } 
  const n = idx[id]; const k = n.callFrame.functionName + ' @' + n.callFrame.url.slice(-30) + ':' + n.callFrame.lineNumber; self[k] = (self[k] || 0) + t; }
const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 22).map(([k, v]) => (v / 1000).toFixed(0).padStart(6) + 'ms ' + k).join('\n');
console.log('TOTAL\n' + top(tot)); console.log('SELF\n' + top(self));
await b.close();
