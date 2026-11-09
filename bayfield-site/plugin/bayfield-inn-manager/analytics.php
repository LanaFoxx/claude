<?php
/**
 * Google Analytics 4 on the dashboard.
 * - Tracking: with a Measurement ID (G-XXXX) saved, the GA tag loads for visitors (after the page
 *   has loaded, so it doesn't slow PageSpeed scores). Logged-in team members are not tracked.
 * - Reports: with a Property ID and a Google service-account key (read-only "Viewer" access on the
 *   property), the dashboard shows page views, visitors, bounce rate, etc. from the GA4 Data API.
 * Settings and the key are only visible to administrators; the key is never printed back.
 */
defined( 'ABSPATH' ) || exit;

const BI_GA_OPT = 'bi_ga_settings';

function bi_ga_settings() {
	$s = get_option( BI_GA_OPT, array() );
	return wp_parse_args( is_array( $s ) ? $s : array(), array( 'measurement_id' => '', 'property_id' => '', 'key' => '' ) );
}
function bi_ga_key() {
	$k = json_decode( (string) bi_ga_settings()['key'], true );
	return ( is_array( $k ) && ! empty( $k['client_email'] ) && ! empty( $k['private_key'] ) ) ? $k : null;
}
function bi_ga_connected() {
	$s = bi_ga_settings();
	return $s['property_id'] && bi_ga_key();
}
function bi_ga_report_url() {
	$pid = bi_ga_settings()['property_id'];
	return $pid ? 'https://analytics.google.com/analytics/web/#/p' . rawurlencode( $pid ) . '/reports/intelligenthome' : 'https://analytics.google.com/';
}

/* ------------------------------------------------------------ tracking tag */
add_action( 'wp_footer', function () {
	$id = bi_ga_settings()['measurement_id'];
	if ( ! $id || is_user_logged_in() || ! preg_match( '/^G-[A-Z0-9]+$/', $id ) ) {
		return;
	}
	?>
	<script>
	window.dataLayer = window.dataLayer || []; function gtag() { dataLayer.push(arguments); }
	gtag('js', new Date()); gtag('config', <?php echo wp_json_encode( $id ); ?>);
	// Load Google's script after the page is ready so it never delays the page itself.
	(function () { function load() { var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + <?php echo wp_json_encode( rawurlencode( $id ) ); ?>; document.head.appendChild(s); }
		if (document.readyState === 'complete') setTimeout(load, 1500); else window.addEventListener('load', function () { setTimeout(load, 1500); }); })();
	</script>
	<?php
}, 99 );

/* ------------------------------------------------------- Data API (GA4) */
function bi_b64url( $s ) {
	return rtrim( strtr( base64_encode( $s ), '+/', '-_' ), '=' );
}
/** OAuth access token for the service account (cached ~55 minutes). */
function bi_ga_token() {
	$key = bi_ga_key();
	if ( ! $key ) {
		return new WP_Error( 'bi_ga', 'No service-account key saved.' );
	}
	$cache = get_transient( 'bi_ga_token' );
	if ( $cache ) {
		return $cache;
	}
	$now   = time();
	$claim = array( 'iss' => $key['client_email'], 'scope' => 'https://www.googleapis.com/auth/analytics.readonly', 'aud' => 'https://oauth2.googleapis.com/token', 'iat' => $now, 'exp' => $now + 3600 );
	$input = bi_b64url( wp_json_encode( array( 'alg' => 'RS256', 'typ' => 'JWT' ) ) ) . '.' . bi_b64url( wp_json_encode( $claim ) );
	$sig   = '';
	if ( ! function_exists( 'openssl_sign' ) || ! openssl_sign( $input, $sig, $key['private_key'], 'sha256WithRSAEncryption' ) ) {
		return new WP_Error( 'bi_ga', 'The saved key could not be read. Paste the full JSON key file again.' );
	}
	$res  = wp_remote_post( 'https://oauth2.googleapis.com/token', array( 'timeout' => 15, 'body' => array( 'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $input . '.' . bi_b64url( $sig ) ) ) );
	$body = is_wp_error( $res ) ? null : json_decode( wp_remote_retrieve_body( $res ), true );
	if ( empty( $body['access_token'] ) ) {
		return new WP_Error( 'bi_ga', 'Google did not accept the key' . ( ! empty( $body['error_description'] ) ? ': ' . $body['error_description'] : '.' ) );
	}
	set_transient( 'bi_ga_token', $body['access_token'], 55 * MINUTE_IN_SECONDS );
	return $body['access_token'];
}
function bi_ga_call( $method, $payload ) {
	$token = bi_ga_token();
	if ( is_wp_error( $token ) ) {
		return $token;
	}
	$pid = preg_replace( '/\D/', '', bi_ga_settings()['property_id'] );
	$res = wp_remote_post( "https://analyticsdata.googleapis.com/v1beta/properties/{$pid}:{$method}", array(
		'timeout' => 20, 'headers' => array( 'Authorization' => 'Bearer ' . $token, 'Content-Type' => 'application/json' ), 'body' => wp_json_encode( $payload ),
	) );
	$body = is_wp_error( $res ) ? null : json_decode( wp_remote_retrieve_body( $res ), true );
	if ( ! is_array( $body ) || isset( $body['error'] ) ) {
		$msg = $body['error']['message'] ?? ( is_wp_error( $res ) ? $res->get_error_message() : 'No response from Google.' );
		if ( false !== stripos( $msg, 'permission' ) ) {
			$msg = 'The service account doesn\'t have access to this property yet. In Google Analytics: Admin › Property access management › add ' . bi_ga_key()['client_email'] . ' as a Viewer.';
		}
		return new WP_Error( 'bi_ga', $msg );
	}
	return $body;
}
function bi_ga_num( $report, $row = 0 ) {
	$out = array();
	foreach ( $report['metricHeaders'] ?? array() as $i => $h ) {
		$out[ $h['name'] ] = (float) ( $report['rows'][ $row ]['metricValues'][ $i ]['value'] ?? 0 );
	}
	return $out;
}

/** Summary for the last $days days (+ the period before, for the change), cached 30 minutes. */
function bi_ga_summary( $days ) {
	$days  = in_array( (int) $days, array( 7, 28, 90 ), true ) ? (int) $days : 28;
	$cache = get_transient( 'bi_ga_sum_' . $days );
	if ( is_array( $cache ) ) {
		return $cache;
	}
	$metrics = array( 'screenPageViews', 'totalUsers', 'newUsers', 'sessions', 'bounceRate', 'engagementRate', 'averageSessionDuration' );
	$r       = bi_ga_call( 'runReport', array(
		'dateRanges' => array( array( 'startDate' => $days . 'daysAgo', 'endDate' => 'today', 'name' => 'now' ), array( 'startDate' => ( 2 * $days ) . 'daysAgo', 'endDate' => ( $days + 1 ) . 'daysAgo', 'name' => 'before' ) ),
		'metrics'    => array_map( function ( $m ) { return array( 'name' => $m ); }, $metrics ),
	) );
	if ( is_wp_error( $r ) ) {
		return $r;
	}
	// With two date ranges each row carries a dateRange dimension value.
	$now = $before = array_fill_keys( $metrics, 0 );
	foreach ( $r['rows'] ?? array() as $k => $row ) {
		$vals = bi_ga_num( $r, $k );
		if ( 'before' === ( $row['dimensionValues'][0]['value'] ?? '' ) ) {
			$before = $vals;
		} else {
			$now = $vals;
		}
	}
	$pages = bi_ga_call( 'runReport', array(
		'dateRanges' => array( array( 'startDate' => $days . 'daysAgo', 'endDate' => 'today' ) ),
		'dimensions' => array( array( 'name' => 'pageTitle' ), array( 'name' => 'pagePath' ) ),
		'metrics'    => array( array( 'name' => 'screenPageViews' ) ),
		'orderBys'   => array( array( 'metric' => array( 'metricName' => 'screenPageViews' ), 'desc' => true ) ),
		'limit'      => 6,
	) );
	$top = array();
	foreach ( is_wp_error( $pages ) ? array() : ( $pages['rows'] ?? array() ) as $row ) {
		$top[] = array( 'title' => $row['dimensionValues'][0]['value'], 'path' => $row['dimensionValues'][1]['value'], 'views' => (int) $row['metricValues'][0]['value'] );
	}
	$rt     = bi_ga_call( 'runRealtimeReport', array( 'metrics' => array( array( 'name' => 'activeUsers' ) ) ) );
	$result = array( 'days' => $days, 'now' => $now, 'before' => $before, 'top' => $top, 'realtime' => is_wp_error( $rt ) ? null : (int) bi_ga_num( $rt )['activeUsers'], 'at' => time() );
	set_transient( 'bi_ga_sum_' . $days, $result, 30 * MINUTE_IN_SECONDS );
	return $result;
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'bayfield/v1', '/ga/summary', array(
		'methods'             => 'GET',
		'permission_callback' => function () { return current_user_can( 'edit_pages' ); },
		'callback'            => function ( WP_REST_Request $req ) {
			if ( ! bi_ga_connected() ) {
				return new WP_Error( 'bi_ga_off', 'Not connected', array( 'status' => 409 ) );
			}
			$r = bi_ga_summary( (int) $req->get_param( 'days' ) );
			return is_wp_error( $r ) ? new WP_Error( 'bi_ga', $r->get_error_message(), array( 'status' => 502 ) ) : $r;
		},
	) );
	register_rest_route( 'bayfield/v1', '/ga/settings', array(
		'methods'             => 'POST',
		'permission_callback' => function () { return current_user_can( 'manage_options' ); },
		'callback'            => function ( WP_REST_Request $req ) {
			$s   = bi_ga_settings();
			$mid = strtoupper( trim( (string) $req->get_param( 'measurement_id' ) ) );
			$pid = preg_replace( '/\D/', '', (string) $req->get_param( 'property_id' ) );
			if ( $mid && ! preg_match( '/^G-[A-Z0-9]+$/', $mid ) ) {
				return new WP_Error( 'bi_ga', 'The Measurement ID should look like G-ABC123XYZ.', array( 'status' => 400 ) );
			}
			$s['measurement_id'] = $mid;
			$s['property_id']    = $pid;
			$key                 = trim( (string) $req->get_param( 'key' ) );
			if ( '' !== $key ) {
				$k = json_decode( $key, true );
				if ( ! is_array( $k ) || empty( $k['client_email'] ) || empty( $k['private_key'] ) ) {
					return new WP_Error( 'bi_ga', 'That doesn\'t look like a service-account JSON key file. Paste the whole file contents.', array( 'status' => 400 ) );
				}
				$s['key'] = wp_json_encode( array( 'client_email' => $k['client_email'], 'private_key' => $k['private_key'] ) );
			}
			if ( $req->get_param( 'remove_key' ) ) {
				$s['key'] = '';
			}
			update_option( BI_GA_OPT, $s, false );
			delete_transient( 'bi_ga_token' );
			foreach ( array( 7, 28, 90 ) as $d ) {
				delete_transient( 'bi_ga_sum_' . $d );
			}
			if ( function_exists( 'sg_cachepress_purge_everything' ) ) {
				sg_cachepress_purge_everything(); // tracking tag added/removed on every page
			}
			$test = bi_ga_connected() ? bi_ga_summary( 7 ) : null;
			return array( 'ok' => true, 'connected' => bi_ga_connected(), 'error' => is_wp_error( $test ) ? $test->get_error_message() : null );
		},
	) );
} );
