<?php
/**
 * Front-end performance + SEO basics:
 * - self-hosted Geist / Newsreader (inline @font-face + preload of the two main files)
 * - homepage hero: first slideshow photo painted by CSS and preloaded (fast LCP)
 * - meta descriptions + Open Graph tags (skipped if an SEO plugin is active)
 * - skip-link target for the theme's "Skip to content" link
 */
defined( 'ABSPATH' ) || exit;

add_action( 'wp_head', function () {
	$base = BI_MANAGER_URL . 'assets/';
	foreach ( array( 'geist-normal-latin', 'newsreader-normal-latin' ) as $f ) {
		printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( $base . 'fonts/' . $f . '.woff2' ) );
	}
	$css = file_get_contents( BI_MANAGER_DIR . 'assets/fonts.css' ); // phpcs:ignore
	if ( $css ) {
		echo '<style id="bi-fonts">' . str_replace( 'url(fonts/', 'url(' . esc_url( $base ) . 'fonts/', $css ) . "</style>\n"; // phpcs:ignore
	}
}, 1 );

/** First photo of the homepage hero slideshow (container #book), from the page's Elementor data. */
function bi_hero_first_image() {
	$front = (int) get_option( 'page_on_front' );
	if ( ! $front ) {
		return null;
	}
	$cached = get_transient( 'bi_hero_first_' . $front );
	if ( is_array( $cached ) ) {
		return $cached ?: null;
	}
	$data  = json_decode( (string) get_post_meta( $front, '_elementor_data', true ), true );
	$found = array();
	$walk  = function ( $els ) use ( &$walk, &$found ) {
		foreach ( (array) $els as $el ) {
			if ( $found ) {
				return;
			}
			$s = $el['settings'] ?? array();
			if ( ( $s['_element_id'] ?? '' ) === 'book' && ! empty( $s['background_slideshow_gallery'][0]['id'] ) ) {
				$id    = (int) $s['background_slideshow_gallery'][0]['id'];
				$full  = wp_get_attachment_image_src( $id, 'full' );
				$small = wp_get_attachment_image_src( $id, 'medium_large' );
				if ( $full ) {
					$found = array( 'full' => $full[0], 'w' => $full[1], 'small' => $small ? $small[0] : $full[0] );
				}
				return;
			}
			$walk( $el['elements'] ?? array() );
		}
	};
	$walk( $data );
	set_transient( 'bi_hero_first_' . $front, $found, HOUR_IN_SECONDS );
	return $found ?: null;
}
add_action( 'save_post', function ( $id ) { delete_transient( 'bi_hero_first_' . $id ); } );

add_action( 'wp_head', function () {
	if ( ! is_front_page() ) {
		return;
	}
	$img = bi_hero_first_image();
	if ( ! $img ) {
		return;
	}
	// Same file Elementor's slideshow uses, so it is downloaded once and the slide never counts as a later, larger LCP.
	printf( '<link rel="preload" as="image" href="%s" fetchpriority="high">' . "\n", esc_url( $img['full'] ) );
	// Paint the first photo immediately; Elementor's slideshow fades in over it once its script runs.
	printf( '<style>#book{background-color:#122617;background-image:url("%s");background-size:cover;background-position:center}</style>' . "\n",
		esc_url( $img['full'] ) );
}, 2 );

/* ------------------------------------------------------------------ SEO */
function bi_meta_description() {
	$by_slug = array(
		''                     => 'A 21-room boutique hotel on the Lake Superior waterfront in Bayfield, Wisconsin. Lakeview rooms, condos, three restaurants and a rooftop deck, the gateway to the Apostle Islands since 1898.',
		'book'                 => 'Check live availability and book your stay at the Bayfield Inn, Bayfield on the Lake Condos or the Isaac Wing House on Lake Superior.',
		'gallery'              => 'Photos of the Bayfield Inn: rooms, condos, The Deck, The Lounge, the Lakeside Dining Room and the view over Lake Superior.',
		'webcam'               => 'Live webcam from the Bayfield Inn rooftop: the marina, ferry dock and Madeline Island on Lake Superior, with current Bayfield weather.',
		'history'              => 'More than 125 years on Bayfield’s waterfront: from the 1890 Opera House to the Dittus Hotel, Hotel Bayfield and the Bayfield Inn.',
		'the-deck'             => 'The Deck, Bayfield’s only rooftop restaurant and bar. Lunch, dinner and drinks with a view of Lake Superior. See the menu.',
		'lakeside-dining-room' => 'Breakfast and dinner by the water at the Lakeside Dining Room, Bayfield Inn. Fresh Lake Superior whitefish and trout. See the menu.',
		'the-lounge'           => 'The Lounge at the Bayfield Inn: cocktails, local beer, shareables and the game, with Lake Superior just outside. See the menu.',
		'the-creamery'         => 'The Creamery, the Bayfield Inn’s bar across the street: cold pints, pizza, pretzels and live music in Bayfield, Wisconsin.',
		'merchandise'          => 'Bayfield Inn and The Deck sweatshirts, hats and gear. Take a little Bayfield home.',
		'gift-card'            => 'Bayfield Inn gift cards for stays or dining at The Deck, The Lounge and the Lakeside Dining Room. Mailed as a physical card.',
		'employment'           => 'Work on the waterfront: seasonal and year-round jobs at the Bayfield Inn in Bayfield, Wisconsin.',
	);
	if ( is_front_page() ) {
		return $by_slug[''];
	}
	if ( is_page() ) {
		$slug = get_post_field( 'post_name', get_queried_object_id() );
		if ( isset( $by_slug[ $slug ] ) ) {
			return $by_slug[ $slug ];
		}
		$ex = get_the_excerpt( get_queried_object_id() );
		return $ex ? wp_trim_words( $ex, 30, '' ) : $by_slug[''];
	}
	return get_bloginfo( 'description' );
}

add_action( 'wp_head', function () {
	if ( defined( 'WPSEO_VERSION' ) || defined( 'RANK_MATH_VERSION' ) || defined( 'AIOSEO_VERSION' ) || defined( 'SEOPRESS_VERSION' ) ) {
		return; // A dedicated SEO plugin handles this.
	}
	$desc  = bi_meta_description();
	$title = wp_get_document_title();
	$img   = bi_hero_first_image();
	printf( '<meta name="description" content="%s">' . "\n", esc_attr( $desc ) );
	printf( '<meta property="og:type" content="website"><meta property="og:site_name" content="%s"><meta property="og:title" content="%s"><meta property="og:description" content="%s"><meta property="og:url" content="%s">' . "\n",
		esc_attr( get_bloginfo( 'name' ) ), esc_attr( $title ), esc_attr( $desc ), esc_url( is_singular() ? get_permalink() : home_url( '/' ) ) );
	if ( $img ) {
		printf( '<meta property="og:image" content="%s"><meta name="twitter:card" content="summary_large_image">' . "\n", esc_url( $img['full'] ) );
	}
}, 3 );

/* Give the theme's "Skip to content" link a target. */
add_action( 'wp_footer', function () {
	echo '<script>(function(){if(document.getElementById("content"))return;var m=document.querySelector("[data-elementor-type=wp-page],main");if(m){m.id="content";m.setAttribute("tabindex","-1");}})();</script>' . "\n";
}, 99 );

/* ---------------------------------------------------------- lazy loading */
// Logos sit above the fold: lazy-loading them only swaps in a square placeholder that then
// jumps to the real shape (layout shift). Image widgets with class bi-header-logo or bi-no-lazy
// load normally; SiteGround Optimizer skips images marked skip-lazy.
add_filter( 'elementor/widget/render_content', function ( $content, $widget ) {
	if ( 'image' !== $widget->get_name() ) {
		return $content;
	}
	$classes = (string) $widget->get_settings( '_css_classes' );
	if ( ! preg_match( '/\b(bi-header-logo|bi-no-lazy)\b/', $classes ) ) {
		return $content;
	}
	return preg_replace_callback( '/<img\b[^>]*>/', function ( $m ) {
		$tag = str_replace( ' loading="lazy"', '', $m[0] );
		$tag = preg_match( '/\sclass="/', $tag ) ? preg_replace( '/\sclass="/', ' class="skip-lazy ', $tag, 1 ) : str_replace( '<img', '<img class="skip-lazy"', $tag );
		return str_replace( '<img', '<img data-skip-lazy="1"', $tag );
	}, $content );
}, 10, 2 );
add_filter( 'sgo_lazy_load_exclude_classes', function ( $classes ) {
	return array_merge( (array) $classes, array( 'skip-lazy' ) );
} );
add_filter( 'option_siteground_optimizer_excluded_lazy_load_classes', function ( $classes ) {
	return array_values( array_unique( array_merge( (array) $classes, array( 'skip-lazy' ) ) ) );
} );
