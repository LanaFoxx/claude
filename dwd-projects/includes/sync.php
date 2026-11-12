<?php
/**
 * Live money sync for Dream Desk:
 * - Stripe webhook  → logs paid invoices / charges on the matching client's project.
 * - PayPal webhook  → logs paid invoices / captured payments the same way.
 * - Upwork CSV      → imports the transaction report, adding only new payments (after fees)
 *                     and Connects / membership costs.
 * Payments that match no client become a to-do so nothing gets lost.
 *
 * @package DWD_Projects
 */

defined( 'ABSPATH' ) || exit;

/* ---------- shared: find the project for an email, and log a payment once ---------- */

function dwds_project_for( $email, $name = '' ) {
	$email = strtolower( trim( (string) $email ) );
	$ids   = array();
	if ( $email ) {
		$ids = get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdc_email', 'meta_value' => $email ) ); // phpcs:ignore
		if ( ! $ids ) {
			$cl = get_posts( array( 'post_type' => DWDC_CLIENT, 'post_status' => 'private', 'posts_per_page' => 1, 'fields' => 'ids', 'meta_key' => '_dwdcl_email', 'meta_value' => $email ) ); // phpcs:ignore
			if ( $cl ) {
				$ids = get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdc_client', 'meta_value' => $cl[0] ) ); // phpcs:ignore
			}
		}
		if ( ! $ids ) {
			$ids = get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_query' => array( array( 'key' => '_dwdc_contacts', 'value' => '"' . $email . '"', 'compare' => 'LIKE' ) ) ) ); // phpcs:ignore
		}
	}
	if ( ! $ids ) {
		return 0;
	}
	// Prefer an open project, then the most recently updated one.
	$rank = array( 'active' => 0, 'hold' => 1, 'limbo' => 2, 'leads' => 3, 'complete' => 4, 'archive' => 5 );
	usort( $ids, function ( $a, $b ) use ( $rank ) {
		$ra = $rank[ get_post_meta( $a, '_dwdc_list', true ) ] ?? 9;
		$rb = $rank[ get_post_meta( $b, '_dwdc_list', true ) ] ?? 9;
		return $ra - $rb ?: strcmp( get_post_modified_time( 'c', true, $b ), get_post_modified_time( 'c', true, $a ) );
	} );
	return (int) $ids[0];
}

/**
 * Add a payment to a project unless that reference is already there.
 *
 * @return string 'added', 'duplicate' or 'unmatched'.
 */
function dwds_log_payment( $source, $email, $who, $amount, $date, $ref, $note = '' ) {
	$amount = round( (float) $amount, 2 );
	if ( $amount <= 0 || ! $ref ) {
		return 'skipped';
	}
	$seen = (array) get_option( 'dwds_seen_refs', array() );
	if ( isset( $seen[ $source . ':' . $ref ] ) ) {
		return 'duplicate';
	}
	$pid = dwds_project_for( $email, $who );
	if ( ! $pid ) {
		if ( function_exists( 'dwdc_add_task' ) ) {
			dwdc_add_task( sprintf( '%s payment of $%s from %s (%s) – assign it to a project', $source, number_format( $amount, 2 ), $who ?: $email ?: 'unknown payer', $date ), 0, current_time( 'Y-m-d' ) );
		}
		$seen[ $source . ':' . $ref ] = 'task';
		update_option( 'dwds_seen_refs', $seen, false );
		return 'unmatched';
	}
	$pays = get_post_meta( $pid, '_dwdc_payments', true );
	$pays = is_array( $pays ) ? $pays : array();
	foreach ( $pays as $p ) {
		if ( (string) ( $p['ref'] ?? '' ) === (string) $ref ) {
			$seen[ $source . ':' . $ref ] = $pid;
			update_option( 'dwds_seen_refs', $seen, false );
			return 'duplicate';
		}
	}
	$pays[] = array( 'date' => $date, 'amount' => (string) $amount, 'source' => $source, 'ref' => $ref, 'status' => 'paid', 'note' => $note );
	usort( $pays, function ( $a, $b ) { return strcmp( (string) ( $b['date'] ?? '' ), (string) ( $a['date'] ?? '' ) ); } );
	update_post_meta( $pid, '_dwdc_payments', $pays );
	$field = array( 'Stripe' => 'stripe', 'PayPal' => 'paypal', 'Upwork' => 'billed' )[ $source ] ?? 'manual';
	update_post_meta( $pid, '_dwdc_' . $field, (string) round( (float) get_post_meta( $pid, '_dwdc_' . $field, true ) + $amount, 2 ) );
	$bal = (float) get_post_meta( $pid, '_dwdc_balance', true );
	if ( $bal > 0 && ! ( function_exists( 'dwdc_is_upwork' ) && dwdc_is_upwork( $pid ) ) ) { // Upwork projects: owed is only changed by hand
		update_post_meta( $pid, '_dwdc_balance', (string) max( 0, round( $bal - $amount, 2 ) ) );
	}
	$notes   = get_post_meta( $pid, '_dwdc_notes', true );
	$notes   = is_array( $notes ) ? $notes : array();
	$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => sprintf( '%s payment received: $%s%s.', $source, number_format( $amount, 2 ), $note ? ' (' . $note . ')' : '' ) );
	update_post_meta( $pid, '_dwdc_notes', $notes );
	wp_update_post( array( 'ID' => $pid ) );
	$seen[ $source . ':' . $ref ] = $pid;
	update_option( 'dwds_seen_refs', $seen, false );
	update_option( 'dwds_last_' . strtolower( $source ), current_time( 'mysql' ), false );
	return 'added';
}

/* ---------- Stripe ---------- */

function dwds_stripe_verify( $payload, $header, $secret ) {
	$parts = array();
	foreach ( explode( ',', (string) $header ) as $kv ) {
		$kv = explode( '=', $kv, 2 );
		if ( 2 === count( $kv ) ) {
			$parts[ $kv[0] ][] = $kv[1];
		}
	}
	if ( empty( $parts['t'][0] ) || empty( $parts['v1'] ) || abs( time() - (int) $parts['t'][0] ) > 600 ) {
		return false;
	}
	$expected = hash_hmac( 'sha256', $parts['t'][0] . '.' . $payload, $secret );
	foreach ( $parts['v1'] as $sig ) {
		if ( hash_equals( $expected, $sig ) ) {
			return true;
		}
	}
	return false;
}

function dwds_stripe_webhook( WP_REST_Request $r ) {
	$secret = (string) get_option( 'dwds_stripe_whsec', '' );
	$body   = $r->get_body();
	if ( ! $secret || ! dwds_stripe_verify( $body, $r->get_header( 'stripe-signature' ), $secret ) ) {
		return new WP_REST_Response( array( 'error' => 'bad signature' ), 400 );
	}
	$e   = json_decode( $body, true );
	$obj = $e['data']['object'] ?? array();
	$res = 'ignored';
	if ( 'invoice.paid' === ( $e['type'] ?? '' ) ) {
		$res = dwds_log_payment( 'Stripe', $obj['customer_email'] ?? '', $obj['customer_name'] ?? '', ( $obj['amount_paid'] ?? 0 ) / 100, gmdate( 'Y-m-d', (int) ( $obj['status_transitions']['paid_at'] ?? time() ) ), $obj['number'] ?? $obj['id'] ?? '', 'Stripe invoice ' . ( $obj['number'] ?? '' ) );
	} elseif ( 'charge.succeeded' === ( $e['type'] ?? '' ) && empty( $obj['invoice'] ) && empty( $obj['metadata']['order_id'] ) ) {
		// One-off charges that aren't invoices and aren't WooCommerce hosting orders (those are tracked by WooCommerce).
		$res = dwds_log_payment( 'Stripe', $obj['billing_details']['email'] ?? $obj['receipt_email'] ?? '', $obj['billing_details']['name'] ?? '', ( $obj['amount'] ?? 0 ) / 100, gmdate( 'Y-m-d', (int) ( $obj['created'] ?? time() ) ), $obj['id'] ?? '', 'Stripe payment' );
	}
	return array( 'ok' => true, 'result' => $res );
}

/* ---------- PayPal ---------- */

function dwds_paypal_token() {
	$id  = (string) get_option( 'dwds_paypal_id', '' );
	$sec = (string) get_option( 'dwds_paypal_secret', '' );
	if ( ! $id || ! $sec ) {
		return '';
	}
	$res = wp_remote_post( 'https://api-m.paypal.com/v1/oauth2/token', array(
		'timeout' => 20,
		'headers' => array( 'Authorization' => 'Basic ' . base64_encode( $id . ':' . $sec ), 'Content-Type' => 'application/x-www-form-urlencoded' ), // phpcs:ignore
		'body'    => 'grant_type=client_credentials',
	) );
	$j = json_decode( wp_remote_retrieve_body( $res ), true );
	return (string) ( $j['access_token'] ?? '' );
}

function dwds_paypal_webhook( WP_REST_Request $r ) {
	$hook  = (string) get_option( 'dwds_paypal_hook', '' );
	$token = dwds_paypal_token();
	$e     = json_decode( $r->get_body(), true );
	if ( ! $hook || ! $token || ! is_array( $e ) ) {
		return new WP_REST_Response( array( 'error' => 'not set up' ), 400 );
	}
	$check = wp_remote_post( 'https://api-m.paypal.com/v1/notifications/verify-webhook-signature', array(
		'timeout' => 20,
		'headers' => array( 'Authorization' => 'Bearer ' . $token, 'Content-Type' => 'application/json' ),
		'body'    => wp_json_encode( array(
			'auth_algo'         => $r->get_header( 'paypal-auth-algo' ),
			'cert_url'          => $r->get_header( 'paypal-cert-url' ),
			'transmission_id'   => $r->get_header( 'paypal-transmission-id' ),
			'transmission_sig'  => $r->get_header( 'paypal-transmission-sig' ),
			'transmission_time' => $r->get_header( 'paypal-transmission-time' ),
			'webhook_id'        => $hook,
			'webhook_event'     => $e,
		) ),
	) );
	$v = json_decode( wp_remote_retrieve_body( $check ), true );
	if ( 'SUCCESS' !== ( $v['verification_status'] ?? '' ) ) {
		return new WP_REST_Response( array( 'error' => 'bad signature' ), 400 );
	}
	$t   = $e['event_type'] ?? '';
	$o   = $e['resource'] ?? array();
	$res = 'ignored';
	if ( 'INVOICING.INVOICE.PAID' === $t ) {
		$inv   = $o['invoice'] ?? $o;
		$email = $inv['primary_recipients'][0]['billing_info']['email_address'] ?? '';
		$name  = trim( ( $inv['primary_recipients'][0]['billing_info']['name']['given_name'] ?? '' ) . ' ' . ( $inv['primary_recipients'][0]['billing_info']['name']['surname'] ?? '' ) );
		$amt   = $inv['payments']['paid_amount']['value'] ?? $inv['amount']['value'] ?? 0;
		$res   = dwds_log_payment( 'PayPal', $email, $name, $amt, substr( (string) ( $inv['payments']['transactions'][0]['payment_date'] ?? current_time( 'Y-m-d' ) ), 0, 10 ), 'INV-' . ( $inv['detail']['invoice_number'] ?? $inv['id'] ?? '' ), 'PayPal invoice ' . ( $inv['detail']['invoice_number'] ?? '' ) );
	} elseif ( in_array( $t, array( 'PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.SALE.COMPLETED' ), true ) && empty( $o['invoice_id'] ) ) {
		$amt = $o['amount']['value'] ?? $o['amount']['total'] ?? 0;
		$res = dwds_log_payment( 'PayPal', $o['payer']['email_address'] ?? '', '', $amt, substr( (string) ( $o['create_time'] ?? current_time( 'c' ) ), 0, 10 ), $o['id'] ?? '', 'PayPal payment' );
	}
	return array( 'ok' => true, 'result' => $res );
}

/* ---------- Upwork CSV ---------- */

function dwds_norm( $s ) {
	return preg_replace( '/[^a-z0-9]/', '', strtolower( (string) $s ) );
}

/** Upwork "Client team" name → project, learned from earlier imports and your picks. */
function dwds_upwork_project( $team ) {
	$map = (array) get_option( 'dwds_upwork_map', array() );
	foreach ( array( $team, sanitize_text_field( $team ) ) as $key ) {
		if ( isset( $map[ $key ] ) && DWDC_CONTACT === get_post_type( (int) $map[ $key ] ) ) {
			return (int) $map[ $key ];
		}
	}
	$n = dwds_norm( $team );
	if ( ! $n ) {
		return 0;
	}
	$hits = array();
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $id ) {
		$cid   = (int) get_post_meta( $id, '_dwdc_client', true );
		$names = array( get_the_title( $id ), get_post_meta( $id, '_dwdc_person', true ), get_post_meta( $id, '_dwdc_company', true ), $cid ? get_the_title( $cid ) : '' );
		foreach ( $names as $x ) {
			if ( $x && dwds_norm( $x ) === $n ) {
				$hits[ $id ] = 1;
			}
		}
	}
	return 1 === count( $hits ) ? (int) array_keys( $hits )[0] : 0;
}

function dwds_upwork_import( $csv ) {
	$lines = preg_split( '/\r\n|\n|\r/', (string) $csv );
	$head  = str_getcsv( (string) array_shift( $lines ) );
	$head  = array_map( function ( $h ) { return trim( preg_replace( '/^\xEF\xBB\xBF/', '', $h ) ); }, $head );
	if ( ! in_array( 'Transaction type', $head, true ) || ! in_array( 'Amount $', $head, true ) ) {
		return new WP_Error( 'dwds_csv', 'That doesn’t look like an Upwork transaction report.', array( 'status' => 400 ) );
	}
	$rows = array();
	foreach ( $lines as $l ) {
		if ( '' === trim( $l ) ) {
			continue;
		}
		$v = str_getcsv( $l );
		$rows[] = array_combine( $head, array_pad( array_slice( $v, 0, count( $head ) ), count( $head ), '' ) );
	}
	$amt  = function ( $x ) { return (float) str_replace( array( ',', '$' ), '', (string) $x ); };
	$date = function ( $x ) { $t = strtotime( (string) $x ); return $t ? gmdate( 'Y-m-d', $t ) : ''; };
	// Upwork fees sit on their own rows, sharing the Transaction ID of the earning they belong to.
	$fees = array();
	foreach ( $rows as $x ) {
		if ( 'Service Fee' === $x['Transaction type'] && '' !== ( $x['Transaction ID'] ?? '' ) ) {
			$fees[ $x['Transaction ID'] ] = ( $fees[ $x['Transaction ID'] ] ?? 0 ) + $amt( $x['Amount $'] );
		}
	}
	$out     = array( 'added' => 0, 'already' => 0, 'amount' => 0, 'costs' => 0, 'unmatched' => array() );
	$costs   = (array) get_option( 'dwdc_upwork_costs', array() );
	$costRef = array();
	foreach ( $costs as $c ) {
		$costRef[ ( $c['ref'] ?? '' ) . '|' . ( $c['date'] ?? '' ) ] = 1;
	}
	foreach ( $rows as $x ) {
		$t = $x['Transaction type'];
		$d = $date( $x['Date'] );
		if ( in_array( $t, array( 'Connects', 'Subscription' ), true ) ) {
			$k = ( $x['Ref ID'] ?? '' ) . '|' . $d;
			if ( ! isset( $costRef[ $k ] ) ) {
				preg_match( '/(\d+)\s+Connects/', (string) $x['Transaction summary'], $m );
				$costs[]         = array( 'date' => $d, 'amount' => round( -$amt( $x['Amount $'] ), 2 ), 'type' => 'Connects' === $t ? 'connects' : 'membership', 'qty' => isset( $m[1] ) ? (int) $m[1] : 0, 'ref' => $x['Ref ID'] ?? '' );
				$costRef[ $k ]   = 1;
				$out['costs']++;
			}
			continue;
		}
		if ( ! in_array( $t, array( 'Fixed-price', 'Hourly', 'Bonus', 'Miscellaneous', 'Refund to client' ), true ) ) {
			continue;
		}
		$team = trim( (string) ( $x['Client team'] ?? '' ) );
		$pid  = dwds_upwork_project( $team );
		$a    = $amt( $x['Amount $'] );
		$net  = $a + ( $fees[ $x['Transaction ID'] ?? '' ] ?? 0 );
		if ( ! $pid ) {
			$out['unmatched'][ $team ] = ( $out['unmatched'][ $team ] ?? 0 ) + $net;
			continue;
		}
		$ref  = (string) ( $x['Ref ID'] ?: $x['Transaction ID'] );
		$pays = get_post_meta( $pid, '_dwdc_payments', true );
		$pays = is_array( $pays ) ? $pays : array();
		$dup  = false;
		foreach ( $pays as $p ) {
			if ( 'Upwork' === ( $p['source'] ?? '' ) && (string) ( $p['ref'] ?? '' ) === $ref ) {
				$dup = true;
				break;
			}
		}
		if ( $dup ) {
			$out['already']++;
			continue;
		}
		$refund = 'Refund to client' === $t;
		list( $ust, $d ) = $refund ? array( 'refunded', $d ) : dwds_upwork_state( $pid, $ref, $d );
		$pays[] = array( 'date' => $d, 'amount' => sprintf( '%.2f', abs( $net ) ), 'source' => 'Upwork', 'ref' => $ref, 'status' => $ust, 'note' => mb_substr( ( $refund ? 'Refund · ' : '' ) . $x['Transaction summary'] . ' · after Upwork fee ($' . number_format( abs( $a ), 2 ) . ' gross)', 0, 140 ) );
		usort( $pays, function ( $p1, $p2 ) { return strcmp( (string) ( $p2['date'] ?? '' ), (string) ( $p1['date'] ?? '' ) ); } );
		update_post_meta( $pid, '_dwdc_payments', $pays );
		if ( 'held' !== $ust ) {
			update_post_meta( $pid, '_dwdc_billed', (string) round( (float) get_post_meta( $pid, '_dwdc_billed', true ) + $net, 2 ) );
		}
		wp_update_post( array( 'ID' => $pid ) );
		$out['added']++;
		$out['amount'] += $net;
	}
	$fileCosts = array_values( array_filter( $costs, function ( $c ) { return 'manual' !== ( $c['ref'] ?? '' ); } ) );
	update_option( 'dwdc_upwork_costs', dwds_merge_manual_costs( $fileCosts, $costs ), false );
	update_option( 'dwds_last_upwork', current_time( 'mysql' ), false );
	$out['amount']    = round( $out['amount'], 2 );
	$out['unmatched'] = array_map( function ( $k, $v ) { return array( 'team' => $k, 'amount' => round( $v, 2 ) ); }, array_keys( $out['unmatched'] ), array_values( $out['unmatched'] ) );
	if ( $out['added'] && function_exists( 'dwdt_get' ) ) {
		dwdt_get( true );
	}
	return $out;
}

/* ---------- REST ---------- */

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };

	register_rest_route( 'dwd/v1', '/stripe-webhook', array( 'methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => 'dwds_stripe_webhook' ) );
	register_rest_route( 'dwd/v1', '/paypal-webhook', array( 'methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => 'dwds_paypal_webhook' ) );

	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/upwork-release', array( 'methods' => 'POST', 'permission_callback' => function () { return current_user_can( 'edit_posts' ); }, 'callback' => function ( $r ) {
		$amt = dwds_upwork_release( (int) $r['id'] );
		return array( 'amount' => $amt, 'project' => dwdc_contact( (int) $r['id'], true ) );
	} ) );
	register_rest_route( 'dwd/v1', '/crm/sync', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () {
			return array(
				'stripe' => array( 'url' => rest_url( 'dwd/v1/stripe-webhook' ), 'ready' => (bool) get_option( 'dwds_stripe_whsec', '' ), 'key' => (bool) get_option( 'dwds_stripe_key', '' ), 'last' => get_option( 'dwds_last_stripe', '' ) ),
				'paypal' => array( 'url' => rest_url( 'dwd/v1/paypal-webhook' ), 'ready' => (bool) ( get_option( 'dwds_paypal_id' ) && get_option( 'dwds_paypal_secret' ) && get_option( 'dwds_paypal_hook' ) ), 'last' => get_option( 'dwds_last_paypal', '' ) ),
				'upwork' => array( 'last' => get_option( 'dwds_last_upwork', '' ), 'files' => array_values( dwds_files() ) ),
				'refreshed' => get_option( 'dwds_last_refresh', '' ),
			);
		} ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$d = (array) $r->get_json_params();
			foreach ( array( 'stripe_key' => '/^(rk|sk)_live_[A-Za-z0-9]+$/', 'stripe_whsec' => '/^whsec_[A-Za-z0-9]+$/', 'paypal_id' => '/^[A-Za-z0-9_\-]{20,}$/', 'paypal_secret' => '/^[A-Za-z0-9_\-]{20,}$/', 'paypal_hook' => '/^[A-Za-z0-9]{8,}$/' ) as $k => $re ) {
				if ( isset( $d[ $k ] ) && '' !== trim( (string) $d[ $k ] ) ) {
					$v = trim( (string) $d[ $k ] );
					if ( ! preg_match( $re, $v ) ) {
						return new WP_Error( 'dwds_bad', 'That ' . str_replace( '_', ' ', $k ) . ' doesn’t look right.', array( 'status' => 400 ) );
					}
					update_option( 'dwds_' . $k, $v, false );
				}
			}
			if ( ! empty( $d['paypal_id'] ) && ! dwds_paypal_token() ) {
				return new WP_Error( 'dwds_pp', 'PayPal didn’t accept that Client ID and Secret. Use the Live (not Sandbox) credentials.', array( 'status' => 400 ) );
			}
			return array( 'ok' => true );
		} ),
	) );

	register_rest_route( 'dwd/v1', '/crm/upwork-import', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$map = (array) get_option( 'dwds_upwork_map', array() );
		foreach ( (array) $r->get_param( 'map' ) as $team => $pid ) {
			if ( DWDC_CONTACT === get_post_type( (int) $pid ) ) {
				$map[ sanitize_text_field( $team ) ] = (int) $pid;
			}
		}
		update_option( 'dwds_upwork_map', $map, false );
		return dwds_upwork_import( (string) $r->get_param( 'csv' ) );
	} ) );

	// One-time: remember which Upwork client names belong to which projects (from the first import).
	register_rest_route( 'dwd/v1', '/crm/upwork-map', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$map = (array) get_option( 'dwds_upwork_map', array() );
		foreach ( (array) $r->get_param( 'map' ) as $team => $pid ) {
			$map[ sanitize_text_field( $team ) ] = (int) $pid;
		}
		update_option( 'dwds_upwork_map', $map, false );
		return array( 'saved' => count( $map ) );
	} ) );
} );

/* =====================================================================
 * Stored Upwork files + "Update Finances" (rebuild from every source)
 * ===================================================================== */

/** Parse an Upwork transaction CSV into earnings and costs (fees already taken out). */
function dwds_upwork_parse( $csv ) {
	$lines = preg_split( '/\r\n|\n|\r/', (string) $csv );
	$head  = array_map( function ( $h ) { return trim( preg_replace( '/^\xEF\xBB\xBF/', '', $h ) ); }, str_getcsv( (string) array_shift( $lines ) ) );
	if ( ! in_array( 'Transaction type', $head, true ) || ! in_array( 'Amount $', $head, true ) ) {
		return null;
	}
	$rows = array();
	foreach ( $lines as $l ) {
		if ( '' !== trim( $l ) ) {
			$rows[] = array_combine( $head, array_pad( array_slice( str_getcsv( $l ), 0, count( $head ) ), count( $head ), '' ) );
		}
	}
	$amt  = function ( $x ) { return (float) str_replace( array( ',', '$' ), '', (string) $x ); };
	$date = function ( $x ) { $t = strtotime( (string) $x ); return $t ? gmdate( 'Y-m-d', $t ) : ''; };
	$fees = array();
	foreach ( $rows as $x ) {
		if ( 'Service Fee' === $x['Transaction type'] && '' !== ( $x['Transaction ID'] ?? '' ) ) {
			$fees[ $x['Transaction ID'] ] = ( $fees[ $x['Transaction ID'] ] ?? 0 ) + $amt( $x['Amount $'] );
		}
	}
	$earn  = array();
	$costs = array();
	$min   = '';
	$max   = '';
	foreach ( $rows as $x ) {
		$t = $x['Transaction type'];
		$d = $date( $x['Date'] );
		if ( $d ) {
			$min = $min ? min( $min, $d ) : $d;
			$max = max( $max, $d );
		}
		if ( in_array( $t, array( 'Connects', 'Subscription' ), true ) ) {
			preg_match( '/(\d+)\s+Connects/', (string) $x['Transaction summary'], $m );
			$costs[] = array( 'date' => $d, 'amount' => round( -$amt( $x['Amount $'] ), 2 ), 'type' => 'Connects' === $t ? 'connects' : 'membership', 'qty' => isset( $m[1] ) ? (int) $m[1] : 0, 'ref' => (string) ( $x['Ref ID'] ?? '' ) );
		} elseif ( in_array( $t, array( 'Fixed-price', 'Hourly', 'Bonus', 'Miscellaneous', 'Refund to client' ), true ) ) {
			$a      = $amt( $x['Amount $'] );
			$earn[] = array( 'team' => trim( (string) ( $x['Client team'] ?? '' ) ), 'date' => $d, 'gross' => $a, 'net' => round( $a + ( $fees[ $x['Transaction ID'] ?? '' ] ?? 0 ), 2 ), 'ref' => (string) ( $x['Ref ID'] ?: $x['Transaction ID'] ), 'refund' => 'Refund to client' === $t, 'summary' => (string) $x['Transaction summary'], 'type' => $t );
		}
	}
	return array( 'earn' => $earn, 'costs' => $costs, 'from' => $min, 'to' => $max );
}

function dwds_files() {
	return (array) get_option( 'dwds_upwork_files', array() );
}

/** Save an uploaded CSV to the list (same content twice is ignored). */
function dwds_file_add( $name, $csv ) {
	$p = dwds_upwork_parse( $csv );
	if ( ! $p ) {
		return new WP_Error( 'dwds_csv', 'That doesn’t look like an Upwork transaction report.', array( 'status' => 400 ) );
	}
	$hash  = md5( $csv );
	$files = dwds_files();
	foreach ( $files as $f ) {
		if ( $f['hash'] === $hash ) {
			return $f;
		}
	}
	$id = substr( $hash, 0, 12 );
	update_option( 'dwds_upf_' . $id, $csv, false );
	$f       = array( 'id' => $id, 'hash' => $hash, 'name' => sanitize_file_name( $name ?: 'upwork-report.csv' ), 'uploaded' => current_time( 'Y-m-d' ), 'from' => $p['from'], 'to' => $p['to'], 'payments' => count( $p['earn'] ), 'costs' => count( $p['costs'] ) );
	$files[] = $f;
	update_option( 'dwds_upwork_files', $files, false );
	return $f;
}

/**
 * Connects purchases logged by hand (ref "manual", e.g. from Ask Dream Desk) stay until an
 * Upwork file brings in the same purchase (same amount within 3 days); then the file's row wins.
 */
function dwds_merge_manual_costs( $file_costs, $old ) {
	foreach ( (array) $old as $m ) {
		if ( 'manual' !== ( $m['ref'] ?? '' ) ) {
			continue;
		}
		$dup = false;
		foreach ( $file_costs as $c ) {
			if ( 'manual' !== ( $c['ref'] ?? '' ) && abs( (float) $c['amount'] - (float) $m['amount'] ) < 0.01 && abs( strtotime( $c['date'] ) - strtotime( $m['date'] ) ) <= 3 * DAY_IN_SECONDS ) {
				$dup = true;
				break;
			}
		}
		if ( ! $dup ) {
			$file_costs[] = $m;
		}
	}
	return $file_costs;
}

/**
 * Rebuild every project's Upwork payments from the files on the list.
 * Upwork money that never came from a file (older totals) is kept as it was.
 */
/**
 * Upwork money Mike hasn't withdrawn yet. On a project "on hold", payments from the Upwork file are kept but marked
 * "held": they don't count as paid, in Made in <month> or in revenue. Mark paid releases them, dated the day Mike
 * marks it (when the money reaches the bank), and the Upwork file never changes that back.
 */
function dwds_upwork_state( $pid, $ref, $date ) {
	$on = (array) get_post_meta( $pid, '_dwdc_upwork_paid_on', true );
	if ( isset( $on[ (string) $ref ] ) ) {
		return array( 'paid', (string) $on[ (string) $ref ] );
	}
	return array( '1' === get_post_meta( $pid, '_dwdc_upwork_hold', true ) ? 'held' : 'paid', $date );
}

/** Put a project's Upwork payments on hold (true) or back to paid (false), keeping Paid in step. */
function dwds_upwork_hold( $pid, $hold ) {
	update_post_meta( $pid, '_dwdc_upwork_hold', $hold ? '1' : '' );
	$pays = get_post_meta( $pid, '_dwdc_payments', true );
	if ( ! is_array( $pays ) ) {
		return;
	}
	$on = (array) get_post_meta( $pid, '_dwdc_upwork_paid_on', true );
	foreach ( $pays as $i => $x ) {
		if ( 'Upwork' === ( $x['source'] ?? '' ) && preg_match( '/^\d+$/', (string) ( $x['ref'] ?? '' ) ) && ! isset( $on[ (string) $x['ref'] ] ) && in_array( $x['status'] ?? 'paid', array( 'paid', 'held' ), true ) ) {
			$pays[ $i ]['status'] = $hold ? 'held' : 'paid';
		}
	}
	update_post_meta( $pid, '_dwdc_payments', $pays );
}

/** Mark paid on a held project: its Upwork money counts from today (it just reached the bank). */
function dwds_upwork_release( $pid ) {
	$pays  = get_post_meta( $pid, '_dwdc_payments', true );
	$pays  = is_array( $pays ) ? $pays : array();
	$on    = (array) get_post_meta( $pid, '_dwdc_upwork_paid_on', true );
	$today = current_time( 'Y-m-d' );
	$sum   = 0;
	foreach ( $pays as $i => $x ) {
		if ( 'held' === ( $x['status'] ?? '' ) ) {
			$on[ (string) $x['ref'] ] = $today;
			$pays[ $i ]['status']     = 'paid';
			$pays[ $i ]['note']       = mb_substr( 'Withdrawn from Upwork · earned ' . $x['date'] . ' · ' . ( $x['note'] ?? '' ), 0, 160 );
			$pays[ $i ]['date']       = $today;
			$sum                     += (float) $x['amount'];
		}
	}
	usort( $pays, function ( $a, $b ) { return strcmp( (string) ( $b['date'] ?? '' ), (string) ( $a['date'] ?? '' ) ); } );
	update_post_meta( $pid, '_dwdc_payments', $pays );
	update_post_meta( $pid, '_dwdc_upwork_paid_on', $on );
	update_post_meta( $pid, '_dwdc_upwork_hold', '' );
	if ( $sum ) {
		update_post_meta( $pid, '_dwdc_billed', (string) round( (float) get_post_meta( $pid, '_dwdc_billed', true ) + $sum, 2 ) );
	}
	update_post_meta( $pid, '_dwdc_balance', '0' );
	return round( $sum, 2 );
}

function dwds_upwork_rebuild() {
	$earn  = array();
	$costs = array();
	$seen  = array();
	foreach ( dwds_files() as $f ) {
		$p = dwds_upwork_parse( (string) get_option( 'dwds_upf_' . $f['id'], '' ) );
		if ( ! $p ) {
			continue;
		}
		foreach ( $p['earn'] as $e ) {
			if ( ! isset( $seen[ 'e' . $e['ref'] ] ) ) {
				$seen[ 'e' . $e['ref'] ] = 1;
				$earn[]                  = $e;
			}
		}
		foreach ( $p['costs'] as $c ) {
			$k = 'c' . $c['ref'] . '|' . $c['date'];
			if ( ! isset( $seen[ $k ] ) ) {
				$seen[ $k ] = 1;
				$costs[]    = $c;
			}
		}
	}
	$by        = array();
	$unmatched = array();
	foreach ( $earn as $e ) {
		$pid = dwds_upwork_project( $e['team'] );
		if ( ! $pid ) {
			$unmatched[ $e['team'] ] = ( $unmatched[ $e['team'] ] ?? 0 ) + $e['net'];
			continue;
		}
		list( $ust, $udate ) = $e['refund'] ? array( 'refunded', $e['date'] ) : dwds_upwork_state( $pid, $e['ref'], $e['date'] );
		$by[ $pid ][] = array( 'date' => $udate, 'amount' => sprintf( '%.2f', abs( $e['net'] ) ), 'source' => 'Upwork', 'ref' => $e['ref'], 'status' => $ust, 'note' => mb_substr( ( $e['refund'] ? 'Refund · ' : '' ) . $e['summary'] . ( in_array( $e['type'], array( 'Hourly', 'Bonus' ), true ) ? ' · ' . $e['type'] : '' ) . ' · after Upwork fee ($' . number_format( abs( $e['gross'] ), 2 ) . ' gross)', 0, 140 ) );
	}
	$touched = 0;
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $pid ) {
		$pays    = get_post_meta( $pid, '_dwdc_payments', true );
		$pays    = is_array( $pays ) ? $pays : array();
		$oldFile = 0;
		$keep    = array();
		foreach ( $pays as $x ) {
			if ( 'Upwork' === ( $x['source'] ?? '' ) && '' !== (string) ( $x['ref'] ?? '' ) ) {
				if ( 'held' !== ( $x['status'] ?? '' ) ) { // held money was never counted in Paid
					$oldFile += ( 'refunded' === ( $x['status'] ?? '' ) ? -1 : 1 ) * (float) $x['amount'];
				}
			} else {
				$keep[] = $x;
			}
		}
		$new = $by[ $pid ] ?? array();
		if ( ! $new && ! $oldFile ) {
			continue;
		}
		$newSum = 0;
		foreach ( $new as $x ) {
			if ( 'held' !== $x['status'] ) {
				$newSum += ( 'refunded' === $x['status'] ? -1 : 1 ) * (float) $x['amount'];
			}
		}
		$all = array_merge( $keep, $new );
		usort( $all, function ( $a, $b ) { return strcmp( (string) ( $b['date'] ?? '' ), (string) ( $a['date'] ?? '' ) ); } );
		update_post_meta( $pid, '_dwdc_payments', $all );
		$billed = (float) get_post_meta( $pid, '_dwdc_billed', true ) - $oldFile + $newSum;
		update_post_meta( $pid, '_dwdc_billed', $billed > 0.004 ? (string) round( $billed, 2 ) : '' );
		$touched++;
	}
	update_option( 'dwdc_upwork_costs', dwds_merge_manual_costs( $costs, get_option( 'dwdc_upwork_costs', array() ) ), false );
	return array( 'payments' => count( $earn ), 'projects' => $touched, 'unmatched' => array_map( function ( $k, $v ) { return array( 'team' => $k, 'amount' => round( $v, 2 ) ); }, array_keys( $unmatched ), array_values( $unmatched ) ) );
}

/** Is this payment already on the project (same reference, or same amount within 3 days)? */
function dwds_has_payment( $pid, $source, $ref, $amount, $date ) {
	$pays = get_post_meta( $pid, '_dwdc_payments', true );
	foreach ( is_array( $pays ) ? $pays : array() as $x ) {
		if ( ( $x['source'] ?? '' ) !== $source ) {
			continue;
		}
		if ( $ref && (string) ( $x['ref'] ?? '' ) === (string) $ref ) {
			return true;
		}
		if ( abs( (float) $x['amount'] - $amount ) < 0.01 && abs( strtotime( (string) $x['date'] ) - strtotime( $date ) ) <= 3 * DAY_IN_SECONDS ) {
			return true;
		}
	}
	return false;
}

/** Is this payment already anywhere in Dream Desk (any project)? Same reference, or same amount within 3 days. */
function dwds_seen_anywhere( $source, $ref, $amount, $date ) {
	static $all = null;
	if ( null === $all ) {
		$all = array();
		foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $pid ) {
			foreach ( (array) get_post_meta( $pid, '_dwdc_payments', true ) as $x ) {
				if ( is_array( $x ) && ( $x['source'] ?? '' ) === $source ) {
					$all[] = array( (string) ( $x['ref'] ?? '' ), (float) $x['amount'], strtotime( (string) $x['date'] ) );
				}
			}
		}
	}
	$t = strtotime( $date );
	foreach ( $all as $a ) {
		if ( ( $ref && $a[0] === (string) $ref ) || ( abs( $a[1] - $amount ) < 0.01 && abs( $a[2] - $t ) <= 3 * DAY_IN_SECONDS ) ) {
			return true;
		}
	}
	$all[] = array( (string) $ref, (float) $amount, $t ); // count it as seen for the rest of this run
	return false;
}

/** Pull paid Stripe invoices and one-off charges (needs a read-only restricted key). */
function dwds_stripe_pull() {
	$key = (string) get_option( 'dwds_stripe_key', '' );
	if ( ! $key ) {
		return array( 'skipped' => 'No Stripe key yet' );
	}
	$out  = array( 'added' => 0, 'already' => 0, 'unmatched' => 0 );
	$get  = function ( $path ) use ( $key ) {
		$r = wp_remote_get( 'https://api.stripe.com/v1/' . $path, array( 'timeout' => 30, 'headers' => array( 'Authorization' => 'Bearer ' . $key ) ) );
		return json_decode( wp_remote_retrieve_body( $r ), true );
	};
	$take = function ( $email, $who, $amount, $date, $ref, $note ) use ( &$out ) {
		$pid = dwds_project_for( $email, $who );
		if ( dwds_seen_anywhere( 'Stripe', $ref, $amount, $date ) ) {
			$out['already']++;
			return;
		}
		if ( ! $pid && $date < gmdate( 'Y-m-d', strtotime( '-60 days' ) ) ) {
			$out['unmatched']++; // old and unmatched: count it, don't flood the to-do list
			return;
		}
		$r = dwds_log_payment( 'Stripe', $email, $who, $amount, $date, $ref, $note );
		$out[ 'added' === $r ? 'added' : ( 'unmatched' === $r ? 'unmatched' : 'already' ) ]++;
	};
	$after = '';
	for ( $i = 0; $i < 30; $i++ ) {
		$j = $get( 'invoices?status=paid&limit=100' . ( $after ? '&starting_after=' . $after : '' ) );
		if ( empty( $j['data'] ) ) {
			if ( ! empty( $j['error'] ) ) {
				return array( 'error' => 'Stripe: ' . ( $j['error']['message'] ?? 'key rejected' ) );
			}
			break;
		}
		foreach ( $j['data'] as $o ) {
			$take( $o['customer_email'] ?? '', $o['customer_name'] ?? '', ( $o['amount_paid'] ?? 0 ) / 100, gmdate( 'Y-m-d', (int) ( $o['status_transitions']['paid_at'] ?? $o['created'] ) ), $o['number'] ?? $o['id'], 'Stripe invoice ' . ( $o['number'] ?? '' ) );
			$after = $o['id'];
		}
		if ( empty( $j['has_more'] ) ) {
			break;
		}
	}
	$after = '';
	for ( $i = 0; $i < 30; $i++ ) {
		$j = $get( 'charges?limit=100' . ( $after ? '&starting_after=' . $after : '' ) );
		if ( empty( $j['data'] ) ) {
			break;
		}
		foreach ( $j['data'] as $o ) {
			$after = $o['id'];
			if ( empty( $o['paid'] ) || 'succeeded' !== ( $o['status'] ?? '' ) || ! empty( $o['invoice'] ) || ! empty( $o['metadata']['order_id'] ) || ! empty( $o['refunded'] ) ) {
				continue;
			}
			$take( $o['billing_details']['email'] ?? $o['receipt_email'] ?? '', $o['billing_details']['name'] ?? '', ( $o['amount'] ?? 0 ) / 100, gmdate( 'Y-m-d', (int) $o['created'] ), $o['id'], 'Stripe payment' );
		}
		if ( empty( $j['has_more'] ) ) {
			break;
		}
	}
	return $out;
}

/** Pull incoming PayPal payments (last 3 years) with the Transaction Search API. */
function dwds_paypal_pull() {
	$token = dwds_paypal_token();
	if ( ! $token ) {
		return array( 'skipped' => 'No PayPal app yet' );
	}
	$out = array( 'added' => 0, 'already' => 0, 'unmatched' => 0 );
	$end = time();
	for ( $i = 0; $i < 37; $i++ ) {
		$start = $end - 30 * DAY_IN_SECONDS;
		$page  = 1;
		do {
			$r = wp_remote_get( 'https://api-m.paypal.com/v1/reporting/transactions?fields=transaction_info,payer_info&page_size=500&page=' . $page . '&start_date=' . rawurlencode( gmdate( 'Y-m-d\TH:i:s\Z', $start ) ) . '&end_date=' . rawurlencode( gmdate( 'Y-m-d\TH:i:s\Z', $end ) ), array( 'timeout' => 30, 'headers' => array( 'Authorization' => 'Bearer ' . $token ) ) );
			$j = json_decode( wp_remote_retrieve_body( $r ), true );
			if ( ! empty( $j['name'] ) && empty( $j['transaction_details'] ) ) {
				return 'NOT_AUTHORIZED' === $j['name'] || 'PERMISSION_DENIED' === $j['name'] ? array( 'error' => 'PayPal: turn on “Transaction search” for your app in the PayPal developer dashboard.' ) : $out;
			}
			foreach ( (array) ( $j['transaction_details'] ?? array() ) as $t ) {
				$ti  = $t['transaction_info'] ?? array();
				$amt = (float) ( $ti['transaction_amount']['value'] ?? 0 );
				$ev  = (string) ( $ti['transaction_event_code'] ?? '' );
				if ( $amt <= 0 || 'S' !== ( $ti['transaction_status'] ?? 'S' ) || ! preg_match( '/^T0(0|1)/', $ev ) ) {
					continue; // incoming, completed payments only (no transfers, holds or currency moves)
				}
				$email = $t['payer_info']['email_address'] ?? '';
				$who   = $t['payer_info']['payer_name']['alternate_full_name'] ?? '';
				$date  = substr( (string) ( $ti['transaction_initiation_date'] ?? '' ), 0, 10 );
				$ref   = (string) ( $ti['transaction_id'] ?? '' );
				$pid   = dwds_project_for( $email, $who );
				if ( dwds_seen_anywhere( 'PayPal', $ref, $amt, $date ) ) {
					$out['already']++;
					continue;
				}
				if ( ! $pid && $date < gmdate( 'Y-m-d', strtotime( '-60 days' ) ) ) {
					$out['unmatched']++;
					continue;
				}
				$res = dwds_log_payment( 'PayPal', $email, $who, $amt, $date, $ref, 'PayPal payment' );
				$out[ 'added' === $res ? 'added' : ( 'unmatched' === $res ? 'unmatched' : 'already' ) ]++;
			}
			$page++;
		} while ( ! empty( $j['total_pages'] ) && $page <= (int) $j['total_pages'] );
		$end = $start;
	}
	return $out;
}

/** "Update Finances": every source, then the weekly trends. Manual payments are always kept. */
function dwds_refresh() {
	if ( function_exists( 'set_time_limit' ) ) {
		@set_time_limit( 300 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
	}
	$res = array(
		'upwork' => dwds_upwork_rebuild(),
		'stripe' => dwds_stripe_pull(),
		'paypal' => dwds_paypal_pull(),
	);
	$manual = 0;
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $pid ) {
		foreach ( (array) get_post_meta( $pid, '_dwdc_payments', true ) as $x ) {
			if ( is_array( $x ) && ! in_array( $x['source'] ?? '', array( 'Upwork', 'Stripe', 'PayPal' ), true ) && 'paid' === ( $x['status'] ?? 'paid' ) ) {
				$manual += (float) $x['amount'];
			}
		}
	}
	$res['manual'] = array( 'total' => round( $manual, 2 ) );
	if ( function_exists( 'dwdt_get' ) ) {
		dwdt_get( true );
	}
	update_option( 'dwds_last_refresh', current_time( 'mysql' ), false );
	return $res;
}

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	register_rest_route( 'dwd/v1', '/crm/upwork-files', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () { return array_values( dwds_files() ); } ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$map = (array) get_option( 'dwds_upwork_map', array() );
			foreach ( (array) $r->get_param( 'map' ) as $team => $pid ) {
				if ( DWDC_CONTACT === get_post_type( (int) $pid ) ) {
					$map[ sanitize_text_field( $team ) ] = (int) $pid;
				}
			}
			update_option( 'dwds_upwork_map', $map, false );
			if ( '' !== (string) $r->get_param( 'csv' ) ) {
				$f = dwds_file_add( (string) $r->get_param( 'name' ), (string) $r->get_param( 'csv' ) );
				if ( is_wp_error( $f ) ) {
					return $f;
				}
			}
			$out          = dwds_upwork_rebuild();
			$out['files'] = array_values( dwds_files() );
			update_option( 'dwds_last_upwork', current_time( 'mysql' ), false );
			if ( function_exists( 'dwdt_get' ) ) {
				dwdt_get( true );
			}
			return $out;
		} ),
	) );
	register_rest_route( 'dwd/v1', '/crm/upwork-files/(?P<id>[a-f0-9]{12})', array( 'methods' => 'DELETE', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$id    = (string) $r['id'];
		$files = array_values( array_filter( dwds_files(), function ( $f ) use ( $id ) { return $f['id'] !== $id; } ) );
		update_option( 'dwds_upwork_files', $files, false );
		delete_option( 'dwds_upf_' . $id );
		$out          = dwds_upwork_rebuild();
		$out['files'] = $files;
		if ( function_exists( 'dwdt_get' ) ) {
			dwdt_get( true );
		}
		return $out;
	} ) );
	register_rest_route( 'dwd/v1', '/crm/refresh', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function () { return dwds_refresh(); } ) );
} );

/** Every payment received in one month (YYYY-MM), for the month breakdown on Money Stats. */
add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/crm/month', array( 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function ( $r ) {
		$ym = (string) $r->get_param( 'ym' );
		if ( ! preg_match( '/^\d{4}-\d{2}$/', $ym ) ) {
			return new WP_Error( 'dwdc_ym', 'Pick a month.', array( 'status' => 400 ) );
		}
		$rows = array();
		foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $pid ) {
			$pays = get_post_meta( $pid, '_dwdc_payments', true );
			if ( ! is_array( $pays ) ) {
				continue;
			}
			$cid = (int) get_post_meta( $pid, '_dwdc_client', true );
			foreach ( $pays as $x ) {
				$st = strtolower( (string) ( $x['status'] ?? 'paid' ) );
				if ( 0 !== strpos( (string) ( $x['date'] ?? '' ), $ym ) || in_array( $st, array( 'open', 'void', 'draft', 'failed', 'uncollectible', 'held' ), true ) ) {
					continue;
				}
				$src    = in_array( $x['source'] ?? '', array( 'Upwork', 'Stripe', 'PayPal' ), true ) ? $x['source'] : 'Other';
				$rows[] = array(
					'date'    => $x['date'],
					'amount'  => round( ( 'refunded' === $st ? -1 : 1 ) * (float) preg_replace( '/[^\d.]/', '', (string) $x['amount'] ), 2 ),
					'source'  => $src,
					'method'  => 'Other' === $src ? (string) ( $x['source'] ?? '' ) : $src,
					'project' => html_entity_decode( get_the_title( $pid ), ENT_QUOTES ),
					'pid'     => $pid,
					'client'  => html_entity_decode( $cid ? get_the_title( $cid ) : (string) get_post_meta( $pid, '_dwdc_person', true ), ENT_QUOTES ),
					'note'    => (string) ( $x['note'] ?? '' ),
					'refund'  => 'refunded' === $st,
				);
			}
		}
		usort( $rows, function ( $a, $b ) { return strcmp( $b['date'], $a['date'] ) ?: ( $b['amount'] <=> $a['amount'] ); } );
		return array( 'ym' => $ym, 'rows' => $rows );
	} ) );
} );

/** Read-only: list a client's Stripe charges in a date range (to double-check payments). */
add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/crm/stripe-check', array( 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function ( $r ) {
		$key = (string) get_option( 'dwds_stripe_key', '' );
		if ( ! $key ) {
			return new WP_Error( 'dwds_nokey', 'No Stripe key saved.', array( 'status' => 400 ) );
		}
		$from = strtotime( (string) $r->get_param( 'from' ) . ' 00:00:00 UTC' );
		$to   = strtotime( (string) $r->get_param( 'to' ) . ' 23:59:59 UTC' );
		$res  = wp_remote_get( 'https://api.stripe.com/v1/charges?limit=100&created[gte]=' . $from . '&created[lte]=' . $to, array( 'timeout' => 30, 'headers' => array( 'Authorization' => 'Bearer ' . $key ) ) );
		$j    = json_decode( wp_remote_retrieve_body( $res ), true );
		$out  = array();
		foreach ( (array) ( $j['data'] ?? array() ) as $c ) {
			$out[] = array( 'id' => $c['id'], 'date' => gmdate( 'Y-m-d H:i', (int) $c['created'] ), 'amount' => ( $c['amount'] ?? 0 ) / 100, 'paid' => ! empty( $c['paid'] ) && 'succeeded' === ( $c['status'] ?? '' ), 'refunded' => ! empty( $c['refunded'] ), 'email' => $c['billing_details']['email'] ?? $c['receipt_email'] ?? '', 'name' => $c['billing_details']['name'] ?? '', 'invoice' => $c['invoice'] ?? '', 'desc' => $c['description'] ?? '' );
		}
		return array( 'charges' => $out, 'error' => $j['error']['message'] ?? null );
	} ) );
} );
