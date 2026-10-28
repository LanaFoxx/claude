// Bayfield Inn sub-pages from the client's sitemap, in the homepage's design language.
// Native Elementor widgets only. m.file(name) returns an uploaded image by file name.
const B = require('./build.cjs');
const { C, SERIF, SANS, EXT, PAGE, id, px, box, gap, auto, link, fa, typo, container, widget, stack, row, gridSettings, radial,
  eyebrow, heading, text, button, image, linked, zoomOnHover } = B;

const GIFT_SHOP = '/gift-card/'; // gift card product page (shop.cjs)
const PHONE = 'tel:7157793363';
const EMAIL = 'mailto:info@thebayfieldinn.com';

const section = (settings, children) => container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...settings }, children, false);
const pad = { padding: box(110, 48, 110, 48), padding_tablet: box(88, 32, 88, 32), padding_mobile: box(64, 20, 64, 20) };
const boxed = { content_width: 'boxed', boxed_width: px(1480) };
const darkBtn = (label, url, o = {}) => button(label, url, 'dark', { ...o, settings: { button_background_hover_color: '#0F2113', ...(o.settings || {}) } });

// Green page hero: copy on the left, photo on the right (or copy only, centered).
function pageHero(eb, title, intro, img, o = {}) {
  const copy = container({
    content_width: 'full', flex_direction: 'column', flex_justify_content: 'center', flex_gap: gap(22),
    padding: box(96, 64, 96, 72), padding_tablet: box(72, 48, 64, 48), padding_mobile: box(56, 20, 48, 20),
    ...(img ? {} : { flex_align_items: 'center' }), ...radial('bottom left', C.mid, null, C.deep),
  }, [
    eyebrow(eb, C.cream, { opacity: 0.8, align: img ? 'left' : 'center', live: o.live }),
    heading(title, 'h1', [56, 46, 36], C.cream, { lh: 1, ls: -1.1, align: img ? 'left' : 'center', maxW: img ? undefined : 820 }),
    ...(intro ? [text(intro, { color: 'rgba(245,242,236,0.9)', size: 16.5, maxW: 520, align: img ? 'left' : 'center' })] : []),
    ...(o.buttons ? [row(o.buttons, { gap: 12, justify: img ? undefined : 'center', settings: { padding: box(6, 0, 0, 0) } })] : []),
  ]);
  if (!img) return section({ background_background: 'classic', background_color: C.green }, [copy]);
  return section({ ...gridSettings(['5fr 7fr', 1, 1]), background_background: 'classic', background_color: C.green, grid_gaps: gap(0, 0), grid_align_items: 'stretch' }, [
    copy,
    container({
      content_width: 'full', padding: box(0), min_height: px(520), min_height_tablet: px(420), min_height_mobile: px(280),
      background_background: 'classic', background_color: C.line, background_image: img, background_size: 'cover', background_position: o.pos || 'center center',
    }),
  ]);
}

// Text block: eyebrow + h2 + paragraphs, optional photo beside it.
function story(eb, title, paras, img, o = {}) {
  const copy = stack([
    eyebrow(eb, C.green),
    heading(title, 'h2', [44, 38, 30], C.green, { ls: -0.9 }),
    text(paras.map((p) => `<p>${p}</p>`).join(''), { size: 16, lh: 1.75, settings: { paragraph_spacing: px(18) } }),
    ...(o.after || []),
  ], { gap: 20 });
  return section({ background_background: 'classic', background_color: o.bg || C.cream, ...pad, ...boxed, flex_direction: 'column' }, [
    img ? container({ ...gridSettings(o.imgFirst ? ['6fr 5fr', 1, 1] : ['5fr 6fr', 1, 1]), content_width: 'full', padding: box(0), grid_gaps: gap(72, 40), grid_gaps_tablet: gap(40, 40), grid_align_items: 'center' }, o.imgFirst
      ? [photoBlock(img, o.alt), copy] : [copy, photoBlock(img, o.alt)])
      : stack([copy], { maxW: 760 }),
  ]);
}
const photoBlock = (img, alt, ratio = '4 / 3') => image(img, { settings: {
  alt_text: alt || '', _border_radius: box(4),
  _box_shadow_box_shadow_type: 'yes', _box_shadow_box_shadow: { horizontal: 0, vertical: 40, blur: 60, spread: -40, color: 'rgba(23,48,27,0.5)' },
  custom_css: `selector { overflow: hidden; line-height: 0; border-radius: 4px; }\nselector img { display: block; width: 100%; aspect-ratio: ${ratio}; object-fit: cover; }`,
} });

// Closing call to action band.
const ctaBand = (eb, title, buttons) => section({
  flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(22), ...radial('top right', C.mid, null, C.deep),
  padding: box(96, 48, 96, 48), padding_tablet: box(80, 32, 80, 32), padding_mobile: box(64, 20, 64, 20),
}, [
  eyebrow(eb, C.cream, { align: 'center', opacity: 0.8 }),
  heading(title, 'h2', [44, 36, 30], C.cream, { align: 'center', ls: -0.8, maxW: 760 }),
  row(buttons, { gap: 12, justify: 'center', settings: { padding: box(8, 0, 0, 0) } }),
]);
const outline = (label, url, o = {}) => button(label, url, 'outline', { upper: false, size: 13, pad: box(16, 28, 16, 28), ...o });
const light = (label, url, o = {}) => button(label, url, 'light', { size: 13, pad: box(16, 28, 16, 28), icon: 'fas fa-arrow-right', ...o });

// Lightbox gallery (Elementor Pro Gallery widget).
const galleryWidget = (imgs, cols = [3, 2, 1]) => widget('gallery', {
  gallery: imgs.map((x) => ({ id: x.id, url: x.url })), gallery_layout: 'masonry',
  columns: cols[0], columns_tablet: cols[1], columns_mobile: cols[2], gap: px(16), gap_tablet: px(14), gap_mobile: px(12),
  link_to: 'file', open_lightbox: 'yes', image_size: 'large', image_hover_animation: 'grow', show_all_galleries: '',
  image_border_radius: box(4),
});

/* ---------------------------------------------------------------- pages */
function history(m) {
  const H = [
    ['01-1890-opera-house', '1890 · The Opera House'], ['02-1890-opera-house', '1890 · The Opera House'],
    ['03-1930s-bracken-hotel', '1930s · The Bracken Hotel'], ['04-hotel-bayfield-late-30s-early-40s', 'Late 1930s · Hotel Bayfield'],
    ['05-1940s-hotel-bayfield', '1940s · Hotel Bayfield'], ['06-hotel-bayfield-early-50s', 'Early 1950s · Hotel Bayfield'],
    ['07-late-50s-early-60s', 'Late 1950s · Rittenhouse Avenue'], ['08-late-50s-early-60s', 'Late 1950s · Bayfield Inn'],
    ['09-1964-fire', '1964 · The fire'], ['10-1964-fire', '1964 · The fire'], ['11-1964-fire', '1964 · The fire'],
    ['12-late-1960s-postcard', 'Late 1960s · Postcard'], ['13-bayfield-inn-1960s', '1960s · The rebuilt Inn'],
  ];
  const fig = ([f, cap]) => stack([
    image(m.file(`bayfield-history-${f}.jpg`), { settings: { link_to: 'file', open_lightbox: 'yes', alt_text: cap,
      custom_css: 'selector { overflow: hidden; line-height: 0; border-radius: 4px; background: #DCD7CC; }\nselector img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; filter: sepia(.08); transition: transform .8s; }\nselector:hover img { transform: scale(1.03); }' } }),
    text(cap, { size: 13.5, weight: 400, color: C.muted, lh: 1.4 }),
  ], { gap: 10 });
  return [
    pageHero('Since 1898', 'More than 125 years on Bayfield’s waterfront.', 'From the Opera House to the Dittus Hotel, the Bracken Hotel, Hotel Bayfield and, since the 1950s, the Bayfield Inn.', m.file('bayfield-history-06-hotel-bayfield-early-50s.jpg')),
    story('Our story', 'From Opera House to Bayfield Inn', [
      'The Bayfield Inn traces its history to 1898, when the former Opera House was transformed into the Dittus Hotel — named after its first owner, William Dittus — near the heart of Bayfield’s busy waterfront district. Over the decades, renovations took place and the name changed several times, yet the hotel has remained in continuous operation for more than 125 years.',
      'From the Dittus Hotel, it was sold and renamed the City Hotel around the turn of the century — a mundane name, perhaps, but a common convention of the era. In the 1920s it became the Bracken Hotel, named for its new owner, and around the time of World War II the name changed yet again to Hotel Bayfield. It wasn’t until the 1950s that it took on the name “Bayfield Inn,” which has stuck for over 75 years.',
    ], m.file('bayfield-history-01-1890-opera-house.jpg'), { alt: 'The Opera House in 1890' }),
    story('A town landmark', 'A gathering place overlooking the harbor', [
      'As Bayfield evolved from a rugged brownstone mining, fishing, and lumber town into one of Wisconsin’s most beloved waterfront destinations, the hotel remained a familiar gathering place overlooking the harbor. The dirt streets of Rittenhouse Avenue and 1st Street gave way to brick and eventually pavement; fires, floods, and changing eras of travel reshaped the surrounding downtown. Through it all, the Inn stood as a cornerstone of the community.',
      'The Bayfield Inn is even older than the iconic gazebo that sits between the Inn and the waterfront. Constructed in 1913 for just $300, the gazebo first sat on the north side of Rittenhouse Avenue before being moved to its present location. The pair have since appeared in countless historic photographs and remain two of the town’s most recognizable landmarks.',
    ], m.file('bayfield-history-05-1940s-hotel-bayfield.jpg'), { bg: C.white, imgFirst: true, alt: 'Hotel Bayfield in the 1940s' }),
    story('1964 and after', 'Rebuilt, and still welcoming guests', [
      'Tragedy struck in 1964 when a fire destroyed much of the original wooden structure that had stood for generations. The Inn was rebuilt the following year, and the hospitality tradition it had long anchored continued on.',
      'Today, the Bayfield Inn carries that legacy forward — welcoming guests to the same remarkable waterfront community that has drawn visitors to Bayfield since the nineteenth century.',
    ], m.file('bayfield-history-09-1964-fire.jpg'), { alt: 'The 1964 fire' }),
    section({ background_background: 'classic', background_color: C.white, ...pad, ...boxed, flex_direction: 'column', flex_gap: gap(44) }, [
      stack([eyebrow('From the archive', C.green), heading('The Inn through the years', 'h2', [44, 38, 30], C.green, { ls: -0.9 })], { gap: 16 }),
      container({ ...gridSettings([3, 2, 1]), content_width: 'full', padding: box(0), grid_gaps: gap(24, 36), grid_gaps_mobile: gap(16, 28), grid_align_items: 'start' }, H.map(fig)),
      text('<em>With special thanks to the Bayfield Heritage Association for the photos.</em>', { family: SERIF, size: 17, weight: 400, color: C.green, align: 'center' }),
    ]),
  ];
}

// Gallery: one Elementor Pro Gallery in "multiple" mode, so visitors filter by section
// (All, General, Rooms, ...). Each section is its own image list, edited in the widget.
const GALLERY = [
  ['General', ['bayfield-inn-exterior.jpg', 'bayfield-events-lawn.jpg']],
  ['Rooms', ['bayfield-lake-view-room.jpg', 'bayfield-suite-jacuzzi.jpg', 'bayfield-standard-room.jpg', 'bayfield-lakeview-room.jpg']],
  ['Condos', ['bayfield-condos-cover.jpg', 'bayfield-condo-botl-unit-100-img-7635.jpg', 'bayfield-condo-iwh-house-img-3809.jpg', 'bayfield-condo-botl-unit-301-img-7677.jpg',
    'bayfield-condo-iwh-emerald-img-8198.jpg', 'bayfield-condo-botl-unit-102-img-7622.jpg', 'bayfield-condo-iwh-qe-ii-img-3794.jpg', 'bayfield-condo-botl-unit-100-img-7638.jpg',
    'bayfield-condo-iwh-phoenix-img-0211-2.jpg', 'bayfield-condo-botl-unit-202-img-7610.jpg', 'bayfield-condo-iwh-blue-img-1180.jpg', 'bayfield-condo-botl-unit-101-img-7655.jpg',
    'bayfield-condo-iwh-house-exterior-1.jpg', 'bayfield-condo-botl-unit-100-img-7645.jpg', 'bayfield-condo-iwh-common-area-img-8205.jpg', 'bayfield-condo-botl-unit-301-img-7676.jpg',
    'bayfield-condo-iwh-crows-nest-img-5968.jpg', 'bayfield-condo-botl-unit-102-img-7629.jpg', 'bayfield-condo-iwh-qe-ii-img-3476.jpg', 'bayfield-condo-botl-unit-101-img-7660.jpg',
    'bayfield-condo-iwh-emerald-img-8193.jpg', 'bayfield-condo-botl-unit-202-img-7602.jpg', 'bayfield-condo-iwh-blue-img-0174.jpg', 'bayfield-condo-botl-unit-301-img-7688.jpg',
    'bayfield-condo-iwh-qe-ii-img-3807.jpg', 'bayfield-condo-botl-unit-102-img-7621.jpg', 'bayfield-condo-iwh-common-area-img-1184.jpg', 'bayfield-condo-botl-unit-101-img-7666.jpg',
    'bayfield-condo-iwh-house-img-3629.jpg']],
  ['The Deck', ['bayfield-hero-the-deck.jpg', 'bayfield-the-deck-bar.jpg', 'bayfield-deck-dining.jpg']],
  ['The Lounge', ['bayfield-the-lounge.jpg']],
  ['Lakeside Dining Room', ['bayfield-dining-room-window.jpg', 'bayfield-lakeside-dining-room.jpg', 'bayfield-dining-cheers.jpg', 'bayfield-dining-shrimp.jpg']],
  ['The Creamery', ['bayfield-the-creamery.jpg']],
  ['The View & Vibe', ['bayfield-marina-webcam.jpg', 'bayfield-suite.jpg', 'bayfield-condo-botl-unit-100-img-7641.jpg', 'bayfield-harbor-sunset.jpg',
    'bayfield-condo-iwh-phoenix-img-8225.jpg', 'bayfield-events-lawn.jpg']],
];
function gallery(m) {
  const filtered = widget('gallery', {
    gallery_type: 'multiple', show_all_galleries: 'yes', show_all_galleries_label: 'All',
    galleries: GALLERY.map(([title, files]) => ({ _id: id(), gallery_title: title, multiple_gallery: files.map((f) => { const x = m.file(f); return { id: x.id, url: x.url }; }) })),
    gallery_layout: 'masonry', columns: 3, columns_tablet: 2, columns_mobile: 1, gap: px(16), gap_tablet: px(14), gap_mobile: px(12),
    link_to: 'file', open_lightbox: 'yes', image_size: 'large', image_hover_animation: 'grow', image_border_radius: box(4),
    // Filter bar
    galleries_align: 'center', galleries_pointer: 'underline', galleries_animation_line: 'fade',
    ...typo('galleries_titles_typography', SANS, [13, 13, 12], 500, { lh: 1.2, ls: 1.4, transform: 'uppercase' }),
    galleries_title_color_normal: C.muted, galleries_title_color_hover: C.green, galleries_title_color_active: C.green,
    galleries_pointer_color_hover: C.green, galleries_pointer_color_active: C.green, galleries_pointer_width: px(1),
    galleries_titles_space_between: px(26), galleries_titles_space_between_mobile: px(14), galleries_titles_gap: px(40), galleries_titles_gap_mobile: px(24),
    custom_css: `selector .elementor-gallery__titles-container { flex-wrap: wrap; row-gap: 10px; }
@media (max-width: 767px) { selector .elementor-gallery__titles-container { justify-content: flex-start; flex-wrap: nowrap; overflow-x: auto; padding-bottom: 6px; -webkit-overflow-scrolling: touch; }
  selector .elementor-gallery-title { white-space: nowrap; flex: none; } }`,
  });
  return [
    pageHero('Gallery', 'The Inn, the lake and the season.', 'Pick a section, or browse them all. Click any photo to see it full size.'),
    section({ background_background: 'classic', background_color: C.cream, padding: box(56, 48, 110, 48), padding_tablet: box(48, 32, 88, 32), padding_mobile: box(36, 16, 64, 16), ...boxed, flex_direction: 'column' }, [filtered]),
    ctaBand('Stay with us', 'See it for yourself.', [light('Book a Room', EXT.book), outline('Follow on Instagram', EXT.instagram, { icon: 'fab fa-instagram', settings: { icon_align: 'row' } })]),
  ];
}

function webcam(m) {
  // Live player: the "Bayfield interactions" snippet loads Angelcam into #player_bayfieldlive
  // and fills the weather card (.bi-wx-*) from Open-Meteo. The marina photo and "—" values
  // show until those load (and in the Elementor editor).
  const cam = container({
    content_width: 'full', padding: box(0), _element_id: 'player_bayfieldlive', overflow: 'hidden', border_radius: box(4),
    background_background: 'classic', background_color: '#0F2113', background_image: m.file('bayfield-marina-webcam.jpg'), background_size: 'cover', background_position: 'center center',
    custom_css: 'selector:not(:has(iframe, video)) { aspect-ratio: 16 / 9; }\nselector iframe { display: block; width: 100%; border: 0; }',
  }, []);
  const wxText = (cls, t, o = {}) => widget('heading', { title: t, header_size: o.tag || 'p', title_color: o.color || C.cream, _css_classes: cls,
    ...typo('typography', o.serif ? SERIF : SANS, o.size, o.weight || 400, { lh: o.lh || 1.2, ls: o.ls, transform: o.transform }) });
  const weather = container({
    content_width: 'full', width: px(230), width_tablet: px(210), width_mobile: px(100, '%'), flex_direction: 'column', flex_gap: gap(4),
    padding: box(16, 18, 16, 18), border_radius: box(4), background_background: 'classic', background_color: 'rgba(15,33,19,0.78)',
    position: 'absolute', _offset_orientation_h: 'end', _offset_x_end: px(20), _offset_orientation_v: 'start', _offset_y: px(20), z_index: 3, css_classes: 'bi-weather', // container keys (no underscore)
    custom_css: 'selector { backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); pointer-events: none; }\n@media (max-width: 767px) { selector { position: static !important; margin-top: 10px; pointer-events: auto; } }',
  }, [
    wxText('bi-wx-place', 'Bayfield, WI · now', { size: 10.5, weight: 500, ls: 1.8, transform: 'uppercase', color: 'rgba(245,242,236,0.7)' }),
    container({ content_width: 'full', flex_direction: 'row', flex_align_items: 'flex-end', flex_gap: gap(10), padding: box(2, 0, 0, 0) }, [
      wxText('bi-wx-temp', '—°', { serif: true, size: 44, weight: 300, lh: 1 }),
      wxText('bi-wx-cond', 'Current weather', { size: 13.5, lh: 1.3 }),
    ]),
    wxText('bi-wx-meta', 'Feels like — · Wind —', { size: 12.5, color: 'rgba(245,242,236,0.8)', lh: 1.4 }),
  ]);
  const stage = container({ content_width: 'full', padding: box(0), flex_direction: 'column', flex_gap: gap(0),
    box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 40, blur: 70, spread: -40, color: 'rgba(0,0,0,0.6)' }, border_radius: box(4) }, [cam, weather]);
  return [
    // Stream first: a short title row, then the player, all above the fold.
    section({ ...radial('bottom left', C.mid, null, C.deep), padding: box(32, 48, 64, 48), padding_tablet: box(28, 32, 56, 32), padding_mobile: box(24, 16, 40, 16),
      ...boxed, flex_direction: 'column', flex_gap: gap(22), flex_gap_mobile: gap(16) }, [
      row([
        stack([
          eyebrow('Live from the Inn', C.cream, { opacity: 0.85, live: true }),
          heading('See the lake right now.', 'h1', [40, 36, 30], C.cream, { lh: 1, ls: -0.8 }),
        ], { gap: 12, settings: { width: auto, width_tablet: auto, width_mobile: px(100, '%') } }),
        text('The marina, the ferry dock and Madeline Island, around the clock and in every season.', { color: 'rgba(245,242,236,0.8)', size: 15, maxW: 420 }),
      ], { gap: 24, align: 'flex-end', justify: 'space-between', settings: { flex_gap: gap(40, 12) } }),
      stage,
      text('Also on <a href="https://bayfieldlive.com" target="_blank" rel="noopener">bayfieldlive.com</a> · Weather from Open-Meteo', { color: 'rgba(245,242,236,0.6)', size: 12.5, align: 'center',
        linkColor: 'rgba(245,242,236,0.85)', settings: { link_hover_color: C.cream } }),
    ]),
    ctaBand('Like what you see?', 'The view is even better from your room.', [light('Book a Room', EXT.book)]),
  ];
}

const comingSoon = (eb, title, intro, body, buttons, img) => [
  pageHero(eb, title, intro, img),
  story('Coming soon', body[0], body.slice(1), null, { after: [row(buttons, { gap: 12 })] }),
];

function merchandise(m) {
  return comingSoon('Merchandise', 'Take a little Bayfield home.', 'Sweatshirts, hats, water bottles and more from the Bayfield Inn.',
    ['Our online shop is on its way.', 'Until it opens, stop by the front desk or get in touch and we’ll help you find the right size and style.'],
    [darkBtn('Email us', EMAIL), button('Call 715.779.3363', PHONE, 'outline', { upper: false, settings: { button_text_color: C.green, border_color: 'rgba(23,48,27,0.5)', hover_color: C.cream, button_background_hover_color: C.green } })],
    m.file('bayfield-inn-exterior.jpg'));
}

function giftCards(m) {
  return [
    pageHero('Gift cards', 'Give the best darn view on Lake Superior.', 'A stay, a dinner on The Deck or a round at The Lounge, for the lake lover on your list.', m.file('bayfield-dining-cheers.jpg'),
      { buttons: [light('Buy gift cards', GIFT_SHOP)] }),
    story('How it works', 'Good for rooms, dining and drinks', [
      'Gift cards can be used toward a stay at the Inn and at our restaurants. Choose an amount, add a note, and we’ll take care of the rest.',
      'Questions about a gift card? Call us at (715) 779-3363 or email info@thebayfieldinn.com.',
    ], m.file('bayfield-hero-the-deck.jpg'), { after: [darkBtn('Buy gift cards', GIFT_SHOP, { icon: 'fas fa-arrow-right' })], alt: 'The Deck rooftop' }),
  ];
}

function employment(m) {
  const field = (custom_id, field_type, field_label, extra = {}) => ({ _id: id(), custom_id, field_type, field_label, placeholder: '', width: '50', width_tablet: '50', width_mobile: '100', ...extra });
  const form = widget('form', {
    form_name: 'Employment inquiry',
    form_fields: [
      field('name', 'text', 'Name', { required: 'true' }), field('email', 'email', 'Email', { required: 'true' }),
      field('phone', 'tel', 'Phone'), field('position', 'select', 'Interested in', { field_options: 'Front desk\nHousekeeping\nKitchen\nServer / bartender\nMaintenance\nOther' }),
      field('message', 'textarea', 'Tell us about yourself', { width: '100', width_tablet: '100', rows: 5 }),
    ],
    show_labels: 'true', input_size: 'md', button_text: 'Send', button_size: 'md', button_width: '', button_align: 'start',
    submit_actions: ['email', 'save-to-database'], email_to: 'matt@thebayfieldinn.com', email_subject: 'Employment inquiry from the Bayfield Inn website',
    email_reply_to: '[field id="email"]', email_content: '[all-fields]',
    success_message: 'Thanks! We’ll be in touch.',
    column_gap: px(16), row_gap: px(18), label_spacing: px(6),
    label_color: C.green, ...typo('label_typography', SANS, 11, 500, { lh: 1.2, ls: 1.8, transform: 'uppercase' }),
    field_text_color: C.ink, field_background_color: C.white, field_border_color: C.line, field_border_width: box(1), field_border_radius: box(2),
    ...typo('field_typography', SANS, 15, 300, { lh: 1.4 }),
    button_background_color: C.green, button_text_color: C.cream, button_background_hover_color: '#0F2113', button_hover_color: C.cream,
    button_border_radius: box(2), ...typo('button_typography', SANS, 12, 500, { lh: 1.2, ls: 1.2, transform: 'uppercase' }), button_text_padding: box(15, 30, 15, 30),
  });
  return [
    pageHero('Employment', 'Work on the waterfront.', 'We’re always glad to meet people who love hospitality and Lake Superior, for the season or year-round.', m.file('bayfield-inn-exterior.jpg')),
    section({ background_background: 'classic', background_color: C.cream, ...pad, ...boxed, flex_direction: 'column' }, [
      container({ ...gridSettings(['5fr 6fr', 1, 1]), content_width: 'full', padding: box(0), grid_gaps: gap(72, 40), grid_align_items: 'start' }, [
        stack([
          eyebrow('Join the team', C.green),
          heading('Interested in working with us?', 'h2', [44, 38, 30], C.green, { ls: -0.9 }),
          text('<p>Tell us a little about yourself and the kind of work you’re looking for, and we’ll reach out when there’s a fit.</p><p>Prefer to talk? Call (715) 779-3363 or email info@thebayfieldinn.com.</p>', { size: 16, lh: 1.75, settings: { paragraph_spacing: px(16) } }),
        ], { gap: 20 }),
        container({ content_width: 'full', padding: box(36), padding_mobile: box(24), background_background: 'classic', background_color: C.white, border_radius: box(4),
          box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 30, blur: 60, spread: -40, color: 'rgba(23,48,27,0.35)' } }, [form]),
      ]),
    ]),
  ];
}

// Menu: each category is an Elementor Price List (name, price, description) the client can edit.
const MENUS = require('./menus.cjs');
function menuBlock([title, note, items]) {
  const priced = items.some(([, price]) => price);
  return stack([
    widget('heading', { title, header_size: 'h3', title_color: C.green, ...typo('typography', SERIF, [30, 28, 26], 400, { lh: 1.1 }) }),
    ...(note ? [text(note, { size: 13.5, lh: 1.55, style: 'italic', family: SERIF, weight: 400, color: C.muted })] : []),
    widget('price-list', {
      price_list: items.map(([t, price, desc]) => ({ _id: id(), title: t, price: price || '', item_description: desc || '', link: { url: '', is_external: '', nofollow: '' } })),
      heading_color: C.green, price_color: C.green, description_color: C.muted,
      ...typo('heading_typography', SERIF, [19, 19, 18], 400, { lh: 1.25 }), ...typo('price_typography', SERIF, [19, 19, 18], 400, { lh: 1.25 }),
      ...typo('description_typography', SANS, 14, 300, { lh: 1.55 }),
      separator_style: priced ? 'dotted' : 'none', separator_weight: px(1), separator_color: 'rgba(23,48,27,0.3)', separator_spacing: px(8),
      row_gap: px(18), _margin: box(4, 0, 0, 0),
    }),
  ], { gap: 10 });
}
function menuSection(m, r) {
  const data = MENUS[r.slug];
  if (!data && r.barBites) {
    return section({ _element_id: 'menus', background_background: 'classic', background_color: C.cream, ...pad, ...boxed, flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(20) }, [
      eyebrow('At the bar', C.green, { align: 'center' }),
      heading(r.barBites.title, 'h2', [44, 38, 30], C.green, { align: 'center', ls: -0.9, maxW: 760 }),
      text(r.barBites.body, { align: 'center', size: 16.5, maxW: 600 }),
    ]);
  }
  if (!data) return null;
  const many = data.menus.length > 1;
  const children = [
    stack([
      eyebrow(many ? 'Menus' : 'Menu', C.green, { align: 'center' }),
      heading(`${r.name} ${many ? 'menus' : 'menu'}`, 'h2', [48, 40, 32], C.green, { align: 'center', ls: -1 }),
      row(data.menus.map((mn) => button(`Download ${many ? mn.title.toLowerCase() + ' ' : ''}menu (PDF)`, m.file(mn.pdf).url, 'outline', { upper: false, size: 13, icon: 'far fa-file-pdf', pad: box(13, 22, 13, 22),
        settings: { icon_align: 'row', button_text_color: C.green, border_color: 'rgba(23,48,27,0.45)', hover_color: C.cream, button_background_hover_color: C.green, link: { url: m.file(mn.pdf).url, is_external: 'on', nofollow: '' } } })),
      { gap: 10, justify: 'center', settings: { padding: box(6, 0, 0, 0) } }),
    ], { gap: 16, align: 'center' }),
  ];
  for (const mn of data.menus) {
    if (many) children.push(stack([widget('divider', { style: 'solid', weight: px(1), color: C.line, look: 'line_text', text: mn.title, text_align: 'center', text_color: C.green,
      ...typo('text_typography', SANS, 12, 500, { ls: 2.6, transform: 'uppercase' }), gap: px(18) })], { gap: 0 }));
    children.push(container({ ...gridSettings([2, 2, 1]), content_width: 'full', padding: box(0), grid_gaps: gap(80, 56), grid_gaps_tablet: gap(40, 48), grid_gaps_mobile: gap(0, 48), grid_align_items: 'start' },
      mn.sections.map(menuBlock)));
  }
  children.push(stack([
    ...(data.footer ? [text(data.footer, { align: 'center', size: 16, family: SERIF, style: 'italic', weight: 400, color: C.green, maxW: 720 })] : []),
    ...data.notes.map((n) => text(n, { align: 'center', size: 12.5, color: C.muted, maxW: 720 })),
  ], { gap: 10, align: 'center' }));
  return section({ _element_id: 'menus', background_background: 'classic', background_color: C.cream, ...pad, ...boxed, flex_direction: 'column', flex_gap: gap(56), flex_gap_mobile: gap(40) }, children);
}

// Restaurant page: hero, about, menus, photos, reserve.
function restaurant(m, r) {
  return [
    pageHero(r.eb, r.title, r.intro, m.file(r.hero), { pos: r.pos, buttons: [light(r.cta || 'Reserve a table', PHONE), button('View menus', '#menus', 'outline', { upper: false, size: 13, pad: box(16, 28, 16, 28) })] }),
    story('About', r.aboutTitle, r.about, r.aboutImg ? m.file(r.aboutImg) : null, { bg: C.white, alt: r.title }),
    ...[menuSection(m, r)].filter(Boolean),
    ...(r.photos?.length ? [section({ background_background: 'classic', background_color: C.white, ...pad, ...boxed, flex_direction: 'column' }, [galleryWidget(r.photos.map(m.file), [3, 3, 1])])] : []),
    ctaBand(r.eb, 'Save your seat by the water.', [light(r.cta || 'Call to reserve', PHONE), outline('Book a Room', EXT.book)]),
  ];
}

const RESTAURANTS = [
  { slug: 'the-deck', name: 'The Deck', eb: 'Seasonal rooftop', title: 'The Deck, Bayfield’s only rooftop.', hero: 'bayfield-deck-dining.jpg', pos: 'center 55%',
    intro: 'Lunch and dinner under the blue umbrellas, with the marina and Madeline Island in front of you. Open in season, weather permitting.',
    aboutTitle: 'Up on the roof', aboutImg: 'bayfield-the-deck-bar.jpg', cta: 'Call The Deck',
    about: ['The Deck is our seasonal rooftop restaurant and bar, the only rooftop in Bayfield.', 'Come for lunch, stay for the sunset. Hours follow the season and the weather; give us a call before you head up.'],
    photos: ['bayfield-hero-the-deck.jpg', 'bayfield-the-deck-bar.jpg', 'bayfield-deck-dining.jpg'] },
  { slug: 'lakeside-dining-room', name: 'Lakeside Dining Room', eb: 'Lakeside Dining Room', title: 'Breakfast and dinner at the water’s edge.', hero: 'bayfield-dining-room-window.jpg',
    intro: 'Window tables looking straight out at the harbor and the gazebo, morning and evening.',
    aboutTitle: 'A table by the water', aboutImg: 'bayfield-lakeside-dining-room.jpg',
    about: ['The Lakeside Dining Room serves breakfast and dinner with a view of the harbor from nearly every seat.', 'Join us for the first coffee of the day or an evening by the window.'],
    photos: ['bayfield-dining-room-window.jpg', 'bayfield-lakeside-dining-room.jpg', 'bayfield-dining-shrimp.jpg'] },
  { slug: 'the-lounge', name: 'The Lounge', eb: 'The Lounge', title: 'Cocktails, a proper old fashioned, and the game.', hero: 'bayfield-the-lounge.jpg',
    intro: 'The Inn’s bar: classic cocktails, local beer and the game on, with the lake just outside.',
    aboutTitle: 'Pull up a stool', aboutImg: 'bayfield-dining-cheers.jpg',
    about: ['The Lounge is where Bayfield meets for a drink, before dinner, after a day on the water, or for the game.', 'Ask the bartender for an old fashioned the way it should be made.'],
    photos: ['bayfield-the-lounge.jpg', 'bayfield-dining-cheers.jpg'] },
  { slug: 'the-creamery', name: 'The Creamery', eb: 'The bar across the street', title: 'Pints, pizza and live music.', hero: 'bayfield-the-creamery.jpg',
    intro: 'Our bar across the street from the Inn. Casual, friendly, and the place to be when the band is playing.',
    aboutTitle: 'Right across the street', aboutImg: null,
    about: ['The Creamery is the Bayfield Inn’s bar across the street: cold pints, good company and live music.', 'Check our Facebook and Instagram for who’s playing this week.'],
    photos: [], barBites: { title: 'A bar first, with a little something to eat.', body: 'No full menu here: just frozen pizzas and Milwaukee soft pretzels to go with your drink.' } },
];

const { SHOP_PAGES } = require('./shop.cjs');

const PAGES = [
  { slug: 'history', title: 'History', build: history },
  { slug: 'gallery', title: 'Gallery', build: gallery },
  { slug: 'webcam', title: 'Webcam', build: webcam },
  { slug: 'merchandise', title: 'Merchandise', build: merchandise },
  { slug: 'gift-cards', title: 'Gift Cards', build: giftCards },
  { slug: 'employment', title: 'Employment', build: employment },
  ...RESTAURANTS.map((r) => ({ slug: r.slug, title: r.name, build: (m) => restaurant(m, r) })),
  ...SHOP_PAGES,
];

module.exports = { PAGES };
