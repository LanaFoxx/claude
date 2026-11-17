// nickponterealty.com in native Elementor: header, footer, homepage.
// m = media map (slug -> {id,url}), menuId = WordPress menu ID, forms = live form settings (forms-live.json).
const L = require('./lib-core.cjs');
const { C, HEAD, BODY, id, px, box, gap, auto, link, typo, container, widget, fa, band, stack, row, grid, eyebrow, heading, H1, H2, H3, text, button, image, iconList } = L;

const TEL = 'tel:6039187593', SMS = 'sms:6039187593';
const U = {
  home: '/', about: '/nick-ponte-seacoast-nh-realtor/', contact: '/contact-nick-ponte-realtor/', featured: '/featured-properties/',
  blog: '/seacoast-nh-real-estate-blog/', buyers: '/buyers-guide/', sellers: '/sellers-guide/', faq: '/faq/', privacy: '/privacy-policy/',
  rye: '/nickponterealty-com-realtor-rye-nh/', cost: '/how-much-does-it-cost-to-sell-a-home/', valuation: '/#valuation',
};
const img = (m, slug) => ({ id: m[slug].id, url: m[slug].url, alt: '', source: 'library' });

// Shared bits ----------------------------------------------------------------------------------
const btn = (label, url, variant = 'primary', o = {}) => {
  const s = {
    text: label, link: link(url), align: o.align || '', ...typo('typography', BODY, o.size || 15, 600, { lh: 1.2 }),
    border_radius: box(10), text_padding: o.pad || box(15, 24, 15, 24), text_padding_mobile: o.padM || box(16, 18, 16, 18),
    ...(o.icon ? { selected_icon: fa(o.icon), icon_align: 'row', icon_indent: px(8) } : {}),
  };
  if (variant === 'primary') Object.assign(s, { button_text_color: C.white, background_background: 'classic', background_color: o.bg || C.blue,
    hover_color: C.white, button_background_hover_background: 'classic', button_background_hover_color: C.blueHover,
    border_border: 'solid', border_width: box(1), border_color: o.bg || C.blue });
  if (variant === 'ghost') Object.assign(s, { button_text_color: C.navy, background_background: 'classic', background_color: 'rgba(255,255,255,0.85)',
    hover_color: C.navy, button_background_hover_background: 'classic', button_background_hover_color: C.bg,
    border_border: 'solid', border_width: box(1), border_color: o.border || C.borderDark });
  if (variant === 'link') Object.assign(s, { button_text_color: C.navy, background_background: 'classic', background_color: 'rgba(0,0,0,0)',
    hover_color: C.blue, button_background_hover_background: 'classic', button_background_hover_color: 'rgba(0,0,0,0)', text_padding: box(8, 0, 8, 0), text_padding_mobile: box(8, 0, 8, 0),
    ...(o.icon ? { icon_align: 'row-reverse' } : {}),
    custom_css: 'selector .elementor-button-text { border-bottom: 1px solid currentColor; padding-bottom: 2px; }' });
  return widget('button', { ...s, ...(o.settings || {}) });
};
const lbl = (t, color = C.blue, align = 'left') => eyebrow(t, color, align, { size: 12, ls: 1.9 });
// Title with a light part and a bold part: "Find your home on the <b>New Hampshire Seacoast.</b>"
const title = (html, tag, sizes, color = C.navy, align = 'left', o = {}) => heading(html, tag, sizes, color, align, {
  weight: 300, lh: o.lh || 1.06, ls: o.ls ?? -0.6, ...o,
  settings: { custom_css: 'selector .elementor-heading-title b { font-weight: 800; }', ...(o.settings || {}) },
});
const card = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(o.gap ?? 12), padding: box(o.pad ?? 32), padding_mobile: box(24),
  background_background: 'classic', background_color: o.bg || C.white, border_border: 'solid', border_width: box(1), border_color: C.border,
  border_radius: box(o.radius ?? 18), box_shadow_box_shadow_type: 'yes',
  box_shadow_box_shadow: { horizontal: 0, vertical: 24, blur: 50, spread: -40, color: 'rgba(31,58,95,0.4)' },
  ...(o.settings || {}),
}, children);
const pageSettings = { hide_title: 'yes', template: 'elementor_header_footer' };

// Header ----------------------------------------------------------------------------------------
function header(m, menuId) {
  return [container({
    content_width: 'boxed', boxed_width: px(1180), flex_direction: 'row', flex_wrap: 'nowrap', flex_justify_content: 'space-between', flex_align_items: 'center',
    flex_gap: gap(24), padding: box(14, 32, 14, 32), padding_tablet: box(10, 12, 10, 20), padding_mobile: box(8, 8, 8, 20), min_height: px(76), min_height_mobile: px(60),
    background_background: 'classic', background_color: C.white,
    box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 12, blur: 30, spread: -20, color: 'rgba(31,58,95,0.25)' },
    sticky: 'top', sticky_on: ['desktop', 'tablet', 'mobile'], z_index: 50,
  }, [
    image(img(m, 'npc-logo-navy'), { link: U.home, align: 'left', settings: { width: px(292), width_tablet: px(230), width_mobile: px(200), _element_width: 'initial', _element_custom_width: px(292), _element_custom_width_tablet: px(230), _element_custom_width_mobile: px(200), _flex_size: 'none' } }),
    widget('nav-menu', {
      menu: String(menuId), layout: 'horizontal', align_items: 'flex-end', pointer: 'underline', animation_line: 'fade',
      dropdown: 'tablet', toggle: 'burger', toggle_align: 'right', full_width: 'stretch',
      ...typo('menu_typography', BODY, 14, 500, { lh: 1.4 }),
      color_menu_item: C.navy, color_menu_item_hover: C.blue, color_menu_item_active: C.blue,
      pointer_color_menu_item_hover: C.blue, pointer_color_menu_item_active: C.blue, pointer_width: px(2),
      padding_horizontal_menu_item: px(12), padding_vertical_menu_item: px(8),
      ...typo('dropdown_typography', BODY, 18, 600),
      color_dropdown_item: C.navy, background_color_dropdown_item: C.white,
      color_dropdown_item_hover: C.blue, background_color_dropdown_item_hover: C.bg,
      color_dropdown_item_active: C.blue, background_color_dropdown_item_active: C.white,
      padding_horizontal_dropdown_item: px(24), padding_vertical_dropdown_item: px(16),
      dropdown_divider_border: 'solid', dropdown_divider_width: px(1), dropdown_divider_color: C.div,
      dropdown_top_distance: px(14), toggle_color: C.navy, toggle_background_color: 'rgba(0,0,0,0)', toggle_size: px(24), toggle_border_width: px(0),
      _flex_size: 'grow', _flex_size_tablet: 'none', _flex_size_mobile: 'none', _flex_order_tablet: 'end', _flex_order_mobile: 'end',
    }),
    btn('Call 603-918-7593', TEL, 'primary', { size: 13, pad: box(11, 18, 11, 18), settings: { hide_mobile: 'hidden-mobile', _flex_size: 'none' } }),
  ], false)];
}

// Footer ----------------------------------------------------------------------------------------
function footer(m) {
  const links = [['Town markets', U.rye], ['Featured sales', U.featured], ['Buyer Guide', U.buyers], ['Seller Guide', U.sellers], ['Cost to sell', U.cost], ['Market news', U.blog], ['About', U.about], ['Contact', U.contact]];
  return [container({
    content_width: 'boxed', boxed_width: px(1180), flex_direction: 'column', flex_gap: gap(24), padding: box(44, 32, 28, 32), padding_mobile: box(36, 20, 24, 20),
    background_background: 'classic', background_color: C.white, border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.border,
  }, [
    row([
      image(img(m, 'npc-logo-navy'), { link: U.home, align: 'left', settings: { _element_width: 'initial', _element_custom_width: px(240), _element_custom_width_mobile: px(200), width: px(240), width_mobile: px(200) } }),
      iconList(links, { inline: true, color: C.navy, hover: C.blue, size: 14, weight: 500, space: 24, settings: { icon_align: 'right', _flex_size: 'grow', icon_align_mobile: 'left' } }),
    ], { gap: 20, justify: 'space-between' }),
    widget('divider', { color: C.div, weight: px(1), gap: px(2) }),
    iconList([['603-918-7593', TEL], ['nponte@careyandgiampa.com', 'mailto:nponte@careyandgiampa.com'], ['655 Wallis Road, Rye, NH 03870', 'https://maps.google.com/?q=655+Wallis+Road+Rye+NH+03870']],
      { inline: true, icon: 'fas fa-phone', color: C.text, hover: C.blue, size: 14, weight: 400, space: 32, iconSize: 15, iconColor: C.blue,
      }),
    row([
      text('Nick Ponte Realty is the personal website of Nick Ponte, affiliated with Carey &amp; Giampa Realtors LLC. Carey &amp; Giampa does not own or operate this website. License 069268 · NRDS ID 600502199 · Office License 060587', { color: C.slate, size: 12, lh: 1.6, maxW: 760 }),
      text(`© ${new Date().getFullYear()} Nick Ponte Realty · <a href="${U.privacy}">Privacy Policy</a>`, { color: C.slate, size: 12, lh: 1.6, linkColor: C.slate, settings: { _element_width: 'auto' } }),
    ], { gap: 12, justify: 'space-between', align: 'flex-start' }),
  ], false)];
}
// Contact row icons differ per item (phone, envelope, map pin)
function fixFooterIcons(f) {
  const walk = (e) => { if (e.widgetType === 'icon-list' && e.settings.icon_list?.length === 3 && /603-918/.test(e.settings.icon_list[0].text)) {
    ['fas fa-phone', 'far fa-envelope', 'fas fa-map-marker-alt'].forEach((v, i) => { e.settings.icon_list[i].selected_icon = fa(v); });
    } (e.elements || []).forEach(walk); };
  f.forEach(walk); return f;
}

// Form widget mirroring a live form's recipients/messages ----------------------------------------
function form(live, fields, o = {}) {
  const keep = ['email_to', 'email_subject', 'email_from', 'email_from_name', 'email_to_2', 'email_subject_2', 'email_from_2', 'email_from_name_2', 'email_reply_to_2',
    'success_message', 'error_message', 'required_field_message', 'invalid_message', 'custom_messages', 'submit_actions', 'redirect_to', 'email_content', 'email_content_2'];
  const s = {};
  for (const k of Object.keys(live || {})) if (keep.includes(k) || /^email_/.test(k)) s[k] = live[k];
  return widget('form', {
    form_name: o.name || 'Form', form_fields: fields.map((f) => ({ _id: id(), width: '100', ...f })), button_text: o.button || 'Send', ...s,
    show_labels: o.labels === false ? '' : 'yes', mark_required: '', input_size: 'md', button_size: 'md', button_width: o.btnWidth || '100',
    column_gap: px(12), row_gap: px(14), label_spacing: px(6),
    ...typo('label_typography', BODY, 12, 600, { ls: 1, transform: 'uppercase' }), label_color: C.slate,
    field_text_color: C.text, field_background_color: C.bg, field_border_color: C.borderDark, field_border_width: box(1), field_border_radius: box(10),
    ...typo('field_typography', BODY, 15, 400),
    button_background_color: C.blue, button_text_color: C.white, button_background_hover_color: C.blueHover, button_hover_color: C.white,
    button_border_radius: box(10), ...typo('button_typography', BODY, 15, 600), button_text_padding: box(15, 24, 15, 24),
    ...(o.settings || {}),
  });
}

// Homepage --------------------------------------------------------------------------------------
function home(m, forms) {
  const stat = (k, v, c) => stack([lbl(k), heading(v, 'p', [42, 32, 22], C.navy, 'left', { weight: 800, lh: 1.1, ls: -0.4, settings: { custom_css: 'selector { white-space: nowrap; }' } }), text(c, { size: 14, color: C.slate, lh: 1.4 })],
    { gap: 6, settings: { padding: box(30, 28, 28, 28), padding_mobile: box(20, 18, 20, 18) } });
  const guideCard = (k, t, d, label, url) => card([lbl(k), H3(t, C.navy, { sizes: [26, 24, 22], weight: 700 }), text(d, { size: 15, color: C.slate }), btn(label, url, 'link', { icon: 'fas fa-arrow-right', size: 14 })], { gap: 10 });
  return [
    // 1. Hero
    container({
      content_width: 'boxed', boxed_width: px(1180), flex_direction: 'column', flex_justify_content: 'center', flex_gap: gap(0),
      min_height: px(820), min_height_tablet: px(720), min_height_mobile: px(0),
      padding: box(72, 32, 170, 32), padding_tablet: box(72, 32, 150, 32), padding_mobile: box(250, 24, 0, 24),
      background_background: 'classic', background_image: img(m, 'npc-hero'), background_position: 'center center', background_size: 'cover',
      background_image_mobile: img(m, 'npc-hero'), background_position_mobile: 'top center', background_size_mobile: 'initial', background_bg_width_mobile: px(160, '%'), background_repeat_mobile: 'no-repeat',
      background_color: C.bg,
      background_overlay_background: 'gradient', background_overlay_opacity: { unit: 'px', size: 1, sizes: [] }, background_overlay_color: 'rgba(243,247,250,0.97)', background_overlay_color_stop: px(0, '%'),
      background_overlay_color_b: 'rgba(243,247,250,0)', background_overlay_color_b_stop: px(76, '%'), background_overlay_gradient_type: 'linear',
      background_overlay_gradient_angle: { unit: 'deg', size: 90 }, background_overlay_gradient_angle_mobile: { unit: 'deg', size: 180 },
      background_overlay_color_stop_mobile: px(20, '%'), background_overlay_color_b_stop_mobile: px(55, '%'),
      custom_css: '@media (max-width: 767px) { selector::before { background-image: linear-gradient(180deg, rgba(246,249,252,0) 0, rgba(246,249,252,0) 100px, rgba(246,249,252,.82) 180px, #F6F9FC 290px) !important; } }',
    }, [
      lbl('Rye · Portsmouth · Hampton · The New Hampshire Seacoast', '#2F5D88'),
      title('Find your home on the <b>New Hampshire Seacoast.</b>', 'h1', [64, 52, 38], C.navy, 'left', { lh: 1.05, settings: { _margin: box(14, 0, 0, 0), custom_css: 'selector .elementor-heading-title b { font-weight: 800; } @media (min-width: 768px) { selector .elementor-heading-title b { display: block; } }', _element_width: 'initial', _element_custom_width: px(1100), _element_custom_width_mobile: px(100, '%') } }),
      text('Nick Ponte is a Managing Broker at Carey &amp; Giampa Realtors, representing buyers and sellers from Rye to Portsmouth to Hampton Beach.', { size: 18, color: C.text, lh: 1.6, maxW: 520, settings: { _margin: box(22, 0, 0, 0), typography_font_size_mobile: px(17) } }),
      container({ content_width: 'full', container_type: 'grid', padding: box(0), _margin: box(28, 0, 0, 0),
        grid_columns_grid: { unit: 'custom', size: 'auto auto auto' }, grid_columns_grid_tablet: { unit: 'custom', size: 'auto auto auto' }, grid_columns_grid_mobile: { unit: 'custom', size: '1fr 1fr' },
        grid_rows_grid: { unit: 'custom', size: 'auto' }, grid_rows_grid_mobile: { unit: 'custom', size: 'auto' }, grid_gaps: gap(12), grid_justify_content: 'start', grid_align_items: 'center',
        custom_css: '@media (max-width: 767px) { selector .elementor-button { width: 100%; justify-content: center; } selector .elementor-widget-button:last-child .elementor-button { width: auto; white-space: nowrap; } }',
      }, [
        btn('Call Nick', TEL, 'primary', { icon: 'fas fa-phone', bg: C.navy, size: 15, settings: { _element_width_mobile: 'inherit' } }),
        btn('Text me', SMS, 'ghost', { icon: 'far fa-comment', border: C.navy, size: 15 }),
        btn('Free home valuation', U.valuation, 'link', { icon: 'fas fa-arrow-right', size: 15, settings: { _grid_column_mobile: 'span 2', align_mobile: 'center' } }),
      ]),
    ], false),
    // 2. Stats card (overlaps the hero)
    container({ content_width: 'boxed', boxed_width: px(1180), padding: box(0, 32, 0, 32), padding_mobile: box(28, 24, 0, 24), _margin: box(-120, 0, 0, 0), _margin_mobile: box(0), z_index: 2, flex_direction: 'column' }, [
      container({
        container_type: 'grid', content_width: 'full', padding: box(0), grid_columns_grid: px(4, 'fr'), grid_columns_grid_tablet: px(4, 'fr'), grid_columns_grid_mobile: px(2, 'fr'),
        grid_rows_grid: { unit: 'custom', size: 'auto' }, grid_rows_grid_mobile: { unit: 'custom', size: 'auto' }, grid_gaps: gap(0),
        background_background: 'classic', background_color: C.white, border_border: 'solid', border_width: box(1), border_color: C.border, border_radius: box(18),
        box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 30, blur: 70, spread: -40, color: 'rgba(31,58,95,0.45)' },
        overflow: 'hidden', custom_css: 'selector > .e-con { box-shadow: 1px 0 0 #E3ECF3, 0 1px 0 #E3ECF3; }',
      }, [stat('Five-star reviews', '32+', 'Verified on Google and Zillow'), stat('Sold', '$110M+', 'Total transaction volume'), stat('Properties', '60+', 'Active and sold'), stat('Price range', '$150K–$18M', 'Condos to oceanfront estates')]),
    ], false),
    // 3. Town markets
    band(C.bg, [
      stack([lbl('Town markets', C.blue, 'center'), title('<b>Thirteen Seacoast towns,</b> one page each.', 'h2', [42, 36, 30], C.navy, 'center'),
        text("Median price, days on market and Nick's recent sales for every town, updated monthly.", { align: 'center', size: 15, color: C.slate, maxW: 560 })], { gap: 12, align: 'center' }),
      widget('npc-town-tiles', { tiles: 3, cta: 'View market →' }),
    ], { pad: [120, 0], gap: 36, width: 1180 }),
    // 4. Resources
    band(C.bg, [
      stack([lbl('Resources', C.blue, 'center'), title('<b>Guides</b> and market news.', 'h2', [42, 36, 30], C.navy, 'center')], { gap: 12, align: 'center' }),
      grid([guideCard('For buyers', 'Buyer Guide', 'How buying on the Seacoast works, from pre-approval and offers to inspections and closing.', 'Read the Buyer Guide', U.buyers),
        guideCard('For sellers', 'Seller Guide', 'Pricing, preparing and marketing your home, and what to expect from listing to closing.', 'Read the Seller Guide', U.sellers)], { cols: [2, 2, 1], gap: 20, align: 'stretch' }),
      widget('posts', {
        _skin: 'cards', cards_columns: '3', cards_columns_tablet: '2', cards_columns_mobile: '1', cards_posts_per_page: 3, cards_thumbnail_size_size: 'medium_large',
        cards_show_excerpt: '', cards_meta_data: ['date'], cards_show_read_more: 'yes', cards_read_more_text: 'Read article →', cards_show_avatar: '', cards_show_badge: '',
        cards_title_tag: 'h3', cards_item_ratio: px(0.62), cards_column_gap: px(20), cards_row_gap: px(20),
        cards_card_bg_color: C.white, cards_card_border_color: C.border, cards_card_border_radius: px(18), cards_box_shadow_box_shadow_type: '',
        cards_title_color: C.navy, ...typo('cards_title_typography', HEAD, 18, 700, { lh: 1.3 }), cards_meta_color: C.slate, ...typo('cards_meta_typography', BODY, 13, 400),
        cards_read_more_color: C.blue, ...typo('cards_read_more_typography', BODY, 13, 600),
      }),
      row([btn('All market news', U.blog, 'link', { icon: 'fas fa-arrow-right' })], { justify: 'center' }),
    ], { pad: [96, 0], gap: 28, width: 1180 }),
    // 5. About
    band(C.panel, [
      grid([
        stack([
          image(img(m, 'npc-nick-ponte'), { align: 'center', settings: { width: px(100, '%'), image_border_radius: box(24), image_box_shadow_box_shadow_type: 'yes', image_box_shadow_box_shadow: { horizontal: 0, vertical: 40, blur: 80, spread: -40, color: 'rgba(31,58,95,0.55)' }, custom_css: 'selector img { aspect-ratio: 4/5; object-fit: cover; }' } }),
          container({ content_width: 'full', flex_direction: 'column', flex_gap: gap(2), padding: box(16, 20, 16, 20), _margin: box(-60, 0, 0, 40), _margin_mobile: box(-40, 12, 0, 12), z_index: 2,
            background_background: 'classic', background_color: 'rgba(255,255,255,0.9)', border_radius: box(16), border_border: 'solid', border_width: box(1), border_color: C.white,
            box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 24, blur: 50, spread: -24, color: 'rgba(31,58,95,0.45)' } }, [
            lbl('Managing Broker'), heading('Carey &amp; Giampa Realtors', 'p', 17, C.navy, 'left', { weight: 700, lh: 1.25, ls: 0 }),
            text('<b>$110M+</b> sold &nbsp;·&nbsp; <b>32+</b> five-star reviews', { size: 13, color: C.slate }),
          ]),
        ], { gap: 0, maxW: 440, settings: { width: px(100, '%') } }),
        stack([
          lbl('About'),
          title('<b>Nick Ponte,</b> Managing Broker', 'h2', [42, 36, 30], C.navy),
          text('Nick Ponte is a Managing Broker at Carey &amp; Giampa Realtors and one of the top-producing agents on the NH Seacoast. He joined the firm in 2014 and rose from agent to Associate Broker to Managing Broker.', { size: 18, color: C.text }),
          text('Born and raised on the Seacoast, with a business and economics degree from Plymouth State University and a prior career as an IT analyst that drives a data-first approach to pricing. First-time buyers to $5M+ waterfront estates.', { size: 16, color: C.slate }),
          row([['12+', 'Years at the firm'], ['$10M+', 'Annual sales volume'], ['$3B+', 'Firm career volume']].map(([v, c]) => stack([heading(v, 'p', [34, 30, 26], C.navy, 'left', { weight: 800, lh: 1.1 }), text(c, { size: 13, color: C.slate })], { gap: 2, settings: { width: auto } })), { gap: 40, settings: { flex_wrap: 'nowrap', flex_gap_mobile: gap(24) } }),
          widget('divider', { color: C.border, weight: px(1), gap: px(8) }),
          row([btn('Work with Nick', U.contact), btn('Featured sales', U.featured, 'ghost')], { gap: 12 }),
          widget('divider', { color: C.border, weight: px(1), gap: px(8) }),
          row([lbl('As seen in', C.slate),
            image(img(m, 'npc-press-seacoastonline'), { settings: { _element_width: 'auto', height: px(17), width: auto, opacity: px(0.8) } }),
            image(img(m, 'npc-press-bostoncom'), { settings: { _element_width: 'auto', height: px(20), width: auto, opacity: px(0.8) } }),
            image(img(m, 'npc-press-unionleader'), { settings: { _element_width: 'auto', height: px(24), width: auto, opacity: px(0.8) } }),
          ], { gap: 28 }),
        ], { gap: 18 }),
      ], { cols: ['minmax(0,0.9fr) minmax(0,1.1fr)', '1fr', '1fr'], gap: 80, gapM: 48, align: 'center' }),
    ], { pad: [104, 104], width: 1180, anchor: 'about', settings: { border_border: 'solid', border_width: box(1, 0, 1, 0), border_color: C.border } }),
    // 6. 387 Ocean
    container({
      content_width: 'boxed', boxed_width: px(1180), flex_direction: 'column', flex_justify_content: 'center', min_height: px(600), min_height_mobile: px(560),
      padding: box(64, 32, 64, 32), padding_mobile: box(48, 20, 48, 20),
      background_background: 'classic', background_image: img(m, 'npc-387-ocean'), background_position: 'center center', background_size: 'cover', background_color: C.navy,
      background_overlay_background: 'gradient', background_overlay_opacity: { unit: 'px', size: 1, sizes: [] }, background_overlay_color: 'rgba(31,58,95,0.72)', background_overlay_color_b: 'rgba(31,58,95,0.38)', background_overlay_gradient_angle: { unit: 'deg', size: 90 },
    }, [
      container({ content_width: 'full', width: px(540), width_mobile: px(100, '%'), flex_direction: 'column', flex_gap: gap(16), padding: box(44), padding_mobile: box(28),
        background_background: 'classic', background_color: 'rgba(255,255,255,0.88)', border_radius: box(20), custom_css: 'selector { -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }',
        box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 30, blur: 70, spread: -40, color: 'rgba(0,0,0,0.5)' } }, [
        lbl('Current project'), title('<b>387 Ocean,</b> Hampton', 'h2', [42, 36, 30], C.navy),
        text('Two boutique luxury condominium buildings with ocean and marsh views, direct-entry elevators, floor-to-ceiling windows and premium modern finishes. Breaking ground this spring, from $1,500,000, with completion expected in late 2027.', { size: 15, color: C.text }),
        btn('Explore 387 Ocean', 'http://www.387oceanboulevard.com', 'primary', { icon: 'fas fa-arrow-right', settings: { icon_align: 'row-reverse', _flex_align_self: 'flex-start' } }),
      ]),
    ], false),
    // 7. Reviews
    band(C.panel, [
      widget('testimonial-carousel', {
        slides: [
          { _id: id(), content: "I can't say enough about what a great job Nick did on our behalf. He knew that we really loved this house and worked tirelessly to ensure that our dream came true. Highly recommend Nick Ponte whether you are buying or selling.", name: 'Mark & Vivian L.', title: '' },
          { _id: id(), content: 'Nick was extremely helpful and honest about the home buying process. He made himself available to answer all of my questions and spent ample time getting to know me and the features I was looking for. I would recommend Nick to anyone looking to buy or sell their home.', name: 'Kathryn B.', title: '' },
          { _id: id(), content: 'Could not recommend Nick enough. He was a great broker and partner, keeping us up to speed on progress and guiding us through every step of the journey. Very professional, prompt and transparent.', name: 'Emily & Peter J.', title: '' },
        ],
        skin: 'default', layout: 'image_above', alignment: 'center', slides_per_view: '1', slides_to_scroll: '1', show_arrows: '', pagination: 'bullets', autoplay: 'yes', autoplay_speed: 8000, loop: 'yes', speed: 600,
        content_text_color: C.navy, ...typo('content_typography', BODY, [26, 23, 20], 400, { lh: 1.5 }),
        name_text_color: C.blue, ...typo('name_typography', BODY, 13, 600, { ls: 1.8, transform: 'uppercase' }),
        pagination_color_inactive: C.borderDark, pagination_color: C.blue, space_between: px(20), image_size: px(0),
      }),
    ], { pad: [88, 88], width: 860, align: 'center', settings: { border_border: 'solid', border_width: box(1, 0, 1, 0), border_color: C.border } }),
    // 8. Instagram
    band(C.bg, [
      stack([lbl('Instagram', C.blue, 'center'), title('On the Seacoast <b>this week.</b>', 'h2', [42, 36, 30], C.navy, 'center')], { gap: 12, align: 'center' }),
      widget('shortcode', { shortcode: '[instagram-feed feed=1 num=6 cols=6 colsmobile=3 showheader=false showbutton=false showfollow=true imagepadding=6]', _css_classes: 'npc-insta__feed' }),
    ], { pad: [96, 0], gap: 28, width: 1180 }),
    // 9. Valuation
    band(C.panel, [
      container({ container_type: 'grid', content_width: 'full', padding: box(0), grid_columns_grid: px(2, 'fr'), grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'),
        grid_rows_grid: { unit: 'custom', size: 'auto' }, grid_gaps: gap(0), background_background: 'classic', background_color: C.white, border_radius: box(22), overflow: 'hidden',
        border_border: 'solid', border_width: box(1), border_color: C.border, box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 30, blur: 70, spread: -40, color: 'rgba(31,58,95,0.45)' } }, [
        container({ content_width: 'full', min_height: px(320), padding: box(0), background_background: 'classic', background_image: img(m, 'npc-estate-dusk'), background_position: 'center center', background_size: 'cover' }, []),
        stack([
          lbl('Free home valuation'), title('What is your <b>home worth?</b>', 'h2', [42, 36, 30], C.navy),
          text("Nick prepares a confidential valuation from recent comparable sales and your home's specifics, at no cost.", { size: 16, color: C.slate }),
          form(forms.valuation, [
            { custom_id: 'name', field_type: 'text', field_label: 'Property address', required: 'true' },
            { custom_id: 'field_365fb37', field_type: 'text', field_label: 'Full name', required: 'true', width: '50', width_mobile: '100' },
            { custom_id: 'email', field_type: 'email', field_label: 'Email', required: 'true', width: '50', width_mobile: '100' },
            { custom_id: 'message', field_type: 'tel', field_label: 'Phone', required: 'true', width: '50', width_mobile: '100' },
          ], { name: 'Home valuation', button: 'Request my valuation', btnWidth: '50', settings: { button_width_mobile: '100' } }),
        ], { gap: 14, settings: { padding: box(52), padding_mobile: box(28) } }),
      ]),
    ], { pad: [104, 104], width: 1180, anchor: 'valuation' }),
    // 10. Contact
    container({
      content_width: 'boxed', boxed_width: px(1180), container_type: 'grid', padding: box(96, 32, 96, 32), padding_mobile: box(64, 24, 64, 24),
      grid_columns_grid: px(2, 'fr'), grid_columns_grid_tablet: px(1, 'fr'), grid_columns_grid_mobile: px(1, 'fr'), grid_rows_grid: { unit: 'custom', size: 'auto' }, grid_gaps: gap(64, 40), grid_align_items: 'center',
      background_background: 'gradient', background_color: C.dark1, background_color_b: C.dark2, background_gradient_angle: { unit: 'deg', size: 160 }, _element_id: 'contact',
    }, [
      stack([
        lbl('Contact', C.eyebrowLight), title('We look forward <b>to connecting.</b>', 'h2', [42, 36, 30], C.white),
        text("Whether you're looking to buy, sell, or relocate, Nick Ponte is here to deliver tailored support and professional expertise.", { size: 16, color: C.mist, maxW: 460 }),
        iconList([['nponte@careyandgiampa.com', 'mailto:nponte@careyandgiampa.com'], ['603-918-7593', TEL], ['655 Wallis Road, Rye, NH 03870', 'https://maps.google.com/?q=655+Wallis+Road+Rye+NH+03870']],
          { icon: 'far fa-envelope', iconColor: C.white, iconSize: 20, color: C.white, hover: C.eyebrowLight, size: 18, weight: 500, space: 18, indent: 16,
            settings: { custom_css: 'selector .elementor-icon-list-icon { display: inline-flex !important; align-items: center; justify-content: center; flex: none; width: 48px; height: 48px; padding: 0 !important; border-radius: 50%; border: 1px solid rgba(185,204,220,.4); background: rgba(255,255,255,.08); } selector .elementor-icon-list-icon svg { width: 20px; height: 20px; margin: 0 !important; } selector .elementor-icon-list-item > a { align-items: center; }' } }),
      ], { gap: 16 }),
      card([
        heading('Off-market properties', 'h3', 22, C.navy, 'left', { weight: 700, lh: 1.2, ls: 0 }),
        text('Enter your email to find out about off-market properties before they reach the MLS.', { size: 15, color: C.slate }),
        form(forms.offmarket, [{ custom_id: 'email', field_type: 'email', field_label: 'Email', placeholder: 'you@example.com', required: 'true', width: '70', width_mobile: '100' }],
          { name: 'Off-market properties', button: 'Send', labels: false, btnWidth: '30', settings: { button_width_mobile: '100' } }),
      ], { pad: 32, radius: 16, bg: 'rgba(255,255,255,0.97)' }),
    ], false),
  ];
}
function fixContactIcons(els) {
  const walk = (e) => { if (e.widgetType === 'icon-list' && e.settings.icon_list?.length === 3 && /careyandgiampa/.test(e.settings.icon_list[0].text)) {
    ['far fa-envelope', 'fas fa-phone', 'fas fa-map-marker-alt'].forEach((v, i) => { e.settings.icon_list[i].selected_icon = fa(v); }); } (e.elements || []).forEach(walk); };
  els.forEach(walk); return els;
}

// Town template (Theme Builder single) ------------------------------------------------------------
// Dynamic tag string for a Nick Ponte town tag. o: { bold, before, after }
const tag = (name, o = {}) => `[elementor-tag id="${id()}" name="${name}" settings="${encodeURIComponent(JSON.stringify(o))}"]`;
const dynLast = (w) => { const l = w.settings.icon_list; l[l.length - 1].__dynamic__ = { text: tag('npc-town-name') }; return w; };
function town(m) {
  const wrap = (children, o = {}) => container({ content_width: 'boxed', boxed_width: px(1180), flex_direction: 'column', flex_gap: gap(o.gap ?? 20),
    padding: box(o.pt ?? 0, 32, o.pb ?? 0, 32), padding_mobile: box(o.ptM ?? o.pt ?? 0, 20, o.pbM ?? o.pb ?? 0, 20), ...(o.settings || {}) }, children, false);
  return [
    // Split hero: text left, contained photo right
    wrap([grid([
      stack([
        dynLast(iconList([['Home', U.home], ['Towns', U.rye], ['Town']], { inline: true, color: C.slate, hover: C.blue, size: 13, weight: 400, space: 6,
          settings: { custom_css: 'selector .elementor-icon-list-item:not(:last-child)::after { content: "/"; position: static; border: 0; width: auto; height: auto; margin-left: 6px; color: #5A6B7D; }' } })),
        lbl('Seacoast New Hampshire'),
        widget('heading', { title: 'Town', header_size: 'h1', title_color: C.navy, align: 'left', ...typo('typography', HEAD, [68, 54, 40], 800, { lh: 1.04, ls: -1.2 }),
          __dynamic__: { title: tag('npc-town-name', { bold: '', after: '' }) } }),
        widget('text-editor', { editor: '<p>Town intro</p>', text_color: C.text, ...typo('typography', BODY, 17, 400, { lh: 1.65 }), _element_width: 'initial', _element_custom_width: px(560), _element_custom_width_tablet: px(100, '%'),
          __dynamic__: { editor: tag('npc-town-intro') } }),
        row([btn('Call Nick', TEL, 'primary', { icon: 'fas fa-phone', bg: C.navy }), btn('Text me', SMS, 'ghost', { icon: 'far fa-comment', border: C.navy })], { gap: 12, settings: { _margin: box(10, 0, 0, 0) } }),
      ], { gap: 14 }),
      widget('image', { image: { id: '', url: '' }, image_size: 'large', align: 'center', width: px(100, '%'), height: px(480), height_tablet: px(420), height_mobile: px(260), 'object-fit': 'cover',
        image_border_radius: box(22), image_box_shadow_box_shadow_type: 'yes', image_box_shadow_box_shadow: { horizontal: 0, vertical: 30, blur: 70, spread: -40, color: 'rgba(31,58,95,0.5)' },
        __dynamic__: { image: tag('npc-town-photo') } }),
    ], { cols: [2, 1, 1], gap: 56, gapM: 28, align: 'center' })], { pt: 48, pb: 8, ptM: 28 }),
    // Town buttons
    wrap([widget('npc-town-pills', { town: '0' })], { pt: 28 }),
    // Snapshot | neighborhoods + talk
    wrap([grid([
      widget('npc-town-snapshot', { town: '0', title: 'Market snapshot', sub: 'Last 90 days of closed sales' }),
      stack([
        widget('npc-town-areas', { town: '0', title: 'Neighborhoods', sub: 'Where people buy in' }),
        card([
          heading('Talk to Nick', 'h2', 22, C.navy, 'left', { weight: 700, lh: 1.2, ls: 0 }),
          widget('text-editor', { editor: '<p>Questions?</p>', text_color: C.text, ...typo('typography', BODY, 15, 400, { lh: 1.6 }),
            __dynamic__: { editor: tag('npc-town-name', { before: 'Questions about ', after: '? A candid read on the market, a valuation of your home, or an off-market introduction.' }) } }),
          row([btn('Call', TEL), btn('Text me', SMS, 'ghost', { border: C.navy })], { gap: 10, settings: { _margin: box(6, 0, 0, 0) } }),
        ], { bg: C.panel, pad: 28 }),
      ], { gap: 20 }),
    ], { cols: [2, 1, 1], gap: 20, align: 'start' })], { pt: 28 }),
    // Recent sales + long guide
    wrap([widget('npc-town-sales', { town: '0', title: 'Recent sales', sub: 'Closed transactions where Nick represented the buyer, the seller, or both', link: 'All featured sales →' }),
      widget('npc-town-guide', { town: '0' })], { pt: 20 }),
    // FAQ
    wrap([grid([
      stack([lbl('Questions'),
        widget('heading', { title: 'Buying and selling', header_size: 'h2', title_color: C.navy, align: 'left', ...typo('typography', HEAD, [42, 36, 30], 300, { lh: 1.08, ls: -0.6 }),
          custom_css: 'selector .elementor-heading-title b { font-weight: 800; }',
          __dynamic__: { title: tag('npc-town-name', { bold: 'yes', before: 'Buying and selling in ' }) } })], { gap: 12 }),
      widget('npc-town-faq', { town: '0' }),
    ], { cols: ['minmax(0,0.8fr) minmax(0,1.2fr)', '1fr', '1fr'], gap: 64, gapM: 24, align: 'start' })], { pt: 72, pb: 96, ptM: 48, pbM: 64 }),
  ];
}

// Buyer / Seller guide pages ----------------------------------------------------------------------
const GUIDES = {
  buyer: { name: 'Buyer', lede: 'Ready to start your home buying journey and have some questions? Let the buyer guide lead the way.',
    intro: "If you're in the market for a new home, download Nick's free buyer guide. Learn about the costs of buying, inspections, appraisals, the under-contract process, what to expect on closing day and more.",
    inside: ['Costs associated with buying a home in NH', 'How to evaluate and make competitive offers', 'Inspection and appraisal walkthrough', 'Understanding the under-contract process', 'What to expect on closing day', 'Post-closing checklist'],
    cover: '/wp-content/uploads/2026/03/CG_Buying-Guide-2023-R1_PREP_3_1_page-0001.webp', photo: 'npc-buyer-hero', button: 'Send me the Buyer Guide', other: ['Seller Guide', U.sellers] },
  seller: { name: 'Seller', lede: 'Everything you need to sell your home for maximum value, from pricing strategy and staging to closing day.',
    intro: "If you're getting ready to sell, download Nick's free seller guide. It draws on years of experience on the Seacoast to walk you through the process.",
    inside: ['Hiring the right real estate agent', 'Pricing your property', 'Staging and photography', 'Marketing your home', 'Receiving and negotiating offers', 'Home inspections and appraisals', 'What to expect on closing day'],
    cover: '/wp-content/uploads/2026/03/CG_Sellers_Guide_2023-R5_2.48.08_PM_PREP_3-1_1_page-0001.webp', photo: 'npc-seller-hero', button: 'Send me the Seller Guide', other: ['Buyer Guide', U.buyers] },
};
const SITE_URL = 'https://nickponterealty.com';
// Split page hero used by guides and content pages: crumbs, eyebrow, H1 (light + bold), lede, buttons, contained photo.
function splitHero({ crumbs, eyebrow: eb, h1, lede, buttons, photo, alt }) {
  return container({ content_width: 'boxed', boxed_width: px(1180), padding: box(48, 32, 8, 32), padding_mobile: box(28, 20, 8, 20), flex_direction: 'column' }, [grid([
    stack([
      iconList(crumbs, { inline: true, color: C.slate, hover: C.blue, size: 13, weight: 400, space: 6,
        settings: { custom_css: 'selector .elementor-icon-list-item:not(:last-child)::after { content: "/"; position: static; border: 0; width: auto; height: auto; margin-left: 6px; color: #5A6B7D; }' } }),
      lbl(eb),
      title(h1, 'h1', [64, 52, 40], C.navy, 'left', { lh: 1.04, ls: -1.2 }),
      text(lede, { size: 17, color: C.text, lh: 1.65, maxW: 560 }),
      row(buttons, { gap: 12, settings: { _margin: box(10, 0, 0, 0) } }),
    ], { gap: 14 }),
    image(photo, { settings: { image_size: 'large', width: px(100, '%'), height: px(480), height_tablet: px(420), height_mobile: px(260), 'object-fit': 'cover', alt,
      image_border_radius: box(22), image_box_shadow_box_shadow_type: 'yes', image_box_shadow_box_shadow: { horizontal: 0, vertical: 30, blur: 70, spread: -40, color: 'rgba(31,58,95,0.5)' } } }),
  ], { cols: [2, 1, 1], gap: 56, gapM: 28, align: 'center' })], false);
}
// Contact call-to-action card used at the bottom of guides and content pages.
function talkBand(buttons) {
  return container({ content_width: 'boxed', boxed_width: px(1180), padding: box(24, 32, 96, 32), padding_mobile: box(16, 20, 64, 20), flex_direction: 'column' }, [
    card([
      heading('We look forward to connecting.', 'h2', [28, 26, 24], C.navy, 'left', { weight: 700, lh: 1.2, ls: -0.2 }),
      text("Whether you're looking to buy, sell, or relocate, Nick Ponte is here to deliver tailored support and professional expertise.", { size: 16, color: C.text, maxW: 560 }),
      row(buttons, { gap: 12, settings: { _margin: box(8, 0, 0, 0) } }),
    ], { bg: C.panel, pad: 44 }),
  ], false);
}
function guide(m, kind, live) {
  const g = GUIDES[kind];
  const fields = live.form_fields.map((f) => ({ ...f, field_label: f.field_label || (f.placeholder || '').replace(/\s*\*$/, '') }));
  return [
    splitHero({ crumbs: [['Home', U.home], ['Resources', '/#resources'], [`${g.name} Guide`]], eyebrow: 'Free download', h1: `<b>${g.name}</b> Guide`, lede: g.lede,
      buttons: [btn('Get the free guide', '#get-guide'), btn('Call Nick', TEL, 'ghost', { icon: 'fas fa-phone', border: C.navy })], photo: img(m, g.photo), alt: 'Oceanfront homes on the New Hampshire Seacoast' }),
    container({ content_width: 'boxed', boxed_width: px(1180), padding: box(72, 32, 48, 32), padding_mobile: box(48, 20, 32, 20), flex_direction: 'column', _element_id: 'get-guide' }, [grid([
      container({ content_width: 'full', padding: box(40), padding_mobile: box(24), background_background: 'classic', background_color: C.plate, border_radius: box(24), flex_align_items: 'center', flex_justify_content: 'center' }, [
        image({ id: '', url: SITE_URL + g.cover, alt: `Cover of the ${g.name} Guide` }, { settings: { width: px(100, '%'), space: px(420), image_box_shadow_box_shadow_type: 'yes', image_box_shadow_box_shadow: { horizontal: 0, vertical: 30, blur: 60, spread: -20, color: 'rgba(31,58,95,0.45)' } } }),
      ]),
      card([
        lbl('Download your free'),
        title(`<b>${g.name}</b> Guide`, 'h2', [42, 36, 30], C.navy),
        text(g.intro, { size: 16, color: C.text }),
        heading("What's inside", 'h3', 18, C.navy, 'left', { weight: 700, lh: 1.3, ls: 0, settings: { _margin: box(6, 0, 0, 0) } }),
        L.checkList(g.inside, [2, 2, 1]),
        form(live, fields, { name: live.form_name || `${g.name} Guide`, button: g.button, labels: false, btnWidth: '100',
          settings: { form_fields: fields, button_text: g.button, acceptance_typography_typography: 'custom' } }),
      ], { pad: 40, gap: 14 }),
    ], { cols: ['minmax(0,0.85fr) minmax(0,1.15fr)', '1fr', '1fr'], gap: 48, gapM: 28, align: 'start' })], false),
    talkBand([btn('Call 603-918-7593', TEL), btn(`Get the ${g.other[0]}`, g.other[1], 'ghost', { border: C.navy }), btn('Free home valuation', U.valuation, 'link', { icon: 'fas fa-arrow-right' })]),
  ];
}

// Content pages (About, Contact, FAQ, market report, Hampton Beach, cost to sell, privacy) -------------
const CONTENT = {
  25: ['about', 'About', '<b>Nick Ponte,</b> Managing Broker', 'npc-nick-ponte'],
  31: ['contact', 'Contact', 'We look forward <b>to connecting.</b>', ''],
  6103: ['article', 'Knowledge center', 'Seacoast NH real estate <b>FAQ</b>', 'npc-contact-seawall'],
  6082: ['article', 'Q1 2026 market report', 'Seacoast NH <b>market data &amp; trends</b>', 'npc-hero-hampton'],
  7513: ['article', 'NH Seacoast communities', '<b>Hampton Beach,</b> NH real estate', 'p7581'],
  6182: ['article', 'Seller resources', 'How much does it cost <b>to sell a home?</b>', 'npc-estate-dusk'],
  1145: ['legal', 'Legal', '<b>Privacy</b> Policy', ''],
};
const plain = (h) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
const crumbsFor = (t) => [['Home', U.home], [plain(t)]];
const crumbCss = { custom_css: 'selector .elementor-icon-list-item:not(:last-child)::after { content: "/"; position: static; border: 0; width: auto; height: auto; margin-left: 6px; color: #5A6B7D; }' };
const crumbs = (items) => iconList(items, { inline: true, color: C.slate, hover: C.blue, size: 13, weight: 400, space: 6, settings: crumbCss });
// Page text as Elementor Text Editor widgets (styled like the design's article body). [npc_netsheet] becomes the calculator widget.
function bodyWidgets(html) {
  return html.split(/(?:<p>)?\[npc_netsheet\](?:<\/p>)?/).flatMap((part, i) => [
    ...(i ? [widget('npc-net-sheet', {})] : []),
    ...(part.trim() ? [widget('text-editor', { editor: part.trim(), _css_classes: 'npc-article__body', text_color: C.text, ...typo('typography', BODY, 16, 400, { lh: 1.7 }) })] : []),
  ]);
}
function aside() {
  return stack([
    card([
      lbl('Talk to Nick'),
      heading('Questions about buying or selling on the Seacoast?', 'p', 19, C.navy, 'left', { weight: 700, lh: 1.3, ls: 0 }),
      iconList([['603-918-7593', TEL], ['Text Nick', SMS], ['nponte@careyandgiampa.com', 'mailto:nponte@careyandgiampa.com']], { icon: 'fas fa-phone', color: C.navy, hover: C.blue, size: 14, weight: 500, space: 10, iconSize: 14 }),
      btn('Free home valuation', U.valuation, 'primary', { settings: { align: 'justify' } }),
    ], { pad: 26, gap: 14 }),
    card([
      lbl('Resources'),
      iconList([['Buyer Guide →', U.buyers], ['Seller Guide →', U.sellers], ['Cost to sell a home →', U.cost], ['Market data &amp; trends →', '/seacoast-nh-real-estate-market-data-trends/'], ['Seacoast real estate FAQ →', U.faq], ['Market news →', U.blog]],
        { color: C.navy, hover: C.blue, size: 15, weight: 500, space: 12, settings: { divider: 'yes', divider_color: C.div, divider_weight: px(1) } }),
    ], { pad: 26, gap: 12 }),
  ], { gap: 16, settings: { custom_css: '@media (min-width: 1025px) { selector { position: sticky; top: 100px; } }' } });
}
function fixAsideIcons(w) { ['fas fa-phone', 'far fa-comment', 'far fa-envelope'].forEach((v, i) => { w.settings.icon_list[i].selected_icon = fa(v); }); return w; }
function content(m, pid, page, live) {
  const [layout, eb, h1, photo] = CONTENT[pid];
  const intro = page.intro || '';
  const out = [];
  if (layout === 'about') {
    out.push(container({ content_width: 'boxed', boxed_width: px(1180), padding: box(56, 32, 72, 32), padding_mobile: box(28, 20, 48, 20), flex_direction: 'column',
      background_background: 'classic', background_color: C.panel, border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.border }, [grid([
      image(img(m, 'npc-nick-ponte'), { settings: { width: px(100, '%'), image_border_radius: box(24), alt: 'Nick Ponte',
        image_box_shadow_box_shadow_type: 'yes', image_box_shadow_box_shadow: { horizontal: 0, vertical: 40, blur: 80, spread: -40, color: 'rgba(31,58,95,0.55)' }, custom_css: 'selector img { aspect-ratio: 4/5; object-fit: cover; }' } }),
      stack([
        crumbs(crumbsFor('About')), lbl(eb), title(h1, 'h1', [56, 46, 38], C.navy, 'left', { lh: 1.05 }),
        text(intro, { size: 17, color: C.text, lh: 1.65 }),
        row([['12+', 'Years at the firm'], ['$10M+', 'Annual sales volume'], ['$3B+', 'Firm career volume']].map(([v, c]) => stack([heading(v, 'p', [34, 30, 26], C.navy, 'left', { weight: 800, lh: 1.1 }), text(c, { size: 13, color: C.slate })], { gap: 2, settings: { width: auto } })), { gap: 40, settings: { flex_wrap: 'nowrap', flex_gap_mobile: gap(24) } }),
        row([btn('Call Nick', TEL, 'primary', { icon: 'fas fa-phone' }), btn('Featured sales', U.featured, 'ghost', { border: C.navy })], { gap: 12 }),
      ], { gap: 16 }),
    ], { cols: ['minmax(0,0.8fr) minmax(0,1.2fr)', '1fr', '1fr'], gap: 64, gapM: 32, align: 'center' })], false));
  } else if (layout === 'contact' || layout === 'legal') {
    out.push(container({ content_width: 'boxed', boxed_width: px(1180), padding: box(56, 32, 48, 32), padding_mobile: box(28, 20, 32, 20), flex_direction: 'column', flex_gap: gap(14),
      background_background: 'classic', background_color: C.panel, border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.border }, [
      crumbs(crumbsFor(layout === 'contact' ? 'Contact' : h1)), lbl(eb), title(h1, 'h1', [56, 46, 38], C.navy, 'left', { lh: 1.05 }),
      ...(layout === 'contact' ? [text(intro || "Whether you're looking to buy, sell, or relocate, Nick Ponte is here to deliver tailored support and professional expertise.", { size: 17, color: C.text, maxW: 620 })] : intro ? [text(intro, { size: 17, color: C.text, maxW: 620 })] : []),
    ], false));
  } else {
    out.push(splitHero({ crumbs: crumbsFor(h1), eyebrow: eb, h1, lede: intro, photo: img(m, photo), alt: '',
      buttons: [btn('Call Nick', TEL, 'primary', { icon: 'fas fa-phone' }), btn('Free home valuation', U.valuation, 'ghost', { border: C.navy })] }));
  }
  if (layout === 'contact') {
    const it = (ic, k, v, url) => card([row([widget('icon', { selected_icon: fa(ic), view: 'stacked', shape: 'circle', primary_color: C.panel, secondary_color: C.blue, icon_size: px(20), icon_padding: px(14), _element_width: 'auto' }),
      stack([lbl(k, C.slate), heading(v, 'p', 18, C.navy, 'left', { weight: 600, lh: 1.3, ls: 0, ...(url ? { link: url } : {}) })], { gap: 4, settings: { width: auto, _flex_size: 'grow' } })], { gap: 16, settings: { flex_wrap: 'nowrap' } })], { pad: 24 });
    out.push(container({ content_width: 'boxed', boxed_width: px(1180), padding: box(56, 32, 96, 32), padding_mobile: box(36, 20, 64, 20), flex_direction: 'column' }, [grid([
      stack([it('fas fa-phone', 'Phone', '603-918-7593', TEL), it('far fa-envelope', 'Email', 'nponte@careyandgiampa.com', 'mailto:nponte@careyandgiampa.com'), it('fas fa-map-marker-alt', 'Office', '655 Wallis Road, Rye, NH 03870', 'https://maps.google.com/?q=655+Wallis+Road+Rye+NH+03870')], { gap: 14 }),
      card([heading('Send a message', 'h2', 24, C.navy, 'left', { weight: 700, lh: 1.2, ls: 0 }), text('Nick usually replies the same day.', { size: 15, color: C.slate }),
        form(live, live.form_fields, { name: live.form_name || 'Contact', button: 'Send message', settings: { form_fields: live.form_fields } })], { pad: 36, gap: 12 }),
    ], { cols: ['minmax(0,0.8fr) minmax(0,1.2fr)', '1fr', '1fr'], gap: 40, gapM: 28, align: 'start' })], false));
    return out;
  }
  const body = stack(bodyWidgets(page.body || ''), { gap: 24 });
  out.push(container({ content_width: 'boxed', boxed_width: px(1180), padding: box(64, 32, layout === 'legal' ? 96 : 24, 32), padding_mobile: box(40, 20, layout === 'legal' ? 64 : 16, 20), flex_direction: 'column' },
    layout === 'legal' ? [stack([body], { maxW: 820 })] : [grid([body, fixAsideIcons2(aside())], { cols: ['minmax(0,1fr) 320px', '1fr', '1fr'], gap: 64, gapM: 40, align: 'start' })], false));
  if (layout !== 'legal') out.push(talkBand([btn('Call 603-918-7593', TEL), btn('Send a message', U.contact, 'ghost', { border: C.navy })]));
  return out;
}
function fixAsideIcons2(a) { const walk = (e) => { if (e.widgetType === 'icon-list' && /603-918/.test(e.settings.icon_list?.[0]?.text || '') && e.settings.icon_list.length === 3) fixAsideIcons(e); (e.elements || []).forEach(walk); }; walk(a); return a; }

// Featured sales -----------------------------------------------------------------------------------
const SALES = [
  ['98 Beach Hill Road', 'New Castle, NH', '$6,495,000', 'Sold', 'npc-sale-98-beach-hill', 'rmgyQWi17uk', ''],
  ['805 Central Road', 'Rye Beach, NH', '$6,400,000', 'Sold', 'npc-sale-805-central', '2-t3YoOq3Rk', ''],
  ['1026 Ocean Blvd', 'Hampton, NH', '$5,500,000', 'Sold', 'p7583', '', ''],
  ['1 Franklin Street', 'Exeter, NH', '$3,400,000', 'Sold', 'npc-sale-1-franklin', 'FptW7er7H_E', ''],
  ['82 Kings Highway', 'Hampton, NH', '$2,500,000', 'Featured listing', 'p7540', '', '/wp-content/uploads/2026/07/video-tour-1-2_wXSUUqoE.mp4'],
  ['39 Chapel Road', 'North Hampton, NH', '$2,150,000', 'Sold', 'npc-sale-39-chapel', 'Tyc0Is1i2I4', ''],
];
function featured(m) {
  const media = ([addr, town, , , pic, yt, mp4]) => (yt || mp4)
    ? widget('video', { video_type: yt ? 'youtube' : 'hosted', ...(yt ? { youtube_url: `https://www.youtube.com/watch?v=${yt}` } : { hosted_url: { url: SITE_URL + mp4, id: '' } }),
      show_image_overlay: 'yes', image_overlay: img(m, pic), image_overlay_size: 'large', lazy_load: 'yes', aspect_ratio: '43', controls: 'yes', modestbranding: 'yes', yt_privacy: 'yes', rel: '',
      play_icon_color: C.white, play_icon_size: px(64), custom_css: 'selector .elementor-wrapper { border-radius: 16px 16px 0 0; overflow: hidden; }' })
    : image(img(m, pic), { settings: { image_size: 'large', width: px(100, '%'), alt: `${addr}, ${town}`, custom_css: 'selector img { aspect-ratio: 4/3; object-fit: cover; border-radius: 16px 16px 0 0; }' } });
  const cardFor = (s) => container({ content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(0), background_background: 'classic', background_color: C.white,
    border_border: 'solid', border_width: box(1), border_color: C.border, border_radius: box(18), overflow: 'hidden',
    box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 24, blur: 50, spread: -40, color: 'rgba(31,58,95,0.4)' } }, [
    media(s),
    stack([lbl(s[3], s[3] === 'Sold' ? C.slate : C.blue), heading(s[0], 'h2', 21, C.navy, 'left', { weight: 700, lh: 1.25, ls: 0 }), text(s[1], { size: 14, color: C.slate }),
      heading(s[2], 'p', 24, C.navy, 'left', { weight: 800, lh: 1.2, ls: -0.2, settings: { _margin: box(6, 0, 0, 0) } })], { gap: 4, settings: { padding: box(22, 24, 24, 24) } }),
  ]);
  return [
    splitHero({ crumbs: [['Home', U.home], ['Featured sales']], eyebrow: 'Featured sales', h1: '<b>Recent sales</b> and listings',
      lede: 'A selection of homes Nick has represented on the New Hampshire Seacoast, from Rye Beach to New Castle. More than $110 million in total sales.',
      buttons: [btn('Call Nick', TEL, 'primary', { icon: 'fas fa-phone' }), btn("What's my home worth?", U.valuation, 'ghost', { border: C.navy })], photo: img(m, 'npc-seller-hero'), alt: 'Oceanfront homes on the New Hampshire Seacoast' }),
    container({ content_width: 'boxed', boxed_width: px(1180), padding: box(64, 32, 32, 32), padding_mobile: box(40, 20, 24, 20), flex_direction: 'column' }, [grid(SALES.map(cardFor), { cols: [3, 2, 1], gap: 24, align: 'stretch' })], false),
    sellCta(),
  ];
}
function sellCta() {
  return container({ content_width: 'boxed', boxed_width: px(1180), padding: box(24, 32, 96, 32), padding_mobile: box(16, 20, 64, 20), flex_direction: 'column' }, [
    card([heading('Thinking about selling?', 'h2', [28, 26, 24], C.navy, 'left', { weight: 700, lh: 1.2, ls: -0.2 }),
      text("Nick prepares a confidential valuation from recent comparable sales and your home's specifics, at no cost.", { size: 16, color: C.text, maxW: 560 }),
      row([btn('Get a free valuation', U.valuation), btn('Get the Seller Guide', U.sellers, 'ghost', { border: C.navy })], { gap: 12, settings: { _margin: box(8, 0, 0, 0) } })], { bg: C.panel, pad: 44 }),
  ], false);
}

module.exports = { CONTENT, content, featured, town, tag, guide, splitHero, talkBand, U, header, footer: (m) => fixFooterIcons(footer(m)), home: (m, f) => fixContactIcons(home(m, f)), pageSettings, form, btn, lbl, title, card, img };
