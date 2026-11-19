// Brightside homepage (Phase 1): Elementor element trees for the header template, footer template and
// homepage. Editable content (headings, copy, buttons, images, icons, social links) uses native
// widgets; HTML widgets hold only the stage/global CSS+JS, glint grids, the hero arc badge and
// controls, the marquee, the clip play buttons and the Solidarity Tech embeds (as the handoff specifies).
// Styling lives in assets/bs-site.css (classes below), scoped to #bs-header / #bs-home / #bs-footer.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const id = () => crypto.randomBytes(4).toString('hex').slice(0, 7);
const box0 = { unit: 'px', top: '0', right: '0', bottom: '0', left: '0', isLinked: true };
const gap0 = { unit: 'px', size: 0, column: '0', row: '0', isLinked: true };
const link = (url) => ({ url, is_external: /^https?:/.test(url) ? 'on' : '', nofollow: '' });

const icon = (name) => fs.readFileSync(path.join(__dirname, 'assets/icons', `${name}.svg`), 'utf8')
  .replace('<svg ', '<svg aria-hidden="true" focusable="false" ');

const SOCIAL = [
  { key: 'facebook-f', label: 'Brightside on Facebook', url: 'https://www.facebook.com/brightside.now', color: '' },
  { key: 'instagram', label: 'Brightside on Instagram', url: 'https://www.instagram.com/brightside.now', color: 'orange' },
  { key: 'tiktok', label: 'Brightside on TikTok', url: 'https://www.tiktok.com/@brightside.now', color: 'purple' },
  { key: 'bluesky', label: 'Brightside on Bluesky', url: 'https://bsky.app/profile/brightside.now', color: 'white' },
];
const NAV = [['About', '/#about'], ['Take Action', '/#take-action'], ['Contact', '/#contact']];
const EMBED = 'https://www.brightside.now'; // switch to https://act.brightside.now once that host is live
const PRIVACY = '/privacy-policy/';

/* ------------------------------------------------------------------ element helpers */
function con(cls, elements = [], o = {}) {
  return {
    id: id(), elType: 'container', isInner: o.inner !== false, elements,
    settings: {
      content_width: 'full', flex_direction: o.dir || 'column', padding: box0, flex_gap: gap0,
      css_classes: cls,
      ...(o.id ? { _element_id: o.id } : {}),
      ...(o.tag ? { html_tag: o.tag } : {}),
      ...(o.settings || {}),
    },
  };
}
const widget = (widgetType, settings) => ({ id: id(), elType: 'widget', widgetType, settings, elements: [] });
const heading = (title, tag, cls, o = {}) => widget('heading', { title, header_size: tag, _css_classes: cls || '', ...(o.link ? { link: link(o.link) } : {}) });
const text = (html, cls = '') => widget('text-editor', { editor: /^\s*</.test(html) ? html : `<p>${html}</p>`, _css_classes: cls });
const html = (code, cls = '') => widget('html', { html: code, _css_classes: cls });
const anchor = (name) => widget('menu-anchor', { anchor: name });
const svgIcon = (m) => ({ value: { id: m.id, url: m.url }, library: 'svg' });
function button(label, url, cls, o = {}) {
  return widget('button', {
    text: label, link: link(url), _css_classes: cls,
    ...(o.icon ? { selected_icon: svgIcon(o.icon), icon_align: o.iconAlign || 'left' } : {}),
    ...(o.settings || {}),
  });
}
function image(m, cls, o = {}) {
  return widget('image', {
    image: { id: m.id, url: m.url, alt: '', source: 'library' }, image_size: o.size || 'full', _css_classes: cls,
    ...(o.link ? { link_to: 'custom', link: link(o.link) } : {}),
  });
}
const chip = (m, color) => widget('icon', { selected_icon: svgIcon(m), _css_classes: `bs-chip${color ? ` bs-chip--${color}` : ''}` });

function glints() {
  const p = 'M12 0C12 7.5 16.5 12 24 12C16.5 12 12 16.5 12 24C12 16.5 7.5 12 0 12C7.5 12 12 7.5 12 0Z';
  return Array.from({ length: 16 }, (_, i) => `<span><svg viewBox="0 0 24 24" style="animation-delay:${(((i >> 2) + (i % 4)) * 0.09).toFixed(2)}s"><path d="${p}"/></svg></span>`).join('');
}
const reveal = (i = 0) => ` bs-reveal${i ? ` bs-d${i}` : ''}`;

/* ------------------------------------------------------------------ shared pieces */
function socials(m, cls = '', colored = false) {
  return con(`bs-socials ${cls}`, SOCIAL.map((s) => button(s.label, s.url, `bs-social${colored && s.color ? ` bs-social--${s.color}` : ''}`, {
    icon: m[`bs-icon-${s.key}.svg`], settings: { link: { url: s.url, is_external: 'on', nofollow: '' } },
  })), { dir: 'row' });
}

function joinCard(m, anchorId, campaign, first) {
  const src = `${EMBED}/join/embed?breakout=true&utm_source=website&utm_medium=embed&utm_campaign=${campaign}`;
  return con('bs-join', [
    heading('Join the Brightside', 'h3', 'bs-join__h'),
    text('Sign up here to join us:', 'bs-join__copy'),
    html(`<iframe data-st-embed src="${src}" allow="payment *" title="Join Brightside"${first ? '' : ' loading="lazy"'} style="width:100%;border:none;min-height:520px;"></iframe>${first ? `\n<script src="${EMBED}/embed/v1.js" async></script>` : ''}`, 'bs-join__embed'),
    text(`<p>By joining you agree to our <a href="${PRIVACY}">Privacy Policy</a>. <span>(draft, for client approval)</span></p><p class="bs-sms">[SMS CONSENT WORDING — client to confirm with Solidarity Tech or counsel]</p>`, 'bs-join__legal'),
  ], { id: anchorId });
}

/* ------------------------------------------------------------------ header template */
function header(m) {
  const css = fs.readFileSync(path.join(__dirname, 'assets/bs-site.css'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, 'assets/bs-site.js'), 'utf8');
  const global = `<style id="bs-site-css">${css}</style>
<div class="bs-stage" aria-hidden="true"><div class="bs-stage__glow bs-stage__glow--a"></div><div class="bs-stage__glow bs-stage__glow--b"></div><canvas></canvas></div>
<a class="bs-skip" href="#bs-home">Skip to content</a>
<script id="bs-site-js">${js}</script>`;
  const menuBtn = `<button type="button" class="bs-menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="bs-menu">${icon('bars')}</button>`;
  const menu = `<div id="bs-menu" class="bs-menu" role="dialog" aria-modal="true" aria-label="Menu" hidden>
  <button type="button" class="bs-menu__close" aria-label="Close menu">${icon('xmark')}</button>
  <nav aria-label="Menu">${NAV.map(([t, u]) => `<a href="${u}">${t}</a>`).join('')}</nav>
  <div class="bs-menu__socials">${SOCIAL.map((s) => `<a href="${s.url}" target="_blank" rel="noopener" aria-label="${s.label}"><span>${icon(s.key)}</span></a>`).join('')}</div>
  <div class="bs-menu__foot"><p>Welcome to the clean energy majority.</p><a class="bs-menu__join" href="/#join-hero">Join</a></div>
</div>`;
  // The stage and the menu dialog must not sit inside #bs-header: its backdrop-filter would make
  // the pill their containing block. They live in a zero-height sibling container instead.
  return [con('bs-global-wrap', [html(global + menu, 'bs-global')], { inner: false }), con('', [
    image(m['brightside-logo-primary-yellow.png'], 'bs-logo', { link: '/' }),
    con('bs-nav', NAV.map(([t, u]) => heading(t, 'div', 'bs-nav-link', { link: u })), { dir: 'row', tag: 'nav' }),
    socials(m),
    con('bs-hdr-right', [button('Join', '/#join-hero', 'bs-btn bs-hdr-join'), html(menuBtn, 'bs-menu-html')], { dir: 'row' }),
  ], { id: 'bs-header', dir: 'row', inner: false })];
}

/* ------------------------------------------------------------------ footer template */
function footer(m) {
  const ld = {
    '@context': 'https://schema.org', '@type': 'Organization', name: 'Brightside', url: 'https://brightside.now',
    parentOrganization: { '@type': 'Organization', name: 'Fossil Free Media' }, sameAs: SOCIAL.map((s) => s.url),
  };
  return [con('', [
    anchor('contact'),
    con('bs-foot1', [
      image(m['brightside-logo-centered-gradient-orange-purple.png'], 'bs-foot-logo'),
      con('bs-foot-cta', [
        heading('Welcome to the clean energy majority.', 'p', 'bs-h3'),
        button('Join', '/#join-hero', 'bs-btn'),
      ]),
    ]),
    con('bs-foot2', [
      con('bs-fnav', [...NAV, ['Privacy Policy', PRIVACY]].map(([t, u]) => heading(t, 'div', 'bs-flink', { link: u })), { dir: 'row', tag: 'nav' }),
      socials(m, 'bs-socials--lg', true),
    ], { dir: 'row' }),
    text('<p><span>© 2026 Fossil Free Media</span><span>Brightside is a project of Fossil Free Media <em>(wording to confirm)</em></span></p>', 'bs-foot3'),
    html(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`, 'bs-ld'),
  ], { id: 'bs-footer', inner: false })];
}

/* ------------------------------------------------------------------ homepage */
function home(m) {
  const hero = con('bs-hero', [
    con('bs-hero__screen', [
      image(m['brightside-hero-mural.webp'], 'bs-hero__poster'),
      html(`<div aria-hidden="true">
<div class="bs-hero__scrim"></div>
<span class="bs-standin">Stand-in: mural photo, slow drift · video loop to follow</span>
<div class="bs-glints bs-hero__glints">${glints()}</div>
<div class="bs-arc"><svg viewBox="0 0 200 200"><defs><path id="bs-arc-path" d="M100,100 m-86,0 a86,86 0 1,1 172,0 a86,86 0 1,1 -172,0"/></defs><text><textPath href="#bs-arc-path" textLength="536" lengthAdjust="spacing">WELCOME TO THE CLEAN ENERGY MAJORITY · </textPath></text></svg><img src="${m['brightside-badge-big-smile-orange.png'].url}" alt="" width="108" height="108"></div>
</div>`, 'bs-hero__deco'),
      con('bs-hero__stack', [
        heading('<span class="bs-h1__display">We are the <span class="bs-y">Brightside.</span></span><span class="bs-h1__lead">We fight for clean energy to build a brighter future.</span>', 'h1', 'bs-hero__h1'),
        button('Join Brightside', '#join-hero', 'bs-btn', { settings: { hide_desktop: 'hidden-desktop' } }),
        html(`<div class="bs-hero__controls"><button type="button" class="bs-pause" aria-pressed="false" aria-label="Pause background video"><span class="bs-i-pause">${icon('pause')}</span><span class="bs-i-play">${icon('play')}</span></button><span class="bs-scroll" aria-hidden="true"><span>Scroll</span>${icon('arrow-down')}</span></div>`, 'bs-hero__ctl'),
      ]),
    ], { settings: { min_height: { unit: 'px', size: 0 } } }),
    con('bs-hero__join', [joinCard(m, 'join-hero', 'home-hero', true)]),
  ], { tag: 'section', settings: { _title: 'H1 Hero' } });

  const majority = con(`bs-panel bs-majority${reveal()}`, [
    con('bs-textcol', [
      heading('Despite what you might have read, there is something that can unite Americans: clean energy.', 'h2', 'bs-h2-long'),
      text('<p>An overwhelming majority supports more clean power, right now. Power from the wind and the sun means lower bills, cleaner air, and a brighter future — but the wealthy and well-connected are standing in the way, forcing us to pay more for their polluting energy.</p><p>Brightside is here to change that. Because when everyone realizes that everyone else is thinking the same thing, we\'re not just a majority — we\'re a movement.</p>'),
      heading('The future is bright.', 'p', 'bs-h3 bs-signoff'),
    ]),
    con('bs-sticker', [
      image(m['brightside-photo-5.webp'], 'bs-photo bs-pos-55'),
      image(m['brightside-badge-thumb-black.png'], 'bs-badge bs-badge--r5'),
      html(`<div class="bs-glints" aria-hidden="true">${glints()}</div>`, 'bs-sticker-glints'),
    ]),
  ], { id: 'about', tag: 'section' });

  const mcard = (ic, color, h, p, i) => con(`bs-mcard${reveal(i)}`, [chip(m[`bs-icon-${ic}.svg`], color), heading(h, 'h3', 'bs-h3'), text(p)]);
  const stat = (label, note) => con('bs-stat', [heading('[#]', 'div', 'bs-stat__num'), heading(label, 'div', 'bs-stat__label'), heading(note, 'div', 'bs-stat__note')]);
  const movement = con(`bs-panel bs-movement${reveal()}`, [
    heading('We\'re building a movement', 'h2', 'bs-h2'),
    text('Brightside is the movement for people who love clean energy. We work together online to share stories that inspire action for clean energy, and we come together offline to build community and advocate for change.'),
    con('bs-cards2', [
      mcard('share-nodes', '', 'Online', 'Share stories that inspire action for clean energy', 0),
      mcard('people-group', 'orange', 'Offline', 'Build community and advocate for change', 1),
    ]),
    con('bs-stats', [
      stat('Brightsiders', '[MEMBER COUNT — client to supply]'),
      stat('Cities', '[CITY COUNT — client to supply]'),
      stat('Actions taken', '[ACTION COUNT — client to supply]'),
    ]),
  ], { id: 'movement', tag: 'section' });

  const clip = (n, photo, alt, i) => con(`bs-clip${reveal(i)}`, [
    image(m[photo], `bs-clip__img bs-clip__p${n}`),
    html(`<div class="bs-clip__scrim" aria-hidden="true"></div><button type="button" class="bs-play" aria-label="Play clip: Brightsider 0${n}, [NAME], [CITY]">${icon('play')}</button>`, 'bs-clip__ui'),
    heading(`#0${n} · [NAME] · [CITY]`, 'div', 'bs-clip__cap'),
  ], { tag: 'article' });
  const brightsiders = con('bs-bsr', [
    con('bs-bsr__intro', [
      heading('Meet the Brightsiders', 'p', 'bs-eyebrow'),
      heading('The power of us.', 'h3', 'bs-h3'),
      text('[BRIGHTSIDERS CLIPS — client to supply 9:16 portraits with captions. Supplied event photos shown as stand-ins.]', 'bs-note'),
    ]),
    con('bs-swipe', [
      clip(1, 'brightside-photo-3.webp', '', 0),
      clip(2, 'brightside-photo-2.webp', '', 1),
      clip(3, 'brightside-photo-4.webp', '', 2),
    ], { dir: 'row' }),
  ], { dir: 'row', settings: { _title: 'Meet the Brightsiders' } });

  const phrase = 'LIVE ON THE BRIGHTSIDE · THE POWER OF US · OWN YOUR POWER · ';
  const marquee = html(`<div class="bs-marquee"><div class="bs-marquee__track" aria-hidden="true"><span>${phrase.repeat(4).trim()}</span><span>${phrase.repeat(4).trim()}</span></div><p class="bs-vh">Live on the Brightside. The power of us. Own your power.</p><button type="button" aria-pressed="false" aria-label="Pause marquee"><span class="bs-i-pause">${icon('pause')}</span><span class="bs-i-play">${icon('play')}</span></button></div>`, 'bs-marquee-w');

  const wcard = (ic, color, h, p, i) => con(`bs-wcard${reveal(i)}`, [chip(m[`bs-icon-${ic}.svg`], color), heading(h, 'h3', 'bs-h3'), text(p)]);
  const wwd = con('bs-wwd', [
    heading('What we do', 'h2', `bs-h2${reveal()}`),
    con('bs-wwd__grid', [
      con('bs-wwd__col', [
        wcard('bullhorn', '', 'Tell our stories', 'Beat disinformation to the punch by telling our stories', 0),
        wcard('landmark', 'purple', 'Pass new policies', 'Pass new policies by adding our voices when decisions are made', 2),
      ]),
      con('bs-wwd__col bs-wwd__col--off', [
        wcard('people-group', 'orange', 'Build community', 'Build community for people who love clean energy', 1),
        wcard('hand-fist', 'white', 'Show up', 'Show up to support clean energy when it\'s under attack', 3),
      ]),
    ]),
    button('More about Brightside', '/#about', 'bs-textlink', { icon: m['bs-icon-arrow-right.svg'] || null, iconAlign: 'right' }),
  ], { tag: 'section', settings: { _title: 'What we do' } });

  const action = con(`bs-panel bs-action${reveal()}`, [
    con('bs-action__left', [heading('Take action', 'h2', 'bs-h2'), heading('Don\'t get mad. Get solar.', 'p', 'bs-lead')]),
    con('bs-petition', [
      heading('Featured petition', 'p', 'bs-eyebrow'),
      heading('[Petition title]', 'h3', 'bs-h3'),
      text('[ONE-LINE SUMMARY — client to supply]', 'bs-small'),
      text('[SIGNATURE COUNT] signed', 'bs-count'),
      button('Sign the petition', '#take-action', 'bs-btn bs-btn--dark'),
    ]),
  ], { id: 'take-action', tag: 'section' });

  const join = con(`bs-panel bs-joinpanel${reveal()}`, [
    con('bs-joinpanel__left', [
      heading('Ready to join the Brightside?', 'h2', 'bs-h2'),
      text('Join the movement to save money, end our dependence on dirty energy, and build a brighter future.', 'bs-join-copy'),
      text('Sign up here to join us:', 'bs-join-cta'),
      con('bs-sticker bs-sticker--join', [
        image(m['brightside-photo-1.webp'], 'bs-photo bs-pos-30'),
        image(m['brightside-badge-lightning-black.png'], 'bs-badge bs-badge--l5'),
        html(`<div class="bs-glints" aria-hidden="true">${glints()}</div>`, 'bs-sticker-glints'),
      ]),
    ]),
    joinCard(m, 'join-footer', 'home-footer', false),
  ], { id: 'join', tag: 'section' });

  return [con('', [
    hero,
    con('bs-wrap', [majority, movement, brightsiders, marquee, wwd, action, join]),
  ], { id: 'bs-home', tag: 'main', inner: false })];
}

module.exports = { header, footer, home };
