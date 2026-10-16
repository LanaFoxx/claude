// Home page: homepage-v2 design (office hero, practice areas, results band, my story, our approach,
// litigation banner, testimonials, consultation band).
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { C, px, box, gap, auto, container, widget, band, stack, row, grid, eyebrow, heading, H3, text, button, image, URL } = L;

/* -------------------------------------------------------------- helpers */
// Thin rose rule drawn after (or around) a kicker label, as in the design.
const RULE = (w) => `<span style="display:inline-block;width:${w}px;height:1px;background:${C.rose};vertical-align:middle"></span>`;
const kicker = (t, color = C.sand, o = {}) => eyebrow(`${t}<span style="display:inline-block;width:18px"></span>${RULE(56)}`, color, o.align || 'left', { size: 13, weight: 500, ls: 0.32, alignM: o.alignM, settings: o.settings });
// Centered section label with a rule on each side (an h2, so each section keeps a heading).
const centerLabel = (t) => eyebrow(`${RULE(60)}<span style="display:inline-block;width:22px"></span>${t}<span style="display:inline-block;width:22px"></span>${RULE(60)}`, C.roseDeep, 'center', {
  tag: 'h2', size: 13, weight: 600, ls: 0.34,
  settings: { custom_css: '@media (max-width: 767px) { selector span[style*="height:1px"] { width: 28px !important; } }' },
});
// Line icons from the design (48x48 viewBox, 1.4px rose stroke), inline so they stay crisp at any size.
const svg = (paths, size) => text(
  `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths.map((d) => `<path d="${d}"/>`).join('')}</svg>`,
  { color: C.rose, size: 16, lh: 1, settings: { _element_width: 'auto', custom_css: 'selector svg { display: block; }' } },
);
const ICON = {
  car: ['M8 28l4-10h24l4 10', 'M6 28h36v8H6z', 'M12 36v3M36 36v3', 'M12 32h4M32 32h4'],
  truck: ['M4 14h26v18H4z', 'M30 20h8l6 7v5H30z', 'M10 38a3 3 0 100-6 3 3 0 000 6zM38 38a3 3 0 100-6 3 3 0 000 6z'],
  fall: ['M24 6a18 18 0 110 36 18 18 0 010-36z', 'M24 14v20M14 24h20'],
  dog: ['M24 8v32', 'M10 16h28', 'M10 16l-6 12h12zM38 16l-6 12h12z', 'M16 40h16'],
  trial: ['M14 30l12-12', 'M20 12l8 8', 'M12 20l8 8', 'M8 40h20', 'M30 30l8 8'],
  person: ['M24 22a6 6 0 100-12 6 6 0 000 12z', 'M12 38a12 12 0 0124 0'],
  chat: ['M8 10h32v22H20l-8 8v-8H8z', 'M16 18h16M16 24h10'],
  doc: ['M12 6h24v36H12z', 'M18 14h12M18 20h12M18 26h8', 'M18 34h6'],
};
const twoLine = (a, b, sizes, color = C.white, align = 'left', o = {}) => heading(`${a}<br>${L.accent(b)}`, o.tag || 'h2', sizes, color, align, { lh: o.lh || 1.15, alignM: o.alignM });

/* ------------------------------------------------------------------ hero */
const HERO_SHADE = 'linear-gradient(90deg,rgba(43,29,23,.96) 0%,rgba(43,29,23,.88) 32%,rgba(43,29,23,.45) 58%,rgba(43,29,23,.15) 100%),linear-gradient(180deg,rgba(43,29,23,.25),rgba(43,29,23,0) 30%,rgba(43,29,23,.5) 100%)';
const hero = (m) => container({
  content_width: 'boxed', boxed_width: px(1320), container_type: 'grid',
  grid_columns_grid: { unit: 'custom', size: 'minmax(0,1.05fr) minmax(0,.95fr)' }, grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
  grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto,
  grid_gaps: gap(32, 0), grid_align_items: 'end', min_height: px(680), min_height_tablet: px(0), min_height_mobile: px(0),
  padding: box(0, 40, 0, 40), padding_tablet: box(0, 32, 0, 32), padding_mobile: box(0, 24, 0, 24),
  background_background: 'classic', background_color: C.wood, background_image: m.office,
  background_position: 'initial', background_xpos: px(70, '%'), background_ypos: px(50, '%'), background_size: 'cover', background_repeat: 'no-repeat',
  overflow: 'hidden',
  custom_css: `selector { position: relative; }
selector::before { content: ""; position: absolute; inset: 0; background: ${HERO_SHADE}; pointer-events: none; z-index: 0; }
selector > .e-con-inner { position: relative; z-index: 1; }
@media (max-width: 1024px) { selector::before { background: rgba(43,29,23,.86); } }`,
}, [
  stack([
    kicker('Personal Injury Attorney', C.sand, { alignM: 'center' }),
    heading(`There's Strength in Your Story.<br>${L.accent('And Purpose Behind Ours.')}`, 'h1', [66, 52, 40], C.white, 'left', { lh: 1.08, alignM: 'center', settings: { _margin: box(8, 0, 0, 0) } }),
    text('At Cabrera Torres Law Firm, we represent people who have been injured and whose lives have changed unexpectedly. We fight for your rights with resilience, compassion, and a deep commitment to helping you move forward.', {
      color: C.mist, size: 17, weight: 300, lh: 1.7, maxW: 520, alignM: 'center', settings: { _margin: box(12, 0, 0, 0) },
    }),
    row([
      button('Free Consultation  →', URL.contact, 'gold', { dark: true, size: 14, pad: box(18, 32, 18, 32) }),
      text(`Hablamos Español <span style="color:${C.rose};margin:0 10px">|</span> No fee unless we win`, {
        color: C.sand, size: 13, weight: 500, ls: 0.22, transform: 'uppercase', lh: 1.4, alignM: 'center',
        settings: { _element_width: 'auto', _padding: box(0, 0, 0, 20), _border_border: 'solid', _border_width: box(0, 0, 0, 1), _border_width_mobile: box(0), _padding_mobile: box(0), _border_color: 'rgba(196,160,141,0.5)' },
      }),
    ], { gap: 28, rowGap: 20, settings: { margin: box(26, 0, 0, 0), flex_justify_content_tablet: 'center', flex_justify_content_mobile: 'center' } }),
  ], { gap: 18, align: 'flex-start', settings: { padding: box(96, 0, 96, 0), padding_tablet: box(72, 0, 40, 0), padding_mobile: box(64, 0, 32, 0), flex_align_items_tablet: 'center', flex_align_items_mobile: 'center' } }),
  // Portrait stands on the bottom edge; on tablet/phone it drops below the copy.
  container({
    content_width: 'full', flex_direction: 'column', flex_justify_content: 'flex-end', flex_align_items: 'flex-start', flex_align_items_tablet: 'center', flex_align_items_mobile: 'center',
    padding: box(40, 0, 0, 0), padding_tablet: box(0), padding_mobile: box(0), min_height: px(560), min_height_tablet: px(0), min_height_mobile: px(0),
  }, [
    image(m.heroJen, {
      align: 'left', settings: {
        align_tablet: 'center', align_mobile: 'center',
        custom_css: 'selector img { display: block; width: 100%; max-width: 520px; height: auto; max-height: 700px; object-fit: contain; object-position: bottom; filter: drop-shadow(0 30px 50px rgba(0,0,0,.55)); }\n@media (max-width: 1024px) { selector img { max-width: 360px; } }',
      },
    }),
  ]),
], false);

/* -------------------------------------------------------- practice areas */
const AREAS = [
  { name: 'Car Accidents', desc: 'Representation for people injured in collisions involving cars, trucks, and rideshares.', photo: 'area_mva', icon: 'car', href: `${URL.practice}#mva` },
  { name: 'Truck Accidents', desc: 'We hold trucking companies and their insurers accountable for serious, life-changing injuries.', photo: 'post_car', icon: 'truck', href: `${URL.practice}#mva` },
  { name: 'Slip & Fall', desc: 'Property owners must keep premises safe. We hold them accountable when someone is hurt.', photo: 'area_fall', icon: 'fall', href: `${URL.practice}#fall` },
  { name: 'Dog Bites', desc: 'Georgia law protects dog attack victims. We pursue owners for medical bills, scarring, and trauma.', photo: 'area_dog', icon: 'dog', href: `${URL.practice}#dog` },
];
const DIVIDERS = (color) => `selector { border-left: 1px solid ${color}; }
selector:first-child { border-left: 0; }
@media (max-width: 1024px) { selector:nth-child(odd) { border-left: 0; } }
@media (max-width: 767px) { selector { border-left: 0; } }`;
const practice = (m) => band(C.ivory, [
  centerLabel('Our Practice Areas'),
  grid(AREAS.map((a) => container({
    content_width: 'full', flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(16),
    padding: box(8, 28, 0, 28), padding_mobile: box(0, 4, 0, 4), custom_css: DIVIDERS('rgba(74,54,47,0.15)'),
  }, [
    svg(ICON[a.icon], 64),
    H3(a.name, C.ink, [19, 19, 19], { align: 'center', ls: 0.06, lh: 1.3 }),
    text(a.desc, { color: C.inkMuted, size: 16, lh: 1.65, align: 'center', settings: { _flex_size: 'grow' } }),
    image(m[a.photo], { settings: { _margin: box(8, 0, 0, 0), custom_css: 'selector { width: 100%; }\nselector img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; }' } }),
    button('Learn more  →', a.href, 'underline', { align: 'center' }),
  ])), { cols: [4, 2, 1], gap: 0, rowGap: 56, settings: { margin: box(64, 0, 0, 0), margin_mobile: box(40, 0, 0, 0) } }),
], { pad: [96, 100], width: 1320, anchor: 'practice' });

/* ---------------------------------------------------------- results band */
const RESULTS = [['$4.8M', 'Truck Accident'], ['$2.3M', 'Car Accident'], ['$1.5M', 'Serious Injury'], ['$1.2M', 'Wrongful Death']];
const results = () => band(C.wood, [
  grid([
    grid(RESULTS.map(([amt, type]) => stack([
      heading(amt, 'p', [40, 36, 32], C.white, 'center', { lh: 1 }),
      eyebrow(type, C.sand, 'center', { size: 13, ls: 0.22 }),
    ], { gap: 12, settings: { padding: box(6, 16, 6, 16), padding_mobile: box(6, 8, 18, 8), custom_css: DIVIDERS(C.roseLine) } })), { cols: [4, 2, 2], gap: 0, rowGap: 24 }),
    button('View more results  →', URL.results, 'outlineDark', { align: 'center', pad: box(16, 24, 16, 24), settings: { custom_css: 'selector .elementor-button { white-space: nowrap; }' } }),
  ], { cols: ['minmax(0,1fr) auto', 1, 1], gap: 48, rowGap: 36, align: 'center' }),
], { pad: [56, 56], width: 1320, anchor: 'results' });

/* --------------------------------------------------------------- my story */
const STORY = [
  'Three days after graduating college, I lost my father. In the midst of that unimaginable loss, I still had to find the strength to move forward and prepare for the LSAT.',
  'Years later, during the COVID-19 pandemic, I completed my law school final exams at 40 weeks pregnant and became a mother the very next day.',
  'These experiences shaped the attorney I am today — resilient, compassionate, and determined. I understand what it means for life to change unexpectedly, and I bring that same strength, empathy, and commitment to every client I represent.',
];
const story = (m) => container({
  content_width: 'boxed', boxed_width: px(1320), container_type: 'grid',
  grid_columns_grid: { unit: 'custom', size: 'minmax(0,.9fr) minmax(0,1.1fr)' }, grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
  grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_gaps: gap(0), grid_align_items: 'stretch',
  padding: box(0), background_background: 'classic', background_color: C.light, overflow: 'hidden', _element_id: 'story',
}, [
  container({ content_width: 'full', flex_direction: 'column', flex_justify_content: 'flex-end', flex_align_items: 'center', padding: box(48, 24, 0, 24) }, [
    image(m.storyJen, { settings: { custom_css: 'selector img { display: block; width: auto; max-width: 100%; max-height: 780px; object-fit: contain; object-position: bottom; }\n@media (max-width: 1024px) { selector img { max-width: 420px; width: 100%; height: auto; } }' } }),
  ]),
  stack([
    kicker('My Story', C.roseDeep, { settings: { typography_font_weight: '600' } }),
    twoLine('Resilience Is Personal.', 'So Is My Commitment to&nbsp;You.', [44, 36, 30], C.ink, 'left', { lh: 1.15 }),
    stack([
      ...STORY.map((p) => text(p, { color: C.inkSoft, size: 16, lh: 1.75 })),
      text('Before founding Cabrera Torres Law Firm, Jennifer served as Managing Partner of Gonzalez Torres Law, where she led the Personal Injury Litigation practice.', {
        color: C.inkSoft, size: 15, lh: 1.75,
        settings: { _padding: box(22, 26, 22, 26), _background_background: 'classic', _background_color: C.ivory, _border_border: 'solid', _border_width: box(0, 0, 0, 2), _border_color: C.rose },
      }),
    ], { gap: 18, settings: { margin: box(10, 0, 0, 0) } }),
    button('Read more about my story  →', URL.jennifer, 'gold', { size: 14, settings: { _margin: box(18, 0, 0, 0) } }),
  ], { gap: 16, align: 'flex-start', justify: 'center', settings: { padding: box(88, 40, 88, 64), padding_tablet: box(56, 32, 72, 32), padding_mobile: box(48, 24, 64, 24) } }),
], false);

/* ------------------------------------------------------------ our approach */
const PILLARS = [
  ['Trial Experience', 'A skilled advocate in and out of the courtroom.', 'trial'],
  ['Personal Attention', "You're never just a case. You're a person.", 'person'],
  ['Direct Communication', 'Clear answers. Honest guidance. Always.', 'chat'],
  ['No Fee Unless We Win', 'You pay nothing unless we obtain a recovery for you.', 'doc'],
];
const approach = () => band(C.ivory, [
  grid(PILLARS.map(([t, d, ic]) => container({
    content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', flex_align_items: 'flex-start', flex_gap: gap(16),
    padding: box(0, 0, 0, 24), padding_mobile: box(0), custom_css: DIVIDERS('rgba(74,54,47,0.15)').replace('selector:first-child { border-left: 0; }', 'selector:first-child { border-left: 0; padding-left: 0; }'),
  }, [
    svg(ICON[ic], 56),
    stack([
      heading(t, 'h3', 13, C.ink, 'left', { family: L.FONT, weight: 600, ls: 0.2, lh: 1.4, settings: { typography_text_transform: 'uppercase', custom_css: '@media (min-width: 1200px) { selector .elementor-heading-title { white-space: nowrap; } }' } }),
      text(d, { color: C.inkMuted, size: 15, lh: 1.6 }),
    ], { gap: 6 }),
  ])), { cols: [4, 2, 1], gap: 32, rowGap: 32 }),
], { pad: [56, 56], width: 1320, anchor: 'approach', settings: { border_border: 'solid', border_width: box(1, 0, 1, 0), border_color: C.hair } });

/* ------------------------------------------------------------- litigation */
const LIT = [
  ['Investigation', 'Evidence preserved early, experts retained when the case calls for it.'],
  ['Negotiation', 'Demands built on documented damages, not guesswork.'],
  ['Trial', 'When insurers refuse to be fair, we are ready to present your case to a jury.'],
];
const litigation = (m) => container({
  content_width: 'full', flex_direction: 'row', flex_justify_content: 'flex-end', flex_align_items: 'center',
  min_height: px(560), padding: box(64, 0, 64, 0), padding_tablet: box(96, 32, 96, 32), padding_mobile: box(80, 24, 80, 24),
  background_background: 'classic', background_color: C.lit, background_image: m.litJen,
  background_position: 'center left', background_size: 'cover', background_repeat: 'no-repeat',
  background_overlay_background: 'classic', background_overlay_color: C.lit, background_overlay_opacity: px(0), background_overlay_opacity_tablet: px(0.72), background_overlay_opacity_mobile: px(0.72),
  css_classes: 'e-no-lazyload', // Elementor's lazy background loading left this banner black
  custom_css: 'selector { aspect-ratio: 3 / 1; }\n@media (max-width: 1024px) { selector { aspect-ratio: auto; background-position: 20% 50% !important; } }',
}, [
  container({ content_width: 'full', flex_direction: 'column', padding: box(0, 0, 0, 0), width: px(50, '%'), width_tablet: px(100, '%'), width_mobile: px(100, '%'), z_index: 1 }, [
    stack([
      kicker('Litigation Experience', C.sand),
      twoLine('Prepared for Trial.', 'From the First Call.', [44, 36, 30], C.white, 'left'),
      text("Insurance companies know which firms are willing to go to court. We prepare every case as if it will be tried, so when it's time to negotiate, you negotiate from a position of strength.", { color: C.mist, size: 16, weight: 300, lh: 1.75 }),
      grid(LIT.map(([t, d]) => stack([
        eyebrow(t, C.rose, 'left', { size: 13, weight: 600, ls: 0.2 }),
        text(d, { color: C.mist, size: 15, weight: 300, lh: 1.6 }),
      ], { gap: 8, settings: { padding: box(16, 0, 0, 0), border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.rose } })), { cols: [3, 3, 1], gap: 24, settings: { margin: box(22, 0, 0, 0) } }),
    ], { gap: 18, maxW: 560 }),
  ]),
], false);

/* ----------------------------------------------------------- testimonials */
const QUOTES = [
  'Jennifer and her team were incredible. They not only fought for me, but they genuinely cared about me and my family throughout the entire process.',
  'She is compassionate, responsive, and truly goes above and beyond. I always felt heard, supported, and confident knowing they had my back.',
  "Professional, knowledgeable, and relentless in the pursuit of justice. I'm so grateful for everything they did for me.",
];
const testimonials = () => band(C.ivory, [
  centerLabel('What Our Clients Say'),
  grid(QUOTES.map((q) => container({
    content_width: 'full', flex_direction: 'column', flex_gap: gap(20), padding: box(40, 36, 40, 36), padding_mobile: box(32, 26, 32, 26),
    background_background: 'classic', background_color: C.light, border_border: 'solid', border_width: box(1), border_color: 'rgba(74,54,47,0.1)',
  }, [
    text('★★★★★', { color: C.rose, size: 26, ls: 0.12, lh: 1 }),
    text(q, { color: C.ink, size: 21, lh: 1.5, style: 'italic', weight: 400, family: L.QFONT, settings: { _flex_size: 'grow' } }),
    text(`${'<span style="display:inline-block;width:28px;height:1px;background:' + C.rose + ';vertical-align:middle;margin-right:14px"></span>'}Actual Client`, { color: C.roseDeep, size: 13, weight: 600, ls: 0.2, transform: 'uppercase', lh: 1.4 }),
  ])), { cols: [3, 1, 1], gap: 28, settings: { margin: box(56, 0, 0, 0), margin_mobile: box(40, 0, 0, 0) } }),
], { pad: [96, 100], width: 1320, anchor: 'testimonials' });

module.exports = {
  slug: 'home', title: 'Home',
  seo: {
    title: 'Personal Injury Lawyer Norcross, GA | Cabrera Torres Law Firm',
    description: 'Injured in Norcross or Gwinnett County? Attorney Jennifer Cabrera-Torres handles car, truck, dog bite and slip and fall cases. Free consultation.',
    focus: 'personal injury lawyer Norcross GA',
  },
  build: (m) => [hero(m), practice(m), results(), story(m), approach(), litigation(m), testimonials(), P.ctaBand()],
};
