// Book Add-Ons (new page, /book-add-ons/) – Claude Design "Book Add-Ons". Text verbatim from the design.
// Centered cream hero, dark band with two book cards (Order Now → straight to checkout), IMPORTANT note.
const L = require('../lib.cjs');
const { C, HEAD, BODY, URL, px, box, gap, auto, typo, container, widget, cls, band, stack, row, grid, eyebrow, heading, text, button, image, pill } = L;

const BOOKS = [
  { num: '20', sub: 'CTEC Continuing Education<br>Updated with the Latest Tax Laws', img: 'ctc-book-20-hour.jpg', alt: 'CTEC 20 Hour Course Book', price: '80.00', save: 'Save $40 · was $120.00', url: URL.order(14174) },
  { num: '60', sub: 'CTEC Qualifying Education<br>Updated with the Latest Tax Laws', img: 'ctc-book-60-hour.jpg', alt: 'CTEC 60 Hour Course Book', price: '100.00', save: 'Save $50 · was $150.00', url: URL.order(21204) },
];

function hero(o = {}) {
  return band(C.cream, [
    pill('Book Add-On', { settings: { _flex_align_self: 'center' } }),
    heading(`<span class="ctc-thin ctc-block" style="font-size:.6em">Study away from the computer.</span>${o.title || 'Physical Course Books'}<span class="ctc-gold">.</span>`, 'h1', [68, 56, 44], C.navy, 'center',
      { lh: 1.05, settings: { _margin: box(18, 0, 0, 0), _element_width: 'initial', _element_custom_width: px(1000), _element_custom_width_tablet: px(100, '%'), _element_custom_width_mobile: px(100, '%') } }),
    text('A physical book shipped to you that includes all of the same content in the online course. Great for taking physical notes, highlighting certain topics, and studying while away from the computer.',
      { align: 'center', size: [20, 20, 18], lh: 1.65, maxW: 760, settings: { _margin: box(24, 0, 0, 0) } }),
  ], { pad: [88, 80], align: 'center', cls: 'ctc-dots-cream' });
}

function bookCard(m, b) {
  return container({
    content_width: 'full', flex_direction: 'column', padding: box(0), flex_gap: gap(0), min_width: px(0),
    background_background: 'classic', background_color: C.white, border_radius: box(16), overflow: 'hidden',
    border_border: 'solid', border_width: box(6, 0, 0, 0), border_color: C.gold,
    box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 30, blur: 60, spread: -30, color: 'rgba(0,0,0,0.6)' },
  }, [
    container({ content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', flex_align_items: 'center', flex_gap: gap(18),
      padding: box(28, 32, 20, 32), padding_mobile: box(24, 24, 18, 24) }, [
      widget('heading', { title: b.num, header_size: 'span', title_color: C.gold, ...typo('typography', HEAD, [64, 64, 52], 800, { lh: 1, ls: 0 }), _element_width: 'auto', _flex_size: 'none' }),
      stack([
        heading('Hour Course <span class="ctc-thin">Book</span>', 'h2', [26, 26, 24], C.navy, 'left', { lh: 1.1, ls: 0 }),
        text(b.sub, { size: 14, lh: 1.4, settings: { _margin: box(4, 0, 0, 0) } }),
      ], { settings: { width: auto, _flex_size: 'grow', min_width: px(0) } }),
    ]),
    image(m.file(b.img), { alt: b.alt, settings: { width: px(100, '%'), width_tablet: px(100, '%'), width_mobile: px(100, '%') } }),
    container({
      content_width: 'full', flex_direction: 'row', flex_wrap: 'wrap', flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(16),
      padding: box(22, 32, 22, 32), padding_mobile: box(20, 24, 20, 24), _flex_size: 'grow',
      background_background: 'classic', background_color: C.sand, border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.line,
    }, [
      stack([
        widget('heading', { title: `<span class="ctc-thin">$</span>${b.price}`, header_size: 'span', title_color: C.navy, ...typo('typography', HEAD, [34, 34, 32], 800, { lh: 1, ls: 0 }) }),
        eyebrow(b.save, C.goldText, 'left', { size: 14, ls: 0.12 }),
      ], { gap: 6, settings: { width: auto, width_mobile: auto } }),
      button('Order Now →', b.url, { size: [19, 19, 18], pad: box(14, 24, 14, 24) }),
    ]),
  ]);
}

function books(m, list = BOOKS) {
  return band(C.navy, [
    grid(list.map((b) => bookCard(m, b)), { cols: list.length > 1 ? [2, 2, 1] : [1, 1, 1], gap: 24, settings: { width: px(list.length > 1 ? 1000 : 488), width_tablet: px(list.length > 1 ? 100 : 60, '%'), width_mobile: px(100, '%') } }),
  ], { align: 'center', cls: 'ctc-dots-dark' });
}

function note() {
  return band(C.white, [
    container({
      content_width: 'full', padding: box(24, 28, 24, 28), padding_mobile: box(20, 20, 20, 20), width: px(900), width_tablet: px(100, '%'), width_mobile: px(100, '%'),
      background_background: 'classic', background_color: C.sand, border_radius: box(12),
      border_border: 'solid', border_width: box(0, 0, 0, 4), border_color: C.gold,
    }, [text(`<strong style="color:${C.goldText}">IMPORTANT:</strong> The Book Add-On is for students who have already purchased the online course. This is the book only and does not include access to the online course or exam.`,
      { color: C.navy, size: [18, 18, 17], lh: 1.6 })]),
  ], { pad: [64, 64], align: 'center' });
}

// Individual book product pages (/product/20-hour-book-addon/, /product/60-hour-book-addon-new/): the same design with one book,
// plus a link to the combined Book Add-Ons page.
function bookProduct(num, liveId) {
  const b = BOOKS.find((x) => x.num === num);
  return {
    slug: `new-book-${num}`, title: `${num} Hour Book Add-On (new design preview)`, liveId, kind: 'product',
    build: (m) => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
      hero({ title: `${num} Hour Course Book` }), books(m, [b]), note(),
      band(C.white, [button('See both course books →', URL.books, { variant: 'navy', align: 'center', size: [20, 20, 18], pad: box(14, 24, 14, 24) })], { pad: [0, 72], align: 'center' }),
    ], false)],
  };
}

module.exports = {
  bookProduct,
  slug: 'book-add-ons', title: 'Book Add-Ons', kind: 'newpage',
  build: (m) => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
    hero(), books(m), note(),
  ], false)],
};
