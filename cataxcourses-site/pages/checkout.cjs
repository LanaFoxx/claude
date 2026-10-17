// Checkout (/checkout/, page 23) – Claude Design "Store & Account Pages" export, Checkout.dc.html.
// The real WooCommerce checkout ([woocommerce_checkout]) with its real fields and Stripe gateways, restyled:
// step cards on the left (student info, shipping, payment), order summary + "What happens next" on the right.
// Layout hooks (payment moved under the customer details, headings, info box) live in wp/preview-snippet.php.
const L = require('../lib.cjs');
const { box, gap, container, cls } = L;
const { storeHero, storeBody } = require('./_store.cjs');

module.exports = {
  slug: 'new-checkout', title: 'Checkout (new design preview)', liveId: 23, kind: 'page',
  build: () => [container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...cls('ctc-page') }, [
    storeHero('Checkout', 'Secure enrollment in under two minutes.', 'Checkout'),
    storeBody(['done', 'current', 'todo'], '[woocommerce_checkout]', 'ctc-checkout'),
  ], false)],
};
