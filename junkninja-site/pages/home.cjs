// Home page, section by section, following Junk Ninja Home.dc.html.
const L = require('../lib.cjs');
const { C, HEAD, BODY, PHONE, TEL, SMS, BOOK, TOWNS, id, sz, box, gap, link, shadow, hide, typo, container, widget, fa,
  band, stack, row, grid, autoFit, circle, heading, display, H2, eyebrow, text, button, image, plusList } = L;

const SERVICES = [
  ['Residential Junk', 'Unwanted household items and general clutter.', 'svcResidential'],
  ['Furniture', 'Couches, mattresses, tables, dressers, and more.', 'svcFurniture'],
  ['Appliances', 'Refrigerators, washers, dryers, stoves, and other appliances.', 'svcAppliance'],
  ['Garage Cleanouts', 'Clearing unwanted items from garages.', 'svcGarage'],
  ['House & Estate', 'Partial or complete home cleanouts, inherited properties and estates.', 'svcEstate'],
  ['Realtor & Rental', 'Preparing properties for sale, rental, or turnover.', 'svcRental'],
  ['Yard Waste', 'Branches, vegetation, and landscaping debris.', 'svcYard'],
  ['Construction Debris', 'Hauling renovation and remodeling debris.', 'svcConstruction'],
];

/* 1. HERO ------------------------------------------------------------- */
const hero = (m) => container({
  content_width: 'boxed', boxed_width: sz(1200), flex_direction: 'row', flex_wrap: 'nowrap',
  flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(48),
  padding: box('clamp(56px,9vw,120px)', 'clamp(20px,5vw,64px)', 'clamp(56px,9vw,120px)', 'clamp(20px,5vw,64px)'),
  background_background: 'classic', background_color: C.navy, background_image: m.heroBg,
  background_position: 'center right', background_size: 'cover', background_repeat: 'no-repeat',
  background_overlay_background: 'gradient', background_overlay_color: 'rgba(0,38,75,.97)', background_overlay_color_b: 'rgba(0,38,75,.35)',
  background_overlay_gradient_type: 'linear', background_overlay_opacity: { unit: 'px', size: 1, sizes: [] }, background_overlay_gradient_angle: { unit: 'deg', size: 90 },
  _title: 'Hero', html_tag: 'section',
  custom_css: 'selector::before { background-image: linear-gradient(90deg, rgba(0,38,75,.97) 0%, rgba(0,38,75,.86) 45%, rgba(0,38,75,.35) 100%) !important; }\n@media (max-width: 760px) { selector::before { background-image: linear-gradient(90deg, rgba(0,38,75,.97) 0%, rgba(0,38,75,.86) 45%, rgba(0,38,75,.6) 100%) !important; } }',
}, [
  stack([
    eyebrow('Port St. Lucie &amp; the Treasure Coast', { dark: true }),
    display('Junk Removal on Florida\'s <span class="jn-cyan">Treasure Coast</span>', 'h1', 'clamp(32px,5.4vw,66px)', { lh: 1.06, color: C.white }),
    text('Proudly serving Florida\'s Treasure Coast, we tackle the clutter so you can enjoy a fresh start.',
      { color: C.white, size: 'clamp(18px,2vw,21px)', maxW: 620 }),
    row([
      button(`Call ${PHONE}`, TEL, 'cyan', { grow: 220, padX: 24 }),
      button('Text Us Photos', SMS, 'white', { grow: 180, padX: 24 }),
      button('Get a Free Quote', BOOK, 'ghostDark', { grow: 200, padX: 24 }),
    ], { settings: { margin: box(6, 0, 0, 0) } }),
    plusList(['Licensed and Insured', 'Open 6am–9pm, 7 days'], { inline: true, settings: { icon_list_items_gap: sz(8) } }),
  ], { gap: 22, settings: { _title: 'Hero text', custom_css: 'selector { max-width: 760px; }' } }),
], false);

/* 2. TRUST TICKER ----------------------------------------------------- */
const TICKER = ['Licensed and Insured', 'Serving the Treasure Coast', 'Open 6am–9pm Every Day', 'Real Quotes from Your Photos', 'Clutter Removed, Serenity Restored'];
const tickerRun = (hidden) => plusList(TICKER, {
  inline: true, family: HEAD, size: 'clamp(16px,2.2vw,24px)', weight: 400, ls: 0.08, upper: true, color: C.navy,
  iconSize: 'clamp(16px,2.2vw,24px)', indent: 28, space: 28,
  settings: {
    _element_width: 'auto', _flex_size: 'none', _margin: box(0, 28, 0, 0), ...(hidden ? { _attributes: 'aria-hidden|true' } : {}),
    custom_css: 'selector { flex: none !important; width: max-content !important; max-width: none !important; } selector .elementor-widget-container, selector .elementor-icon-list-items { width: max-content; max-width: none; } selector .elementor-icon-list-items { flex-wrap: nowrap; white-space: nowrap; } selector .elementor-icon-list-item { margin: 0 28px 0 0 !important; padding: 0 !important; } selector .elementor-icon-list-item:after { display: none !important; }',
  },
});
const ticker = () => container({
  content_width: 'full', padding: box(18, 0, 18, 0), flex_direction: 'row', flex_gap: gap(0), overflow: 'hidden',
  background_background: 'classic', background_color: C.cyan,
  border_border: 'solid', border_width: box(4, 0, 4, 0), border_color: C.navy, _title: 'Trust ticker',
}, [container({
  content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', padding: box(0), flex_gap: gap(0), _css_classes: 'jn-track',
  custom_css: 'selector { width: max-content !important; max-width: none !important; animation: jnmarq 28s linear infinite; }',
}, [tickerRun(false), tickerRun(true)])], false);

/* 3. SEND PHOTOS ------------------------------------------------------ */
const STEPS = [
  ['1', C.navy, C.white, C.cyan, 'Send Photos', `Text them to ${PHONE}, or book online and tell us what needs to go.`],
  ['2', C.cyan, C.navy, C.navy, 'Get Your Quote', 'We look at what needs to go and send you a quote for the job.'],
  ['3', C.navy, C.white, C.pink, 'We Haul It Away', 'We load it up and take it away. You get your space back.'],
];
const photos = () => band(C.white, [
  stack([
    eyebrow('The Ninja Way', { align: 'center' }),
    H2('Send Us Photos for a Faster Quote', { align: 'center' }),
    text('Every job is different. Text or upload a few photos of what needs to go and we\'ll get back to you with a quote. No photos? We\'ll come and take a look.', { size: 19, align: 'center' }),
  ], { maxW: 720, align: 'center', settings: { _flex_align_self: 'center' } }),
  grid(STEPS.map(([n, bg, fg, sh, title, body]) => stack([
    circle(160, bg, [heading(n, 'span', { size: 76, color: fg, lh: 1, align: 'center' })], { shadow: shadow(-9, 9, sh), settings: { z_index: 1 } }),
    heading(title, 'h3', { size: 24, ls: 0.05, upper: true, lh: 1.2, align: 'center', settings: { _margin: box(12, 0, 0, 0) } }),
    text(body, { color: C.slate, align: 'center', maxW: 300 }),
  ], { align: 'center' })), autoFit(220).replace('min(100%,220px)', '220px'), {
    gaps: gap(24, 36),
    settings: {
      padding: box(8, 0, 0, 0), _title: 'Steps',
      custom_css: `selector::before { content: ""; position: absolute; inset: 86px 16.67% auto 16.67%; width: auto; height: 0; border-top: 5px dashed ${C.cyan}; }
@media (max-width: 1180px) { selector::before { display: none; } }`,
    },
  }),
  row([
    button(`Text Photos to ${PHONE}`, SMS, 'navy'),
    button('Book Online', BOOK, 'ghostLight'),
  ], { justify: 'center' }),
], { gap: 36, anchor: 'photos' });

/* 4. SERVICES (nested tabs → accordion on mobile) ---------------------- */
const svcPanel = (m, [title, desc, key], i) => container({
  content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(0), _title: title,
  background_background: 'classic', background_color: C.navy, border_radius: box(18), overflow: 'hidden',
  box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: shadow(-12, 12), _css_classes: 'jn-svc-panel',
}, [
  image(m[key], { ratio: '16/9', size: 'large', settings: { _css_classes: 'jn-svc-img' } }),
  stack([
    heading(`${String(i + 1).padStart(2, '0')} / 08`, 'span', { size: 16, color: C.cyan, lh: 1.2, cls: 'jn-svc-count' }),
    heading(title, 'h3', { size: 'clamp(24px,2.8vw,30px)', ls: 0.05, upper: true, lh: 1.1, color: C.white, cls: 'jn-svc-title' }),
    text(desc, { size: 19, color: C.white, settings: { _css_classes: 'jn-svc-desc', custom_css: 'selector { min-height: 58px; }' } }),
    row([
      button('Text Us a Photo', SMS, 'cyan', { size: 15, padY: 16, padX: 10, grow: 170, nowrap: true }),
      button('Get a Free Quote', BOOK, 'ghostDark', { size: 15, padY: 16, padX: 10, grow: 170, nowrap: true, settings: { _css_classes: 'jn-svc-quote' } }),
    ], { settings: { margin: box(6, 0, 0, 0) } }),
  ], { settings: { padding: box('clamp(20px,3vw,30px)'), _css_classes: 'jn-svc-body' } }),
]);

const SERVICES_CSS = `/* Tab list: 8 rows, Russo One; idle slate, active navy + cyan shadow + pink plus */
@media (min-width: 761px) {
  selector .e-n-tabs { gap: clamp(28px,5vw,56px); }
  selector .e-n-tabs-heading { flex: 1 1 0; display: flex; flex-direction: column; gap: 0; }
  /* Photo shown at its full 3:2 shape; the list rows grow so list and panel stay level */
  selector .e-n-tabs { align-items: stretch; }
  selector .e-n-tabs-content { flex: 1 1 0; align-self: flex-start; margin-left: 12px; }
  selector .e-n-tabs-heading { justify-content: stretch; }
  selector .e-n-tabs-heading .e-n-tab-title { flex: 1 1 auto; }
  selector .jn-svc-img img { aspect-ratio: 3 / 2 !important; height: auto !important; object-fit: cover; object-position: center 30%; }
}
selector .e-n-tab-title { justify-content: flex-start; background: transparent !important; border: 0 !important; border-bottom: 1px solid ${C.border2} !important; border-radius: 0 !important; padding: 11px 0 !important; min-height: 44px; gap: 14px; cursor: pointer; }
selector .e-n-tab-title-text { font-family: "${HEAD}", sans-serif; font-weight: 400; font-size: clamp(20px,2.6vw,30px); letter-spacing: .05em; text-transform: uppercase; line-height: 1.2; color: ${C.idle}; text-align: left; }
selector .e-n-tab-title[aria-selected="true"] .e-n-tab-title-text { color: ${C.navy}; text-shadow: -.07em .07em 0 ${C.cyan}; }
selector .e-n-tab-title[aria-selected="false"] .e-n-tab-icon { display: none; }
selector .e-n-tab-icon i { color: ${C.pink} !important; font-size: 20px; }
selector .e-n-tab-icon svg { fill: ${C.pink} !important; width: 20px; height: 20px; }
/* ≤760px: accordion – active row opens in place, no photo, light background */
@media (max-width: 760px) {
  selector .jn-svc-panel { background: transparent !important; box-shadow: none !important; border-radius: 0 !important; }
  selector .jn-svc-img, selector .jn-svc-count, selector .jn-svc-title { display: none; }
  selector .jn-svc-body { padding: 4px 0 20px !important; border-bottom: 1px solid ${C.border2}; }
  selector .jn-svc-desc, selector .jn-svc-desc p { color: ${C.slate} !important; font-size: 18px !important; min-height: 0 !important; }
  selector .jn-svc-quote .elementor-button { background: ${C.navy} !important; border-color: ${C.navy} !important; }
}`;

// Hover-to-select on desktop lives in the Junk Ninja Site plugin (no HTML widget).

const services = (m) => band(C.surface, [
  stack([eyebrow('Services'), H2('What We Remove')], { gap: 12 }),
  {
    id: id(), elType: 'widget', widgetType: 'nested-tabs',
    settings: {
      tabs: SERVICES.map(([title]) => ({ _id: id(), tab_title: title, tab_icon: fa('fas fa-plus'), tab_icon_active: fa('fas fa-plus') })),
      tabs_direction: 'inline-start', tabs_justify_vertical: 'start', breakpoint_selector: 'mobile',
      icon_position: 'inline-start', _css_classes: 'jn-services', custom_css: SERVICES_CSS,
    },
    elements: SERVICES.map((s, i) => svcPanel(m, s, i)),
  },
], { anchor: 'services' });

/* 5. ABOUT ------------------------------------------------------------ */
const about = (m) => band(C.white, [grid([
  image(m.aboutImg, { ratio: '4/3', radius: 8, shadow: shadow(-12, 12), settings: { _margin: box(0, 0, 0, 12) } }),
  stack([
    eyebrow('Why Junk Ninja'),
    H2('Reclaim Your Space and Peace of Mind'),
    text('At Junk Ninja LLC, we don\'t just haul away junk — we help homeowners, realtors, and businesses reclaim their space and peace of mind. Proudly serving Florida\'s Treasure Coast, we tackle the clutter so you can enjoy a fresh start.', { size: 19 }),
    text('Licensed and insured. Working for homeowners, realtors and businesses, 6am–9pm every day.', { color: C.slate }),
    button('Get a Free Quote', BOOK, 'navy'),
  ], { gap: 18, align: 'flex-start' }),
], autoFit(340), { gap: 64, align: 'center', settings: { grid_gaps_tablet: gap(40), grid_gaps_mobile: gap(28) } })], { anchor: 'about' });

/* 6. REALTORS --------------------------------------------------------- */
const realtors = (m) => band(C.navy, [
  image(m.ninja, { settings: {
    _position: 'absolute', _z_index: 0, _title: 'Ninja watermark', _element_width: 'auto',
    custom_css: 'selector { inset: auto !important; left: 58% !important; top: 50% !important; height: 150%; transform: translate(-50%,-50%); pointer-events: none; } selector .elementor-widget-container, selector img { height: 100%; } selector img { width: auto; max-width: none; filter: brightness(0) invert(1); opacity: .07; }',
  } }),
  row([
    stack([
      eyebrow('Home &amp; rental cleanouts', { dark: true }),
      H2('Working with Realtors and Property Managers', { dark: true, size: 'clamp(24px,3.4vw,38px)', lh: 1.14 }),
      text('Preparing properties for sale, rental, or turnover. We clear abandoned furniture and belongings so the property is ready for what comes next.', { size: 19, color: C.white, maxW: 640 }),
    ], { settings: { custom_css: 'selector { flex: 1 1 420px; }' } }),
    row([button(`Call ${PHONE}`, TEL, 'cyan'), button('Text Photos', SMS, 'ghostDark')]),
  ], { gap: 48, rowGap: 28, justify: 'space-between', settings: { z_index: 1 } }),
], { anchor: 'realtors', pad: box('clamp(48px,7vw,84px)', 'clamp(20px,5vw,64px)', 'clamp(48px,7vw,84px)', 'clamp(20px,5vw,64px)'), settings: { overflow: 'hidden' } });

/* 7. BEFORE & AFTER --------------------------------------------------- */
const tag = (label, before) => heading(label, 'span', {
  family: BODY, size: 12, weight: 800, ls: 0.1, lh: 1.2, color: before ? C.white : C.navy,
  settings: {
    _position: 'absolute', _offset_orientation_h: 'start', _offset_x: sz(10), _offset_orientation_v: 'end', _offset_y_end: sz(10), _element_width: 'auto',
    _background_background: 'classic', _background_color: before ? C.navy : C.cyan, _border_radius: box(4), _padding: box(5, 9, 5, 9),
  },
});
const photoCell = (media, label, before) => container({ content_width: 'full', padding: box(0), flex_gap: gap(0) }, [
  image(media, { ratio: '3/4' }), tag(label, before),
]);
const pair = (m, [b, a, caption]) => stack([
  grid([photoCell(m[b], 'BEFORE', true), photoCell(m[a], 'AFTER', false)], '1fr 1fr', {
    gap: 3, settings: { border_radius: box(8), overflow: 'hidden', grid_columns_grid_mobile: { unit: 'custom', size: '1fr 1fr' } },
  }),
  heading(caption, 'p', { family: BODY, size: 17, weight: 800, lh: 1.3 }),
], { gap: 10 });
const gallery = (m) => band(C.white, [
  stack([eyebrow('Our work'), H2('Before &amp; After')], { gap: 12 }),
  grid([
    ['baGarage1Before', 'baGarage1After', 'Garage cleanout'], ['baHottub1Before', 'baHottub1After', 'Hot tub removal'],
    ['baGarage2Before', 'baGarage2After', 'Garage cleanout'], ['baHottub2Before', 'baHottub2After', 'Hot tub removal'],
  ].filter((p) => !isPlaceholder(m[p[0]]) && !isPlaceholder(m[p[1]])).map((p) => pair(m, p)), autoFit(420), { gap: 24, rowGap: 28 }),
], { anchor: 'gallery' });
// A pair shows only when both real photos are in the Media Library; with none, the section is left out.
const isPlaceholder = (img) => !img || /placeholder/.test(img.url);
const galleryIfReady = (m) => ([['baGarage1Before', 'baGarage1After'], ['baHottub1Before', 'baHottub1After'], ['baGarage2Before', 'baGarage2After'], ['baHottub2Before', 'baHottub2After']]
  .some(([b, a]) => !isPlaceholder(m[b]) && !isPlaceholder(m[a])) ? [gallery(m)] : []);

/* 8. REVIEWS ---------------------------------------------------------- */

// Restyles the Trustindex Google reviews grid as the design's navy review cards.
const REVIEWS_CSS = `selector .ti-widget { opacity: 1 !important; height: auto !important; overflow: visible !important; font-family: "${BODY}", sans-serif !important; }
selector .ti-widget-container { margin: 0 !important; padding: 0 !important; }
selector .ti-reviews-container-wrapper { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 22px 16px !important; margin: 0 !important; padding: 0 0 6px 6px !important; }
selector .ti-review-item { width: auto !important; max-width: none !important; flex: none !important; padding: 0 !important; margin: 0 !important; display: flex !important; }
selector .ti-review-item > .ti-inner { flex: 1; display: flex !important; flex-direction: column; gap: 14px; margin: 0 !important; padding: 26px !important; background: ${C.navy} !important; border: 0 !important; border-radius: 8px !important; box-shadow: -6px 6px 0 ${C.cyan} !important; color: #fff !important; }
selector .ti-review-header { order: 3; display: flex !important; align-items: center; gap: 10px; margin: 0 !important; padding: 0 !important; }
selector .ti-platform-icon, selector .ti-verified-review, selector .ti-date { display: none !important; }
selector .ti-profile-img img { width: 36px !important; height: 36px !important; border-radius: 50%; }
selector .ti-profile-details { padding: 0 !important; }
selector .ti-name { font-family: "${BODY}", sans-serif !important; font-weight: 800 !important; font-size: 17px !important; color: #fff !important; }
selector .ti-stars { order: 1; display: flex !important; gap: 4px; height: auto !important; margin: 0 !important; position: static !important; }
selector .ti-review-item:nth-child(n+7) { display: none !important; }
selector .ti-load-more-reviews-container { display: none !important; }
@media (max-width: 1180px) { selector .ti-reviews-container-wrapper { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
@media (max-width: 760px) { selector .ti-reviews-container-wrapper { grid-template-columns: 1fr !important; } selector .ti-review-item:nth-child(n+4) { display: none !important; } }
selector .ti-stars .ti-star { width: 28px !important; height: 28px !important; filter: brightness(0) saturate(100%) invert(72%) sepia(52%) saturate(1056%) hue-rotate(137deg) brightness(93%) contrast(87%); }
selector .ti-review-content { order: 2; flex: 1; margin: 0 !important; font-family: "${BODY}", sans-serif !important; font-size: 17px !important; line-height: 1.55 !important; color: #fff !important; height: auto !important; -webkit-line-clamp: 6; }
selector .ti-read-more { order: 2; margin: -6px 0 0 !important; font-family: "${BODY}", sans-serif !important; font-size: 15px !important; font-weight: 700 !important; }
selector .ti-widget .ti-read-more, selector .ti-widget .ti-read-more *, selector .ti-widget .ti-read-more span { color: ${C.cyan} !important; }
selector .ti-stars { margin-bottom: 4px !important; }
selector .ti-read-more span { color: ${C.cyan} !important; }
selector .ti-load-more-reviews-container { display: flex; justify-content: center; margin-top: 28px !important; }
selector .ti-load-more-reviews-button { font-family: "${BODY}", sans-serif !important; font-weight: 800 !important; font-size: 15px !important; letter-spacing: .03em; text-transform: uppercase; color: ${C.navy} !important; background: transparent !important; border: 2px solid ${C.navy} !important; border-radius: 6px !important; padding: 14px 26px !important; }
selector .ti-load-more-reviews-button:hover { background: #fff !important; }`;
const reviewCard = (n) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(14), padding: box(26),
  background_background: 'classic', background_color: C.navy, border_radius: box(8),
  box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: shadow(-6, 6),
}, [
  heading('★★★★★', 'p', { family: BODY, size: 36, lh: 1, ls: 0.11, color: C.cyan }),
  text(`[PLACEHOLDER] Real Google review ${n} goes here.`, { color: C.white, settings: { _flex_size: 'grow' } }),
  heading('[First name]', 'p', { family: BODY, size: 17, weight: 800, lh: 1.4, color: C.white }),
]);
const reviews = () => band(C.surface, [
  stack([eyebrow('Google reviews', { align: 'center' }), H2('What Our Customers Say', { align: 'center' })], { gap: 12, align: 'center' }),
  widget('shortcode', { shortcode: '[trustindex no-registration=google]', _title: 'Google reviews (Trustindex)', _css_classes: 'jn-reviews', custom_css: REVIEWS_CSS }),
  heading('Read our reviews on Google →', 'p', { family: BODY, size: 17, weight: 700, align: 'center', link: 'https://www.google.com/maps?cid=4838006495923928912', settings: { custom_css: 'selector a { text-decoration: underline; } selector a:hover { color: #0E8A99; }' } }),
], { anchor: 'reviews' });

/* 9. SERVICE AREAS ---------------------------------------------------- */
const town = (name) => button(name, '#areas', 'ghostLight', {
  size: 17, padY: 15, padX: 16, icon: fa('fas fa-plus'), iconGap: 10, full: true,
  settings: {
    typography_font_weight: '700', typography_text_transform: 'none', typography_letter_spacing: sz(0, 'em'),
    border_width: box(1), border_color: C.border, button_hover_border_color: C.cyan, button_background_hover_color: C.cyanTint,
    background_color: C.white, hover_color: C.navy,
    custom_css: `selector .elementor-button-content-wrapper { justify-content: flex-start; align-items: center; } selector .elementor-button-text { text-align: left; white-space: normal; flex: 1; } @media (max-width: 760px) { selector .elementor-button { font-size: 15px; padding: 13px 12px; } } selector .elementor-button-icon svg { fill: ${C.pink}; width: 13px; height: 13px; } selector .elementor-button-icon i { color: ${C.pink}; font-size: 13px; }`,
  },
});
const areas = (m) => band(C.white, [grid([
  stack([
    eyebrow('Service areas'),
    H2('Serving the Treasure Coast'),
    text('Junk removal in Port Saint Lucie and the towns around it.', { size: 19, color: C.slate }),
    row([
      image(m.ninja, { height: 120, width: 'auto', settings: { ...hide.tablet, _element_width: 'auto' } }),
      button('See All Service Areas', '#areas', 'navy'),
    ], { gap: 24, settings: { margin: box(16, 0, 0, 0) } }),
  ], { align: 'flex-start' }),
  grid(TOWNS.map(town), 'repeat(2,minmax(0,1fr))', { gap: 10 }),
], autoFit(340), { gap: 64, settings: { grid_gaps_tablet: gap(40), grid_gaps_mobile: gap(24) } })], { anchor: 'areas' });

/* 10. FAQ ------------------------------------------------------------- */
const FAQ = [
  ['How much does it cost?', `<p>Every job is different, so we quote from your photos or a quick visit. <a href="${SMS}">Text photos to ${PHONE}</a> or <a href="${BOOK}">book online</a>.</p>`],
  ['What do you remove?', '<p>Household junk, furniture, appliances, yard waste, construction debris, electronics and storm debris. We also do garage, house, estate, rental and storage unit cleanouts. <a href="#services">See our services</a>.</p>'],
  ['How soon can you do it?', `<p>It depends on the job and our schedule. <a href="${SMS}">Text photos to ${PHONE}</a> and we'll let you know when we can get to you.</p>`],
];
const FAQ_CSS = `selector .e-n-accordion { display: flex; flex-direction: column; gap: 10px; }
selector .e-n-accordion-item { background: #fff; border: 1px solid ${C.border}; border-radius: 8px; overflow: hidden; }
selector .e-n-accordion-item-title { padding: 20px 24px; border: 0 !important; background: transparent !important; justify-content: space-between; gap: 16px; }
selector .e-n-accordion-item-title-text { font-family: "${BODY}", sans-serif; font-weight: 800; font-size: 20px; color: ${C.navy}; line-height: 1.3; }
selector .e-n-accordion-item-title-icon svg, selector .e-n-accordion-item-title-icon i { color: ${C.cyanDark} !important; fill: ${C.cyanDark} !important; font-size: 22px; width: 22px; height: 22px; }
selector .e-n-accordion-item-title-icon .e-opened svg, selector .e-n-accordion-item-title-icon .e-opened i { transform: rotate(45deg); }
selector .e-n-accordion-item > .e-con { padding: 0 24px 22px !important; border: 0 !important; }
selector .e-n-accordion-item a { color: ${C.slate}; text-decoration: underline; }
selector .e-n-accordion-item a:hover { color: ${C.cyanDark}; }`;
const faq = () => band(C.surface, [
  stack([eyebrow('FAQ', { align: 'center' }), H2('Common Questions', { align: 'center' })], { gap: 12, align: 'center' }),
  {
    id: id(), elType: 'widget', widgetType: 'nested-accordion',
    settings: {
      items: FAQ.map(([q]) => ({ _id: id(), item_title: q })),
      accordion_item_title_icon: fa('fas fa-plus'), accordion_item_title_icon_active: fa('fas fa-plus'),
      accordion_item_title_icon_position: 'end', default_state: 'expanded', max_items_expended: 'multiple',
      custom_css: FAQ_CSS,
    },
    elements: FAQ.map(([, a]) => container({ content_width: 'full', flex_direction: 'column', padding: box(0, 24, 22, 24) }, [
      text(a, { color: C.slate, linkColor: C.slate }),
    ])),
  },
], { width: 820, gap: 28, anchor: 'faq' });

/* 11. QUOTE FORM ------------------------------------------------------ */
const FIELD_CSS = `selector .elementor-field-group { margin-bottom: 0; }
selector .elementor-form-fields-wrapper { row-gap: 18px; }
selector .elementor-field-label { font-family: "${BODY}", sans-serif; font-weight: 800; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: ${C.navy}; padding-bottom: 6px; }
selector .elementor-mark-required .elementor-field-label:after { color: ${C.pink}; }
selector .elementor-field-textual, selector .elementor-select-wrapper select { font-family: "${BODY}", sans-serif; font-size: 17px !important; color: ${C.navy}; padding: 14px 15px !important; min-height: 0; line-height: 1.4; border: 2px solid ${C.border} !important; background: ${C.surface} !important; border-radius: 8px !important; box-shadow: none !important; }
selector .elementor-field-textual:focus, selector .elementor-select-wrapper select:focus { border-color: ${C.cyan} !important; background: #fff !important; outline: none; }
selector textarea.elementor-field-textual { resize: vertical; }
/* Photo upload: the native file input styled as the design's drop area (no HTML field) */
selector .elementor-field-type-upload { position: relative; }
selector .elementor-field-type-upload input[type="file"] { width: 100%; box-sizing: border-box; cursor: pointer; border: 2px dashed ${C.cyan} !important; background: ${C.cyanTint} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 46 46'%3E%3Ccircle cx='20' cy='26' r='20' fill='%2326CCDD'/%3E%3Ccircle cx='23' cy='23' r='20' fill='%2300264B'/%3E%3Cpath d='M23 15v16M15 23h16' stroke='%23fff' stroke-width='2.6' stroke-linecap='round'/%3E%3C/svg%3E") center 18px / 46px 46px no-repeat !important; border-radius: 8px; padding: 112px 16px 16px !important; text-align: center; font-family: "${BODY}", sans-serif; font-size: 13px; color: ${C.slate}; }
selector .elementor-field-type-upload input[type="file"]::file-selector-button { width: 0; padding: 0; margin: 0; border: 0; font-size: 0; visibility: hidden; }
selector .elementor-field-type-upload input[type="file"]::-webkit-file-upload-button { width: 0; padding: 0; margin: 0; border: 0; font-size: 0; visibility: hidden; }
selector .elementor-field-type-upload::before { content: "Tap to add photos"; position: absolute; left: 0; right: 0; top: 92px; text-align: center; font-weight: 800; font-size: 16px; color: ${C.navy}; pointer-events: none; }
selector .elementor-field-type-upload::after { content: "A few photos of the junk gets you a faster quote"; position: absolute; left: 16px; right: 16px; top: 116px; text-align: center; font-size: 14px; color: ${C.slate}; pointer-events: none; }
selector .elementor-field-type-upload input[type="file"] { padding-top: 146px !important; padding-left: calc(50% - 46px) !important; }
selector .elementor-field-type-submit { padding-left: 4px !important; }
selector .elementor-button[type="submit"] { box-shadow: -4px 4px 0 ${C.cyan}; }
selector .elementor-message { font-weight: 700; }`;
const field = (o) => ({ _id: id(), width: o.width || '100', width_tablet: o.width || '100', width_mobile: '100', ...o });
const quoteForm = () => widget('form', {
  form_name: 'Free Quote',
  form_fields: [
    field({ custom_id: 'name', field_type: 'text', field_label: 'Name', required: 'true', width: '50', autocomplete: 'name' }),
    field({ custom_id: 'phone', field_type: 'tel', field_label: 'Phone', required: 'true', width: '50' }),
    field({ custom_id: 'email', field_type: 'email', field_label: 'Email', width: '50' }),
    field({ custom_id: 'town', field_type: 'select', field_label: 'Town', width: '50', field_options: [...TOWNS, 'Somewhere else'].join('\n') }),
    field({ custom_id: 'message', field_type: 'textarea', field_label: 'What needs to go?', rows: 3 }),
    field({ custom_id: 'photos', field_type: 'upload', field_label: 'Photos (if you can)', allow_multiple_upload: 'yes', max_files: 10, file_sizes: '10', file_types: 'jpg,jpeg,png,gif,webp,heic,heif' }),
  ],
  show_labels: 'true', mark_required: 'true', input_size: 'md',
  button_text: 'Request My Free Quote', button_size: 'md', button_width: '100', button_width_tablet: '100', button_width_mobile: '100',
  submit_actions: ['save-to-database', 'email'], email_to: 'junkninjallc@gmail.com', email_subject: 'New Junk Ninja quote request from [field id="name"]', email_from: 'website@junkninjallc.com', email_from_name: 'Junk Ninja Website', email_reply_to: '[field id="email"]', email_content: '[all-fields]', email_content_type: 'html',
  success_message: 'Thanks — we\'ll be in touch', error_message: 'Something went wrong. Please call or text 772-882-5955.',
  required_field: 'Please fill in this field.',
  column_gap: sz(16), row_gap: sz(18),
  ...typo('button_typography', BODY, 18, 800, { lh: 1.2, ls: 0.03, upper: true }),
  button_background_color: C.navy, button_text_color: C.white, button_background_hover_color: C.navyMid, button_hover_color: C.white,
  button_border_radius: box(8), button_text_padding: box(20),
  custom_css: FIELD_CSS,
});
const quote = (m) => band(C.navy, [grid([
  stack([
    circle(92, C.white, [image(m.ninja, { height: 60, width: 'auto' })], { shadow: shadow(-5, 5) }),
    eyebrow('Free estimates', { dark: true }),
    H2('Get Your<br><span style="white-space:nowrap">Free Quote</span>', { dark: true, size: 'clamp(28px,4.4vw,52px)', lh: 1.08 }),
    text('Book online and your request goes straight to our schedule. New and returning customers welcome.', { size: 20, color: C.white, maxW: 460 }),
    stack([
      button(`Call ${PHONE}`, TEL, 'cyan', { full: true, padX: 24 }),
      button(`Text Photos to ${PHONE}`, SMS, 'white', { full: true, padX: 24 }),
    ], { gap: 12, maxW: 420 }),
    text('Open 6am–9pm, 7 days a week · Licensed and Insured', { size: 15, color: C.white }),
  ], { gap: 18 }),
  container({
    content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(0),
    background_background: 'classic', background_color: C.white, border_radius: box(16), overflow: 'hidden',
    box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: shadow(-12, 12), margin: box(0, 0, 0, 12), _title: 'Booking card',
  }, [
    container({
      content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(16),
      padding: box(24, 'clamp(20px,3vw,32px)', 24, 'clamp(20px,3vw,32px)'), background_background: 'classic', background_color: C.navyMid,
    }, [
      stack([
        heading('Book Your Free Estimate', 'p', { size: 22, ls: 0.05, upper: true, lh: 1.15, color: C.white }),
        heading('Goes straight to our scheduling system.', 'p', { family: BODY, size: 15, weight: 600, lh: 1.4, color: C.white }),
      ], { gap: 2 }),
    ]),
    stack([
      plusList(['Pick a day and time that works for you', 'Tell us what needs to go', 'We confirm and show up ready to haul'], { color: C.navy, size: 17, weight: 600, space: 14, iconSize: 14, indent: 12 }),
      button('Book Online', BOOK, 'navy', { full: true, size: 18, padY: 20, settings: { _title: 'Housecall Pro booking' } }),
      text(`Returning customer? Book your next pickup the same way. Prefer to text? <a href="${SMS}">Send photos to ${PHONE}</a>.`, { color: C.slate, size: 15, linkColor: C.navy, settings: { custom_css: 'selector a { text-decoration: underline; font-weight: 700; }' } }),
    ], { gap: 22, settings: { padding: box('clamp(24px,3vw,32px)'), _title: 'Booking card body' } }),
  ]),
], autoFit(340), { gap: 64, settings: { grid_gaps_tablet: gap(40), grid_gaps_mobile: gap(28) } })], { anchor: 'quote' });

module.exports = {
  slug: 'home', title: 'Home',
  build: (m) => [container({
    content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(0), html_tag: 'main', _element_id: 'content', _title: 'Main',
  }, [hero(m), ticker(), photos(), services(m), about(m), realtors(m), ...galleryIfReady(m), reviews(), areas(m), faq(), quote(m)].map((s) => ({ ...s, isInner: true })), false)],
};
