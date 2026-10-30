// Home page: Espresso v3 handoff (dark hero, practice areas, results band, story, approach pillars,
// litigation banner, testimonials, consultation band). Where the handoff conflicts with Jen's Markup notes,
// her notes win: her untouched hero photo, her real case results, her desk photo and her own story text.
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const { C, px, box, gap, auto, container, band, stack, row, grid, eyebrow, heading, H3, text, button, image, URL } = L;

/* -------------------------------------------------------------- helpers */
const RULE = (w) => `<span style="display:inline-block;width:${w}px;height:1px;background:${C.rose};vertical-align:middle"></span>`;
const SP = (w) => `<span style="display:inline-block;width:${w}px"></span>`;
// "[text] ——" (left sections) and "—— [text] ——" (centered sections).
const kicker = (t, color = C.ivory, o = {}) => eyebrow(`${t}${SP(18)}${RULE(56)}`, color, o.align || 'left', { size: 13, weight: o.weight || 500, ls: 0.32, alignM: o.alignM, settings: o.settings });
const centerLabel = (t, color = C.espMid, tag = 'p') => eyebrow(`${RULE(60)}${SP(22)}${t}${SP(22)}${RULE(60)}`, color, 'center', {
  tag, size: 13, weight: 600, ls: 0.34,
  settings: { custom_css: '@media (max-width: 560px) { selector span[style*="height:1px"] { width: 24px !important; } }' },
});
// Line icons from the handoff (48x48 viewBox, 1.5px stroke, currentColor).
const svg = (paths, size, color = C.wood) => text(
  `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths.map((d) => `<path d="${d}"/>`).join('')}</svg>`,
  { color, size: 16, lh: 1, settings: { _element_width: 'auto', custom_css: 'selector svg { display: block; }' } },
);
const ICON = {
  car: ['M6 30v-5l5-9h26l5 9v5', 'M6 30h36v5H6z', 'M11 24h26', 'M14 39a3 3 0 100-6 3 3 0 000 6z', 'M34 39a3 3 0 100-6 3 3 0 000 6z', 'M17 35h14'],
  truck: ['M4 13h26v19H4z', 'M30 19h8l6 7v6H30z', 'M34 19v7h10', 'M11 38a3 3 0 100-6 3 3 0 000 6z', 'M37 38a3 3 0 100-6 3 3 0 000 6z', 'M14 32h20'],
  fall: ['M31 11a3 3 0 100-6 3 3 0 000 6z', 'M27 15l-6 7 6 5-3 11', 'M21 22l-9 2', 'M27 27l10 5', 'M24 38l-7 4', 'M6 42h36', 'M10 38c3-2 6-2 10 0'],
  dog: ['M24 42c-6 0-11-4-11-9 0-4 3-6 6-9 2-2 3-5 5-5s3 3 5 5c3 3 6 5 6 9 0 5-5 9-11 9z', 'M12 20a3 3.5 0 100-7 3 3.5 0 000 7z', 'M20 13a3 3.5 0 100-7 3 3.5 0 000 7z', 'M28 13a3 3.5 0 100-7 3 3.5 0 000 7z', 'M36 20a3 3.5 0 100-7 3 3.5 0 000 7z'],
  integrity: ['M24 6v36', 'M10 14h28', 'M10 14l-6 12h12z', 'M38 14l-6 12h12z', 'M16 42h16'],
  commitment: ['M24 42s-16-9-16-21a8 8 0 0116-4 8 8 0 0116 4c0 12-16 21-16 21z'],
  results: ['M8 40h32', 'M12 34V22', 'M22 34V14', 'M32 34V26', 'M8 8l10 8 8-6 14 8'],
  client: ['M24 22a6 6 0 100-12 6 6 0 000 12z', 'M12 40a12 12 0 0124 0', 'M38 18a4 4 0 100-8 4 4 0 000 8z', 'M10 18a4 4 0 100-8 4 4 0 000 8z'],
};
// Columns divided by 1px hairlines (none on the first; reset when the grid wraps to 2 or 1 columns).
const DIVIDERS = (color) => `selector { border-left: 1px solid ${color}; }
selector:first-child { border-left: 0; }
@media (max-width: 1024px) { selector:nth-child(odd) { border-left: 0; } }
@media (max-width: 767px) { selector { border-left: 0; } }`;

/* ------------------------------------------------------------------ hero */
const HERO_SCRIM = 'linear-gradient(90deg,rgba(28,19,16,.97) 0%,rgba(28,19,16,.9) 34%,rgba(28,19,16,.55) 60%,rgba(28,19,16,.3) 100%),linear-gradient(180deg,rgba(28,19,16,.35),rgba(28,19,16,0) 30%,rgba(28,19,16,.55) 100%)';
const hero = (m) => container({
  content_width: 'boxed', boxed_width: px(1320), container_type: 'grid',
  grid_columns_grid: { unit: 'custom', size: 'minmax(0,1.05fr) minmax(0,.95fr)' }, grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
  grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto,
  grid_gaps: gap(32, 0), grid_align_items: 'end', min_height: px(700), min_height_tablet: px(0), min_height_mobile: px(0),
  padding: box(0, 40, 0, 40), padding_tablet: box(0, 32, 0, 32), padding_mobile: box(0, 24, 0, 24),
  background_background: 'classic', background_color: C.heroBlack, background_image: m.office,
  background_position: 'initial', background_xpos: px(72, '%'), background_ypos: px(50, '%'), background_size: 'cover', background_repeat: 'no-repeat',
  overflow: 'hidden',
  custom_css: `selector { position: relative; }
selector::before { content: ""; position: absolute; inset: 0; background: ${HERO_SCRIM}; pointer-events: none; z-index: 0; }
selector > .e-con-inner { position: relative; z-index: 1; }
@media (max-width: 1024px) { selector::before { background: rgba(28,19,16,.88); } }`,
}, [
  stack([
    heading("There's Strength in Your Story.<br>And Purpose Behind Ours.", 'h1', [64, 52, 42], C.ivory, 'left', { lh: 1.06, alignM: 'center', settings: { align_tablet: 'center' } }),
    text('At Cabrera Torres Law Firm, we represent people who have been injured and whose lives have changed unexpectedly. We fight for your rights with resilience, compassion, and a deep commitment to helping you move forward.', {
      color: C.ivory, size: 18, lh: 1.7, maxW: 540, alignM: 'center', settings: { align_tablet: 'center', _margin: box(12, 0, 0, 0) },
    }),
    row([
      button('Free Consultation  →', URL.contact, 'gold'),
      text(`Hablamos Español <span style="color:${C.rose};margin:0 10px">|</span> No fee unless we win`, {
        color: C.ivory, size: 13, weight: 500, ls: 0.22, transform: 'uppercase', lh: 1.4, alignM: 'center',
        settings: { _element_width: 'auto', _padding: box(0, 0, 0, 20), _border_border: 'solid', _border_width: box(0, 0, 0, 1), _border_width_mobile: box(0), _padding_mobile: box(0), _border_color: 'rgba(196,160,141,0.6)' },
      }),
    ], { gap: 28, rowGap: 20, settings: { margin: box(28, 0, 0, 0), flex_justify_content_tablet: 'center', flex_justify_content_mobile: 'center' } }),
  ], { gap: 18, align: 'flex-start', settings: { padding: box(100, 0, 100, 0), padding_tablet: box(80, 0, 40, 0), padding_mobile: box(64, 0, 32, 0), flex_align_items_tablet: 'center', flex_align_items_mobile: 'center' } }),
  container({
    content_width: 'full', flex_direction: 'column', flex_justify_content: 'flex-end', flex_align_items: 'flex-start', flex_align_items_tablet: 'center', flex_align_items_mobile: 'center',
    padding: box(40, 0, 0, 0), padding_tablet: box(0), padding_mobile: box(0), min_height: px(600), min_height_tablet: px(0), min_height_mobile: px(0),
  }, [
    // Jen (Markup): her original hand-to-chin cream-dress photo (the handoff's retouched hero-jen was "too AI").
    image(m.heroJenReal, {
      align: 'left', settings: {
        align_tablet: 'center', align_mobile: 'center',
        custom_css: 'selector img { display: block; width: auto; max-width: 100%; height: 620px; max-height: 620px; object-fit: contain; object-position: bottom; filter: drop-shadow(0 30px 50px rgba(0,0,0,.55)); }\n@media (max-width: 1024px) { selector img { height: auto; max-height: none; max-width: 300px; width: 100%; } }',
      },
    }),
  ]),
], false);

/* -------------------------------------------------------- practice areas */
const AREAS = [
  { name: 'Car Accidents', desc: 'Help after serious collisions involving cars, trucks, and rideshares.', icon: 'car', href: `${URL.practice}#mva` },
  { name: 'Truck Accidents', desc: 'Holding trucking companies accountable for life-changing injuries.', icon: 'truck', href: `${URL.practice}#mva` },
  { name: 'Slip & Fall', desc: 'Property owners must keep premises safe. We hold them accountable when they don’t.', icon: 'fall', href: `${URL.practice}#fall` },
  { name: 'Dog Bites', desc: 'Advocating for victims of dog attacks and the care they need to move forward.', icon: 'dog', href: `${URL.practice}#dog` },
];
const practice = () => band(C.ivory, [
  centerLabel('Our Practice Areas'),
  heading('Focused on Your Recovery.', 'h2', [44, 38, 32], C.ink, 'center', { lh: 1.15, settings: { _margin: box(22, 0, 0, 0) } }),
  grid(AREAS.map((a) => container({
    content_width: 'full', flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(18),
    padding: box(8, 28, 0, 28), padding_mobile: box(0, 8, 0, 8), custom_css: DIVIDERS('rgba(74,54,47,0.18)'),
  }, [
    svg(ICON[a.icon], 60),
    H3(a.name, C.ink, [18, 18, 18], { align: 'center', ls: 0.1, lh: 1.3 }),
    text(a.desc, { color: C.inkSoft, size: 16, lh: 1.7, align: 'center', settings: { _flex_size: 'grow', custom_css: 'selector { max-width: 260px; }' } }),
    button('Learn more  →', a.href, 'underline', { align: 'center' }),
  ])), { cols: [4, 2, 1], gap: 0, rowGap: 56, settings: { margin: box(64, 0, 0, 0), margin_mobile: box(40, 0, 0, 0) } }),
], { pad: [96, 100], width: 1320, anchor: 'practice' });

/* ---------------------------------------------------------- results band */
// Jen (Markup): her actual results (the first four on the Case Results page), not the handoff's example figures.
const RESULTS = require('../content.json').results.slice(0, 4).map((r) => [r.amount, r.type]);
const results = () => band(C.espMid, [
  grid(RESULTS.map(([amt, type]) => stack([
    heading(amt, 'p', [42, 38, 34], C.ivory, 'center', { lh: 1 }),
    eyebrow(type, C.ivory, 'center', { size: 13, ls: 0.22 }),
  ], { gap: 12, settings: { padding: box(6, 16, 6, 16), padding_mobile: box(6, 8, 18, 8), custom_css: DIVIDERS(C.roseLine) } })), { cols: [4, 2, 1], gap: 0, rowGap: 28, settings: { custom_css: 'selector { max-width: 1100px; margin-left: auto; margin-right: auto; }' } }),
], { pad: [56, 56], width: 1320, anchor: 'results', settings: { border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: 'rgba(196,160,141,0.2)' } });

/* --------------------------------------------------------------- my story */
// Jen's own wording (Markup).
const STORY = [
  'Three days after graduating from college, I lost my father. In a moment that should have been filled with celebration and excitement for the future, I found myself navigating an unimaginable loss while preparing for the LSAT and the next chapter of my life.',
  'Years later, during the uncertainty of the COVID-19 pandemic, I completed my law school final exams at 40 weeks pregnant. The very next day, I welcomed my first child into the world.',
  'These experiences taught me that life rarely unfolds according to plan. They also reinforced something I carry into my practice every day: when circumstances become difficult, determination matters, but so do compassion, preparation, and the people standing beside you.',
  'Before founding Cabrera Torres Law Firm, I served as Managing Partner of Gonzalez Torres Law, where I led the personal injury litigation practice. My experience in personal injury law has taught me that behind every case is someone facing a difficult and often unexpected chapter of their own.',
  'I approach that responsibility with the same determination that has carried me through my own challenges—combined with the experience, preparation, and personal attention every client deserves.',
];
const STORY_MASK = 'linear-gradient(180deg, transparent 0, #000 22%), linear-gradient(90deg, transparent 0, #000 10%, #000 90%, transparent 100%)';
const story = (m) => container({
  content_width: 'boxed', boxed_width: px(1400), container_type: 'grid',
  grid_columns_grid: { unit: 'custom', size: 'minmax(0,.95fr) minmax(0,1.05fr)' }, grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
  grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_gaps: gap(0), grid_align_items: 'stretch',
  padding: box(0), background_background: 'classic', background_color: C.nearBlack, overflow: 'hidden', _element_id: 'story',
}, [
  // Jen (Markup): her desk portrait. Its dark studio backdrop blends into the near-black section; shown at or
  // below its native size so it stays sharp, edges feathered into the background.
  container({ content_width: 'full', flex_direction: 'column', flex_justify_content: 'flex-end', flex_align_items: 'center', padding: box(64, 24, 0, 24), padding_mobile: box(40, 24, 0, 24), min_height: px(720), min_height_tablet: px(0), min_height_mobile: px(0) }, [
    image(m.jenDeskPortrait, { settings: { custom_css: `selector img { display: block; width: auto; max-width: 100%; height: 660px; max-height: 660px; object-fit: contain; object-position: bottom; -webkit-mask-image: ${STORY_MASK}; -webkit-mask-composite: source-in; mask-image: ${STORY_MASK}; mask-composite: intersect; }\n@media (max-width: 1024px) { selector img { height: auto; max-height: none; width: 100%; max-width: 480px; } }` } }),
  ]),
  stack([
    kicker('The Story Behind the Firm'),
    heading(`Resilience Is Personal.<br><span style="color:${C.rose};font-size:.68em;white-space:nowrap">So Is My Commitment to&nbsp;You.</span>`, 'h2', [44, 38, 32], C.ivory, 'left', { lh: 1.12, settings: { _margin: box(8, 0, 0, 0), custom_css: '@media (max-width: 420px) { selector span { white-space: normal !important; } }' } }),
    stack(STORY.map((p) => text(p, { color: C.ivory, size: 17, lh: 1.75 })), { gap: 18, settings: { margin: box(14, 0, 0, 0) } }),
    button('Meet Jennifer  →', URL.jennifer, 'outlineDark', { settings: { _margin: box(22, 0, 0, 0) } }),
  ], { gap: 16, align: 'flex-start', justify: 'center', settings: { padding: box(104, 56, 104, 72), padding_tablet: box(56, 32, 80, 32), padding_mobile: box(48, 24, 64, 24), custom_css: 'selector > * { max-width: 600px; }' } }),
], false);

/* ------------------------------------------------------------ our approach */
const PILLARS = [
  ['Integrity', 'Honest guidance and straight answers, from the first call to the last.', 'integrity'],
  ['Commitment', 'Every case prepared as if it will be tried.', 'commitment'],
  ['Results', 'Recoveries that reflect the full impact of an injury.', 'results'],
  ['Client-Focused', "You're never just a case. You're a person.", 'client'],
];
const approach = () => band(C.ivory, [
  grid(PILLARS.map(([t, d, ic]) => container({
    content_width: 'full', flex_direction: 'column', flex_align_items: 'flex-start', flex_gap: gap(16),
    padding: box(4, 28, 4, 28), padding_mobile: box(0, 0, 8, 0), custom_css: DIVIDERS('rgba(74,54,47,0.18)'),
  }, [
    svg(ICON[ic], 48),
    stack([
      H3(t, C.ink, [16, 16, 16], { ls: 0.1, lh: 1.3 }),
      text(d, { color: C.inkSoft, size: 15, lh: 1.65 }),
    ], { gap: 8 }),
  ])), { cols: [4, 2, 1], gap: 0, rowGap: 32 }),
], { pad: [72, 72], width: 1320, anchor: 'approach' });

/* ------------------------------------------------------------- litigation */
const LIT = [
  ['Investigation', 'Evidence preserved early, experts retained when the case calls for it.'],
  ['Negotiation', 'Demands built on documented damages, not guesswork.'],
  ['Trial', 'When insurers refuse to be fair, we are ready to present your case to a jury.'],
];
const litigation = (m) => container({
  content_width: 'full', flex_direction: 'row', flex_justify_content: 'flex-end', flex_align_items: 'center',
  min_height: px(600), padding: box(64, 0, 64, 0), padding_tablet: box(96, 32, 96, 32), padding_mobile: box(80, 24, 80, 24),
  background_background: 'classic', background_color: C.lit, background_image: m.litJen,
  background_position: 'center left', background_size: 'cover', background_repeat: 'no-repeat',
  background_overlay_background: 'classic', background_overlay_color: C.lit, background_overlay_opacity: px(0), background_overlay_opacity_tablet: px(0.82), background_overlay_opacity_mobile: px(0.82),
  css_classes: 'e-no-lazyload', // Elementor's lazy background loading left this banner black
  // Handoff: image at 118% width, shifted left 6%, so Jennifer sits further left; dimmed behind centered copy ≤1150px.
  custom_css: 'selector { aspect-ratio: 3 / 1; background-size: 118% auto !important; background-position: -6vw 50% !important; }\n@media (max-width: 1150px) { selector { aspect-ratio: auto; background-size: cover !important; background-position: 20% 50% !important; } }',
}, [
  container({ content_width: 'full', flex_direction: 'column', padding: box(0, 6, 0, 0, 'vw'), padding_tablet: box(0), padding_mobile: box(0), width: px(50, '%'), width_tablet: px(100, '%'), width_mobile: px(100, '%'), z_index: 1 }, [
    stack([
      kicker('Litigation Experience'),
      heading('Prepared for Trial.<br>From the First Call.', 'h2', [44, 38, 32], C.ivory, 'left', { lh: 1.12, settings: { _margin: box(8, 0, 0, 0) } }),
      text("Insurance companies know which firms are willing to go to court. We prepare every case as if it will be tried, so when it's time to negotiate, you negotiate from a position of strength.", { color: C.ivory, size: 17, lh: 1.75 }),
      grid(LIT.map(([t, d]) => stack([
        eyebrow(t, C.rose, 'left', { size: 13, weight: 700, ls: 0.2 }),
        text(d, { color: C.ivory, size: 15, lh: 1.6 }),
      ], { gap: 8, settings: { padding: box(16, 0, 0, 0), border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.rose } })), { cols: [3, 3, 1], gap: 24, settings: { margin: box(22, 0, 0, 0) } }),
    ], { gap: 18, maxW: 580 }),
  ]),
], false);

/* ----------------------------------------------------------- testimonials */
const QUOTES = [
  'Jennifer and her team were incredible. They not only fought for me, but they genuinely cared about me and my family throughout the entire process.',
  'She is compassionate, responsive, and truly goes above and beyond. I always felt heard, supported, and confident knowing they had my back.',
  "Professional, knowledgeable, and relentless in the pursuit of justice. I'm so grateful for everything they did for me.",
];
const testimonials = () => band(C.ivory, [
  centerLabel('What Our Clients Say', C.espMid, 'h2'),
  grid(QUOTES.map((q) => container({
    content_width: 'full', flex_direction: 'column', flex_gap: gap(20), padding: box(40, 36, 40, 36), padding_mobile: box(32, 26, 32, 26),
    background_background: 'classic', background_color: C.light, border_border: 'solid', border_width: box(1), border_color: C.hair,
  }, [
    text('★★★★★', { color: C.rose, size: 26, ls: 0.12, lh: 1 }),
    text(q, { color: C.ink, size: 18, lh: 1.75, settings: { _flex_size: 'grow' } }),
    text(`${RULE(28)}${SP(14)}Actual Client`, { color: C.espMid, size: 13, weight: 700, ls: 0.2, transform: 'uppercase', lh: 1.4 }),
  ])), { cols: [3, 1, 1], gap: 28, settings: { margin: box(56, 0, 0, 0), margin_mobile: box(40, 0, 0, 0) } }),
], { pad: [96, 100], width: 1320, anchor: 'testimonials' });

module.exports = {
  slug: 'home', title: 'Home',
  seo: {
    title: 'Personal Injury Lawyer Norcross, GA | Cabrera Torres Law Firm',
    description: 'Injured in Norcross or Gwinnett County? Attorney Jennifer Cabrera-Torres handles car, truck, dog bite and slip and fall cases. Free consultation.',
    focus: 'personal injury lawyer Norcross GA',
  },
  build: (m) => [hero(m), practice(), results(), story(m), approach(), litigation(m), testimonials(), P.ctaBand()],
};
