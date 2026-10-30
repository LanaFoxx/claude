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
// Closing call to action band: off-white, so it never stacks green on the green footer.
// Buttons passed in are restyled for the light background: first solid green, the rest green outline.
const onLight = (btn, i) => {
  if (i === 0) Object.assign(btn.settings, {
    background_background: 'gradient', background_color: '#1B3A21', background_color_b: C.green, button_text_color: C.cream, hover_color: C.cream,
    button_background_hover_background: 'classic', button_background_hover_color: '#0F2113', border_border: '',
    button_box_shadow_box_shadow: { horizontal: 0, vertical: 10, blur: 24, spread: -14, color: 'rgba(23,48,27,0.6)' },
  });
  else Object.assign(btn.settings, { button_text_color: C.green, border_color: 'rgba(23,48,27,0.45)', button_hover_border_color: C.green, hover_color: C.cream, button_background_hover_color: C.green });
  return btn;
};
const ctaBand = (eb, title, buttons) => section({
  flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(22), background_background: 'classic', background_color: C.cream,
  border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.line,
  padding: box(96, 48, 96, 48), padding_tablet: box(80, 32, 80, 32), padding_mobile: box(64, 20, 64, 20),
}, [
  eyebrow(eb, C.green, { align: 'center' }),
  heading(title, 'h2', [44, 36, 30], C.green, { align: 'center', ls: -0.8, maxW: 760 }),
  row(buttons.map(onLight), { gap: 12, justify: 'center', settings: { padding: box(8, 0, 0, 0) } }),
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
      text('Use the arrows or pick a photo below.', { size: 15, settings: { _margin: box(-24, 0, 0, 0) } }),
      // Photos + captions are managed under Bayfield Inn › Gallery › History archive.
      widget('bi-gallery', { set: 'history', captions: 'yes' }),
      text('<em>With special thanks to the Bayfield Heritage Association for the photos.</em>', { family: SERIF, size: 17, weight: 400, color: C.green, align: 'center' }),
    ]),
  ];
}

// Gallery: sections, sub-sections and photos are managed under Bayfield Inn › Gallery
// (plugin/bayfield-inn-manager). Link to a section with /gallery/#suites, #condos, ...
function gallery() {
  return [
    pageHero('Gallery', 'The Inn, the lake and the season.', 'Pick a section, then a photo. Click the big photo to see it full screen.'),
    section({ background_background: 'classic', background_color: C.cream, padding: box(48, 48, 110, 48), padding_tablet: box(40, 32, 88, 32), padding_mobile: box(28, 16, 64, 16), ...boxed, flex_direction: 'column' }, [
      widget('bi-gallery', { set: 'main' }),
    ]),
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
    // Green bar: live label + headline on the left, "book a room" on the right.
    section({ ...radial('bottom left', C.mid, null, C.deep), padding: box(26, 48, 26, 48), padding_tablet: box(24, 32, 24, 32), padding_mobile: box(22, 16, 22, 16), ...boxed }, [
      row([
        stack([
          eyebrow('Live from the Inn', C.cream, { opacity: 0.85, live: true }),
          heading('The view is even better from your room.', 'h1', [34, 30, 26], C.cream, { lh: 1.05, ls: -0.6 }),
        ], { gap: 10, settings: { width: auto, width_tablet: auto, width_mobile: px(100, '%') } }),
        light('Book a Room', EXT.book),
      ], { gap: 20, align: 'center', justify: 'space-between' }),
    ]),
    // Stream, centered with side margins (room for sponsor spots later).
    section({ background_background: 'classic', background_color: C.cream, padding: box(36, 48, 72, 48), padding_tablet: box(28, 32, 56, 32), padding_mobile: box(16, 12, 40, 12),
      flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(14), _element_id: 'live' }, [
      container({ content_width: 'full', padding: box(0), width: px(76, '%'), width_tablet: px(100, '%'), width_mobile: px(100, '%'),
        custom_css: 'selector { max-width: 1180px; }' }, [stage]),
      text('The marina, the ferry dock and Madeline Island, around the clock. Also on <a href="https://bayfieldlive.com" target="_blank" rel="noopener">bayfieldlive.com</a> · Weather from Open-Meteo',
        { color: C.muted, size: 13, align: 'center' }),
    ]),
  ];
}

const comingSoon = (eb, title, intro, body, buttons, img) => [
  pageHero(eb, title, intro, img),
  story('Coming soon', body[0], body.slice(1), null, { after: [row(buttons, { gap: 12 })] }),
];

// Merchandise: items (photos, price, Square payment link) are managed under
// Bayfield Inn › Merchandise. "Buy now" opens Square's secure checkout.
function merchandise(m) {
  return [
    pageHero('Merchandise', 'Take a little Bayfield home.', 'Sweatshirts, hats and more from the Bayfield Inn and The Deck.', m.file('bayfield-inn-exterior.jpg')),
    section({ _element_id: 'shop', background_background: 'classic', background_color: C.cream, ...pad, ...boxed, flex_direction: 'column', flex_gap: gap(40) }, [
      stack([eyebrow('Shop', C.green, { align: 'center' }), heading('Bayfield Inn gear', 'h2', [44, 38, 30], C.green, { align: 'center', ls: -0.9 })], { gap: 14, align: 'center' }),
      widget('bi-shop', { button_text: 'Buy now' }),
    ]),
    ctaBand('Questions?', 'Looking for a size or color you don’t see?', [darkBtn('Email us', EMAIL), outline('Call (715) 779-3363', PHONE)]),
  ];
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
    submit_actions: ['email', 'save-to-database'], email_to: 'info@thebayfieldinn.com', email_subject: 'Employment inquiry from the Bayfield Inn website',
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

// Menus (dishes, prices, PDFs) are managed under Bayfield Inn › Restaurant Menus.
const MENUS = require('./menus.cjs');
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
  return section({ _element_id: 'menus', background_background: 'classic', background_color: C.cream, ...pad, ...boxed, flex_direction: 'column', flex_gap: gap(24) }, [
    stack([
      eyebrow(many ? 'Menus' : 'Menu', C.green, { align: 'center' }),
      heading(`${r.name} ${many ? 'menus' : 'menu'}`, 'h2', [48, 40, 32], C.green, { align: 'center', ls: -1 }),
    ], { gap: 16, align: 'center' }),
    widget('bi-restaurant-menu', { restaurant: r.slug, show_pdf: 'yes' }),
  ]);
}

// Slim "what's on" bar for The Creamery; the client swaps the text for this week's events.
const eventsBar = (r) => section({ _element_id: 'events', ...radial('bottom left', C.mid, null, C.deep), padding: box(28, 24, 28, 24), flex_direction: 'row', flex_wrap: 'wrap',
  flex_justify_content: 'center', flex_align_items: 'center', flex_gap: gap(18, 8) }, [
  widget('heading', { title: 'Events', header_size: 'p', title_color: 'rgba(245,242,236,0.7)', _element_width: 'auto',
    ...typo('typography', SANS, 11, 500, { lh: 1.3, ls: 2.4, transform: 'uppercase' }) }),
  text(r.barBites.events, { color: C.cream, size: 16, family: SERIF, weight: 400, inline: true, align: 'center' }),
]);

// Restaurant page: hero, about, menus, photos.
function restaurant(m, r) {
  return [
    pageHero(r.eb, r.title, r.intro, m.file(r.hero), { pos: r.pos, buttons: r.barBites
      ? [light('What’s on', '#events'), outline('Call (715) 779-3363', PHONE)]
      : [light(MENUS[r.slug]?.menus.length > 1 ? 'View menus' : 'View menu', '#menus'), outline('Call (715) 779-3363', PHONE)] }),
    ...(r.barBites ? [eventsBar(r)] : []),
    story('About', r.aboutTitle, r.about, r.aboutImg ? m.file(r.aboutImg) : null, { bg: C.white, alt: r.title }),
    ...[menuSection(m, r)].filter(Boolean),
    ...(r.photos?.length ? [section({ background_background: 'classic', background_color: C.white, ...pad, ...boxed, flex_direction: 'column' }, [galleryWidget(r.photos.map(m.file), [3, 3, 1])])] : []),
    ctaBand('Stay with us', r.barBites ? 'Your room is right across the street.' : 'Dinner downstairs, a lake view upstairs.', [light('Book a Room', EXT.book), outline('See the gallery', '/gallery/')]),
  ];
}

const RESTAURANTS = [
  { slug: 'the-deck', name: 'The Deck', eb: 'Seasonal rooftop', title: 'The Deck, Bayfield’s only rooftop.', hero: 'bayfield-deck-dining.jpg', pos: 'center 55%',
    intro: 'Lunch and dinner under the blue umbrellas, with the marina and Madeline Island in front of you. Open in season, weather permitting.',
    aboutTitle: 'Up on the roof', aboutImg: 'bayfield-the-deck-bar.jpg',
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
    photos: ['bayfield-the-creamery.jpg'], barBites: { title: 'A bar first, with a little something to eat.', body: 'No full menu here: just frozen pizzas and Milwaukee soft pretzels to go with your drink.',
      events: 'Bingo, trivia, Derby Day and more. Check back here for special events.' } },
];

const { SHOP_PAGES } = require('./shop.cjs');

const PAGES = [
  { slug: 'history', title: 'History', build: history },
  { slug: 'gallery', title: 'Gallery', build: gallery },
  { slug: 'webcam', title: 'Webcam', build: webcam },
  { slug: 'merchandise', title: 'Merchandise', build: merchandise },
  { slug: 'employment', title: 'Employment', build: employment },
  ...RESTAURANTS.map((r) => ({ slug: r.slug, title: r.name, build: (m) => restaurant(m, r) })),
  ...SHOP_PAGES,
];

module.exports = { PAGES };
