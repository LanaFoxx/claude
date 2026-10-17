// Cart (/cart/, page 22) – Claude Design "Cart". Hero from the design; the body is the real WooCommerce cart
// ([woocommerce_cart] renders the cart table or WooCommerce's own empty-cart notice), styled via .ctc-wc-cart CSS.
const L = require('../lib.cjs');
const { C, PHONE, box, gap, container, widget, cls, wcls, band, stack, text } = L;
const { pageHero } = require('./faq.cjs');

module.exports = {
  slug: 'new-cart', title: 'Cart (new design preview)', liveId: 22, kind: 'page',
  build: (m) => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
    pageHero('Cart', 'Review your enrollment before checkout.', 'Course Cart'),
    band(C.white, [
      stack([widget('shortcode', { shortcode: '[woocommerce_cart]', ...wcls('ctc-wc-cart') })]),
      text(`Have Questions Before Enrolling? Call Us Today At <a href="${PHONE.tel}"><strong>${PHONE.label}</strong></a>`,
        { align: 'center', color: C.navy, size: [21, 20, 18], lh: 1.5, settings: { _margin: box(40, 0, 0, 0) } }),
    ]),
  ], false)],
};
