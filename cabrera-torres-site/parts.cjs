// Section builders shared by several pages (page hero, CTA band, contact form, FAQ accordion,
// result notes, cards). Everything is native Elementor containers/widgets.
const L = require('./lib.cjs');
const { C, px, box, gap, auto, container, widget, fa, band, stack, row, grid, eyebrow, heading, H2, H3, text, button, image, iconList, glass, URL } = L;

// Faint emblem watermark (5% so the gold pattern shows through).
const emblem = (m, width, pos, extra = {}) => image(m.emblem, {
  width, settings: {
    _position: 'absolute', _element_width: 'initial', _element_custom_width: px(width), _z_index: 0, ...pos, ...extra,
    custom_css: `selector { pointer-events: none; ${extra.css || ''} }\nselector img { opacity: .05; }`,
  },
});

/* ------------------------------------------------------- inner page hero */
// Dark band at the top of every inner page: kicker, H1 (bold + light gold phrase), intro.
function pageHero(m, ph, o = {}) {
  const kids = [
    emblem(m, 520, { _offset_orientation_h: 'end', _offset_x_end: px(-140), _offset_orientation_v: 'start', _offset_y: px(50, '%'), hide_mobile: 'hidden-mobile' }, { css: 'transform: translateY(-50%);' }),
  ];
  if (o.photo) kids.push(image(o.photo, {
    settings: {
      _position: 'absolute', _element_width: 'initial', _element_custom_width: px(34, '%'), _z_index: 0,
      _offset_orientation_h: 'end', _offset_x_end: px(6, '%'), _offset_orientation_v: 'end', _offset_y_end: px(0),
      hide_tablet: 'hidden-tablet', hide_mobile: 'hidden-mobile',
      custom_css: o.cutout
        // Background-removed portrait: whole figure, standing on the bottom edge, pattern visible around her.
        ? 'selector { top: 24px; pointer-events: none; }\nselector .elementor-widget-container, selector img { height: 100%; }\nselector img { width: 100%; object-fit: contain; object-position: center bottom; }'
        : 'selector { top: 0; pointer-events: none; }\nselector .elementor-widget-container, selector img { height: 100%; }\nselector img { width: 100%; object-fit: cover; object-position: center top; -webkit-mask-image: linear-gradient(90deg,transparent,#000 25%); mask-image: linear-gradient(90deg,transparent,#000 25%); }',
    },
  }));
  // Centered, except where a portrait sits on the right of the header.
  const al = o.photo ? 'left' : 'center';
  kids.push(stack([
    eyebrow(ph.kicker, C.goldLight, al),
    heading(`${ph.title1}${ph.title2 ? ' ' + L.accent(ph.title2, C.goldLight) : ''}`, 'h1', [64, 50, 38], C.cream, al, { lh: 1.12, maxW: 900 }),
    ...(ph.intro ? [text(ph.intro, { color: C.paper, size: 17, maxW: 640, align: al, settings: { _margin: box(4, 0, 0, 0) } })] : []),
  ], { gap: 18, align: o.photo ? undefined : 'center', settings: { z_index: 1 } }));
  return band(C.black, kids, {
    pad: [80, 64], pattern: m.pattern,
    settings: { border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.goldLine, ...(o.photo ? { min_height: px(330) } : {}) },
  });
}

/* --------------------------------------------------------- CTA band */
// "Injured? Call Jen." band shown above the footer on inner pages.
const ctaBand = () => container({
  content_width: 'boxed', boxed_width: px(1216), container_type: 'grid',
  grid_columns_grid: { unit: 'custom', size: 'minmax(0,1fr) auto' }, grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
  grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_gaps: gap(40, 28), grid_align_items: 'center',
  padding: box(64, 32, 64, 32), padding_mobile: box(52, 20, 52, 20),
  background_background: 'classic', background_color: C.panel,
  border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.goldLine,
}, [
  stack([
    H2('Injured?', 'Call Jen.', true, 'left', { sizes: [38, 32, 28], lh: 1.15 }),
    text('Tell us what happened. We respond quickly, keep everything confidential, and you pay nothing unless we recover for you.', { color: C.paper, maxW: 560 }),
  ], { gap: 12 }),
  row([
    button('Free Case Evaluation', URL.contact, 'gold', { pad: box(18, 34, 18, 34) }),
    button(L.PHONE, L.TEL, 'outline', { pad: box(17, 30, 17, 30) }),
  ], { gap: 16, settings: { flex_justify_content: 'flex-end', flex_justify_content_tablet: 'flex-start', flex_justify_content_mobile: 'flex-start' } }),
], false);

/* ------------------------------------------------------------- lists */
// Gold "+" checklist in a CSS grid of `cols` columns (1 column on phones).
const plusList = (items, o = {}) => iconList(items, {
  icon: 'fas fa-plus', iconSize: 9, indent: 10, iconColor: o.iconColor || C.gold, color: o.color || C.ink2, size: o.size || 15, weight: 300, space: 0,
  settings: {
    ...(o.width ? { _element_width: 'initial', _element_custom_width: px(o.width), _element_custom_width_mobile: px(100, '%') } : {}),
    custom_css: `selector .elementor-icon-list-items { display: grid; grid-template-columns: repeat(${o.cols ?? 2}, minmax(0, 1fr)); gap: ${o.rowGap ?? 10}px 24px; }
selector .elementor-icon-list-item { margin: 0 !important; padding: 0 !important; align-items: center !important; }
@media (max-width: 767px) { selector .elementor-icon-list-items { grid-template-columns: 1fr; } }`,
  },
});

/* ------------------------------------------------------- result notes */
// The gold "pin" is drawn on the first label with CSS, so each note stays plain editable widgets.
const pinCSS = (padTop) => `selector::before { content: ""; position: absolute; left: 50%; top: -${padTop + 26}px; width: 22px; height: 22px; transform: translateX(-50%); border: 3px solid #7A6232; border-bottom: 0; border-radius: 11px 11px 0 0; box-sizing: border-box; }
selector::after { content: ""; position: absolute; left: 50%; top: -${padTop + 10}px; width: 52px; height: 24px; transform: translateX(-50%); background: #A3854C; clip-path: polygon(0 100%,14% 0,86% 0,100% 100%); filter: drop-shadow(0 3px 6px rgba(30,33,35,.25)); }`;
function resultNote(r, tilt, drop, o = {}) {
  const pad = o.pad || [44, 34, 40, 34];
  return container({
    content_width: 'full', flex_direction: 'column', flex_gap: gap(0), padding: box(...pad), padding_mobile: box(pad[0], 26, pad[2], 26),
    background_background: 'classic', background_color: C.white, overflow: 'visible',
    margin: box(drop, 0, 0, 0), margin_tablet: box(0), margin_mobile: box(0),
    custom_css: `selector { transform: rotate(${tilt}deg); box-shadow: 0 1px 0 rgba(30,33,35,.06), 0 24px 40px -18px rgba(30,33,35,.35), 0 10px 18px -10px rgba(30,33,35,.2); }`,
  }, [
    eyebrow(r.type, C.goldDark, 'center', { size: 12, ls: 0.26, settings: { _margin: box(0, 0, o.compact ? 12 : 14, 0), custom_css: pinCSS(pad[0]) } }),
    heading(r.amount, 'h3', o.amountSizes || [58, 54, 50], C.black, 'center', { lh: 1.1, ls: 0 }),
    ...(o.compact ? [] : [eyebrow('Compensation', C.black, 'center', { size: 12, settings: { _margin: box(8, 0, 4, 0) } })]),
    text(r.desc, { color: C.ink2, size: o.compact ? 15 : 16, settings: { _margin: box(16, 0, 0, 0) } }),
  ]);
}

/* ------------------------------------------------------ white cards */
// White card with a big gold number (About "why choose us", Practice "how a claim works").
const numberCard = (n, h, p, o = {}) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(0), padding: o.pad || box(36, 32, 36, 32), padding_mobile: box(30, 24, 30, 24),
  background_background: 'classic', background_color: C.white, border_border: 'solid', border_width: box(1), border_color: 'rgba(30,33,35,0.08)',
}, [
  heading(n, 'p', 40, C.gold, 'left', { lh: 1, ls: 0, settings: { _margin: box(0, 0, o.nGap ?? 18, 0) } }),
  H3(h, C.black, o.hSizes || [22, 22, 20], { settings: { _margin: box(0, 0, 10, 0) } }),
  text(p, { color: C.body, size: o.pSize || 16 }),
]);

// Photo in a white mat, slightly rotated (About, Jennifer, Practice pages).
const framedPhoto = (media, o = {}) => image(media, {
  settings: {
    _background_background: 'classic', _background_color: o.matColor || C.white, _padding: box(o.mat ?? 14),
    ...(o.maxW ? { _element_width: 'initial', _element_custom_width: px(o.maxW), _element_custom_width_mobile: px(100, '%') } : {}),
    custom_css: `selector { transform: rotate(${o.tilt ?? 2}deg); box-shadow: 0 30px 60px rgba(30,33,35,.12); margin-left: auto; margin-right: auto; }
selector img { width: 100%; aspect-ratio: ${o.ratio || '4 / 5'}; object-fit: cover; object-position: ${o.pos || 'center top'}; display: block; }`,
  },
});

/* --------------------------------------------------------------- FAQ */
function faqAccordion(faqs, o = {}) {
  return {
    id: L.id(), elType: 'widget', widgetType: 'nested-accordion',
    settings: {
      items: faqs.map((f) => ({ _id: L.id(), item_title: f.q })),
      default_state: 'expanded', max_items_expended: 'one', title_tag: 'h3', faq_schema: 'yes',
      accordion_item_title_icon: fa('fas fa-plus'), accordion_item_title_icon_active: fa('fas fa-minus'),
      accordion_item_title_position_horizontal: 'stretch', accordion_item_title_icon_position: 'end',
      accordion_item_title_space_between: px(0), accordion_item_title_distance_from_content: px(0),
      accordion_border_normal_border: 'solid', accordion_border_normal_width: box(0, 0, 1, 0), accordion_border_normal_color: C.rule,
      accordion_border_hover_border: 'solid', accordion_border_hover_width: box(0, 0, 1, 0), accordion_border_hover_color: C.rule,
      accordion_border_active_border: 'solid', accordion_border_active_width: box(0), accordion_border_active_color: C.rule,
      accordion_border_radius: box(0), accordion_padding: box(24, 0, 24, 0),
      ...L.typo('title_typography', o.sizes || [24, 22, 19], 700, { lh: 1.2 }),
      normal_title_color: C.black, hover_title_color: C.goldDark, active_title_color: C.black,
      icon_size: px(16), icon_spacing: px(20), normal_icon_color: C.gold, hover_icon_color: C.gold, active_icon_color: C.gold,
      content_border_border: 'solid', content_border_width: box(0, 0, 1, 0), content_border_color: C.rule, content_border_radius: box(0),
      content_padding: box(0, 48, 26, 0), content_padding_mobile: box(0, 0, 22, 0),
      custom_css: `selector { border-top: 1px solid ${C.rule}; }`,
      ...(o.settings || {}),
    },
    elements: faqs.map((f) => container({ content_width: 'full', flex_direction: 'column', padding: box(0) }, [text(f.a, { color: C.body, size: o.aSize || 16 })])),
  };
}

/* ------------------------------------------------------------ contact */
const fld = (custom_id, field_type, placeholder, width, extra = {}) => ({
  _id: L.id(), custom_id, field_type, field_label: placeholder.replace(' *', ''), placeholder, width, width_tablet: width, width_mobile: extra.widthM || '100', ...extra,
});
const detail = (label, valueWidget) => stack([eyebrow(label, C.gold, 'left', { size: 12, ls: 0.24 }), valueWidget], { gap: 6 });
const phoneDetail = (size = 30) => detail('Phone', heading(L.PHONE, 'p', size, C.cream, 'left', { weight: 600, lh: 1.2, ls: 0, link: L.TEL }));
const emailDetail = () => detail('Email', text(`<a href="mailto:${L.EMAIL}">${L.EMAIL}</a>`, { color: C.cream, size: 15, linkColor: C.cream, linkHover: C.goldLight }));

function contactForm(rows = 4) {
  return container({
    content_width: 'full', flex_direction: 'column', padding: box(40), padding_mobile: box(24),
    background_background: 'classic', background_color: 'rgba(45,49,51,0.72)',
    border_border: 'solid', border_width: box(1), border_color: 'rgba(163,133,76,0.15)',
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
        fld('message', 'textarea', 'Describe your case', '100', { rows }),
        { ...fld('sms_consent', 'acceptance', 'Text message consent', '100'), acceptance_text: 'By providing my phone number, I agree to receive text messages from Cabrera-Torres Law Firm.' },
      ],
      show_labels: '', mark_required: '', input_size: 'md', button_text: 'Submit request', button_size: 'md', button_width: '', button_align: 'start',
      submit_actions: ['email'], email_subject: 'New free case evaluation request – Cabrera-Torres Law Firm',
      success_message: 'Thank you, we’ll be in touch shortly.',
      column_gap: px(16), row_gap: px(16),
      field_text_color: C.cream, field_background_color: C.black, field_border_color: 'rgba(163,133,76,0.3)', field_border_width: box(1), field_border_radius: box(0),
      ...L.typo('field_typography', 14, 300, { lh: 1.5 }),
      label_color: C.sand, ...L.typo('label_typography', 13, 300, { lh: 1.5 }),
      button_background_color: C.gold, button_text_color: C.black, button_background_hover_color: C.goldDeep, button_hover_color: C.black,
      button_border_radius: box(0), ...L.typo('button_typography', 12, 600, { lh: 1.2, ls: 0.16, transform: 'uppercase' }), button_text_padding: box(16, 34, 16, 34),
      success_message_color: C.goldLight,
      custom_css: `selector .elementor-field-textual { padding: 14px 16px; min-height: 0; }
selector .elementor-field-textual::placeholder { color: #A69D8D; opacity: 1; }
selector .elementor-field-textual:focus { border-color: ${C.gold} !important; box-shadow: none; }
selector .elementor-field-type-acceptance .elementor-field-subgroup label { color: ${C.sand}; font-size: 13px; line-height: 1.5; }
selector .elementor-field-type-acceptance input { accent-color: ${C.gold}; }
selector .elementor-button { transition: background-color .2s; }`,
    }),
  ]);
}

/* -------------------------------------------------------- blog cards */
// Whole card is one link (container rendered as <a>), so there are no nested links.
const ART_IMG = { 'assets/post-car.png': 'post_car', 'assets/post-dog.png': 'post_dog', 'assets/post-fall.png': 'post_fall', 'assets/area-mva.webp': 'area_mva' };
const articleUrl = (a) => `/${a.slug}/`;
const blogCard = (m, a, o = {}) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(o.gap ?? 16), padding: box(0),
  html_tag: 'a', link: L.link(articleUrl(a)),
  custom_css: 'selector:hover h3 { color: #7A6232 !important; }\nselector h3 { transition: color .2s; }',
}, [
  image(m[ART_IMG[a.src]], { settings: { custom_css: 'selector img { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; display: block; }' } }),
  eyebrow(o.meta ? `${a.tag} · ${a.read}` : a.tag, C.goldDark, 'left', { size: 12, ls: 0.24 }),
  H3(a.title, C.black, o.hSizes || [24, 22, 22], { lh: 1.15, settings: { _margin: box(-6, 0, 0, 0) } }),
  text(a.excerpt, { color: o.pColor || C.body, size: 15 }),
]);

module.exports = { emblem, pageHero, ctaBand, plusList, resultNote, numberCard, framedPhoto, faqAccordion, fld, detail, phoneDetail, emailDetail, contactForm, blogCard, articleUrl, ART_IMG };
