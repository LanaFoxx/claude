// Coffee mug product pages (no separate design): the course pages' cream hero with a photo carousel on one side and
// the product details + Order Now (straight to checkout) on the other, then the school credentials. Text from the live product.
const L = require('../lib.cjs');
const { C, HEAD, URL, PHONE, px, box, gap, typo, container, widget, cls, band, stack, row, grid, heading, text, button, checkList, pill, id } = L;

const SPECS = ['White ceramic', '11 oz (0.33 l)', 'Rounded corners', 'C-Handle', 'Lead and BPA free'];

function mugPage({ slug, title, liveId, name, orderUrl, images }) {
  const gallery = container({
    content_width: 'full', padding: box(14), padding_mobile: box(8), background_background: 'classic', background_color: C.white, border_radius: box(16),
    border_border: 'solid', border_width: box(6, 0, 0, 0), border_color: C.gold, overflow: 'hidden',
    box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 30, blur: 60, spread: -30, color: 'rgba(28,35,51,0.35)' },
  }, [widget('image-carousel', {
    carousel: images.map(([imgId, path]) => ({ id: imgId, url: `${L.SITE}/wp-content/uploads/${path}`, alt: name, source: 'library', _id: id() })),
    thumbnail_size: 'large', slides_to_show: '1', slides_to_show_tablet: '1', slides_to_show_mobile: '1', navigation: 'both', link_to: 'none',
    autoplay: 'yes', autoplay_speed: 4000, infinite: 'yes', image_stretch: 'yes', arrows_color: C.navy, dots_color: C.gold,
  })]);
  const details = stack([
    pill('Coffee Mug'),
    // phones: Order Now above the title so it shows near the top
    button('Order Now →', orderUrl, { align: 'justify', size: [22, 21, 19], pad: box(18, 32, 18, 32), settings: { hide_desktop: 'hidden-desktop', hide_tablet: 'hidden-tablet', _margin: box(18, 0, 0, 0) } }),
    heading(`${name}<span class="ctc-gold">.</span>`, 'h1', [56, 48, 38], C.navy, 'left', { lh: 1.05, settings: { _margin: box(18, 0, 0, 0) } }),
    widget('heading', { title: '<span class="ctc-thin ctc-gold">$</span>30.00', header_size: 'span', title_color: C.navy, ...typo('typography', HEAD, [56, 52, 46], 800, { lh: 1, ls: 0 }), _margin: box(22, 0, 0, 0) }),
    text('For those Tax Professionals that thrive on a delicious cup of coffee to get them through their day, here’s a special cup for you.', { size: [19, 18, 17], settings: { _margin: box(20, 0, 0, 0) } }),
    container({ content_width: 'full', padding: box(0), margin: box(20, 0, 0, 0) }, [checkList(SPECS)]),
    // Photo-for-a-coupon offer (codes are sent by hand from help@).
    row([
      widget('icon', { selected_icon: { value: 'fas fa-camera', library: 'fa-solid' }, view: 'stacked', shape: 'circle', primary_color: C.gold, secondary_color: C.white, size: px(18), icon_padding: px(12), _flex_size: 'none' }),
      text(`Submit a picture of you with the official California Tax Courses mug to <a href="mailto:help@cataxcourses.com">help@cataxcourses.com</a> and receive a <strong>free course coupon</strong>.`, { size: [17, 17, 16], lh: 1.5, color: C.navy, linkColor: C.goldText, linkHover: C.goldDeep }),
    ], { gap: 14, settings: { flex_wrap: 'nowrap', margin: box(24, 0, 0, 0), padding: box(14, 18, 14, 14), background_background: 'classic', background_color: C.white, border_radius: box(12), border_border: 'solid', border_width: box(1), border_color: C.line } }),
    row([
      button('Order Now →', orderUrl, { size: [22, 21, 19], pad: box(18, 32, 18, 32) }),
      widget('heading', { title: `Questions? ${PHONE.label}`, header_size: 'span', link: L.link(PHONE.tel), title_color: C.navy, ...typo('typography', HEAD, [20, 20, 18], 700, { lh: 1.3, ls: 0 }), _css_classes: 'ctc-navlink' }),
    ], { gap: 16, settings: { margin: box(30, 0, 0, 0) } }),
  ]);
  return {
    slug, title, liveId, kind: 'product',
    build: () => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
      band(C.cream, [grid([gallery, details], { cols: [2, 2, 1], gap: 64, gapT: 40, gapM: 36, align: 'center' })], { pad: [88, 96], cls: 'ctc-dots-cream' }),
      band(C.white, [stack([
        heading('<span class="ctc-thin">Looking for your</span> CTEC course?', 'h2', [44, 38, 32], C.navy, 'center', { lh: 1.1 }),
        row([
          button('CTEC 60 Hour Course →', URL.c60, { size: [20, 20, 18], pad: box(14, 24, 14, 24) }),
          button('CTEC 20 Hour Course →', URL.c20, { variant: 'navy', size: [20, 20, 18], pad: box(14, 24, 14, 24) }),
        ], { gap: 16, justify: 'center', settings: { margin: box(28, 0, 0, 0) } }),
      ], { align: 'center' })], { pad: [80, 88], align: 'center' }),
    ], false)],
  };
}

module.exports = { mugPage };
