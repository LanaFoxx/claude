<?php
/**
 * WooCommerce: one product (Server Hosting, $500 a year, renewing automatically), sold through a
 * checkout that only asks for name, email and phone, styled like the onboarding page.
 *
 * - /checkout/?dwd-order=hosting empties the cart, adds the hosting plan and lands on checkout,
 *   so a second click never hits "You cannot add another ... to your cart".
 * - Shop and product pages send people to /hosting/; the cart goes straight to checkout.
 * - A cart icon shows in the header only while something is in the cart.
 * - Anyone who types their email at checkout but doesn't pay gets two reminders: 1 hour and 1 day later.
 *
 * Loaded on plugins_loaded, only when WooCommerce is active.
 */
defined( 'ABSPATH' ) || exit;

const DWDP_HOSTING_SLUG = 'server-hosting';

function dwdp_hosting_product_id() {
	$p = get_page_by_path( DWDP_HOSTING_SLUG, OBJECT, 'product' );
	return $p ? (int) $p->ID : 0;
}

/** True on the WooCommerce pages this file styles. */
function dwdp_is_woo_page() {
	return function_exists( 'is_checkout' ) && ( is_checkout() || is_account_page() );
}

/* ---------- Ordering ---------- */

add_action( 'wp_loaded', function () {
	if ( empty( $_GET['dwd-order'] ) || 'hosting' !== $_GET['dwd-order'] || ! WC()->cart ) { // phpcs:ignore WordPress.Security.NonceVerification
		return;
	}
	$id = dwdp_hosting_product_id();
	wc_clear_notices();
	if ( $id ) {
		WC()->cart->empty_cart();
		WC()->cart->add_to_cart( $id, 1 );
	}
	nocache_headers();
	wp_safe_redirect( wc_get_checkout_url() );
	exit;
}, 20 );

// Old ?add-to-cart= links: replace the plan already in the cart instead of refusing a second one.
add_filter( 'woocommerce_add_to_cart_validation', function ( $ok, $product_id ) {
	foreach ( WC()->cart->get_cart() as $key => $item ) {
		if ( (int) $item['product_id'] === (int) $product_id ) {
			WC()->cart->remove_cart_item( $key );
		}
	}
	return $ok;
}, 5, 2 );

// Checkout never shows cart chatter: no "added to cart" notices and no "cannot add another" errors.
add_action( 'template_redirect', function () {
	if ( ! is_checkout() || ! WC()->session ) {
		return;
	}
	$all = WC()->session->get( 'wc_notices', array() );
	unset( $all['success'], $all['notice'] );
	if ( ! empty( $all['error'] ) ) {
		$all['error'] = array_values( array_filter( $all['error'], function ( $n ) {
			$t = is_array( $n ) ? $n['notice'] : $n;
			return false === stripos( wp_strip_all_tags( $t ), 'cannot add another' ) && false === stripos( wp_strip_all_tags( $t ), 'added to your cart' );
		} ) );
		if ( ! $all['error'] ) {
			unset( $all['error'] );
		}
	}
	WC()->session->set( 'wc_notices', $all );
}, 1 );

// No "added to cart" notice on top of the checkout.
add_filter( 'wc_add_to_cart_message_html', '__return_empty_string' );

add_action( 'template_redirect', function () {
	if ( is_shop() || is_product() || is_product_taxonomy() ) {
		wp_safe_redirect( home_url( '/hosting/' ), 302 );
		exit;
	}
	if ( is_cart() ) {
		wp_safe_redirect( WC()->cart->is_empty() ? home_url( '/hosting/' ) : wc_get_checkout_url(), 302 );
		exit;
	}
	if ( is_checkout() && ! is_wc_endpoint_url() && WC()->cart->is_empty() ) {
		wp_safe_redirect( home_url( '/hosting/' ), 302 );
		exit;
	}
} );

/* ---------- Checkout fields: name, email, phone ---------- */

add_filter( 'woocommerce_checkout_fields', function ( $fields ) {
	$fields['billing'] = array(
		'billing_first_name' => array(
			'label'        => 'Your full name',
			'placeholder'  => 'Jane Smith',
			'required'     => true,
			'class'        => array( 'form-row-wide' ),
			'autocomplete' => 'name',
			'priority'     => 10,
		),
		'billing_email'      => array(
			'label'        => 'Your email address',
			'placeholder'  => 'you@company.com',
			'required'     => true,
			'type'         => 'email',
			'class'        => array( 'form-row-first' ),
			'validate'     => array( 'email' ),
			'autocomplete' => 'email',
			'priority'     => 20,
		),
		'billing_phone'      => array(
			'label'        => 'Your phone number',
			'placeholder'  => '(555) 555-5555',
			'required'     => true,
			'type'         => 'tel',
			'class'        => array( 'form-row-last' ),
			'validate'     => array( 'phone' ),
			'autocomplete' => 'tel',
			'priority'     => 30,
		),
		'billing_website'    => array(
			'label'        => 'Your website',
			'placeholder'  => 'yourbusiness.com',
			'required'     => true,
			'class'        => array( 'form-row-wide' ),
			'autocomplete' => 'url',
			'priority'     => 40,
		),
	);
	$fields['shipping'] = array();
	unset( $fields['order']['order_comments'] );
	return $fields;
}, 99 );

// "Jane Smith" goes in as first name Jane, last name Smith; the store country fills the address.
add_filter( 'woocommerce_checkout_posted_data', function ( $data ) {
	$name = trim( preg_replace( '/\s+/', ' ', (string) ( $data['billing_first_name'] ?? '' ) ) );
	if ( false !== strpos( $name, ' ' ) ) {
		$data['billing_first_name'] = substr( $name, 0, strrpos( $name, ' ' ) );
		$data['billing_last_name']  = substr( $name, strrpos( $name, ' ' ) + 1 );
	}
	if ( empty( $data['billing_country'] ) ) {
		$data['billing_country'] = WC()->countries->get_base_country();
	}
	return $data;
} );

// The website is saved on the order (as _billing_website) and shown in the admin order and the emails.
add_action( 'woocommerce_checkout_create_order', function ( $order, $data ) {
	if ( ! empty( $data['billing_website'] ) ) {
		$order->update_meta_data( '_billing_website', sanitize_text_field( $data['billing_website'] ) );
	}
}, 10, 2 );
add_action( 'woocommerce_admin_order_data_after_billing_address', function ( $order ) {
	$site = $order->get_meta( '_billing_website' );
	if ( $site ) {
		echo '<p><strong>Website:</strong> ' . esc_html( $site ) . '</p>';
	}
} );
add_filter( 'woocommerce_email_order_meta_fields', function ( $fields, $sent_to_admin, $order ) {
	$site = $order->get_meta( '_billing_website' );
	if ( $site ) {
		$fields['dwdp_website'] = array( 'label' => 'Website', 'value' => $site );
	}
	return $fields;
}, 10, 3 );

add_filter( 'woocommerce_enable_order_notes_field', '__return_false' );
add_filter( 'woocommerce_cart_needs_shipping_address', '__return_false' );
add_filter( 'woocommerce_coupons_enabled', function ( $on ) {
	return is_checkout() ? false : $on;
} );
add_filter( 'woocommerce_checkout_show_terms', '__return_false' );

// Every hosting customer gets an account (made from their email, no password to choose) so they can manage the renewal.
add_filter( 'woocommerce_checkout_registration_required', '__return_true' );
add_filter( 'woocommerce_checkout_registration_enabled', '__return_true' );

add_filter( 'gettext', function ( $text, $original, $domain ) {
	if ( 'woocommerce' === $domain ) {
		if ( 'Billing details' === $original ) {
			return 'Your details';
		}
		if ( 'Your order' === $original ) {
			return 'Your plan';
		}
	}
	return $text;
}, 10, 3 );

add_action( 'wp_enqueue_scripts', function () {
	if ( dwdp_is_woo_page() ) {
		wp_enqueue_style( 'dwdp-fonts' );
	}
}, 20 );

/* ---------- Yearly renewal: said plainly, and agreed to ---------- */

function dwdp_renewal_text() {
	$id    = dwdp_hosting_product_id();
	$price = $id ? wc_get_product( $id )->get_price() : 500;
	return sprintf(
		'You’ll be charged <strong>$%1$s today</strong>, and your plan <strong>renews automatically at $%1$s every year</strong> on the same date until you cancel. Cancel anytime from your account or by calling (772) 210-1728.',
		esc_html( number_format_i18n( (float) $price, 0 ) )
	);
}

add_action( 'woocommerce_review_order_before_payment', function () {
	echo '<div class="dww-renew"><span class="dww-renew-ic" aria-hidden="true">↻</span><div><b>Billed yearly, renews automatically</b><p>' . dwdp_renewal_text() . '</p></div></div>'; // phpcs:ignore WordPress.Security.EscapeOutput
} );

add_action( 'woocommerce_review_order_before_submit', function () {
	echo '<p class="form-row dww-agree validate-required"><label class="woocommerce-form__label woocommerce-form__label-for-checkbox checkbox"><input type="checkbox" class="woocommerce-form__input woocommerce-form__input-checkbox input-checkbox" name="dww_renew_ok" id="dww_renew_ok" value="1"> <span>I understand my hosting renews automatically every year until I cancel.</span>&nbsp;<abbr class="required" title="required">*</abbr></label></p>';
} );

add_action( 'woocommerce_checkout_process', function () {
	if ( empty( $_POST['dww_renew_ok'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
		wc_add_notice( 'Please confirm that your hosting renews automatically every year.', 'error' );
	}
} );

// No Stripe Link at checkout: cards (and the other methods) only.
add_filter( 'wc_stripe_upe_params', function ( $params ) {
	if ( isset( $params['paymentMethodsConfig']['link'] ) ) {
		unset( $params['paymentMethodsConfig']['link'] );
	}
	$params['isLinkEnabled'] = false;
	return $params;
} );

add_filter( 'woocommerce_order_button_text', function () {
	return 'Pay & start hosting';
} );

/* ---------- Page layout: dark hero with the form in a white card (like onboarding) ---------- */

add_filter( 'the_content', function ( $content ) {
	if ( ! dwdp_is_woo_page() || ! in_the_loop() || ! is_main_query() ) {
		return $content;
	}
	if ( is_order_received_page() ) {
		$eyebrow = 'Order confirmed';
		$title   = 'Thank you!';
		$steps   = array( 'Payment received', 'I set up your hosting', 'You get an email when it’s live' );
	} elseif ( is_checkout() ) {
		$eyebrow = 'Secure checkout';
		$title   = 'Order server hosting';
		$steps   = array( 'Enter your details', 'Pay securely with Stripe', 'I set up your hosting' );
	} else {
		$eyebrow = 'Your account';
		$title   = is_user_logged_in() ? 'My account' : 'Log in';
		$steps   = array();
	}
	$pills = '';
	foreach ( $steps as $i => $s ) {
		$pills .= '<span class="dww-pill"><i>' . ( $i + 1 ) . '</i>' . esc_html( $s ) . '</span>';
	}
	return '<div class="dww-hero"><div class="dww-eyebrow">' . esc_html( $eyebrow ) . '</div><h1 class="dww-title">' . esc_html( $title ) . '</h1>'
		. ( $pills ? '<div class="dww-pills">' . $pills . '</div>' : '' ) . '</div><div class="dww-card">' . $content . '</div>';
}, 20 );

add_action( 'wp_head', function () {
	if ( ! dwdp_is_woo_page() ) {
		return;
	}
	$swoosh = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 170 12'%3E%3Cpath d='M3 9 C45 2 125 2 167 7' stroke='%231B7EC3' stroke-width='4.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")";
	$css = '
body.woocommerce-page{background:#12293E}
body.woocommerce-page main#content.site-main{max-width:none;width:100%;margin:0;padding:100px 32px 100px;background-color:#12293E;background-image:radial-gradient(ellipse 700px 380px at 50% 0,rgba(27,126,195,.35),transparent 70%),radial-gradient(rgba(255,255,255,.12) 1px,transparent 1px);background-size:auto,22px 22px}
body.woocommerce-page main#content .page-header{display:none}
.dww-hero{text-align:center;max-width:920px;margin:0 auto 40px}
.dww-eyebrow{display:inline-block;border:1px solid rgba(255,255,255,0.22);border-radius:100px;padding:9px 18px;font:500 15.5px/1.5 Urbanist,sans-serif;color:#C9DAE8;letter-spacing:.02em}
.dww-title{margin:14px 0 0;font:900 52px/1.04 Urbanist,sans-serif;letter-spacing:.01em;text-transform:uppercase;color:#fff}
.dww-title::after{content:"";display:block;width:170px;height:12px;margin:14px auto 0;background:' . $swoosh . ' no-repeat center/contain}
.dww-pills{display:flex;justify-content:center;flex-wrap:wrap;gap:18px;margin-top:30px}
.dww-pill{display:inline-flex;align-items:center;gap:12px;background:#fff;border-radius:10px;padding:16px 20px;font:300 16px Urbanist,sans-serif;color:#0E1526}
.dww-pill i{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#1B7EC3;color:#fff;font:600 14px Urbanist,sans-serif;font-style:normal}
.dww-card{max-width:920px;margin:0 auto;background:#fff;border-radius:14px;padding:48px 52px 40px;box-shadow:0 30px 70px rgba(0,0,0,.25);font:300 16px/1.6 Urbanist,sans-serif;color:#4A5470}
.dww-card h2,.dww-card h3{font:900 24px/1.25 Urbanist,sans-serif;text-transform:uppercase;color:#0E1526;margin:0 0 18px}
.dww-card .woocommerce-billing-fields>h3{display:block}
.dww-card .woocommerce form .form-row,.dww-card form .form-row{padding:0;margin:0 0 20px}
.dww-card form .form-row-first,.dww-card form .form-row-last{width:calc(50% - 10px)}
.dww-card label{display:block;margin-bottom:8px;font:600 15px Urbanist,sans-serif;color:#0E1526}
.dww-card label .required,.dww-card abbr.required{color:#1B7EC3;text-decoration:none;border:0}
.dww-card input.input-text,.dww-card input[type=text],.dww-card input[type=email],.dww-card input[type=tel],.dww-card input[type=password],.dww-card select,.dww-card textarea{width:100%!important;height:52px!important;box-sizing:border-box!important;background:#FAFBFE!important;border:1px solid #CDE0EF!important;border-radius:8px!important;padding:13px 16px!important;font:400 16px Urbanist,sans-serif!important;color:#0E1526!important;box-shadow:none!important;outline:0!important}
.dww-card input.input-text:focus{border-color:#1B7EC3!important;box-shadow:0 0 0 3px rgba(27,126,195,.15)!important}
.dww-card ::placeholder{color:#A9B6CB}
.dww-card .col2-set{width:100%;float:none;display:block}.dww-card .col2-set .col-1,.dww-card .col2-set .col-2{width:100%;float:none}.dww-card .col2-set .col-2:empty,.dww-card .woocommerce-shipping-fields,.dww-card .woocommerce-additional-fields{display:none}
.dww-card .woocommerce-billing-fields__field-wrapper{display:flex;flex-wrap:wrap;justify-content:space-between}
.dww-card .woocommerce-billing-fields__field-wrapper .form-row-wide{width:100%}
.dww-card #order_review_heading{margin-top:12px;padding-top:28px;border-top:1px solid #E4E9F5}
.dww-card table.shop_table{width:100%;border:1px solid #E4E9F5;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden;margin:0 0 24px}
.dww-card table.shop_table th,.dww-card table.shop_table td{padding:16px 18px;border:0;border-top:1px solid #E4E9F5;background:#fff;font:300 15.5px Urbanist,sans-serif;color:#0E1526;text-align:left}
.dww-card table.shop_table thead th{border-top:0;background:#F4F9FE;font:600 13px Urbanist,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#4A5470}
.dww-card table.shop_table td:last-child,.dww-card table.shop_table th:last-child{text-align:right}
.dww-card table.shop_table .order-total th,.dww-card table.shop_table .order-total td{font-weight:700;font-size:17px}
.dww-renew{display:flex;gap:14px;align-items:flex-start;background:#EAF4FC;border:1px solid #CDE0EF;border-radius:10px;padding:18px 20px;margin:0 0 20px}
.dww-renew-ic{flex:none;display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:#1B7EC3;color:#fff;font-size:18px;line-height:1}
.dww-renew b{display:block;font:600 16px Urbanist,sans-serif;color:#0E1526;margin-bottom:4px}
.dww-renew p{margin:0;font:300 15px/1.6 Urbanist,sans-serif;color:#303B58}
.dww-card #payment{background:#F4F9FE;border-radius:10px;padding:0}
.dww-card #payment ul.payment_methods{padding:20px;border-bottom:1px solid #E4E9F5;margin:0}
.dww-card #payment div.payment_box{background:#fff;border-radius:8px}
.dww-card #payment div.payment_box::before{display:none}
.dww-card #payment fieldset{border:0!important;padding:0!important;margin:0!important;min-width:0}.dww-card #payment div.payment_box{padding:0!important;background:transparent!important}
.dww-card #payment .place-order{padding:20px;margin:0}
.dww-agree label{display:flex;gap:10px;align-items:flex-start;font:300 15px/1.5 Urbanist,sans-serif;color:#0E1526;margin:0 0 18px}
.dww-agree input{margin-top:4px;width:18px;height:18px;flex:none}
.dww-card .woocommerce-privacy-policy-text p{font-size:13.5px;color:#7A86A0}
.dww-card button.button,.dww-card a.button,.dww-card #place_order{display:inline-flex;align-items:center;justify-content:center;height:52px;padding:0 32px;border:0;border-radius:8px;background:#1B7EC3;color:#fff;font:300 14px Urbanist,sans-serif;letter-spacing:.16em;text-transform:uppercase;cursor:pointer}
.dww-card #place_order{width:100%}
.dww-card button.button:hover,.dww-card #place_order:hover{background:#166AA6}
.dww-card .woocommerce-error,.dww-card .woocommerce-info,.dww-card .woocommerce-message{list-style:none;margin:0 0 24px;padding:16px 20px 16px 20px;border:0;border-left:4px solid #1B7EC3;border-radius:8px;background:#EAF4FC;color:#0E1526;font:300 15px Urbanist,sans-serif}
.dww-card .woocommerce-error{border-left-color:#D63638;background:#FDEDED}
.dww-card .woocommerce-error::before,.dww-card .woocommerce-info::before,.dww-card .woocommerce-message::before{display:none}
.dww-card .woocommerce-order-overview{display:flex;flex-wrap:wrap;gap:12px;padding:0;margin:0 0 28px;list-style:none}
.dww-card .woocommerce-order-overview li{flex:1 1 160px;background:#F4F9FE;border-radius:10px;padding:14px 16px;border:0;margin:0;font:400 13px Urbanist,sans-serif;text-transform:uppercase;letter-spacing:.08em;color:#4A5470}
.dww-card .woocommerce-order-overview li strong{display:block;margin-top:4px;font:600 16px Urbanist,sans-serif;text-transform:none;letter-spacing:0;color:#0E1526}
.dww-card .woocommerce-MyAccount-navigation ul{list-style:none;padding:0;margin:0 0 24px;display:flex;flex-wrap:wrap;gap:8px}
.dww-card .woocommerce-MyAccount-navigation a{display:block;padding:10px 16px;border-radius:8px;background:#F4F9FE;color:#0E1526;text-decoration:none;font:500 15px Urbanist,sans-serif}
.dww-card .woocommerce-MyAccount-navigation .is-active a{background:#1B7EC3;color:#fff}
.dww-card .woocommerce-MyAccount-navigation,.dww-card .woocommerce-MyAccount-content{float:none;width:100%}
.dww-card a{color:#1B7EC3}
@media(max-width:767px){
body.woocommerce-page main#content.site-main{padding:120px 16px 64px}
.dww-title{font-size:32px}
.dww-pills{flex-direction:column;align-items:center;gap:10px}
.dww-pill{width:100%;max-width:340px;box-sizing:border-box}
.dww-card{padding:28px 20px}
.dww-card form .form-row-first,.dww-card form .form-row-last{width:100%}
}';
	echo '<style id="dwdp-woo">' . preg_replace( '/\s*\n\s*/', '', $css ) . '</style>' . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput
}, 100 );

/* ---------- Header cart icon (only while the cart has something in it) ---------- */

// Pages are cached, so the icon is always printed hidden and shown from WooCommerce's own cart cookie.
add_action( 'wp_footer', function () {
	if ( dwdp_is_woo_page() ) {
		return;
	}
	$svg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/></svg>';
	echo '<a class="dww-cart" href="' . esc_url( wc_get_checkout_url() ) . '" aria-label="Finish your order" hidden>' . $svg . '<span class="dww-cart-dot"></span></a>'; // phpcs:ignore WordPress.Security.EscapeOutput
	echo '<style>.dww-cart{position:relative;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;margin-left:18px;color:#0E1526!important;align-self:center;order:99}.dww-cart[hidden]{display:none}.dww-cart svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.dww-cart:hover{color:#1B7EC3!important}.dww-cart-dot{position:absolute;top:6px;right:5px;width:9px;height:9px;border-radius:50%;background:#1B7EC3;box-shadow:0 0 0 2px #fff}.dw-navwrap{align-items:center}</style>';
	echo "<script>(function(){var c=document.querySelector('.dww-cart');if(!c||!/(^|; )woocommerce_items_in_cart=1/.test(document.cookie))return;var w=document.querySelector('.dw-header .dw-navwrap');if(w){w.appendChild(c);}"
		// The cookie can outlive the cart, so ask the store how many items are really in it before showing the icon.
		. "fetch('" . esc_url_raw( rest_url( 'wc/store/v1/cart' ) ) . "',{credentials:'same-origin'}).then(function(r){return r.json();}).then(function(d){if(d&&d.items_count>0)c.hidden=false;}).catch(function(){});})();</script>\n";
}, 20 );

/* ---------- Unfinished checkout reminders: 1 hour and 1 day later ---------- */

const DWDP_LEADS = 'dwdp_checkout_leads';

function dwdp_leads() {
	$l = get_option( DWDP_LEADS, array() );
	return is_array( $l ) ? $l : array();
}

// The checkout sends the email (with name and phone) as soon as it's typed.
add_action( 'wp_footer', function () {
	if ( ! is_checkout() || is_wc_endpoint_url() ) {
		return;
	}
	$url = esc_url( admin_url( 'admin-ajax.php' ) );
	$n   = wp_create_nonce( 'dwdp_lead' );
	echo "<script>(function(){var last='';function send(){var e=document.getElementById('billing_email');if(!e)return;var v=e.value.trim();if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(v)||v===last)return;last=v;var f=new FormData();f.append('action','dwdp_lead');f.append('_n','" . $n . "');f.append('email',v);"
		. "f.append('name',(document.getElementById('billing_first_name')||{}).value||'');f.append('phone',(document.getElementById('billing_phone')||{}).value||'');navigator.sendBeacon?navigator.sendBeacon('" . $url . "',f):fetch('" . $url . "',{method:'POST',body:f,credentials:'same-origin'});}"
		. "document.addEventListener('change',function(ev){if(ev.target&&/billing_(email|first_name|phone)/.test(ev.target.id))send();});window.addEventListener('pagehide',send);})();</script>\n";
}, 30 );

function dwdp_ajax_lead() {
	check_ajax_referer( 'dwdp_lead', '_n' );
	$email = sanitize_email( wp_unslash( $_POST['email'] ?? '' ) );
	if ( ! is_email( $email ) ) {
		wp_send_json_error();
	}
	$key   = strtolower( $email );
	$leads = dwdp_leads();
	$new   = empty( $leads[ $key ] );
	$leads[ $key ] = array_merge(
		$new ? array( 'time' => time(), 'sent' => array() ) : $leads[ $key ],
		array(
			'email' => $email,
			'name'  => sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) ),
			'phone' => sanitize_text_field( wp_unslash( $_POST['phone'] ?? '' ) ),
		)
	);
	update_option( DWDP_LEADS, $leads, false );
	if ( $new && function_exists( 'as_schedule_single_action' ) ) {
		as_schedule_single_action( time() + HOUR_IN_SECONDS, 'dwdp_checkout_reminder', array( $key, 1 ), 'dwdp' );
		as_schedule_single_action( time() + DAY_IN_SECONDS, 'dwdp_checkout_reminder', array( $key, 2 ), 'dwdp' );
	}
	wp_send_json_success();
}
add_action( 'wp_ajax_dwdp_lead', 'dwdp_ajax_lead' );
add_action( 'wp_ajax_nopriv_dwdp_lead', 'dwdp_ajax_lead' );

// Paid: no more reminders for that email.
function dwdp_lead_done( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( ! $order ) {
		return;
	}
	$leads = dwdp_leads();
	$key   = strtolower( $order->get_billing_email() );
	if ( isset( $leads[ $key ] ) ) {
		unset( $leads[ $key ] );
		update_option( DWDP_LEADS, $leads, false );
	}
}
add_action( 'woocommerce_payment_complete', 'dwdp_lead_done' );
add_action( 'woocommerce_order_status_processing', 'dwdp_lead_done' );
add_action( 'woocommerce_order_status_completed', 'dwdp_lead_done' );

add_action( 'dwdp_checkout_reminder', function ( $key, $n ) {
	$leads = dwdp_leads();
	if ( empty( $leads[ $key ] ) || in_array( (int) $n, $leads[ $key ]['sent'], true ) ) {
		return;
	}
	$lead = $leads[ $key ];
	// Paid in the meantime under the same email (e.g. the payment hook ran before the email was saved).
	$paid = wc_get_orders( array( 'billing_email' => $lead['email'], 'status' => array( 'processing', 'completed' ), 'date_created' => '>' . (int) $lead['time'], 'limit' => 1, 'return' => 'ids' ) );
	if ( $paid ) {
		unset( $leads[ $key ] );
		update_option( DWDP_LEADS, $leads, false );
		return;
	}
	dwdp_send_reminder( $lead, (int) $n );
	$leads[ $key ]['sent'][] = (int) $n;
	if ( 2 === (int) $n ) {
		unset( $leads[ $key ] );
	}
	update_option( DWDP_LEADS, $leads, false );
}, 10, 2 );

function dwdp_send_reminder( $lead, $n ) {
	$first = trim( strtok( (string) $lead['name'], ' ' ) );
	$hi    = $first ? 'Hi ' . esc_html( $first ) . ',' : 'Hi there,';
	if ( 1 === $n ) {
		$subject = 'You left your hosting order unfinished';
		$title   = 'Your order is waiting';
		$body    = 'You started ordering managed WordPress hosting with Dream Web Digital but didn’t finish checking out. It only takes a minute to wrap up.';
	} else {
		$subject = 'Still want hosting for your website?';
		$title   = 'Still thinking it over?';
		$body    = 'Just a friendly reminder that your hosting order is still unfinished. If you have any questions before you sign up, I’m happy to help. This is the last reminder I’ll send.';
	}
	$url  = esc_url( add_query_arg( 'dwd-order', 'hosting', wc_get_checkout_url() ) );
	$logo = esc_url( 'https://dreamwebdigital.com/wp-content/uploads/2025/10/Asset-2-1.png' );
	$html = '<!doctype html><html><body style="margin:0;padding:0;background:#F4F9FE">'
		. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F9FE"><tr><td align="center" style="padding:32px 16px">'
		. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #E4E9F5">'
		. '<tr><td align="center" style="background:#12293E;padding:30px 24px"><img src="' . $logo . '" width="170" alt="Dream Web Digital" style="display:block;width:170px;height:auto;border:0"></td></tr>'
		. '<tr><td style="padding:40px 40px 12px;font-family:Urbanist,Helvetica,Arial,sans-serif">'
		. '<p style="margin:0 0 6px;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#1B7EC3">Server hosting · $500/year</p>'
		. '<h1 style="margin:0 0 20px;font-family:Urbanist,\'Arial Black\',Helvetica,Arial,sans-serif;font-size:26px;line-height:1.2;font-weight:900;text-transform:uppercase;color:#0E1526">' . esc_html( $title ) . '</h1>'
		. '<p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#303B58">' . $hi . '</p>'
		. '<p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#303B58">' . esc_html( $body ) . '</p>'
		. '<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#1B7EC3"><a href="' . $url . '" style="display:inline-block;padding:16px 34px;font-size:14px;letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none;font-family:Urbanist,Helvetica,Arial,sans-serif">Finish my order</a></td></tr></table>'
		. '</td></tr>'
		. '<tr><td style="padding:24px 40px 36px;font-family:Urbanist,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#7A86A0">Questions? Reply to this email or call <a href="tel:+17722101728" style="color:#1B7EC3;text-decoration:none;font-weight:600">(772) 210-1728</a>.<br>Michael Tarr, Dream Web Digital</td></tr>'
		. '</table>'
		. '<p style="margin:18px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#9AA6BC">Dream Web Digital LLC · Charlotte, NC</p>'
		. '</td></tr></table></body></html>';
	$headers = array( 'Content-Type: text/html; charset=UTF-8', 'From: Dream Web Digital <' . get_option( 'admin_email' ) . '>', 'Reply-To: Dream Web Digital <' . get_option( 'admin_email' ) . '>' );
	return wp_mail( $lead['email'], $subject, $html, $headers );
}
