<?php
// Cabrera Torres front-end performance tweaks (installed on cabreratorres.com through the Code Snippets plugin,
// snippet "CT performance", front-end only). Keep this file in sync with the live snippet.

// 1. jQuery in the footer instead of the <head> (it blocked first paint), and no jQuery Migrate (nothing needs it).
add_action( 'wp_enqueue_scripts', function () {
	$scripts = wp_scripts();
	if ( isset( $scripts->registered['jquery'] ) ) {
		$scripts->registered['jquery']->deps = array( 'jquery-core' );
	}
	foreach ( array( 'jquery', 'jquery-core' ) as $handle ) {
		$scripts->add_data( $handle, 'group', 1 );
	}
}, 1 );

// 2. No emoji detection script / styles (the site uses no emoji).
remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
remove_action( 'wp_print_styles', 'print_emoji_styles' );
remove_action( 'wp_enqueue_scripts', 'wp_enqueue_emoji_styles' );
add_filter( 'emoji_svg_url', '__return_false' );

// 3. Preload the two main self-hosted fonts (prevents a layout shift when they swap in), and on the English and
//    Spanish home pages the hero background at the size each screen uses (phones show no hero photo).
add_action( 'wp_head', function () {
	$u = content_url( '/uploads/2026/11/' );
	echo '<link rel="preload" href="' . esc_url( $u . 'ct-montserrat-latin.woff2' ) . '" as="font" type="font/woff2" crossorigin>' . "\n";
	echo '<link rel="preload" href="' . esc_url( $u . 'ct-playfair-latin.woff2' ) . '" as="font" type="font/woff2" crossorigin>' . "\n";
	$path = trim( wp_parse_url( $_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH ), '/' );
	if ( '' !== $path && 'es' !== $path ) {
		return;
	}
	$o = $u . 'cabrera-torres-law-firm-office-norcross-ga';
	echo '<link rel="preload" href="' . esc_url( $o . '-768x334.webp' ) . '" as="image" media="(min-width: 768px) and (max-width: 1024px)" fetchpriority="high">' . "\n";
	echo '<link rel="preload" href="' . esc_url( $o . '.webp' ) . '" as="image" media="(min-width: 1025px)" fetchpriority="high">' . "\n";
}, 1 );

// 4. Only the first two images on a page (the logo and the page's hero photo) load eagerly; everything further down,
//    including the footer logo, is lazy-loaded. (Elementor's image widgets don't follow WordPress's own threshold.)
add_filter( 'wp_get_attachment_image_attributes', function ( $attr ) {
	static $seen = 0;
	if ( is_admin() || wp_doing_ajax() || ( function_exists( 'wp_is_json_request' ) && wp_is_json_request() ) ) {
		return $attr;
	}
	$seen++;
	if ( $seen > 2 && empty( $attr['fetchpriority'] ) ) {
		$attr['loading'] = 'lazy';
	}
	return $attr;
} );

// 5. Accessibility: the theme's "Skip to content" link points at #content, which Elementor's header-footer pages don't
//    have. Put the target right after the header.
add_action( 'elementor/page_templates/header-footer/before_content', function () {
	echo '<span id="content" tabindex="-1"></span>';
} );
