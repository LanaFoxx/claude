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
	if ( $bal > 0 ) {
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
		$pays[] = array( 'date' => $d, 'amount' => sprintf( '%.2f', abs( $net ) ), 'source' => 'Upwork', 'ref' => $ref, 'status' => $refund ? 'refunded' : 'paid', 'note' => mb_substr( ( $refund ? 'Refund · ' : '' ) . $x['Transaction summary'] . ' · after Upwork fee ($' . number_format( abs( $a ), 2 ) . ' gross)', 0, 140 ) );
		usort( $pays, function ( $p1, $p2 ) { return strcmp( (string) ( $p2['date'] ?? '' ), (string) ( $p1['date'] ?? '' ) ); } );
		update_post_meta( $pid, '_dwdc_payments', $pays );
		update_post_meta( $pid, '_dwdc_billed', (string) round( (float) get_post_meta( $pid, '_dwdc_billed', true ) + $net, 2 ) );
		wp_update_post( array( 'ID' => $pid ) );
		$out['added']++;
		$out['amount'] += $net;
	}
	update_option( 'dwdc_upwork_costs', $costs, false );
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

	register_rest_route( 'dwd/v1', '/crm/sync', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () {
			return array(
				'stripe' => array( 'url' => rest_url( 'dwd/v1/stripe-webhook' ), 'ready' => '' !== get_option( 'dwds_stripe_whsec', '' ), 'last' => get_option( 'dwds_last_stripe', '' ) ),
				'paypal' => array( 'url' => rest_url( 'dwd/v1/paypal-webhook' ), 'ready' => get_option( 'dwds_paypal_id' ) && get_option( 'dwds_paypal_secret' ) && get_option( 'dwds_paypal_hook' ), 'last' => get_option( 'dwds_last_paypal', '' ) ),
				'upwork' => array( 'last' => get_option( 'dwds_last_upwork', '' ) ),
			);
		} ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$d = (array) $r->get_json_params();
			foreach ( array( 'stripe_whsec' => '/^whsec_[A-Za-z0-9]+$/', 'paypal_id' => '/^[A-Za-z0-9_\-]{20,}$/', 'paypal_secret' => '/^[A-Za-z0-9_\-]{20,}$/', 'paypal_hook' => '/^[A-Za-z0-9]{8,}$/' ) as $k => $re ) {
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
