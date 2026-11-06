// Homepage, built from the Claude Design handoff (source/Home.dc.html).
const K = require('../lib/core.cjs');
const S = require('../lib/sections.cjs');
const { formStyle, field } = require('../lib/chrome.cjs');
const { C, SERIF, SANS, GUT, SEC, LINKS, px, cu, box, cbox, gap, link, typo, container, widget, cls, section, stack, row, grid, heading, H1, H2, H3, label, text, button, textLink, image, fa, eyebrow } = K;

function hero(ctx) {
  return container({
    content_width: 'full', flex_direction: 'column', flex_justify_content: 'center', flex_align_items: 'center', flex_gap: gap(0),
    min_height: px(100, 'vh'), padding: cbox('130px', GUT, '60px', GUT),
    background_background: 'video', background_video_link: ctx.m('sb-hero-video').url, background_play_on_mobile: 'yes',
    background_video_fallback: ctx.m('sb-hero-poster'),
    background_overlay_background: 'classic', background_overlay_color: 'rgba(0,0,0,0.42)',
    custom_css: 'selector { min-height: max(100vh, 640px); } selector .elementor-background-video-container { background: url(' + ctx.m('sb-hero-poster').url + ') center/cover no-repeat; }',
    ...cls('sb-home-hero'),
  }, [
    label('Award-Winning Chinese-Speaking Agent in the Bay Area', { align: 'center', color: C.white, size: [17, 16, 14], weight: 600, ls: 1.5, upper: true, cls: 'sb-hero-text', settings: { _margin: box(0, 0, 18, 0) } }),
    H1('Snow Bentley Realty', { color: C.white, align: 'center', size: ['clamp(48px, 4.4vw, 84px)', 56, 40], weight: 400, ls: 3, mb: 24, cls: 'sb-hero-text' }),
    heading('Commercial Leasing &amp; Sales · Luxury Real Estate', { tag: 'p', color: C.white, align: 'center', size: ['clamp(20px, 1.6vw, 30px)', 22, 18], weight: 500, lh: 1.3, ls: 1.5, mb: 14, cls: 'sb-hero-text' }),
    heading('CoStar Power Broker', { tag: 'p', color: C.white, align: 'center', size: ['clamp(20px, 1.6vw, 30px)', 22, 18], weight: 500, lh: 1.3, ls: 1.5, mb: 14, cls: 'sb-hero-text' }),
    heading('CA DRE# 01911217 | Brokered by eXp Commercial of California, Inc.', { tag: 'p', color: C.white, align: 'center', size: ['clamp(18px, 1.35vw, 25px)', 20, 16], weight: 500, lh: 1.35, ls: 0.6, upper: false, mb: 34, cls: 'sb-hero-text' }),
    widget('form', {
      form_name: 'Hero search', submit_actions: ['redirect'], redirect_to: `${LINKS.search}?keyword=[field id="q"]`,
      form_fields: [field('q', 'text', 'Search address or city', { width: '70', extra: { width_tablet: '70', width_mobile: '100' } })],
      button_text: 'Search', button_width: '30', button_width_tablet: '30', button_width_mobile: '100',
      ...formStyle({ fieldSize: 16, btnPad: box(22, 24, 22, 24) }), column_gap: px(16),
      field_border_width: box(0), field_background_color: 'rgba(255,255,255,0.25)', field_text_color: C.white,
      button_background_color: C.white, button_text_color: C.espresso, button_background_hover_color: C.cream, button_hover_color: C.espresso,
      ...cls('sb-form sb-form-glass sb-form-icon-pin'),
      _element_width: 'initial', _element_custom_width: px(428), _element_custom_width_mobile: px(100, '%'),
      custom_css: 'selector .elementor-field-textual { min-height: 56px; }',
    }),
  ], false);
}

function vision(ctx) {
  return section([
    H2('My Vision', { align: 'center', mb: 28 }),
    text("To be the trusted compass every business owner and family turns to when they're building and owning something new in the Bay Area and beyond, making the journey easier, faster, and more cost-effective.", { align: 'center', maxW: 1200, mb: 44 }),
    grid([
      S.tile(ctx.m('sb-tile-buy'), 'Buy', LINKS.search, { ratio: '574 / 690' }),
      S.tile(ctx.m('sb-tile-lets-connect'), "Let's Connect", ctx.connect, { ratio: '574 / 690' }),
      S.tile(ctx.m('sb-tile-sell'), 'Sell', '/home-valuation/', { ratio: '574 / 690' }),
    ], { cols: [3, 3, 1], gap: 15 }),
  ], { bg: C.cream, align: 'center' });
}

function homeWorth(ctx) {
  return section([
    H2('How Much Is Your Home Worth?', { color: C.white, align: 'center', size: 'clamp(30px, 2.6vw, 50px)', mb: 30 }),
    widget('icon-list', {
      view: 'inline', icon_list: ['Instant property valuation', 'Expert advice', 'Sell for more'].map((t) => ({ _id: K.id(), text: t, selected_icon: fa('fas fa-check') })),
      icon_color: C.white, text_color: C.white, icon_size: px(12), text_indent: px(8), space_between: px(28), icon_align: 'center',
      ...typo('icon_typography', SANS, 15, 300, { lh: 1, ls: 0.3 }), _margin: box(0, 0, 44, 0),
    }),
    row([
      widget('icon', { selected_icon: fa('fas fa-map-marker-alt'), primary_color: C.white, size: px(18), _element_width: 'auto' }),
      widget('form', {
        form_name: 'Home valuation', submit_actions: ['redirect'], redirect_to: LINKS.valuation,
        form_fields: [field('address', 'text', 'Enter your home address...', { width: '80', extra: { width_tablet: '75', width_mobile: '100' } })],
        button_text: 'Home Valuation', button_width: '20', button_width_tablet: '25', button_width_mobile: '100',
        ...formStyle({ fieldSize: 17, border: C.white, btnPad: box(22, 36, 22, 36) }), column_gap: px(20), field_text_color: C.white,
        button_background_color: 'rgba(255,255,255,0.8)', button_text_color: C.espresso, button_background_hover_color: C.white, button_hover_color: C.espresso,
        ...cls('sb-form sb-form-light sb-form-noicon'), _flex_size: 'grow',
        custom_css: 'selector .elementor-field-textual { min-height: 56px; }',
      }),
    ], { gap: 20, nowrap: true, settings: { width: px(100, '%'), custom_css: 'selector { max-width: 1450px; }' } }),
  ], { image: ctx.m('sb-home-worth-bg'), bg: C.espresso, align: 'center', justify: 'center', minH: 630 });
}

function meetSnow(ctx) {
  const bold = (t, mb) => text(t, { size: 17, weight: 600, lh: 1.5, ls: 0.5, mb });
  const body = (t, mb = 24) => text(t, { size: 16, weight: 300, lh: 1.6, ls: 0.4, mb });
  return section([
    container({ content_width: 'full', flex_direction: 'row', flex_wrap: 'wrap', flex_align_items: 'center', padding: box(0),
      flex_gap: { unit: 'custom', size: 'clamp(32px, 6vw, 120px)', column: 'clamp(32px, 6vw, 120px)', row: '40px', isLinked: false },
      custom_css: 'selector { max-width: 1540px; margin: 0 auto; }' }, [
      image(ctx.m('sb-snow-bentley-headshot'), { ratio: '563 / 805', settings: { _element_width: 'initial', _element_custom_width: px(563), _element_custom_width_mobile: px(100, '%'), _flex_size: 'none', custom_css: 'selector { flex: 1 1 360px; max-width: 563px; } selector img { aspect-ratio: 563 / 805; object-fit: cover; width: 100%; }' } }),
      stack([
        eyebrow('Meet', { mb: 12 }),
        H2('Snow Bentley', { mb: 44 }),
        bold('Global Reach, Local Expertise', 24),
        bold('Specializing in Commercial Sales &amp; Leasing<br>Luxury Residential Real Estate', 30),
        body("Snow Bentley believes the best deals aren't won - they're made. As founder of Snow Bentley Realty, Inc., brokered by eXp Commercial, Snow works across two worlds: commercial leasing for restaurant operators, retail brands, business owners, and investors, and luxury residential for buyers and sellers throughout the San Francisco Bay Area. Through her brokerage network, she also partners with agents worldwide."),
        body('Snow approaches real estate the way a business owner does, because she has been one. Before she earned her real estate license more than a decade ago, she ran an import-export company, invested in startups, and owned and operated a restaurant in Santa Barbara. She knows what it takes to sign a lease, build out a space, and keep the doors open. That is why food and beverage and retail clients trust her to find locations that work for their business, not just ones that look good on paper.'),
        body('CA DRE# 01911217 | eXp Commercial of California, Inc.', 0),
        row([button('Learn More', '/about/', 'dark'), button("Let's Connect", ctx.connect, 'outline')], { gap: 20, settings: { _margin: box(60, 0, 0, 0) } }),
      ], { settings: { custom_css: 'selector { flex: 1.4 1 420px; }' } }),
    ]),
  ], { bg: C.cream });
}

function searchListings(ctx) {
  const t = (key, l, url, o) => S.tile(ctx.m(key), l, url, { center: true, overlay: 'rgba(0,0,0,0.18)', size: 'clamp(24px, 2vw, 38px)', ls: 3, ...o });
  return section([
    H2('Search Listings', { align: 'center', mb: 40 }),
    grid([
      t('sb-listings-commercial-sales', 'Commercial Sales', `${LINKS.search}?propertyType=COMMERCIAL`, { ratio: '869 / 564' }),
      grid([
        t('sb-listings-commercial-leasing', 'Commercial Leasing', `${LINKS.search}?propertyType=COMMERCIAL&isLease=true`, { minH: 200 }),
        t('sb-listings-luxury-residential', 'Luxury Residential', `${LINKS.search}?pmin=3000000`, { minH: 300 }),
      ], { cols: [1, 1, 1], gap: 15, rows: '217fr 332fr', settings: { grid_rows_grid: { unit: 'custom', size: '217fr 332fr' } } }),
    ], { cols: [2, 1, 1], gap: 15 }),
  ], { bg: C.cream });
}

function neighborhoods(ctx) {
  const hoods = ctx.neighborhoods;
  const arrow = (dir) => button('', '#', 'dark', { pad: box(0), icon: dir < 0 ? S.chevronLeft : S.chevronRight, iconGap: 0, cls: `sb-arrow ${dir < 0 ? 'sb-prev' : 'sb-next'}` });
  return section([
    container({ content_width: 'full', flex_direction: 'column', padding: box(0), ...cls('sb-switch') }, [
      row([
        stack([eyebrow('Local Expertise', { mb: 12 }), H2('Neighborhoods')], { settings: { _element_width: 'auto' } }),
        row([arrow(-1), arrow(1)], { gap: 12, nowrap: true, settings: { _element_width: 'auto' } }),
      ], { justify: 'space-between', align: 'flex-end', gap: 24, settings: { padding: cbox('0', GUT, '0', '0') } }),
      container({ content_width: 'full', flex_direction: 'row', flex_wrap: 'wrap', flex_align_items: 'flex-start', padding: box(0), _margin: box(40, 0, 0, 0),
        flex_gap: { unit: 'custom', size: 'clamp(24px, 3.6vw, 68px)', column: 'clamp(24px, 3.6vw, 68px)', row: '32px', isLinked: false } }, [
        stack([
          container({ content_width: 'full', flex_direction: 'column', padding: box(0), ...cls('sb-hood-fade') }, [
            container({ content_width: 'full', flex_direction: 'column', padding: box(0), ...cls('sb-hood-list') },
              hoods.map((h) => heading(h.name, { tag: 'p', family: SANS, size: 17, weight: 300, lh: 1, ls: 0.3, cls: 'sb-tab sb-hood-tab' }))),
          ]),
          button('View All', '/neighborhoods/', 'dark', { align: 'justify', settings: { _margin: box(4, 0, 0, 0) } }),
        ], { settings: { custom_css: 'selector { flex: 0 1 528px; min-width: 260px; }' } }),
        container({ content_width: 'full', flex_direction: 'column', padding: box(0), custom_css: 'selector { flex: 1 1 520px; min-width: 0; }' },
          hoods.map((h) => container({ content_width: 'full', flex_direction: 'column', padding: box(0, 0, 64, 0), ...cls('sb-panel') }, [
            image(ctx.m(h.image), { ratio: '1217 / 622', link: `/neighborhoods/${h.slug}/` }),
            container({
              content_width: 'full', flex_direction: 'column', flex_justify_content: 'center', flex_gap: gap(64), padding: box(60, 48, 60, 48), padding_mobile: box(36, 28, 36, 28),
              min_height: px(322), min_height_mobile: px(0), background_background: 'classic', background_color: C.espresso,
              custom_css: 'selector { position: absolute; right: clamp(20px, 3.3vw, 62px); bottom: 0; width: min(460px, 78%); }',
            }, [
              H3(`Explore ${h.name}`, { color: C.white, size: 'clamp(22px, 1.7vw, 32px)', weight: 400, lh: 1.1 }),
              textLink('Read More', `/neighborhoods/${h.slug}/`, { size: 12, weight: 600, ls: 1, upper: true, lh: 1, color: C.white, hover: C.sand, icon: S.chevronRight, iconGap: 10 }),
            ]),
          ]))),
      ]),
    ]),
  ], { bg: C.cream, pad: cbox(SEC, '0', SEC, GUT) });
}

module.exports = {
  slug: 'home', title: 'Home', homeWorth,
  build: (ctx) => [hero(ctx), vision(ctx), homeWorth(ctx), meetSnow(ctx), S.testimonialsSlider(ctx), searchListings(ctx), neighborhoods(ctx), S.newsletterBand(ctx)],
};
