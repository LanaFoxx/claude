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
	// Site-wide accessibility touches (front.css only loads on pages with Bayfield widgets):
	// a solid color under gradient buttons, which is what contrast checkers measure, and
	// underlined links inside paragraphs so they don't rely on color alone.
	echo '<style id="bi-a11y">.bi-btn-dark .elementor-button:not(:hover):not(:focus){background-color:#17301B!important}'
		. '.bi-btn-light .elementor-button:not(:hover):not(:focus){background-color:#F5F2EC!important}'
		. '.elementor-widget-text-editor a:not(.elementor-button),.bi-menu__fine a{text-decoration:underline;text-underline-offset:2px}</style>' . "\n";
}, 1 );

/** First photo of the homepage hero slideshow (container #book), from the page's Elementor data. */
function bi_hero_first_image() {
	$front = (int) get_option( 'page_on_front' );
	if ( ! $front ) {
		return null;
	}
	$cached = get_transient( 'bi_hero_first2_' . $front );
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
					$found = array( 'full' => $full[0], 'w' => $full[1], 'small' => $small ? $small[0] : $full[0], 'slides' => array() );
					// Phone-sized (1536px) version of every slide. 1536px still covers a phone-width hero
					// without being enlarged, so the slide never counts as a bigger, later LCP.
					foreach ( $s['background_slideshow_gallery'] as $g ) {
						$f = wp_get_attachment_image_src( (int) $g['id'], 'full' );
						$m = wp_get_attachment_image_src( (int) $g['id'], '1536x1536' );
						if ( $f && $m && $m[1] < $f[1] ) {
							$found['slides'][] = array( basename( $f[0] ), $m[0] );
						}
					}
				}
				return;
			}
			$walk( $el['elements'] ?? array() );
		}
	};
	$walk( $data );
	set_transient( 'bi_hero_first2_' . $front, $found, HOUR_IN_SECONDS );
	return $found ?: null;
}
add_action( 'save_post', function ( $id ) { delete_transient( 'bi_hero_first2_' . $id ); } );

add_action( 'wp_head', function () {
	if ( ! is_front_page() ) {
		return;
	}
	$img = bi_hero_first_image();
	if ( ! $img ) {
		return;
	}
	// Same file Elementor's slideshow uses, so it is downloaded once and the slide never counts as a later, larger LCP.
	$first_small = '';
	$css         = '';
	foreach ( $img['slides'] ?? array() as $i => $sl ) {
		if ( 0 === $i ) {
			$first_small = $sl[1];
		}
		$css .= '.elementor-background-slideshow__slide__image[style*="' . esc_attr( $sl[0] ) . '"]{background-image:url("' . esc_url( $sl[1] ) . '") !important}';
	}
	if ( $first_small ) {
		printf( '<link rel="preload" as="image" href="%s" media="(max-width: 767px)" fetchpriority="high">' . "\n", esc_url( $first_small ) );
		printf( '<link rel="preload" as="image" href="%s" media="(min-width: 768px)" fetchpriority="high">' . "\n", esc_url( $img['full'] ) );
	} else {
		printf( '<link rel="preload" as="image" href="%s" fetchpriority="high">' . "\n", esc_url( $img['full'] ) );
	}
	// Paint the first photo immediately; Elementor's slideshow fades in over it once its script runs.
	printf( '<style>#book{background-color:#122617;background-image:url("%s");background-size:cover;background-position:center}%s</style>' . "\n",
		esc_url( $img['full'] ), $first_small ? '@media (max-width: 767px){#book{background-image:url("' . esc_url( $first_small ) . '")}' . $css . '}' : '' );
}, 2 );

/**
 * Interior pages: the hero photo is a CSS background, which browsers only find after the
 * stylesheet loads. Preload it (phones get the 1024px version instead of the full original)
 * so it starts downloading straight away. Only looks inside the page's first section.
 */
function bi_page_hero( $post_id ) {
	$cached = get_transient( 'bi_hero_' . $post_id );
	if ( is_array( $cached ) ) {
		return $cached ?: null;
	}
	$data  = json_decode( (string) get_post_meta( $post_id, '_elementor_data', true ), true );
	$found = array();
	$walk  = function ( $els ) use ( &$walk, &$found ) {
		foreach ( (array) $els as $el ) {
			if ( $found ) {
				return;
			}
			$s  = $el['settings'] ?? array();
			$id = (int) ( $s['background_image']['id'] ?? 0 );
			if ( 'classic' === ( $s['background_background'] ?? '' ) && $id ) {
				$full  = wp_get_attachment_image_src( $id, 'full' );
				$large = wp_get_attachment_image_src( $id, 'large' );
				if ( $full ) {
					$found = array( 'el' => (string) $el['id'], 'full' => $s['background_image']['url'] ?: $full[0], 'small' => ( $large && $large[1] < $full[1] ) ? $large[0] : '' );
				}
				return;
			}
			$walk( $el['elements'] ?? array() );
		}
	};
	if ( is_array( $data ) && $data ) {
		$walk( array( $data[0] ) ); // first section only (above the fold)
	}
	set_transient( 'bi_hero_' . $post_id, $found, DAY_IN_SECONDS );
	return $found ?: null;
}
add_action( 'save_post', function ( $id ) { delete_transient( 'bi_hero_' . $id ); } );
add_action( 'elementor/document/after_save', function ( $doc ) { delete_transient( 'bi_hero_' . $doc->get_main_id() ); } );

add_action( 'wp_head', function () {
	if ( is_front_page() || ! is_singular() ) {
		return;
	}
	$h = bi_page_hero( get_queried_object_id() );
	if ( ! $h ) {
		return;
	}
	if ( $h['small'] ) {
		printf( '<link rel="preload" as="image" href="%s" media="(max-width: 767px)" fetchpriority="high">' . "\n", esc_url( $h['small'] ) );
		printf( '<link rel="preload" as="image" href="%s" media="(min-width: 768px)" fetchpriority="high">' . "\n", esc_url( $h['full'] ) );
		printf( '<style>@media (max-width: 767px){.elementor .elementor-element.elementor-element-%s{background-image:url("%s") !important}}</style>' . "\n",
			esc_attr( $h['el'] ), esc_url( $h['small'] ) );
	} else {
		printf( '<link rel="preload" as="image" href="%s" fetchpriority="high">' . "\n", esc_url( $h['full'] ) );
	}
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
	// Tell the browser how wide the image really shows (fixed-width images like logos), so phones
	// download a small file instead of one sized for the whole screen.
	$w = array();
	foreach ( array( '' => '', '_tablet' => '(max-width: 1024px) ', '_mobile' => '(max-width: 767px) ' ) as $suffix => $mq ) {
		$cw = $widget->get_settings( '_element_custom_width' . $suffix );
		if ( 'initial' === $widget->get_settings( '_element_width' ) && ! empty( $cw['size'] ) && 'px' === ( $cw['unit'] ?? 'px' ) ) {
			$w[ $suffix ] = $mq . (int) $cw['size'] . 'px';
		}
	}
	if ( isset( $w[''] ) ) {
		$sizes   = trim( implode( ', ', array_filter( array( $w['_mobile'] ?? '', $w['_tablet'] ?? '' ) ) ) . ', ' . $w[''], ', ' );
		$content = preg_replace( '/\ssizes="[^"]*"/', ' sizes="' . esc_attr( $sizes ) . '"', $content );
	}
	$classes = (string) $widget->get_settings( '_css_classes' );
	// WordPress marks the page's main image fetchpriority="high"; never lazy-load that one either.
	if ( ! preg_match( '/\b(bi-header-logo|bi-no-lazy)\b/', $classes ) && false === strpos( $content, 'fetchpriority="high"' ) ) {
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

/* --------------------------------------------------------- cache safety */
// SiteGround combines CSS into one cached file. When an Elementor page is saved (or Elementor
// regenerates its CSS), clear SiteGround's cache so no visitor gets a page pointing at old styles.
function bi_purge_sg_cache() {
	if ( function_exists( 'sg_cachepress_purge_everything' ) ) {
		sg_cachepress_purge_everything();
	} elseif ( function_exists( 'sg_cachepress_purge_cache' ) ) {
		sg_cachepress_purge_cache();
	}
}
add_action( 'elementor/document/after_save', 'bi_purge_sg_cache' );
add_action( 'elementor/core/files/clear_cache', 'bi_purge_sg_cache' );
// WordPress marks the main image on the page fetchpriority="high" while filtering the content
// (after widgets render). Keep that image out of SiteGround's lazy loading.
add_filter( 'wp_content_img_tag', function ( $tag ) {
	if ( false === strpos( $tag, 'fetchpriority="high"' ) || false !== strpos( $tag, 'skip-lazy' ) ) {
		return $tag;
	}
	$tag = str_replace( ' loading="lazy"', '', $tag );
	$tag = preg_match( '/\sclass="/', $tag ) ? preg_replace( '/\sclass="/', ' class="skip-lazy ', $tag, 1 ) : str_replace( '<img', '<img class="skip-lazy"', $tag );
	return str_replace( '<img', '<img data-skip-lazy="1"', $tag );
}, 20 );
