<?php
/**
 * Weekly payment check: looks for money that may have been logged twice on a project.
 *
 * A pair is flagged when two payments on the same project have the same amount, are within 14 days of each
 * other, and at least one of them has no real PayPal/Stripe transaction number (it came from Paid, an email,
 * an old import or a hand entry). Two payments that both have real transaction numbers are real money and are
 * never flagged. Upwork is left out (it's handled by hand).
 *
 * Each pair is raised once, as a to-do on the project. Nothing is ever changed or removed automatically.
 * "Paid more than the price" is deliberately not checked: extra work and hosting make that normal.
 */
defined( 'ABSPATH' ) || exit;

function dwdpc_find() {
	$ref  = function ( $r ) { return function_exists( 'dwds_generic_ref' ) ? dwds_generic_ref( $r ) : ( '' === trim( (string) $r ) ); };
	$num  = function ( $v ) { return round( (float) preg_replace( '/[^\d.]/', '', (string) $v ), 2 ); };
	$skip = array( 'open', 'void', 'draft', 'failed', 'uncollectible', 'held', 'refunded' );
	$out  = array();
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids', 'meta_key' => '_dwdc_payments' ) ) as $id ) {
		$pays = get_post_meta( $id, '_dwdc_payments', true );
		if ( ! is_array( $pays ) || count( $pays ) < 2 ) {
			continue;
		}
		$ps = array_values( array_filter( $pays, function ( $p ) use ( $skip ) {
			return is_array( $p ) && 'Upwork' !== ( $p['source'] ?? '' ) && ! in_array( strtolower( (string) ( $p['status'] ?? 'paid' ) ), $skip, true ) && strtotime( (string) ( $p['date'] ?? '' ) );
		} ) );
		$n = count( $ps );
		for ( $i = 0; $i < $n; $i++ ) {
			for ( $j = $i + 1; $j < $n; $j++ ) {
				$a = $ps[ $i ];
				$b = $ps[ $j ];
				if ( $num( $a['amount'] ?? 0 ) <= 0 || $num( $a['amount'] ?? 0 ) !== $num( $b['amount'] ?? 0 ) ) {
					continue;
				}
				if ( abs( strtotime( $a['date'] ) - strtotime( $b['date'] ) ) > 14 * DAY_IN_SECONDS ) {
					continue;
				}
				if ( ! $ref( $a['ref'] ?? '' ) && ! $ref( $b['ref'] ?? '' ) ) {
					continue; // both have real transaction numbers: two real payments
				}
				$d     = array( substr( (string) $a['date'], 0, 10 ), substr( (string) $b['date'], 0, 10 ) );
				sort( $d );
				$out[] = array( 'id' => (int) $id, 'name' => html_entity_decode( get_the_title( $id ), ENT_QUOTES, 'UTF-8' ), 'amount' => $num( $a['amount'] ), 'a' => $a, 'b' => $b, 'sig' => $id . ':' . $num( $a['amount'] ) . ':' . implode( ':', $d ) );
			}
		}
	}
	return $out;
}

/** Runs the check and adds a to-do for each pair not raised before. Returns what it found. */
function dwdpc_run() {
	$raised = (array) get_option( 'dwdpc_raised', array() );
	$found  = dwdpc_find();
	$new    = 0;
	foreach ( $found as $f ) {
		if ( isset( $raised[ $f['sig'] ] ) ) {
			continue;
		}
		$fmt = function ( $p ) { return wp_date( 'M j, Y', strtotime( (string) $p['date'] ) ) . ' (' . ( $p['source'] ?? '' ) . ( ! empty( $p['note'] ) ? ', ' . $p['note'] : '' ) . ')'; };
		if ( function_exists( 'dwdc_add_task' ) ) {
			dwdc_add_task( sprintf( 'Possible double payment on %s: $%s on %s and again on %s. If it was only paid once, remove one on the project page and choose "It\'s a duplicate". If both are real, just tick this off.', $f['name'], number_format( $f['amount'], $f['amount'] == (int) $f['amount'] ? 0 : 2 ), $fmt( $f['a'] ), $fmt( $f['b'] ) ), $f['id'], current_time( 'Y-m-d' ) );
		}
		$raised[ $f['sig'] ] = current_time( 'Y-m-d' );
		$new++;
	}
	update_option( 'dwdpc_raised', $raised, false );
	update_option( 'dwdpc_last', array( 'date' => current_time( 'mysql' ), 'found' => count( $found ), 'new' => $new ), false );
	return array( 'found' => count( $found ), 'new' => $new, 'pairs' => array_map( function ( $f ) { return array( 'project' => $f['name'], 'amount' => $f['amount'], 'dates' => array( $f['a']['date'], $f['b']['date'] ), 'refs' => array( $f['a']['ref'] ?? '', $f['b']['ref'] ?? '' ) ); }, $found ) );
}

add_action( 'dwdpc_weekly', 'dwdpc_run' );
add_action( 'init', function () {
	// Already checked with Mike (Nov 18, 2026): both are real payments, so never raise them.
	if ( ! get_option( 'dwdpc_seeded' ) ) {
		$raised = (array) get_option( 'dwdpc_raised', array() );
		foreach ( dwdpc_find() as $f ) {
			if ( in_array( $f['name'], array( 'Soar Growth Consulting LLC', 'Brenda Siebert' ), true ) ) {
				$raised[ $f['sig'] ] = 'ok';
			}
		}
		update_option( 'dwdpc_raised', $raised, false );
		update_option( 'dwdpc_seeded', 1, false );
	}
	if ( ! wp_next_scheduled( 'dwdpc_weekly' ) ) {
		wp_schedule_event( time() + HOUR_IN_SECONDS, 'weekly', 'dwdpc_weekly' );
	}
}, 40 );

add_action( 'rest_api_init', function () {
	// GET: what the check sees right now (changes nothing).
	register_rest_route( 'dwd/v1', '/crm/paycheck', array( 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function () {
		$raised = (array) get_option( 'dwdpc_raised', array() );
		return array( 'last' => get_option( 'dwdpc_last' ), 'next' => wp_next_scheduled( 'dwdpc_weekly' ) ? wp_date( 'c', wp_next_scheduled( 'dwdpc_weekly' ) ) : null, 'pairs' => array_map( function ( $f ) use ( $raised ) { return array( 'project' => $f['name'], 'amount' => $f['amount'], 'dates' => array( $f['a']['date'], $f['b']['date'] ), 'refs' => array( $f['a']['ref'] ?? '', $f['b']['ref'] ?? '' ), 'raised' => $raised[ $f['sig'] ] ?? null ); }, dwdpc_find() ) );
	} ) );
} );
