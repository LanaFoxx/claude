// Bayfield Inn homepage (Claude Design handoff) as native Elementor content.
// Containers + Heading / Text Editor / Button / Image / Icon / Icon List / Social Icons /
// Nav Menu widgets only (no HTML widgets), so every text, link, image and
// color stays editable in the Elementor panel. Breakpoints: tablet <=1024, mobile <=767.
const crypto = require('crypto');

const C = {
  green: '#17301B', deep: '#122617', mid: '#1F4228', btnTop: '#1B3A21', cream: '#F5F2EC',
  ink: '#161B17', muted: '#4B5249', line: '#DCD7CC', white: '#FFFFFF',
  cream85: 'rgba(245,242,236,0.85)', cream70: 'rgba(245,242,236,0.7)', cream60: 'rgba(245,242,236,0.6)',
};
const SERIF = 'Newsreader', SANS = 'Geist';
const EXT = {
  book: 'https://partners.eviivo.com/bayfieldinn/s?hli=true', rooms: 'https://bayfieldinn.com/stay/the-inn/',
  dine: 'https://bayfieldinn.com/dine/', events: 'https://bayfieldinn.com/plan-an-event/',
  gallery: 'https://bayfieldinn.com/relax/lobby-gallery/', facebook: 'http://facebook.com/BayfieldInn',
  instagram: 'https://www.instagram.com/thebayfieldinn/', tripadvisor: 'https://www.tripadvisor.com/',
  privacy: 'https://bayfieldinn.com/privacy-policy', terms: 'https://bayfieldinn.com/terms-of-use',
  giftCards: '/gift-card/', webcam: 'https://bayfieldlive.com',
};

const PAGE = {
  history: '/history/', gallery: '/gallery/', webcam: '/webcam/', merch: '/merchandise/', giftCards: '/gift-card/', employment: '/employment/',
  deck: '/the-deck/', lakeside: '/lakeside-dining-room/', lounge: '/the-lounge/', creamery: '/the-creamery/',
};

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
const fa = (value) => ({ value, library: value.startsWith('fab') ? 'fa-brands' : value.startsWith('far') ? 'fa-regular' : 'fa-solid' });

// sizes = number or [desktop, tablet, mobile]; ls in px
function typo(prefix, family, sizes, weight, extra = {}) {
  const s = { [`${prefix}_typography`]: 'custom', [`${prefix}_font_family`]: family, [`${prefix}_font_weight`]: String(weight) };
  Object.assign(s, resp(`${prefix}_font_size`, Array.isArray(sizes) ? sizes : [sizes], (v) => px(v)));
  if (extra.lh) s[`${prefix}_line_height`] = px(extra.lh, 'em');
  if (extra.ls !== undefined) s[`${prefix}_letter_spacing`] = px(extra.ls);
  if (extra.transform) s[`${prefix}_text_transform`] = extra.transform;
  if (extra.style) s[`${prefix}_font_style`] = extra.style;
  return s;
}

const container = (settings, elements = [], isInner = true) => ({ id: id(), elType: 'container', isInner, settings, elements });
const widget = (widgetType, settings) => ({ id: id(), elType: 'widget', widgetType, settings, elements: [] });

const stack = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(o.gap ?? 18),
  ...(o.align ? { flex_align_items: o.align } : {}), ...(o.justify ? { flex_justify_content: o.justify } : {}),
  ...(o.maxW ? { width: px(o.maxW), width_tablet: px(100, '%'), width_mobile: px(100, '%') } : {}),
  ...(o.settings || {}),
}, children);
const row = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'row', flex_wrap: 'wrap', padding: box(0),
  flex_gap: gap(o.gap ?? 12), flex_align_items: o.align || 'center', ...(o.justify ? { flex_justify_content: o.justify } : {}),
  ...(o.settings || {}),
}, children);
const cols = (v) => (typeof v === 'number' ? px(v, 'fr') : { unit: 'custom', size: v });
const gridSettings = ([d, t, m]) => ({
  container_type: 'grid', grid_columns_grid: cols(d), grid_columns_grid_tablet: cols(t), grid_columns_grid_mobile: cols(m),
  grid_rows_grid: auto, grid_rows_grid_tablet: auto, grid_rows_grid_mobile: auto, grid_auto_flow: 'row',
});
const radial = (pos, a, b, c) => ({
  background_background: 'gradient', background_color: a, background_color_stop: px(0, '%'),
  background_color_b: c, background_color_b_stop: px(100, '%'), background_gradient_type: 'radial', background_gradient_position: pos,
});
const vGradient = (top, bottom) => ({
  background_background: 'gradient', background_color: top, background_color_stop: px(0, '%'),
  background_color_b: bottom, background_color_b_stop: px(100, '%'), background_gradient_type: 'linear', background_gradient_angle: px(180, 'deg'),
});

/* --------------------------------------------------------------- widgets */
// Small uppercase label with a hairline before it (and after it when centered).
const alpha = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
function eyebrow(text, color, o = {}) {
  const center = o.align === 'center';
  if (o.opacity) color = alpha(color, o.opacity);
  return widget('heading', {
    title: text, header_size: 'p', title_color: color, align: o.align || 'left',
    ...typo('typography', SANS, 12, 500, { lh: 1.3, ls: 2.6, transform: 'uppercase' }),
    custom_css: `selector .elementor-heading-title { display: flex; align-items: center; gap: 14px;${center ? ' justify-content: center;' : ''} }
selector .elementor-heading-title::before${center && !o.live ? ', selector .elementor-heading-title::after' : ''} { content: ""; flex: none; width: 36px; height: 1px; background: currentColor; opacity: .75; }${o.live ? `
selector .elementor-heading-title::before { width: 8px; height: 8px; border-radius: 50%; background: #E74C3C; opacity: 1; animation: bi-pulse 1.6s ease-in-out infinite; }` : ''}`,
  });
}

function heading(text, tag, sizes, color, o = {}) {
  return widget('heading', {
    title: text, header_size: tag, title_color: color, align: o.align || 'left',
    ...typo('typography', SERIF, sizes, o.weight || 300, { lh: o.lh || 1.05, ls: o.ls ?? 0, transform: o.transform }),
    ...(o.maxW ? { _element_width: 'initial', _element_custom_width: px(o.maxW), _element_custom_width_tablet: px(100, '%') } : {}),
    custom_css: 'selector .elementor-heading-title { text-wrap: balance; }',
    ...(o.settings || {}),
  });
}

function text(html, o = {}) {
  const body = /^\s*</.test(html) ? html : `<p>${html}</p>`;
  return widget('text-editor', {
    editor: body, paragraph_spacing: px(0), align: o.align || 'left',
    text_color: o.color || C.muted, link_color: o.linkColor || C.green, link_hover_color: o.linkColor || C.green,
    ...typo('typography', o.family || SANS, o.size || 16, o.weight || 300, { lh: o.lh || 1.6, style: o.style, ls: o.ls }),
    ...(o.maxW ? { _element_width: 'initial', _element_custom_width: px(o.maxW), _element_custom_width_tablet: px(100, '%') } : {}),
    ...(o.inline ? { _element_width: 'auto' } : {}),
    ...(o.settings || {}),
  });
}

// variant: 'light' (cream gradient), 'dark' (green gradient), 'outline' (cream outline), 'text'
function button(label, url, variant, o = {}) {
  const upper = o.upper !== false && variant !== 'light';
  const s = {
    text: label, link: link(url), align: o.align || '',
    ...typo('typography', SANS, o.size || 12, 500, { lh: 1.2, ls: upper ? 1.2 : 0.5, transform: upper ? 'uppercase' : undefined }),
    border_radius: box(2), text_padding: o.pad || box(14, 26, 14, 26),
    ...(o.icon ? { selected_icon: fa(o.icon), icon_align: 'row-reverse', icon_indent: px(10) } : {}),
  };
  if (variant === 'light') Object.assign(s, vGradient(C.white, C.cream), {
    button_text_color: C.green, hover_color: C.green, button_background_hover_background: 'classic', button_background_hover_color: C.white,
    button_box_shadow_box_shadow_type: 'yes', button_box_shadow_box_shadow: { horizontal: 0, vertical: 10, blur: 24, spread: -14, color: 'rgba(0,0,0,0.5)' },
  });
  if (variant === 'dark') Object.assign(s, vGradient(C.btnTop, C.green), {
    button_text_color: C.cream, hover_color: C.cream, button_background_hover_background: 'classic', button_background_hover_color: C.mid,
    button_box_shadow_box_shadow_type: 'yes', button_box_shadow_box_shadow: { horizontal: 0, vertical: 10, blur: 24, spread: -14, color: 'rgba(23,48,27,0.6)' },
  });
  if (variant === 'outline') Object.assign(s, {
    button_text_color: C.cream, background_background: 'classic', background_color: 'rgba(0,0,0,0)',
    hover_color: C.green, button_background_hover_background: 'classic', button_background_hover_color: C.cream,
    border_border: 'solid', border_width: box(1), border_color: C.cream70, button_hover_border_color: C.cream,
  });
  if (variant === 'text') Object.assign(s, {
    button_text_color: o.color || C.cream85, background_background: 'classic', background_color: 'rgba(0,0,0,0)',
    hover_color: C.cream, button_background_hover_background: 'classic', button_background_hover_color: 'rgba(0,0,0,0)',
    text_padding: box(14, 4, 14, 4),
  });
  return widget('button', { ...s, ...(o.settings || {}) });
}

function image(media, o = {}) {
  return widget('image', {
    image: media, image_size: 'full', align: o.align || 'center',
    ...(o.width ? resp('width', Array.isArray(o.width) ? o.width : [o.width], (v) => px(v)) : {}),
    ...(o.link ? { link_to: 'custom', link: link(o.link) } : {}),
    ...(o.settings || {}),
  });
}

// Linked container (renders as <a>) — the whole card is clickable.
const linked = (url) => ({ html_tag: 'a', link: link(url) });
const zoomOnHover = 'selector .bi-photo img, selector .bi-photo-bg { transition: transform .8s ease; }\nselector:hover .bi-photo img { transform: scale(1.03); }';

/* ---------------------------------------------------------------- header */
// Promo bar (dismissible: the "Bayfield interactions" Custom Code snippet remembers the
// dismissal for the session) + sticky header. The header logo fades in once the visitor
// scrolls past the hero logo (always visible in the Elementor editor).
function header(m, menuId) {
  const promo = container({
    content_width: 'full', flex_direction: 'row', flex_wrap: 'wrap', flex_justify_content: 'center', flex_align_items: 'center',
    flex_gap: gap(18, 6), flex_gap_mobile: gap(10, 4), padding: box(10, 56, 10, 48), padding_tablet: box(10, 56, 10, 32), padding_mobile: box(10, 48, 10, 20),
    background_background: 'classic', background_color: '#0F2113',
    border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: 'rgba(245,242,236,0.12)', z_index: 31,
    css_classes: 'bi-promo', custom_css: 'html.bi-promo-off selector { display: none !important; }',
  }, [
    widget('heading', { title: 'Black Friday', header_size: 'p', title_color: 'rgba(245,242,236,0.7)', _element_width: 'auto',
      ...typo('typography', SANS, 10.5, 500, { lh: 1.4, ls: 2.3, transform: 'uppercase' }) }),
    text('Gift cards for the lake lover on your list. Buy now, stay next summer.', { color: C.cream, size: 13, lh: 1.45, align: 'center', inline: true, ls: 0.26 }),
    button('Buy gift cards →', EXT.giftCards, 'text', { color: C.cream, size: 13, upper: false, pad: box(0, 0, 1, 0), settings: {
      _element_width: 'auto', typography_letter_spacing: px(0.26), hover_color: 'rgba(245,242,236,0.8)',
      border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.cream60, border_radius: box(0),
    } }),
    button('×', '#', 'text', { color: 'rgba(245,242,236,0.7)', size: 20, upper: false, pad: box(6, 10, 6, 10), settings: {
      _css_classes: 'bi-promo-close', _position: 'absolute', _offset_orientation_h: 'end', _offset_x_end: px(16), _offset_x_end_mobile: px(8),
      _offset_orientation_v: 'start', _offset_y: px(50, '%'), _element_width: 'auto', typography_line_height: px(1, 'em'),
      hover_color: C.cream, custom_css: 'selector { transform: translateY(-50%); }',
    } }),
  ], false);

  const bar = container({
    content_width: 'boxed', boxed_width: px(1480), flex_direction: 'row', flex_wrap: 'nowrap',
    flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(24), flex_gap_mobile: gap(12),
    min_height: px(96), min_height_tablet: px(88), min_height_mobile: px(76), padding: box(0, 48, 0, 48), padding_tablet: box(0, 32, 0, 32), padding_mobile: box(0, 20, 0, 20),
    background_background: 'classic', background_color: 'rgba(255,255,255,0.92)',
    border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.line,
    sticky: 'top', sticky_on: ['desktop', 'tablet', 'mobile'], z_index: 30,
    custom_css: `selector { backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
/* Homepage only: the hero shows the big logo, so the header logo waits for a scroll. */
body.home:not(.elementor-editor-active) selector .bi-header-logo { opacity: 0; transform: translateY(6px); pointer-events: none; transition: opacity .4s ease, transform .4s ease; }
body.home.bi-scrolled selector .bi-header-logo { opacity: 1; transform: none; pointer-events: auto; }`,
  }, [
    image(m.logo, { width: [140, 128, 104], link: '/', align: 'left', settings: { _css_classes: 'bi-header-logo', _element_width: 'initial', _element_custom_width: px(140), _element_custom_width_tablet: px(128), _element_custom_width_mobile: px(104), _flex_size: 'none' } }),
    widget('nav-menu', {
      menu: menuId, layout: 'horizontal', align_items: 'center', pointer: 'underline', animation_line: 'fade',
      dropdown: 'tablet', toggle: 'burger', toggle_align: 'right', full_width: 'stretch',
      ...typo('menu_typography', SERIF, 18, 400, { lh: 1.3, ls: 0.2 }),
      color_menu_item: C.ink, color_menu_item_hover: C.ink, color_menu_item_active: C.ink,
      pointer_color_menu_item_hover: C.green, pointer_color_menu_item_active: C.green, pointer_width: px(1),
      padding_horizontal_menu_item: px(18), padding_vertical_menu_item: px(8),
      // Tablet/mobile menu: green panel with large serif links, as in the design.
      ...typo('dropdown_typography', SERIF, [17, 26, 24], 400, { lh: 1.1 }),
      color_dropdown_item: C.cream, background_color_dropdown_item: C.green,
      color_dropdown_item_hover: C.cream, background_color_dropdown_item_hover: C.deep,
      color_dropdown_item_active: C.cream, background_color_dropdown_item_active: C.deep,
      padding_horizontal_dropdown_item: px(22), padding_horizontal_dropdown_item_tablet: px(32), padding_horizontal_dropdown_item_mobile: px(20), padding_vertical_dropdown_item: px(13), padding_vertical_dropdown_item_tablet: px(18),
      dropdown_top_distance: px(31), dropdown_top_distance_mobile: px(21),
      toggle_color: C.green, toggle_background_color: 'rgba(0,0,0,0)', toggle_size: px(24),
      _flex_size: 'grow', _flex_size_tablet: 'none', _flex_size_mobile: 'none',
      _flex_order_tablet: 'end', _flex_order_mobile: 'end',
      custom_css: `selector .elementor-nav-menu--dropdown { background: #17301B; }
selector nav.elementor-nav-menu--dropdown.elementor-nav-menu__container { padding-bottom: 20px; }
selector .elementor-nav-menu--dropdown a { border-bottom: 1px solid rgba(245,242,236,.15); }
selector .elementor-nav-menu--main .sub-menu { padding: 0 !important; }
selector .elementor-nav-menu--main .sub-menu > li:last-child > a { border-bottom: 0; }
/* Webcam stands out (client sitemap): green pill with a live dot. */
@keyframes bi-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
selector .bi-menu-cam > a::before { content: "" !important; display: inline-block !important; width: 7px !important; height: 7px !important; border-radius: 50%; background: #E74C3C !important; margin: 0 9px 0 0 !important; vertical-align: 2px; position: static !important; transform: none !important; animation: bi-pulse 1.6s ease-in-out infinite; }
selector .elementor-nav-menu--main .bi-menu-cam > a { background: #17301B; color: #F5F2EC !important; border-radius: 2px; padding: 8px 16px !important; margin: 0 6px; }
selector .elementor-nav-menu--main .bi-menu-cam > a:hover { background: #0F2113; }
selector .elementor-nav-menu--main .bi-menu-cam > a::after { display: none; }`,
    }),
    container({
      content_width: 'full', width: auto, width_tablet: auto, width_mobile: auto,
      flex_direction: 'row', flex_align_items: 'center', flex_gap: gap(18), flex_gap_mobile: gap(10),
      flex_justify_content: 'flex-end', _flex_size: 'none', _flex_size_tablet: 'grow', _flex_size_mobile: 'grow', padding: box(0),
    }, [
      button('715.779.3363', 'tel:7157793363', 'text', { color: 'rgba(22,27,23,0.8)', size: 14, upper: false, pad: box(10, 0, 10, 0),
        settings: { hover_color: C.ink, hide_mobile: 'hidden-mobile', typography_letter_spacing: px(0) } }),
      button('Book a Room', EXT.book, 'dark', { size: 13.5, upper: false, pad: box(15, 26, 15, 26),
        settings: { text_padding_mobile: box(11, 16, 11, 16), typography_letter_spacing: px(0.5), button_background_hover_color: '#0F2113' } }),
    ]),
  ], false);
  return [promo, bar];
}

/* ---------------------------------------------------------------- footer */
function footer(m) {
  const label = (t) => widget('heading', {
    title: t, header_size: 'p', title_color: 'rgba(245,242,236,0.65)',
    ...typo('typography', SANS, 10.5, 500, { lh: 1.3, ls: 2.1, transform: 'uppercase' }),
  });
  const list = (items, o = {}) => widget('icon-list', {
    view: 'traditional',
    icon_list: items.map(([t, u, icon]) => ({ _id: id(), text: t, selected_icon: icon ? fa(icon) : { value: '', library: '' }, ...(u ? { link: link(u) } : {}) })),
    space_between: px(o.space ?? 10), icon_size: px(o.icon ? 13 : 0), text_indent: px(o.icon ? 12 : 0),
    icon_color: 'rgba(245,242,236,0.6)', icon_self_vertical_align: 'flex-start', icon_vertical_offset: px(3),
    text_color: o.color || C.cream, text_color_hover: C.white,
    ...typo('icon_typography', SANS, o.size || 14, o.weight || 400, { lh: 1.5, ls: o.ls, transform: o.transform }),
    ...(o.twoCol ? { custom_css: 'selector .elementor-icon-list-items { display: grid; grid-template-columns: repeat(2, max-content); column-gap: 36px; row-gap: 10px; }\nselector .elementor-icon-list-item { margin: 0 !important; padding: 0 !important; }' } : {}),
  });
  return [container({
    content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(0), _element_id: 'contact',
    ...radial('bottom left', C.mid, null, C.green),
  }, [
    container({
      ...gridSettings([4, 2, 1]), content_width: 'boxed', boxed_width: px(1480),
      grid_gaps: gap(48, 40), grid_gaps_tablet: gap(32, 40), grid_gaps_mobile: gap(24, 36), grid_align_items: 'start',
      padding: box(80, 48, 32, 48), padding_tablet: box(64, 32, 32, 32), padding_mobile: box(48, 20, 28, 20),
    }, [
      stack([
        image(m.logoWhite, { width: 160, link: '/', align: 'left', settings: { _element_width: 'initial', _element_custom_width: px(160) } }),
        text('On the shores of Lake Superior since 1898.', { color: 'rgba(245,242,236,0.8)', size: 13.5, maxW: 280 }),
      ], { gap: 18 }),
      stack([
        label('Contact'),
        list([
          ['20 Rittenhouse Avenue<br>Bayfield, WI 54814', 'https://maps.google.com/?q=20+Rittenhouse+Avenue+Bayfield+WI+54814', 'fas fa-map-marker-alt'],
          ['(715) 779-3363', 'tel:7157793363', 'fas fa-phone-alt'],
          ['info@thebayfieldinn.com', 'mailto:info@thebayfieldinn.com', 'far fa-envelope'],
        ], { icon: true, space: 14 }),
      ], { gap: 14 }),
      stack([
        label('Explore'),
        list([['Rooms', '/#rooms'], ['Dining', '/#dining'], ['History', PAGE.history], ['Gallery', PAGE.gallery], ['Webcam', PAGE.webcam], ['Gift Cards', PAGE.giftCards], ['Employment', PAGE.employment], ['Contact', '/#contact']],
          { size: 13, weight: 500, ls: 1, transform: 'uppercase', color: 'rgba(245,242,236,0.9)', twoCol: true }),
      ], { gap: 14 }),
      stack([
        label('Follow us'),
        widget('social-icons', {
          social_icon_list: [
            ['fab fa-facebook-f', EXT.facebook], ['fab fa-instagram', EXT.instagram], ['fab fa-tripadvisor', EXT.tripadvisor],
          ].map(([icon, url]) => ({ _id: id(), social_icon: fa(icon), link: link(url) })),
          shape: 'circle', align: 'left', icon_color: 'custom', icon_primary_color: 'rgba(0,0,0,0)', icon_secondary_color: C.cream,
          icon_size: px(15), icon_padding: px(0.95, 'em'), icon_spacing: px(12),
          image_border_border: 'solid', image_border_width: box(1), image_border_color: 'rgba(245,242,236,0.5)',
          hover_primary_color: C.cream, hover_secondary_color: C.green, hover_border_color: C.cream,
        }),
        text('Est. 1898', { family: SERIF, style: 'italic', size: 15, weight: 400, color: 'rgba(245,242,236,0.75)', settings: { _margin: box(4, 0, 0, 0) } }),
      ], { gap: 16 }),
    ]),
    container({
      content_width: 'boxed', boxed_width: px(1480), flex_direction: 'row', flex_direction_mobile: 'column',
      flex_justify_content: 'space-between', flex_align_items: 'center', flex_align_items_mobile: 'flex-start', flex_wrap: 'wrap', flex_gap: gap(32, 10),
      padding: box(16, 48, 20, 48), padding_tablet: box(16, 32, 20, 32), padding_mobile: box(16, 20, 20, 20),
      border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: 'rgba(245,242,236,0.15)',
    }, [
      text('© 2026 The Bayfield Inn · Bayfield, Wisconsin', { color: 'rgba(245,242,236,0.7)', size: 12, weight: 400, lh: 1.5, inline: true }),
      widget('icon-list', {
        view: 'inline', icon_list: [['Privacy', EXT.privacy], ['Terms', EXT.terms]].map(([t, u]) => ({ _id: id(), text: t, selected_icon: { value: '', library: '' }, link: link(u) })),
        space_between: px(22), icon_size: px(0), text_indent: px(0), text_color: 'rgba(245,242,236,0.7)', text_color_hover: C.cream,
        ...typo('icon_typography', SANS, 12, 400, { lh: 1.5 }), _element_width: 'auto',
      }),
    ]),
  ], false)];
}

/* -------------------------------------------------------------- homepage */
function home(m) {
  const section = (settings, children) => container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...settings }, children, false);
  const bigPad = { padding: box(130, 48, 130, 48), padding_tablet: box(96, 32, 96, 32), padding_mobile: box(72, 20, 72, 20) };
  const darkBtn = (label, url, o = {}) => button(label, url, 'dark', { ...o, settings: { button_background_hover_color: '#0F2113', ...(o.settings || {}) } });
  const smallEyebrow = (t, color, o) => {
    const w = eyebrow(t, color, o);
    Object.assign(w.settings, { typography_font_size: px(11.5), typography_letter_spacing: px(2.76) });
    return w;
  };
  // Section intro: eyebrow + two-line h2 on the left, a button on the right (wraps under on mobile).
  const intro = (eb, title, btn, dark) => row([
    stack([smallEyebrow(eb, dark ? C.cream : C.green, { opacity: dark ? 0.8 : undefined }),
      heading(title, 'h2', [54, 44, 34], dark ? C.cream : C.green, { lh: 1, ls: -1 })], { gap: 16, settings: { width: auto, width_tablet: auto, width_mobile: px(100, '%') } }),
    btn,
  ], { gap: 24, align: 'flex-end', justify: 'space-between', settings: { flex_gap: gap(40, 24), z_index: 1 } });

  // Photo card (Rooms, Dining). badge: { text } number tag or { logo, bg } round logo.
  const photoCard = (img, title, body, url, o = {}) => {
    const dark = !!o.dark;
    const badge = o.badge?.text
      ? widget('heading', {
        title: o.badge.text, header_size: 'span', title_color: C.green, ...typo('typography', SANS, 11, 400, { lh: 1.2, ls: 2.2 }),
        _position: 'absolute', _offset_orientation_h: 'start', _offset_x: px(16), _offset_orientation_v: 'start', _offset_y: px(16), _element_width: 'auto',
        _background_background: 'classic', _background_color: C.cream, _padding: box(6, 10, 6, 10), _border_radius: box(2), _z_index: 2,
      })
      : o.badge?.logo ? image(o.badge.logo, { width: 64, settings: {
        _position: 'absolute', _offset_orientation_h: 'start', _offset_x: px(14), _offset_orientation_v: 'start', _offset_y: px(14),
        _element_width: 'initial', _element_custom_width: px(64), _background_background: 'classic', _background_color: o.badge.bg,
        _border_radius: box(50, 50, 50, 50, '%'), _z_index: 2, alt_text: '',
        _box_shadow_box_shadow_type: 'yes', _box_shadow_box_shadow: { horizontal: 0, vertical: 6, blur: 16, spread: -8, color: 'rgba(0,0,0,0.5)' },
        custom_css: 'selector { overflow: hidden; line-height: 0; }\nselector img { width: 64px; height: 64px; object-fit: contain; }',
      } }) : null;
    return container({
      content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(dark ? 14 : 16), ...linked(url), custom_css: zoomOnHover,
    }, [
      container({
        content_width: 'full', padding: box(0), overflow: 'hidden', border_radius: box(4), background_background: 'classic', background_color: C.line,
        ...(dark ? {} : { box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 40, blur: 60, spread: -40, color: 'rgba(23,48,27,0.5)' } }),
      }, [
        image(img, { settings: { _css_classes: 'bi-photo', alt_text: o.alt || title,
          custom_css: `selector { overflow: hidden; line-height: 0; }\nselector img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; object-position: ${o.pos || 'center center'}; }` } }),
        ...(badge ? [badge] : []),
      ]),
      container({
        content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', flex_justify_content: 'space-between', flex_align_items: 'flex-end', flex_gap: gap(12),
        padding: box(0, 0, dark ? 10 : 12, 0), border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: dark ? 'rgba(245,242,236,0.25)' : 'rgba(23,48,27,0.25)',
      }, [
        widget('heading', { title, header_size: 'h3', title_color: dark ? C.cream : C.green, ...typo('typography', SERIF, dark ? [24, 24, 24] : [28, 24, 28], 400, { lh: 1 }) }),
        widget('icon', { selected_icon: fa('fas fa-arrow-right'), primary_color: dark ? C.cream : C.green, size: px(14), _flex_size: 'none',
          custom_css: 'selector { transition: transform .25s; }\na:hover selector { transform: translateX(4px); }' }),
      ]),
      text(body, { color: dark ? 'rgba(245,242,236,0.8)' : C.muted, size: dark ? 13.5 : 14, lh: 1.5 }),
    ]);
  };

  // Full-bleed photo half of a split section (background image, so it is swapped in the Style tab).
  const photo = (img, posn, extra = [], settings = {}) => container({
    content_width: 'full', padding: box(0), min_height: px(280), overflow: 'hidden',
    background_background: 'classic', background_color: C.line, background_image: img, background_size: 'cover', background_position: posn, background_repeat: 'no-repeat',
    custom_css: 'selector { aspect-ratio: 16 / 10; }', ...settings,
  }, extra);
  const copy = (children) => container({
    content_width: 'full', flex_direction: 'column', flex_justify_content: 'center', flex_gap: gap(22),
    padding: box(48, 80, 48, 80), padding_tablet: box(48, 40, 48, 40), padding_mobile: box(48, 20, 56, 20),
  }, children);

  // Booking bar: Elementor Form that redirects to eviivo with the chosen dates, guests and rooms.
  const bookingForm = () => {
    const opts = (n) => Array.from({ length: n }, (_, i) => String(i + 1)).join('\n');
    const cell = (custom_id, field_type, field_label, extra = {}) => ({
      _id: id(), custom_id, field_type, field_label, width: '25', width_tablet: '25', width_mobile: '50', ...extra,
    });
    return container({
      content_width: 'full', padding: box(0), width: px(600), width_tablet: px(600), width_mobile: px(100, '%'), _margin: box(8, 0, 0, 0),
      border_border: 'solid', border_width: box(1), border_color: 'rgba(245,242,236,0.35)', border_radius: box(3),
      background_background: 'classic', background_color: 'rgba(15,33,19,0.5)',
      box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 30, blur: 50, spread: -40, color: 'rgba(0,0,0,0.6)' },
      custom_css: 'selector { max-width: 100%; backdrop-filter: blur(6px); }',
    }, [
      widget('form', {
        form_name: 'Check availability',
        form_fields: [
          cell('checkin', 'date', 'Check in', { use_native_date: 'yes', required: 'true' }),
          cell('checkout', 'date', 'Check out', { use_native_date: 'yes', required: 'true' }),
          cell('adults', 'select', 'Adults', { field_options: opts(14), field_value: '2' }),
          cell('children', 'select', 'Children', { field_options: ['0', ...opts(10).split('\n')].join('\n'), field_value: '0' }),
        ],
        show_labels: 'true', input_size: 'sm', button_text: 'Check availability', button_size: 'sm', button_width: '', button_align: 'end',
        selected_button_icon: fa('fas fa-arrow-right'), button_icon_align: 'row-reverse', button_icon_indent: px(10),
        submit_actions: ['redirect'],
        // Fallback only: the "Bayfield interactions" snippet sends the search to eviivo with the
        // parameter names and mm-dd-yyyy dates of eviivo's own search widget.
        redirect_to: `${EXT.book}&startdate=[field id="checkin"]&enddate=[field id="checkout"]&adults1=[field id="adults"]&children1=[field id="children"]`,
        column_gap: px(0), row_gap: px(0), label_spacing: px(6),
        label_color: 'rgba(245,242,236,0.65)', ...typo('label_typography', SANS, 10.5, 500, { lh: 1.2, ls: 2.1, transform: 'uppercase' }),
        field_text_color: C.cream, field_background_color: 'rgba(0,0,0,0)', field_border_color: 'rgba(0,0,0,0)', field_border_width: box(0), field_border_radius: box(0),
        ...typo('field_typography', SANS, [15, 14, 15], 300, { lh: 1.4 }),
        button_background_color: C.cream, button_text_color: C.green, button_background_hover_color: C.white, button_hover_color: C.green,
        button_border_radius: box(2), ...typo('button_typography', SANS, 13, 500, { lh: 1.2, ls: 0.5 }), button_text_padding: box(14, 26, 14, 26),
        required_field_color: 'rgba(0,0,0,0)', success_message: 'Opening availability…',
        custom_css: `/* Four bordered cells over a button row. */
selector .elementor-field-group:not(.elementor-field-type-submit) { padding: 14px 16px !important; border-right: 1px solid rgba(245,242,236,.2); border-bottom: 1px solid rgba(245,242,236,.2); margin: 0 !important; }
selector .elementor-field-group:nth-child(4) { border-right: 0; }
selector .elementor-field-group .elementor-field { padding: 0 !important; min-height: 24px; color-scheme: dark; min-width: 0; }
selector input[type=date]::-webkit-calendar-picker-indicator { opacity: .55; margin-left: 2px; }
selector .elementor-field-group select.elementor-field { cursor: pointer; }
selector .elementor-field-group select option { color: #161B17; }
selector .elementor-select-wrapper::before { color: rgba(245,242,236,.6); font-size: 11px; right: 0; }
selector .elementor-field-type-submit { padding: 12px !important; margin: 0 !important; }
selector .elementor-button { background: linear-gradient(to bottom, #FFFFFF, #F0ECE3); box-shadow: 0 10px 24px -14px rgba(0,0,0,.6); }
selector .elementor-message { color: #F5F2EC; padding: 0 18px 12px; margin: 0; font-size: 13px; }
@media (max-width: 767px) { selector .elementor-field-group:nth-child(2) { border-right: 0; } selector .elementor-field-type-submit .elementor-button { width: 100%; } }`,
      }),
      text('Best rate guaranteed', { color: 'rgba(245,242,236,0.75)', size: 12.5, lh: 1.4, settings: {
        _position: 'absolute', _offset_orientation_h: 'start', _offset_x: px(18), _offset_orientation_v: 'end', _offset_y_end: px(26),
        _element_width: 'auto', hide_mobile: 'hidden-mobile',
      } }),
    ]);
  };

  // Hero: full-width photo slideshow (swap photos in the container's Background › Slideshow).
  // Logo, headline and the booking bar sit over a soft dark fade on the left.
  const hero = section({
    _element_id: 'book', flex_direction: 'column', flex_justify_content: 'center',
    background_background: 'slideshow', background_slideshow_gallery: [m.exterior, m.heroDeck, m.marina, m.sunset].map((x) => ({ id: x.id, url: x.url })),
    background_slideshow_slide_duration: 6000, background_slideshow_transition_duration: 1200, background_slideshow_slide_transition: 'fade',
    background_slideshow_background_size: 'cover', background_slideshow_background_position: 'center center', background_slideshow_ken_burns: 'yes', background_slideshow_loop: 'yes',
    background_overlay_background: 'gradient', background_overlay_color: 'rgba(12,26,15,0.86)', background_overlay_color_stop: px(0, '%'),
    background_overlay_color_b: 'rgba(12,26,15,0)', background_overlay_color_b_stop: px(75, '%'), background_overlay_gradient_type: 'linear',
    background_overlay_gradient_angle: px(90, 'deg'), background_overlay_gradient_angle_tablet: px(180, 'deg'), background_overlay_gradient_angle_mobile: px(180, 'deg'),
    background_overlay_opacity: px(1),
    padding: box(72, 48, 72, 48), padding_tablet: box(64, 32, 64, 32), padding_mobile: box(48, 20, 48, 20),
    min_height: px(640), min_height_tablet: px(560), min_height_mobile: px(0),
    custom_css: `@media (min-width: 1025px) { selector { min-height: calc(100vh - 136px); } }
@media (max-width: 1024px) { selector > .elementor-background-overlay { background-image: linear-gradient(180deg, rgba(12,26,15,.55) 0%, rgba(12,26,15,.82) 100%) !important; } }
/* Photo controls added by the "Bayfield interactions" snippet. */
selector .bi-hero-dots { position: absolute; left: 50%; bottom: 26px; transform: translateX(-50%); z-index: 3; display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 999px; background: rgba(12,26,15,.45); backdrop-filter: blur(6px); }
selector .bi-hero-dots button, selector .bi-hero-dots button:hover, selector .bi-hero-dots button:focus { padding: 0; border: 0; cursor: pointer; color: #F5F2EC; }
selector .bi-hero-dots__dot { width: 9px; height: 9px; border-radius: 50%; background: rgba(245,242,236,.45) !important; transition: background .25s, transform .25s; }
selector .bi-hero-dots__dot:hover { background: rgba(245,242,236,.8) !important; }
selector .bi-hero-dots__dot.is-active { background: #F5F2EC !important; transform: scale(1.25); }
selector .bi-hero-dots__arrow { width: 28px; height: 28px; border-radius: 50%; background: transparent !important; font-size: 15px; line-height: 28px; opacity: .85; }
selector .bi-hero-dots__arrow:hover { opacity: 1; background: rgba(245,242,236,.15) !important; }
@media (max-width: 767px) { selector { padding-bottom: 84px !important; } selector .bi-hero-dots { bottom: 18px; } }`,
  }, [
    container({ content_width: 'full', padding: box(0), flex_direction: 'column', flex_gap: gap(24), flex_gap_mobile: gap(20), width: px(640), width_tablet: px(640), width_mobile: px(100, '%'), z_index: 2,
      custom_css: 'selector { max-width: 100%; }' }, [
      image(m.logoWhite, { width: [300, 280, 220], align: 'left', settings: { _element_width: 'initial', _element_custom_width: px(300), _element_custom_width_tablet: px(280), _element_custom_width_mobile: px(220),
        alt_text: 'Bayfield Inn — Est. 1898', _margin: box(0, 0, 8, 0), custom_css: 'selector { max-width: 70%; }' } }),
      heading('The best darn view on Lake Superior.', 'h1', [58, 48, 36], C.cream, { lh: 1, ls: -1.1, settings: { typography_letter_spacing_mobile: px(-0.7),
        custom_css: 'selector .elementor-heading-title { text-wrap: balance; text-shadow: 0 2px 24px rgba(0,0,0,.25); }' } }),
      bookingForm(),
      button('See the rooms', '#rooms', 'text', { color: 'rgba(245,242,236,0.85)', size: 12.5, icon: 'fas fa-arrow-right', pad: box(0, 0, 3, 0), settings: {
        typography_letter_spacing: px(0.75), border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: 'rgba(245,242,236,0.4)', border_radius: box(0), icon_indent: px(8) } }),
    ]),
  ]);

  // Green and white, side by side: the welcome right under the hero photo.
  const about = section({ ...gridSettings(['5fr 7fr', 1, 1]), _element_id: 'about', grid_gaps: gap(0, 0), grid_align_items: 'stretch' }, [
    container({ content_width: 'full', flex_direction: 'column', flex_justify_content: 'center', flex_gap: gap(20),
      padding: box(96, 64, 96, 72), padding_tablet: box(64, 40, 56, 40), padding_mobile: box(56, 20, 48, 20), ...radial('bottom left', C.mid, null, C.deep) }, [
      eyebrow('Est. 1898', C.cream, { opacity: 0.8 }),
      heading('A timeless lakeside escape, historic charm with modern comfort.', 'h2', [44, 38, 30], C.cream, { ls: -0.9 }),
    ]),
    container({ content_width: 'full', flex_direction: 'column', flex_justify_content: 'center', flex_gap: gap(18),
      padding: box(96, 72, 96, 72), padding_tablet: box(56, 40, 64, 40), padding_mobile: box(44, 20, 56, 20), background_background: 'classic', background_color: C.white }, [
      text('A 21-room boutique hotel on the waterfront in Bayfield, overlooking the Apostle Islands. Three restaurants on property, a bar across the street, and a rooftop deck you’ll remember.',
        { size: 18, lh: 1.65, color: C.ink, maxW: 620 }),
      text('Perched on the shores of Lake Superior, Bayfield Inn has welcomed guests for over a century. Whether you’re here to relax, explore, or celebrate, our warm hospitality and unmatched views create an unforgettable experience.',
        { size: 15.5, lh: 1.7, maxW: 620 }),
      row([darkBtn('Book a Room', EXT.book), button('See the rooms', '#rooms', 'text', { color: C.green, upper: false, size: 13, icon: 'fas fa-arrow-right', pad: box(14, 4, 14, 4), settings: { hover_color: '#0F2113' } })],
        { gap: 12, settings: { padding: box(6, 0, 0, 0) } }),
    ]),
  ]);

  const rooms = section({
    _element_id: 'rooms', background_background: 'classic', background_color: C.cream, flex_direction: 'column', overflow: 'hidden',
    border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.line, ...bigPad,
    content_width: 'boxed', boxed_width: px(1480), flex_gap: gap(56), flex_gap_tablet: gap(44), flex_gap_mobile: gap(36),
  }, [
    // Faint oversized "Stay" behind the section heading.
    widget('heading', {
      title: 'Stay', header_size: 'span', title_color: 'rgba(23,48,27,0.06)', ...typo('typography', SERIF, [320, 220, 160], 400, { lh: 1, ls: -12 }),
      _position: 'absolute', _offset_orientation_h: 'start', _offset_x: px(38), _offset_x_tablet: px(22), _offset_x_mobile: px(10),
      _offset_orientation_v: 'start', _offset_y: px(40), _offset_y_tablet: px(36), _offset_y_mobile: px(30),
      _element_width: 'auto', _z_index: 0, custom_css: 'selector { pointer-events: none; user-select: none; }',
    }),
    intro('Rooms & Suites', 'Twenty-one rooms,<br>plus condos next door.', button('Check rates & availability', EXT.book, 'dark', { settings: { button_background_hover_color: '#0F2113' } })),
    container({ ...gridSettings([4, 2, 1]), content_width: 'full', padding: box(0), grid_gaps: gap(24, 36), grid_gaps_tablet: gap(20, 36), grid_gaps_mobile: gap(36, 36), grid_align_items: 'start', z_index: 1 }, [
      photoCard(m.suite, 'Suites', 'Room to spread out, with a jetted tub.', '/gallery/#suites', { badge: { text: '01' }, alt: 'Suite with a sitting area and jetted tub' }),
      photoCard(m.lakeview, 'Lake View Rooms', 'Lake-facing, the sunrise included.', '/gallery/#lake-view', { badge: { text: '02' }, alt: 'Lake view room with a window onto Lake Superior' }),
      photoCard(m.standardRoom, 'City View Rooms', 'Classic comfort, steps from The Deck.', '/gallery/#city-view', { badge: { text: '03' }, alt: 'City view room' }),
      photoCard(m.condoCover, 'Condos', 'Bayfield on the Lake Condominiums and the Isaac Wing House, for longer stays and bigger groups.', '/gallery/#condos', { badge: { text: '04' }, alt: 'Condo living room and kitchen' }),
    ]),
  ]);

  const dining = section({
    _element_id: 'dining', flex_direction: 'column', ...radial('top right', C.mid, null, C.deep), ...bigPad,
    content_width: 'boxed', boxed_width: px(1480), flex_gap: gap(56), flex_gap_tablet: gap(44), flex_gap_mobile: gap(36),
  }, [
    intro('Dine', 'Four places to eat and drink,<br>all with the lake in view.', button('View menus', EXT.dine, 'outline'), true),
    container({ ...gridSettings([4, 2, 1]), content_width: 'full', padding: box(0), grid_gaps: gap(28, 36), grid_gaps_tablet: gap(20, 32), grid_gaps_mobile: gap(36, 36), grid_align_items: 'start' }, [
      photoCard(m.deckDining, 'The Deck', 'Rooftop. Lunch and dinner, weather permitting.', PAGE.deck, { dark: true, pos: 'center 55%', alt: 'Blue umbrellas on The Deck', badge: { logo: m.deckBadge, bg: 'rgba(15,33,19,0.88)' } }),
      photoCard(m.lakesideDining, 'Lakeside Dining Room', 'Breakfast and dinner at the water’s edge.', PAGE.lakeside, { dark: true, alt: 'Crab cakes and cocktails by the window of the Lakeside Dining Room' }),
      photoCard(m.lounge, 'The Lounge', 'Cocktails, a proper old fashioned, and the game.', PAGE.lounge, { dark: true, alt: 'Bartender finishing a martini in The Lounge' }),
      photoCard(m.creameryPhoto, 'The Creamery', 'Our bar across the street. Pints, pizza, pretzels, live music.', PAGE.creamery, { dark: true, alt: 'The Creamery', badge: { logo: m.creameryLogo, bg: 'rgba(245,242,236,0.92)' } }),
    ]),
  ]);

  const pulseDot = (size, color) => `selector .elementor-heading-title { display: flex; align-items: center; gap: ${size + 6}px; }
selector .elementor-heading-title::before { content: ""; flex: none; width: ${size}px; height: ${size}px; border-radius: 50%; background: ${color}; animation: bi-pulse 1.6s ease-in-out infinite; }`;
  const webcam = section({ ...gridSettings([2, 2, 1]), _element_id: 'webcam', background_background: 'classic', background_color: C.white, grid_gaps: gap(0, 0), grid_align_items: 'stretch' }, [
    copy([
      widget('heading', { title: 'Live from the Inn', header_size: 'p', title_color: C.green, ...typo('typography', SANS, 12, 500, { lh: 1.3, ls: 2.6, transform: 'uppercase' }), custom_css: pulseDot(8, '#C0392B') }),
      heading('See the lake right now.', 'h2', [49, 40, 32], C.green, { ls: -1 }),
      text('Our rooftop camera looks out over the marina, the ferry dock and Madeline Island, around the clock and in every season. Check the weather, watch the ferry come in, or just look at the water for a while.', { size: 15.5, lh: 1.7, maxW: 500 }),
      button('Watch the live cam', PAGE.webcam, 'dark', { icon: 'fas fa-arrow-right', settings: { button_background_hover_color: '#0F2113' } }),
    ]),
    photo(m.marina, 'center center', [
      widget('heading', {
        title: 'Live', header_size: 'span', title_color: C.cream, ...typo('typography', SANS, 11, 500, { lh: 1.2, ls: 2, transform: 'uppercase' }),
        _position: 'absolute', _offset_orientation_h: 'start', _offset_x: px(20), _offset_orientation_v: 'start', _offset_y: px(20), _element_width: 'auto', _z_index: 2,
        _background_background: 'classic', _background_color: 'rgba(15,33,19,0.75)', _padding: box(7, 12, 7, 12), _border_radius: box(2),
        custom_css: pulseDot(7, '#E74C3C') + '\nselector { backdrop-filter: blur(6px); }',
      }),
      widget('icon', {
        selected_icon: fa('fas fa-play'), view: 'stacked', shape: 'circle', primary_color: 'rgba(245,242,236,0.92)', secondary_color: C.green,
        size: px(22), icon_padding: px(31), _z_index: 2,
        custom_css: 'selector .elementor-icon { box-shadow: 0 20px 40px -20px rgba(0,0,0,.6); transition: transform .3s; }\nselector .elementor-icon i, selector .elementor-icon svg { margin-left: 4px; }\na:hover selector .elementor-icon { transform: scale(1.06); }',
      }),
      text('Bayfield Harbor · bayfieldlive.com', { color: C.cream, size: 12, weight: 400, lh: 1.4, ls: 0.5, settings: {
        _position: 'absolute', _offset_orientation_h: 'start', _offset_x: px(0), _offset_orientation_v: 'end', _offset_y_end: px(0),
        _element_width: 'initial', _element_custom_width: px(100, '%'), _padding: box(28, 22, 18, 22), _z_index: 2,
        _background_background: 'gradient', _background_color: 'rgba(22,27,23,0.6)', _background_color_stop: px(0, '%'), _background_color_b: 'rgba(22,27,23,0)',
        _background_color_b_stop: px(100, '%'), _background_gradient_type: 'linear', _background_gradient_angle: px(0, 'deg'),
      } }),
    ], { ...linked(PAGE.webcam), flex_direction: 'column', flex_justify_content: 'center', flex_align_items: 'center',
      custom_css: 'selector { aspect-ratio: 16 / 10; background-position: center 40%; transition: background-size .8s; }' }),
  ]);

  const events = section({ ...gridSettings([2, 2, 1]), _element_id: 'events', background_background: 'classic', background_color: C.cream, grid_gaps: gap(0, 0), grid_align_items: 'stretch' }, [
    photo(m.eventsLawn, 'center center'),
    copy([
      eyebrow('Weddings & Events', C.green),
      heading('Host unforgettable gatherings.', 'h2', [49, 40, 32], C.green, { ls: -1 }),
      text('From intimate celebrations to corporate retreats, Bayfield Inn is the perfect setting for your next event. Our dedicated team will help you create memories that last.', { size: 15.5, lh: 1.7, maxW: 520 }),
      text('<strong>Chair rental</strong> is available for weddings and events around Bayfield. Ask our events team.', { size: 14, lh: 1.6, maxW: 520, settings: { _margin: box(-6, 0, 0, 0) } }),
      button('Plan your event', EXT.events, 'dark', { settings: { button_background_hover_color: '#0F2113' } }),
    ]),
  ]);

  // Mini gallery: three favorites (swapped through the year), each opening the full gallery.
  const galleryTile = (img, alt) => container({ content_width: 'full', padding: box(0), ...linked(PAGE.gallery), overflow: 'hidden', border_radius: box(4), custom_css: zoomOnHover }, [
    image(img, { settings: { _css_classes: 'bi-photo', alt_text: alt, custom_css: 'selector { overflow: hidden; line-height: 0; }\nselector img { display: block; width: 100%; aspect-ratio: 4 / 5; object-fit: cover; }' } }),
  ]);
  const gallery = section({
    _element_id: 'gallery', background_background: 'classic', background_color: C.white, flex_direction: 'column', ...bigPad,
    content_width: 'boxed', boxed_width: px(1480), flex_gap: gap(56), flex_gap_tablet: gap(44), flex_gap_mobile: gap(36),
  }, [
    intro('Gallery', 'A few favorites<br>from this season.', button('View the full gallery', PAGE.gallery, 'dark', { settings: { button_background_hover_color: '#0F2113' } })),
    container({ ...gridSettings([3, 3, 1]), content_width: 'full', padding: box(0), grid_gaps: gap(24, 24), grid_gaps_tablet: gap(16, 16), grid_gaps_mobile: gap(16, 16) }, [
      galleryTile(m.exterior, 'Bayfield Inn on the waterfront'),
      galleryTile(m.deckBar, 'The Deck rooftop bar'),
      galleryTile(m.diningWindow, 'Dinner by the window in the Lakeside Dining Room'),
    ]),
  ]);

  // Social: Facebook and Instagram, highlighted per the sitemap.
  const socialBtn = (label, icon, url) => button(label, url, 'outline', { size: 13, icon, upper: false, pad: box(16, 28, 16, 28), settings: { icon_align: 'row', typography_letter_spacing: px(0.5), button_text_color: C.green, border_color: 'rgba(23,48,27,0.45)', button_hover_border_color: C.green, hover_color: C.cream, button_background_hover_color: C.green } });
  const social = section({
    _element_id: 'follow', flex_direction: 'column', flex_align_items: 'center', background_background: 'classic', background_color: C.cream,
    border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.line,
    padding: box(96, 48, 96, 48), padding_tablet: box(80, 32, 80, 32), padding_mobile: box(64, 20, 64, 20), flex_gap: gap(22),
  }, [
    eyebrow('Follow along', C.green, { align: 'center' }),
    heading('Sunrises, specials and what’s happening on the waterfront.', 'h2', [44, 36, 30], C.green, { align: 'center', ls: -0.8, maxW: 760 }),
    row([
      socialBtn('Facebook', 'fab fa-facebook-f', EXT.facebook),
      socialBtn('Instagram', 'fab fa-instagram', EXT.instagram),
    ], { gap: 12, justify: 'center', settings: { padding: box(8, 0, 0, 0) } }),
  ]);

  return [hero, about, rooms, dining, webcam, events, gallery, social];
}

// Page Settings > Custom CSS: the design's fine film-grain overlay, smooth anchor scrolling and
// the pulse used by the "Live" dots.
const grain = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";
const pageSettings = {
  background_background: 'classic', background_color: C.cream,
  custom_css: `html { scroll-behavior: smooth; }
body::after { content: ""; position: fixed; inset: 0; z-index: 40; pointer-events: none; background-image: url("${grain}"); opacity: .38; mix-blend-mode: multiply; }
@keyframes bi-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } * { animation: none !important; transition: none !important; } }
`,
};

// Custom Code (end of <body>, Entire Site): promo bar dismissal + header logo fade-in on scroll.
const interactionsJs = `<script>
(function () {
  var KEY = 'bi-promo-dismissed', root = document.documentElement;
  try { if (sessionStorage.getItem(KEY) === '1') root.classList.add('bi-promo-off'); } catch (e) {}
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('.bi-promo-close');
    if (!btn) return;
    ev.preventDefault();
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
    root.classList.add('bi-promo-off');
  });
  function onScroll() { document.body.classList.toggle('bi-scrolled', window.scrollY > 120); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Booking bar -> eviivo (parameter names and mm-dd-yyyy dates from eviivo's search widget).
  var BOOK = '${EXT.book}';
  function bookingForms() { return document.querySelectorAll('form[name="Check availability"]'); }
  function field(f, id) { return f.querySelector('[name="form_fields[' + id + ']"]'); }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function mdy(v) { var p = (v || '').split('-'); return p.length === 3 ? p[1] + '-' + p[2] + '-' + p[0] : ''; }
  bookingForms().forEach(function (f) {
    var a = field(f, 'checkin'), b = field(f, 'checkout'); if (!a || !b) return;
    var today = new Date(); a.min = iso(today);
    function sync() { if (!a.value) return; var n = new Date(a.value + 'T12:00:00'); n.setDate(n.getDate() + 1); b.min = iso(n); if (b.value && b.value <= a.value) b.value = iso(n); }
    a.addEventListener('change', sync);
  });
  document.addEventListener('submit', function (ev) {
    var f = ev.target; if (!f || f.getAttribute('name') !== 'Check availability') return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    var a = field(f, 'checkin'), b = field(f, 'checkout');
    if (!a.value) { a.focus(); a.reportValidity && a.reportValidity(); return; }
    if (!b.value || b.value <= a.value) { b.setCustomValidity('Choose a check-out date after check-in.'); b.reportValidity(); b.setCustomValidity(''); return; }
    var q = 'startdate=' + mdy(a.value) + '&enddate=' + mdy(b.value) + '&adults1=' + (field(f, 'adults') || {}).value + '&children1=' + ((field(f, 'children') || {}).value || '0');
    window.location.href = BOOK + (BOOK.indexOf('?') > -1 ? '&' : '?') + q;
  }, true);

  // Hero photo controls: arrows + one dot per photo, bottom center of the homepage hero.
  // Built from the hero's background slideshow, so they follow whatever photos it has.
  (function heroDots(tries) {
    var hero = document.getElementById('book');
    if (!hero) return;
    // Elementor builds the slideshow after load: wait for it (up to ~15s).
    var show = hero.querySelector('.elementor-background-slideshow');
    var sw = show && show.swiper;
    if (!sw) { if (tries < 60) setTimeout(function () { heroDots(tries + 1); }, 250); return; }
    var n = show.querySelectorAll('.swiper-slide:not(.swiper-slide-duplicate)').length;
    if (n < 2 || hero.querySelector('.bi-hero-dots')) return;
    var bar = document.createElement('div'); bar.className = 'bi-hero-dots'; bar.setAttribute('aria-label', 'Hero photos');
    function mk(cls, label, html, fn) { var b = document.createElement('button'); b.type = 'button'; b.className = cls; b.setAttribute('aria-label', label); b.innerHTML = html; b.addEventListener('click', fn); return b; }
    bar.appendChild(mk('bi-hero-dots__arrow', 'Previous photo', '&#8592;', function () { sw.slidePrev(); }));
    var dots = [];
    for (var i = 0; i < n; i++) (function (k) { var d = mk('bi-hero-dots__dot', 'Photo ' + (k + 1), '', function () { sw.slideToLoop ? sw.slideToLoop(k) : sw.slideTo(k); }); dots.push(d); bar.appendChild(d); })(i);
    bar.appendChild(mk('bi-hero-dots__arrow', 'Next photo', '&#8594;', function () { sw.slideNext(); }));
    function sync() { var r = sw.realIndex || 0; dots.forEach(function (d, k) { d.classList.toggle('is-active', k === r); d.setAttribute('aria-current', k === r ? 'true' : 'false'); }); }
    sw.on('slideChange', sync); sync();
    hero.appendChild(bar);
  })(0);

  // Live webcam (Angelcam): loads the player wherever the page has #player_bayfieldlive.
  var CAM = 'v8ypjjj8y6';
  if (document.getElementById('player_bayfieldlive')) {
    var sdk = document.createElement('script');
    sdk.src = 'https://v.angelcam.com/js_sdk';
    sdk.onload = function () { new Angelcam.player('player_bayfieldlive', { id: CAM }); };
    document.head.appendChild(sdk);
  }

  // Current weather on the webcam (Open-Meteo, free, no API key). Bayfield, WI.
  var WX = { lat: 46.811, lon: -90.818 };
  var WX_TEXT = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Freezing fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    56: 'Freezing drizzle', 57: 'Freezing drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow', 73: 'Snow',
    75: 'Heavy snow', 77: 'Snow grains', 80: 'Rain showers', 81: 'Rain showers', 82: 'Heavy showers', 85: 'Snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorms',
    96: 'Thunderstorms, hail', 99: 'Thunderstorms, hail' };
  function compass(d) { return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(d / 45) % 8]; }
  function setText(cls, t) { document.querySelectorAll('.' + cls + ' .elementor-heading-title').forEach(function (el) { el.textContent = t; }); }
  function loadWeather() {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + WX.lat + '&longitude=' + WX.lon +
      '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FChicago')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var c = d.current; if (!c) return;
        setText('bi-wx-temp', Math.round(c.temperature_2m) + '°');
        setText('bi-wx-cond', WX_TEXT[c.weather_code] || '');
        setText('bi-wx-meta', 'Feels like ' + Math.round(c.apparent_temperature) + '° · Wind ' + Math.round(c.wind_speed_10m) + ' mph ' + compass(c.wind_direction_10m));
      })
      .catch(function () {});
  }
  if (document.querySelector('.bi-weather')) { loadWeather(); setInterval(loadWeather, 10 * 60 * 1000); }
})();
</script>`;

module.exports = {
  C, SERIF, SANS, EXT, PAGE, id, px, box, gap, auto, link, fa, typo, container, widget, stack, row, gridSettings, radial,
  eyebrow, heading, text, button, image, linked, zoomOnHover, header, footer, home, pageSettings, interactionsJs,
};
