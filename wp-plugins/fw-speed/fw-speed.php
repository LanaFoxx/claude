<?php
/**
 * Plugin Name: Framework Speed
 * Description: Front-end performance: self-hosted fonts, inlined CSS, deferred JS, delayed third-party trackers. Deactivate to revert instantly.
 * Version: 1.4.0
 * Author: Dream Web Digital
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'FWS_VERSION', '1.4.0' );
require_once __DIR__ . '/purge.php';

/** Stylesheet handles dropped entirely (unused on the front end). */
function fws_drop_css_ids() {
	return array( 'wp-components-css', 'wp-theme-css' ); // wp-theme-css = admin design tokens (--wpds-*), unused by front-end CSS.
}

/** Image URL replacements applied to inlined CSS (original => optimized). */
function fws_image_map() {
	return (array) get_option( 'fws_image_map', array() );
}

function fws_should_run() {
	if ( is_admin() || wp_doing_ajax() || wp_doing_cron() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return false;
	}
	if ( is_user_logged_in() || is_customize_preview() || is_feed() || is_embed() ) {
		return false;
	}
	if ( isset( $_GET['elementor-preview'] ) || isset( $_GET['fws_off'] ) ) { // phpcs:ignore
		return false;
	}
	return true;
}

/* Remove emoji detection script/styles. */
add_action( 'init', function () {
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'wp_enqueue_scripts', 'wp_enqueue_emoji_styles' );
	remove_action( 'wp_footer', 'wp_print_emoji_detection_script' );
	add_filter( 'emoji_svg_url', '__return_false' );
} );

/* Stop Elementor from requesting Google Fonts (we self-host what is used). */
add_filter( 'elementor/frontend/print_google_fonts', function ( $print ) {
	return fws_should_run() ? false : $print;
} );

/* Self-hosted @font-face + preload, printed first in <head>. */
add_action( 'wp_head', function () {
	if ( ! fws_should_run() ) {
		return;
	}
	$base = plugins_url( 'fonts/', __FILE__ );
	echo '<link rel="preload" href="' . esc_url( $base . 'montserrat-latin-var.woff2' ) . '" as="font" type="font/woff2" crossorigin>' . "\n";
	echo '<style id="fws-fonts">'
		. "@font-face{font-family:'Montserrat';font-style:normal;font-weight:100 900;font-display:swap;src:url({$base}montserrat-latin-var.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}"
		. "@font-face{font-family:'Montserrat';font-style:italic;font-weight:600;font-display:swap;src:url({$base}montserrat-latin-600i.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}"
		. "@font-face{font-family:'Roboto';font-style:normal;font-weight:400;font-display:swap;src:url({$base}roboto-latin-400.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}"
		// Skip rendering work for sections well below the fold until they approach the viewport.
		. '[data-elementor-type="wp-page"]>.e-con.e-parent:nth-child(n+4){content-visibility:auto;contain-intrinsic-size:auto 900px}'
		. "</style>\n";
}, 1 );

/* Output buffer for the whole front-end document. */
add_action( 'template_redirect', function () {
	if ( fws_should_run() ) {
		ob_start( 'fws_process_html' );
	}
}, 9999 );

function fws_url_to_path( $url, $ext = 'css' ) {
	$url  = html_entity_decode( $url );
	$url  = preg_replace( '/[?#].*$/', '', $url );
	$url  = preg_replace( '#^https?:#', '', $url );
	$home = preg_replace( '#^https?:#', '', site_url( '/' ) );
	if ( 0 !== strpos( $url, $home ) ) {
		return false;
	}
	$rel  = substr( $url, strlen( $home ) );
	$path = wp_normalize_path( ABSPATH . $rel );
	if ( false !== strpos( $rel, '..' ) || ! preg_match( '/\.' . $ext . '$/', $path ) || ! is_readable( $path ) ) {
		return false;
	}
	return $path;
}

function fws_absolutize_css( $css, $href ) {
	$dir = preg_replace( '#[^/]*$#', '', preg_replace( '/[?#].*$/', '', html_entity_decode( $href ) ) );
	$css = preg_replace_callback( '/url\(\s*([\'"]?)([^\'")]+)\1\s*\)/i', function ( $m ) use ( $dir ) {
		$u = trim( $m[2] );
		if ( preg_match( '#^(data:|https?:|//|\#)#i', $u ) ) {
			return 'url(' . $m[1] . $u . $m[1] . ')';
		}
		if ( '/' === $u[0] ) {
			return 'url(' . $m[1] . $u . $m[1] . ')';
		}
		$abs = $dir . $u;
		// Collapse ../ segments.
		$parts = parse_url( $abs );
		$segs  = array();
		foreach ( explode( '/', $parts['path'] ) as $s ) {
			if ( '..' === $s ) {
				array_pop( $segs );
			} elseif ( '.' !== $s ) {
				$segs[] = $s;
			}
		}
		$abs = ( isset( $parts['scheme'] ) ? $parts['scheme'] . '://' : '//' ) . $parts['host'] . implode( '/', $segs ) . ( isset( $parts['query'] ) ? '?' . $parts['query'] : '' );
		return 'url(' . $m[1] . $abs . $m[1] . ')';
	}, $css );
	return $css;
}

function fws_minify_css( $css ) {
	$css = preg_replace( '#/\*(?!!).*?\*/#s', '', $css );
	$css = preg_replace( '/\s+/', ' ', $css );
	$css = preg_replace( '/\s*([{};,>])\s*/', '$1', $css );
	$css = str_replace( ';}', '}', $css );
	return trim( $css );
}

function fws_attr( $tag, $name ) {
	if ( preg_match( '/\s' . $name . '\s*=\s*([\'"])(.*?)\1/is', $tag, $m ) ) {
		return $m[2];
	}
	return null;
}

function fws_process_html( $html ) {
	if ( false === stripos( $html, '<html' ) || false === stripos( $html, '</head>' ) ) {
		return $html;
	}
	$imgmap = fws_image_map();

	/* ---------- CSS ---------- */
	$html = preg_replace_callback( '#<link\b[^>]*>#i', function ( $m ) use ( $imgmap ) {
		$tag = $m[0];
		$rel = strtolower( (string) fws_attr( $tag, 'rel' ) );
		$href = (string) fws_attr( $tag, 'href' );
		// Drop font CSS from third-party hosts and their preconnect/dns hints.
		if ( preg_match( '#(fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.(com|net)|p\.typekit\.net)#i', $href ) ) {
			if ( in_array( $rel, array( 'stylesheet', 'preconnect', 'dns-prefetch', 'preload' ), true ) ) {
				return '';
			}
		}
		if ( 'stylesheet' !== $rel ) {
			return $tag;
		}
		$id = (string) fws_attr( $tag, 'id' );
		if ( in_array( $id, fws_drop_css_ids(), true ) ) {
			return '';
		}
		$path = fws_url_to_path( $href );
		if ( ! $path ) {
			return $tag;
		}
		$key = 'fws_css_' . md5( $href . '|' . filemtime( $path ) . '|' . FWS_VERSION . '|' . md5( wp_json_encode( $imgmap ) ) );
		$css = get_transient( $key );
		if ( false === $css ) {
			$css = file_get_contents( $path ); // phpcs:ignore
			$css = preg_replace( '/^\xEF\xBB\xBF/', '', $css );
			$css = preg_replace( '/@charset\s+[^;]+;/i', '', $css );
			$css = fws_absolutize_css( $css, $href );
			if ( $imgmap ) {
				$css = strtr( $css, $imgmap );
			}
			$css = fws_minify_css( $css );
			set_transient( $key, $css, WEEK_IN_SECONDS );
		}
		$media = fws_attr( $tag, 'media' );
		if ( $media && 'all' !== strtolower( $media ) ) {
			$css = '@media ' . $media . '{' . $css . '}';
		}
		return '<style id="' . esc_attr( $id ? $id : 'fws-inline' ) . '">' . $css . '</style>';
	}, $html );

	/* Elementor writes @import for Google fonts in some cases. */
	$html = preg_replace( '#@import\s+url\([\'"]?https://fonts\.googleapis\.com[^)]*\)\s*;?#i', '', $html );

	/* Emoji detection (WP 6.9+ prints it as JSON + module). */
	$html = preg_replace( '#<script[^>]*id=["\']wp-emoji-settings["\'][^>]*>.*?</script>\s*<script type="module">.*?</script>#is', '', $html );

	/* ---------- JS ---------- */
	$html = preg_replace_callback( '#<script\b([^>]*)>(.*?)</script>#is', function ( $m ) {
		$attrs = $m[1];
		$body  = $m[2];
		$type  = strtolower( (string) fws_attr( '<x ' . $attrs . '>', 'type' ) );
		$src   = fws_attr( '<x ' . $attrs . '>', 'src' );
		$id    = (string) fws_attr( '<x ' . $attrs . '>', 'id' );

		if ( $type && ! in_array( $type, array( 'text/javascript', 'application/javascript' ), true ) ) {
			return $m[0]; // json, module, speculationrules, ld+json...
		}

		// GoDaddy traffic/RUM scripts: delay until user interaction.
		if ( ( $src && preg_match( '#img1\.wsimg\.com#i', $src ) ) || ( ! $src && false !== strpos( $body, 'wsimg.com' ) ) || ( ! $src && false !== strpos( $body, '_trfq' ) ) ) {
			if ( $src ) {
				return '<script type="fws/delay" data-src="' . esc_attr( $src ) . '"></script>';
			}
			return '<script type="fws/delay">' . $body . '</script>';
		}

		// Non-critical JS: queued and executed in original order right after window load.
		if ( $src ) {
			if ( preg_match( '/\s(async)\b/i', $attrs ) ) {
				return $m[0];
			}
			$attrs = preg_replace( '/\s(src|defer|type)(\s*=\s*([\'"]).*?\3)?/is', '', $attrs );
			return '<script type="fws/lazy" data-src="' . esc_attr( $src ) . '"' . $attrs . '></script>';
		}
		if ( preg_match( '/-js-(before|after|extra)$/', $id ) || false !== strpos( $body, 'jQuery' ) ) {
			return '<script type="fws/lazy"' . preg_replace( '/\stype\s*=\s*([\'"]).*?\1/i', '', $attrs ) . '>' . $body . '</script>';
		}
		return $m[0];
	}, $html );

	/* Unused CSS removal (skip with ?fws_nopurge for debugging). */
	if ( ! isset( $_GET['fws_nopurge'] ) ) { // phpcs:ignore
		$html = fws_purge_document( $html );
	}

	/* Loader: non-critical JS runs on first user interaction (clicks made meanwhile are replayed). */
	static $loader = null;
	if ( null === $loader ) {
		$loader = (string) file_get_contents( __DIR__ . '/loader.js' ); // phpcs:ignore
		$loader = preg_replace( '/\n\s*/', '', $loader );
	}
	$html = preg_replace( '#</body>#i', '<script id="fws-loader">' . $loader . '</script></body>', $html, 1 );

	return $html;
}

/* Clear cached CSS on Elementor regeneration / plugin updates. */
function fws_flush() {
	global $wpdb;
	$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\_transient\_fws\_css\_%' OR option_name LIKE '\_transient\_timeout\_fws\_css\_%'" ); // phpcs:ignore
}
add_action( 'elementor/core/files/clear_cache', 'fws_flush' );
add_action( 'upgrader_process_complete', 'fws_flush' );
register_activation_hook( __FILE__, 'fws_flush' );
register_deactivation_hook( __FILE__, 'fws_flush' );
