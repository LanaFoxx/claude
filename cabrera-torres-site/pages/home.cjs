// Home page: the full Claude Design one-pager (hero, recognition strip, results, about, quote,
// practice areas, testimonials, FAQ, resources, contact).
const L = require('../lib.cjs');
const P = require('../parts.cjs');
const CONTENT = require('../content.json');
const { C, px, box, gap, auto, container, widget, fa, band, stack, row, grid, eyebrow, heading, H2, H3, text, button, image, iconList, glass, URL } = L;

/* ------------------------------------------------------------------ hero */
const hero = (m) => container({
  content_width: 'boxed', boxed_width: px(1216), container_type: 'grid',
  grid_columns_grid: { unit: 'custom', size: 'minmax(0,5fr) minmax(0,6fr)' }, grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
  grid_rows_grid: L.auto, grid_rows_grid_tablet: L.auto, grid_rows_grid_mobile: L.auto,
  grid_gaps: gap(40, 0), grid_align_items: 'end', min_height: px(640), min_height_tablet: px(0), min_height_mobile: px(0),
  padding: box(0, 32, 0, 32), padding_mobile: box(0, 20, 0, 20),
  background_background: 'classic', background_color: C.black, ...L.patternOverlay(m.pattern), overflow: 'hidden',
  custom_css: 'selector { background-image: radial-gradient(ellipse at 70% 40%, #262A2C 0%, #1E2123 60%); }',
}, [
  // dimmed emblem watermark behind the portrait
  image(m.emblem, {
    width: 720, settings: {
      _position: 'absolute', _element_width: 'initial', _element_custom_width: px(720), _element_custom_width_mobile: px(420), _z_index: 0,
      _offset_orientation_h: 'start', _offset_x: px(14, '%'), _offset_orientation_v: 'start', _offset_y: px(50, '%'),
      custom_css: 'selector { transform: translate(-50%, -50%); pointer-events: none; max-width: 90vw; }\nselector img { opacity: .05; } /* translucent so the gold pattern shows through */',
    },
  }),
  container({
    content_width: 'full', flex_direction: 'column', flex_justify_content: 'flex-end', flex_align_items: 'center',
    padding: box(56, 0, 0, 0), padding_tablet: box(16, 0, 0, 0), padding_mobile: box(16, 0, 0, 0),
    min_height: px(520), min_height_tablet: px(0), min_height_mobile: px(0), _flex_size: 'none',
    _flex_order_tablet: 'end', _flex_order_mobile: 'end', // stacked layouts: copy first, portrait below
    z_index: 1,
  }, [
    image(m.jennifer, {
      width: { unit: '%', size: 100, sizes: [] }, settings: {
        _element_width: 'inherit',
        custom_css: 'selector img { width: 100%; max-height: 640px; object-fit: contain; object-position: bottom; display: block; }\n@media (max-width: 1024px) { selector img { max-height: 520px; } }',
      },
    }),
  ]),
  stack([
    eyebrow('Personal Injury Lawyer · Norcross, Georgia', C.goldLight, 'left', { tag: 'h1', alignM: 'center' }),
    heading(`People First.<br>${L.accent('Justice Always.', C.goldLight)}`, 'p', [68, 56, 42], C.cream, 'left', { lh: 1.12, ls: 0.01, alignM: 'center', settings: { _margin: box(4, 0, 10, 0) } }),
    text('We have the experience to help injured clients get the most ideal outcome possible. Car wrecks, truck collisions, dog bites and falls, handled personally from start to finish.',
      { color: C.paper, size: 17, maxW: 460, alignM: 'center', settings: { _margin: box(0, 0, 18, 0) } }),
    row([
      button('Free Case Evaluation', URL.contact, 'gold'),
      button(`Call ${L.PHONE}`, L.TEL, 'outline'),
    ], { gap: 16, settings: { flex_justify_content_tablet: 'center', flex_justify_content_mobile: 'center' } }),
    iconList(['No fee unless we win', 'Nearly 20 years of experience', 'Hablamos Español'], {
      inline: true, color: C.sand, size: 13, weight: 500, ls: 0.13, transform: 'uppercase', space: 18,
      settings: { _margin: box(26, 0, 0, 0), icon_align_tablet: 'center', icon_align_mobile: 'center' },
    }),
  ], { gap: 18, settings: { padding: box(90, 0, 110, 0), padding_tablet: box(40, 0, 20, 0), padding_mobile: box(40, 0, 10, 0), z_index: 1, flex_align_items_tablet: 'center', flex_align_items_mobile: 'center' } }),
], false);

/* ---------------------------------------------------- recognition strip */
const BADGES = ['National Trial Lawyers', 'State Bar of Georgia', 'Georgia Trial Lawyers Association', 'Best of Georgia', 'Best of Gwinnett'];
const trustStrip = () => container({
  content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', flex_align_items: 'stretch', flex_gap: gap(0), padding: box(0),
  background_background: 'classic', background_color: C.white,
  border_border: 'solid', border_width: box(3, 0, 0, 0), border_color: C.gold, overflow: 'hidden',
}, [
  container({
    content_width: 'full', width: auto, _flex_size: 'none', flex_justify_content: 'center', padding: box(22, 32, 22, 32), hide_mobile: 'hidden-mobile',
    border_border: 'solid', border_width: box(0, 1, 0, 0), border_color: C.rule, z_index: 1,
    background_background: 'classic', background_color: C.white,
  }, [eyebrow('Recognized by', C.goldDark, 'left', { size: 12 })]),
  container({
    content_width: 'full', _flex_size: 'grow', padding: box(22, 0, 22, 0), overflow: 'hidden', css_classes: 'ct-anim',
    custom_css: 'selector { -webkit-mask-image: linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent); mask-image: linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent); }',
  }, [
    iconList([...BADGES, ...BADGES], {
      inline: true, icon: 'fas fa-balance-scale', iconSize: 20, indent: 12, iconColor: C.gold, color: C.ink2, size: 15, weight: 500, ls: 0.08, transform: 'uppercase', space: 0,
      settings: {
        custom_css: `selector .elementor-icon-list-items { display: flex; flex-wrap: nowrap; width: max-content; animation: ct-marquee 28s linear infinite; }
selector .elementor-icon-list-item { white-space: nowrap; padding: 0 36px !important; margin: 0 !important; border-left: 1px solid rgba(30,33,35,.12); }
selector .elementor-icon-list-item::after { display: none !important; }`,
      },
    }),
  ]),
]);

/* ------------------------------------------------------------- results */
const RESULTS = [
  ['Truck collision', '$1.2M', 'A commercial truck struck our client, causing a shoulder injury that required surgery. We recovered $1.2 million from the trucking company for medical costs, pain and suffering, and lost earning ability.', -3, 0],
  ['Truck accident', '$550K', 'A tractor-trailer turned unlawfully into our client’s lane at a Gwinnett County intersection. Litigation and mediation produced a $550,000 settlement.', 1.5, 18],
  ['Rear-end crash', '$500K', 'A highway rear-end collision left our client with spinal damage and a cervical disc replacement. We secured $500,000 for recovery and lost income.', -1.5, 0],
];
const resultNote = ([type, amount, desc, tilt, drop]) => P.resultNote({ type, amount, desc }, tilt, drop);
const results = () => band(C.cream, [
  eyebrow('Case results', C.goldDark, 'center', { settings: { _margin: box(0, 0, 18, 0) } }),
  H2('Over $15 million', 'recovered for our clients', false),
  grid(RESULTS.map(resultNote), { cols: [3, 1, 1], gap: 40, rowGap: 64, align: 'start', settings: { margin: box(84, 0, 0, 0), padding: box(0, 0, 0, 0), padding_tablet: box(0, 60, 0, 60), padding_mobile: box(0, 4, 0, 4) } }),
  text('Prior results do not guarantee a similar outcome. Each case is different and is judged on its own facts.',
    { color: C.fine, size: 13, align: 'center', settings: { _margin: box(48, 0, 0, 0) } }),
], { anchor: 'results', align: 'center' });

/* --------------------------------------------------------------- about */
const sideText = (side) => {
  const run = Array.from({ length: 6 }, () => 'Advocate • Protect • Deliver').join('   •   ');
  const up = side === 'left';
  return heading(`${run}   •   ${run}`, 'div', 48, 'rgba(163,133,76,0.12)', 'left', {
    lh: 1.67, ls: 0.06, settings: {
      typography_text_transform: 'uppercase', hide_tablet: 'hidden-tablet', hide_mobile: 'hidden-mobile', css_classes: 'ct-anim',
      _position: 'absolute', _element_width: 'initial', _element_custom_width: px(80), _z_index: 0,
      _offset_orientation_h: up ? 'start' : 'end', _offset_x: px(0), _offset_x_end: px(0), _offset_orientation_v: 'start', _offset_y: px(0),
      custom_css: `selector { height: 100%; overflow: hidden; pointer-events: none; user-select: none; }
selector .elementor-heading-title { writing-mode: vertical-rl; white-space: nowrap; ${up ? 'transform: rotate(180deg);' : ''} animation: ${up ? 'ct-up' : 'ct-down'} 90s linear infinite; }`,
    },
  });
};
const numberedRow = (n, h, p, last) => container({
  container_type: 'grid', content_width: 'full', grid_columns_grid: { unit: 'custom', size: '64px 1fr' }, grid_columns_grid_tablet: { unit: 'custom', size: '64px 1fr' }, grid_columns_grid_mobile: { unit: 'custom', size: '48px 1fr' },
  grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_gaps: gap(20), grid_align_items: 'start', padding: box(26, 0, 26, 0),
  border_border: 'solid', border_width: box(1, 0, last ? 1 : 0, 0), border_color: 'rgba(163,133,76,0.3)',
}, [
  heading(n, 'p', 28, C.gold, 'left', { lh: 1, ls: 0 }),
  stack([H3(h, C.cream, [22, 22, 20]), text(p, { color: C.paper })], { gap: 8 }),
]);
const about = (m) => band(C.black, [
  sideText('left'), sideText('right'),
  eyebrow('Meet your attorney', C.goldLight, 'center', { settings: { _margin: box(0, 0, 18, 0) } }),
  H2('Jennifer Cabrera-Torres', 'treats every case like it’s personal', true, 'center', { maxW: 820, settings: { _element_width_mobile: 'inherit' } }),
  grid([
    container({ content_width: 'full', padding: box(0), min_height: px(720), min_height_tablet: px(520), min_height_mobile: px(420), overflow: 'hidden' }, [
      image(m.jenArms, {
        settings: {
          _position: 'absolute', _offset_orientation_h: 'start', _offset_x: px(0), _offset_orientation_v: 'start', _offset_y: px(0), _element_width: 'initial', _element_custom_width: px(100, '%'),
          custom_css: 'selector { height: 100%; }\nselector .elementor-widget-container { height: 100%; }\nselector img { width: 100%; height: 100%; object-fit: cover; object-position: center top; } /* background removed, so the gold pattern shows behind her */',
        },
      }),
    ]),
    stack([
      container({ content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(0) }, [
        numberedRow('01', CONTENT.home.a1h, CONTENT.home.a1p), numberedRow('02', CONTENT.home.a2h, CONTENT.home.a2p), numberedRow('03', CONTENT.home.a3h, CONTENT.home.a3p, true),
      ]),
      button('Meet Jennifer', URL.jennifer, 'outline', { pad: box(14, 26, 14, 26), settings: { _margin: box(40, 0, 0, 0) } }),
    ], { gap: 0, settings: { padding: box(40, 48, 90, 20), padding_tablet: box(40, 0, 90, 0), padding_mobile: box(24, 0, 70, 0) } }),
  ], { cols: [2, 1, 1], gap: 0, rowGap: 0, align: 'stretch', settings: { margin: box(48, 0, 0, 0) } }),
], { anchor: 'about', align: 'center', pattern: m.pattern, pad: [110, 0] });

/* ---------------------------------------------------------- quote band */
const quote = () => container({
  content_width: 'boxed', boxed_width: px(1216), container_type: 'grid',
  grid_columns_grid: { unit: 'custom', size: 'minmax(0,1fr) auto' }, grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
  grid_rows_grid: L.auto, grid_rows_grid_tablet: L.auto, grid_rows_grid_mobile: L.auto, grid_gaps: gap(40, 28), grid_align_items: 'center',
  padding: box(64, 32, 64, 32), padding_mobile: box(52, 20, 52, 20),
  background_background: 'classic', background_color: C.panel,
  border_border: 'solid', border_width: box(1, 0, 1, 0), border_color: C.goldLine,
}, [
  stack([
    // Break after "personal," so the second line is never a lone "is." (collapses on phones).
    text('<p>“Treat every case like it’s personal,<br class="ct-br"> because for me, it is.”</p>', { color: C.cream, size: [40, 34, 28], weight: 300, lh: 1.3, settings: { custom_css: '@media (max-width: 767px) { selector .ct-br { display: none; } }' } }),
    eyebrow('Jennifer Cabrera-Torres, Esq.', C.gold, 'left', { size: 15, ls: 0.2 }),
  ], { gap: 14 }),
  button('Free Case Evaluation', URL.contact, 'gold', { pad: box(18, 34, 18, 34), align: 'right', settings: { align_tablet: 'left', align_mobile: 'left' } }),
], false);

/* ------------------------------------------------------- practice areas */
const AREAS = [
  ['Motor Vehicle Accidents', 'Crashes are the most common cause of serious injury in Georgia. We investigate fault, deal with the insurers so you don’t have to, and pursue every available policy, including your own underinsured coverage.',
    ['Car accidents', 'Truck & tractor-trailer', 'Motorcycle accidents', 'Pedestrian & bicycle', 'Uber & Lyft rideshare', 'Drunk driving victims', 'Hit-and-run', 'Reckless driving'], 'mva'],
  ['Dog Bites', 'Georgia holds owners responsible when they knew their dog was dangerous or let it run loose in violation of a local leash ordinance. Bites often mean scarring, infection and lasting trauma, especially for children.',
    ['Facial injuries & scarring', 'Infections & surgery', 'Injuries to children', 'Homeowner’s insurance claims', 'Attacks on another’s property', 'Emotional trauma'], 'dog'],
  ['Slip & Fall', 'Property owners must keep their premises reasonably safe. When a wet floor, broken stair or poor lighting causes a fall, the business’s commercial liability insurance is where the claim goes.',
    ['Wet floors in stores', 'Parking lots & sidewalks', 'Stairs & railings', 'Negligent security', 'Apartment complexes', 'Fractures & head injuries'], 'fall'],
  ['Catastrophic Injury & Wrongful Death', 'When an injury changes a life or ends one, the claim has to account for the whole future: lifetime care, lost income, and the full value of a life.',
    ['Traumatic brain injury', 'Spinal cord injuries', 'Severe burns', 'Amputations', 'Wrongful death', 'Lost earning capacity'], null],
];
const plusList = (items, solo) => P.plusList(items, solo ? { width: 520 } : {});
const areaPanel = (m) => ([name, desc, items, key]) => {
  const solo = !key;
  const copy = stack([
    H3(name, C.black, [34, 30, 26], { lh: 1.1, align: solo ? 'center' : 'left', settings: { _margin: box(0, 0, 2, 0) } }),
    text(desc, { color: C.body, align: solo ? 'center' : 'left', settings: { _margin: box(0, 0, 8, 0) } }),
    plusList(items, solo),
    button('Talk to us about your case', URL.contact, 'underline', { align: solo ? 'center' : 'left', settings: { _margin: box(12, 0, 0, 0) } }),
  ], { gap: 14, align: solo ? 'center' : undefined });
  if (solo) return container({ content_width: 'full', flex_direction: 'column', flex_align_items: 'center', padding: box(56, 0, 0, 0), width: px(760), width_tablet: px(100, '%'), width_mobile: px(100, '%') }, [copy]);
  return container({
    container_type: 'grid', content_width: 'full', padding: box(56, 0, 0, 0), padding_mobile: box(36, 0, 0, 0),
    grid_columns_grid: { unit: 'custom', size: 'minmax(0,1.5fr) minmax(0,1fr)' }, grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
    grid_rows_grid: L.auto, grid_rows_grid_tablet: L.auto, grid_rows_grid_mobile: L.auto, grid_gaps: gap(60, 48), grid_align_items: 'center',
    width: px(1040), width_tablet: px(100, '%'), width_mobile: px(100, '%'),
  }, [
    copy,
    image(m[`area_${key}`], {
      settings: {
        _background_background: 'classic', _background_color: C.white, _padding: box(14),
        _element_width_tablet: 'initial', _element_custom_width_tablet: px(420), _element_custom_width_mobile: px(100, '%'),
        custom_css: 'selector { transform: rotate(2deg); box-shadow: 0 30px 60px rgba(30,33,35,.12); margin-left: auto; margin-right: auto; }\nselector img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; display: block; }',
      },
    }),
  ]);
};
const practice = (m) => band(C.cream, [
  eyebrow('Practice areas', C.goldDark, 'center', { settings: { _margin: box(0, 0, 18, 0) } }),
  H2('Personal injury,', 'focused and thorough', false, 'center', { maxW: 640, settings: { _element_width_mobile: 'inherit' } }),
  text('When someone else’s carelessness causes an injury, Georgia law lets you demand financial accountability. We prepare every case as if it will go to trial, which is exactly why most settle well.',
    { color: C.body, align: 'center', maxW: 640, settings: { _margin: box(24, 0, 0, 0) } }),
  {
    id: L.id(), elType: 'widget', widgetType: 'nested-tabs',
    settings: {
      tabs: AREAS.map(([name]) => ({ _id: L.id(), tab_title: name })),
      tabs_direction: 'block-start', tabs_justify_horizontal: 'center', title_alignment: 'center',
      breakpoint_selector: 'mobile', tabs_title_space_between: px(12), tabs_title_spacing: px(0),
      ...L.typo('title_typography', 12, 500, { lh: 1.2, ls: 0.16, transform: 'uppercase' }),
      title_text_color: C.black, title_text_color_hover: C.black, title_text_color_active: C.goldLight,
      tabs_title_background_color_background: 'classic', tabs_title_background_color_color: 'rgba(0,0,0,0)',
      tabs_title_background_color_hover_background: 'classic', tabs_title_background_color_hover_color: 'rgba(30,33,35,0.04)',
      tabs_title_background_color_active_background: 'classic', tabs_title_background_color_active_color: C.black,
      tabs_title_border_border: 'solid', tabs_title_border_width: box(1), tabs_title_border_color: 'rgba(30,33,35,0.25)',
      tabs_title_border_hover_border: 'solid', tabs_title_border_hover_width: box(1), tabs_title_border_hover_color: C.black,
      tabs_title_border_active_border: 'solid', tabs_title_border_active_width: box(1), tabs_title_border_active_color: C.black,
      tabs_title_border_radius: box(999), padding: box(14, 24, 14, 24),
      box_background_color_background: 'classic', box_background_color_color: 'rgba(0,0,0,0)', box_border_border: 'none', box_padding: box(0),
      _margin: box(48, 0, 0, 0),
      custom_css: 'selector .e-n-tabs-heading { flex-wrap: wrap; row-gap: 12px; }\nselector .e-n-tab-title { white-space: nowrap; }',
    },
    elements: AREAS.map((a) => container({ content_width: 'full', flex_direction: 'column', flex_align_items: 'center', padding: box(0) }, [areaPanel(m)(a)])),
  },
], { anchor: 'practice', align: 'center' });

/* --------------------------------------------------------- testimonials */
const REVIEWS = [
  ['From the beginning to the end I felt heard, and that my best interests were being looked after. Thank you to the wonderful staff.', 'Carlos C. · Google'],
  ['Considerate, caring, and accessible. Great attorneys that will fight for you and get you what you deserve.', 'Ed C. · Google'],
  ['I would recommend them to everyone looking for a professional, reliable, and client-focused team. Simply the best.', 'Google reviewer · Google'],
];
const testimonials = (m) => band(C.black, [
  eyebrow('Client testimonials', C.goldLight, 'center', { settings: { _margin: box(0, 0, 18, 0) } }),
  H2('Our clients', 'said it best', true),
  grid(REVIEWS.map(([q, who]) => glass([
    text('★★★★★', { color: C.goldLight, size: 24, ls: 0.12, lh: 1 }),
    text(`“${q}”`, { color: C.cream, size: 21, weight: 300, lh: 1.4, settings: { _flex_size: 'grow' } }),
    eyebrow(who, C.sand, 'left', { size: 12, ls: 0.2 }),
  ], { gap: 18 })), { cols: [3, 1, 1], gap: 24, settings: { margin: box(64, 0, 0, 0) } }),
], { anchor: 'testimonials', align: 'center', pattern: m.pattern });

/* ------------------------------------------------------------------ faq */
const faqAccordion = () => P.faqAccordion(CONTENT.faqs.slice(0, 5));
const faq = () => band(C.cream, [
  grid([
    stack([
      eyebrow('FAQ', C.goldDark),
      H2('Questions injured people', 'ask us most', false, 'left', { sizes: [54, 44, 34] }),
      text('Plain answers about Georgia personal injury claims. Every case is different, so call us for advice specific to yours.', { color: C.body, settings: { _margin: box(6, 0, 0, 0) } }),
    ], { gap: 18 }),
    faqAccordion(),
  ], { cols: ['minmax(0,1fr) minmax(0,1.6fr)', 1, 1], gap: 60, rowGap: 40, align: 'center' }),
], { anchor: 'faq' });

/* ---------------------------------------------------------------- blog */
const blog = (m) => band(C.white, [
  eyebrow('Legal resources', C.goldDark, 'left', { settings: { _margin: box(0, 0, 18, 0) } }),
  H2('Know your rights', 'after an accident', false, 'left', { sizes: [54, 44, 34] }),
  grid(CONTENT.articles.slice(0, 3).map((a) => P.blogCard(m, a, { gap: 18, hSizes: [26, 24, 22], pColor: C.slate })),
    { cols: [3, 1, 1], gap: 32, rowGap: 48, align: 'start', settings: { margin: box(56, 0, 0, 0) } }),
], { anchor: 'blog', settings: { border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: 'rgba(30,33,35,0.08)' } });

/* ------------------------------------------------------------- contact */
const contact = (m) => band(C.black, [
  P.emblem(m, 620, { _offset_orientation_h: 'start', _offset_x: px(-160), _offset_orientation_v: 'end', _offset_y_end: px(-80), hide_mobile: 'hidden-mobile' }),
  grid([
    stack([
      eyebrow('Free case evaluation', C.goldLight),
      H2('Injured?', 'Call Jen.', true, 'left', { br: true }),
      text('Tell us what happened. We respond quickly, keep everything confidential, and you pay nothing unless we recover for you.', { color: C.paper, maxW: 440, settings: { _margin: box(6, 0, 22, 0) } }),
      P.phoneDetail(), P.emailDetail(),
      P.detail('Norcross office', text(`<p>${L.ADDRESS}</p>`, { color: C.sand, size: 15 })),
    ], { gap: 18 }),
    P.contactForm(4),
  ], { cols: ['minmax(0,1fr) minmax(0,1.2fr)', 1, 1], gap: 60, rowGap: 48, align: 'start', settings: { z_index: 1 } }),
], { anchor: 'contact', pattern: m.pattern });

module.exports = {
  slug: 'home', title: 'Home',
  seo: {
    title: 'Personal Injury Lawyer Norcross, GA | Cabrera-Torres Law Firm',
    description: 'Injured in Norcross or Gwinnett County? Attorney Jennifer Cabrera-Torres handles car, truck, dog bite and slip and fall cases. Free consultation.',
    focus: 'personal injury lawyer Norcross GA',
  },
  build: (m) => [hero(m), trustStrip(), results(), about(m), quote(), practice(m), testimonials(m), faq(), blog(m), contact(m)],
};
