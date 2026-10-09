// Recco Consulting homepage (single page): hero, proof band, services, platforms, AI news,
// about, approach, contact. Section anchors match the menu: #services #platforms #news #about #contact.
const L = require('./lib.cjs');
const { C, SERIF, SANS, EMAIL, A, id, px, box, gap, auto, link, typo, fa, container, widget, band, stack, row, grid, eyebrow, H2, H3, text, button, image } = L;

const SERVICES = [
  ['01', 'AI strategy and adoption', 'Where AI will create value in your business, which use cases to start with, and how to govern them. A plan your board and your engineers can both read.'],
  ['02', 'Technology investment decisions', 'Independent evaluation of platforms, vendors and contracts before you commit. We model the total cost and the realistic upside, then help you negotiate.'],
  ['03', 'Value realization', 'For platforms you already own. We find where adoption stalled, what is underused, and the shortest path to the return you were promised.'],
  ['04', 'Program and vendor oversight', 'A seat on your side of the table during implementation. We keep partners accountable to scope, quality and the business case.'],
];
const PLATFORMS = [
  ['OpenAI', 'icOpenai'], ['Anthropic', 'icAnthropic'], ['Microsoft Azure AI', 'icAzure'], ['Google Cloud', 'icGoogle'],
  ['Salesforce', 'icSalesforce'], ['ServiceNow', 'icServicenow'], ['Snowflake', 'icSnowflake'], ['AWS', 'icAws'], ['Workday', 'icWorkday'],
];
const NEWS = [
  ['logoAnthropic', 110, 'One sentence on what shipped and why it matters to enterprise buyers.', 'Today'],
  ['logoSalesforce', 110, 'The most relevant platform update for CRM and service teams this week.', 'Yesterday'],
  ['logoServicenow', 110, 'What changed in the latest release and who should pay attention.', '2 days ago'],
  ['logoMicrosoft', 100, 'Copilot and Azure AI developments summarized for decision makers.', '2 days ago'],
];
const STEPS = [
  ['01', 'Understand the decision', 'We start with the business question, not the technology. Two weeks is usually enough to frame it.'],
  ['02', 'Evaluate without bias', 'Structured, documented comparison. Every recommendation comes with the reasoning behind it.'],
  ['03', 'Commit with confidence', 'Contract, roadmap and governance set up so the value case survives contact with reality.'],
  ['04', 'Measure what was promised', 'We stay long enough to confirm the return, and we tell you plainly if it is not there.'],
];

const small = (title, size, color, o = {}) => widget('heading', {
  title, header_size: o.tag || 'p', title_color: color, align: o.align || 'left',
  ...typo('typography', o.family || SANS, size, o.weight || 400, { lh: o.lh || 1.3, ls: o.ls }),
  ...(o.settings || {}),
});

/* ------------------------------------------------------------------ hero */
const hero = (m) => band([
  eyebrow(m, 'Technology advisory', { align: 'center', archW: 120 }),
  widget('heading', {
    title: 'We help companies make the right technology investments and realize more value from them.', header_size: 'h1',
    title_color: C.white, align: 'center',
    ...typo('typography', SERIF, [64, 50, 38], 300, { lh: 1.06, ls: -0.96 }),
    _element_width: 'initial', _element_custom_width: px(980), _element_custom_width_tablet: px(100, '%'),
  }),
  text('Independent advice on AI and enterprise platforms, from the first decision to measurable results. We have no vendor to sell. Only your outcome.', {
    align: 'center', color: 'rgba(255,255,255,0.86)', size: 18, lh: 1.6, maxW: 620, settings: { typography_font_size_mobile: px(17) },
  }),
  row([
    button('Start a conversation', A.contact, 'green', { arrow: true }),
    button('What we do', A.services, 'ghostWhite'),
  ], { gap: 14, justify: 'center', settings: { width: auto } }),
], {
  pad: [120, 112], gap: 30, image: m.heroTower, imagePos: 'center center', title: 'Hero',
  overlay: L.overlayGradient('rgba(14,42,58,0.7)', 'rgba(14,42,58,0.96)'),
  settings: {
    flex_align_items: 'center', flex_justify_content: 'center',
    min_height: px(780), min_height_tablet: px(640), min_height_mobile: px(0),
    background_position: 'initial', background_xpos: px(50, '%'), background_ypos: px(30, '%'),
  },
});

/* ----------------------------------------------------------- proof band */
const proofItem = (title, sub) => stack([
  small(title, [32, 30, 28], C.white, { family: SERIF, weight: 300, lh: 1.1 }),
  small(sub, 13, 'rgba(255,255,255,0.72)', { ls: 0.52, lh: 1.5 }),
], { gap: 6, settings: { border_border: 'solid', border_width: box(0, 0, 0, 1), border_color: 'rgba(255,255,255,0.18)', padding: box(0, 0, 0, 24) } });

const proof = () => band([
  grid([
    proofItem('Since 2012', 'Advising enterprise technology leaders'),
    proofItem('Vendor neutral', 'No resale, no referral fees, no quotas'),
    proofItem('AI first', 'Grounded in Salesforce and ServiceNow depth'),
  ], { cols: [3, 3, 1], gap: [40, 28], gapT: [24, 24], gapM: [28, 28], align: 'stretch' }),
], { pad: [40, 40], bg: C.navy, title: 'Proof band', settings: { padding_mobile: box(36, 20, 36, 20) } });

/* -------------------------------------------------------------- services */
const serviceRow = ([n, title, body]) => container({
  content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', flex_align_items: 'flex-start',
  flex_gap: gap(24), flex_gap_mobile: gap(14), padding: box(34, 8, 34, 8), padding_mobile: box(26, 4, 26, 4),
  html_tag: 'a', link: link(A.contact),
  border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.line,
  background_background: 'classic', background_color: 'rgba(0,0,0,0)', background_hover_background: 'classic', background_hover_color: C.tint,
  custom_css: 'selector { transition: background .2s, padding .2s; }\n@media (min-width: 1025px) { selector:hover { padding-left: 20px; padding-right: 0; } }',
  _title: `Service ${n}`,
}, [
  small(n, 15, C.gray, { family: SERIF, ls: 0.9, settings: { _element_width: 'initial', _element_custom_width: px(64), _element_custom_width_mobile: px(30), _flex_size: 'none', _padding: box(6, 0, 0, 0) } }),
  stack([
    H3(title, [24, 22, 20]),
    text(body, { size: 15.5, lh: 1.6 }),
  ], { gap: 10, settings: { custom_css: 'selector { flex: 1 1 0; min-width: 0; }' } }),
  widget('icon', {
    selected_icon: fa('fas fa-arrow-right'), primary_color: C.green, size: px(18), size_mobile: px(15),
    _element_width: 'initial', _element_custom_width: px(32), _element_custom_width_mobile: px(18), _flex_size: 'none', _padding: box(4, 0, 0, 0),
  }),
]);

const services = (m) => band([
  grid([
    stack([
      eyebrow(m, 'Services'),
      H2('Advice at every point where a technology decision gets made.', C.navy, { ls: -0.46 }),
      text('Engagements are scoped to the decision in front of you. Most start small and expand only when the value is clear.'),
      image(m.dome, { width: px(100, '%'), height: [414, 380, 260], radius: 4, settings: { _margin: box(20, 0, 0, 0), _margin_mobile: box(8, 0, 0, 0) } }),
    ], { gap: 18 }),
    stack(SERVICES.map(serviceRow), { gap: 0, settings: { border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.line } }),
  ], { cols: [2, 1, 1], gap: [72, 56], gapT: [56, 56], gapM: [40, 40], align: 'stretch' }),
], { anchor: 'services', title: 'Services' });

/* ------------------------------------------------------------- platforms */
const chip = (m, [label, icon]) => container({
  content_width: 'full', width: auto, width_tablet: auto, width_mobile: auto, flex_direction: 'row', flex_wrap: 'nowrap',
  flex_align_items: 'center', flex_gap: gap(12), flex_gap_mobile: gap(10),
  padding: box(12, 24, 12, 14), padding_mobile: box(10, 18, 10, 12),
  background_background: 'classic', background_color: C.white, border_radius: box(999),
  border_border: 'solid', border_width: box(1), border_color: C.white,
  custom_css: 'selector { transition: transform .2s, box-shadow .2s; }\nselector:hover { transform: translateY(-2px); box-shadow: 0 10px 24px -12px rgba(0,0,0,.45); }',
  _title: label,
}, [
  image(m[icon], { width: [28, 28, 24], settings: { _element_width: 'initial', _element_custom_width: px(28), _element_custom_width_mobile: px(24), _flex_size: 'none' } }),
  small(label, [16, 16, 15], C.navy, { weight: 600, lh: 1.2, settings: { custom_css: 'selector .elementor-heading-title { white-space: nowrap; }' } }),
]);

const platforms = (m) => band([
  grid([
    stack([
      eyebrow(m, 'Platform expertise'),
      H2('Deep on the platforms that run the enterprise.', C.white, { sizes: [40, 34, 28], lh: 1.12 }),
    ], { gap: 14 }),
    row(PLATFORMS.map((p) => chip(m, p)), { gap: 12, settings: { flex_gap_mobile: gap(10) } }),
  ], { cols: [2, 1, 1], gap: [72, 40], gapT: [40, 36], gapM: [32, 32], align: 'center' }),
], {
  pad: [80, 80], image: m.cityData, anchor: 'platforms', title: 'Platforms',
  overlay: L.overlayGradient('rgba(30,73,94,0.96)', 'rgba(30,73,94,0.78)', 90),
});

/* ------------------------------------------------------------------ news */
// "Updated daily · <today>" uses Elementor's Current Date Time dynamic tag.
const dateSettings = encodeURIComponent(JSON.stringify({ date_format: 'custom', time_format: '', custom_format: 'M j, Y', before: 'Updated daily · ' }));
const updated = row([
  widget('icon', {
    selected_icon: fa('fas fa-circle'), primary_color: C.green, size: px(8),
    _element_width: 'auto', _flex_size: 'none',
    custom_css: 'selector .elementor-icon { display: flex; animation: reccoPulse 2.4s ease-in-out infinite; }\n@keyframes reccoPulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }',
  }),
  widget('heading', {
    title: 'Updated daily', header_size: 'p', title_color: C.gray, ...typo('typography', SANS, 13, 500, { lh: 1.4 }),
    __dynamic__: { title: `[elementor-tag id="${id()}" name="current-date-time" settings="${dateSettings}"]` },
    _element_width: 'auto',
  }),
], { gap: 10, nowrap: true, settings: { width: auto, width_tablet: auto, width_mobile: auto, _flex_size: 'none', padding: box(0, 0, 6, 0) } });

const featured = (m) => container({
  content_width: 'full', flex_direction: 'column', flex_justify_content: 'flex-end', flex_align_items: 'flex-start', flex_gap: gap(18),
  min_height: px(460), min_height_tablet: px(400), min_height_mobile: px(360), padding: box(40), padding_mobile: box(26),
  html_tag: 'a', link: link('#'), overflow: 'hidden', border_radius: box(12),
  background_background: 'classic', background_color: C.navy, background_image: m.cityData, background_position: 'center center', background_size: 'cover',
  ...L.overlayGradient('rgba(14,42,58,0.1)', 'rgba(14,42,58,0.92)'),
  _title: 'Featured story',
}, [
  image(m.logoOpenai, { width: [78, 78, 66], settings: {
    _element_width: 'auto', _background_background: 'classic', _background_color: C.white, _border_radius: box(6), _padding: box(8, 14, 8, 14),
  } }),
  widget('heading', {
    title: 'Headline summary of the latest release, generated daily by the back-end engine.', header_size: 'h3', title_color: C.white,
    ...typo('typography', SERIF, [30, 28, 24], 400, { lh: 1.2 }),
  }),
  text('<p>Today · <strong style="color:#95AB3B">Read more →</strong></p>', { color: 'rgba(255,255,255,0.7)', size: 13, lh: 1.4 }),
]);

const newsItem = (m, [logo, w, title, when]) => container({
  content_width: 'full', container_type: 'grid',
  grid_columns_grid: { unit: 'custom', size: '120px minmax(0,1fr)' }, grid_columns_grid_tablet: { unit: 'custom', size: '120px minmax(0,1fr)' },
  grid_columns_grid_mobile: { unit: 'custom', size: '84px minmax(0,1fr)' },
  grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto,
  grid_gaps: gap(24), grid_gaps_mobile: gap(16), grid_align_items: 'center',
  padding: box(24, 0, 24, 0), html_tag: 'a', link: link('#'),
  border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.line,
  custom_css: 'selector { transition: padding .2s; }\n@media (min-width: 1025px) { selector:hover { padding-left: 12px; } }',
  _title: `News: ${logo.replace('logo', '')}`,
}, [
  image(m[logo], { width: [w, w, Math.round(w * 0.75)] }),
  stack([
    widget('heading', { title, header_size: 'h3', title_color: C.navy, ...typo('typography', SERIF, [18, 18, 17], 400, { lh: 1.35 }) }),
    small(when, 12, C.gray),
  ], { gap: 6 }),
]);

const news = (m) => band([
  row([
    stack([
      eyebrow(m, 'What’s new in AI'),
      H2('The latest from the vendors our clients run on.', C.navy, { ls: -0.46 }),
    ], { gap: 14, maxW: 640 }),
    updated,
  ], { justify: 'space-between', align: 'flex-end', gap: 32, rowGap: 20, settings: { flex_align_items_mobile: 'flex-start' } }),
  grid([
    featured(m),
    stack(NEWS.map((n) => newsItem(m, n)), { gap: 0, settings: { border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.line } }),
  ], { cols: [2, 1, 1], gap: [64, 48], gapT: [40, 40], gapM: [32, 32], align: 'start' }),
], { bg: C.white, anchor: 'news', title: 'AI News' });

/* ----------------------------------------------------------------- about */
const about = (m) => container({
  container_type: 'grid', content_width: 'full', padding: box(0),
  grid_columns_grid: px(2, 'fr'), grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
  grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_gaps: gap(0), grid_align_items: 'stretch',
  background_background: 'classic', background_color: C.navy, _element_id: 'about', _title: 'About',
}, [
  container({
    content_width: 'full', min_height: px(420), min_height_tablet: px(380), min_height_mobile: px(280), padding: box(0),
    background_background: 'classic', background_image: m.team, background_size: 'cover', background_repeat: 'no-repeat',
    background_position: 'initial', background_xpos: px(55, '%'), background_ypos: px(25, '%'), _title: 'About photo',
  }),
  container({
    content_width: 'full', flex_direction: 'column', flex_justify_content: 'center',
    padding: box(96, 32, 96, 72), padding_tablet: box(72, 32, 72, 32), padding_mobile: box(56, 20, 56, 20),
  }, [
    stack([
      eyebrow(m, 'About Recco'),
      H2('A small firm, built so the senior people do the work.', C.white, { sizes: [50, 40, 32], lh: 1.08, ls: -0.6 }),
      text('Recco Consulting was founded to give technology leaders a second opinion they can trust. We’ve sat on the buying side of large platform decisions, and we bring that perspective to every engagement.', { color: 'rgba(255,255,255,0.8)', size: 16.5 }),
    ], { gap: 22, maxW: 640 }),
  ]),
]);

/* -------------------------------------------------------------- approach */
const step = ([n, title, body]) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(14), padding: box(36, 28, 36, 28), padding_mobile: box(28, 20, 28, 20),
  background_background: 'classic', background_color: C.white, background_hover_background: 'classic', background_hover_color: C.tint,
  _title: `Step ${n}`,
}, [
  small(n, 14, C.green, { family: SERIF, ls: 1.4 }),
  H3(title, [21, 20, 19]),
  text(body, { size: 15, lh: 1.6 }),
]);

const approach = (m) => band([
  stack([
    eyebrow(m, 'How we work'),
    H2('Four steps, from question to measured return.', C.navy, { ls: -0.46 }),
  ], { gap: 14, maxW: 640 }),
  grid(STEPS.map(step), {
    cols: [4, 2, 1], gap: 1, gapT: 1, gapM: 1, align: 'stretch',
    settings: { background_background: 'classic', background_color: C.line, border_border: 'solid', border_width: box(1, 0, 1, 0), border_color: C.line },
  }),
], { pad: [96, 0], gap: 56, gapM: 36, bg: C.white, anchor: 'approach', title: 'How we work' });

/* --------------------------------------------------------------- contact */
const field = (custom_id, field_type, field_label, placeholder, width, extra = {}) => ({
  _id: id(), custom_id, field_type, field_label, placeholder, width, width_tablet: width, width_mobile: '100', ...extra,
});

const contactForm = () => widget('form', {
  form_name: 'Contact',
  form_fields: [
    field('name', 'text', 'Name', 'Jane Doe', '50', { required: 'true' }),
    field('email', 'email', 'Work email', 'jane@company.com', '50', { required: 'true' }),
    field('company', 'text', 'Company', 'Company name', '50'),
    field('topic', 'select', 'Topic', '', '50', { field_options: 'AI strategy\nPlatform selection\nSalesforce\nServiceNow\nSomething else' }),
    field('message', 'textarea', 'How can we help?', 'A sentence or two is plenty.', '100', { rows: 3 }),
    field('website', 'honeypot', '', '', '100'),
  ],
  show_labels: 'true', input_size: 'md', button_text: 'Send message', button_size: 'md',
  button_width: '100', button_align: 'start', selected_button_icon: fa('fas fa-arrow-right'), button_icon_align: 'right', button_icon_indent: px(10),
  submit_actions: ['email'], email_subject: 'New enquiry from the Recco Consulting website', email_from_name: 'Recco Consulting website',
  success_message: 'Thanks. We will reply within one business day.',
  column_gap: px(24), row_gap: px(22), label_spacing: px(8),
  label_color: C.gray, ...typo('label_typography', SANS, 12, 700, { lh: 1.3, ls: 1.2, transform: 'uppercase' }),
  field_text_color: C.navy, ...typo('field_typography', SANS, 16, 500, { lh: 1.4 }),
  field_background_color: 'rgba(0,0,0,0)', field_border_color: C.field, field_border_width: box(0, 0, 1.5, 0), field_border_radius: box(0),
  button_background_color: C.navy, button_text_color: C.white, button_background_hover_color: C.green, button_hover_color: C.white,
  button_border_radius: box(999), ...typo('button_typography', SANS, 15, 600, { lh: 1.2 }), button_text_padding: box(15, 28, 15, 28),
  custom_css: [
    'selector .elementor-field-textual { padding: 14px 0; min-height: 0; box-shadow: none; }',
    'selector .elementor-field-textual:focus { border-bottom-color: #95AB3B; }',
    'selector .elementor-field-textual::placeholder { color: #8A9AA3; opacity: 1; }',
    'selector .elementor-select-wrapper select { padding: 14px 0; }',
    'selector .elementor-field-type-submit { margin-top: 8px; }',
  ].join('\n'),
});

const contact = (m) => band([
  widget('image', {
    image: m.arch, image_size: 'full', width: px(100, '%'), opacity: px(0.14), _title: 'Background arch',
    _position: 'absolute', _element_width: 'initial', _element_custom_width: px(95, '%'), _element_custom_width_mobile: px(160, '%'),
    _offset_orientation_h: 'start', _offset_x: px(-22, '%'), _offset_x_mobile: px(-40, '%'), _offset_orientation_v: 'end', _offset_y_end: px(-4, '%'),
    _z_index: 0, custom_css: 'selector { pointer-events: none; }',
  }),
  grid([
    stack([
      eyebrow(m, 'Contact us'),
      H2('Tell us about the decision you’re facing.', C.navy, { sizes: [50, 40, 32], lh: 1.08, ls: -0.6 }),
      text('We reply within one business day. No sales sequence, no newsletter.'),
      widget('button', {
        text: EMAIL, link: link(`mailto:${EMAIL}`), align: 'left',
        ...typo('typography', SANS, 16, 600, { lh: 1.3 }),
        button_text_color: C.navy, hover_color: C.green, background_background: 'classic', background_color: 'rgba(0,0,0,0)',
        button_background_hover_background: 'classic', button_background_hover_color: 'rgba(0,0,0,0)',
        border_border: 'solid', border_width: box(0, 0, 1.5, 0), border_color: C.green, border_radius: box(0), text_padding: box(0, 0, 3, 0),
      }),
    ], { gap: 20 }),
    container({
      content_width: 'full', flex_direction: 'column', flex_gap: gap(18), padding: box(40), padding_mobile: box(24),
      background_background: 'classic', background_color: C.white, border_radius: box(16),
      border_border: 'solid', border_width: box(1), border_color: C.lineSoft,
      box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 24, blur: 60, spread: -32, color: 'rgba(30,73,94,0.3)' },
      _title: 'Form card',
    }, [
      contactForm(),
      text('Protected against automated submissions. We never share your details.', { color: C.gray, size: 12.5, lh: 1.5 }),
    ]),
  ], { cols: [2, 1, 1], gap: [72, 56], gapT: [48, 48], gapM: [36, 36], align: 'center', settings: { _z_index: 1 } }),
], {
  image: m.officeBokeh, bg: C.white, anchor: 'contact', title: 'Contact',
  overlay: L.overlayColor('rgba(255,255,255,0.95)'),
  settings: { custom_css: 'selector::before { -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); }' },
});

module.exports = {
  slug: 'home', title: 'Home',
  build: (m) => [hero(m), proof(), services(m), platforms(m), news(m), about(m), approach(m), contact(m)],
};
