// Shared building blocks for the Cabrera Torres Law Firm Elementor build.
// Everything here produces native Elementor containers + widgets (no HTML widgets),
// so every text, link, image and color stays editable in the Elementor panel.
const crypto = require('crypto');

const C = {
  // Espresso v3 palette: dark, boutique. Espresso / near-black dominate, ivory for contrast sections,
  // taupe (rose) as an accent only: rules, buttons, eyebrow lines, stars.
  ivory: '#F6F1EA', light: '#FBF8F4', white: '#FFFFFF', blush: '#F6F1EA',
  wood: '#2B1D17', espMid: '#4A362F', nearBlack: '#0F0D0C', heroBlack: '#1C1310', black: '#000000', lit: '#141414', cardDark: '#1F1512',
  rose: '#C4A08D', roseDeep: '#4A362F', roseHover: '#4A362F', sand: '#E6D6CB', mist: '#F6F1EA', smoke: '#9C8B80',
  ink: '#2B1D17', inkSoft: '#4A3F39', inkMuted: '#4A3F39', placeholder: '#9C8B80',
  line: 'rgba(74,54,47,0.18)', lineStrong: 'rgba(196,160,141,0.6)', hair: 'rgba(74,54,47,0.12)', rule: 'rgba(74,54,47,0.15)',
  roseLine: 'rgba(196,160,141,0.4)', darkLine: 'rgba(196,160,141,0.3)',
};
const FONT = 'Montserrat', HFONT = 'Cinzel', QFONT = 'Cormorant Garamond';
const PHONE = '770-777-HURT', TEL = 'tel:+17707774878', EMAIL = 'info@cabreratorres.com';
const URL = {
  home: '/', about: '/about/', jennifer: '/meet-jennifer/', practice: '/practice-areas/', results: '/case-results/',
  testimonials: '/testimonials/', faq: '/faq/', blog: '/blog/', contact: '/contact/',
  maps: 'https://maps.google.com/?q=1770+Indian+Trail+Lilburn+Rd+NW+Norcross+GA+30093',
};
const ADDRESS = '1770 Indian Trail Lilburn Rd NW<br>Suite 350<br>Norcross, GA 30093';

const id = () => crypto.randomBytes(4).toString('hex').slice(0, 7);
const px = (size, unit = 'px') => ({ unit, size, sizes: [] });
const box = (t, r = t, b = t, l = r, unit = 'px') => ({ unit, top: String(t), right: String(r), bottom: String(b), left: String(l), isLinked: false });
const gap = (n, r = n) => ({ unit: 'px', size: n, column: String(n), row: String(r), isLinked: n === r });
const auto = { unit: 'custom', size: 'auto' };
const link = (url) => ({ url, is_external: /^https?:/.test(url) ? 'on' : '', nofollow: '' });
const resp = (key, [d, t, m], fn = (v) => v) => {
  const o = {};
  if (d !== undefined) o[key] = fn(d);
  if (t !== undefined) o[`${key}_tablet`] = fn(t);
  if (m !== undefined) o[`${key}_mobile`] = fn(m);
  return o;
};

// Typography. sizes = number or [desktop, tablet, mobile]; ls in em (converted to px from the font size).
function typo(prefix, sizes, weight, extra = {}) {
  const arr = Array.isArray(sizes) ? sizes : [sizes];
  const s = { [`${prefix}_typography`]: 'custom', [`${prefix}_font_family`]: extra.family || FONT, [`${prefix}_font_weight`]: String(weight) };
  Object.assign(s, resp(`${prefix}_font_size`, arr, (v) => px(v)));
  if (extra.lh) s[`${prefix}_line_height`] = px(extra.lh, 'em');
  if (extra.ls !== undefined) s[`${prefix}_letter_spacing`] = px(+(extra.ls * arr[0]).toFixed(2));
  if (extra.transform) s[`${prefix}_text_transform`] = extra.transform;
  if (extra.style) s[`${prefix}_font_style`] = extra.style;
  return s;
}

const container = (settings, elements = [], isInner = true) => ({ id: id(), elType: 'container', isInner, settings, elements });
const widget = (widgetType, settings) => ({ id: id(), elType: 'widget', widgetType, settings, elements: [] });

/* ---------------------------------------------------------------- layout */
// Full-width page section: background on the outer box, content boxed at 1216px (1280 with 32px gutters).
function band(bg, children, o = {}) {
  const [pt, pb] = o.pad || [110, 120];
  return container({
    content_width: 'boxed', boxed_width: px(o.width || 1216), flex_direction: 'column',
    flex_gap: gap(o.gap ?? 0), flex_align_items: o.align || 'stretch',
    padding: box(pt, 32, pb, 32),
    padding_tablet: box(Math.round(pt * 0.8), 32, Math.round(pb * 0.8), 32),
    padding_mobile: box(Math.round(pt * 0.65), 20, Math.round(pb * 0.65), 20),
    background_background: 'classic', background_color: bg,
    ...(o.pattern ? patternOverlay(o.pattern) : {}),
    overflow: 'hidden',
    ...(o.anchor ? { _element_id: o.anchor } : {}),
    ...(o.settings || {}),
  }, children, false);
}

// The faint rose-gold art-deco pattern texture (3.5% opacity, 1400px tiles).
const patternOverlay = (media) => ({
  background_overlay_background: 'classic', background_overlay_image: media,
  background_overlay_position: 'center center', background_overlay_repeat: 'repeat',
  background_overlay_size: 'initial', background_overlay_bg_width: px(1400), background_overlay_opacity: px(0.035),
});

const stack = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(o.gap ?? 18),
  ...(o.align ? { flex_align_items: o.align } : {}),
  ...(o.justify ? { flex_justify_content: o.justify } : {}),
  ...(o.maxW ? { width: px(o.maxW), width_tablet: px(100, '%'), width_mobile: px(100, '%') } : {}),
  ...(o.settings || {}),
}, children);

const row = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'row', flex_wrap: 'wrap', padding: box(0),
  flex_gap: gap(o.gap ?? 16, o.rowGap ?? o.gap ?? 16), flex_align_items: o.align || 'center',
  ...(o.justify ? { flex_justify_content: o.justify } : {}),
  ...(o.settings || {}),
}, children);

// CSS grid. cols = [desktop, tablet, mobile] (numbers = equal fr columns, strings = custom templates)
function grid(children, o = {}) {
  const [d, t, m] = o.cols || [3, 1, 1];
  const col = (v) => (typeof v === 'number' ? px(v, 'fr') : { unit: 'custom', size: v });
  return container({
    container_type: 'grid', content_width: 'full', padding: box(0),
    grid_columns_grid: col(d), grid_columns_grid_tablet: col(t), grid_columns_grid_mobile: col(m),
    grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto,
    grid_auto_flow: 'row',
    grid_gaps: gap(o.gap ?? 24, o.rowGap ?? o.gap ?? 24),
    grid_gaps_mobile: gap(Math.min(o.gap ?? 24, 32), Math.min(o.rowGap ?? o.gap ?? 24, 32)),
    grid_align_items: o.align || 'stretch',
    ...(o.settings || {}),
  }, children);
}

/* --------------------------------------------------------------- widgets */
// Small uppercase gold label above headings
const eyebrow = (text, color = C.roseDeep, align = 'left', o = {}) => widget('heading', {
  title: text, header_size: o.tag || 'p', title_color: color, align, ...(o.alignM ? { align_mobile: o.alignM } : {}),
  ...typo('typography', o.size || 13, o.weight || 500, { lh: 1.4, ls: o.ls ?? 0.3, transform: 'uppercase' }),
  ...(o.settings || {}),
});

function heading(text, tag, sizes, color, align = 'left', o = {}) {
  return widget('heading', {
    title: text, header_size: tag, title_color: color, align, ...(o.alignM ? { align_mobile: o.alignM } : {}),
    ...typo('typography', sizes, o.weight || (o.family && o.family !== HFONT ? 400 : 600), { lh: o.lh || 1.12, ls: o.ls ?? 0.01, style: o.style, family: o.family || HFONT }),
    ...(o.link ? { link: link(o.link) } : {}),
    ...(o.maxW ? { _element_width: 'initial', _element_custom_width: px(o.maxW), _element_custom_width_tablet: px(100, '%') } : {}),
    ...(o.settings || {}),
  });
}
// v3: headings are one color (no pale taupe phrases except the homepage story line), so accent() is plain text.
const accent = (t) => t;
const H2 = (bold, light, dark, align = 'center', o = {}) => heading(
  `${bold}${light ? (o.br ? '<br>' : ' ') + light : ''}`, 'h2', o.sizes || [44, 38, 32], dark === 'dark' ? C.ivory : C.ink, align, { lh: 1.14, ...o },
);
const H3 = (text, color, sizes, o = {}) => heading(text, 'h3', sizes, color, o.align || 'left', { lh: o.lh || 1.2, ls: 0, ...o });

function text(html, o = {}) {
  const body = /^\s*</.test(html) ? html : `<p>${html}</p>`;
  return widget('text-editor', {
    editor: body, paragraph_spacing: px(o.pSpace ?? 0), align: o.align || 'left', ...(o.alignM ? { align_mobile: o.alignM } : {}),
    text_color: o.color || C.inkSoft, link_color: o.linkColor || C.roseDeep, link_hover_color: o.linkHover || C.rose,
    ...typo('typography', o.size || 17, o.weight || 400, { lh: o.lh || 1.7, ls: o.ls, transform: o.transform, style: o.style, family: o.family }),
    ...(o.maxW ? { _element_width: 'initial', _element_custom_width: px(o.maxW), _element_custom_width_tablet: px(100, '%') } : {}),
    ...(o.settings || {}),
  });
}

// Buttons (v3). 'gold' = primary taupe fill, espresso text, 700 (hover ivory on dark bands, espresso-mid on light);
// 'outlineDark' = taupe hairline, ivory text (on dark); 'outline' = taupe hairline, espresso text (on light);
// 'underline' = text link with taupe rule.
function button(label, url, variant = 'gold', o = {}) {
  const base = {
    text: label, link: link(url), align: o.align || '', ...(o.alignM ? { align_mobile: o.alignM } : {}),
    ...typo('typography', o.size || 14, 700, { lh: 1.2, ls: o.ls ?? 0.2, transform: 'uppercase' }),
    border_radius: box(0), text_padding: o.pad || box(18, 32, 18, 32),
    custom_css: 'selector .elementor-button { transition: background-color .15s, color .15s, border-color .15s; white-space: nowrap; }',
  };
  if (variant === 'gold') Object.assign(base, {
    button_text_color: C.wood, hover_color: o.dark === false ? C.ivory : C.wood,
    background_background: 'classic', background_color: C.rose,
    button_background_hover_background: 'classic', button_background_hover_color: o.dark === false ? C.espMid : C.ivory,
  });
  if (variant === 'outline' || variant === 'outlineDark') Object.assign(base, {
    ...typo('typography', o.size || 13, 700, { lh: 1.2, ls: o.ls ?? 0.22, transform: 'uppercase' }),
    button_text_color: variant === 'outlineDark' ? C.ivory : C.ink, hover_color: C.wood,
    background_background: 'classic', background_color: 'rgba(0,0,0,0)',
    button_background_hover_background: 'classic', button_background_hover_color: C.rose,
    border_border: 'solid', border_width: box(1), border_color: C.rose, button_hover_border_color: C.rose,
    text_padding: o.pad || box(16, 28, 16, 28),
  });
  if (variant === 'underline') Object.assign(base, {
    ...typo('typography', 12, 700, { lh: 1.2, ls: 0.22, transform: 'uppercase' }),
    button_text_color: o.dark ? C.ivory : C.espMid, hover_color: C.rose,
    background_background: 'classic', background_color: 'rgba(0,0,0,0)',
    button_background_hover_background: 'classic', button_background_hover_color: 'rgba(0,0,0,0)',
    border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.rose, text_padding: box(0, 0, 4, 0),
  });
  const btn = widget('button', { ...base, ...(o.settings || {}) });
  if (o.settings?.custom_css) btn.settings.custom_css = base.custom_css + '\n' + o.settings.custom_css;
  return btn;
}

function image(media, o = {}) {
  return widget('image', {
    image: media, image_size: 'full', align: o.align || 'center',
    ...(o.width !== undefined ? resp('width', Array.isArray(o.width) ? o.width : [o.width], (v) => (typeof v === 'object' ? v : px(v))) : {}),
    ...(o.link ? { link_to: 'custom', link: link(o.link) } : {}),
    ...(o.settings || {}),
  });
}

const fa = (value) => ({ value, library: value.startsWith('far') ? 'fa-regular' : 'fa-solid' });

// Icon List. items: [text] or [[text, url]]
function iconList(items, o = {}) {
  return widget('icon-list', {
    view: o.inline ? 'inline' : 'traditional',
    icon_list: items.map((it) => {
      const [t, u] = Array.isArray(it) ? it : [it];
      return { _id: id(), text: t, selected_icon: o.icon ? fa(o.icon) : { value: '', library: '' }, ...(u ? { link: link(u) } : {}) };
    }),
    space_between: px(o.space ?? 8), icon_size: px(o.iconSize ?? 0), text_indent: px(o.indent ?? (o.icon ? 10 : 0)),
    icon_color: o.iconColor || C.rose, text_color: o.color || C.inkMuted, text_color_hover: o.hover || o.color || C.inkMuted,
    ...typo('icon_typography', o.size || 14, o.weight || 300, { lh: o.lh || 1.5, ls: o.ls, transform: o.transform }),
    ...(o.settings || {}),
  });
}

// White card with a rose hairline and soft shadow (replaces the old frosted dark card)
// v3 cards: square, 1px border, no shadow.
const glassCSS = `selector { transition: border-color .15s; }
selector:hover { border-color: ${C.rose}; }`;
const glass = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(o.gap ?? 0), padding: o.pad || box(36, 32, 36, 32), padding_mobile: box(30, 24, 30, 24),
  background_background: 'classic', background_color: C.light,
  border_border: 'solid', border_width: box(1), border_color: 'rgba(74,54,47,0.12)',
  custom_css: glassCSS, ...(o.settings || {}),
}, children);

/* ---------------------------------------------------------------- header */
// v3 nav: espresso bar, light lockup at 50px, ivory uppercase links, taupe phone with hairline, primary button.
function header(m, menuId) {
  const nav = container({
    content_width: 'boxed', boxed_width: px(1400), flex_direction: 'row', flex_wrap: 'nowrap',
    flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(28), flex_gap_mobile: gap(12),
    padding: box(20, 40, 20, 40), padding_tablet: box(16, 24, 16, 24), padding_mobile: box(14, 16, 14, 16),
    background_background: 'classic', background_color: C.wood,
    border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: 'rgba(196,160,141,0.18)',
    sticky: 'top', sticky_on: ['desktop', 'tablet', 'mobile'], z_index: 50,
  }, [
    // 1255x260 lockup at 50px tall -> 241px wide.
    image(m.logoLight, { width: [241, 212, 172], link: '/', align: 'left', settings: { _element_width: 'initial', _element_custom_width: px(241), _element_custom_width_tablet: px(212), _element_custom_width_mobile: px(172), _flex_size: 'none' } }),
    widget('nav-menu', {
      menu: menuId, layout: 'horizontal', align_items: 'center', pointer: 'none',
      dropdown: 'tablet', toggle: 'burger', toggle_align: 'right', full_width: 'stretch',
      ...typo('menu_typography', 12, 500, { lh: 1.4, ls: 0.12, transform: 'uppercase' }),
      color_menu_item: C.ivory, color_menu_item_hover: C.rose, color_menu_item_active: C.rose,
      padding_horizontal_menu_item: px(12), padding_vertical_menu_item: px(8),
      ...typo('dropdown_typography', 14, 500, { ls: 0.12, transform: 'uppercase' }),
      color_dropdown_item: C.ivory, background_color_dropdown_item: C.wood,
      color_dropdown_item_hover: C.wood, background_color_dropdown_item_hover: C.rose,
      color_dropdown_item_active: C.rose, background_color_dropdown_item_active: C.espMid,
      padding_horizontal_dropdown_item: px(24), padding_vertical_dropdown_item: px(16),
      dropdown_top_distance: px(21),
      toggle_color: C.ivory, toggle_background_color: 'rgba(0,0,0,0)', toggle_size: px(26),
      _flex_size: 'grow', _flex_size_tablet: 'none', _flex_size_mobile: 'none',
      _flex_order_tablet: 'end', _flex_order_mobile: 'end',
      custom_css: 'selector .elementor-nav-menu--main .elementor-item { white-space: nowrap; }',
    }),
    text(`<a href="${TEL}">${PHONE}</a>`, {
      color: C.rose, size: 14, weight: 600, ls: 0.06, lh: 1.2, linkColor: C.rose, linkHover: C.ivory,
      settings: { _element_width: 'auto', _flex_size: 'none', _padding: box(0, 0, 0, 24), _border_border: 'solid', _border_width: box(0, 0, 0, 1), _border_color: 'rgba(196,160,141,0.35)', hide_tablet: 'hidden-tablet', hide_mobile: 'hidden-mobile', custom_css: 'selector { white-space: nowrap; }\n@media (max-width: 1300px) { selector { display: none; } }' },
    }),
    button('Free Consultation  →', URL.contact, 'gold', {
      size: 12, ls: 0.14, pad: box(14, 22, 14, 22),
      settings: { _flex_size: 'none', _flex_size_tablet: 'grow', hide_mobile: 'hidden-mobile', align_tablet: 'right' },
    }),
  ], false);
  return [nav];
}

/* ---------------------------------------------------------------- footer */
// Black footer: light lockup + tagline, Office / Contact / Firm columns, legal line.
function footer(m) {
  const label = (t) => eyebrow(t, C.rose, 'left', { size: 13, weight: 600, ls: 0.24 });
  const links = (items) => iconList(items, { color: C.sand, hover: C.rose, size: 15, weight: 400, space: 4, lh: 1.8 });
  return [container({
    content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(0),
    background_background: 'classic', background_color: C.black,
  }, [
    container({
      container_type: 'grid', content_width: 'boxed', boxed_width: px(1320),
      grid_columns_grid: { unit: 'custom', size: 'minmax(0,1.4fr) repeat(3,minmax(0,1fr))' }, grid_columns_grid_tablet: px(2, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
      grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto,
      grid_gaps: gap(40), grid_gaps_mobile: gap(36), grid_align_items: 'start',
      padding: box(64, 40, 40, 40), padding_mobile: box(56, 24, 32, 24),
    }, [
      stack([
        image(m.logoLight, { width: 250, link: '/', align: 'left', settings: { _element_width: 'initial', _element_custom_width: px(250), _element_custom_width_mobile: px(100, '%'), custom_css: 'selector img { max-width: 250px; }' } }),
        eyebrow('Advocate. Protect. Deliver.', C.rose, 'left', { size: 13, weight: 500, ls: 0.24 }),
      ], { gap: 18 }),
      stack([label('Office'), text(`<p>${ADDRESS}</p>`, { color: C.sand, size: 15, lh: 1.8 })], { gap: 10 }),
      stack([
        label('Contact'),
        text(`<p><a href="${TEL}" style="color:${C.ivory};font-weight:600">${PHONE}</a><br><a href="mailto:${EMAIL}">${EMAIL}</a><br>Hablamos Español</p>`, { color: C.sand, size: 15, lh: 1.8, linkColor: C.sand, linkHover: C.rose }),
      ], { gap: 10 }),
      stack([
        label('Firm'),
        links([['About', URL.about], ['Meet Jennifer', URL.jennifer], ['Practice Areas', URL.practice], ['Results', URL.results], ['Testimonials', URL.testimonials], ['FAQ', URL.faq], ['Resources', URL.blog], ['Contact', URL.contact]]),
      ], { gap: 10 }),
    ]),
    container({
      content_width: 'boxed', boxed_width: px(1320), flex_direction: 'row', flex_direction_mobile: 'column',
      flex_justify_content: 'space-between', flex_align_items: 'center', flex_align_items_mobile: 'flex-start', flex_wrap: 'wrap', flex_gap: gap(12, 10),
      padding: box(20, 40, 36, 40), padding_mobile: box(20, 24, 28, 24),
      border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: 'rgba(196,160,141,0.2)',
    }, [
      text('© 2026 Cabrera Torres Law Firm. All rights reserved.', { color: C.smoke, size: 13, settings: { _element_width: 'auto' } }),
      text(`Attorney advertising. Prior results do not guarantee a similar outcome. <a href="/privacy-policy/">Privacy Policy</a> · <a href="/sms-terms/">SMS Terms</a>`, { color: C.smoke, size: 13, linkColor: C.sand, linkHover: C.rose, settings: { _element_width: 'auto' } }),
    ]),
  ], false)];
}

// Page Settings: ivory canvas, hidden WP title, smooth anchor scrolling past the sticky nav, shared keyframes.
const pageSettings = {
  hide_title: 'yes', template: 'elementor_header_footer',
  background_background: 'classic', background_color: C.ivory,
  custom_css: `/* Let Elementor's Boxed Width control win over any older site CSS. */
selector .e-con.e-con-boxed > .e-con-inner { max-width: var(--content-width); }
html { scroll-behavior: smooth; }
selector [id] { scroll-margin-top: 90px; }
@keyframes ct-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes ct-up { from { transform: translateY(0); } to { transform: translateY(-50%); } }
@keyframes ct-down { from { transform: translateY(-50%); } to { transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { selector .ct-anim .elementor-icon-list-items, selector .ct-anim .elementor-heading-title { animation: none !important; } }
`,
};

module.exports = {
  C, FONT, HFONT, QFONT, PHONE, TEL, EMAIL, ADDRESS, URL, id, px, box, gap, auto, link, resp, typo, container, widget, fa,
  band, patternOverlay, stack, row, grid, eyebrow, heading, accent, H2, H3, text, button, image, iconList, glass,
  header, footer, pageSettings,
};
