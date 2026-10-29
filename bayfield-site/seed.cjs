// Starter content for the Bayfield Inn Manager dashboard (menus + galleries). Loaded once by
// `node deploy.cjs data`; after that the client edits everything in wp-admin › Bayfield Inn.
const MENUS = require('./menus.cjs');
const { EXT, PAGE } = require('./build.cjs');

const NAMES = { 'the-deck': 'The Deck', 'lakeside-dining-room': 'Lakeside Dining Room', 'the-lounge': 'The Lounge' };

// Sections priced "10 each" get that price on every item that doesn't have its own.
function items(note, list) {
  const each = (/(\d+)\s*each/.exec(note || '') || [])[1];
  return list.map(([name, price, desc]) => ({ name, price: price || each || '', desc: desc || '' }));
}

function menus(md) {
  return {
    restaurants: Object.entries(MENUS).map(([slug, r]) => ({
      slug, name: NAMES[slug],
      menus: r.menus.map((mn) => ({
        title: mn.title, pdf: mn.pdf ? md(mn.pdf).url : '',
        sections: mn.sections.map(([title, note, list]) => ({ title, note: /^\d+ each$/.test(note) ? '' : note, items: items(note, list) })),
      })),
      footer: r.footer || '', notes: (r.notes || []).join('\n'),
    })),
  };
}

const BOTL = ['bayfield-condos-cover.jpg', 'bayfield-condo-botl-unit-100-img-7635.jpg', 'bayfield-condo-botl-unit-301-img-7677.jpg', 'bayfield-condo-botl-unit-102-img-7622.jpg',
  'bayfield-condo-botl-unit-100-img-7638.jpg', 'bayfield-condo-botl-unit-202-img-7610.jpg', 'bayfield-condo-botl-unit-101-img-7655.jpg', 'bayfield-condo-botl-unit-100-img-7645.jpg',
  'bayfield-condo-botl-unit-301-img-7676.jpg', 'bayfield-condo-botl-unit-102-img-7629.jpg', 'bayfield-condo-botl-unit-101-img-7660.jpg', 'bayfield-condo-botl-unit-202-img-7602.jpg',
  'bayfield-condo-botl-unit-301-img-7688.jpg', 'bayfield-condo-botl-unit-102-img-7621.jpg', 'bayfield-condo-botl-unit-101-img-7666.jpg', 'bayfield-condo-botl-unit-100-img-7641.jpg'];
const IWH = ['bayfield-condo-iwh-house-img-3809.jpg', 'bayfield-condo-iwh-house-exterior-1.jpg', 'bayfield-condo-iwh-emerald-img-8198.jpg', 'bayfield-condo-iwh-qe-ii-img-3794.jpg',
  'bayfield-condo-iwh-phoenix-img-0211-2.jpg', 'bayfield-condo-iwh-blue-img-1180.jpg', 'bayfield-condo-iwh-common-area-img-8205.jpg', 'bayfield-condo-iwh-crows-nest-img-5968.jpg',
  'bayfield-condo-iwh-qe-ii-img-3476.jpg', 'bayfield-condo-iwh-emerald-img-8193.jpg', 'bayfield-condo-iwh-blue-img-0174.jpg', 'bayfield-condo-iwh-qe-ii-img-3807.jpg',
  'bayfield-condo-iwh-common-area-img-1184.jpg', 'bayfield-condo-iwh-phoenix-img-8225.jpg', 'bayfield-condo-iwh-house-img-3629.jpg'];
const site = (p) => p; // relative links work on staging and live

// [title, id, photos or sub-sections, [button label, link]]
const GALLERY = [
  ['Rooms', 'rooms', [
    ['Suites', 'suites', ['bayfield-suite-jacuzzi.jpg', 'bayfield-suite.jpg'], ['Book your suite', EXT.book]],
    ['Lake View Rooms', 'lake-view', ['bayfield-lake-view-room.jpg', 'bayfield-lakeview-room.jpg'], ['Book a lake view room', EXT.book]],
    ['City View Rooms', 'city-view', ['bayfield-standard-room.jpg'], ['Book a city view room', EXT.book]],
  ]],
  ['Condos', 'condos', [
    ['Bayfield on the Lake', 'bayfield-on-the-lake', BOTL, ['Book Bayfield on the Lake', EXT.book]],
    ['Isaac Wing House', 'isaac-wing-house', IWH, ['Book the Isaac Wing House', EXT.book]],
  ]],
  ['Dining', 'dining', [
    ['The Deck', 'deck', ['bayfield-hero-the-deck.jpg', 'bayfield-the-deck-bar.jpg', 'bayfield-deck-dining.jpg'], ['See The Deck', site(PAGE.deck)]],
    ['The Lounge', 'lounge', ['bayfield-the-lounge.jpg', 'bayfield-dining-cheers.jpg'], ['See The Lounge', site(PAGE.lounge)]],
    ['Lakeside Dining Room', 'lakeside', ['bayfield-dining-room-window.jpg', 'bayfield-lakeside-dining-room.jpg', 'bayfield-dining-shrimp.jpg'], ['See the Lakeside Dining Room', site(PAGE.lakeside)]],
  ]],
  ['The Creamery', 'creamery', ['bayfield-the-creamery.jpg'], ['See The Creamery', site(PAGE.creamery)]],
  ['The View & Vibe', 'view-and-vibe', ['bayfield-marina-webcam.jpg', 'bayfield-harbor-sunset.jpg', 'bayfield-inn-exterior.jpg', 'bayfield-condo-botl-unit-100-img-7641.jpg',
    'bayfield-condo-iwh-phoenix-img-8225.jpg', 'bayfield-hero-the-deck.jpg']],
  ['Weddings', 'weddings', ['bayfield-events-lawn.jpg'], ['Plan your event', EXT.events]],
];

const HISTORY = [
  ['01-1890-opera-house', '1890 · The Opera House'], ['02-1890-opera-house', '1890 · The Opera House'],
  ['03-1930s-bracken-hotel', '1930s · The Bracken Hotel'], ['04-hotel-bayfield-late-30s-early-40s', 'Late 1930s · Hotel Bayfield'],
  ['05-1940s-hotel-bayfield', '1940s · Hotel Bayfield'], ['06-hotel-bayfield-early-50s', 'Early 1950s · Hotel Bayfield'],
  ['07-late-50s-early-60s', 'Late 1950s · Rittenhouse Avenue'], ['08-late-50s-early-60s', 'Late 1950s · Bayfield Inn'],
  ['09-1964-fire', '1964 · The fire'], ['10-1964-fire', '1964 · The fire'], ['11-1964-fire', '1964 · The fire'],
  ['12-late-1960s-postcard', 'Late 1960s · Postcard'], ['13-bayfield-inn-1960s', '1960s · The rebuilt Inn'],
];

function galleries(md) {
  const sec = ([title, id, photos, button]) => (Array.isArray(photos[0])
    ? { title, id, subs: photos.map(sec) }
    : { title, id, images: photos.map((f) => md(f).id), ...(button ? { button: { label: button[0], url: button[1] } } : {}) });
  return { main: { sections: GALLERY.map(sec) }, history: { images: HISTORY.map(([f]) => md(`bayfield-history-${f}.jpg`).id) } };
}

// Captions shown on the History slideshow (stored on the Media Library items).
const captions = (md) => HISTORY.map(([f, cap]) => [md(`bayfield-history-${f}.jpg`).id, cap]);

module.exports = { menus, galleries, captions };
