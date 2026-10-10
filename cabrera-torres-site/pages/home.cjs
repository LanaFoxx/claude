// Home page: the full Claude Design one-pager (hero, recognition strip, results, about, quote,
// practice areas, testimonials, FAQ, resources, contact).
const L = require('../lib.cjs');
const { C, px, box, gap, auto, container, widget, fa, band, stack, row, grid, eyebrow, heading, H2, H3, text, button, image, iconList, glass } = L;

/* ------------------------------------------------------------------ hero */
const hero = (m) => container({
  content_width: 'boxed', boxed_width: px(1216), container_type: 'grid',
  grid_columns_grid: { unit: 'custom', size: 'minmax(0,5fr) minmax(0,6fr)' }, grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
  grid_rows_grid: L.auto, grid_rows_grid_tablet: L.auto, grid_rows_grid_mobile: L.auto,
  grid_gaps: gap(40, 0), grid_align_items: 'end', min_height: px(640), min_height_tablet: px(0), min_height_mobile: px(0),
  padding: box(0, 32, 0, 32), padding_mobile: box(0, 20, 0, 20),
  background_background: 'classic', background_color: C.black, ...L.patternOverlay(m.pattern), overflow: 'hidden',
  custom_css: 'selector { background-image: radial-gradient(ellipse at 70% 40%, #1C1A16 0%, #0B0B0B 60%); }',
}, [
  // dimmed emblem watermark behind the portrait
  image(m.emblem, {
    width: 720, settings: {
      _position: 'absolute', _element_width: 'initial', _element_custom_width: px(720), _element_custom_width_mobile: px(420), _z_index: 0,
      _offset_orientation_h: 'start', _offset_x: px(14, '%'), _offset_orientation_v: 'start', _offset_y: px(50, '%'),
      custom_css: 'selector { transform: translate(-50%, -50%); pointer-events: none; max-width: 90vw; }\nselector img { filter: brightness(.22) saturate(.7); }',
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
      button('Free Case Evaluation', '#contact', 'gold'),
      button(`Call ${L.PHONE}`, L.TEL, 'outline'),
    ], { gap: 16, settings: { flex_justify_content_tablet: 'center', flex_justify_content_mobile: 'center' } }),
    iconList(['No fee unless we win', 'Nearly 20 years of experience', 'Se habla español'], {
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
selector .elementor-icon-list-item { white-space: nowrap; padding: 0 36px !important; margin: 0 !important; border-left: 1px solid rgba(11,11,11,.12); }
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
// The gold "pin" holding each note is drawn on the first label with CSS, so the note stays plain editable widgets.
const PIN = `selector::before { content: ""; position: absolute; left: 50%; top: -70px; width: 22px; height: 22px; transform: translateX(-50%); border: 3px solid #8A6E2E; border-bottom: 0; border-radius: 11px 11px 0 0; box-sizing: border-box; }
selector::after { content: ""; position: absolute; left: 50%; top: -54px; width: 52px; height: 24px; transform: translateX(-50%); background: linear-gradient(180deg,#E2C27A,#B8873A 55%,#8A6E2E); clip-path: polygon(0 100%,14% 0,86% 0,100% 100%); filter: drop-shadow(0 3px 6px rgba(11,11,11,.25)); }`;
const resultNote = ([type, amount, desc, tilt, drop]) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(0), padding: box(44, 34, 40, 34), padding_mobile: box(40, 26, 34, 26),
  background_background: 'classic', background_color: C.white, overflow: 'visible',
  margin: box(drop, 0, 0, 0), margin_tablet: box(0), margin_mobile: box(0),
  custom_css: `selector { transform: rotate(${tilt}deg); box-shadow: 0 1px 0 rgba(11,11,11,.06), 0 24px 40px -18px rgba(11,11,11,.35), 0 10px 18px -10px rgba(11,11,11,.2); }`,
}, [
  eyebrow(type, C.goldDark, 'center', { size: 12, ls: 0.26, settings: { _margin: box(0, 0, 14, 0), custom_css: PIN } }),
  heading(amount, 'h3', [58, 54, 50], C.black, 'center', { lh: 1.1, ls: 0 }),
  eyebrow('Compensation', C.black, 'center', { size: 12, settings: { _margin: box(8, 0, 20, 0) } }),
  text(desc, { color: C.ink2, size: 16 }),
]);
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
  return heading(`${run}   •   ${run}`, 'div', 48, 'rgba(201,162,74,0.12)', 'left', {
    lh: 1.67, ls: 0.06, settings: {
      typography_text_transform: 'uppercase', hide_tablet: 'hidden-tablet', hide_mobile: 'hidden-mobile', css_classes: 'ct-anim',
      _position: 'absolute', _element_width: 'initial', _element_custom_width: px(80), _z_index: 0,
      _offset_orientation_h: up ? 'start' : 'end', _offset_x: px(0), _offset_x_end: px(0), _offset_orientation_v: 'start', _offset_y: px(0),
      custom_css: `selector { height: 100%; overflow: hidden; pointer-events: none; user-select: none; }
selector .elementor-heading-title { writing-mode: vertical-rl; white-space: nowrap; ${up ? 'transform: rotate(180deg);' : ''} animation: ${up ? 'ct-up' : 'ct-down'} 90s linear infinite; }`,
    },
  });
};
const aboutCard = (icon, title, body) => glass([
  widget('icon', { selected_icon: fa(icon), primary_color: C.cream, size: px(40), align: 'left', _margin: box(0, 0, 22, 0) }),
  H3(title, C.goldLight, [24, 24, 22], { settings: { _margin: box(0, 0, 12, 0) } }),
  text(body, { color: C.paper }),
]);
const about = (m) => band(C.black, [
  sideText('left'), sideText('right'),
  eyebrow('Meet your attorney', C.goldLight, 'center', { settings: { _margin: box(0, 0, 18, 0) } }),
  H2('Jennifer Cabrera-Torres', 'treats every case like it’s personal', true, 'center', { maxW: 820, settings: { _element_width_mobile: 'inherit' } }),
  grid([
    aboutCard('fas fa-balance-scale', 'Nearly two decades in injury law', 'Jennifer spent more than 15 years as a personal injury paralegal before becoming an attorney and managing partner. She has recovered millions for clients and tried multiple cases to verdict.'),
    aboutCard('fas fa-home', 'Raised in Gwinnett County', 'Born in Atlanta to immigrant parents and the first in her family to finish college and law school. She fights for people who are too often overlooked or underestimated.'),
    aboutCard('far fa-comments', 'Bilingual, hands-on representation', 'Fluent in Spanish, Jennifer handles your case herself. If you can’t come to us, we come to you, at home or in the hospital.'),
  ], { cols: [3, 1, 1], gap: 24, settings: { margin: box(64, 0, 0, 0), padding: box(0, 72, 0, 72), padding_tablet: box(0, 40, 0, 40), padding_mobile: box(0) } }),
], { anchor: 'about', align: 'center', pattern: m.pattern, pad: [110, 110] });

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
    text('“Treat every case like it’s personal, because for me, it is.”', { color: C.cream, size: [30, 26, 22], weight: 300, lh: 1.35 }),
    eyebrow('Jennifer Cabrera-Torres, Esq.', C.gold, 'left', { size: 12, ls: 0.2 }),
  ], { gap: 14 }),
  button('Free Case Evaluation', '#contact', 'gold', { pad: box(18, 34, 18, 34), align: 'right', settings: { align_tablet: 'left', align_mobile: 'left' } }),
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
const plusList = (items, solo) => iconList(items, {
  icon: 'fas fa-plus', iconSize: 9, indent: 10, iconColor: C.gold, color: C.ink2, size: 15, weight: 300, space: 0,
  settings: {
    ...(solo ? { _element_width: 'initial', _element_custom_width: px(520), _element_custom_width_mobile: px(100, '%') } : {}),
    custom_css: `selector .elementor-icon-list-items { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 24px; }
selector .elementor-icon-list-item { margin: 0 !important; padding: 0 !important; align-items: center !important; }
@media (max-width: 767px) { selector .elementor-icon-list-items { grid-template-columns: 1fr; } }`,
  },
});
const areaPanel = (m) => ([name, desc, items, key]) => {
  const solo = !key;
  const copy = stack([
    H3(name, C.black, [34, 30, 26], { lh: 1.1, align: solo ? 'center' : 'left', settings: { _margin: box(0, 0, 2, 0) } }),
    text(desc, { color: C.body, align: solo ? 'center' : 'left', settings: { _margin: box(0, 0, 8, 0) } }),
    plusList(items, solo),
    button('Talk to us about your case', '#contact', 'underline', { align: solo ? 'center' : 'left', settings: { _margin: box(12, 0, 0, 0) } }),
  ], { gap: 14, align: solo ? 'center' : undefined });
  if (solo) return container({ content_width: 'full', flex_direction: 'column', flex_align_items: 'center', padding: box(56, 0, 0, 0), width: px(760), width_tablet: px(100, '%'), width_mobile: px(100, '%'), margin: box(0, 'auto', 0, 'auto') }, [copy]);
  return container({
    container_type: 'grid', content_width: 'full', padding: box(56, 0, 0, 0), padding_mobile: box(36, 0, 0, 0),
    grid_columns_grid: { unit: 'custom', size: 'minmax(0,1.5fr) minmax(0,1fr)' }, grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
    grid_rows_grid: L.auto, grid_rows_grid_tablet: L.auto, grid_rows_grid_mobile: L.auto, grid_gaps: gap(60, 48), grid_align_items: 'center',
    width: px(1040), width_tablet: px(100, '%'), width_mobile: px(100, '%'), margin: box(0, 'auto', 0, 'auto'),
  }, [
    copy,
    image(m[`area_${key}`], {
      settings: {
        _background_background: 'classic', _background_color: C.white, _padding: box(14),
        _element_width_tablet: 'initial', _element_custom_width_tablet: px(420), _element_custom_width_mobile: px(100, '%'),
        custom_css: 'selector { transform: rotate(2deg); box-shadow: 0 30px 60px rgba(11,11,11,.12); margin-left: auto; margin-right: auto; }\nselector img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; display: block; }',
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
      tabs_title_background_color_hover_background: 'classic', tabs_title_background_color_hover_color: 'rgba(11,11,11,0.04)',
      tabs_title_background_color_active_background: 'classic', tabs_title_background_color_active_color: C.black,
      tabs_title_border_border: 'solid', tabs_title_border_width: box(1), tabs_title_border_color: 'rgba(11,11,11,0.25)',
      tabs_title_border_hover_border: 'solid', tabs_title_border_hover_width: box(1), tabs_title_border_hover_color: C.black,
      tabs_title_border_active_border: 'solid', tabs_title_border_active_width: box(1), tabs_title_border_active_color: C.black,
      tabs_title_border_radius: box(999), padding: box(14, 24, 14, 24),
      box_background_color_background: 'classic', box_background_color_color: 'rgba(0,0,0,0)', box_border_border: 'none', box_padding: box(0),
      _margin: box(48, 0, 0, 0),
      custom_css: 'selector .e-n-tabs-heading { flex-wrap: wrap; row-gap: 12px; }\nselector .e-n-tab-title { white-space: nowrap; }',
    },
    elements: AREAS.map((a) => container({ content_width: 'full', flex_direction: 'column', padding: box(0) }, [areaPanel(m)(a)])),
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
    text('★★★★★', { color: C.goldLight, size: 14, ls: 0.2 }),
    text(`“${q}”`, { color: C.cream, size: 21, weight: 300, lh: 1.4, settings: { _flex_size: 'grow' } }),
    eyebrow(who, C.sand, 'left', { size: 12, ls: 0.2 }),
  ], { gap: 18 })), { cols: [3, 1, 1], gap: 24, settings: { margin: box(64, 0, 0, 0) } }),
], { anchor: 'testimonials', align: 'center', pattern: m.pattern });

/* ------------------------------------------------------------------ faq */
const FAQ = [
  ['How much does it cost to hire a personal injury lawyer?', 'Nothing up front. We work on a contingency fee, which means we are paid a percentage only if we recover money for you. The initial consultation is free.'],
  ['How long do I have to file a claim in Georgia?', 'Generally two years from the date of injury for most personal injury cases. Exceptions can shorten or extend that deadline, so it is important to call early.'],
  ['What can I recover through a personal injury claim?', 'Current and future medical expenses, lost wages, reduced earning capacity, out-of-pocket costs, pain and suffering, and in some cases compensation for scarring or diminished quality of life.'],
  ['Who actually pays the compensation?', 'Almost always an insurance company: the at-fault driver’s policy, a business’s commercial liability coverage, or a homeowner’s policy. We examine every available policy, including your own.'],
  ['Will my case go to court?', 'The large majority of cases resolve by settlement. We prepare every case as if it will be tried because that produces better offers, and when needed, Jennifer has taken cases to verdict.'],
];
const faqAccordion = () => ({
  id: L.id(), elType: 'widget', widgetType: 'nested-accordion',
  settings: {
    items: FAQ.map(([q]) => ({ _id: L.id(), item_title: q })),
    default_state: 'expanded', max_items_expended: 'one', title_tag: 'h3', faq_schema: 'yes',
    accordion_item_title_icon: fa('fas fa-plus'), accordion_item_title_icon_active: fa('fas fa-minus'),
    accordion_item_title_position_horizontal: 'stretch', accordion_item_title_icon_position: 'end',
    accordion_item_title_space_between: px(0), accordion_item_title_distance_from_content: px(0),
    accordion_border_normal_border: 'solid', accordion_border_normal_width: box(0, 0, 1, 0), accordion_border_normal_color: C.rule,
    accordion_border_hover_border: 'solid', accordion_border_hover_width: box(0, 0, 1, 0), accordion_border_hover_color: C.rule,
    accordion_border_active_border: 'solid', accordion_border_active_width: box(0), accordion_border_active_color: C.rule,
    accordion_border_radius: box(0), accordion_padding: box(24, 0, 24, 0),
    ...L.typo('title_typography', [24, 22, 19], 700, { lh: 1.2 }),
    normal_title_color: C.black, hover_title_color: C.goldDark, active_title_color: C.black,
    icon_size: px(16), icon_spacing: px(20), normal_icon_color: C.gold, hover_icon_color: C.gold, active_icon_color: C.gold,
    content_border_border: 'solid', content_border_width: box(0, 0, 1, 0), content_border_color: C.rule, content_border_radius: box(0),
    content_padding: box(0, 48, 26, 0), content_padding_mobile: box(0, 0, 22, 0),
    custom_css: `selector { border-top: 1px solid ${C.rule}; }`,
  },
  elements: FAQ.map(([, a]) => container({ content_width: 'full', flex_direction: 'column', padding: box(0) }, [text(a, { color: C.body })])),
});
const faq = () => band(C.cream, [
  grid([
    stack([
      eyebrow('FAQ', C.goldDark),
      H2('Questions injured people', 'ask us most', false, 'left', { sizes: [54, 44, 34] }),
      text('Plain answers about Georgia personal injury claims. Every case is different, so call us for advice specific to yours.', { color: C.body, settings: { _margin: box(6, 0, 0, 0) } }),
    ], { gap: 18 }),
    faqAccordion(),
  ], { cols: ['minmax(0,1fr) minmax(0,1.6fr)', 1, 1], gap: 60, rowGap: 40, align: 'start' }),
], { anchor: 'faq' });

/* ---------------------------------------------------------------- blog */
const POSTS = [
  ['post_car', 'Car accidents', 'What to do in the first 7 days after a crash', 'The steps that protect your health and your claim, and the mistakes insurers are counting on you to make.'],
  ['post_dog', 'Dog bites', 'Georgia’s dog bite law, explained', 'When an owner is liable, how leash ordinances factor in, and what homeowner’s insurance covers.'],
  ['post_fall', 'Slip & fall', 'I fell in a store. Do I have a case?', 'What has to be proven in a premises liability claim and why surveillance video matters so much.'],
];
const blog = (m) => band(C.white, [
  eyebrow('Legal resources', C.goldDark, 'left', { settings: { _margin: box(0, 0, 18, 0) } }),
  H2('Know your rights', 'after an accident', false, 'left', { sizes: [54, 44, 34] }),
  grid(POSTS.map(([key, tag, title, excerpt]) => stack([
    image(m[key], { settings: { custom_css: 'selector img { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; display: block; }' } }),
    eyebrow(tag, C.goldDark, 'left', { size: 12, ls: 0.24 }),
    H3(title, C.black, [26, 24, 22], { lh: 1.15, settings: { _margin: box(-8, 0, 0, 0) } }),
    text(excerpt, { color: C.slate, size: 15 }),
  ], { gap: 18 })), { cols: [3, 1, 1], gap: 32, rowGap: 48, align: 'start', settings: { margin: box(56, 0, 0, 0) } }),
], { anchor: 'blog', settings: { border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: 'rgba(11,11,11,0.08)' } });

/* ------------------------------------------------------------- contact */
const fld = (custom_id, field_type, placeholder, width, extra = {}) => ({
  _id: L.id(), custom_id, field_type, field_label: placeholder.replace(' *', ''), placeholder, width, width_tablet: width, width_mobile: extra.widthM || '100', ...extra,
});
const detail = (label, valueWidget) => stack([eyebrow(label, C.gold, 'left', { size: 12, ls: 0.24 }), valueWidget], { gap: 6 });
const contact = (m) => band(C.black, [
  image(m.emblem, {
    width: 620, settings: {
      _position: 'absolute', _element_width: 'initial', _element_custom_width: px(620), _z_index: 0, hide_mobile: 'hidden-mobile',
      _offset_orientation_h: 'start', _offset_x: px(-160), _offset_orientation_v: 'end', _offset_y_end: px(-80),
      custom_css: 'selector { pointer-events: none; }\nselector img { filter: brightness(.22) saturate(.7); }',
    },
  }),
  grid([
    stack([
      eyebrow('Free case evaluation', C.goldLight, 'left', { settings: { _margin: box(0, 0, 0, 0) } }),
      H2('Injured?', 'Call Jen.', true, 'left', { br: true }),
      text('Tell us what happened. We respond quickly, keep everything confidential, and you pay nothing unless we recover for you.', { color: C.paper, maxW: 440, settings: { _margin: box(6, 0, 22, 0) } }),
      detail('Phone', heading(L.PHONE, 'p', 30, C.cream, 'left', { weight: 600, lh: 1.2, ls: 0, link: L.TEL })),
      detail('Email', text(`<a href="mailto:${L.EMAIL}">${L.EMAIL}</a>`, { color: C.cream, size: 15, linkColor: C.cream, linkHover: C.goldLight })),
      detail('Norcross office', text(`<p>${L.ADDRESS}</p>`, { color: C.sand, size: 15 })),
    ], { gap: 18 }),
    container({
      content_width: 'full', flex_direction: 'column', padding: box(40), padding_mobile: box(24),
      background_background: 'classic', background_color: 'rgba(22,20,17,0.72)',
      border_border: 'solid', border_width: box(1), border_color: 'rgba(201,162,74,0.15)',
      custom_css: 'selector { backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); }',
    }, [
      widget('form', {
        form_name: 'Free Case Evaluation',
        form_fields: [
          fld('first_name', 'text', 'First name *', '50', { required: 'true' }),
          fld('last_name', 'text', 'Last name *', '50', { required: 'true' }),
          fld('phone', 'tel', 'Phone *', '50', { required: 'true' }),
          fld('email', 'email', 'Email *', '50', { required: 'true' }),
          fld('accident_date', 'text', 'Date of accident / injury', '100'),
          fld('message', 'textarea', 'Describe your case', '100', { rows: 4 }),
          { ...fld('sms_consent', 'acceptance', 'Text message consent', '100'), acceptance_text: 'By providing my phone number, I agree to receive text messages from Cabrera Torres Law.' },
        ],
        show_labels: '', mark_required: '', input_size: 'md', button_text: 'Submit request', button_size: 'md', button_width: '', button_align: 'start',
        submit_actions: ['email'], email_subject: 'New free case evaluation request – Cabrera Torres Law',
        success_message: 'Thank you, we’ll be in touch shortly.',
        column_gap: px(16), row_gap: px(16),
        field_text_color: C.cream, field_background_color: C.black, field_border_color: 'rgba(201,162,74,0.3)', field_border_width: box(1), field_border_radius: box(0),
        ...L.typo('field_typography', 14, 300, { lh: 1.5 }),
        label_color: C.sand, ...L.typo('label_typography', 13, 300, { lh: 1.5 }),
        button_background_color: C.goldDeep, button_text_color: C.black, button_background_hover_color: C.goldLight, button_hover_color: C.black,
        button_border_radius: box(0), ...L.typo('button_typography', 12, 600, { lh: 1.2, ls: 0.16, transform: 'uppercase' }), button_text_padding: box(16, 34, 16, 34),
        success_message_color: C.goldLight,
        custom_css: `selector .elementor-field-textual { padding: 14px 16px; min-height: 0; }
selector .elementor-field-textual::placeholder { color: #A69D8D; opacity: 1; }
selector .elementor-field-textual:focus { border-color: ${C.gold} !important; box-shadow: none; }
selector .elementor-field-type-acceptance .elementor-field-subgroup label { color: ${C.sand}; font-size: 13px; line-height: 1.5; }
selector .elementor-field-type-acceptance input { accent-color: ${C.gold}; }
selector .elementor-button { background: linear-gradient(135deg,#B8873A,#E2C27A 55%,#B8873A) !important; }
selector .elementor-button:hover { filter: brightness(1.08); }`,
      }),
    ]),
  ], { cols: ['minmax(0,1fr) minmax(0,1.2fr)', 1, 1], gap: 60, rowGap: 48, align: 'start', settings: { z_index: 1 } }),
], { anchor: 'contact', pattern: m.pattern });

module.exports = {
  slug: 'home', title: 'Home',
  seo: {
    title: 'Personal Injury Lawyer in Norcross, GA | Cabrera Torres Law',
    description: 'Injured in Norcross or Gwinnett County? Attorney Jennifer Cabrera-Torres handles car and truck accidents, dog bites, slip and fall, and wrongful death. Free consultation. Se habla español.',
    focus: 'personal injury lawyer Norcross GA',
  },
  build: (m) => [hero(m), trustStrip(), results(), about(m), quote(), practice(m), testimonials(m), faq(), blog(m), contact(m)],
};
