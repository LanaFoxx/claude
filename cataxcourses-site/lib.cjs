// Shared building blocks for the cataxcourses.com Elementor build (Claude Design handoff, Sep 30 2026).
// Native Elementor containers + widgets, so every text, link, image and color stays editable.
// Elementor free has no per-element Custom CSS, so the few things the design needs that Elementor's
// controls can't express (dot backgrounds, hover dropdowns, mobile menu, check bullets) live in ONE
// HTML widget in the header template (STYLE below), scoped to .ctc-* classes so nothing leaks into
// the Oxygen pages.
const crypto = require('crypto');

const C = {
  navy: '#1C2333', navy2: '#242D40', navyLine: '#34405A', footer: '#141A27',
  gold: '#D4A93A', goldHover: '#C39A2F', goldText: '#B8901F', goldDeep: '#8F6F14', goldPale: '#F3EAD0', goldOnGold: '#FFF8E6',
  cream: '#FBFAF6', sand: '#F3F1EC', sandHover: '#ECE9E0', line: '#E6E3DA', gray: '#4B5058', light: '#D9DCE1', muted: '#B8BCC4',
  white: '#FFFFFF',
};
const HEAD = 'Outfit', BODY = 'Manrope';
const SITE = 'https://cataxcourses.com';
const PHONE = { label: '(888) 229-1994', tel: 'tel:8882291994' };
const URL = {
  home: `${SITE}/`, cart: `${SITE}/cart/`, contact: `${SITE}/contact-us/`, login: 'https://learn.cataxcourses.com/login/index.php',
  c60: `${SITE}/product/ctec-60-hours-course/`, c20: `${SITE}/product/ctec-20-hours-renewal-course/`,
  c15: `${SITE}/product/15-hour-in-lieu-of-experience-course/`, caLaw: `${SITE}/product/california-tax-law-5-hours/`,
  book20: `${SITE}/product/20-hour-book-addon/`, book60: `${SITE}/product/60-hour-book-addon-new/`, books: `${SITE}/book-add-ons/`,
  mug: `${SITE}/product/official-california-tax-preparer-coffee-mug/`,
  become: `${SITE}/how-to-become-a-ctec-registered-tax-preparer/`, renew: `${SITE}/how-to-renew-your-ctec-registration/`,
  faq: `${SITE}/frequently-asked-questions/`, news: `${SITE}/tax-news/`, website: 'http://taxprodesign.com/',
  terms: `${SITE}/terms-and-conditions/`, privacy: `${SITE}/privacy-policy/`, refund: `${SITE}/refund-policy/`,
  facebook: 'https://www.facebook.com/cataxcourses', trustpilot: 'https://www.trustpilot.com/review/cataxcourses.com',
  bca: 'https://www.checkbca.org/report/california-tax-courses-156593271/reviews',
  // Order buttons: add the package and go straight to checkout (WooCommerce product / variation id).
  guides: `${SITE}/helpful-guides-and-how-tos/`,
  order: (id) => `${SITE}/checkout/?add-to-cart=${id}`,
};
// Pages designed but not published yet: temporary targets until they go live.
Object.assign(URL, { TODO_guides: URL.guides, TODO_after60: URL.become, TODO_after20: URL.renew, TODO_books: URL.books, TODO_courses: URL.home });

const id = () => crypto.randomBytes(4).toString('hex').slice(0, 7);
const px = (size, unit = 'px') => ({ unit, size, sizes: [] });
const box = (t, r = t, b = t, l = r, unit = 'px') => ({ unit, top: String(t), right: String(r), bottom: String(b), left: String(l), isLinked: false });
const gap = (n, r = n) => ({ unit: 'px', size: n, column: String(n), row: String(r), isLinked: n === r });
const auto = { unit: 'custom', size: 'auto' };
const link = (url) => ({ url, is_external: '', nofollow: '' });
const resp = (key, [d, t, m], fn = (v) => v) => {
  const o = {};
  if (d !== undefined) o[key] = fn(d);
  if (t !== undefined) o[`${key}_tablet`] = fn(t);
  if (m !== undefined) o[`${key}_mobile`] = fn(m);
  return o;
};
function typo(prefix, family, sizes, weight, extra = {}) {
  const s = { [`${prefix}_typography`]: 'custom', [`${prefix}_font_family`]: family, [`${prefix}_font_weight`]: String(weight) };
  Object.assign(s, resp(`${prefix}_font_size`, Array.isArray(sizes) ? sizes : [sizes], (v) => px(v)));
  if (extra.lh) s[`${prefix}_line_height`] = px(extra.lh, 'em');
  if (extra.ls !== undefined) s[`${prefix}_letter_spacing`] = px(extra.ls, 'em');
  if (extra.transform) s[`${prefix}_text_transform`] = extra.transform;
  return s;
}

const container = (settings, elements = [], isInner = true) => ({ id: id(), elType: 'container', isInner, settings, elements });
const widget = (widgetType, settings) => ({ id: id(), elType: 'widget', widgetType, settings, elements: [] });
const cls = (c) => ({ css_classes: c });          // containers
const wcls = (c) => ({ _css_classes: c });        // widgets

/* ---------------------------------------------------------------- layout */
// Full-width band, content boxed at 1392px (design max 1440 incl. 24px gutters).
function band(bg, children, o = {}) {
  const [pt, pb] = o.pad || [88, 88];
  return container({
    content_width: 'boxed', boxed_width: px(1392), flex_direction: 'column', flex_gap: gap(o.gap ?? 0),
    padding: box(pt, 24, pb, 24), padding_tablet: box(Math.round(pt * 0.8), 24, Math.round(pb * 0.8), 24),
    padding_mobile: box(Math.round(pt * 0.66), 20, Math.round(pb * 0.66), 20),
    background_background: 'classic', background_color: bg, overflow: 'hidden',
    ...(o.align ? { flex_align_items: o.align } : {}),
    ...(o.cls ? cls(o.cls) : {}),
    ...(o.settings || {}),
  }, children, false);
}
const stack = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(o.gap ?? 0),
  ...(o.align ? { flex_align_items: o.align } : {}),
  ...(o.justify ? { flex_justify_content: o.justify } : {}),
  ...(o.maxW ? { width: px(o.maxW), width_tablet: px(100, '%'), width_mobile: px(100, '%') } : {}),
  ...(o.cls ? cls(o.cls) : {}),
  ...(o.settings || {}),
}, children);
const row = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'row', flex_wrap: 'wrap', padding: box(0),
  flex_gap: gap(o.gap ?? 14, o.rowGap ?? o.gap ?? 14), flex_align_items: o.align || 'center',
  ...(o.justify ? { flex_justify_content: o.justify } : {}),
  ...(o.cls ? cls(o.cls) : {}),
  ...(o.settings || {}),
}, children);
function grid(children, o = {}) {
  const [d, t, m] = o.cols || [2, 2, 1];
  const col = (v) => (typeof v === 'number' ? px(v, 'fr') : { unit: 'custom', size: v });
  return container({
    container_type: 'grid', content_width: 'full', padding: box(0),
    grid_columns_grid: col(d), grid_columns_grid_tablet: col(t), grid_columns_grid_mobile: col(m),
    grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_auto_flow: 'row',
    grid_gaps: gap(o.gap ?? 24, o.rowGap ?? o.gap ?? 24),
    ...(o.gapT !== undefined ? { grid_gaps_tablet: gap(o.gapT) } : {}),
    grid_gaps_mobile: gap(o.gapM ?? Math.min(o.gap ?? 24, 24)),
    grid_align_items: o.align || 'stretch',
    ...(o.cls ? cls(o.cls) : {}),
    ...(o.settings || {}),
  }, children);
}
// A container rendered as <a> (whole card clickable).
const linkBox = (url, settings, children) => container({ html_tag: 'a', link: link(url), ...settings }, children);

/* --------------------------------------------------------------- widgets */
const eyebrow = (t, color = C.goldText, align = 'left', o = {}) => widget('heading', {
  title: t, header_size: 'p', title_color: color, align,
  ...typo('typography', BODY, o.size || [16, 15, 14], 700, { lh: 1.3, ls: o.ls ?? 0.14, transform: 'uppercase' }),
  ...(o.settings || {}),
});
// Headings take inline HTML; <span class="ctc-thin"> renders the design's light-weight words.
function heading(t, tag, sizes, color = C.navy, align = 'left', o = {}) {
  return widget('heading', {
    title: t, header_size: tag, title_color: color, align,
    ...typo('typography', HEAD, sizes, o.weight || 800, { lh: o.lh || 1.1, ls: o.ls ?? -0.02 }),
    ...(o.link ? { link: link(o.link) } : {}),
    ...(o.cls ? wcls(o.cls) : {}),
    ...(o.settings || {}),
  });
}
const H2 = (t, color, align = 'left', o = {}) => heading(t, 'h2', o.sizes || [55, 44, 36], color, align, o);
function text(html, o = {}) {
  const body = /^\s*</.test(html) ? html : `<p>${html}</p>`;
  return widget('text-editor', {
    editor: body, paragraph_spacing: px(o.pSpace ?? 0), align: o.align || 'left',
    text_color: o.color || C.gray, link_color: o.linkColor || C.navy, link_hover_color: o.linkHover || C.goldText,
    ...typo('typography', o.family || BODY, o.size || [23, 21, 19], o.weight || 400, { lh: o.lh || 1.65 }),
    ...(o.maxW ? { _element_width: 'initial', _element_custom_width: px(o.maxW), _element_custom_width_tablet: px(100, '%'), _element_custom_width_mobile: px(100, '%') } : {}),
    ...(o.cls ? wcls(o.cls) : {}),
    ...(o.settings || {}),
  });
}
function button(label, url, o = {}) {
  const gold = o.variant !== 'navy';
  return widget('button', {
    text: label, link: link(url), align: o.align || '',
    ...typo('typography', HEAD, o.size || [25, 23, 21], 700, { lh: 1.2, ls: 0 }),
    border_radius: box(12), text_padding: o.pad || box(16, 28, 16, 28),
    button_text_color: C.white, background_background: 'classic', background_color: gold ? C.gold : C.navy,
    hover_color: C.white, button_background_hover_background: 'classic', button_background_hover_color: gold ? C.goldHover : C.navy2,
    ...(o.cls ? wcls(o.cls) : {}),
    ...(o.settings || {}),
  });
}
// Two-line CTA ("Need to renew?" / "20 Hour CE Course →") as a linked container with two headings.
function ctaCard(small, big, url, variant, o = {}) {
  const gold = variant === 'gold';
  return linkBox(url, {
    content_width: 'full', width: auto, width_mobile: px(100, '%'), flex_direction: 'column', flex_gap: gap(4),
    padding: box(18, 28, 18, 28), border_radius: box(12), min_width: px(220),
    background_background: 'classic', background_color: gold ? C.gold : C.navy,
    ...cls(`ctc-cta ${gold ? 'ctc-cta-gold' : 'ctc-cta-navy'}`),
  }, [
    widget('heading', { title: small, header_size: 'span', title_color: gold ? C.goldOnGold : C.light, ...typo('typography', HEAD, o.smallSize || [18, 17, 16], 400, { lh: 1.3, ls: 0 }) }),
    widget('heading', { title: big, header_size: 'span', title_color: C.white, ...typo('typography', HEAD, o.bigSize || [25, 23, 21], 700, { lh: 1.2, ls: 0 }) }),
  ]);
}
function image(media, o = {}) {
  return widget('image', {
    image: media, image_size: 'full', align: o.align || 'center',
    ...(o.width !== undefined ? resp('width', Array.isArray(o.width) ? o.width : [o.width], (v) => (typeof v === 'object' ? v : px(v))) : {}),
    ...(o.height !== undefined ? resp('height', Array.isArray(o.height) ? o.height : [o.height], (v) => px(v)) : {}),
    ...(o.link ? { link_to: 'custom', link: link(o.link) } : {}),
    ...(o.alt ? { _title: o.alt } : {}),
    ...(o.cls ? wcls(o.cls) : {}),
    ...(o.settings || {}),
  });
}
// Text link list (footer columns, dropdown menus). items: [[text, url]]
function linkList(items, o = {}) {
  return widget('icon-list', {
    view: o.inline ? 'inline' : 'traditional',
    icon_list: items.map(([t, u]) => ({ _id: id(), text: t, selected_icon: { value: '', library: '' }, link: link(u) })),
    space_between: px(o.space ?? 8), icon_size: px(0), text_indent: px(0),
    text_color: o.color || C.light, text_color_hover: o.hover || C.white,
    ...typo('icon_typography', BODY, o.size || 15, o.weight || 400, { lh: 1.5 }),
    ...(o.cls ? wcls(o.cls) : {}),
    ...(o.settings || {}),
  });
}
// Gold-circle check list (course cards).
const checkList = (items) => widget('icon-list', {
  view: 'traditional',
  icon_list: items.map((t) => ({ _id: id(), text: t, selected_icon: { value: 'fas fa-check', library: 'fa-solid' } })),
  space_between: px(12), icon_size: px(11), text_indent: px(10), icon_color: C.white, text_color: C.navy,
  icon_self_vertical_align: 'flex-start',
  ...typo('icon_typography', BODY, [18, 17, 16], 400, { lh: 1.5 }),
  ...wcls('ctc-checks'),
});
// Rounded pill label (hero eyebrow, "CTEC & IRS Approved" badge).
const pill = (t, o = {}) => widget('heading', {
  title: t, header_size: 'span', title_color: o.color || C.goldDeep,
  ...typo('typography', BODY, o.size || [16, 15, 13], 700, { lh: 1.3, ls: o.ls ?? 0.08, transform: 'uppercase' }),
  _element_width: 'auto', _flex_align_self: 'flex-start',
  _background_background: 'classic', _background_color: o.bg || C.goldPale,
  _border_radius: o.radius || box(999), _padding: o.pad || box(6, 12, 6, 12),
  ...(o.settings || {}),
});
const fa = (value) => ({ value, library: value.startsWith('far') ? 'fa-regular' : 'fa-solid' });

module.exports = {
  C, HEAD, BODY, SITE, PHONE, URL, id, px, box, gap, auto, link, resp, typo, container, widget, cls, wcls, fa,
  band, stack, row, grid, linkBox, eyebrow, heading, H2, text, button, ctaCard, image, linkList, checkList, pill,
};
