<?php
/**
 * Conservative unused-CSS removal.
 * A rule is dropped only when, for EVERY selector in its list, some class it requires
 * does not occur anywhere in the page markup/inline scripts and is not on the safelist
 * of classes Elementor/Swiper/SmartMenus add at runtime.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function fws_purge_safelist_re() {
	return '/^(swiper|elementor-(device|sticky|motion|invisible|animation|lightbox|slideshow|item-active|active)|e--|sm-|has-submenu|highlighted|sub-arrow|animated|dialog|fws-)/i';
}

/** Split CSS into top-level chunks: [ 'prelude' => ..., 'body' => ... ] or [ 'raw' => ';-terminated at-rule' ]. */
function fws_css_blocks( $css ) {
	$out = array();
	$len = strlen( $css );
	$i   = 0;
	while ( $i < $len ) {
		// find next { or ; at depth 0 (respect strings)
		$start = $i;
		$q     = '';
		$paren = 0;
		while ( $i < $len ) {
			$c = $css[ $i ];
			if ( $q ) {
				if ( '\\' === $c ) { $i += 2; continue; }
				if ( $c === $q ) { $q = ''; }
			} elseif ( '"' === $c || "'" === $c ) {
				$q = $c;
			} elseif ( '(' === $c ) {
				$paren++;
			} elseif ( ')' === $c ) {
				$paren--;
			} elseif ( 0 === $paren && ( '{' === $c || ';' === $c || '}' === $c ) ) {
				break;
			}
			$i++;
		}
		if ( $i >= $len ) {
			$rest = trim( substr( $css, $start ) );
			if ( '' !== $rest ) { $out[] = array( 'raw' => $rest ); }
			break;
		}
		$c = $css[ $i ];
		if ( ';' === $c || '}' === $c ) {
			$raw = trim( substr( $css, $start, $i - $start + 1 ) );
			if ( '}' !== $raw && '' !== $raw && ';' !== $raw ) { $out[] = array( 'raw' => $raw ); }
			$i++;
			continue;
		}
		$prelude = trim( substr( $css, $start, $i - $start ) );
		// find matching }
		$depth = 1;
		$j     = $i + 1;
		$q     = '';
		while ( $j < $len && $depth > 0 ) {
			$c = $css[ $j ];
			if ( $q ) {
				if ( '\\' === $c ) { $j += 2; continue; }
				if ( $c === $q ) { $q = ''; }
			} elseif ( '"' === $c || "'" === $c ) {
				$q = $c;
			} elseif ( '{' === $c ) {
				$depth++;
			} elseif ( '}' === $c ) {
				$depth--;
			}
			$j++;
		}
		$out[] = array( 'prelude' => $prelude, 'body' => substr( $css, $i + 1, $j - $i - 2 ) );
		$i     = $j;
	}
	return $out;
}

function fws_selector_may_match( $sel, $tokens, $safe ) {
	if ( preg_match( '/:(host|slotted)/i', $sel ) ) {
		return true;
	}
	// Remove functional pseudo-class arguments (:not/:is/:where/:has/:nth-*(... of ...)); classes
	// outside them are still required, classes inside them are not evaluated (conservative).
	$prev = null;
	while ( $prev !== $sel ) {
		$prev = $sel;
		$sel  = preg_replace( '/:[a-z-]+\((?:[^()]|\([^()]*\))*\)/i', ' ', $sel );
	}
	$sel = preg_replace( '/\[[^\]]*\]/', '', $sel ); // attribute values may contain dots
	if ( ! preg_match_all( '/\.(-?[_a-zA-Z][\w-]*(?:\\\\.[\w-]*)*)/', $sel, $m ) ) {
		return true;
	}
	foreach ( $m[1] as $cls ) {
		$cls = stripslashes( $cls );
		if ( isset( $tokens[ $cls ] ) || preg_match( $safe, $cls ) ) {
			continue;
		}
		return false;
	}
	return true;
}

function fws_purge_css( $css, $tokens ) {
	$safe = fws_purge_safelist_re();
	$out  = '';
	foreach ( fws_css_blocks( $css ) as $b ) {
		if ( isset( $b['raw'] ) ) {
			$out .= $b['raw'];
			continue;
		}
		$p = $b['prelude'];
		if ( '@' === substr( $p, 0, 1 ) ) {
			if ( preg_match( '/^@(media|supports|container|layer|document)\b/i', $p ) ) {
				$inner = fws_purge_css( $b['body'], $tokens );
				if ( '' !== trim( $inner ) ) {
					$out .= $p . '{' . $inner . '}';
				}
			} else {
				$out .= $p . '{' . $b['body'] . '}'; // keyframes, font-face, page, property...
			}
			continue;
		}
		if ( false !== strpos( $b['body'], '{' ) ) { // nested CSS: keep as-is
			$out .= $p . '{' . $b['body'] . '}';
			continue;
		}
		$keep = array();
		foreach ( preg_split( '/,(?![^(]*\))/', $p ) as $sel ) {
			if ( fws_selector_may_match( $sel, $tokens, $safe ) ) {
				$keep[] = trim( $sel );
			}
		}
		if ( $keep ) {
			$out .= implode( ',', $keep ) . '{' . $b['body'] . '}';
		}
	}
	return $out;
}

/** Purge every large <style> block in the document against the page's own tokens. */
function fws_purge_document( $html ) {
	$noStyle = preg_replace( '#<style\b[^>]*>.*?</style>#is', ' ', $html );
	preg_match_all( '/[_a-zA-Z][\w-]*/', $noStyle, $m );
	$tokens = array_flip( array_unique( $m[0] ) );
	// Classes added at runtime by the page's own scripts appear as string tokens in those files.
	if ( preg_match_all( '#data-src="([^"]+\.js[^"]*)"|<script[^>]+src="([^"]+\.js[^"]*)"#i', $html, $sm ) ) {
		$srcs = array_filter( array_merge( $sm[1], $sm[2] ) );
		sort( $srcs );
		$jkey = 'fws_css_js_' . md5( implode( '|', $srcs ) . FWS_VERSION );
		$jt   = get_transient( $jkey );
		if ( false === $jt ) {
			$jt = array();
			foreach ( $srcs as $src ) {
				$path = fws_url_to_path( $src, 'js' );
				if ( $path ) {
					preg_match_all( '/[_a-zA-Z][\w-]*/', (string) file_get_contents( $path ), $jm ); // phpcs:ignore
					$jt = array_merge( $jt, array_unique( $jm[0] ) );
				}
			}
			$jt = array_values( array_unique( $jt ) );
			set_transient( $jkey, $jt, WEEK_IN_SECONDS );
		}
		$tokens += array_flip( $jt );
	}
	$sig    = md5( implode( ' ', array_keys( $tokens ) ) );
	return preg_replace_callback( '#<style\b([^>]*)>(.*?)</style>#is', function ( $s ) use ( $tokens, $sig ) {
		if ( strlen( $s[2] ) < 3000 || false !== strpos( $s[1], 'fws-fonts' ) ) {
			return $s[0];
		}
		$key = 'fws_css_p_' . md5( $s[2] . $sig . FWS_VERSION );
		$css = get_transient( $key );
		if ( false === $css ) {
			$src = preg_replace( '#/\*.*?\*/#s', '', $s[2] );
			$css = fws_purge_css( $src, $tokens );
			set_transient( $key, $css, WEEK_IN_SECONDS );
		}
		return '<style' . $s[1] . '>' . $css . '</style>';
	}, $html );
}
