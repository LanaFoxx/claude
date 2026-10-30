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
// v3 page header: near-black, left-aligned eyebrow + Cinzel H1 + intro. Portrait pages put the photo/cutout
// on the right, bottom-aligned like the homepage hero. No watermark, no pattern.
function pageHero(m, ph, o = {}) {
  const rule = `<span style="display:inline-block;width:18px"></span><span style="display:inline-block;width:56px;height:1px;background:${C.rose};vertical-align:middle"></span>`;
  const copy = stack([
    eyebrow(`${ph.kicker}${rule}`, C.ivory, 'left', { size: 13, weight: 500, ls: 0.32 }),
    heading(`${ph.title1}${ph.title2 ? ' ' + ph.title2 : ''}`, 'h1', [54, 46, 38], C.ivory, 'left', { lh: 1.08, maxW: o.photo ? 640 : 860 }),
    ...(ph.intro ? [text(ph.intro, { color: C.ivory, size: 18, lh: 1.7, maxW: 640, settings: { _margin: box(4, 0, 0, 0) } })] : []),
  ], { gap: 22, settings: { padding: box(120, 0, 96, 0), padding_tablet: box(96, 0, 56, 0), padding_mobile: box(80, 0, 48, 0), z_index: 1 } });
  if (!o.photo) {
    return band(C.nearBlack, [copy], { pad: [0, 0], width: 1320, settings: { border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: 'rgba(196,160,141,0.18)' } });
  }
  return container({
    content_width: 'boxed', boxed_width: px(1320), container_type: 'grid',
    grid_columns_grid: { unit: 'custom', size: 'minmax(0,1.15fr) minmax(0,.85fr)' }, grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
    grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_gaps: gap(32, 0), grid_align_items: 'end',
    padding: box(0, 40, 0, 40), padding_tablet: box(0, 32, 0, 32), padding_mobile: box(0, 24, 0, 24),
    background_background: 'classic', background_color: C.nearBlack, overflow: 'hidden',
    border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: 'rgba(196,160,141,0.18)',
  }, [
    copy,
    container({ content_width: 'full', flex_direction: 'column', flex_justify_content: 'flex-end', flex_align_items: 'center', padding: box(48, 0, 0, 0), hide_mobile: 'hidden-mobile' }, [
      image(o.photo, {
        settings: {
          custom_css: o.cutout
            ? 'selector img { display: block; width: auto; max-width: 100%; max-height: 460px; object-fit: contain; object-position: bottom; filter: drop-shadow(0 30px 50px rgba(0,0,0,.55)); }'
            : 'selector img { display: block; width: 100%; max-width: 420px; max-height: 440px; object-fit: cover; object-position: center 20%; }',
        },
      }),
    ]),
  ], false);
}

/* --------------------------------------------------------- CTA band */
// v3 CTA band (ends every page): espresso-mid, centered eyebrow, H2, copy with taupe phone, primary button.
const ctaBand = () => container({
  content_width: 'boxed', boxed_width: px(820), flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(0),
  padding: box(104, 40, 104, 40), padding_mobile: box(80, 24, 80, 24),
  background_background: 'classic', background_color: C.espMid,
  border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: 'rgba(196,160,141,0.2)', _element_id: 'contact',
}, [
  eyebrow(`<span style="display:inline-block;width:56px;height:1px;background:${C.rose};vertical-align:middle"></span><span style="display:inline-block;width:22px"></span>Let's talk about your case<span style="display:inline-block;width:22px"></span><span style="display:inline-block;width:56px;height:1px;background:${C.rose};vertical-align:middle"></span>`, C.ivory, 'center', { size: 13, ls: 0.32, settings: { custom_css: '@media (max-width: 560px) { selector span[style*="height:1px"] { width: 24px !important; } }' } }),
  heading('Schedule Your Free Consultation.', 'h2', [44, 38, 32], C.ivory, 'center', { lh: 1.12, settings: { _margin: box(22, 0, 0, 0) } }),
  text(`We're here to listen, answer your questions, and help you understand your options. Call <a href="${L.TEL}" style="font-weight:700">${L.PHONE}</a>.`, { color: C.ivory, size: 18, lh: 1.75, align: 'center', maxW: 620, linkColor: C.rose, linkHover: C.ivory, settings: { _margin: box(18, 0, 0, 0) } }),
  button('Free Consultation  →', L.TEL, 'gold', { align: 'center', pad: box(20, 36, 20, 36), settings: { _margin: box(40, 0, 0, 0) } }),
], false);

/* ------------------------------------------------------------- lists */
// Gold "+" checklist in a CSS grid of `cols` columns (1 column on phones).
const plusList = (items, o = {}) => iconList(items, {
  icon: 'fas fa-plus', iconSize: 9, indent: 10, iconColor: o.iconColor || C.rose, color: o.color || C.inkSoft, size: o.size || 15, weight: 400, space: 0,
  settings: {
    ...(o.width ? { _element_width: 'initial', _element_custom_width: px(o.width), _element_custom_width_mobile: px(100, '%') } : {}),
    custom_css: `selector .elementor-icon-list-items { display: grid; grid-template-columns: repeat(${o.cols ?? 2}, minmax(0, 1fr)); gap: ${o.rowGap ?? 10}px 24px; }
selector .elementor-icon-list-item { margin: 0 !important; padding: 0 !important; align-items: center !important; }
@media (max-width: 767px) { selector .elementor-icon-list-items { grid-template-columns: 1fr; } }`,
  },
});

/* ------------------------------------------------------- result cards */
// v3: square card with the Stat component (Cinzel amount, small uppercase label) and the case summary.
function resultNote(r, _tilt, _drop, o = {}) {
  return container({
    content_width: 'full', flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(0), padding: box(40, 30, 36, 30), padding_mobile: box(34, 24, 30, 24),
    background_background: 'classic', background_color: C.light, border_border: 'solid', border_width: box(1), border_color: C.hair,
  }, [
    heading(r.amount, 'h3', o.amountSizes || [42, 40, 38], C.ink, 'center', { lh: 1 }),
    eyebrow(r.type, C.espMid, 'center', { size: 13, weight: 600, ls: 0.22, settings: { _margin: box(12, 0, 0, 0) } }),
    widget('divider', { width: px(40), align: 'center', color: C.rose, weight: px(1), gap: px(14) }),
    text(r.desc, { color: C.inkSoft, size: 15, lh: 1.7, align: 'center' }),
  ]);
}

/* ------------------------------------------------------ white cards */
// White card with a big gold number (About "why choose us", Practice "how a claim works").
const numberCard = (n, h, p, o = {}) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(0), padding: o.pad || box(36, 32, 36, 32), padding_mobile: box(30, 24, 30, 24),
  background_background: 'classic', background_color: o.dark ? C.cardDark : C.light, border_border: 'solid', border_width: box(1), border_color: o.dark ? C.darkLine : C.hair,
}, [
  heading(n, 'p', 34, C.rose, 'left', { lh: 1, settings: { _margin: box(0, 0, o.nGap ?? 18, 0) } }),
  H3(h, o.dark ? C.ivory : C.ink, o.hSizes || [18, 18, 18], { ls: 0.1, settings: { _margin: box(0, 0, 10, 0) } }),
  text(p, { color: o.dark ? C.ivory : C.inkSoft, size: o.pSize || 16 }),
]);

// Plain photo used on About, Jennifer and Practice pages.
// v3: plain square-cornered photo (no mat, tilt or shadow).
const framedPhoto = (media, o = {}) => image(media, {
  settings: {
    ...(o.maxW ? { _element_width: 'initial', _element_custom_width: px(o.maxW), _element_custom_width_mobile: px(100, '%') } : {}),
    custom_css: `selector { margin-left: auto; margin-right: auto; }
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
      ...L.typo('title_typography', o.sizes || [20, 20, 18], 600, { lh: 1.3, ls: 0.02, family: L.HFONT }),
      normal_title_color: C.ink, hover_title_color: C.espMid, active_title_color: C.ink,
      icon_size: px(16), icon_spacing: px(20), normal_icon_color: C.rose, hover_icon_color: C.rose, active_icon_color: C.rose,
      content_border_border: 'solid', content_border_width: box(0, 0, 1, 0), content_border_color: C.rule, content_border_radius: box(0),
      content_padding: box(0, 48, 26, 0), content_padding_mobile: box(0, 0, 22, 0),
      custom_css: `selector { border-top: 1px solid ${C.rule}; }`,
      ...(o.settings || {}),
    },
    elements: faqs.map((f) => container({ content_width: 'full', flex_direction: 'column', padding: box(0) }, [text(f.a, { color: C.inkSoft, size: o.aSize || 16 })])),
  };
}

/* ------------------------------------------------------------ contact */
const fld = (custom_id, field_type, placeholder, width, extra = {}) => ({
  _id: L.id(), custom_id, field_type, field_label: placeholder.replace(' *', ''), placeholder, width, width_tablet: width, width_mobile: extra.widthM || '100', ...extra,
});
const detail = (label, valueWidget) => stack([eyebrow(label, C.roseDeep, 'left', { size: 12, ls: 0.24 }), valueWidget], { gap: 6 });
const phoneDetail = (size = 30) => detail('Phone', heading(L.PHONE, 'p', size, C.ink, 'left', { weight: 600, lh: 1.2, ls: 0, link: L.TEL }));
const emailDetail = () => detail('Email', text(`<a href="mailto:${L.EMAIL}">${L.EMAIL}</a>`, { color: C.ink, size: 15, linkColor: C.ink, linkHover: C.roseDeep }));

function contactForm(rows = 4) {
  return container({
    content_width: 'full', flex_direction: 'column', padding: box(40), padding_mobile: box(24),
    background_background: 'classic', background_color: C.ivory,
    border_border: 'solid', border_width: box(1), border_color: C.hair,
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
        { ...fld('sms_consent', 'acceptance', 'Text message consent (optional)', '100'), acceptance_text: 'Optional: Yes, I agree to receive text messages from Cabrera Torres Law Firm about my case, including case updates, appointment reminders, and document requests. Message frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out or HELP for help. Consent is not required to hire us. See our <a href="/privacy-policy/" target="_blank">Privacy Policy</a> and <a href="/sms-terms/" target="_blank">SMS Terms</a>.' },
      ],
      show_labels: '', mark_required: '', input_size: 'md', button_text: 'Submit request', button_size: 'md', button_width: '', button_align: 'start',
      submit_actions: ['email'], email_subject: 'New free case evaluation request – Cabrera Torres Law Firm',
      success_message: 'Thank you, we’ll be in touch shortly.',
      column_gap: px(16), row_gap: px(16),
      field_text_color: C.ink, field_background_color: C.light, field_border_color: C.line, field_border_width: box(1), field_border_radius: box(0),
      ...L.typo('field_typography', 16, 400, { lh: 1.5 }),
      label_color: C.inkMuted, ...L.typo('label_typography', 13, 300, { lh: 1.5 }),
      button_background_color: C.rose, button_text_color: C.wood, button_background_hover_color: C.espMid, button_hover_color: C.ivory,
      button_border_radius: box(0), ...L.typo('button_typography', 14, 700, { lh: 1.2, ls: 0.2, transform: 'uppercase' }), button_text_padding: box(18, 32, 18, 32),
      success_message_color: C.roseDeep,
      custom_css: `selector .elementor-field-textual { padding: 14px 16px; min-height: 0; }
selector .elementor-field-textual::placeholder { color: #9C8B80; opacity: 1; }
selector .elementor-field-textual:focus { border-color: ${C.rose} !important; box-shadow: none; }
selector .elementor-field-type-acceptance .elementor-field-subgroup label { color: ${C.inkMuted}; font-size: 13px; line-height: 1.5; }
selector .elementor-field-type-acceptance input { accent-color: ${C.rose}; }
selector .elementor-button { transition: background-color .15s, color .15s; }`,
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
  custom_css: 'selector:hover h3 { color: #4A362F !important; }\nselector h3 { transition: color .15s; }',
}, [
  image(m[ART_IMG[a.src]], { settings: { custom_css: 'selector img { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; display: block; }' } }),
  eyebrow(o.meta ? `${a.tag} · ${a.read}` : a.tag, C.roseDeep, 'left', { size: 12, ls: 0.24 }),
  H3(a.title, C.ink, o.hSizes || [20, 20, 20], { lh: 1.25, ls: 0.02, settings: { _margin: box(-6, 0, 0, 0) } }),
  text(a.excerpt, { color: o.pColor || C.inkSoft, size: 15 }),
]);

module.exports = { emblem, pageHero, ctaBand, plusList, resultNote, numberCard, framedPhoto, faqAccordion, fld, detail, phoneDetail, emailDetail, contactForm, blogCard, articleUrl, ART_IMG };
