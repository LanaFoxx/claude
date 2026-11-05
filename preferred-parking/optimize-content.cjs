// PageSpeed content pass for public.preferredparking.com, run through the Elementor editor so
// Elementor validates the data and regenerates CSS. Saves each document's elements to BACKUP_DIR
// before touching it.
//   STATE=... MEDIA=media.json BACKUP_DIR=... node optimize-content.cjs [docId ...]
// What it does:
//  * Replaces Skyboot icon-font icons (icofont / mdi / oi) with Elementor's Font Awesome icons
//    (rendered as inline SVG), so the Skyboot plugin and its ~900 KB of icon fonts can be removed.
//    The numbered steps on Parking App keep their numbers via a CSS counter in Bebas Neue.
//  * Home: no entrance animation on the hero (it delayed LCP by ~11 s), 720p hero video,
//    poster image instead of the video on phones, WebP phone image.
//  * Home/About: partner-logo carousels use the 300px image size instead of full size.
const { chromium } = require('playwright'); const fs = require('fs');
const SITE = 'https://public.preferredparking.com';
const media = JSON.parse(fs.readFileSync(process.env.MEDIA, 'utf8'));
const DOCS = [60, 1157, 27, 55, 1057, 1129, 1354, 1742, 1838, 1873, 1881, 1915, 2039, 2598, 2678, 2841, 2852];

const ICONS = {
  'icofont-arrow-right': { value: 'fas fa-arrow-right', library: 'fa-solid' },
  'icofont-close-line': { value: 'fas fa-times', library: 'fa-solid' },
  'icofont-envelope': { value: 'far fa-envelope', library: 'fa-regular' },
  'mdi-phone-outline': { value: 'fas fa-phone-alt', library: 'fa-solid' },
  'mdi-marker-check': { value: 'fas fa-map-marker-alt', library: 'fa-solid' },
  'oi-map-marker': { value: 'fas fa-map-marker-alt', library: 'fa-solid' },
  'mdi-numeric-1': { value: 'fas fa-circle', library: 'fa-solid' },
  'mdi-numeric-2': { value: 'fas fa-circle', library: 'fa-solid' },
  'mdi-numeric-3': { value: 'fas fa-circle', library: 'fa-solid' },
  'mdi-numeric-4': { value: 'fas fa-circle', library: 'fa-solid' },
};
const STEP_CSS = `selector { counter-reset: pp-step; }
selector .elementor-icon-list-item { counter-increment: pp-step; }
selector .elementor-icon-list-icon svg { display: none; }
selector .elementor-icon-list-icon::before { content: counter(pp-step); font-family: "Bebas Neue", sans-serif; font-size: 40px; line-height: 1; color: #B91A1B; display: inline-block; min-width: 50px; text-align: center; }`;

const HOME = {
  heroId: '44e5df5',
  video: media['preferred-parking-hero-720p.mp4'],
  poster: media['preferred-parking-hero-poster.webp'],
  phone: media['preferred-parking-app-phone.webp'],
};
const CAROUSELS = ['fb6e1ea', '0b63d9f'];

async function run(p, docId) {
  await p.goto(`${SITE}/wp-admin/post.php?post=${docId}&action=elementor`, { waitUntil: 'load', timeout: 180000 });
  await p.waitForFunction(() => window.elementor && window.$e && elementor.documents?.getCurrent?.()?.container, null, { timeout: 180000 });
  await p.waitForTimeout(2500);
  const before = await p.evaluate(() => elementor.documents.getCurrent().config.elements);
  fs.writeFileSync(`${process.env.BACKUP_DIR}/elementor-${docId}.json`, JSON.stringify(before));
  return p.evaluate(async ([ICONS, STEP_CSS, HOME, CAROUSELS]) => {
    const log = [];
    const doc = elementor.documents.getCurrent();
    const iconFor = (v) => {
      if (!v || typeof v !== 'object' || typeof v.value !== 'string' || !/^(icofont|mdi|oi)\b/.test(v.value)) return null;
      const key = Object.keys(ICONS).find((k) => v.value.split(' ').includes(k));
      if (!key) throw new Error('unmapped icon ' + v.value);
      return { key, icon: ICONS[key] };
    };
    const set = (c, settings) => $e.run('document/elements/settings', { container: c, settings, options: { external: true } });
    const walk = (c, inHero, inCarousel) => {
      const id = c.model.get('id');
      const s = c.settings;
      if (s && c.model.get('elType') !== 'document') {
        const changes = {}; let numeric = false;
        for (const [k, v] of Object.entries(s.attributes)) {
          const hit = iconFor(v);
          if (hit) { changes[k] = hit.icon; log.push(`${id}.${k}: ${v.value} -> ${hit.icon.value}`); }
          if (v && v.models) { // repeater (icon list items etc.)
            v.models.forEach((m, i) => Object.entries(m.attributes).forEach(([rk, rv]) => {
              const h = iconFor(rv);
              if (!h) return;
              if (h.key.startsWith('mdi-numeric')) numeric = true;
              m.set(rk, h.icon); log.push(`${id}.${k}[${i}].${rk}: ${rv.value} -> ${h.icon.value}`);
            }));
          }
        }
        if (numeric) { changes.custom_css = STEP_CSS; log.push(`${id}: step-number CSS`); }
        if (inHero) {
          if (s.get('animation') && s.get('animation') !== 'none') { changes.animation = 'none'; log.push(`${id}: hero animation ${s.get('animation')} -> none`); }
          if (s.get('_animation') && s.get('_animation') !== 'none') { changes._animation = 'none'; log.push(`${id}: hero _animation ${s.get('_animation')} -> none`); }
        }
        if (HOME && id === HOME.heroId) {
          Object.assign(changes, {
            background_video_link: HOME.video.url,
            background_play_on_mobile: '',
            background_video_fallback: { url: HOME.poster.url, id: HOME.poster.id, alt: '', source: 'library', size: '' },
          });
          log.push(`${id}: hero video -> 720p, poster on mobile`);
        }
        const img = s.get('image');
        if (HOME && img && /Phone-copy-1/.test(img.url || '')) {
          changes.image = { url: HOME.phone.url, id: HOME.phone.id, alt: img.alt || '', source: 'library', size: '' };
          log.push(`${id}: phone png -> webp`);
        }
        if (inCarousel && c.model.get('widgetType') === 'image' && s.get('image_size') !== 'medium') {
          changes.image_size = 'medium'; log.push(`${id}: logo image_size -> medium`);
        }
        if (Object.keys(changes).length) set(c, changes);
      }
      (c.children || []).forEach((ch) => walk(ch, inHero || (HOME && id === HOME.heroId), inCarousel || CAROUSELS.includes(id)));
    };
    walk(doc.container, false, false);
    if (!log.length) return ['no changes'];
    $e.internal('document/save/set-is-modified', { status: true });
    await $e.run('document/save/publish');
    return log;
  }, [ICONS, STEP_CSS, docId === 55 ? HOME : null, CAROUSELS]);
}

(async () => {
  const ids = process.argv.slice(2).map(Number);
  const b = await chromium.launch();
  const ctx = await b.newContext({ storageState: process.env.STATE, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  for (const id of ids.length ? ids : DOCS) {
    try { console.log(id, JSON.stringify(await run(p, id), null, 1)); } catch (e) { console.log(id, 'ERROR', e.message.split('\n')[0]); }
  }
  await b.close();
})();
