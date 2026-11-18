<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
define( 'GLEC_CHILD_VER', '1.6.1' );

/* Fonts are self-hosted: tell Elementor that Inter / Inter Tight are local so it never loads Google Fonts. */
add_filter( 'elementor/fonts/additional_fonts', function ( $fonts ) {
	$fonts['Inter']       = 'local';
	$fonts['Inter Tight'] = 'local';
	return $fonts;
} );
add_filter( 'elementor/frontend/print_google_fonts', '__return_false' );

add_action( 'wp_enqueue_scripts', function () {
	$uri = get_stylesheet_directory_uri();
	wp_enqueue_style( 'glec-fonts', $uri . '/assets/fonts.css', [], GLEC_CHILD_VER );
	wp_enqueue_style( 'glec-child', $uri . '/assets/glec.min.css', [ 'glec-fonts' ], GLEC_CHILD_VER );
	wp_enqueue_style( 'glec-pages', $uri . '/assets/pages.css', [ 'glec-child' ], GLEC_CHILD_VER );
	wp_enqueue_style( 'glec-mega', $uri . '/assets/mega.css', [ 'glec-child' ], GLEC_CHILD_VER );
	wp_enqueue_style( 'glec-buttons', $uri . '/assets/buttons-reset.css', [ 'glec-mega', 'glec-pages' ], GLEC_CHILD_VER );
	wp_enqueue_script( 'glec-child', $uri . '/assets/glec.js', [], GLEC_CHILD_VER, true );
	wp_enqueue_script( 'glec-mega', $uri . '/assets/mega.js', [ 'glec-child' ], GLEC_CHILD_VER, true );
	wp_enqueue_style( 'glec-steps', $uri . '/assets/steps.css', [ 'glec-buttons' ], GLEC_CHILD_VER );
	wp_enqueue_script( 'glec-steps', $uri . '/assets/steps.js', [], GLEC_CHILD_VER, true );
}, 20 );

add_action( 'elementor/editor/after_enqueue_styles', function () {
	wp_enqueue_style( 'glec-fonts', get_stylesheet_directory_uri() . '/assets/fonts.css', [], GLEC_CHILD_VER );
} );

/* Preload the two most-used font files to avoid layout shift. */
add_action( 'wp_head', function () {
	$uri = get_stylesheet_directory_uri() . '/fonts/';
	foreach ( [ 'inter-latin-400-normal.woff2', 'inter-tight-latin-700-normal.woff2' ] as $f ) {
		printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( $uri . $f ) );
	}
}, 1 );

/* Body class for cart state so the header cart icon only shows with >= 1 item. */
add_filter( 'body_class', function ( $c ) {
	if ( function_exists( 'WC' ) && WC()->cart && WC()->cart->get_cart_contents_count() > 0 ) { $c[] = 'glec-has-cart'; }
	return $c;
} );

/* Header cart count fragment for AJAX add to cart. */
add_filter( 'woocommerce_add_to_cart_fragments', function ( $f ) {
	$n = WC()->cart ? WC()->cart->get_cart_contents_count() : 0;
	$f['span.glec-cart-count'] = '<span class="glec-cart-count" data-count="' . (int) $n . '">' . (int) $n . '</span>';
	return $f;
} );

/* [glec_cart] shortcode: header cart icon with live count. */
add_shortcode( 'glec_cart', function () {
	$n   = ( function_exists( 'WC' ) && WC()->cart ) ? WC()->cart->get_cart_contents_count() : 0;
	$url = function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : '#';
	return '<a class="glec-cart" href="' . esc_url( $url ) . '" aria-label="Cart"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg><span class="glec-cart-count" data-count="' . (int) $n . '">' . (int) $n . '</span></a>';
} );

/* [glec_login] shortcode: "Log in" or "My courses" depending on state. */
add_shortcode( 'glec_account_links', function () {
	if ( is_user_logged_in() ) {
		return '<a class="glec-mm-small" href="' . esc_url( wc_get_page_permalink( 'myaccount' ) ) . '">My courses</a><a class="glec-mm-small" href="' . esc_url( wp_logout_url( home_url( '/' ) ) ) . '">Log out</a>';
	}
	return '<a class="glec-mm-small" href="' . esc_url( wc_get_page_permalink( 'myaccount' ) ) . '">Log in</a>';
} );

require_once get_stylesheet_directory() . '/inc/mega-nav.php';
require_once get_stylesheet_directory() . '/inc/steps.php';
require_once get_stylesheet_directory() . '/inc/checkout.php';

/* License class products live on designed pages: send the bare WooCommerce product URLs there. */
add_action( 'template_redirect', function () {
	if ( ! function_exists( 'is_product' ) || ! is_product() ) { return; }
	$map = [ 'HLG-DD-R-OL' => 'residential-design', 'HLG-DD-C-OL' => 'commercial-design', 'CA-OL' => 'exam-prep-review', 'CA-TABs' => 'reference-tabs', 'SOS-APP' => 'application-overview' ];
	$p   = wc_get_product( get_the_ID() );
	if ( $p ) {
		$sku = $p->get_sku();
		if ( isset( $map[ $sku ] ) ) { wp_safe_redirect( home_url( '/license-classes/' . $map[ $sku ] . '/' ), 301 ); exit; }
		if ( false !== strpos( $sku, '-CEU' ) ) { wp_safe_redirect( home_url( '/ceu-classes/' ), 301 ); exit; }
	}
} );
