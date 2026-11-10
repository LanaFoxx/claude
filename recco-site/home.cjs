// Recco Consulting homepage: hero, how we work, value proposition (cards to the inner pages),
// SEED overview, services, platforms, AI news, about, approach, contact.
// Section anchors used by the menu/footer: #services #about #contact.
const L = require('./lib.cjs');
const { U } = L;
const B = require('./blocks.cjs');
const P = require('./platforms.cjs');
const { C, SERIF, SANS, EMAIL, A, id, px, box, gap, auto, link, typo, fa, container, widget, band, stack, row, grid, eyebrow, H2, H3, text, button, image } = L;

// Services copy from Eric's Markup note (10 Nov 2026). Two practices, two items each.
const SERVICE_GROUPS = [
  ['Generative AI Platform Recommendations', [
    ['01', 'Live Tenant Benchmarking & Hallucination Audits', 'Side-by-side prompt testing inside licensed enterprise-tier tenants (ChatGPT Enterprise, Claude Enterprise, Gemini Enterprise, Microsoft Copilot) connected to real systems. We measure output fidelity, isolate hallucination frequencies, and identify scenario-specific differentiators before you commit capital.'],
    ['02', 'AI FinOps, Token Forecasting & Enterprise Connectors', 'Grounded financial modeling and integration architecture. We run workload simulations to establish accurate token estimation, forecast recurring consumption costs, and stress-test data retrieval connectors to enterprise applications for secure, scalable adoption.'],
  ]],
  ['Enterprise Application Reconnaissance', [
    ['03', 'Production-Grade Instance Evaluation', 'We stand up live, production-grade environments of leading enterprise platforms to separate marketing demonstrations from operational reality. We conduct side-by-side capability shootouts using your realistic business data and workflows.'],
    ['04', 'Licensing, Pricing & Discount Intelligence', 'Demystifying opaque SaaS tiers, usage metrics, and vendor sales practices. We audit proposals against historical street pricing, uncover renewal escalators, and analyze discounting structures so your executive team negotiates from strength.'],
  ]],
];
const STEPS = [
  ['01', 'Frame the decision', 'We start with the business question, not the technology, and agree on what evidence will settle it.'],
  ['02', 'Test in the lab', 'Hands-on evaluation in licensed tenants with realistic data, scoring quality and cost together.'],
  ['03', 'Recommend with evidence', 'A clear point of view, with the reasoning and test results behind every call.'],
  ['04', 'Measure the return', 'We stay long enough to confirm the value, and we tell you plainly if it isn\u2019t there.'],
];

const small = (title, size, color, o = {}) => widget('heading', {
  title, header_size: o.tag || 'p', title_color: color, align: o.align || 'left',
  ...typo('typography', o.family || SANS, size, o.weight || 400, { lh: o.lh || 1.3, ls: o.ls }),
  ...(o.settings || {}),
});

/* ------------------------------------------------------------------ hero */
// Hero copy and layout from Eric's Markup notes and reference image (10 Nov 2026): intro line, then two
// halves, one per discipline, each with three numbered points.
const DISCIPLINES = [
  ['Enterprise Application Reconnaissance', [
    ['Live Production-Grade Testing', 'We stand up actual production grade instances to evaluate capabilities.'],
    ['Hype vs. Reality Audits', 'Going beyond generic and flashy demos to prove real-world value.'],
    ['Licensing & Contract Intelligence', 'Deep intelligence on enterprise pricing, licensing, and discounting.'],
  ]],
  ['Generative AI Platform Recommendations', [
    ['Multi-Model Live Benchmarking', 'Side-by-side testing of Enterprise editions of ChatGPT, Claude, Gemini and others.'],
    ['Hallucination & Connector Testing', 'Pinpointing prompt errors and management of data pipelines.'],
    ['AI FinOps & Token Forecasting', 'Grounded financial modeling and analysis before you commit capital.'],
  ]],
];
const point = ([title, body], i) => container({
  content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', flex_align_items: 'flex-start', flex_gap: gap(18), flex_gap_mobile: gap(14), padding: box(0),
  _title: `Point ${i + 1}`,
}, [
  widget('heading', {
    title: String(i + 1).padStart(2, '0'), header_size: 'p', title_color: C.greenOnDark,
    ...typo('typography', SERIF, [30, 28, 24], 300, { lh: 1 }),
    _element_width: 'initial', _element_custom_width: px(40), _element_custom_width_mobile: px(32), _flex_size: 'none',
  }),
  stack([
    widget('heading', { title, header_size: 'h3', title_color: C.white, ...typo('typography', SANS, [17, 16, 16], 700, { lh: 1.3 }) }),
    text(body, { color: 'rgba(255,255,255,0.82)', size: [15.5, 15, 15], lh: 1.5 }),
  ], { gap: 4, settings: { custom_css: 'selector { flex: 1 1 0; min-width: 0; }' } }),
]);
// Halves are split by a thin rule: vertical side by side, horizontal when stacked on phones.
const half = ([title, points], i) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(28), flex_gap_mobile: gap(20),
  padding: i ? box(4, 0, 4, 56) : box(4, 56, 4, 0), padding_tablet: i ? box(4, 0, 4, 28) : box(4, 28, 4, 0),
  padding_mobile: i ? box(28, 0, 0, 0) : box(0, 0, 0, 0),
  ...(i ? { border_border: 'solid', border_width: box(0, 0, 0, 1), border_width_mobile: box(1, 0, 0, 0), border_color: 'rgba(255,255,255,0.22)' } : {}),
  _title: title,
}, [
  widget('heading', {
    title, header_size: 'h1', title_color: C.white, align: 'left',
    ...typo('typography', SERIF, [42, 34, 28], 300, { lh: 1.12, ls: -0.5 }),
  }),
  stack(points.map(point), { gap: 24, settings: { flex_gap_mobile: gap(18) } }),
]);

const hero = (m) => band([
  eyebrow(m, 'Technology advisory since 2006', { align: 'center', archW: 120, dark: true }),
  text('<p>Move past unverified vendor claims and generic demos. Recco delivers empirical <strong>evaluation</strong> and <strong>prescriptive</strong> guidance across two distinct disciplines.</p>', {
    align: 'center', color: 'rgba(255,255,255,0.9)', size: [20, 18, 16], lh: 1.55, maxW: 820,
    settings: { typography_font_size_mobile: px(15.5), typography_line_height_mobile: { unit: 'em', size: 1.55, sizes: [] } },
  }),
  grid(DISCIPLINES.map(half), { cols: [2, 2, 1], gap: [0, 0], gapT: [0, 0], gapM: [24, 24], align: 'stretch', settings: { _title: 'Two halves', custom_css: 'selector { max-width: 1120px; }', _flex_order_mobile: 'custom', _flex_order_custom_mobile: 2, _margin: box(12, 0, 8, 0), _margin_mobile: box(20, 0, 0, 0) } }),
  row([
    button('Explore the SEED Lab', U.seed, 'green', { arrow: true }),
    button('Compare AI Platforms', U.platforms, 'ghostWhite', { arrow: true }),
  // On phones the buttons come straight after the intro line, before the two halves.
  ], { gap: 14, justify: 'center', settings: { width: auto, _flex_order_mobile: 'custom', _flex_order_custom_mobile: 1 } }),
], {
  pad: [104, 96], gap: 28, image: m.heroTower, imagePos: 'center center', title: 'Hero',
  overlay: L.overlayGradient('rgba(14,42,58,0.72)', 'rgba(14,42,58,0.96)'),
  settings: {
    flex_align_items: 'center', flex_justify_content: 'center',
    min_height: px(780), min_height_tablet: px(640), min_height_mobile: px(0),
    padding_mobile: box(36, 20, 48, 20), flex_gap_mobile: gap(18),
    background_position: 'initial', background_xpos: px(50, '%'), background_ypos: px(30, '%'),
  },
});

/* ------------------------------------------------- value proposition */
const valueProp = (m) => band([
  B.head(m, 'Platform analysis', 'Objective platform analysis, grounded in production reality.',
    'AI decisions need evidence you can reproduce. Generic \u201cgolden tenants\u201d show that a feature exists. They can\u2019t show how a platform handles multi-step prompts, cross-app workflows, or compliance controls under real enterprise conditions, or what each run costs.',
    { maxW: 820 }),
  B.numberedCards([
    ['Enterprise Apps', 'See how AI agents perform inside the CRM, ERP, service, and collaboration apps you run.', 'Explore Enterprise Apps', U.apps],
    ['AI Platforms', 'Side-by-side quality, cost-per-task, and governance analysis across the leading enterprise AI platforms.', 'Explore AI Platforms', U.platforms],
    ['SEED Environment', 'Synthetic Enterprise Environment Data: our live lab of vendor tenants, Recco-Tuned hydration, and FinOps telemetry.', 'Explore SEED', U.seed],
  ]),
], { bg: C.white, gap: 56, anchor: 'platform-analysis', title: 'Value proposition' });

/* --------------------------------------------------------- SEED overview */
const seedOverview = (m) => B.seedBand(m, {
  label: 'SEED Lab', title: 'Powered by SEED: Synthetic Enterprise Environment Data',
  sub: 'The independent proving ground for enterprise AI.',
  body: 'Live enterprise-tier vendor tenants, Recco-Tuned data hydration, and our own OpenTelemetry-based cost instrumentation. Live for 16+ months and running 5,800+ prompts a month, SEED produces repeatable benchmarks you can defend.',
  cta: 'Discover How SEED Works', url: U.seed, anchor: 'seed-lab',
});

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
  small(n, 15, C.grayText, { family: SERIF, ls: 0.9, settings: { _element_width: 'initial', _element_custom_width: px(64), _element_custom_width_mobile: px(30), _flex_size: 'none', _padding: box(6, 0, 0, 0) } }),
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
      H2('Two practices. One standard of empirical evidence. Reconnaissance and Recommendations.', C.navy, { ls: -0.46 }),
      text('Enterprise Application Reconnaissance proves what software actually delivers before you allocate budget. Generative AI Platform Recommendations provide benchmarked model deployment, hallucination testing, and predictive FinOps governance. Every engagement is scoped directly to the technical decision in front of you.'),
      image(m.dome, { width: px(100, '%'), height: [414, 380, 260], radius: 4, settings: { _margin: box(20, 0, 0, 0), _margin_mobile: box(8, 0, 0, 0) } }),
    ], { gap: 18 }),
    stack(SERVICE_GROUPS.map(([label, items]) => stack([
      L.eyebrowText(label),
      stack(items.map(serviceRow), { gap: 0, settings: { border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.line } }),
    ], { gap: 14, settings: { _title: label } })), { gap: 44, settings: { flex_gap_mobile: gap(36) } }),
  ], { cols: [2, 1, 1], gap: [72, 56], gapT: [56, 56], gapM: [40, 40], align: 'stretch' }),
], { anchor: 'services', title: 'Services' });

/* ------------------------------------------------------------- platforms */
// White background per Eric's Markup note (10 Nov 2026); a hairline separates it from Services.
const platforms = (m) => band([
  stack([
    eyebrow(m, 'Platform expertise'),
    H2('Deep on the platforms that run the enterprise.', C.navy, { sizes: [40, 34, 28], lh: 1.12 }),
  ], { gap: 14, maxW: 640 }),
  P.aiGroup(m),
  P.appRows(m),
], {
  pad: [88, 88], gap: 48, gapM: 36, bg: C.white, anchor: 'platforms', title: 'Platforms',
  settings: { border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.line },
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
    title: 'Updated daily', header_size: 'p', title_color: C.grayText, ...typo('typography', SANS, 13, 500, { lh: 1.4 }),
    __dynamic__: { title: `[elementor-tag id="${id()}" name="current-date-time" settings="${dateSettings}"]` },
    _element_width: 'auto',
  }),
], { gap: 10, nowrap: true, settings: { width: auto, width_tablet: auto, width_mobile: auto, _flex_size: 'none', padding: box(0, 0, 6, 0) } });

// The list is an Elementor Pro Loop Grid over the "AI Updates" posts (newest first). Each row is the
// "Recco News Item" loop template: vendor logo (featured image) + headline (post title). The news app
// publishes the posts; see news-seed.cjs.
const tag = (name) => `[elementor-tag id="${id()}" name="${name}" settings="%7B%7D"]`;
const newsItemTemplate = () => [container({
  container_type: 'grid', content_width: 'full', padding: box(22, 0, 22, 0), padding_mobile: box(18, 0, 18, 0),
  grid_columns_grid: { unit: 'custom', size: '128px minmax(0,1fr)' }, grid_columns_grid_tablet: { unit: 'custom', size: '112px minmax(0,1fr)' },
  grid_columns_grid_mobile: { unit: 'custom', size: '92px minmax(0,1fr)' },
  grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto,
  grid_gaps: gap(24), grid_gaps_mobile: gap(16), grid_align_items: 'center',
  border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.line,
  custom_css: 'selector { height: 100%; }',
  _title: 'News row',
}, [
  widget('theme-post-featured-image', {
    __dynamic__: { image: tag('post-featured-image') }, image_size: 'medium', align: 'left',
    width: px(120), width_tablet: px(104), width_mobile: px(88), height: px(40), height_mobile: px(32),
    object_fit: 'contain', 'object-fit': 'contain', object_position: 'center left', _title: 'Vendor logo',
  }),
  widget('theme-post-title', {
    __dynamic__: { title: tag('post-title') }, header_size: 'h3', title_color: C.navy, _title: 'Headline',
    ...typo('typography', SERIF, [19, 18, 17], 400, { lh: 1.4 }),
    custom_css: 'selector .elementor-heading-title { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }',
  }),
])];

const news = (m) => band([
  row([
    stack([
      eyebrow(m, 'What\u2019s new in AI'),
      H2('The latest from the platforms our clients run on.', C.navy, { ls: -0.46 }),
    ], { gap: 14, maxW: 640 }),
    updated,
  ], { justify: 'space-between', align: 'flex-end', gap: 32, rowGap: 20, settings: { flex_align_items_mobile: 'flex-start' } }),
  widget('loop-grid', {
    _skin: 'post', template_id: m.news.templateId,
    posts_per_page: 6, columns: 2, columns_tablet: 2, columns_mobile: 1,
    column_gap: px(56), column_gap_tablet: px(32), column_gap_mobile: px(0), row_gap: px(0), row_gap_tablet: px(0), row_gap_mobile: px(0),
    post_query_post_type: 'post', post_query_include: ['terms'], post_query_include_term_ids: [String(m.news.categoryId)],
    post_query_orderby: 'post_date', post_query_order: 'desc',
    nothing_found_message_text: 'Today\u2019s platform updates are on their way. Check back shortly.',
    nothing_found_message_color: C.grayText, ...typo('nothing_found_message_typography', SANS, 15, 400, { lh: 1.5 }),
    // Top rule over the first row of each column (one column on phones).
    custom_css: [
      'selector .e-loop-item:nth-child(-n+2) > .e-con { border-top: 1px solid #DFE6EA; }',
      '@media (max-width: 767px) { selector .e-loop-item:nth-child(2) > .e-con { border-top: 0; } }',
    ].join('\n'),
    _title: 'AI updates feed',
  }),
], { bg: C.white, gap: 40, anchor: 'news', title: 'AI News', settings: { border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.line } });

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
    ...(m.team.sizes ? {
      background_image_tablet: { id: m.team.id, url: m.team.sizes.tablet, size: '1536x1536', alt: '', source: 'library' },
      background_image_mobile: { id: m.team.id, url: m.team.sizes.mobile, size: 'large', alt: '', source: 'library' },
    } : {}),
    background_position: 'initial', background_xpos: px(55, '%'), background_ypos: px(25, '%'), _title: 'About photo',
  }),
  container({
    content_width: 'full', flex_direction: 'column', flex_justify_content: 'center',
    padding: box(96, 32, 96, 72), padding_tablet: box(72, 32, 72, 32), padding_mobile: box(56, 20, 56, 20),
  }, [
    stack([
      eyebrow(m, 'About Recco', { dark: true }),
      H2('Reconnaissance first, then recommendations. That\u2019s what our name means.', C.white, { sizes: [50, 40, 32], lh: 1.08, ls: -0.6 }),
      text('Founded in Seattle in 2006 by Eric Pozil, Recco gives technology leaders an independent second opinion. Our consultants average 20 years of experience. Today our SEED lab applies that judgment to enterprise AI.', { color: 'rgba(255,255,255,0.8)', size: 16.5 }),
    ], { gap: 22, maxW: 640 }),
  ]),
]);

/* --------------------------------------------------------- sustainability */
// Facts come from the RyeStrategy Emissions Reduction Program 2026 banner; update yearly.
const sustainability = (m) => band([
  grid([
    stack([
      eyebrow(m, 'Sustainability'),
      H2('Sustainability progress', C.navy, { ls: -0.46 }),
      text('Recco Consulting takes part in RyeStrategy\u2019s Emissions Reduction Program. Our 2026 progress is validated at Level 1 \u00b7 Action.'),
      B.checkList([
        'Calculated previous year\u2019s Scope 1 & 2 emissions',
        'Formed an internal sustainability committee to implement mitigation strategies',
      ], { color: C.navy }),
    ], { gap: 18 }),
    image(m.erpBanner, { width: px(100, '%'), align: 'center', settings: { _title: 'ERP banner' } }),
  ], { cols: ['minmax(0,0.85fr) minmax(0,1.15fr)', 1, 1], gap: [64, 40], gapT: [40, 40], gapM: [28, 28], align: 'center' }),
], { bg: C.tint, anchor: 'sustainability', title: 'Sustainability' });

/* -------------------------------------------------------------- approach */
const step = ([n, title, body]) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(14), padding: box(36, 28, 36, 28), padding_mobile: box(28, 20, 28, 20),
  background_background: 'classic', background_color: C.white, background_hover_background: 'classic', background_hover_color: C.tint,
  _title: `Step ${n}`,
}, [
  small(n, 14, C.greenText, { family: SERIF, ls: 1.4 }),
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
], { pad: [96, 0], gap: 56, gapM: 36, bg: C.tint, anchor: 'approach', title: 'How we work' });

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
    field('topic', 'select', 'Topic', '', '50', { field_options: 'AI platform evaluation\nSEED Lab briefing\nAI Services\nEnterprise App Services\nSomething else' }),
    field('message', 'textarea', 'How can we help?', 'A sentence or two is plenty.', '100', { rows: 3 }),
    field('website', 'honeypot', '', '', '100'),
  ],
  show_labels: 'true', input_size: 'md', button_text: 'Send message', button_size: 'md',
  button_width: '100', button_align: 'start', selected_button_icon: fa('fas fa-arrow-right'), button_icon_align: 'right', button_icon_indent: px(10),
  submit_actions: ['email'], email_subject: 'New enquiry from the Recco Consulting website', email_from_name: 'Recco Consulting website',
  success_message: 'Thanks. Your message has been sent.',
  column_gap: px(24), row_gap: px(22), label_spacing: px(8),
  label_color: C.grayText, ...typo('label_typography', SANS, 12, 700, { lh: 1.3, ls: 1.2, transform: 'uppercase' }),
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
      text('Your first consultation is complimentary. Tell us what you\u2019re evaluating.'),
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
      text('Protected against automated submissions. We never share your details.', { color: C.grayText, size: 12.5, lh: 1.5 }),
    ]),
  ], { cols: [2, 1, 1], gap: [72, 56], gapT: [48, 48], gapM: [36, 36], align: 'center', settings: { _z_index: 1 } }),
], {
  image: m.officeBokeh, bg: C.white, anchor: 'contact', title: 'Contact',
  overlay: L.overlayColor('rgba(255,255,255,0.95)'),
  settings: { custom_css: 'selector::before { -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); }' },
});

module.exports = {
  newsItemTemplate,
  slug: 'home', title: 'Home',
  // Meta description (V3 copy doc). The Hello theme prints the page excerpt as <meta name="description">.
  meta: 'Recco tests Copilot, ChatGPT, Gemini, Claude, Glean, and Perplexity in live enterprise tenants, measuring real performance and true cost per task.',
  build: (m) => [hero(m), news(m), approach(m), valueProp(m), seedOverview(m), services(m), platforms(m), about(m), sustainability(m), contact(m)],
};
