<?php
/**
 * Plugin Name: RecordFLOW Performance
 * Description: Page-speed tweaks for myrecordflow.com. Google Analytics (Site Kit) loads on the visitor's first interaction, reCAPTCHA loads when a visitor starts using a form, jQuery loads in the footer without jQuery Migrate, the brand fonts and each page's main image are preloaded, resized WebP images are saved at quality 70, and the WordPress emoji script is removed. Deactivate to undo.
 * Version: 1.3.1
 * Author: Dream Web Digital
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Script handles to hold back, and what releases them:
 * "interaction" = first scroll, tap, click, key press or mouse move; "form" = first focus or tap inside a form.
 */
function rf_perf_delayed_scripts() {
	return array(
		'google_gtagjs'              => 'interaction', // Site Kit: Google tag / GA4.
		'elementor-recaptcha_v3-api' => 'form',        // Elementor Pro form reCAPTCHA v3.
		'elementor-recaptcha-api'    => 'form',        // Elementor Pro form reCAPTCHA v2.
	);
}

function rf_perf_is_frontend() {
	if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return false;
	}
	// Leave the Elementor editor and preview alone.
	if ( isset( $_GET['elementor-preview'] ) || isset( $_GET['elementor_library'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
		return false;
	}
	return true;
}

// Turn the external <script src> into an inert placeholder; inline config around it is left as is.
add_filter(
	'script_loader_tag',
	function ( $tag, $handle ) {
		$delayed = rf_perf_delayed_scripts();
		if ( ! isset( $delayed[ $handle ] ) || ! rf_perf_is_frontend() ) {
			return $tag;
		}
		$pattern = '#<script([^>]*)\sid=(["\'])' . preg_quote( $handle, '#' ) . '-js\2([^>]*)>#';
		return preg_replace_callback(
			$pattern,
			function ( $m ) use ( $handle, $delayed ) {
				$attrs = $m[1] . $m[3];
				$attrs = preg_replace( '#\s(type|async|defer)(=(["\'])[^"\']*\3)?(?=[\s>]|$)#', '', $attrs );
				$attrs = preg_replace( '#\ssrc=#', ' data-rf-src=', $attrs );
				return '<script type="text/plain" data-rf-delay="' . esc_attr( $delayed[ $handle ] ) . '" id="' . esc_attr( $handle ) . '-js"' . $attrs . '>';
			},
			$tag,
			1
		);
	},
	20,
	2
);

// Loader that releases the held scripts.
add_action(
	'wp_footer',
	function () {
		if ( ! rf_perf_is_frontend() ) {
			return;
		}
		?>
<script id="rf-perf-loader">
(function () {
	function release(kind) {
		document.querySelectorAll('script[type="text/plain"][data-rf-delay="' + kind + '"]').forEach(function (ph) {
			var s = document.createElement('script');
			s.src = ph.getAttribute('data-rf-src');
			s.async = true;
			s.id = ph.id;
			ph.parentNode.replaceChild(s, ph);
		});
	}
	var events = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel', 'mousemove'];
	function onFirst() {
		events.forEach(function (e) { window.removeEventListener(e, onFirst, { passive: true }); });
		release('interaction');
	}
	events.forEach(function (e) { window.addEventListener(e, onFirst, { passive: true }); });
	function onForm(e) {
		if (e.target && e.target.closest && e.target.closest('form')) {
			document.removeEventListener('focusin', onForm, true);
			document.removeEventListener('pointerdown', onForm, true);
			release('form');
		}
	}
	document.addEventListener('focusin', onForm, true);
	document.addEventListener('pointerdown', onForm, true);
})();
</script>
		<?php
	},
	99
);

// Remove the emoji detection script and styles (modern browsers render emoji natively).
add_action(
	'init',
	function () {
		remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
		remove_action( 'wp_print_styles', 'print_emoji_styles' );
		remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
		remove_action( 'admin_print_styles', 'print_emoji_styles' );
		remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
		remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
		remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );
	}
);

// Load jQuery in the footer without jQuery Migrate, so it no longer blocks the first paint.
// Nothing on the site prints inline jQuery in <head>; Elementor's scripts all load in the footer.
add_action(
	'wp_default_scripts',
	function ( $scripts ) {
		if ( ! rf_perf_is_frontend() || ! isset( $scripts->registered['jquery'] ) ) {
			return;
		}
		$scripts->registered['jquery']->deps = array( 'jquery-core' );
		foreach ( array( 'jquery', 'jquery-core' ) as $handle ) {
			$scripts->add_data( $handle, 'group', 1 );
		}
	},
	20
);

/**
 * Preload the "latin, normal style" files of the brand fonts that Elementor hosts locally,
 * so headings and body text don't swap fonts (and shift the layout) after first paint.
 */
function rf_perf_font_preloads() {
	$uploads = wp_get_upload_dir();
	$dir     = trailingslashit( $uploads['basedir'] ) . 'elementor/google-fonts/css/';
	$urls    = array();
	foreach ( array( 'figtree', 'saira' ) as $family ) {
		$file = $dir . $family . '.css';
		if ( ! is_readable( $file ) ) {
			continue;
		}
		$css = file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		if ( preg_match_all( '#/\*\s*latin\s*\*/\s*@font-face\s*\{([^}]*)\}#', $css, $blocks ) ) {
			foreach ( $blocks[1] as $block ) {
				if ( preg_match( '#font-style:\s*normal#', $block ) && preg_match( '#url\(([^)]+\.woff2)\)#', $block, $m ) ) {
					$urls[] = trim( $m[1], " '\"" );
				}
			}
		}
	}
	return array_values( array_unique( $urls ) );
}

add_action(
	'wp_head',
	function () {
		if ( ! rf_perf_is_frontend() ) {
			return;
		}
		$urls = get_transient( 'rf_perf_font_preloads' );
		if ( false === $urls ) {
			$urls = rf_perf_font_preloads();
			set_transient( 'rf_perf_font_preloads', $urls, DAY_IN_SECONDS );
		}
		foreach ( (array) $urls as $url ) {
			printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( $url ) );
		}
	},
	1
);

/**
 * The largest above-the-fold image on each page (page ID => attachment ID). It is preloaded with
 * high priority and never lazy-loaded, so it paints sooner (Largest Contentful Paint).
 * Update this list if a page's top image is replaced in Elementor.
 */
function rf_perf_lcp_images() {
	return apply_filters(
		'rf_perf_lcp_images',
		array(
			27   => 2306, // Home: hero composite.
			57   => 2306, // Product Overview: hero composite.
			1925 => 2307, // FlowSENSE: app phone mockup.
			736  => 2309, // About Us: canal + app graphic.
		)
	);
}

function rf_perf_current_lcp_image() {
	if ( ! rf_perf_is_frontend() ) {
		return 0;
	}
	$map = rf_perf_lcp_images();
	$id  = is_front_page() ? (int) get_option( 'page_on_front' ) : get_queried_object_id();
	return isset( $map[ $id ] ) ? (int) $map[ $id ] : 0;
}

// Preload the page's main image from <head>, before any CSS or script is parsed.
add_action(
	'wp_head',
	function () {
		$image = rf_perf_current_lcp_image();
		if ( ! $image || ! wp_attachment_is_image( $image ) ) {
			return;
		}
		$srcset = wp_get_attachment_image_srcset( $image, 'full' );
		$sizes  = wp_get_attachment_image_sizes( $image, 'full' );
		$src    = wp_get_attachment_image_url( $image, 'full' );
		printf(
			'<link rel="preload" as="image" href="%s"%s%s fetchpriority="high">' . "\n",
			esc_url( $src ),
			$srcset ? ' imagesrcset="' . esc_attr( $srcset ) . '"' : '',
			$sizes ? ' imagesizes="' . esc_attr( $sizes ) . '"' : ''
		);
	},
	2
);

// On the page itself: the main image gets fetchpriority=high and no lazy-loading; any other image
// marked "high" (Elementor marks the header logo) gives it up. Done on the final HTML because Elementor
// renders and caches widget markup outside the usual image filters.
add_action(
	'template_redirect',
	function () {
		$image = rf_perf_current_lcp_image();
		if ( ! $image ) {
			return;
		}
		ob_start(
			function ( $html ) use ( $image ) {
				if ( ! is_string( $html ) || false === stripos( $html, '<img' ) ) {
					return $html;
				}
				$done = false;
				return preg_replace_callback(
					'#<img\b[^>]*>#i',
					function ( $m ) use ( $image, &$done ) {
						$tag   = $m[0];
						$is_lcp = ! $done && preg_match( '#\bwp-image-' . $image . '\b#', $tag );
						$tag   = preg_replace( '#\sfetchpriority=(["\'])[^"\']*\1#i', '', $tag );
						if ( $is_lcp ) {
							$done = true;
							$tag  = preg_replace( '#\sloading=(["\'])lazy\1#i', '', $tag );
							$tag  = preg_replace( '#^<img\b#i', '<img fetchpriority="high"', $tag );
						}
						return $tag;
					},
					$html
				);
			}
		);
	},
	0
);

// Resized copies WordPress makes of WebP uploads: quality 70 instead of the default 86 (much smaller
// files, no visible difference at display size). Applies to new uploads.
add_filter(
	'wp_editor_set_quality',
	function ( $quality, $mime_type ) {
		return 'image/webp' === $mime_type ? 70 : $quality;
	},
	10,
	2
);
