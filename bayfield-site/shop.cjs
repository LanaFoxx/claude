// Gift card store pages (placeholder content until WooCommerce is installed):
// product page, cart, checkout and order received. Native Elementor widgets only.
// When WooCommerce goes live: point WooCommerce › Settings › Advanced at the cart and
// checkout pages, and swap these placeholder layouts for Elementor Pro's WooCommerce
// widgets (Product template, Cart, Checkout, Purchase Summary) in the same design.
const B = require('./build.cjs');
const { C, SERIF, SANS, EXT, id, px, box, gap, auto, link, fa, typo, container, widget, stack, row, gridSettings, radial,
  eyebrow, heading, text, button, image } = B;

const URL = { info: '/gift-cards/', product: '/gift-card/', cart: '/cart/', checkout: '/checkout/', done: '/order-received/' };
const section = (settings, children) => container({ content_width: 'full', padding: box(0), flex_gap: gap(0), ...settings }, children, false);
const boxed = { content_width: 'boxed', boxed_width: px(1280) };
const pad = (t = 72, b = 110) => ({ padding: box(t, 48, b, 48), padding_tablet: box(Math.round(t * 0.85), 32, Math.round(b * 0.8), 32), padding_mobile: box(Math.round(t * 0.7), 20, Math.round(b * 0.6), 20) });
const darkBtn = (label, url, o = {}) => button(label, url, 'dark', { ...o, settings: { button_background_hover_color: '#0F2113', ...(o.settings || {}) } });
const plainLink = (label, url, o = {}) => button(label, url, 'text', { color: C.green, upper: false, size: 13.5, pad: box(4, 0, 4, 0), ...o,
  settings: { hover_color: '#0F2113', border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: 'rgba(23,48,27,0.35)', border_radius: box(0), ...(o.settings || {}) } });
const panel = (children, o = {}) => container({
  content_width: 'full', flex_direction: 'column', flex_gap: gap(o.gap ?? 18), padding: box(o.pad ?? 32), padding_mobile: box(24),
  background_background: 'classic', background_color: C.white, border_radius: box(4), border_border: 'solid', border_width: box(1), border_color: C.line,
  ...(o.shadow === false ? {} : { box_shadow_box_shadow_type: 'yes', box_shadow_box_shadow: { horizontal: 0, vertical: 30, blur: 60, spread: -44, color: 'rgba(23,48,27,0.35)' } }),
  ...(o.settings || {}),
}, children);
const small = (t, o = {}) => text(t, { size: o.size || 13.5, weight: o.weight || 400, color: o.color || C.muted, lh: 1.5, ...o });
const sub = (t) => widget('heading', { title: t, header_size: 'h3', title_color: C.green, ...typo('typography', SERIF, [26, 24, 22], 400, { lh: 1.1 }) });

// Label / value line for totals.
const line = (label, value, o = {}) => container({
  content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', flex_justify_content: 'space-between', flex_align_items: 'center', flex_gap: gap(16),
  padding: box(o.big ? 16 : 10, 0, o.big ? 4 : 10, 0), ...(o.rule ? { border_border: 'solid', border_width: box(1, 0, 0, 0), border_color: C.line } : {}),
}, [
  small(label, { size: o.big ? 15 : 14, weight: o.big ? 500 : 400, color: o.big ? C.green : C.muted, inline: true }),
  o.big ? widget('heading', { title: value, header_size: 'p', title_color: C.green, ...typo('typography', SERIF, 28, 400, { lh: 1 }), _element_width: 'auto' })
    : small(value, { size: 14, color: C.ink, inline: true }),
]);

// "Store preview" note so nobody expects a real purchase on staging.
const previewNote = () => section({ background_background: 'classic', background_color: '#E9E4D8', padding: box(10, 20, 10, 20), flex_align_items: 'center' }, [
  small('<strong>Store preview.</strong> Online checkout goes live with WooCommerce; no orders are placed or charged on this page yet.', { size: 13, color: C.green, align: 'center' }),
]);

// Cart › Checkout › Confirmation steps.
function steps(active) {
  const step = (n, label, href) => container({
    content_width: 'full', width: auto, width_tablet: auto, width_mobile: auto, flex_direction: 'row', flex_align_items: 'center', flex_gap: gap(10), padding: box(0),
    ...(href && n < active ? { html_tag: 'a', link: link(href) } : {}),
  }, [
    widget('heading', {
      title: n < active ? '✓' : String(n), header_size: 'span', align: 'center', title_color: n <= active ? C.cream : C.green,
      ...typo('typography', SANS, 12, 500, { lh: 1 }), _element_width: 'initial', _element_custom_width: px(28),
      _background_background: 'classic', _background_color: n <= active ? C.green : 'rgba(23,48,27,0.08)', _border_radius: box(50, 50, 50, 50, '%'),
      _padding: box(8, 0, 8, 0),
    }),
    small(label, { size: 13, weight: n === active ? 500 : 400, color: n === active ? C.green : C.muted, inline: true, ls: 0.3, settings: n === active ? {} : { hide_mobile: 'hidden-mobile' } }),
  ]);
  const rule = () => widget('divider', { style: 'solid', weight: px(1), color: C.line, width: px(48), width_mobile: px(16), gap: px(0), _element_width: 'auto' });
  return row([step(1, 'Cart', URL.cart), rule(), step(2, 'Checkout', URL.checkout), rule(), step(3, 'Confirmation')], { gap: 12, justify: 'center', settings: {
    custom_css: 'selector > .e-con, selector > .elementor-widget { flex: 0 0 auto; width: auto; }' } });
}

// Page title band used by cart / checkout.
const titleBand = (title, active) => section({
  background_background: 'classic', background_color: C.cream, flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(22),
  padding: box(64, 20, 8, 20), padding_mobile: box(44, 20, 4, 20),
}, [steps(active), heading(title, 'h1', [52, 44, 36], C.green, { align: 'center', ls: -1 })]);

/* --------------------------------------------------------- product page */
function product(m) {
  const opt = (pairs) => pairs.map(([l, v]) => `${l}|${v}`).join('\n');
  const f = (custom_id, field_type, field_label, extra = {}) => ({ _id: id(), custom_id, field_type, field_label, width: '100', width_tablet: '100', width_mobile: '100', ...extra });
  const form = widget('form', {
    form_name: 'Gift card (placeholder)',
    form_fields: [
      f('amount', 'radio', 'Amount', { field_options: opt([['$25', '25'], ['$50', '50'], ['$100', '100'], ['$250', '250'], ['$500', '500']]), field_value: '100', inline_list: 'elementor-subgroup-inline' }),
      f('custom_amount', 'number', 'Or choose an amount', { placeholder: '$', field_min: '10', field_max: '1000', width: '50', width_tablet: '50', width_mobile: '50' }),
      f('quantity', 'number', 'Quantity', { field_value: '1', field_min: '1', field_max: '20', width: '50', width_tablet: '50', width_mobile: '50' }),
      f('delivery', 'radio', 'Delivery', { field_options: opt([['Email it', 'email'], ['Mail a card', 'mail']]), field_value: 'email', inline_list: 'elementor-subgroup-inline' }),
      f('recipient_name', 'text', 'Recipient’s name', { width: '50', width_tablet: '50' }),
      f('recipient_email', 'email', 'Recipient’s email', { width: '50', width_tablet: '50' }),
      f('from_name', 'text', 'From', { width: '50', width_tablet: '50' }),
      f('send_on', 'date', 'Send on', { use_native_date: 'yes', width: '50', width_tablet: '50' }),
      f('message', 'textarea', 'Personal message (optional)', { rows: 3 }),
    ],
    show_labels: 'true', input_size: 'md', button_text: 'Add to cart', button_size: 'md', button_width: '100',
    selected_button_icon: fa('fas fa-arrow-right'), button_icon_align: 'row-reverse', button_icon_indent: px(10),
    submit_actions: ['redirect'], redirect_to: m.site + URL.cart, // Elementor needs an absolute URL here
    column_gap: px(14), row_gap: px(18), label_spacing: px(8),
    label_color: C.green, ...typo('label_typography', SANS, 11, 500, { lh: 1.2, ls: 1.8, transform: 'uppercase' }),
    field_text_color: C.ink, field_background_color: C.white, field_border_color: C.line, field_border_width: box(1), field_border_radius: box(2),
    ...typo('field_typography', SANS, 15, 300, { lh: 1.4 }),
    button_background_color: C.green, button_text_color: C.cream, button_background_hover_color: '#0F2113', button_hover_color: C.cream,
    button_border_radius: box(2), ...typo('button_typography', SANS, 13, 500, { lh: 1.2, ls: 1.2, transform: 'uppercase' }), button_text_padding: box(18, 30, 18, 30),
    custom_css: `/* Amount + delivery choices as pill buttons. */
selector .elementor-field-type-radio .elementor-field-subgroup { display: flex; flex-wrap: wrap; gap: 8px; }
selector .elementor-field-type-radio .elementor-field-option { margin: 0 !important; position: relative; }
selector .elementor-field-type-radio input { position: absolute; opacity: 0; pointer-events: none; }
selector .elementor-field-type-radio .elementor-field-option label { display: inline-block; margin: 0 !important; padding: 11px 20px; border: 1px solid #DCD7CC; border-radius: 2px; background: #fff; color: #17301B; font-size: 15px; font-weight: 400; letter-spacing: 0; text-transform: none; cursor: pointer; transition: background .2s, color .2s, border-color .2s; }
selector .elementor-field-type-radio .elementor-field-option label:hover { border-color: #17301B; }
selector .elementor-field-type-radio input:checked + label { background: #17301B; border-color: #17301B; color: #F5F2EC; }
selector .elementor-field-type-radio input:focus-visible + label { outline: 2px solid #17301B; outline-offset: 2px; }
selector .elementor-field-group > .elementor-field-label { width: 100%; }`,
  });
  const col = (title, html) => stack([sub(title), small(html, { size: 15, lh: 1.7, settings: { paragraph_spacing: px(12) } })], { gap: 14 });
  return [
    previewNote(),
    section({ background_background: 'classic', background_color: C.cream, ...pad(40, 110), ...boxed, flex_direction: 'column', flex_gap: gap(28) }, [
      small(`<a href="/">Home</a>  /  <a href="${URL.info}">Gift Cards</a>  /  Bayfield Inn Gift Card`, { size: 13, linkColor: C.green, settings: { link_hover_color: '#0F2113' } }),
      container({ ...gridSettings(['7fr 6fr', 1, 1]), content_width: 'full', padding: box(0), grid_gaps: gap(72, 40), grid_gaps_tablet: gap(40, 40), grid_align_items: 'start' }, [
        container({ content_width: 'full', padding: box(48), padding_mobile: box(16), border_radius: box(4), ...radial('top left', '#FFFFFF', null, '#ECE7DC'),
          custom_css: '@media (min-width: 1025px) { selector { position: sticky; top: 140px; } }' }, [
          image(m.file('bayfield-gift-card.png'), { settings: { alt_text: 'Bayfield Inn gift card' } }),
        ]),
        stack([
          eyebrow('Gift card', C.green),
          heading('Bayfield Inn Gift Card', 'h1', [48, 42, 34], C.green, { ls: -1 }),
          widget('heading', { title: '$25 – $500', header_size: 'p', title_color: C.green, ...typo('typography', SERIF, [28, 26, 24], 400, { lh: 1 }) }),
          small('Give the best darn view on Lake Superior. Good toward a stay at the Inn, dinner in the Lakeside Dining Room, lunch on The Deck or a round at The Lounge.', { size: 16, lh: 1.7 }),
          widget('divider', { style: 'solid', weight: px(1), color: C.line, gap: px(4) }),
          form,
          widget('icon-list', {
            view: 'traditional',
            icon_list: [['far fa-envelope', 'Sent by email, or mailed as a printed card'], ['fas fa-bed', 'Redeem for stays, dining and drinks'], ['fas fa-phone-alt', 'Questions? Call (715) 779-3363']]
              .map(([icon, t]) => ({ _id: id(), text: t, selected_icon: fa(icon) })),
            space_between: px(10), icon_size: px(13), icon_color: C.green, text_color: C.muted, text_indent: px(12),
            ...typo('icon_typography', SANS, 14, 400, { lh: 1.5 }), _margin: box(6, 0, 0, 0),
          }),
        ], { gap: 18 }),
      ]),
    ]),
    section({ background_background: 'classic', background_color: C.white, ...pad(96, 96), ...boxed, flex_direction: 'column' }, [
      container({ ...gridSettings([3, 3, 1]), content_width: 'full', padding: box(0), grid_gaps: gap(56, 40), grid_gaps_tablet: gap(32, 40), grid_align_items: 'start' }, [
        col('Description', '<p>A Bayfield Inn gift card is the easy present for anyone who loves Lake Superior. Choose an amount, add a personal note, and we’ll deliver it by email or mail.</p>'),
        col('How it works', '<p>1. Pick an amount and delivery.<br>2. Check out securely.<br>3. The recipient gets their card with your message.</p>'),
        col('Good to know', '<p>Placeholder: redemption, expiry and refund terms go here once confirmed by the Inn.</p>'),
      ]),
    ]),
  ];
}

/* ------------------------------------------------------------- cart page */
function cart(m) {
  const head = (t, align = 'left') => small(t, { size: 11, weight: 500, color: C.muted, ls: 1.6, align, settings: { typography_text_transform: 'uppercase' } });
  const cartGrid = (children, o = {}) => container({
    ...gridSettings(['minmax(0, 1fr) 110px 90px 110px', 'minmax(0, 1fr) 100px 80px 100px', 'minmax(0, 1fr) auto']), content_width: 'full',
    padding: box(o.head ? 0 : 22, 0, o.head ? 14 : 22, 0), grid_gaps: gap(16, 10), grid_align_items: 'center',
    border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.line, ...(o.head ? { hide_mobile: 'hidden-mobile' } : {}),
  }, children);
  const item = cartGrid([
    container({ content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', flex_align_items: 'center', flex_gap: gap(18), padding: box(0) }, [
      image(m.file('bayfield-gift-card.png'), { width: [120, 110, 88], settings: { _element_width: 'initial', _element_custom_width: px(120), _element_custom_width_mobile: px(88), _flex_size: 'none', link_to: 'custom', link: link(URL.product) } }),
      stack([
        widget('heading', { title: 'Bayfield Inn Gift Card', header_size: 'h3', title_color: C.green, link: link(URL.product), ...typo('typography', SERIF, [22, 22, 20], 400, { lh: 1.1 }) }),
        small('Amount: $100 · Email delivery<br>To: Recipient name', { size: 13 }),
        plainLink('Remove', URL.product, { size: 12.5 }),
      ], { gap: 6 }),
    ]),
    small('$100.00', { size: 15, color: C.ink, align: 'left', settings: { hide_mobile: 'hidden-mobile' } }),
    container({ content_width: 'full', padding: box(0), width: px(64), width_tablet: px(60), width_mobile: px(56), border_border: 'solid', border_width: box(1), border_color: C.line, border_radius: box(2), hide_mobile: 'hidden-mobile' },
      [small('1', { size: 15, color: C.ink, align: 'center', settings: { _padding: box(9, 0, 9, 0) } })]),
    widget('heading', { title: '$100.00', header_size: 'p', title_color: C.green, align: 'right', ...typo('typography', SERIF, 22, 400, { lh: 1 }) }),
  ]);
  const coupon = widget('form', {
    form_name: 'Coupon (placeholder)',
    form_fields: [{ _id: id(), custom_id: 'coupon', field_type: 'text', field_label: 'Coupon code', placeholder: 'Coupon code', width: '70', width_tablet: '70', width_mobile: '60' }],
    show_labels: '', input_size: 'sm', button_text: 'Apply', button_size: 'sm', button_width: '30', button_width_tablet: '30', button_width_mobile: '40',
    submit_actions: [], success_message: 'Coupons will work once the store is live.', column_gap: px(8), row_gap: px(8),
    field_text_color: C.ink, field_background_color: C.white, field_border_color: C.line, field_border_width: box(1), field_border_radius: box(2), ...typo('field_typography', SANS, 14, 300),
    button_background_color: 'rgba(0,0,0,0)', button_text_color: C.green, button_border_border: 'solid', button_border_width: box(1), button_border_color: C.green,
    button_background_hover_color: C.green, button_hover_color: C.cream, button_border_radius: box(2), ...typo('button_typography', SANS, 12, 500, { ls: 1.2, transform: 'uppercase' }),
    _element_width: 'initial', _element_custom_width: px(380), _element_custom_width_mobile: px(100, '%'),
  });
  return [
    previewNote(),
    titleBand('Your cart', 1),
    section({ background_background: 'classic', background_color: C.cream, ...pad(48, 110), ...boxed, flex_direction: 'column' }, [
      container({ ...gridSettings(['8fr 4fr', 1, 1]), content_width: 'full', padding: box(0), grid_gaps: gap(56, 32), grid_align_items: 'start' }, [
        stack([
          cartGrid([head('Product'), head('Price'), head('Qty'), head('Total', 'right')], { head: true }),
          item,
          row([coupon, plainLink('Continue shopping', URL.product)], { gap: 20, justify: 'space-between', settings: { padding: box(8, 0, 0, 0) } }),
        ], { gap: 0 }),
        panel([
          sub('Cart totals'),
          stack([line('Subtotal', '$100.00'), line('Delivery', 'Email · Free', { rule: true }), line('Total', '$100.00', { rule: true, big: true })], { gap: 0 }),
          darkBtn('Proceed to checkout', URL.checkout, { icon: 'fas fa-arrow-right', settings: { align: 'justify', text_padding: box(18, 26, 18, 26) } }),
          small('Secure checkout · Gift cards are delivered by email or mail.', { size: 12.5, align: 'center' }),
        ], { settings: { custom_css: '@media (min-width: 1025px) { selector { position: sticky; top: 140px; } }' } }),
      ]),
    ]),
  ];
}

/* --------------------------------------------------------- checkout page */
function checkout(m) {
  const f = (custom_id, field_type, field_label, width = '100', extra = {}) => ({ _id: id(), custom_id, field_type, field_label, width, width_tablet: width, width_mobile: '100', ...extra });
  const form = widget('form', {
    form_name: 'Checkout (placeholder)',
    form_fields: [
      f('email', 'email', 'Email address', '100', { required: 'true' }),
      f('first_name', 'text', 'First name', '50', { required: 'true' }),
      f('last_name', 'text', 'Last name', '50', { required: 'true' }),
      f('phone', 'tel', 'Phone', '100'),
      f('address', 'text', 'Street address', '100'),
      f('address_2', 'text', 'Apartment, suite, etc. (optional)', '100'),
      f('city', 'text', 'City', '50'),
      f('state', 'text', 'State', '25'),
      f('zip', 'text', 'ZIP', '25'),
      f('country', 'select', 'Country', '100', { field_options: 'United States\nCanada' }),
      f('notes', 'textarea', 'Order notes (optional)', '100', { rows: 3 }),
    ],
    show_labels: 'true', input_size: 'md', button_text: 'Place order', button_size: 'md', button_width: '100',
    selected_button_icon: fa('fas fa-lock'), button_icon_align: 'row', button_icon_indent: px(10),
    submit_actions: ['redirect'], redirect_to: m.site + URL.done,
    column_gap: px(14), row_gap: px(16), label_spacing: px(8),
    label_color: C.green, ...typo('label_typography', SANS, 11, 500, { lh: 1.2, ls: 1.8, transform: 'uppercase' }),
    field_text_color: C.ink, field_background_color: C.white, field_border_color: C.line, field_border_width: box(1), field_border_radius: box(2),
    ...typo('field_typography', SANS, 15, 300, { lh: 1.4 }),
    button_background_color: C.green, button_text_color: C.cream, button_background_hover_color: '#0F2113', button_hover_color: C.cream,
    button_border_radius: box(2), ...typo('button_typography', SANS, 13, 500, { lh: 1.2, ls: 1.2, transform: 'uppercase' }), button_text_padding: box(18, 30, 18, 30),
    custom_css: 'selector .elementor-field-type-submit { margin-top: 10px; }',
  });
  return [
    previewNote(),
    titleBand('Checkout', 2),
    section({ background_background: 'classic', background_color: C.cream, ...pad(48, 110), ...boxed, flex_direction: 'column' }, [
      container({ ...gridSettings(['7fr 5fr', 1, 1]), content_width: 'full', padding: box(0), grid_gaps: gap(56, 32), grid_align_items: 'start' }, [
        panel([sub('Billing details'), small('Returning guest? Log in is available once the store is live.', { size: 13 }), form], { shadow: false }),
        stack([
          panel([
            sub('Your order'),
            container({ content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', flex_align_items: 'center', flex_gap: gap(16), custom_css: 'selector > .e-con { flex: 1 1 0; min-width: 0; }\nselector .elementor-heading-title { overflow-wrap: anywhere; }', padding: box(0, 0, 16, 0), border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.line }, [
              image(m.file('bayfield-gift-card.png'), { width: 84, settings: { _element_width: 'initial', _element_custom_width: px(84), _flex_size: 'none' } }),
              stack([
                widget('heading', { title: 'Bayfield Inn Gift Card × 1', header_size: 'p', title_color: C.green, ...typo('typography', SERIF, 19, 400, { lh: 1.2 }) }),
                small('$100 · Email delivery', { size: 13 }),
              ], { gap: 4, settings: { width: auto, width_tablet: auto, width_mobile: auto, _flex_size: 'grow', custom_css: 'selector { min-width: 0; }' } }),
              small('$100.00', { size: 15, color: C.ink, inline: true, settings: { _flex_size: 'none', hide_mobile: 'hidden-mobile' } }), // total below shows it on phones
            ]),
            stack([line('Subtotal', '$100.00'), line('Delivery', 'Email · Free', { rule: true }), line('Total', '$100.00', { rule: true, big: true })], { gap: 0 }),
          ]),
          panel([
            sub('Payment'),
            widget('icon-list', {
              view: 'traditional', icon_list: [{ _id: id(), text: 'Credit / debit card', selected_icon: fa('far fa-credit-card') }],
              icon_size: px(16), icon_color: C.green, text_color: C.ink, text_indent: px(12), ...typo('icon_typography', SANS, 15, 500, { lh: 1.4 }),
            }),
            small('Card details are entered here securely once WooCommerce payments are connected. Your information is encrypted and never stored on this site.', { size: 13.5, lh: 1.6 }),
          ], { shadow: false, gap: 12, pad: 28 }),
        ], { gap: 20, settings: { custom_css: '@media (min-width: 1025px) { selector { position: sticky; top: 140px; } }' } }),
      ]),
    ]),
  ];
}

/* --------------------------------------------------- order received page */
function orderReceived(m) {
  const stepCard = (n, t, body) => stack([
    widget('heading', { title: n, header_size: 'span', title_color: C.green, ...typo('typography', SERIF, 40, 300, { lh: 1 }) }),
    widget('heading', { title: t, header_size: 'h3', title_color: C.green, ...typo('typography', SERIF, 22, 400, { lh: 1.15 }) }),
    small(body, { size: 14.5, lh: 1.6 }),
  ], { gap: 10 });
  return [
    previewNote(),
    section({ background_background: 'classic', background_color: C.cream, flex_direction: 'column', flex_align_items: 'center', flex_gap: gap(20), ...pad(64, 72) }, [
      steps(3),
      widget('icon', { selected_icon: fa('fas fa-check'), view: 'stacked', shape: 'circle', primary_color: C.green, secondary_color: C.cream, size: px(26), icon_padding: px(24), _margin: box(16, 0, 0, 0) }),
      eyebrow('Order received', C.green, { align: 'center' }),
      heading('Thank you! Your gift card is on its way.', 'h1', [52, 44, 34], C.green, { align: 'center', ls: -1, maxW: 760 }),
      small('We’ve emailed your receipt. The gift card will be delivered to the recipient on the date you chose.', { size: 16, lh: 1.7, align: 'center', maxW: 560 }),
    ]),
    section({ background_background: 'classic', background_color: C.cream, ...pad(0, 96), content_width: 'boxed', boxed_width: px(880), flex_direction: 'column' }, [
      panel([
        container({ ...gridSettings([4, 2, 2]), content_width: 'full', padding: box(0, 0, 22, 0), grid_gaps: gap(20, 20), border_border: 'solid', border_width: box(0, 0, 1, 0), border_color: C.line }, [
          ['Order number', '#0000'], ['Date', 'Placeholder'], ['Email', 'you@example.com'], ['Payment', 'Card'],
        ].map(([l, v]) => stack([small(l, { size: 11, weight: 500, ls: 1.6, settings: { typography_text_transform: 'uppercase' } }), small(v, { size: 15, color: C.ink })], { gap: 6 }))),
        container({ content_width: 'full', flex_direction: 'row', flex_wrap: 'nowrap', flex_align_items: 'center', flex_gap: gap(16), custom_css: 'selector > .e-con { flex: 1 1 0; min-width: 0; }\nselector .elementor-heading-title { overflow-wrap: anywhere; }', padding: box(0) }, [
          image(m.file('bayfield-gift-card.png'), { width: 96, settings: { _element_width: 'initial', _element_custom_width: px(96), _flex_size: 'none' } }),
          stack([
            widget('heading', { title: 'Bayfield Inn Gift Card × 1', header_size: 'p', title_color: C.green, ...typo('typography', SERIF, 20, 400, { lh: 1.2 }) }),
            small('$100 · Email delivery · To: Recipient name', { size: 13 }),
          ], { gap: 4, settings: { width: auto, width_tablet: auto, width_mobile: auto, _flex_size: 'grow', custom_css: 'selector { min-width: 0; }' } }),
          small('$100.00', { size: 15, color: C.ink, inline: true, settings: { _flex_size: 'none', hide_mobile: 'hidden-mobile' } }), // total below shows it on phones
        ]),
        stack([line('Subtotal', '$100.00', { rule: true }), line('Total', '$100.00', { rule: true, big: true })], { gap: 0 }),
      ]),
    ]),
    section({ background_background: 'classic', background_color: C.white, ...pad(96, 96), ...boxed, flex_direction: 'column', flex_gap: gap(44) }, [
      heading('What happens next', 'h2', [40, 34, 28], C.green, { ls: -0.8 }),
      container({ ...gridSettings([3, 3, 1]), content_width: 'full', padding: box(0), grid_gaps: gap(48, 32), grid_align_items: 'start' }, [
        stepCard('01', 'Receipt', 'Your receipt is in your inbox now.'),
        stepCard('02', 'Delivery', 'The recipient gets their gift card by email, or in the mail.'),
        stepCard('03', 'Redeem', 'They use it toward a stay, dinner or drinks at the Inn.'),
      ]),
      row([darkBtn('Back to home', '/', { icon: 'fas fa-arrow-right' }), plainLink('Buy another gift card', URL.product)], { gap: 24 }),
    ]),
  ];
}

const SHOP_PAGES = [
  { slug: 'gift-card', title: 'Bayfield Inn Gift Card', build: product },
  { slug: 'cart', title: 'Cart', build: cart },
  { slug: 'checkout', title: 'Checkout', build: checkout },
  { slug: 'order-received', title: 'Order Received', build: orderReceived },
];

module.exports = { SHOP_PAGES, URL };
