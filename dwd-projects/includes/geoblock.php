<?php
/**
 * Ban list: every visit, form and login from the blocked countries, and from banned IP addresses, gets a short
 * "not available" page (HTTP 403) instead of the site.
 *
 * - Countries: their published IPv4 and IPv6 address ranges (ipdeny.com aggregated zones), downloaded by the site,
 *   merged into one sorted list in uploads/dwd-geo/ and refreshed every week.
 * - IPs: addresses Michael bans, every address that sent a form marked spam ("Spam: delete & block"), and every
 *   address that trips the hidden spam trap on a form.
 * - Never blocked: a logged-in administrator (so Michael can't lock himself out), WP-CLI and the site's own cron.
 */
defined( 'ABSPATH' ) || exit;

function dwdgb_countries() {
	$c = get_option( 'dwdgb_countries', null );
	return is_array( $c ) ? $c : array( 'NL', 'DE', 'CN', 'RU', 'SG', 'UA', 'FR', 'BR' );
}

function dwdgb_dir() {
	$u = wp_upload_dir();
	return trailingslashit( $u['basedir'] ) . 'dwd-geo/';
}

/** The visitor's IP address. */
function dwdgb_ip() {
	return isset( $_SERVER['REMOTE_ADDR'] ) ? trim( (string) wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : ''; // phpcs:ignore
}

/** Banned IP addresses: ip => [ 'why' => …, 'at' => date ]. */
function dwdgb_ips() {
	return (array) get_option( 'dwdgb_ips', array() );
}
function dwdgb_ban_ip( $ip, $why ) {
	$ip = trim( (string) $ip );
	if ( ! filter_var( $ip, FILTER_VALIDATE_IP ) ) {
		return false;
	}
	$l = dwdgb_ips();
	if ( ! isset( $l[ $ip ] ) ) {
		$l[ $ip ] = array( 'why' => sanitize_text_field( (string) $why ), 'at' => current_time( 'Y-m-d' ) );
		update_option( 'dwdgb_ips', $l, false );
	}
	return true;
}

/** "a.b.c.d/n" or "x::/n" to [ start, end ] as 16-byte strings (IPv4 mapped), or null. */
function dwdgb_cidr( $cidr ) {
	$p = explode( '/', trim( $cidr ) );
	$a = @inet_pton( $p[0] ); // phpcs:ignore
	if ( false === $a || ! isset( $p[1] ) ) {
		return null;
	}
	$bits = strlen( $a ) * 8;
	$n    = (int) $p[1];
	$s    = $a;
	$e    = $a;
	for ( $i = 0; $i < strlen( $a ); $i++ ) {
		$keep = max( 0, min( 8, $n - $i * 8 ) );
		$mask = $keep ? ( 0xFF << ( 8 - $keep ) ) & 0xFF : 0;
		$s[ $i ] = chr( ord( $a[ $i ] ) & $mask );
		$e[ $i ] = chr( ord( $a[ $i ] ) | ( ~$mask & 0xFF ) );
	}
	unset( $bits );
	return array( dwdgb_norm( $s ), dwdgb_norm( $e ) );
}
/** 4-byte IPv4 to the 16-byte IPv4-mapped form, so one sorted list covers both. */
function dwdgb_norm( $bin ) {
	return 4 === strlen( $bin ) ? str_repeat( "\0", 10 ) . "\xff\xff" . $bin : $bin;
}

/** Download the blocked countries' ranges and save the merged list. Returns [ 'ranges' => n, 'errors' => [] ]. */
function dwdgb_refresh() {
	$all = array();
	$err = array();
	foreach ( dwdgb_countries() as $cc ) {
		$cc = strtolower( preg_replace( '/[^A-Za-z]/', '', $cc ) );
		foreach ( array( 'https://www.ipdeny.com/ipblocks/data/aggregated/' . $cc . '-aggregated.zone', 'https://www.ipdeny.com/ipv6/ipaddresses/aggregated/' . $cc . '-aggregated.zone' ) as $url ) {
			$r = wp_remote_get( $url, array( 'timeout' => 30 ) );
			if ( is_wp_error( $r ) || 200 !== (int) wp_remote_retrieve_response_code( $r ) ) {
				$err[] = strtoupper( $cc ) . ( false !== strpos( $url, 'ipv6' ) ? ' IPv6' : ' IPv4' ) . ': ' . ( is_wp_error( $r ) ? $r->get_error_message() : 'HTTP ' . wp_remote_retrieve_response_code( $r ) );
				continue;
			}
			foreach ( preg_split( '/\r?\n/', (string) wp_remote_retrieve_body( $r ) ) as $line ) {
				$x = dwdgb_cidr( $line );
				if ( $x ) {
					$all[] = $x;
				}
			}
		}
	}
	if ( ! $all ) {
		return array( 'ranges' => 0, 'errors' => $err ); // keep the old list rather than wiping it
	}
	usort( $all, function ( $a, $b ) { return strcmp( $a[0], $b[0] ); } );
	$m = array();
	foreach ( $all as $x ) {
		$k = count( $m ) - 1;
		if ( $k >= 0 && strcmp( $x[0], $m[ $k ][1] ) <= 0 ) {
			if ( strcmp( $x[1], $m[ $k ][1] ) > 0 ) {
				$m[ $k ][1] = $x[1];
			}
		} else {
			$m[] = $x;
		}
	}
	$dir = dwdgb_dir();
	wp_mkdir_p( $dir );
	if ( ! file_exists( $dir . 'index.html' ) ) {
		file_put_contents( $dir . 'index.html', '' ); // phpcs:ignore
	}
	$bin = '';
	foreach ( $m as $x ) {
		$bin .= $x[0] . $x[1];
	}
	file_put_contents( $dir . 'ranges.bin.tmp', $bin ); // phpcs:ignore
	rename( $dir . 'ranges.bin.tmp', $dir . 'ranges.bin' );
	update_option( 'dwdgb_meta', array( 'at' => current_time( 'mysql' ), 'ranges' => count( $m ), 'countries' => dwdgb_countries(), 'errors' => $err ), false );
	return array( 'ranges' => count( $m ), 'errors' => $err );
}

/** True when $ip is inside a blocked country's ranges (binary search over the saved list). */
function dwdgb_in_countries( $ip ) {
	$a = @inet_pton( $ip ); // phpcs:ignore
	$f = dwdgb_dir() . 'ranges.bin';
	if ( false === $a || ! is_readable( $f ) ) {
		return false;
	}
	$k  = dwdgb_norm( $a );
	$fh = fopen( $f, 'rb' ); // phpcs:ignore
	if ( ! $fh ) {
		return false;
	}
	$n  = (int) ( filesize( $f ) / 32 );
	$lo = 0;
	$hi = $n - 1;
	$in = false;
	while ( $lo <= $hi ) {
		$mid = ( $lo + $hi ) >> 1;
		fseek( $fh, $mid * 32 );
		$rec = fread( $fh, 32 ); // phpcs:ignore
		$s   = substr( $rec, 0, 16 );
		$e   = substr( $rec, 16, 16 );
		if ( strcmp( $k, $s ) < 0 ) {
			$hi = $mid - 1;
		} elseif ( strcmp( $k, $e ) > 0 ) {
			$lo = $mid + 1;
		} else {
			$in = true;
			break;
		}
	}
	fclose( $fh ); // phpcs:ignore
	return $in;
}

/** Why $ip is blocked ('country' or 'ip'), or ''. */
function dwdgb_blocked( $ip ) {
	if ( '' === $ip ) {
		return '';
	}
	if ( isset( dwdgb_ips()[ $ip ] ) ) {
		return 'ip';
	}
	return dwdgb_in_countries( $ip ) ? 'country' : '';
}

/** The gate: as early as WordPress knows who is logged in. */
add_action( 'init', function () {
	if ( ( defined( 'WP_CLI' ) && WP_CLI ) || wp_doing_cron() || current_user_can( 'manage_options' ) ) {
		return;
	}
	$ip = dwdgb_ip();
	if ( ! dwdgb_blocked( $ip ) ) {
		return;
	}
	nocache_headers();
	status_header( 403 );
	header( 'Content-Type: text/html; charset=utf-8' );
	echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Not available</title></head>'
		. '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#121212;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:24px">'
		. '<div><h1 style="font-size:28px;margin:0 0 10px">This site isn’t available in your region.</h1><p style="color:#9a9a9a;margin:0">Dream Web Digital</p></div></body></html>';
	exit;
}, 0 );

/** Weekly refresh of the country ranges, and the first download right away. */
add_action( 'init', function () {
	if ( ! wp_next_scheduled( 'dwdgb_refresh' ) ) {
		wp_schedule_event( time() + 300, 'weekly', 'dwdgb_refresh' );
	}
	if ( ! get_option( 'dwdgb_meta' ) && ! get_transient( 'dwdgb_first' ) ) {
		set_transient( 'dwdgb_first', 1, HOUR_IN_SECONDS );
		wp_schedule_single_event( time() + 5, 'dwdgb_refresh' );
	}
}, 20 );
add_action( 'dwdgb_refresh', 'dwdgb_refresh' );

/** Admin: status, refresh, ban or unban an IP, and the IPs that sent website forms. */
add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	register_rest_route( 'dwd/v1', '/crm/geoblock', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () {
			global $wpdb;
			$subs = array();
			$s    = $wpdb->prefix . 'e_submissions';
			if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $s ) ) === $s ) {
				$v    = $wpdb->prefix . 'e_submissions_values';
				$rows = $wpdb->get_results( "SELECT s.id, s.created_at_gmt, s.form_name, s.user_ip, s.status, (SELECT GROUP_CONCAT(CONCAT(x.`key`, '=', LEFT(x.`value`, 60)) SEPARATOR ' | ') FROM {$v} x WHERE x.submission_id = s.id AND x.`key` IN ('name','full_name','email','company','message')) AS f FROM {$s} s ORDER BY s.id DESC LIMIT 300", ARRAY_A ); // phpcs:ignore
				$subs = $rows ? $rows : array();
			}
			return array( 'meta' => get_option( 'dwdgb_meta', array() ), 'countries' => dwdgb_countries(), 'ips' => dwdgb_ips(), 'my_ip_blocked' => dwdgb_blocked( dwdgb_ip() ), 'submissions' => $subs, 'form_ips' => get_option( 'dwdgb_form_ips', array() ) );
		} ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$act = (string) $r->get_param( 'act' );
			if ( 'refresh' === $act ) {
				return dwdgb_refresh();
			}
			if ( 'ban' === $act ) {
				$n = 0;
				foreach ( (array) $r->get_param( 'ips' ) as $ip ) {
					$n += dwdgb_ban_ip( $ip, (string) $r->get_param( 'why' ) ?: 'Banned by Michael' ) ? 1 : 0;
				}
				return array( 'banned' => $n, 'ips' => dwdgb_ips() );
			}
			if ( 'unban' === $act ) {
				$l = dwdgb_ips();
				foreach ( (array) $r->get_param( 'ips' ) as $ip ) {
					unset( $l[ $ip ] );
				}
				update_option( 'dwdgb_ips', $l, false );
				return array( 'ips' => $l );
			}
			if ( 'test' === $act ) {
				$ip = (string) $r->get_param( 'ip' );
				return array( 'ip' => $ip, 'blocked' => dwdgb_blocked( $ip ) );
			}
			return new WP_Error( 'dwdgb', 'Unknown action.', array( 'status' => 400 ) );
		} ),
	) );
} );

/** Remember which IP sent each website form (email => ip), so "Spam: delete & block" can ban it too. */
function dwdgb_note_form_ip( $email ) {
	$email = strtolower( trim( (string) $email ) );
	$ip    = dwdgb_ip();
	if ( '' === $email || '' === $ip ) {
		return;
	}
	$l           = (array) get_option( 'dwdgb_form_ips', array() );
	$l[ $email ] = $ip;
	update_option( 'dwdgb_form_ips', array_slice( $l, -2000, null, true ), false );
}
