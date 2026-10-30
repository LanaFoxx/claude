// Official Tax Preparer Coffee Mug 11oz (WooCommerce variable product 7112; its only variation 7126 has "any size", so the size is passed).
const { SITE } = require('../lib.cjs');
module.exports = require('./_mug.cjs').mugPage({
  slug: 'new-mug-11oz', title: 'Tax Preparer Coffee Mug 11oz (new design preview)', liveId: 7112,
  name: 'Official Tax Preparer Coffee Mug 11oz', orderUrl: `${SITE}/checkout/?add-to-cart=7112&variation_id=7126&attribute_mug-sizes=11oz`,
  images: [[9654, '2022/04/65216.jpg'], [9656, '2022/04/65216-2.jpg'], [9657, '2022/04/65216-3.jpg'], [9655, '2022/04/65216-1.jpg'],
    [9658, '2022/04/65216-4.jpg'], [9659, '2022/04/65216-5.jpg'], [9660, '2022/04/65216-6.jpg']],
});
