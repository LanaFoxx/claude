/**
 * CTC Elementor preview + page-by-page go-live (temporary, remove when Oxygen is switched off).
 * While Oxygen is active it renders every page itself. This bypasses Oxygen and renders Elementor
 * canvas, wrapped in the Elementor header/footer library templates, for:
 *   - PRIVATE pages that use an Elementor page template (previews, admins only),
 *   - pages listed in ctc_live_pages() (switched live one at a time),
 *   - WooCommerce products listed in ctc_product_templates() (product id => Elementor template id;
 *     the product itself is not modified, its design lives in the template),
 * Every other page keeps rendering with Oxygen. ROLLBACK: remove the page / product ID below.
 */
if ( ! defined( 'CTC_HEADER_ID' ) ) define( 'CTC_HEADER_ID', __CTC_HEADER_ID__ );
if ( ! defined( 'CTC_FOOTER_ID' ) ) define( 'CTC_FOOTER_ID', __CTC_FOOTER_ID__ );
function ctc_live_pages() { return array( __CTC_LIVE_PAGES__ ); }
function ctc_product_templates() { return array( __CTC_PRODUCT_TEMPLATES__ ); }

function ctc_product_template_id() {
	if ( ! is_singular( 'product' ) ) return 0;
	$map = ctc_product_templates();
	$id  = get_queried_object_id();
	return isset( $map[ $id ] ) ? (int) $map[ $id ] : 0;
}
function ctc_is_elementor_preview_page() {
	$id = get_queried_object_id();
	if ( ! $id ) return false;
	if ( ctc_product_template_id() ) return true;
	if ( is_singular( 'elementor_library' ) ) return false; // Oxygen is gone: Elementor (and Pro's Theme Builder) preview templates natively
	if ( ! is_singular( 'page' ) && ! is_front_page() ) return false;
	$tpl = get_post_meta( $id, '_wp_page_template', true );
	if ( ! in_array( $tpl, array( 'elementor_canvas', 'elementor_header_footer' ), true ) ) return false;
	if ( 'builder' !== get_post_meta( $id, '_elementor_edit_mode', true ) ) return false;
	if ( in_array( $id, array_map( 'intval', ctc_live_pages() ), true ) ) return true;
	return 'private' === get_post_status( $id ) || ( isset( $_GET['elementor-preview'] ) && current_user_can( 'edit_post', $id ) );
}
add_filter( 'template_include', function ( $template ) {
	if ( ! defined( 'ELEMENTOR_PATH' ) || ! ctc_is_elementor_preview_page() ) return $template;
	return ELEMENTOR_PATH . 'modules/page-templates/templates/canvas.php';
}, 1000 );
function ctc_with_header_footer() {
	if ( ! ctc_is_elementor_preview_page() || is_singular( 'elementor_library' ) ) return false;
	return ctc_product_template_id() || 'elementor_header_footer' === get_post_meta( get_queried_object_id(), '_wp_page_template', true );
}
function ctc_render_template( $tpl ) {
	if ( $tpl && class_exists( '\Elementor\Plugin' ) ) echo \Elementor\Plugin::instance()->frontend->get_builder_content_for_display( $tpl, true );
}
add_action( 'elementor/page_templates/canvas/before_content', function () {
	if ( ! ctc_with_header_footer() ) return;
	ctc_render_template( CTC_HEADER_ID );
	ctc_render_template( ctc_product_template_id() ); // course page design (products only)
} );
add_action( 'elementor/page_templates/canvas/after_content', function () {
	if ( ctc_with_header_footer() ) ctc_render_template( CTC_FOOTER_ID );
} );
// Products: the design replaces the product description output; keep WooCommerce's product schema.
add_filter( 'the_content', function ( $content ) {
	return ( ctc_product_template_id() && in_the_loop() && is_main_query() ) ? '' : $content;
}, 999 );
add_action( 'wp', function () {
	$tpl = ctc_product_template_id();
	if ( ! $tpl || ! function_exists( 'WC' ) || ! WC()->structured_data ) return;
	$product = wc_get_product( get_queried_object_id() );
	if ( $product ) WC()->structured_data->generate_product_data( $product );
} );
// Order links (/checkout/?add-to-cart=ID): don't add a second copy of a package already in the cart.
add_filter( 'woocommerce_add_to_cart_validation', function ( $passed, $product_id, $quantity, $variation_id = 0 ) {
	if ( ! $passed || empty( $_GET['add-to-cart'] ) || ! WC()->cart ) return $passed;
	$want = $variation_id ? (int) $variation_id : (int) $product_id;
	foreach ( WC()->cart->get_cart() as $item ) {
		$have = ! empty( $item['variation_id'] ) ? (int) $item['variation_id'] : (int) $item['product_id'];
		if ( $have === $want ) return false;
	}
	return $passed;
}, 20, 4 );
// Empty cart: "Browse CTEC Courses →" instead of WooCommerce's /shop/ link (the site has no shop page).
add_filter( 'woocommerce_return_to_shop_redirect', function () { return home_url( '/product/ctec-60-hours-course/' ); } );
add_filter( 'woocommerce_return_to_shop_text', function () { return 'Browse CTEC Courses →'; } );
// The site has no Shop page, so WooCommerce hides its empty-cart button: add the design's button instead.
add_action( 'woocommerce_cart_is_empty', function () {
	if ( wc_get_page_id( 'shop' ) > 0 ) return;
	echo '<p class="return-to-shop"><a class="button wc-backward" href="' . esc_url( home_url( '/product/ctec-60-hours-course/' ) ) . '">Browse CTEC Courses →</a></p>';
}, 20 );
/* ---------------------------------------------------------------- store pages (cart / checkout design) */
function ctc_store_preview_slug() {
	$id = get_queried_object_id();
	return ( $id && is_page() ) ? get_post_field( 'post_name', $id ) : '';
}
// Private preview pages render the real cart/checkout shortcodes: let WooCommerce treat them as such.
add_filter( 'woocommerce_is_checkout', function ( $v ) { return $v || 'new-checkout' === ctc_store_preview_slug(); } );
add_filter( 'woocommerce_is_cart', function ( $v ) { return $v || 'new-cart' === ctc_store_preview_slug(); } );
function ctc_checkout_design() {
	if ( ! function_exists( 'is_checkout' ) || ! is_checkout() || is_wc_endpoint_url() ) return false;
	return 'new-checkout' === ctc_store_preview_slug() || in_array( (int) wc_get_page_id( 'checkout' ), array_map( 'intval', ctc_live_pages() ), true );
}
function ctc_cart_design() {
	if ( ! function_exists( 'is_cart' ) || ! is_cart() ) return false;
	return 'new-cart' === ctc_store_preview_slug() || in_array( (int) wc_get_page_id( 'cart' ), array_map( 'intval', ctc_live_pages() ), true );
}
add_action( 'wp', function () {
	if ( ctc_checkout_design() ) {
		// Payment moves from the order-summary column to its own step card under the student details.
		remove_action( 'woocommerce_checkout_order_review', 'woocommerce_checkout_payment', 20 );
		add_action( 'woocommerce_checkout_after_customer_details', function () {
			$step = ( WC()->cart && WC()->cart->needs_shipping() ) ? 3 : 2;
			echo '<div class="ctc-card ctc-pay-card"><span class="ctc-step-eyebrow">Step ' . $step . '</span><h3 class="ctc-card-title">Payment</h3>';
			woocommerce_checkout_payment();
			echo '</div>';
		} );
		add_action( 'woocommerce_after_checkout_billing_form', function () {
			echo '<p class="ctc-note">Your login details will be emailed to this address immediately after payment.</p>';
		} );
		add_action( 'woocommerce_checkout_order_review', function () { // inside #order_review, above the order table
			echo '<span class="ctc-step-eyebrow">Order Summary</span><h3 class="ctc-card-title">Your Order</h3>';
		}, 5 );
		add_action( 'woocommerce_checkout_order_review', function () {
			echo '<div class="ctc-next"><strong>What happens next</strong><ol><li>Login details emailed instantly</li><li>Start your course right away, 24/7</li><li>Hours reported to CTEC instantly</li></ol><a href="' . esc_url( home_url( '/refund-policy/' ) ) . '">30-day money-back guarantee</a></div>';
		}, 30 );
	}
} );
add_filter( 'gettext', function ( $t, $orig, $domain ) {
	if ( 'woocommerce' !== $domain ) return $t;
	if ( in_array( $orig, array( 'Billing details', 'Billing &amp; Shipping' ), true ) && ctc_checkout_design() ) return 'Student Information';
	if ( 'Cart totals' === $orig && ctc_cart_design() ) return 'Your Order';
	return $t;
}, 20, 3 );
/* ---------------------------------------------------------------- thank-you page (Moodle enrollment) */
// The Moodle plugin's thankyou.php page template redeclares getassigntime(), which the plugin itself already declares,
// so it fatals now that Oxygen no longer draws this page. Render the plugin's [moodleauth] shortcode instead (the same
// enrollment code: reads ?order=, creates the Moodle user via AJAX, prints the login into #response_text) inside the
// site header/footer. The page keeps its thankyou.php template so the plugin's order-received redirect still finds it.
function ctc_is_thankyou() {
	return is_page() && 'thankyou.php' === get_page_template_slug( get_queried_object_id() );
}
add_filter( 'template_include', function ( $template ) {
	if ( ! defined( 'ELEMENTOR_PATH' ) || ! ctc_is_thankyou() ) return $template;
	return ELEMENTOR_PATH . 'modules/page-templates/templates/canvas.php';
}, 1001 );
add_action( 'elementor/page_templates/canvas/before_content', function () {
	if ( ! ctc_is_thankyou() ) return;
	ctc_render_template( CTC_HEADER_ID );
	echo '<div class="ctc-page ctc-thankyou">';
	echo '<section class="ctc-ty-hero ctc-dots-dark"><div class="ctc-ty-inner"><span class="ctc-ty-pill">Order Confirmed</span>'
		. '<h1><span class="ctc-thin ctc-block">Your enrollment is complete.</span>Thank You For Your Purchase<span class="ctc-gold">.</span></h1></div></section>';
	echo '<section class="ctc-ty-body"><div class="ctc-ty-inner"><div class="ctc-ty-card">';
	ob_start(); // the shortcode may echo its markup instead of returning it
	$ret  = function_exists( 'moodleauthuser' ) ? do_shortcode( '[moodleauth]' ) : '';
	$html = ob_get_clean() . $ret;
	// The plugin's script writes the Moodle login into #response_text; add the box when the shortcode doesn't print one.
	if ( ! preg_match( '/id=["\']response_text["\']/', $html ) ) $html .= '<div id="response_text"><p>Thank you for enrolling for our course</p></div>';
	echo $html;
	echo '</div><p class="ctc-ty-help">Need help? Call <a href="tel:8882291994"><strong>(888) 229-1994</strong></a> · Mon – Fri, 9am – 4pm PST</p></div></section></div>';
} );
add_action( 'elementor/page_templates/canvas/after_content', function () {
	if ( ctc_is_thankyou() ) ctc_render_template( CTC_FOOTER_ID );
} );
// Order links land on checkout with WooCommerce's "… has been added to your cart. [View cart]" notice: drop it (the
// order summary already shows the item). Other notices (coupon applied, errors) are kept.
// Runs when checkout renders: the order link's add-to-cart request redirects first, so the notice arrives via the session.
add_action( 'template_redirect', function () {
	if ( ! function_exists( 'is_checkout' ) || ! is_checkout() || is_wc_endpoint_url() || ! WC()->session ) return;
	$notices = wc_get_notices();
	if ( empty( $notices['success'] ) ) return;
	$notices['success'] = array_values( array_filter( $notices['success'], function ( $n ) {
		$text = wp_strip_all_tags( is_array( $n ) ? ( $n['notice'] ?? '' ) : (string) $n );
		return ! preg_match( '/added to your cart/i', $text );
	} ) );
	wc_set_notices( $notices );
} );
/* ---------------------------------------------------------------- SMS consent at checkout (10DLC) */
// Checkout collects a phone number, so it carries the SMS opt-in: optional, unchecked, full carrier disclaimer, right
// under the phone + email row. WooCommerce stores the custom billing field on the order as _ctc_sms_consent (1 = opted in).
add_filter( 'woocommerce_checkout_fields', function ( $fields ) {
	$after = max( isset( $fields['billing']['billing_phone']['priority'] ) ? (int) $fields['billing']['billing_phone']['priority'] : 100, isset( $fields['billing']['billing_email']['priority'] ) ? (int) $fields['billing']['billing_email']['priority'] : 110 ); // after phone + email (they share a row)
	$fields['billing']['ctc_sms_consent'] = array(
		'type'     => 'checkbox',
		'required' => false,
		'default'  => 0,
		'priority' => $after + 1,
		'class'    => array( 'form-row-wide', 'ctc-sms-consent' ),
		'label'    => 'Yes, I agree to receive text messages from California Tax Courses at the phone number provided, including replies to my questions, course and enrollment support, and CTEC deadline reminders. Message frequency varies. Message and Data Rates May Apply. Reply STOP to opt out. Reply HELP for more information. Consent is not a condition of purchase. '
			. '<a href="' . esc_url( home_url( '/sms-privacy-policy/' ) ) . '" target="_blank">SMS Privacy Policy</a> · <a href="' . esc_url( home_url( '/sms-terms-and-conditions/' ) ) . '" target="_blank">SMS Terms</a>',
	);
	return $fields;
} );
// Show the choice on the order screen in wp-admin.
add_action( 'woocommerce_admin_order_data_after_billing_address', function ( $order ) {
	$v = $order->get_meta( '_ctc_sms_consent' );
	echo '<p><strong>SMS consent:</strong> ' . ( $v ? 'Yes (opted in at checkout)' : 'No' ) . '</p>';
} );
/* ---------------------------------------------------------------- checkout: card title, quantity + remove in the order summary */
add_filter( 'woocommerce_gateway_title', function ( $title, $id ) {
	return 'stripe' === $id ? 'Credit or Debit Card' : $title;
}, 20, 2 );
// Order summary rows get a − qty + stepper and a Remove link (instead of WooCommerce's plain "× 1").
add_filter( 'woocommerce_checkout_cart_item_quantity', function ( $html, $item, $key ) {
	if ( ! ctc_checkout_design() ) return $html;
	$q   = (int) $item['quantity'];
	$sold_individually = $item['data'] && $item['data']->is_sold_individually();
	$out = '<span class="ctc-qty-row" data-key="' . esc_attr( $key ) . '">';
	if ( ! $sold_individually ) {
		$out .= '<span class="ctc-qty"><button type="button" class="ctc-qty-btn" data-d="-1" aria-label="Decrease quantity">−</button><span class="ctc-qty-n">' . $q . '</span><button type="button" class="ctc-qty-btn" data-d="1" aria-label="Increase quantity">+</button></span>';
	}
	$out .= '<button type="button" class="ctc-remove">Remove</button></span>';
	return $out;
}, 20, 3 );
// wc-ajax endpoint: runs on the front end, where this (front-end scoped) snippet is loaded; admin-ajax would not see it
add_action( 'wc_ajax_ctc_co_qty', 'ctc_co_qty' );
function ctc_co_qty() {
	check_ajax_referer( 'ctc_co_qty', 'nonce' );
	$key = sanitize_text_field( wp_unslash( $_POST['key'] ?? '' ) );
	$qty = max( 0, (int) ( $_POST['qty'] ?? 0 ) );
	if ( ! WC()->cart || ! WC()->cart->get_cart_item( $key ) ) wp_send_json_error();
	if ( $qty < 1 ) WC()->cart->remove_cart_item( $key );
	else WC()->cart->set_quantity( $key, min( $qty, 20 ), true );
	WC()->cart->calculate_totals();
	wp_send_json_success( array( 'empty' => WC()->cart->is_empty(), 'cart_url' => wc_get_cart_url() ) );
}
add_action( 'wp_footer', function () {
	if ( ! function_exists( 'ctc_checkout_design' ) || ! ctc_checkout_design() ) return;
	$ajax = esc_url( WC_AJAX::get_endpoint( 'ctc_co_qty' ) );
	$nonce = wp_create_nonce( 'ctc_co_qty' );
	echo "<script>(function(){function go(key,qty){var b=document.getElementById('order_review');if(b)b.style.opacity='.55';var d=new FormData();d.append('nonce','$nonce');d.append('key',key);d.append('qty',qty);
fetch('$ajax',{method:'POST',body:d,credentials:'same-origin'}).then(function(r){return r.json();}).then(function(j){if(j&&j.success&&j.data.empty){location.href=j.data.cart_url;return;}if(window.jQuery)jQuery(document.body).trigger('update_checkout');}).catch(function(){location.reload();}).finally(function(){if(b)b.style.opacity='';});}
document.addEventListener('click',function(e){var row=e.target.closest('.ctc-qty-row');if(!row)return;var key=row.getAttribute('data-key');if(e.target.closest('.ctc-remove')){e.preventDefault();go(key,0);return;}var btn=e.target.closest('.ctc-qty-btn');if(btn){e.preventDefault();var n=parseInt(row.querySelector('.ctc-qty-n').textContent,10)||1;go(key,Math.max(0,n+parseInt(btn.getAttribute('data-d'),10)));}});})();</script>";
}, 30 );
/* ---------------------------------------------------------------- checkout: optional switch to Annual Auto-Renewal */
// When the one-time 20 Hour online course (9293) or the plan (30511) is in the cart, the order summary offers an
// unchecked opt-in that swaps the one-time course for the plan (and back). Nothing is ever added automatically.
if ( ! defined( 'CTC_AR_ONE_TIME' ) ) define( 'CTC_AR_ONE_TIME', 9293 );
if ( ! defined( 'CTC_AR_PLAN' ) ) define( 'CTC_AR_PLAN', 30511 );
function ctc_ar_cart_key( $product_id ) {
	if ( ! WC()->cart ) return '';
	foreach ( WC()->cart->get_cart() as $k => $it ) {
		if ( (int) $it['product_id'] === $product_id || (int) $it['variation_id'] === $product_id ) return $k;
	}
	return '';
}
add_action( 'woocommerce_review_order_after_cart_contents', function () {
	if ( ! function_exists( 'ctc_checkout_design' ) || ! ctc_checkout_design() ) return;
	$plan = ctc_ar_cart_key( CTC_AR_PLAN ); $one = ctc_ar_cart_key( CTC_AR_ONE_TIME );
	if ( ! $plan && ! $one ) return;
	echo '<tr class="ctc-ar-upsell-row"><td colspan="2"><label class="ctc-ar-upsell"><input type="checkbox" class="ctc-ar-toggle"' . checked( (bool) $plan, true, false ) . '>'
		. '<span><strong>Switch to Annual Auto-Renewal and save $5/year</strong><br>$64.95/year instead of $69.95. We enroll you in each year\'s updated 20 Hour course automatically and email you when it\'s ready. Cancel anytime.</span></label></td></tr>';
} );
add_action( 'wc_ajax_ctc_ar_toggle', function () {
	check_ajax_referer( 'ctc_co_qty', 'nonce' );
	$on = ! empty( $_POST['on'] );
	if ( $on ) {
		if ( $k = ctc_ar_cart_key( CTC_AR_ONE_TIME ) ) WC()->cart->remove_cart_item( $k );
		if ( ! ctc_ar_cart_key( CTC_AR_PLAN ) ) WC()->cart->add_to_cart( CTC_AR_PLAN, 1 );
	} else {
		if ( $k = ctc_ar_cart_key( CTC_AR_PLAN ) ) WC()->cart->remove_cart_item( $k );
		if ( ! ctc_ar_cart_key( CTC_AR_ONE_TIME ) ) {
			$v = wc_get_product( CTC_AR_ONE_TIME );
			WC()->cart->add_to_cart( $v ? $v->get_parent_id() : 0, 1, CTC_AR_ONE_TIME, $v ? $v->get_variation_attributes() : array() );
		}
	}
	WC()->cart->calculate_totals();
	wp_send_json_success();
} );
add_action( 'wp_footer', function () {
	if ( ! function_exists( 'ctc_checkout_design' ) || ! ctc_checkout_design() ) return;
	$url = esc_url( WC_AJAX::get_endpoint( 'ctc_ar_toggle' ) ); $nonce = wp_create_nonce( 'ctc_co_qty' );
	echo "<script>document.addEventListener('change',function(e){var t=e.target;if(!t.classList||!t.classList.contains('ctc-ar-toggle'))return;var b=document.getElementById('order_review');if(b)b.style.opacity='.55';var d=new FormData();d.append('nonce','$nonce');if(t.checked)d.append('on','1');
fetch('$url',{method:'POST',body:d,credentials:'same-origin'}).then(function(){if(window.jQuery)jQuery(document.body).trigger('update_checkout');else location.reload();}).catch(function(){location.reload();}).finally(function(){if(b)b.style.opacity='';});});</script>";
}, 31 );
// Belt and braces for the "added to your cart / View cart" notice: blank its text for every add-to-cart on the site.
add_filter( 'wc_add_to_cart_message_html', '__return_empty_string', 99 );
