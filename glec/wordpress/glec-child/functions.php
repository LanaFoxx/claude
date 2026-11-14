<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
define( 'GLEC_CHILD_VER', '1.2.4' );

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
	wp_enqueue_script( 'glec-child', $uri . '/assets/glec.js', [], GLEC_CHILD_VER, true );
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

/* [glec_mobile_menu] shortcode: hamburger button + full-screen panel (focus trap and Escape in glec.js). */
add_shortcode( 'glec_mobile_menu', function () {
	$logo  = get_stylesheet_directory_uri() . '/assets/glec-logo.png';
	$items = '';
	$locs  = get_nav_menu_locations();
	$menu  = wp_get_nav_menu_object( 'Primary' );
	if ( $menu ) {
		foreach ( wp_get_nav_menu_items( $menu->term_id ) as $it ) {
			$items .= '<a href="' . esc_url( $it->url ) . '">' . esc_html( $it->title ) . '</a>';
		}
	}
	$phone = esc_html( get_option( 'glec_phone', '[CONFIRM: phone number]' ) );
	$start = esc_url( home_url( '/how-to-get-licensed/' ) );
	ob_start(); ?>
	<button type="button" class="glec-burger" aria-label="Open menu" aria-expanded="false" aria-controls="glec-mm"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 9h16M4 15h16"/></svg></button>
	<div id="glec-mm" class="glec-mm" role="dialog" aria-modal="true" aria-label="Menu" aria-hidden="true">
		<div class="glec-mm__top"><a href="<?php echo esc_url( home_url( '/' ) ); ?>"><img src="<?php echo esc_url( $logo ); ?>" alt="GLEC, Georgia License Exam Company"></a>
		<button type="button" class="glec-mm__close glec-burger-x" aria-label="Close menu" style="display:inline-flex"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
		<nav class="glec-mm__nav" aria-label="Main"><?php echo $items; // phpcs:ignore ?></nav>
		<div class="glec-mm__small"><?php echo do_shortcode( '[glec_account_links]' ); ?></div>
		<div class="glec-mm__foot"><span><?php echo $phone; ?></span><a href="mailto:Info@GeorgiaLicenseExam.com">Info@GeorgiaLicenseExam.com</a><a class="glec-mm-btn" href="<?php echo $start; ?>">Start here</a></div>
	</div>
	<?php return ob_get_clean();
} );
