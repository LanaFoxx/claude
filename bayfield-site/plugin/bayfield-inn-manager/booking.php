<?php
/**
 * Booking search with live eviivo availability, shown in the site's design.
 * The site asks eviivo which properties can take the whole party for the dates (same data
 * eviivo's own search page uses), shows only those, and opens the chosen property's eviivo
 * booking page inside the site.
 */
defined( 'ABSPATH' ) || exit;

const BI_EVIIVO_POS  = 'bayfieldinn';
const BI_EVIIVO_BASE = 'https://partners.eviivo.com/en-US/bayfieldinn';

/** eviivo properties sold under the Bayfield Inn point of sale. type: inn | condos */
function bi_booking_properties() {
	return array(
		'TheBayfieldInnLLC54814' => array( 'name' => 'The Bayfield Inn', 'type' => 'inn', 'slug' => 'the-bayfield-inn',
			'eyebrow' => 'The harbor classic', 'desc' => 'Stay right on the harbor, with dining and downtown just outside your door.' ),
		'ByfldnthLkCnds54814'    => array( 'name' => 'Bayfield on the Lake Condos', 'type' => 'condos', 'slug' => 'bayfield-on-the-lake-condos',
			'eyebrow' => 'Room to get together', 'desc' => 'A lakefront escape with room to gather and make yourself at home.' ),
		'IsaacWingHouse54814'    => array( 'name' => 'Isaac Wing House', 'type' => 'condos', 'slug' => 'isaac-wing-house',
			'eyebrow' => 'A stay with a story', 'desc' => 'Historic character and welcoming suites, just across from the harbor.' ),
	);
}

function bi_booking_params( $src ) {
	$ok = function ( $d ) { return is_string( $d ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', $d ) && strtotime( $d ); };
	$p  = array(
		'startdate' => $src['startdate'] ?? '',
		'enddate'   => $src['enddate'] ?? '',
		'adults1'   => max( 1, min( 20, (int) ( $src['adults1'] ?? 2 ) ) ),
		'children1' => max( 0, min( 20, (int) ( $src['children1'] ?? 0 ) ) ),
	);
	if ( ! $ok( $p['startdate'] ) || ! $ok( $p['enddate'] ) || $p['enddate'] <= $p['startdate'] ) {
		return null;
	}
	return $p;
}

function bi_booking_link( $short, $slug, $p ) {
	return BI_EVIIVO_BASE . '/p/united-states/wisconsin/bayfield/' . $slug . '/' . strtolower( $short ) . '?' . http_build_query( array(
		'startdate' => $p['startdate'], 'enddate' => $p['enddate'], 'adults1' => $p['adults1'], 'children1' => $p['children1'],
		'noofrooms' => 1, 'hli' => 'true', 'currency' => 'USD',
	) );
}

/** Live availability for a search, cached 10 minutes. Returns array or WP_Error. */
function bi_booking_availability( $p ) {
	$key    = 'bi_avail_' . md5( wp_json_encode( $p ) );
	$cached = get_transient( $key );
	if ( is_array( $cached ) ) {
		return $cached;
	}
	$url = 'https://partners.eviivo.com/' . BI_EVIIVO_POS . '/ajax/RetrieveProperties?' . http_build_query( array(
		'startdate' => $p['startdate'], 'enddate' => $p['enddate'], 'adults1' => $p['adults1'], 'children1' => $p['children1'],
		'noofrooms' => 1, 'hli' => 'True', 'currency' => 'USD', 'pagesize' => 50,
	) );
	$res = wp_remote_get( $url, array( 'timeout' => 30, 'headers' => array( 'Accept' => 'text/html' ) ) );
	if ( is_wp_error( $res ) || 200 !== wp_remote_retrieve_response_code( $res ) ) {
		return new WP_Error( 'eviivo', 'Availability is not reachable right now.' );
	}
	if ( ! preg_match( '/id="results-properties-summary"[^>]*value="([^"]*)"/', wp_remote_retrieve_body( $res ), $m ) ) {
		return new WP_Error( 'eviivo', 'Availability could not be read.' );
	}
	$list = json_decode( html_entity_decode( $m[1], ENT_QUOTES ), true );
	if ( ! is_array( $list ) ) {
		return new WP_Error( 'eviivo', 'Availability could not be read.' );
	}
	$known = bi_booking_properties();
	$out   = array();
	foreach ( $list as $prop ) {
		$short = $prop['ShortName'] ?? '';
		if ( ! isset( $known[ $short ] ) ) {
			continue; // Only properties the site knows how to present.
		}
		$k     = $known[ $short ];
		$price = $prop['RateValueWithIncludedCharges'] ?? null;
		$out[] = array(
			'id'        => $short,
			'name'      => $k['name'],
			'type'      => $k['type'],
			'eyebrow'   => $k['eyebrow'],
			'desc'      => $k['desc'],
			'available' => null !== $price,
			'price'     => null !== $price ? (float) $price : null,
			'reason'    => null === $price ? (string) ( $prop['UnavailabilityReasonMessage'] ?? '' ) : '',
			'link'      => bi_booking_link( $short, $k['slug'], $p ),
		);
	}
	set_transient( $key, $out, 10 * MINUTE_IN_SECONDS );
	return $out;
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'bayfield/v1', '/availability', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => function ( WP_REST_Request $req ) {
			$p = bi_booking_params( $req->get_params() );
			if ( ! $p ) {
				return new WP_Error( 'bad_search', 'Choose a check-in and a later check-out date.', array( 'status' => 400 ) );
			}
			$r = bi_booking_availability( $p );
			if ( is_wp_error( $r ) ) {
				return new WP_Error( 'eviivo', $r->get_error_message(), array( 'status' => 502, 'fallback' => BI_EVIIVO_BASE . '/s?' . http_build_query( $p + array( 'noofrooms' => 1, 'hli' => 'true', 'currency' => 'USD' ) ) ) );
			}
			return array( 'search' => $p, 'properties' => $r );
		},
	) );
} );
