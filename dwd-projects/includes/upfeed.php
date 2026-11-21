<?php
/**
 * "From Upwork": what the daily Upwork check (a Claude desktop scheduled task reading Mike's Upwork
 * Transactions page in Chrome) found. Each item is only a suggestion: nothing is logged or marked in the
 * bank until Mike clicks Log it. Stored in the option dwdc_upfeed.
 */

defined( 'ABSPATH' ) || exit;

function dwduf_get() {
	$f = get_option( 'dwdc_upfeed', array() );
	return array( 'last' => (string) ( $f['last'] ?? '' ), 'items' => is_array( $f['items'] ?? null ) ? $f['items'] : array() );
}

/** Upwork refs already in Dream Desk (from the Upwork file), so the same money isn't suggested twice. */
function dwduf_known_refs() {
	$refs = array();
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $id ) {
		foreach ( (array) get_post_meta( $id, '_dwdc_payments', true ) as $x ) {
			if ( is_array( $x ) && 'Upwork' === ( $x['source'] ?? '' ) && '' !== (string) ( $x['ref'] ?? '' ) ) {
				$refs[ (string) $x['ref'] ] = 1;
			}
		}
	}
	return $refs;
}

/** Add what the Upwork page showed. Returns how many new suggestions came in. */
function dwduf_add( $rows ) {
	$f     = dwduf_get();
	$known = dwduf_known_refs();
	$new   = 0;
	foreach ( array_slice( (array) $rows, 0, 300 ) as $r ) {
		if ( ! is_array( $r ) ) {
			continue;
		}
		$type = sanitize_text_field( (string) ( $r['type'] ?? '' ) );
		$amt  = round( (float) preg_replace( '/[^\d.\-]/', '', (string) ( $r['amount'] ?? '' ) ), 2 );
		$date = gmdate( 'Y-m-d', strtotime( (string) ( $r['date'] ?? '' ) ) ?: time() );
		$ref  = preg_replace( '/[^A-Za-z0-9_\-]/', '', (string) ( $r['ref'] ?? '' ) );
		$kind = preg_match( '/withdraw|transfer/i', $type ) ? 'withdrawal' : ( preg_match( '/fixed|hourly|bonus|milestone|payment|misc/i', $type ) && $amt > 0 ? 'earning' : '' );
		if ( ! $kind || ! $amt ) {
			continue; // fees, Connects, membership… aren't client money
		}
		if ( '' === $ref ) {
			$ref = 'x' . substr( md5( $kind . $date . $amt . ( $r['client'] ?? '' ) ), 0, 12 );
		}
		if ( isset( $f['items'][ $ref ] ) || isset( $known[ $ref ] ) ) {
			continue;
		}
		$client = sanitize_text_field( (string) ( $r['client'] ?? '' ) );
		$pid    = 'earning' === $kind && $client && function_exists( 'dwds_upwork_project' ) ? dwds_upwork_project( $client ) : 0;
		$state  = 'new';
		// Already logged by hand (same amount within $1, within 10 days)? Then there's nothing to suggest.
		if ( $pid && function_exists( 'dwds_manual_twin' ) ) {
			$used = array();
			if ( dwds_manual_twin( get_post_meta( $pid, '_dwdc_payments', true ), $amt, $date, $used ) ) {
				$state = 'logged';
			}
		}
		$f['items'][ $ref ] = array(
			'ref'    => $ref,
			'kind'   => $kind,
			'date'   => $date,
			'amount' => abs( $amt ),
			'client' => $client,
			'desc'   => mb_substr( sanitize_text_field( (string) ( $r['desc'] ?? '' ) ), 0, 160 ),
			'pid'    => $pid,
			'state'  => $state,
			'added'  => current_time( 'mysql' ),
		);
		if ( 'new' === $state ) {
			$new++;
		}
	}
	// Keep the list small: drop handled items older than 90 days.
	$cut = gmdate( 'Y-m-d', strtotime( '-90 days' ) );
	$f['items'] = array_filter( $f['items'], function ( $x ) use ( $cut ) { return 'new' === $x['state'] || $x['date'] >= $cut; } );
	$f['last']  = current_time( 'mysql' );
	update_option( 'dwdc_upfeed', $f, false );
	return $new;
}

/**
 * Connects and membership charges the morning Upwork check saw on the Transactions page. They are added to the same
 * list the Upwork file fills (ref "manual"), unless a charge of that amount on that date is already there. When a
 * later Upwork file brings in the same charge, the file's row replaces this one (dwds_merge_manual_costs).
 */
function dwduf_costs( $rows ) {
	$costs = (array) get_option( 'dwdc_upwork_costs', array() );
	$have  = array();
	foreach ( $costs as $c ) {
		$k          = ( $c['date'] ?? '' ) . '|' . number_format( (float) ( $c['amount'] ?? 0 ), 2, '.', '' );
		$have[ $k ] = ( $have[ $k ] ?? 0 ) + 1;
	}
	$seen = array();
	$new  = 0;
	foreach ( array_slice( (array) $rows, 0, 200 ) as $r ) {
		if ( ! is_array( $r ) ) {
			continue;
		}
		$amt = round( abs( (float) preg_replace( '/[^\d.\-]/', '', (string) ( $r['amount'] ?? '' ) ) ), 2 );
		$t   = strtotime( (string) ( $r['date'] ?? '' ) );
		if ( ! $amt || ! $t ) {
			continue;
		}
		$date       = gmdate( 'Y-m-d', $t );
		$k          = $date . '|' . number_format( $amt, 2, '.', '' );
		$seen[ $k ] = ( $seen[ $k ] ?? 0 ) + 1;
		if ( $seen[ $k ] <= ( $have[ $k ] ?? 0 ) ) {
			continue; // already on the list
		}
		$costs[] = array( 'date' => $date, 'amount' => $amt, 'type' => preg_match( '/subscription|membership/i', (string) ( $r['type'] ?? '' ) ) ? 'membership' : 'connects', 'qty' => absint( $r['qty'] ?? 0 ), 'ref' => 'manual' );
		$new++;
	}
	if ( $new ) {
		update_option( 'dwdc_upwork_costs', $costs, false );
	}
	return $new;
}

/** What Dream Desk shows: the open suggestions, newest first, and when Upwork was last checked. */
function dwduf_summary() {
	$f    = dwduf_get();
	$open = array_values( array_filter( $f['items'], function ( $x ) { return 'new' === $x['state']; } ) );
	usort( $open, function ( $a, $b ) { return strcmp( $b['date'], $a['date'] ); } );
	return array( 'last' => $f['last'], 'items' => $open );
}

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'edit_posts' ); };
	register_rest_route( 'dwd/v1', '/crm/upwork-feed', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$rows = $r->get_param( 'rows' );
		if ( is_string( $rows ) ) {
			$rows = json_decode( $rows, true );
		}
		if ( ! is_array( $rows ) ) {
			return new WP_Error( 'dwduf', 'That isn’t a list of Upwork transactions.', array( 'status' => 400 ) );
		}
		$n  = dwduf_add( $rows );
		$nc = dwduf_costs( $r->get_param( 'costs' ) );
		return array( 'new' => $n, 'costs' => $nc, 'feed' => dwduf_summary() );
	} ) );
	// Mike handled a suggestion: logged (he logged the payment) or dismissed. Optional pid fixes the project match.
	register_rest_route( 'dwd/v1', '/crm/upwork-feed/(?P<ref>[A-Za-z0-9_\-]+)', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$f   = dwduf_get();
		$ref = (string) $r['ref'];
		if ( ! isset( $f['items'][ $ref ] ) ) {
			return new WP_Error( 'dwduf', 'That Upwork item is gone. Refresh and try again.', array( 'status' => 404 ) );
		}
		$st = (string) $r->get_param( 'state' );
		$f['items'][ $ref ]['state'] = in_array( $st, array( 'logged', 'dismissed', 'new' ), true ) ? $st : 'dismissed';
		$pid = (int) $r->get_param( 'pid' );
		if ( $pid && DWDC_CONTACT === get_post_type( $pid ) ) {
			$f['items'][ $ref ]['pid'] = $pid;
			// Remember the Upwork client name → project, so the Upwork file matches it too.
			$team = (string) $f['items'][ $ref ]['client'];
			if ( '' !== $team ) {
				$map          = (array) get_option( 'dwds_upwork_map', array() );
				$map[ $team ] = $pid;
				update_option( 'dwds_upwork_map', $map, false );
			}
		}
		update_option( 'dwdc_upfeed', $f, false );
		return dwduf_summary();
	} ) );
} );

/**
 * Upwork snapshot for the Home tiles and the "In Upwork" popup: the two balances and the pending payments
 * exactly as Upwork's Financial overview lists them. Set by the Upwork check (window.dwdSetUpwork in crm.js).
 * Stored in the option dwd_upwork_snap. Nothing here is matched to projects.
 */
function dwduf_wd_key( $x ) {
	return strtolower( trim( (string) ( $x['client'] ?? '' ) ) ) . '|' . number_format( (float) ( $x['amount'] ?? 0 ), 2, '.', '' ) . '|' . (string) ( $x['date'] ?? '' );
}
/**
 * The snapshot as Dream Desk shows it: items Michael marked withdrawn (option dwd_upwork_wd, kept until Upwork stops
 * listing them) are taken out, and their amounts come off the pending balance, so a stale or repeated Upwork check
 * never brings them back.
 */
function dwduf_snap() {
	$s = get_option( 'dwd_upwork_snap', array() );
	if ( ! is_array( $s ) || ! $s ) {
		return array();
	}
	$wd = (array) get_option( 'dwd_upwork_wd', array() );
	$keep = array();
	$off  = 0;
	foreach ( (array) ( $s['items'] ?? array() ) as $x ) {
		if ( isset( $wd[ dwduf_wd_key( $x ) ] ) ) {
			$off += (float) ( $x['amount'] ?? 0 );
			continue;
		}
		$keep[] = $x;
	}
	$s['items']   = $keep;
	$s['pending'] = round( max( 0, (float) ( $s['pending'] ?? 0 ) - $off ), 2 );
	return $s;
}

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	// Mark one Upwork item withdrawn (it's in the bank): it leaves the In Upwork list for good.
	register_rest_route( 'dwd/v1', '/crm/upwork-snap/withdraw', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$wd = (array) get_option( 'dwd_upwork_wd', array() );
		$wd[ dwduf_wd_key( array( 'client' => sanitize_text_field( (string) $r->get_param( 'client' ) ), 'amount' => (float) $r->get_param( 'amount' ), 'date' => (string) $r->get_param( 'date' ) ) ) ] = current_time( 'Y-m-d' );
		update_option( 'dwd_upwork_wd', $wd, false );
		$s = dwduf_snap();
		return $s ? $s : array( 'none' => true );
	} ) );
	register_rest_route( 'dwd/v1', '/crm/upwork-snap', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () {
			$s = dwduf_snap();
			return $s ? $s : array( 'none' => true );
		} ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$items = array();
			foreach ( (array) $r->get_param( 'items' ) as $x ) {
				if ( ! is_array( $x ) ) {
					continue;
				}
				$date    = (string) ( $x['date'] ?? '' );
				$items[] = array(
					'date'   => preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) ? $date : '',
					'client' => sanitize_text_field( (string) ( $x['client'] ?? '' ) ),
					'job'    => sanitize_text_field( (string) ( $x['job'] ?? '' ) ),
					'amount' => round( (float) ( $x['amount'] ?? 0 ), 2 ),
				);
			}
			$s = array(
				'pending'   => round( (float) $r->get_param( 'pending' ), 2 ),
				'available' => round( (float) $r->get_param( 'available' ), 2 ),
				'items'     => array_slice( $items, 0, 50 ),
				'checked'   => gmdate( 'c' ),
			);
			update_option( 'dwd_upwork_snap', $s, false );
			// Forget withdrawn marks for items Upwork no longer lists.
			$wd = (array) get_option( 'dwd_upwork_wd', array() );
			$live = array();
			foreach ( $items as $x ) {
				$live[ dwduf_wd_key( $x ) ] = 1;
			}
			update_option( 'dwd_upwork_wd', array_intersect_key( $wd, $live ), false );
			return dwduf_snap();
		} ),
	) );
} );
