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

/** jQuery is only used by scripts in the footer, so load it there instead of blocking the first paint. */
add_action( 'wp_default_scripts', function ( $scripts ) {
	if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) || in_array( $GLOBALS['pagenow'] ?? '', array( 'wp-login.php', 'wp-register.php' ), true ) ) {
		return;
	}
	foreach ( array( 'jquery', 'jquery-core', 'jquery-migrate' ) as $h ) {
		$scripts->add_data( $h, 'group', 1 );
	}
} );

/** Blog posts: the featured image at the top is the biggest thing on screen, so fetch it first. */
add_filter( 'wp_get_attachment_image_attributes', function ( $attr, $att, $size ) {
	static $done = false;
	if ( $done || is_admin() || ! is_singular( 'post' ) || false === strpos( (string) ( $attr['class'] ?? '' ), 'wp-post-image' ) ) {
		return $attr;
	}
	$done                  = true;
	$attr['loading']       = 'eager';
	$attr['fetchpriority'] = 'high';
	return $attr;
}, 20, 3 );

/** Hello Elementor adds its own description tag; Yoast already writes one, so drop the duplicate. */
add_action( 'wp', function () {
	remove_action( 'wp_head', 'hello_elementor_add_description_meta_tag' );
} );
