<?php
/**
 * Bayfield Inn online store (WooCommerce).
 * - Merchandise (sweatshirts, hats…) are normal WooCommerce products; sizes are variations.
 * - The gift card is one hidden WooCommerce product (SKU bi-gift-card). The /gift-card/ page's form
 *   sets the card type, amount and recipient details; the cart price is the chosen amount.
 * - Shoppers stay on the site's own designed pages: product URLs lead back to /merchandise/ or
 *   /gift-card/, and cart/checkout live on /cart/ and /checkout/.
 * - Until Square is connected, a "Test order" payment option shows for administrators only.
 */
defined( 'ABSPATH' ) || exit;

const BI_GC_SKU   = 'bi-gift-card';
const BI_GC_TYPES = array( 'inn' => 'Bayfield Inn (rooms)', 'dining' => 'Dining' );
const BI_GC_AMTS  = array( 25, 50, 100, 250, 500 );
const BI_GC_MIN   = 10;
const BI_GC_MAX   = 1000;

function bi_store_on() {
	return class_exists( 'WooCommerce' );
}
function bi_gc_product_id() {
	return bi_store_on() ? (int) wc_get_product_id_by_sku( BI_GC_SKU ) : 0;
}

/* ------------------------------------------------------------ one-time setup */
add_action( 'admin_init', function () {
	if ( ! bi_store_on() || '3' === get_option( 'bi_store_setup' ) ) {
		return;
	}
	update_option( 'woocommerce_coming_soon', 'no' );
	update_option( 'woocommerce_store_pages_only', 'no' );
	update_option( 'woocommerce_show_marketplace_suggestions', 'no' );
	update_option( 'woocommerce_allow_tracking', 'no' );
	update_option( 'woocommerce_task_list_hidden', 'yes' );
	update_option( 'woocommerce_extended_task_list_hidden', 'yes' );
	update_option( 'woocommerce_onboarding_profile', array( 'skipped' => true, 'completed' => true ) );
	update_option( 'woocommerce_cart_redirect_after_add', 'no' );
	update_option( 'woocommerce_enable_ajax_add_to_cart', 'yes' );
	// The site's own designed pages are the cart and checkout.
	foreach ( array( 'cart' => 'woocommerce_cart_page_id', 'checkout' => 'woocommerce_checkout_page_id' ) as $slug => $opt ) {
		$page = get_page_by_path( $slug );
		if ( $page ) {
			update_option( $opt, $page->ID );
		}
	}
	// Remove the duplicate pages WooCommerce created on install.
	foreach ( array( 'cart-2', 'checkout-2' ) as $slug ) {
		$dup = get_page_by_path( $slug );
		if ( $dup ) {
			wp_trash_post( $dup->ID );
		}
	}
	update_option( 'bi_store_setup', '3' );
} );

/* ---------------------------------------------------------- keep shoppers on our pages */
add_action( 'template_redirect', function () {
	if ( ! bi_store_on() ) {
		return;
	}
	if ( is_product() ) {
		$id = get_queried_object_id();
		wp_safe_redirect( home_url( $id === bi_gc_product_id() ? '/gift-card/' : '/merchandise/' ), 302 );
		exit;
	}
	if ( is_shop() || is_product_taxonomy() ) {
		wp_safe_redirect( home_url( '/merchandise/' ), 302 );
		exit;
	}
} );
add_filter( 'woocommerce_return_to_shop_redirect', function () { return home_url( '/merchandise/' ); } );
add_filter( 'woocommerce_continue_shopping_redirect', function () { return home_url( '/merchandise/' ); } );
add_filter( 'woocommerce_cart_item_permalink', '__return_empty_string' ); // no links to bare product pages
add_filter( 'woocommerce_order_item_permalink', '__return_false' );

/* ------------------------------------------------------------------- gift card */
/** Read + validate the gift card form. Returns array or WP_Error. */
function bi_gc_from_request( $src ) {
	$get    = function ( $k ) use ( $src ) { return isset( $src[ $k ] ) ? sanitize_text_field( wp_unslash( $src[ $k ] ) ) : ''; };
	$type   = $get( 'bi_gc_type' );
	$amount = $get( 'bi_gc_amount' );
	$custom = $get( 'bi_gc_custom' );
	$value  = '' !== $custom ? (float) preg_replace( '/[^\d.]/', '', $custom ) : (float) $amount;
	$errors = array();
	if ( ! isset( BI_GC_TYPES[ $type ] ) ) {
		$errors[] = 'Choose a Bayfield Inn (rooms) or Dining card.';
	}
	if ( $value < BI_GC_MIN || $value > BI_GC_MAX ) {
		$errors[] = sprintf( 'Choose an amount between $%d and $%s.', BI_GC_MIN, number_format( BI_GC_MAX ) );
	}
	$d = array(
		'type'     => $type,
		'amount'   => round( $value, 2 ),
		'to'       => $get( 'bi_gc_to' ),
		'from'     => $get( 'bi_gc_from' ),
		'message'  => isset( $src['bi_gc_message'] ) ? sanitize_textarea_field( wp_unslash( $src['bi_gc_message'] ) ) : '',
	);
	return $errors ? new WP_Error( 'bi_gc', implode( ' ', $errors ) ) : $d;
}

add_filter( 'woocommerce_add_to_cart_validation', function ( $ok, $product_id ) {
	if ( (int) $product_id !== bi_gc_product_id() ) {
		return $ok;
	}
	$d = bi_gc_from_request( $_POST ); // phpcs:ignore -- WooCommerce verifies the add-to-cart request
	if ( is_wp_error( $d ) ) {
		wc_add_notice( $d->get_error_message(), 'error' );
		return false;
	}
	return $ok;
}, 10, 2 );

add_filter( 'woocommerce_add_cart_item_data', function ( $data, $product_id ) {
	if ( (int) $product_id === bi_gc_product_id() ) {
		$d = bi_gc_from_request( $_POST ); // phpcs:ignore
		if ( ! is_wp_error( $d ) ) {
			$data['bi_gc']     = $d;
			$data['unique_id'] = md5( wp_json_encode( $d ) . microtime() ); // each card is its own line
		}
	}
	return $data;
}, 10, 2 );

add_action( 'woocommerce_before_calculate_totals', function ( $cart ) {
	foreach ( $cart->get_cart() as $item ) {
		if ( ! empty( $item['bi_gc']['amount'] ) ) {
			$item['data']->set_price( (float) $item['bi_gc']['amount'] );
		}
	}
} );

add_filter( 'woocommerce_cart_item_name', function ( $name, $item ) {
	if ( ! empty( $item['bi_gc'] ) ) {
		return esc_html( 'Gift Card – ' . BI_GC_TYPES[ $item['bi_gc']['type'] ] );
	}
	return $name;
}, 10, 2 );

function bi_gc_lines( $d ) {
	return array_filter( array(
		'Card'    => BI_GC_TYPES[ $d['type'] ] . ' · $' . number_format( $d['amount'], 2 ),
		'To'      => $d['to'] ?? '',
		'From'    => $d['from'] ?? '',
		'Message' => $d['message'] ?? '',
	), 'strlen' );
}
add_filter( 'woocommerce_get_item_data', function ( $rows, $item ) {
	if ( ! empty( $item['bi_gc'] ) ) {
		foreach ( bi_gc_lines( $item['bi_gc'] ) as $k => $v ) {
			$rows[] = array( 'key' => $k, 'value' => esc_html( $v ) );
		}
	}
	return $rows;
}, 10, 2 );

// Save the card details on the order (shown in the order screen and in both emails).
add_action( 'woocommerce_checkout_create_order_line_item', function ( $line, $key, $values ) {
	if ( ! empty( $values['bi_gc'] ) ) {
		$line->set_name( 'Gift Card – ' . BI_GC_TYPES[ $values['bi_gc']['type'] ] );
		foreach ( bi_gc_lines( $values['bi_gc'] ) as $k => $v ) {
			$line->add_meta_data( $k, $v, true );
		}
	}
}, 10, 3 );

/* ---------------------------------------------------- payment while testing */
// Until Square is connected, "Cash on delivery" is renamed "Test order" and offered to admins only.
add_filter( 'woocommerce_available_payment_gateways', function ( $gateways ) {
	if ( isset( $gateways['cod'] ) && ! current_user_can( 'manage_woocommerce' ) ) {
		unset( $gateways['cod'] );
	}
	return $gateways;
} );
add_filter( 'woocommerce_gateway_title', function ( $title, $id ) {
	return 'cod' === $id ? 'Test order (staff only, no payment)' : $title;
}, 10, 2 );
add_filter( 'woocommerce_gateway_description', function ( $desc, $id ) {
	return 'cod' === $id ? 'Visible to administrators only, for testing the store before Square is connected. No card is charged.' : $desc;
}, 10, 2 );
add_filter( 'woocommerce_cod_process_payment_order_status', function () { return 'processing'; } );
add_filter( 'woocommerce_no_available_payment_methods_message', function () {
	return 'Online payment is being set up. Please call us at (715) 779-3363 to order.';
} );

/* --------------------------------------------------------------- checkout fields */
// Compact layout: fields sit side by side (bi-half / bi-third / bi-twothird on a 6-column grid).
add_filter( 'woocommerce_checkout_fields', function ( $f ) {
	unset( $f['billing']['billing_company'], $f['shipping']['shipping_company'] );
	$layout = array(
		'email'      => array( 'bi-half', 100, 'Email address' ), // after the address: WooCommerce's
		'phone'      => array( 'bi-half', 110, 'Phone' ), // address script keeps these last
		'first_name' => array( 'bi-half', 10, 'First name' ),
		'last_name'  => array( 'bi-half', 20, 'Last name' ),
		'country'    => array( 'bi-hidden', 30, null ), // US only: no need to show it
		'address_1'  => array( 'bi-twothird', 50, 'Street address' ),
		'address_2'  => array( 'bi-third', 60, 'Apt, suite' ),
		'city'       => array( 'bi-third', 70, 'City' ),
		'state'      => array( 'bi-third', 80, 'State' ),
		'postcode'   => array( 'bi-third', 90, 'ZIP code' ),
	);
	foreach ( array( 'billing', 'shipping' ) as $group ) {
		foreach ( $layout as $key => $l ) {
			$k = $group . '_' . $key;
			if ( ! isset( $f[ $group ][ $k ] ) ) {
				continue;
			}
			$f[ $group ][ $k ]['class']    = array( 'form-row', $l[0] );
			$f[ $group ][ $k ]['priority'] = $l[1];
			if ( $l[2] ) {
				$f[ $group ][ $k ]['label'] = $l[2];
			}
			if ( 'address_2' === $key ) {
				$f[ $group ][ $k ]['label_class'] = array();
				$f[ $group ][ $k ]['placeholder'] = 'Apt, suite, unit';
			}
			if ( 'address_1' === $key ) {
				$f[ $group ][ $k ]['placeholder'] = 'House number and street';
			}
		}
	}
	if ( isset( $f['billing']['billing_email'] ) ) {
		$f['billing']['billing_email']['placeholder'] = 'For your receipt';
	}
	if ( isset( $f['order']['order_comments'] ) ) {
		$f['order']['order_comments']['placeholder'] = 'Anything we should know about your order?';
		$f['order']['order_comments']['label']       = 'Notes';
	}
	return $f;
}, 20 );
// The address JS re-applies country rules; keep our labels/classes for the US.
add_filter( 'woocommerce_get_country_locale', function ( $locale ) {
	$locale['US']['address_2'] = array( 'label' => 'Apt, suite', 'label_class' => array(), 'placeholder' => 'Apt, suite, unit' );
	$locale['US']['postcode']  = array( 'label' => 'ZIP code' );
	$locale['US']['city']      = array( 'label' => 'City' );
	return $locale;
} );
// Friendlier checkout headings.
add_filter( 'gettext', function ( $t, $text, $domain ) {
	if ( 'woocommerce' !== $domain ) {
		return $t;
	}
	$map = array(
		'Billing details'                     => 'Your details',
		'Billing &amp; Shipping'              => 'Your details',
		'Ship to a different address?'        => 'Send to a different address? (for a gift, for example)',
		'Additional information'              => 'Order notes',
		'Your order'                          => 'Order summary',
		'Have a coupon?'                      => 'Have a promo code?',
		'Click here to enter your code'       => 'Enter it here',
		'If you have a coupon code, please apply it below.' => 'Enter your promo code below.',
	);
	return $map[ $text ] ?? $t;
}, 10, 3 );
add_filter( 'woocommerce_enable_order_notes_field', '__return_true' );

/* ------------------------------------------------------------- header cart icon */
function bi_cart_count() {
	return ( bi_store_on() && WC()->cart ) ? (int) WC()->cart->get_cart_contents_count() : 0;
}
function bi_cart_link_html() {
	$n   = bi_cart_count();
	$url = bi_store_on() ? wc_get_checkout_url() : home_url( '/checkout/' );
	return sprintf( '<a class="bi-cart-link%s" href="%s" aria-label="Checkout: %d item%s in your cart"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg><span class="bi-cart-count%s">%d</span></a>',
		$n ? '' : ' is-empty', esc_url( $url ), $n, 1 === $n ? '' : 's', $n ? '' : ' is-empty', $n );
}
// WooCommerce refreshes these pieces after add-to-cart and on cached pages.
add_filter( 'woocommerce_add_to_cart_fragments', function ( $f ) {
	$f['a.bi-cart-link'] = bi_cart_link_html();
	return $f;
} );
// Pages are cached for visitors, so the cart count is refreshed in the browser.
add_action( 'wp_enqueue_scripts', function () {
	if ( bi_store_on() ) {
		wp_enqueue_script( 'wc-cart-fragments' );
	}
	if ( bi_store_on() && ( is_cart() || is_checkout() ) ) {
		wp_enqueue_style( 'bi-front' );
	}
}, 20 );
// No separate cart step: a gift card goes straight to checkout, and /cart/ forwards to checkout.
add_filter( 'woocommerce_add_to_cart_redirect', function ( $url, $product ) {
	if ( $product && (int) $product->get_id() === bi_gc_product_id() ) {
		return wc_get_checkout_url();
	}
	return $url;
}, 10, 2 );
add_action( 'template_redirect', function () {
	// With items, the cart page isn't needed. (Empty: WooCommerce sends empty checkouts to the cart,
	// which shows "Your cart is empty" with a link back to the shop.)
	if ( bi_store_on() && is_cart() && WC()->cart && ! WC()->cart->is_empty() ) {
		wp_safe_redirect( wc_get_checkout_url() );
		exit;
	}
}, 5 );
// Checkout is the only place to review the order, so each item gets a remove link there.
add_filter( 'woocommerce_cart_item_name', function ( $name, $item, $key ) {
	if ( is_checkout() && ! is_wc_endpoint_url( 'order-received' ) && ! empty( $key ) ) {
		$name .= sprintf( ' <a href="%s" class="bi-remove-item" aria-label="Remove %s">Remove</a>', esc_url( add_query_arg( '_wp_http_referer', rawurlencode( wc_get_checkout_url() ), wc_get_cart_remove_url( $key ) ) ), esc_attr( wp_strip_all_tags( $name ) ) );
	}
	return $name;
}, 20, 3 );
// After removing an item from checkout, stay on checkout (or go to the shop when it's empty).
add_action( 'woocommerce_cart_item_removed', function () {
	add_filter( 'wp_redirect', function ( $loc ) {
		if ( false !== strpos( (string) wp_get_referer(), '/checkout' ) ) {
			return WC()->cart->is_empty() ? home_url( '/merchandise/' ) : wc_get_checkout_url();
		}
		return $loc;
	} );
} );

/* -------------------------------------------------------------- widgets */
add_action( 'elementor/widgets/register', function ( $manager ) {
	require_once BI_MANAGER_DIR . 'widgets/class-bi-store-widgets.php';
	$manager->register( new BI_Gift_Card_Widget() );
	$manager->register( new BI_Cart_Link_Widget() );
} );

// Gift card goes straight to checkout, so its "added" notice needs no "View cart" button.
add_filter( 'wc_add_to_cart_message_html', function ( $message, $products ) {
	if ( isset( $products[ bi_gc_product_id() ] ) && 1 === count( $products ) ) {
		return 'Your gift card has been added. It will be mailed to the shipping address you enter below.';
	}
	return $message;
}, 10, 2 );

/* ----------------------------------------------------------------- order emails */
// Logo at the top of every store email (green logo on white), set once and kept if changed later.
add_action( 'admin_init', function () {
	if ( ! bi_store_on() || get_option( 'bi_store_email_logo' ) ) {
		return;
	}
	$logo = get_posts( array( 'post_type' => 'attachment', 'name' => 'bayfield-inn-logo-green-trim', 'numberposts' => 1, 'fields' => 'ids' ) );
	$src  = $logo ? wp_get_attachment_image_src( $logo[0], 'medium_large' ) : null;
	if ( $src ) {
		update_option( 'woocommerce_email_header_image', $src[0] );
		update_option( 'bi_store_email_logo', 1 );
	}
} );
// Serif headings and calmer details, matching the website.
add_filter( 'woocommerce_email_styles', function ( $css ) {
	return $css . '
	#template_header { border-radius: 0 !important; }
	#header_wrapper h1, h1 { font-family: Georgia, "Times New Roman", serif !important; font-weight: 400 !important; letter-spacing: -0.3px; text-shadow: none !important; }
	h2, h3 { font-family: Georgia, "Times New Roman", serif !important; font-weight: 400 !important; color: #17301b !important; }
	#body_content_inner, td, th { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif !important; }
	.wc-item-meta { font-size: 13px !important; color: #4b5249 !important; }
	.wc-item-meta .wc-item-meta-label { font-weight: 600; }
	#template_header_image img { max-width: 200px !important; height: auto !important; }
	a { color: #17301b !important; }';
} );

// No payment option (Square not connected yet): don't show a "Place order" button that can't work.
add_filter( 'woocommerce_order_button_html', function ( $html ) {
	if ( function_exists( 'WC' ) && WC()->payment_gateways() && ! WC()->payment_gateways()->get_available_payment_gateways() ) {
		return '';
	}
	return $html;
} );

/* --------------------------------------------------------------- mail log */
// The last 30 emails the site tried to send (to, subject, sent or failed + reason), for checking
// that order emails go out. Admins only, via the bayfield/v1/mail-log endpoint.
function bi_mail_log_add( $row ) {
	$log = get_option( 'bi_mail_log', array() );
	array_unshift( $log, $row + array( 'at' => current_time( 'mysql' ) ) );
	update_option( 'bi_mail_log', array_slice( $log, 0, 30 ), false );
}
add_action( 'wp_mail_succeeded', function ( $m ) {
	bi_mail_log_add( array( 'to' => implode( ', ', (array) $m['to'] ), 'subject' => (string) $m['subject'], 'ok' => true ) );
} );
add_action( 'wp_mail_failed', function ( $e ) {
	$d = $e->get_error_data();
	bi_mail_log_add( array( 'to' => implode( ', ', (array) ( $d['to'] ?? array() ) ), 'subject' => (string) ( $d['subject'] ?? '' ), 'ok' => false, 'error' => $e->get_error_message() ) );
} );
add_action( 'rest_api_init', function () {
	register_rest_route( 'bayfield/v1', '/mail-log', array(
		'methods'             => 'GET',
		'permission_callback' => function () { return current_user_can( 'manage_options' ); },
		'callback'            => function () { return get_option( 'bi_mail_log', array() ); },
	) );
} );
