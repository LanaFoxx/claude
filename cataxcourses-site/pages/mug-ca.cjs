// Official California Tax Preparer Coffee Mug (WooCommerce variable product 10727, one variation: 11oz = 10728).
const { SITE } = require('../lib.cjs');
module.exports = require('./_mug.cjs').mugPage({
  slug: 'new-mug-ca', title: 'California Tax Preparer Coffee Mug (new design preview)', liveId: 10727,
  name: 'Official California Tax Preparer Coffee Mug', orderUrl: `${SITE}/checkout/?add-to-cart=10727&variation_id=10728&attribute_mug-sizes=11oz`,
  images: [[10738, '2022/07/65216-9.jpg'], [10739, '2022/07/65216-10.jpg'], [10737, '2022/07/65216-8.jpg'], [10736, '2022/07/65216-7.jpg'],
    [10740, '2022/07/65216-11.jpg'], [10741, '2022/07/65216-12.jpg'], [10742, '2022/07/65216-13.jpg']],
});
