// Cart (/cart/, page 22) – Claude Design "Store & Account Pages" export, Cart.dc.html.
// The real WooCommerce cart ([woocommerce_cart]) is restyled into the design's item cards + order summary.
const L = require('../lib.cjs');
const { C, PHONE, box, gap, container, cls, text } = L;
const { storeHero, storeBody } = require('./_store.cjs');

module.exports = {
  slug: 'new-cart', title: 'Cart (new design preview)', liveId: 22, kind: 'page',
  build: () => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
    storeHero('Cart', 'Review your enrollment before checkout.', 'Your Cart'),
    storeBody(['current', 'todo', 'todo'], '[woocommerce_cart]', 'ctc-cart', [
      text(`Questions before enrolling? Call <a href="${PHONE.tel}"><strong>${PHONE.label}</strong></a>`, { align: 'center', color: C.gray, size: [17, 16, 15], lh: 1.5, settings: { _margin: box(28, 0, 0, 0) } }),
    ]),
  ], false)],
};
