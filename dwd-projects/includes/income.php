<?php
/**
 * Income Overview: all business income for a year, split into two lines of business.
 *
 * 1. Web design: every payment logged on Dream Desk projects (Upwork after fees once in the bank, Stripe, PayPal,
 *    and Zelle / checks for web work), same rules as the Money page.
 * 2. CA Tax Courses management: the Zelle transfers from SD TAX SERVICE in the bank feed (pay dates, twice a month,
 *    $3,500 each). Mike's mom gets $750 of each pay transfer as her share, so what Mike keeps is the transfer
 *    minus $750. Website payments from SD TAX SERVICE are web design (already on the CA Tax Courses project) and are
 *    left out here, so nothing counts twice.
 *
 * GET /dwd/v1/crm/income?year=2026
 */
defined( 'ABSPATH' ) || exit;

function dwdio_settings() {
	return wp_parse_args( (array) get_option( 'dwdio_settings', array() ), array( 'match' => 'SD TAX SERVICE', 'mom' => 750 ) );
}

function dwdio_overview( $year ) {
	$year  = preg_match( '/^\d{4}$/', (string) $year ) ? (string) $year : current_time( 'Y' );
	$set   = dwdio_settings();
	$blank = function () { return array( 'Upwork' => 0, 'Stripe' => 0, 'PayPal' => 0, 'Other' => 0, 'total' => 0 ); };
	$web   = array();
	$mg    = array();
	for ( $m = 1; $m <= 12; $m++ ) {
		$web[ $m ] = $blank();
		$mg[ $m ]  = array( 'gross' => 0, 'mom' => 0, 'net' => 0, 'count' => 0 );
	}
	$years = array( current_time( 'Y' ) => 1 );

	// 1. Web design: project payments.
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdc_payments' ) ) as $id ) {
		foreach ( (array) get_post_meta( $id, '_dwdc_payments', true ) as $p ) {
			if ( ! is_array( $p ) ) {
				continue;
			}
			$st = strtolower( (string) ( $p['status'] ?? 'paid' ) );
			if ( in_array( $st, array( 'open', 'void', 'draft', 'failed', 'uncollectible', 'held' ), true ) ) {
				continue;
			}
			$d   = (string) ( $p['date'] ?? '' );
			$amt = (float) preg_replace( '/[^\d.]/', '', (string) ( $p['amount'] ?? 0 ) );
			if ( ! preg_match( '/^(\d{4})-(\d{2})/', $d, $dm ) || $amt <= 0 ) {
				continue;
			}
			$years[ $dm[1] ] = 1;
			if ( $dm[1] !== $year ) {
				continue;
			}
			$amt *= 'refunded' === $st ? -1 : 1;
			$src  = (string) ( $p['source'] ?? '' );
			$src  = in_array( $src, array( 'Upwork', 'Stripe', 'PayPal' ), true ) ? $src : 'Other';
			$m    = (int) $dm[2];
			$web[ $m ][ $src ]   += $amt;
			$web[ $m ]['total']  += $amt;
		}
	}

	// 2. CA Tax Courses management: Zelle transfers from SD TAX SERVICE in the bank feed.
	// One paycheck ($3,500) sometimes arrives in two transfers (e.g. $2,500 + $1,000), so transfers are grouped by
	// pay date and Mom's $750 comes off once per paycheck. Bonuses have no share taken; reimbursements are not income.
	$bankMin = '';
	$tr      = array();
	$tx      = function_exists( 'dwdbk_get' ) ? (array) ( dwdbk_get()['tx'] ?? array() ) : array();
	foreach ( $tx as $t ) {
		$d = (string) ( $t['date'] ?? '' );
		if ( $d && ( '' === $bankMin || $d < $bankMin ) ) {
			$bankMin = $d;
		}
		$desc = (string) ( $t['desc'] ?? '' );
		$amt  = (float) ( $t['amt'] ?? 0 );
		if ( $amt <= 0 || false === stripos( $desc, (string) $set['match'] ) || preg_match( '/web\s*design|website/i', $desc ) || ! preg_match( '/^(\d{4})-(\d{2})-(\d{2})/', $d, $dm ) ) {
			continue;
		}
		$years[ $dm[1] ] = 1;
		$memo = preg_match( '/for "([^"]+)"?/', $desc, $mm ) ? trim( $mm[1] ) : '';
		$kind = preg_match( '/reimburs/i', $memo ) ? 'reimb' : ( preg_match( '/bonus/i', $memo ) ? 'bonus' : 'pay' );
		$key  = '';
		if ( 'pay' === $kind && preg_match( '/(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?/', $memo, $pm ) ) {
			$py  = ! empty( $pm[3] ) ? ( strlen( $pm[3] ) === 2 ? '20' . $pm[3] : $pm[3] ) : $dm[1];
			$key = sprintf( '%04d-%02d-%02d', $py, $pm[1], $pm[2] );
		}
		$tr[] = array( 'date' => $d, 'amt' => $amt, 'memo' => $memo, 'kind' => $kind, 'key' => $key );
	}
	usort( $tr, function ( $a, $b ) { return strcmp( $a['date'], $b['date'] ); } );
	// Transfers without a pay date join the nearest paycheck within a week; failing that they are their own paycheck.
	$keys = array_values( array_unique( array_filter( array_column( $tr, 'key' ) ) ) );
	foreach ( $tr as $i => $x ) {
		if ( 'pay' !== $x['kind'] || '' !== $x['key'] ) {
			continue;
		}
		$best = '';
		foreach ( $keys as $k ) {
			$gap = abs( strtotime( $k ) - strtotime( $x['date'] ) );
			if ( $gap <= 7 * DAY_IN_SECONDS && ( '' === $best || $gap < abs( strtotime( $best ) - strtotime( $x['date'] ) ) ) ) {
				$best = $k;
			}
		}
		$tr[ $i ]['key'] = $best ? $best : $x['date'];
	}
	$momTaken = array();
	$items    = array();
	foreach ( $tr as $x ) {
		if ( 'reimb' === $x['kind'] || substr( $x['date'], 0, 4 ) !== $year ) {
			continue;
		}
		$mom = 0;
		if ( 'pay' === $x['kind'] && ! isset( $momTaken[ $x['key'] ] ) ) {
			$mom                    = min( $x['amt'], (float) $set['mom'] );
			$momTaken[ $x['key'] ] = 1;
		}
		$m = (int) substr( $x['date'], 5, 2 );
		$mg[ $m ]['gross'] += $x['amt'];
		$mg[ $m ]['mom']   += $mom;
		$mg[ $m ]['net']   += $x['amt'] - $mom;
		$mg[ $m ]['count']++;
		$items[] = array( 'date' => $x['date'], 'gross' => round( $x['amt'], 2 ), 'mom' => round( $mom, 2 ), 'net' => round( $x['amt'] - $mom, 2 ), 'kind' => $x['kind'], 'memo' => $x['memo'], 'paydate' => 'pay' === $x['kind'] ? $x['key'] : '' );
	}
	usort( $items, function ( $a, $b ) { return strcmp( $b['date'], $a['date'] ); } );

	$months = array();
	$tot    = array( 'web' => $blank(), 'mgmt' => array( 'gross' => 0, 'mom' => 0, 'net' => 0, 'count' => 0 ) );
	for ( $m = 1; $m <= 12; $m++ ) {
		foreach ( $web[ $m ] as $k => $v ) {
			$web[ $m ][ $k ]   = round( $v, 2 );
			$tot['web'][ $k ] += $v;
		}
		foreach ( $mg[ $m ] as $k => $v ) {
			$mg[ $m ][ $k ]     = round( $v, 2 );
			$tot['mgmt'][ $k ] += $v;
		}
		$months[] = array( 'm' => $m, 'web' => $web[ $m ], 'mgmt' => $mg[ $m ], 'total' => round( $web[ $m ]['total'] + $mg[ $m ]['net'], 2 ) );
	}
	array_walk_recursive( $tot, function ( &$v ) { $v = round( $v, 2 ); } );
	krsort( $years );
	return array(
		'year'      => $year,
		'years'     => array_map( 'strval', array_keys( $years ) ),
		'months'    => $months,
		'totals'    => $tot,
		'total'     => round( $tot['web']['total'] + $tot['mgmt']['net'], 2 ),
		'mgmt'      => $items,
		'bank_from' => $bankMin,
		'mom'       => (float) $set['mom'],
	);
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/crm/income', array( 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function ( $r ) {
		return dwdio_overview( (string) $r->get_param( 'year' ) );
	} ) );
} );
