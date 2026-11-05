<?php
/**
 * Plugin Name: Magnolia Site Performance
 * Description: Speed, accessibility and SEO tune-ups for the Magnolia Property Care site: self-hosted fonts, hero image preload, lighter WordPress assets, meta descriptions and a working skip link. No settings — keep it active.
 * Version: 1.0.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: Dream Web Digital
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** True on public front-end page views (not admin, editor, previews or feeds). */
function mpc_perf_is_public_view() {
	if ( is_admin() || is_feed() || wp_doing_ajax() || is_customize_preview() ) {
		return false;
	}
	if ( isset( $_GET['elementor-preview'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return false;
	}
	return true;
}

/*
 * 1. Fonts: serve Jost and Marcellus from this plugin instead of Google Fonts
 *    (removes two render-blocking requests to fonts.googleapis.com).
 */
add_filter( 'elementor/frontend/print_google_fonts', '__return_false' );

add_action(
	'wp_head',
	function () {
		$base = plugin_dir_url( __FILE__ ) . 'fonts/';
		?>
<link rel="preload" href="<?php echo esc_url( $base . 'jost-latin.woff2' ); ?>" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="<?php echo esc_url( $base . 'marcellus-latin.woff2' ); ?>" as="font" type="font/woff2" crossorigin>
<style id="mpc-fonts">
@font-face{font-family:'Jost';font-style:normal;font-weight:100 900;font-display:swap;src:url(<?php echo esc_url( $base . 'jost-latin.woff2' ); ?>) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Marcellus';font-style:normal;font-weight:400;font-display:swap;src:url(<?php echo esc_url( $base . 'marcellus-latin.woff2' ); ?>) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
</style>
		<?php
	},
	1
);

/*
 * 2. Hero image: the homepage hero is a CSS background, which browsers find late.
 *    Preload the right size for each screen width with high priority.
 */
add_action(
	'wp_head',
	function () {
		if ( ! mpc_perf_is_public_view() || ! is_singular() ) {
			return;
		}
		$data = json_decode( (string) get_post_meta( get_queried_object_id(), '_elementor_data', true ), true );
		if ( empty( $data[0]['settings']['background_image']['url'] ) ) {
			return;
		}
		$s     = $data[0]['settings'];
		$sizes = array(
			'mobile'  => array( 'background_image_mobile', '(max-width: 767px)' ),
			'tablet'  => array( 'background_image_tablet', '(min-width: 768px) and (max-width: 1024px)' ),
			'desktop' => array( 'background_image', '(min-width: 1025px)' ),
		);
		$fallback = $s['background_image']['url'];
		foreach ( $sizes as $size ) {
			$url = ! empty( $s[ $size[0] ]['url'] ) ? $s[ $size[0] ]['url'] : $fallback;
			printf(
				'<link rel="preload" as="image" href="%s" media="%s" fetchpriority="high">' . "\n",
				esc_url( $url ),
				esc_attr( $size[1] )
			);
		}
	},
	2
);

/*
 * 3. Lighter page: no emoji script, no unused block-editor CSS,
 *    and jQuery loads at the end of the page instead of blocking first paint.
 */
remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
remove_action( 'wp_print_styles', 'print_emoji_styles' );
remove_action( 'wp_enqueue_scripts', 'wp_enqueue_emoji_styles' );

add_action(
	'wp_enqueue_scripts',
	function () {
		if ( ! mpc_perf_is_public_view() ) {
			return;
		}
		foreach ( array( 'wp-block-library', 'wp-block-library-theme', 'global-styles', 'classic-theme-styles' ) as $handle ) {
			wp_dequeue_style( $handle );
		}
		if ( ! is_user_logged_in() ) {
			$scripts = wp_scripts();
			foreach ( array( 'jquery', 'jquery-core', 'jquery-migrate' ) as $handle ) {
				$scripts->add_data( $handle, 'group', 1 );
			}
		}
	},
	100
);

/* Smaller files for the image sizes WordPress generates from WebP uploads. */
add_filter(
	'wp_editor_set_quality',
	function ( $quality, $mime_type = '' ) {
		return 'image/webp' === $mime_type ? 68 : $quality;
	},
	10,
	2
);

/*
 * 4. SEO: a meta description for each page.
 */
function mpc_perf_descriptions() {
	return array(
		'home'     => 'Magnolia Property Care: land clearing, site preparation, landscape development, tree care and property care subscriptions for the North Carolina Piedmont and Southside Virginia. One call, one standard.',
		'about'    => 'Meet Heys McMath, owner of Magnolia Property Care. A licensed and insured outdoor company built on one idea: you should only have to make one call.',
		'services' => 'Landscape development and site preparation, tree care, and property care subscriptions in NC and Southside VA. Forestry mulching, grading, drainage, retaining walls and more.',
		'projects' => 'Recent Magnolia Property Care projects across North Carolina and Virginia: homesite clearing, drainage and retaining walls, treeline clearing, driveways and seasonal property care.',
		'contact'  => 'Request an estimate from Magnolia Property Care. Call (336) 583-9398 or send a few details and Heys will reach out within one business day to schedule a site visit.',
	);
}

add_action(
	'wp_head',
	function () {
		if ( ! mpc_perf_is_public_view() ) {
			return;
		}
		$descriptions = mpc_perf_descriptions();
		$pages        = (array) get_option( 'magnolia_importer_page_ids', array() );
		$text         = '';
		if ( is_front_page() ) {
			$text = $descriptions['home'];
		} elseif ( is_page() ) {
			$key  = array_search( get_queried_object_id(), array_map( 'intval', $pages ), true );
			$text = ( false !== $key && isset( $descriptions[ $key ] ) ) ? $descriptions[ $key ] : '';
		}
		if ( '' === $text ) {
			$text = get_bloginfo( 'description' );
		}
		if ( $text ) {
			echo '<meta name="description" content="' . esc_attr( $text ) . '">' . "\n";
		}
	},
	3
);

/*
 * 5. Accessibility: give Hello Elementor's "Skip to content" link a target on
 *    Elementor full-width pages, which don't have a #content element.
 */
add_action(
	'elementor/page_templates/header-footer/before_content',
	function () {
		echo '<div id="content" tabindex="-1"></div>';
	}
);
