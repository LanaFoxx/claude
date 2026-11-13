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
		$n = dwduf_add( $rows );
		return array( 'new' => $n, 'feed' => dwduf_summary() );
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
