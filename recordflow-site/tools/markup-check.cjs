// Lists client comment threads from a Markup.io project (guest invite link), all view modes.
// Usage: node markup-check.cjs <invite-url> [seen.json]
// Prints JSON: { total, threads: [...], new: [...] }. With seen.json, "new" = threads not seen before.
const { chromium } = require('playwright');
const fs = require('fs');

const [invite, seenFile] = process.argv.slice(2);
if (!invite) { console.error('usage: node markup-check.cjs <invite-url> [seen.json]'); process.exit(2); }

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const byId = new Map();
  p.on('response', async (r) => {
    if (!/\/project\/[^/]+\/thread\?/.test(r.url())) return;
    try {
      const mode = new URL(r.url()).searchParams.get('viewMode');
      const resolved = new URL(r.url()).searchParams.get('resolved') === '1';
      for (const t of (await r.json()).data?.threads || []) byId.set(t.id, { ...t, _viewMode: mode, _resolved: resolved });
    } catch { /* ignore */ }
  });
  await p.goto(invite, { waitUntil: 'networkidle', timeout: 120000 });
  await p.waitForTimeout(12000);
  await b.close();

  const simplify = (t) => ({
    id: t.id, viewMode: t._viewMode, resolved: t._resolved,
    page: t.pageUrl || t.page?.url || t.url || null,
    created: t.createdAt || t.created_at || null,
    comments: (t.comments || t.messages || []).map((c) => ({
      author: c.user?.name || c.author?.name || c.guestName || c.user?.email || null,
      text: c.content || c.text || c.body || c.message || null,
      created: c.createdAt || c.created_at || null,
    })),
    raw: (t.comments || t.messages) ? undefined : t,
  });
  const threads = [...byId.values()].map(simplify);
  let seen = [];
  if (seenFile && fs.existsSync(seenFile)) seen = JSON.parse(fs.readFileSync(seenFile, 'utf8'));
  const sig = (t) => `${t.id}:${t.comments.length}:${t.resolved}`;
  const fresh = threads.filter((t) => !seen.includes(sig(t)));
  if (seenFile) fs.writeFileSync(seenFile, JSON.stringify(threads.map(sig)));
  console.log(JSON.stringify({ total: threads.length, open: threads.filter((t) => !t.resolved).length, threads, new: fresh }, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
