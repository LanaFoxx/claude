// Bayfield Inn homepage (Claude Design handoff) as native Elementor content.
// Containers + Heading / Text Editor / Button / Image / Slides / Divider / Icon List /
// Social Icons / Nav Menu widgets only (no HTML widgets), so every text, link, image and
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
function eyebrow(text, color, o = {}) {
  const center = o.align === 'center';
  return widget('heading', {
    title: text, header_size: 'p', title_color: color, align: o.align || 'left',
    ...typo('typography', SANS, 12, 500, { lh: 1.3, ls: 2.6, transform: 'uppercase' }),
    custom_css: `selector .elementor-heading-title { display: flex; align-items: center; gap: 14px;${center ? ' justify-content: center;' : ''} }
selector .elementor-heading-title::before${center ? ', selector .elementor-heading-title::after' : ''} { content: ""; flex: none; width: 36px; height: 1px; background: currentColor; opacity: .75; }`,
    ...(o.opacity ? { _opacity: px(o.opacity) } : {}),
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

/* ---------------------------------------------------------------- header */
function header(m, menuId) {
  return [container({
    content_width: 'boxed', boxed_width: px(1480), flex_direction: 'row', flex_wrap: 'nowrap',
    flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(24), flex_gap_mobile: gap(12),
    min_height: px(96), min_height_tablet: px(88), min_height_mobile: px(76), padding: box(0, 48, 0, 48), padding_tablet: box(0, 32, 0, 32), padding_mobile: box(0, 20, 0, 20),
    background_background: 'classic', background_color: 'rgba(255,255,255,0.92)',
    border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.line,
    sticky: 'top', sticky_on: ['desktop', 'tablet', 'mobile'], z_index: 30,
    custom_css: 'selector { backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }',
  }, [
    image(m.logo, { width: [140, 128, 104], link: '/', align: 'left', settings: { _element_width: 'initial', _element_custom_width: px(140), _element_custom_width_tablet: px(128), _element_custom_width_mobile: px(104), _flex_size: 'none' } }),
    widget('nav-menu', {
      menu: menuId, layout: 'horizontal', align_items: 'center', pointer: 'underline', animation_line: 'fade',
      dropdown: 'tablet', toggle: 'burger', toggle_align: 'right', full_width: 'stretch',
      ...typo('menu_typography', SERIF, 18, 400, { lh: 1.3, ls: 0.2 }),
      color_menu_item: C.ink, color_menu_item_hover: C.ink, color_menu_item_active: C.ink,
      pointer_color_menu_item_hover: C.green, pointer_color_menu_item_active: C.green, pointer_width: px(1),
      padding_horizontal_menu_item: px(20), padding_vertical_menu_item: px(8),
      ...typo('dropdown_typography', SERIF, 20, 400, { ls: 0.2 }),
      color_dropdown_item: C.ink, background_color_dropdown_item: C.white,
      color_dropdown_item_hover: C.cream, background_color_dropdown_item_hover: C.green,
      color_dropdown_item_active: C.cream, background_color_dropdown_item_active: C.green,
      padding_horizontal_dropdown_item: px(28), padding_vertical_dropdown_item: px(16),
      dropdown_top_distance: px(31), dropdown_top_distance_mobile: px(21),
      toggle_color: C.green, toggle_background_color: 'rgba(0,0,0,0)', toggle_size: px(24),
      _flex_size: 'grow', _flex_size_tablet: 'none', _flex_size_mobile: 'none',
      _flex_order_tablet: 'end', _flex_order_mobile: 'end',
    }),
    container({
      content_width: 'full', width: auto, width_tablet: auto, width_mobile: auto,
      flex_direction: 'row', flex_align_items: 'center', flex_gap: gap(18), flex_gap_mobile: gap(10),
      flex_justify_content: 'flex-end', _flex_size: 'none', _flex_size_tablet: 'grow', _flex_size_mobile: 'grow', padding: box(0),
    }, [
      button('715.779.3363', 'tel:7157793363', 'text', { color: 'rgba(22,27,23,0.8)', size: 14, upper: false, pad: box(10, 0, 10, 0),
        settings: { hover_color: C.ink, hide_mobile: 'hidden-mobile', typography_letter_spacing: px(0) } }),
      button('Book a Room', EXT.book, 'dark', { size: 13.5, upper: false, pad: box(15, 26, 15, 26),
        settings: { text_padding_mobile: box(11, 16, 11, 16), typography_letter_spacing: px(0.5) } }),
    ]),
  ], false)];
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
        list([['Rooms', '/#rooms'], ['Dining', '/#dining'], ['Events', '/#events'], ['Gallery', EXT.gallery], ['Contact', '/#contact']],
          { size: 13, weight: 500, ls: 1, transform: 'uppercase', color: 'rgba(245,242,236,0.9)' }),
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

  // Hero: copy on a radial green panel + full-height fading slider with caption, bars and arrows.
  const slides = [
    [m.heroDeck, 'The Deck, Bayfield’s only rooftop', 'center 60%'],
    [m.heroDining, 'Lakeside Dining Room', 'center center'],
    [m.lakeview, 'Lakeview room', 'center center'],
    [m.sunset, 'Sunset over the harbor', 'center center'],
  ];
  const hero = section({
    ...gridSettings(['5fr 7fr', 1, 1]), _element_id: 'book', background_background: 'classic', background_color: C.green,
    grid_gaps: gap(0, 0), grid_align_items: 'stretch',
  }, [
    container({
      content_width: 'full', flex_direction: 'column', flex_justify_content: 'center', flex_gap: gap(24), flex_gap_mobile: gap(20),
      padding: box(80, 64, 80, 72), padding_tablet: box(72, 48, 64, 48), padding_mobile: box(56, 20, 48, 20),
      min_height: px(600), min_height_tablet: px(0), min_height_mobile: px(0),
      ...radial('bottom left', C.mid, null, C.deep), z_index: 1,
    }, [
      eyebrow('Bayfield, Wisconsin · Est. 1898', C.cream, { opacity: 0.8 }),
      heading('The best darn view on Lake Superior.', 'h1', [68, 56, 42], C.cream, { lh: 0.98, ls: -1.4, settings: { typography_letter_spacing_mobile: px(-0.8) } }),
      text('A 21-room boutique hotel on the waterfront in Bayfield, overlooking the Apostle Islands. Three restaurants on property, a bar across the street, and a rooftop deck you’ll remember.',
        { color: 'rgba(245,242,236,0.9)', size: 16, maxW: 440 }),
      row([
        button('Book a Room', EXT.book, 'light', { size: 13, pad: box(15, 26, 15, 26), icon: 'fas fa-arrow-right' }),
        button('See the rooms', '#rooms', 'outline', { size: 13, upper: false, pad: box(15, 26, 15, 26), settings: { border_color: C.cream60 } }),
      ], { gap: 12, settings: { padding: box(8, 0, 0, 0) } }),
    ]),
    widget('slides', {
      slides: slides.map(([img, caption, posn]) => ({
        _id: id(), heading: caption, description: '', button_text: '', background_color: '#DCD7CC',
        background_image: img, background_size: 'cover', background_position: posn,
      })),
      slides_height: px(820), slides_height_tablet: px(520), slides_height_mobile: px(360),
      navigation: 'both', autoplay: 'yes', pause_on_hover: 'yes', pause_on_interaction: 'yes', infinite: 'yes',
      autoplay_speed: 5000, transition: 'fade', transition_speed: 900, content_animation: '',
      slides_horizontal_position: 'left', slides_vertical_position: 'bottom', slides_text_align: 'left',
      content_max_width: px(60, '%'), content_max_width_mobile: px(70, '%'),
      slides_padding: box(20, 24, 22, 24), slides_padding_mobile: box(16, 20, 22, 20),
      heading_color: C.cream, heading_spacing: px(0), ...typo('heading_typography', SANS, 12, 400, { lh: 1.4, ls: 0.5 }),
      arrows_size: px(13), arrows_color: C.cream, dots_color: C.cream, dots_size: px(3),
      custom_css: `/* Fill the hero height on desktop, (100vh minus the header, 600–900px). */
@media (min-width: 1025px) { selector .elementor-slides .swiper-slide, selector .elementor-slides-wrapper { height: clamp(600px, calc(100vh - 96px), 900px) !important; } }
selector .swiper-slide::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 120px; background: linear-gradient(to top, rgba(22,27,23,.55), rgba(22,27,23,0)); pointer-events: none; z-index: 1; }
selector .swiper-slide-inner { z-index: 2; }
selector .swiper-pagination { left: auto !important; right: 120px !important; bottom: 34px !important; width: auto !important; z-index: 3; line-height: 0; }
selector .swiper-pagination .swiper-pagination-bullet { width: 28px; height: 3px; border-radius: 0; margin: 0 3px !important; opacity: .4; background: ${C.cream}; }
selector .swiper-pagination .swiper-pagination-bullet-active { opacity: 1; }
selector .elementor-swiper-button { top: auto !important; bottom: 18px; transform: none !important; width: 36px; height: 36px; border: 1px solid ${C.cream60}; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 3; transition: background .25s; }
selector .elementor-swiper-button:hover { background: rgba(245,242,236,.15); }
selector .elementor-swiper-button-prev { left: auto !important; right: 68px !important; }
selector .elementor-swiper-button-next { right: 24px !important; }
@media (max-width: 767px) { selector .swiper-pagination { display: none; } selector .elementor-swiper-button-prev { right: 60px !important; } selector .elementor-swiper-button-next { right: 16px !important; } }`,
    }),
  ]);

  const about = section({
    _element_id: 'about', background_background: 'classic', background_color: C.cream, flex_align_items: 'center',
    padding: box(130, 48, 130, 48), padding_tablet: box(96, 32, 96, 32), padding_mobile: box(72, 20, 72, 20),
  }, [
    stack([
      eyebrow('Est. 1898', C.green, { align: 'center' }),
      heading('A timeless lakeside escape blending historic charm with modern comfort.', 'h2', [49, 40, 32], C.green, { align: 'center', ls: -1 }),
      text('Perched on the shores of Lake Superior, Bayfield Inn has welcomed guests for over a century. Whether you’re here to relax, explore, or celebrate, our warm hospitality and unmatched views create an unforgettable experience.',
        { align: 'center', size: 15.5, lh: 1.7 }),
    ], { gap: 22, align: 'center', maxW: 680 }),
  ]);

  const card = (img, title, body, alt) => container({
    content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(0), overflow: 'hidden',
    border_radius: box(4), background_background: 'classic', background_color: C.green,
    box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 30, blur: 50, spread: -40, color: 'rgba(23,48,27,0.5)' },
    custom_css: 'selector .elementor-widget-image img { transition: transform .8s; }\nselector:hover .elementor-widget-image img { transform: scale(1.04); }',
  }, [
    image(img, { settings: {
      _background_background: 'classic', _background_color: C.line, alt_text: alt,
      custom_css: 'selector { overflow: hidden; line-height: 0; }\nselector img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }',
    } }),
    container({
      content_width: 'full', flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(12), flex_grow: 1, _flex_size: 'grow',
      padding: box(30, 24, 32, 24), padding_mobile: box(26, 20, 28, 20),
    }, [
      widget('heading', { title, header_size: 'h3', align: 'center', title_color: C.cream, ...typo('typography', SERIF, [24, 22, 24], 400, { lh: 1.1 }) }),
      text(body, { align: 'center', color: C.cream85, size: 14, maxW: 240 }),
      // margin-top:auto keeps the three buttons aligned when descriptions wrap differently.
      button('View details', EXT.rooms, 'outline', { pad: box(11, 20, 11, 20), align: 'center', settings: { custom_css: 'selector { margin-top: auto; padding-top: 6px; }' } }),
    ]),
  ]);
  const rooms = section({
    _element_id: 'rooms', background_background: 'classic', background_color: C.white, flex_direction: 'column',
    border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.line,
    padding: box(130, 48, 130, 48), padding_tablet: box(96, 32, 96, 32), padding_mobile: box(72, 20, 72, 20),
    content_width: 'boxed', boxed_width: px(1480), flex_gap: gap(64), flex_gap_tablet: gap(48), flex_gap_mobile: gap(40),
  }, [
    stack([
      heading('Rooms & Suites', 'h2', [46, 38, 30], C.green, { align: 'center', ls: 1.8, transform: 'uppercase' }),
      widget('divider', {
        style: 'solid', weight: px(1), color: C.green, width: px(110), align: 'center', look: 'line_icon',
        icon: fa('fas fa-circle'), icon_view: 'default', primary_color: C.green, icon_size: px(5), icon_padding: px(4), gap: px(0),
      }),
    ], { gap: 12, align: 'center' }),
    container({ ...gridSettings([3, 3, 1]), content_width: 'full', padding: box(0), grid_gaps: gap(28, 28), grid_gaps_tablet: gap(16, 16), grid_gaps_mobile: gap(24, 24), grid_align_items: 'stretch' }, [
      card(m.lakeview, 'Lakeview Rooms', 'Wake up to stunning views of Lake Superior.', 'Lakeview room with a window onto Lake Superior'),
      card(m.suite, 'Suites', 'Spacious accommodations with extra comfort and elegance.', 'Suite sitting area at sunrise'),
      card(m.placeholder, 'Standard Rooms', 'Comfortable and inviting rooms for every traveler.', 'Standard room'),
    ]),
  ]);

  const photo = (img, posn, extra = []) => container({
    content_width: 'full', padding: box(0), min_height: px(520), min_height_tablet: px(420), min_height_mobile: px(320),
    background_background: 'classic', background_color: C.line, background_image: img, background_size: 'cover', background_position: posn, background_repeat: 'no-repeat',
    overflow: 'hidden',
  }, extra);
  const copy = (children, settings = {}) => container({
    content_width: 'full', flex_direction: 'column', flex_justify_content: 'center', flex_gap: gap(20),
    padding: box(96, 80, 96, 80), padding_tablet: box(64, 40, 64, 40), padding_mobile: box(56, 20, 56, 20), ...settings,
  }, children);

  const dining = section({ ...gridSettings([2, 2, 1]), _element_id: 'dining', background_background: 'classic', background_color: C.deep, grid_gaps: gap(0, 0), grid_align_items: 'stretch' }, [
    photo(m.deckDining, 'center center', [
      image(m.deckBadge, { width: [76, 64, 60], settings: {
        _position: 'absolute', _offset_orientation_h: 'start', _offset_x: px(22), _offset_orientation_v: 'start', _offset_y: px(22),
        _element_width: 'initial', _element_custom_width: px(76), _element_custom_width_tablet: px(64), _element_custom_width_mobile: px(60),
        alt_text: 'The Deck', custom_css: 'selector img { filter: drop-shadow(0 2px 8px rgba(0,0,0,.4)); }',
      } }),
    ]),
    copy([
      eyebrow('Unmatched views of', C.cream, { opacity: 0.8 }),
      heading('Lake Superior', 'h2', [66, 50, 42], C.cream, { lh: 0.98, ls: 1.4, transform: 'uppercase' }),
      text('Lunch and dinner on The Deck, Bayfield’s only rooftop, or a table by the water in the Lakeside Dining Room.', { color: C.cream85, size: 15.5, maxW: 440 }),
      row([
        button('Reserve a table', EXT.dine, 'outline'),
        button('View menus', EXT.dine, 'text', { icon: 'fas fa-arrow-right' }),
      ], { gap: 12, settings: { padding: box(8, 0, 0, 0) } }),
    ], { ...radial('top right', C.mid, null, C.deep), flex_gap: gap(18) }),
  ]);

  const events = section({ ...gridSettings([2, 2, 1]), _element_id: 'events', background_background: 'classic', background_color: C.cream, grid_gaps: gap(0, 0), grid_align_items: 'stretch' }, [
    copy([
      eyebrow('Weddings & Events', C.green),
      heading('Host unforgettable gatherings.', 'h2', [49, 40, 32], C.green, { ls: -1 }),
      text('From intimate celebrations to corporate retreats, Bayfield Inn is the perfect setting for your next event. Our dedicated team will help you create memories that last.', { size: 15.5, lh: 1.7, maxW: 520 }),
      button('Plan your event', EXT.events, 'dark', { settings: { _margin: box(4, 0, 0, 0) } }),
    ], { flex_gap: gap(22) }),
    photo(m.eventsLawn, 'center center'),
  ]);

  return [hero, about, rooms, dining, events];
}

// Page Settings > Custom CSS: the design's fine film-grain overlay and smooth anchor scrolling.
const grain = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";
const pageSettings = {
  background_background: 'classic', background_color: C.cream,
  custom_css: `html { scroll-behavior: smooth; }
body::after { content: ""; position: fixed; inset: 0; z-index: 40; pointer-events: none; background-image: url("${grain}"); opacity: .38; mix-blend-mode: multiply; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
`,
};

module.exports = { C, header, footer, home, pageSettings };
