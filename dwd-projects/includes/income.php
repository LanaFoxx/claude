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
	$bankMin    = '';
	$bankMonths = array();
	$tr         = array();
	$tx      = function_exists( 'dwdbk_get' ) ? (array) ( dwdbk_get()['tx'] ?? array() ) : array();
	foreach ( $tx as $t ) {
		$d = (string) ( $t['date'] ?? '' );
		if ( $d && ( '' === $bankMin || $d < $bankMin ) ) {
			$bankMin = $d;
		}
		if ( $d ) {
			$bankMonths[ substr( $d, 0, 7 ) ] = ( $bankMonths[ substr( $d, 0, 7 ) ] ?? 0 ) + 1; // how many bank transactions each month has (shows gaps in the feed)
		}
		$desc = (string) ( $t['desc'] ?? '' );
		$amt  = (float) ( $t['amt'] ?? 0 );
		// SD TAX SERVICE by name, or (the bank often drops the sender's name) a Zelle with a "Pay Date / Pay Day" memo,
		// or a nameless, memo-less Zelle of exactly one paycheck ($3,500).
		$nameless = (bool) preg_match( '/Zelle payment from\s+(for "|Conf#)/i', $desc );
		$payMemo  = (bool) preg_match( '/for "\s*pa\w*\s*da(te|y|tw)?\b/i', $desc );
		$isSd     = false !== stripos( $desc, (string) $set['match'] ) || ( $nameless && $payMemo ) || ( $nameless && ! preg_match( '/for "/', $desc ) && abs( $amt - 3500 ) < 0.01 );
		if ( $amt <= 0 || ! $isSd || preg_match( '/web\s*design|website/i', $desc ) || ! preg_match( '/^(\d{4})-(\d{2})-(\d{2})/', $d, $dm ) ) {
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
		if ( 'pay' === $x['kind'] ) { // Mom's $750 per paycheck, taken from its parts in date order until it's covered
			$left                   = (float) $set['mom'] - ( $momTaken[ $x['key'] ] ?? 0 );
			$mom                    = max( 0, min( $x['amt'], $left ) );
			$momTaken[ $x['key'] ] = ( $momTaken[ $x['key'] ] ?? 0 ) + $mom;
		}
		$m = (int) substr( $x['date'], 5, 2 );
		$mg[ $m ]['gross'] += $x['amt'];
		$mg[ $m ]['mom']   += $mom;
		$mg[ $m ]['net']   += $x['amt'] - $mom;
		$mg[ $m ]['count']++;
		$items[] = array( 'date' => $x['date'], 'gross' => round( $x['amt'], 2 ), 'mom' => round( $mom, 2 ), 'net' => round( $x['amt'] - $mom, 2 ), 'kind' => $x['kind'], 'memo' => $x['memo'], 'paydate' => 'pay' === $x['kind'] ? $x['key'] : '' );
	}
	usort( $items, function ( $a, $b ) { return strcmp( $b['date'], $a['date'] ); } );

	// 3. Mojo's Flight School: Mike's share as part owner (paid by check, usually each quarter), logged by hand.
	$mj      = array_fill( 1, 12, 0 );
	$mjItems = array();
	foreach ( (array) get_option( 'dwdio_manual', array() ) as $id => $x ) {
		if ( ! is_array( $x ) || 'mojos' !== ( $x['line'] ?? '' ) || ! preg_match( '/^(\d{4})-(\d{2})/', (string) ( $x['date'] ?? '' ), $dm ) ) {
			continue;
		}
		$years[ $dm[1] ] = 1;
		if ( $dm[1] !== $year ) {
			continue;
		}
		$mj[ (int) $dm[2] ] += (float) $x['amount'];
		$mjItems[]           = array( 'id' => (string) $id, 'date' => $x['date'], 'amount' => round( (float) $x['amount'], 2 ), 'note' => (string) ( $x['note'] ?? '' ) );
	}
	usort( $mjItems, function ( $a, $b ) { return strcmp( $b['date'], $a['date'] ); } );

	$months = array();
	$tot    = array( 'web' => $blank(), 'mgmt' => array( 'gross' => 0, 'mom' => 0, 'net' => 0, 'count' => 0 ), 'mojos' => 0 );
	for ( $m = 1; $m <= 12; $m++ ) {
		foreach ( $web[ $m ] as $k => $v ) {
			$web[ $m ][ $k ]   = round( $v, 2 );
			$tot['web'][ $k ] += $v;
		}
		foreach ( $mg[ $m ] as $k => $v ) {
			$mg[ $m ][ $k ]     = round( $v, 2 );
			$tot['mgmt'][ $k ] += $v;
		}
		$tot['mojos'] += $mj[ $m ];
		$months[]      = array( 'm' => $m, 'web' => $web[ $m ], 'mgmt' => $mg[ $m ], 'mojos' => round( $mj[ $m ], 2 ), 'total' => round( $web[ $m ]['total'] + $mg[ $m ]['net'] + $mj[ $m ], 2 ) );
	}
	array_walk_recursive( $tot, function ( &$v ) { $v = round( $v, 2 ); } );
	krsort( $years );
	return array(
		'year'      => $year,
		'years'     => array_map( 'strval', array_keys( $years ) ),
		'months'    => $months,
		'totals'    => $tot,
		'total'     => round( $tot['web']['total'] + $tot['mgmt']['net'] + $tot['mojos'], 2 ),
		'mgmt'      => $items,
		'mojos'     => $mjItems,
		'bank_from' => $bankMin,
		'bank_months' => (object) $bankMonths,
		'mom'       => (float) $set['mom'],
	);
}

add_action( 'rest_api_init', function () {
	// Read-only: bank-feed money coming in whose description matches a word (e.g. who sent a Zelle).
	register_rest_route( 'dwd/v1', '/crm/income/search', array( 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function ( $r ) {
		$q   = (string) $r->get_param( 'q' );
		$out = array();
		foreach ( (array) ( function_exists( 'dwdbk_get' ) ? dwdbk_get()['tx'] ?? array() : array() ) as $t ) {
			if ( (float) ( $t['amt'] ?? 0 ) > 0 && '' !== $q && preg_match( '/' . preg_quote( $q, '/' ) . '/i', (string) ( $t['desc'] ?? '' ) ) ) {
				$out[] = array( 'date' => $t['date'], 'amt' => $t['amt'], 'desc' => $t['desc'] );
			}
		}
		usort( $out, function ( $a, $b ) { return strcmp( $a['date'], $b['date'] ); } );
		return $out;
	} ) );
	// Log or remove a Mojo's Flight School payment (POST {date, amount, note}; DELETE ?id=).
	register_rest_route( 'dwd/v1', '/crm/income/mojos', array(
		array( 'methods' => 'POST', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function ( $r ) {
			$amt  = round( (float) preg_replace( '/[^\d.]/', '', (string) $r->get_param( 'amount' ) ), 2 );
			$date = (string) $r->get_param( 'date' );
			if ( $amt <= 0 || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) ) {
				return new WP_Error( 'dwdio', 'Enter the date and the amount.', array( 'status' => 400 ) );
			}
			$all = (array) get_option( 'dwdio_manual', array() );
			$id  = 'm' . substr( md5( uniqid( '', true ) ), 0, 8 );
			$all[ $id ] = array( 'line' => 'mojos', 'date' => $date, 'amount' => $amt, 'note' => sanitize_text_field( (string) $r->get_param( 'note' ) ), 'added' => current_time( 'mysql' ) );
			update_option( 'dwdio_manual', $all, false );
			return dwdio_overview( substr( $date, 0, 4 ) );
		} ),
		array( 'methods' => 'DELETE', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function ( $r ) {
			$all = (array) get_option( 'dwdio_manual', array() );
			$id  = (string) $r->get_param( 'id' );
			$yr  = isset( $all[ $id ] ) ? substr( (string) $all[ $id ]['date'], 0, 4 ) : current_time( 'Y' );
			unset( $all[ $id ] );
			update_option( 'dwdio_manual', $all, false );
			return dwdio_overview( $yr );
		} ),
	) );
	register_rest_route( 'dwd/v1', '/crm/income', array( 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function ( $r ) {
		return dwdio_overview( (string) $r->get_param( 'year' ) );
	} ) );
} );
