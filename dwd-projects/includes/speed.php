<?php
/**
 * Front-end speed: load only what each page needs.
 *
 * - WooCommerce CSS/JS only on shop, cart, checkout and account pages.
 * - Keep this plugin's page styles out of SiteGround's combined CSS so they still load
 *   after Elementor's and win where they should.
 */
defined( 'ABSPATH' ) || exit;

/** True on pages that actually use WooCommerce. */
function dwdp_needs_woo() {
	if ( ! function_exists( 'is_woocommerce' ) ) {
		return false;
	}
	return is_woocommerce() || is_cart() || is_checkout() || is_account_page()
		|| ( is_singular() && has_shortcode( (string) get_post_field( 'post_content', get_queried_object_id() ), 'woocommerce_checkout' ) );
}

add_filter( 'woocommerce_enqueue_styles', function ( $styles ) {
	return dwdp_needs_woo() ? $styles : array();
} );

add_action( 'wp_enqueue_scripts', function () {
	if ( is_admin() || dwdp_needs_woo() ) {
		return;
	}
	foreach ( array( 'wc-blocks-style', 'woocommerce-inline' ) as $h ) {
		wp_dequeue_style( $h );
	}
	foreach ( array( 'wc-order-attribution', 'sourcebuster-js', 'woocommerce', 'wc-add-to-cart', 'wc-cart-fragments', 'jquery-blockui', 'js-cookie' ) as $h ) {
		wp_dequeue_script( $h );
	}
}, 99 );

add_filter( 'sgo_css_combine_exclude', function ( $exclude ) {
	$exclude[] = 'dwdp-pages';
	$exclude[] = 'dwdp-front';
	return $exclude;
} );
