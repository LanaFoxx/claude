const { chromium } = require('playwright'); const OPS = require('./content.cjs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ storageState: 'state.json', viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  p.setDefaultTimeout(180000); p.on('dialog', (d) => d.accept());
  for (const docId of process.argv.slice(2)) {
    await p.goto(`https://eazyerrands.com/wp-admin/post.php?post=${docId}&action=elementor`, { waitUntil: 'load', timeout: 180000 });
    await p.waitForFunction(() => window.elementor && window.$e && elementor.documents?.getCurrent?.()?.container);
    await p.waitForTimeout(3000);
    const log = await p.evaluate(async (ops) => {
      const doc = elementor.documents.getCurrent(); const out = [];
      const get = (id) => { const c = elementor.getContainer(id); if (!c) throw new Error('missing ' + id); return c; };
      for (const op of ops) {
        if (op.set) { $e.run('document/elements/settings', { container: get(op.set), settings: op.s, options: { external: true } }); out.push('set ' + op.set); }
        else if (op.item) {
          const [wid, name, i, s] = op.item; const rc = get(wid).repeaters[name].children[i];
          $e.run('document/elements/settings', { container: rc, settings: s, options: { external: true } }); out.push('item ' + wid + '#' + i + ' -> ' + rc.settings.get('item_title'));
        } else if (op.create !== undefined) {
          const parent = op.create ? get(op.create) : doc.container;
          $e.run('document/elements/create', { container: parent, model: op.model, options: { at: op.at, edit: false } }); out.push('create in ' + (op.create || 'root') + ' @' + op.at);
        } else if (op.addItem) {
          const acc = get(op.addItem); const before = acc.children.length;
          const sibling = acc.children[0].children[0]; // existing answer text-editor, reuse its styling
          const s = { ...sibling.settings.toJSON({ remove: 'default' }) }; delete s.editor;
          $e.run('document/repeater/insert', { container: acc, name: 'items', model: { item_title: op.title }, options: { at: op.at } });
          const titles = acc.settings.get('items').map((x) => x.get('item_title'));
          if (acc.children.length !== before + 1 || titles[op.at] !== op.title) throw new Error('addItem failed ' + JSON.stringify({ before, after: acc.children.length, titles }));
          const slot = acc.children[op.at];
          $e.run('document/elements/create', { container: slot, model: { elType: 'widget', widgetType: 'text-editor', settings: { ...s, editor: op.answer } }, options: { edit: false } });
          out.push('addItem ' + op.addItem + ' @' + op.at + ' children=' + acc.children.length + ' slotKids=' + slot.children.length);
        }
      }
      await $e.run('document/save/publish');
      return out;
    }, OPS[docId]);
    console.log(docId, log.join('\n  '));
  }
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
