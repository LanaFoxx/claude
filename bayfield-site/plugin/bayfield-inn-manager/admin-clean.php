<?php
/**
 * Quiet admin: removes notices that other plugins add to admin screens (review requests,
 * "connect your account", upsells, promos). WordPress's own notices (saved / errors / core
 * updates) and this plugin's messages stay. Applies on every admin screen.
 */
defined( 'ABSPATH' ) || exit;

function bi_is_plugin_callback( $cb ) {
	try {
		if ( is_string( $cb ) && false !== strpos( $cb, '::' ) ) {
			$cb = explode( '::', $cb, 2 );
		}
		if ( is_array( $cb ) && isset( $cb[0], $cb[1] ) ) {
			$ref = new ReflectionMethod( $cb[0], $cb[1] );
		} elseif ( $cb instanceof Closure || is_string( $cb ) ) {
			$ref = new ReflectionFunction( $cb );
		} elseif ( is_object( $cb ) && method_exists( $cb, '__invoke' ) ) {
			$ref = new ReflectionMethod( $cb, '__invoke' );
		} else {
			return false;
		}
		$file = wp_normalize_path( (string) $ref->getFileName() );
	} catch ( \Throwable $e ) {
		return false;
	}
	$plugins = wp_normalize_path( WP_PLUGIN_DIR ) . '/';
	$mu      = wp_normalize_path( WPMU_PLUGIN_DIR ) . '/';
	$mine    = wp_normalize_path( BI_MANAGER_DIR );
	$theme   = wp_normalize_path( get_theme_root() ) . '/';
	return ( 0 === strpos( $file, $plugins ) || 0 === strpos( $file, $mu ) || 0 === strpos( $file, $theme ) ) && 0 !== strpos( $file, $mine );
}

add_action( 'in_admin_header', function () {
	global $wp_filter;
	foreach ( array( 'admin_notices', 'all_admin_notices', 'network_admin_notices', 'user_admin_notices' ) as $hook ) {
		if ( empty( $wp_filter[ $hook ] ) ) {
			continue;
		}
		foreach ( $wp_filter[ $hook ]->callbacks as $priority => $cbs ) {
			foreach ( $cbs as $cb ) {
				if ( bi_is_plugin_callback( $cb['function'] ) ) {
					remove_action( $hook, $cb['function'], $priority );
				}
			}
		}
	}
}, PHP_INT_MAX );

// Some plugins print banners outside the notice hooks or inject them with JavaScript.
add_action( 'admin_head', function () {
	echo '<style id="bi-quiet-admin">'
		. '.e-notice,.elementor-message,.e-admin-top-bar__secondary-area-buttons .e-admin-top-bar__bar-button:not(:first-child),'
		. '.sg-notice,.sgo-notice,.siteground-notice,[class*="review-notice"],[class*="rate-notice"],[id*="review-notice"],[class*="-promo-notice"],.fs-notice'
		. '{display:none!important}</style>';
}, 99 );
