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
 * The project an invoice made in Dream Desk belongs to. Every invoice carries its project: Stripe in the metadata
 * (dream_desk_project), PayPal in the reference ("Dream Desk project 123"); failing that, the invoice id or number
 * is looked up in the projects' invoice lists. Never guessed from the client's email, so a client with two open
 * projects gets the payment on the project the invoice was made from.
 */
function dwds_invoice_project( $via, $id = '', $number = '', $tag = '' ) {
	$tag = (int) preg_replace( '/\D/', '', (string) $tag );
	if ( $tag && DWDC_CONTACT === get_post_type( $tag ) ) {
		return $tag;
	}
	$id     = (string) $id;
	$number = (string) $number;
	if ( '' === $id && '' === $number ) {
		return 0;
	}
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdc_invoices' ) ) as $pid ) { // phpcs:ignore
		foreach ( (array) get_post_meta( $pid, '_dwdc_invoices', true ) as $v ) {
			if ( ! is_array( $v ) || ( $v['via'] ?? '' ) !== $via ) {
				continue;
			}
			if ( ( '' !== $id && (string) ( $v['id'] ?? '' ) === $id ) || ( '' !== $number && (string) ( $v['number'] ?? '' ) === $number ) ) {
				return (int) $pid;
			}
		}
	}
	return 0;
}

/** PayPal's reference on Dream Desk invoices reads "Dream Desk project 123": the project id, or ''. */
function dwds_paypal_tag( $reference ) {
	return preg_match( '/Dream Desk project\s+(\d+)/i', (string) $reference, $m ) ? $m[1] : '';
}

/** Mark a Dream Desk invoice paid on its project as soon as its payment is logged. */
function dwds_invoice_paid( $pid, $via, $id = '', $number = '' ) {
	$list = get_post_meta( (int) $pid, '_dwdc_invoices', true );
	if ( ! is_array( $list ) ) {
		return;
	}
	foreach ( $list as $k => $v ) {
		if ( is_array( $v ) && ( $v['via'] ?? '' ) === $via && ( ( '' !== (string) $id && (string) ( $v['id'] ?? '' ) === (string) $id ) || ( '' !== (string) $number && (string) ( $v['number'] ?? '' ) === (string) $number ) ) ) {
			$list[ $k ]['status']  = 'paid';
			$list[ $k ]['paid_at'] = $list[ $k ]['paid_at'] ?? current_time( 'Y-m-d' );
			update_post_meta( (int) $pid, '_dwdc_invoices', $list );
			return;
		}
	}
}

/**
 * Add a payment to a project unless that reference is already there.
 * $pid: the project when it is already known (an invoice made in Dream Desk); otherwise found by email.
 *
 * @return string 'added', 'duplicate' or 'unmatched'.
 */
// A payment reference that isn't a real transaction/invoice number ("Express Checkout", "PayPal invoice",
// "Logged in Dream Desk"...): these come from emails, old CSV imports or manual logging, and the same money
// later arrives again from the PayPal/Stripe feed under its real transaction ID.
function dwds_generic_ref( $ref ) {
	$ref = trim( (string) $ref );
	return '' === $ref || preg_match( '/\s/', $ref ) || ! preg_match( '/\d/', $ref );
}

// Same source, same amount, within 3 days, and at least one side without a real transaction ID.
// (Two different real IDs = two real payments, e.g. both halves of a job paid the same day.)
function dwds_same_payment( $p, $source, $amount, $date, $ref = '' ) {
	if ( ! is_array( $p ) || (string) ( $p['source'] ?? '' ) !== (string) $source || 'Upwork' === $source ) {
		return false;
	}
	if ( ! dwds_generic_ref( $p['ref'] ?? '' ) && ! dwds_generic_ref( $ref ) ) {
		return false;
	}
	$a = round( (float) preg_replace( '/[^\d.]/', '', (string) ( $p['amount'] ?? 0 ) ), 2 );
	$d = strtotime( (string) ( $p['date'] ?? '' ) );
	return abs( $a - round( (float) $amount, 2 ) ) < 0.01 && $d && abs( $d - strtotime( (string) $date ) ) <= 3 * DAY_IN_SECONDS;
}

function dwds_log_payment( $source, $email, $who, $amount, $date, $ref, $note = '', $pid = 0 ) {
	$amount = round( (float) $amount, 2 );
	if ( $amount <= 0 || ! $ref ) {
		return 'skipped';
	}
	$seen = (array) get_option( 'dwds_seen_refs', array() );
	if ( isset( $seen[ $source . ':' . $ref ] ) ) {
		return 'duplicate';
	}
	$pid = ( $pid && DWDC_CONTACT === get_post_type( (int) $pid ) ) ? (int) $pid : dwds_project_for( $email, $who );
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
	// The same payment can arrive twice (the invoice email and the PayPal/Stripe feed use different refs):
	// same source, same amount, within 3 days = already logged.
	foreach ( $pays as $p ) {
		if ( dwds_same_payment( $p, $source, $amount, $date, $ref ) ) {
			$seen[ $source . ':' . $ref ] = $pid;
			update_option( 'dwds_seen_refs', $seen, false );
			return 'duplicate';
		}
	}
	// Already marked paid by hand (owed is 0) within the last 2 weeks, and now the feed brings more money from
	// the same source (or the hand entry was "Other", e.g. marked paid before the PayPal money showed up): it's most likely the same money, so don't count it twice; ask Mike to check instead.
	if ( (float) get_post_meta( $pid, '_dwdc_balance', true ) <= 0 && '' !== (string) get_post_meta( $pid, '_dwdc_balance', true ) ) {
		foreach ( $pays as $p ) {
			$pd = strtotime( (string) ( $p['date'] ?? '' ) );
			if ( 'Logged in Dream Desk' === ( $p['ref'] ?? '' ) && ( (string) ( $p['source'] ?? '' ) === (string) $source || ! in_array( (string) ( $p['source'] ?? '' ), array( 'PayPal', 'Stripe', 'Upwork' ), true ) ) && $pd && abs( $pd - strtotime( (string) $date ) ) <= 14 * DAY_IN_SECONDS ) {
				if ( function_exists( 'dwdc_add_task' ) ) {
					dwdc_add_task( sprintf( 'Check payment: %s $%s from %s (%s) came in for %s, but it was already marked paid on %s. If it is new money, log it on the project; if not, ignore this.', $source, number_format( $amount, 2 ), $who ?: $email ?: 'payer', $date, get_the_title( $pid ), $p['date'] ), $pid, current_time( 'Y-m-d' ) );
				}
				$seen[ $source . ':' . $ref ] = 'check';
				update_option( 'dwds_seen_refs', $seen, false );
				return 'check';
			}
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
		$ipid = dwds_invoice_project( 'stripe', $obj['id'] ?? '', $obj['number'] ?? '', $obj['metadata']['dream_desk_project'] ?? '' );
		$res  = dwds_log_payment( 'Stripe', $obj['customer_email'] ?? '', $obj['customer_name'] ?? '', ( $obj['amount_paid'] ?? 0 ) / 100, gmdate( 'Y-m-d', (int) ( $obj['status_transitions']['paid_at'] ?? time() ) ), $obj['number'] ?? $obj['id'] ?? '', 'Stripe invoice ' . ( $obj['number'] ?? '' ), $ipid );
		if ( $ipid ) {
			dwds_invoice_paid( $ipid, 'stripe', $obj['id'] ?? '', $obj['number'] ?? '' );
		}
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
		$ipid  = dwds_invoice_project( 'paypal', $inv['id'] ?? '', $inv['detail']['invoice_number'] ?? '', dwds_paypal_tag( $inv['detail']['reference'] ?? '' ) );
		$res   = dwds_log_payment( 'PayPal', $email, $name, $amt, substr( (string) ( $inv['payments']['transactions'][0]['payment_date'] ?? current_time( 'Y-m-d' ) ), 0, 10 ), 'INV-' . ( $inv['detail']['invoice_number'] ?? $inv['id'] ?? '' ), 'PayPal invoice ' . ( $inv['detail']['invoice_number'] ?? '' ), $ipid );
		if ( $ipid ) {
			dwds_invoice_paid( $ipid, 'paypal', $inv['id'] ?? '', $inv['detail']['invoice_number'] ?? '' );
		}
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
	$twinAll = array();
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
		if ( ! isset( $twinAll[ $pid ] ) ) {
			$twinAll[ $pid ] = array();
		}
		if ( $dup || ( 'Refund to client' !== $t && dwds_manual_twin( $pays, $net, $d, $twinAll[ $pid ] ) ) ) {
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
				'fireflies' => array( 'ready' => (bool) get_option( 'dwds_fireflies_key', '' ), 'last' => (string) get_option( 'dwdff_last', '' ), 'count' => count( (array) get_option( 'dwdff_data', array() ) ), 'unfiled' => dwdff_unfiled() ),
				'quo'    => array( 'ready' => (bool) get_option( 'dwds_quo_key', '' ), 'from' => (string) get_option( 'dwds_quo_from', '' ), 'numbers' => array_values( (array) get_option( 'dwds_quo_numbers', array() ) ) ),
				'refreshed' => get_option( 'dwds_last_refresh', '' ),
			);
		} ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$d = (array) $r->get_json_params();
			foreach ( array( 'stripe_key' => '/^(rk|sk)_live_[A-Za-z0-9]+$/', 'stripe_whsec' => '/^whsec_[A-Za-z0-9]+$/', 'paypal_id' => '/^[A-Za-z0-9_\-]{20,}$/', 'paypal_secret' => '/^[A-Za-z0-9_\-]{20,}$/', 'paypal_hook' => '/^[A-Za-z0-9]{8,}$/', 'quo_key' => '/^[A-Za-z0-9_\-]{20,}$/', 'fireflies_key' => '/^[A-Za-z0-9_\-]{20,}$/' ) as $k => $re ) {
				if ( isset( $d[ $k ] ) && '' !== trim( (string) $d[ $k ] ) ) {
					$v = trim( (string) $d[ $k ] );
					if ( ! preg_match( $re, $v ) ) {
						return new WP_Error( 'dwds_bad', 'That ' . str_replace( '_', ' ', $k ) . ' doesn’t look right.', array( 'status' => 400 ) );
					}
					update_option( 'dwds_' . $k, $v, false );
				}
			}
			if ( ! empty( $d['fireflies_key'] ) ) { // check the key, then pull the meetings
				$fu = dwdff_call( '{ user { email } }' );
				if ( is_wp_error( $fu ) ) {
					delete_option( 'dwds_fireflies_key' );
					return new WP_Error( 'dwds_ff', 'Fireflies didn’t accept that API key. Copy it again from Fireflies → Integrations → Fireflies API.', array( 'status' => 400 ) );
				}
				dwdff_sync();
			}
			if ( ! empty( $d['quo_key'] ) ) { // check the key by asking Quo for your numbers
				$qn = dwdq_numbers( true );
				if ( is_wp_error( $qn ) ) {
					delete_option( 'dwds_quo_key' );
					return new WP_Error( 'dwds_quo', 'Quo didn’t accept that API key. Copy it again from Quo → Settings → API.', array( 'status' => 400 ) );
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
			if ( $d > current_time( 'Y-m-d' ) ) {
				continue; // still pending in Upwork: counted once its date arrives and a newer file is added
			}
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
	$start = (string) get_option( 'dwdc_stage_start', '' );
	$fresh = '' !== $start && (string) $date >= $start;
	return array( $fresh || '1' === get_post_meta( $pid, '_dwdc_upwork_hold', true ) ? 'held' : 'paid', $date );
}

/**
 * A payment Mike logged by hand on Upwork that the Upwork file now also lists (same amount within $1, within
 * 10 days): the hand-logged one stands and the file row is skipped, so nothing counts twice. $used tracks matches.
 */
function dwds_manual_twin( $pays, $amt, $date, &$used ) {
	foreach ( (array) $pays as $k => $x ) {
		if ( isset( $used[ $k ] ) || 'Upwork' !== ( $x['source'] ?? '' ) || preg_match( '/^\d+$/', (string) ( $x['ref'] ?? '' ) ) ) {
			continue;
		}
		$d0 = (string) ( $x['earned'] ?? $x['date'] ?? '' );
		if ( abs( (float) $x['amount'] - abs( $amt ) ) < 1 && $d0 && abs( strtotime( $d0 ) - strtotime( (string) $date ) ) <= 10 * 86400 ) {
			$used[ $k ] = 1;
			return true;
		}
	}
	return false;
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
			if ( 'Upwork' === ( $x['source'] ?? '' ) && preg_match( '/^\d+$/', (string) ( $x['ref'] ?? '' ) ) ) {
				if ( 'held' !== ( $x['status'] ?? '' ) ) { // held money was never counted in Paid
					$oldFile += ( 'refunded' === ( $x['status'] ?? '' ) ? -1 : 1 ) * (float) $x['amount'];
				}
			} else {
				$keep[] = $x;
			}
		}
		$new  = $by[ $pid ] ?? array();
		$used = array();
		$new  = array_values( array_filter( $new, function ( $x ) use ( $keep, &$used ) {
			return 'refunded' === $x['status'] || ! dwds_manual_twin( $keep, (float) $x['amount'], $x['date'], $used );
		} ) );
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
	$take = function ( $email, $who, $amount, $date, $ref, $note, $ipid = 0 ) use ( &$out ) {
		$pid = $ipid ? $ipid : dwds_project_for( $email, $who );
		if ( dwds_seen_anywhere( 'Stripe', $ref, $amount, $date ) ) {
			$out['already']++;
			return;
		}
		if ( ! $pid && $date < gmdate( 'Y-m-d', strtotime( '-60 days' ) ) ) {
			$out['unmatched']++; // old and unmatched: count it, don't flood the to-do list
			return;
		}
		$r = dwds_log_payment( 'Stripe', $email, $who, $amount, $date, $ref, $note, $ipid );
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
			$take( $o['customer_email'] ?? '', $o['customer_name'] ?? '', ( $o['amount_paid'] ?? 0 ) / 100, gmdate( 'Y-m-d', (int) ( $o['status_transitions']['paid_at'] ?? $o['created'] ) ), $o['number'] ?? $o['id'], 'Stripe invoice ' . ( $o['number'] ?? '' ), dwds_invoice_project( 'stripe', $o['id'] ?? '', $o['number'] ?? '', $o['metadata']['dream_desk_project'] ?? '' ) );
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
				$ipid  = ! empty( $ti['invoice_id'] ) ? dwds_invoice_project( 'paypal', '', (string) $ti['invoice_id'] ) : 0; // paid a Dream Desk invoice
				$pid   = $ipid ? $ipid : dwds_project_for( $email, $who );
				if ( dwds_seen_anywhere( 'PayPal', $ref, $amt, $date ) ) {
					$out['already']++;
					continue;
				}
				if ( ! $pid && $date < gmdate( 'Y-m-d', strtotime( '-60 days' ) ) ) {
					$out['unmatched']++;
					continue;
				}
				$res = dwds_log_payment( 'PayPal', $email, $who, $amt, $date, $ref, $ipid ? 'PayPal invoice ' . $ti['invoice_id'] : 'PayPal payment', $ipid );
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
				$keep = array();
				foreach ( dwds_files() as $o ) {
					if ( $o['id'] !== $f['id'] && $o['from'] >= $f['from'] && $o['to'] <= $f['to'] ) {
						delete_option( 'dwds_upf_' . $o['id'] ); // every row of it is in the new file
						continue;
					}
					$keep[] = $o;
				}
				update_option( 'dwds_upwork_files', $keep, false );
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

// The day the Upwork money stages started: Upwork-file payments from this date on come in as "in Upwork".
add_action( 'init', function () {
	if ( '' === (string) get_option( 'dwdc_stage_start', '' ) ) {
		update_option( 'dwdc_stage_start', current_time( 'Y-m-d' ), false );
	}
} );


/* ---------------------------------------------------------------- Invoices made in Dream Desk
 * Created in Stripe or PayPal with the keys saved under Connections. Stripe / PayPal email the client and take
 * the payment; their "paid" webhooks (above) then log it on the project as usual. Nothing is charged from here.
 */
function dwdi_stripe( $method, $path, $body = null ) {
	$key = (string) get_option( 'dwds_stripe_key', '' );
	if ( '' === $key ) {
		return new WP_Error( 'dwdi_stripe', 'Stripe is not connected yet. Add your Stripe key under Settings → Connections.', array( 'status' => 400 ) );
	}
	$args = array( 'method' => $method, 'timeout' => 30, 'headers' => array( 'Authorization' => 'Bearer ' . $key ) );
	if ( null !== $body ) {
		$args['body'] = $body;
	}
	$r = wp_remote_request( 'https://api.stripe.com/v1/' . $path, $args );
	if ( is_wp_error( $r ) ) {
		return new WP_Error( 'dwdi_stripe', 'Could not reach Stripe. Try again in a minute.', array( 'status' => 502 ) );
	}
	$j = json_decode( wp_remote_retrieve_body( $r ), true );
	if ( wp_remote_retrieve_response_code( $r ) >= 300 ) {
		$msg = (string) ( $j['error']['message'] ?? 'request failed' );
		if ( 403 === (int) wp_remote_retrieve_response_code( $r ) || false !== stripos( $msg, 'permission' ) ) {
			$msg = 'Your saved Stripe key can only read. In Stripe open Developers → API keys, edit the restricted key Dream Desk uses and set Customers and Invoices to Write. Nothing needs changing in Dream Desk after that.';
		} else {
			$msg = 'Stripe: ' . preg_replace( '/(rk|sk)_live_\S+/', 'your key', $msg );
		}
		return new WP_Error( 'dwdi_stripe', $msg, array( 'status' => 400 ) );
	}
	return is_array( $j ) ? $j : array();
}

function dwdi_paypal( $method, $path, $body = null ) {
	$token = dwds_paypal_token();
	if ( '' === $token ) {
		return new WP_Error( 'dwdi_paypal', 'PayPal is not connected yet. Add your PayPal app under Settings → Connections.', array( 'status' => 400 ) );
	}
	$args = array( 'method' => $method, 'timeout' => 30, 'headers' => array( 'Authorization' => 'Bearer ' . $token, 'Content-Type' => 'application/json' ) );
	if ( null !== $body ) {
		$args['body'] = wp_json_encode( $body );
	}
	$r = wp_remote_request( 'https://api-m.paypal.com' . $path, $args );
	if ( is_wp_error( $r ) ) {
		return new WP_Error( 'dwdi_paypal', 'Could not reach PayPal. Try again in a minute.', array( 'status' => 502 ) );
	}
	$code = (int) wp_remote_retrieve_response_code( $r );
	$j    = json_decode( wp_remote_retrieve_body( $r ), true );
	if ( $code >= 300 ) {
		$name = (string) ( $j['name'] ?? '' );
		$msg  = (string) ( $j['details'][0]['description'] ?? $j['message'] ?? 'request failed' );
		if ( in_array( $code, array( 401, 403 ), true ) || in_array( $name, array( 'NOT_AUTHORIZED', 'PERMISSION_DENIED', 'AUTHORIZATION_ERROR' ), true ) ) {
			$msg = 'Your PayPal app is not allowed to make invoices. In PayPal Developer → Apps & Credentials, open the app Dream Desk uses and tick Invoicing under Features, then save.';
		} else {
			$msg = 'PayPal: ' . $msg;
		}
		return new WP_Error( 'dwdi_paypal', $msg, array( 'status' => 400 ) );
	}
	return is_array( $j ) ? $j : array();
}

function dwdi_list( $pid ) {
	$l = get_post_meta( (int) $pid, '_dwdc_invoices', true );
	return is_array( $l ) ? array_values( $l ) : array();
}

/** One word for where an invoice stands, whichever service it lives in. */
function dwdi_status( $via, $raw ) {
	$raw = strtoupper( (string) $raw );
	$map = array( 'DRAFT' => 'draft', 'OPEN' => 'sent', 'SENT' => 'sent', 'UNPAID' => 'sent', 'SCHEDULED' => 'sent', 'PAYMENT_PENDING' => 'sent', 'PAID' => 'paid', 'MARKED_AS_PAID' => 'paid', 'PARTIALLY_PAID' => 'part paid', 'VOID' => 'cancelled', 'CANCELLED' => 'cancelled', 'UNCOLLECTIBLE' => 'cancelled', 'REFUNDED' => 'refunded', 'PARTIALLY_REFUNDED' => 'refunded', 'MARKED_AS_REFUNDED' => 'refunded' );
	return $map[ $raw ] ?? strtolower( $raw );
}

/** Ask Stripe / PayPal where the open invoices stand (at most every 3 minutes per project). */
function dwdi_refresh( $pid, $force = false ) {
	$list = dwdi_list( $pid );
	if ( ! $list || ( ! $force && get_transient( 'dwdi_r_' . $pid ) ) ) {
		return $list;
	}
	set_transient( 'dwdi_r_' . $pid, 1, 3 * MINUTE_IN_SECONDS );
	$changed = false;
	foreach ( $list as $k => $v ) {
		if ( in_array( $v['status'] ?? '', array( 'paid', 'cancelled', 'refunded' ), true ) || empty( $v['id'] ) ) {
			continue;
		}
		if ( 'stripe' === $v['via'] ) {
			$j = dwdi_stripe( 'GET', 'invoices/' . rawurlencode( $v['id'] ) );
			if ( is_wp_error( $j ) ) {
				continue;
			}
			$st  = dwdi_status( 'stripe', $j['status'] ?? '' );
			$url = (string) ( $j['hosted_invoice_url'] ?? '' );
			$num = (string) ( $j['number'] ?? '' );
		} else {
			$j = dwdi_paypal( 'GET', '/v2/invoicing/invoices/' . rawurlencode( $v['id'] ) );
			if ( is_wp_error( $j ) ) {
				continue;
			}
			$st  = dwdi_status( 'paypal', $j['status'] ?? '' );
			$url = (string) ( $j['detail']['metadata']['recipient_view_url'] ?? '' );
			$num = (string) ( $j['detail']['invoice_number'] ?? '' );
		}
		foreach ( array( 'status' => $st, 'url' => $url, 'number' => $num ) as $f => $val ) {
			if ( '' !== $val && ( $v[ $f ] ?? '' ) !== $val ) {
				$list[ $k ][ $f ] = $val;
				$changed          = true;
			}
		}
		if ( 'paid' === $st && empty( $v['paid_at'] ) ) {
			$list[ $k ]['paid_at'] = current_time( 'Y-m-d' );
			$changed               = true;
		}
	}
	if ( $changed ) {
		update_post_meta( (int) $pid, '_dwdc_invoices', $list );
	}
	return $list;
}

/** Make an invoice in Stripe or PayPal; $p: via, email, name, items [{d, a}], due (days), memo, send. */
function dwdi_create( $pid, $p ) {
	$via   = 'paypal' === ( $p['via'] ?? '' ) ? 'paypal' : 'stripe';
	$email = sanitize_email( (string) ( $p['email'] ?? '' ) );
	$name  = sanitize_text_field( (string) ( $p['name'] ?? '' ) );
	$memo  = sanitize_textarea_field( (string) ( $p['memo'] ?? '' ) );
	$days  = max( 1, min( 90, (int) ( $p['due'] ?? 7 ) ) );
	$send  = ! empty( $p['send'] );
	$items = array();
	$total = 0;
	foreach ( (array) ( $p['items'] ?? array() ) as $it ) {
		$d = sanitize_text_field( (string) ( $it['d'] ?? '' ) );
		$a = round( (float) preg_replace( '/[^\d.]/', '', (string) ( $it['a'] ?? '' ) ), 2 );
		if ( $a > 0 ) {
			$items[] = array( 'd' => '' !== $d ? $d : 'Services', 'a' => $a );
			$total  += $a;
		}
	}
	if ( ! is_email( $email ) ) {
		return new WP_Error( 'dwdi', 'Add the client’s email address so the invoice has somewhere to go.', array( 'status' => 400 ) );
	}
	if ( ! $items ) {
		return new WP_Error( 'dwdi', 'Add at least one line with an amount.', array( 'status' => 400 ) );
	}
	$rec = array( 'id' => '', 'via' => $via, 'number' => '', 'amount' => round( $total, 2 ), 'status' => 'draft', 'url' => '', 'email' => $email, 'name' => $name, 'items' => $items, 'memo' => $memo, 'due' => gmdate( 'Y-m-d', time() + $days * DAY_IN_SECONDS ), 'created' => current_time( 'Y-m-d' ), 'sent' => '' );
	if ( 'stripe' === $via ) {
		$c = dwdi_stripe( 'GET', 'customers?limit=1&email=' . rawurlencode( $email ) );
		if ( is_wp_error( $c ) ) {
			return $c;
		}
		$cus = (string) ( $c['data'][0]['id'] ?? '' );
		if ( '' === $cus ) {
			$n = dwdi_stripe( 'POST', 'customers', array_filter( array( 'email' => $email, 'name' => $name ) ) );
			if ( is_wp_error( $n ) ) {
				return $n;
			}
			$cus = (string) $n['id'];
		}
		$inv = dwdi_stripe( 'POST', 'invoices', array_filter( array( 'customer' => $cus, 'collection_method' => 'send_invoice', 'days_until_due' => $days, 'auto_advance' => 'false', 'pending_invoice_items_behavior' => 'exclude', 'description' => $memo, 'metadata' => array( 'dream_desk_project' => (string) $pid ) ) ) );
		if ( is_wp_error( $inv ) ) {
			return $inv;
		}
		$rec['id'] = (string) $inv['id'];
		foreach ( $items as $it ) {
			$li = dwdi_stripe( 'POST', 'invoiceitems', array( 'customer' => $cus, 'invoice' => $rec['id'], 'amount' => (int) round( $it['a'] * 100 ), 'currency' => 'usd', 'description' => $it['d'] ) );
			if ( is_wp_error( $li ) ) {
				dwdi_stripe( 'DELETE', 'invoices/' . rawurlencode( $rec['id'] ) ); // don't leave a half-made draft behind
				return $li;
			}
		}
	} else {
		$nn  = dwdi_paypal( 'POST', '/v2/invoicing/generate-next-invoice-number' );
		if ( is_wp_error( $nn ) ) {
			return $nn;
		}
		$parts = preg_split( '/\s+/', trim( $name ), 2 );
		$bill  = array( 'email_address' => $email );
		if ( '' !== $name ) {
			$bill['name'] = array_filter( array( 'given_name' => (string) $parts[0], 'surname' => (string) ( $parts[1] ?? '' ) ) );
		}
		$body = array(
			'detail'             => array_filter( array( 'invoice_number' => (string) ( $nn['invoice_number'] ?? '' ), 'currency_code' => 'USD', 'note' => $memo, 'reference' => 'Dream Desk project ' . $pid, 'payment_term' => array( 'term_type' => 'DUE_ON_DATE_SPECIFIED', 'due_date' => $rec['due'] ) ) ),
			'primary_recipients' => array( array( 'billing_info' => $bill ) ),
			'items'              => array_map( function ( $it ) { return array( 'name' => mb_substr( $it['d'], 0, 200 ), 'quantity' => '1', 'unit_amount' => array( 'currency_code' => 'USD', 'value' => number_format( $it['a'], 2, '.', '' ) ) ); }, $items ),
		);
		$inv = dwdi_paypal( 'POST', '/v2/invoicing/invoices', $body );
		if ( is_wp_error( $inv ) ) {
			return $inv;
		}
		$rec['id']     = (string) ( $inv['id'] ?? basename( (string) ( $inv['href'] ?? '' ) ) );
		$rec['number'] = (string) ( $nn['invoice_number'] ?? '' );
		if ( '' === $rec['id'] ) {
			return new WP_Error( 'dwdi_paypal', 'PayPal did not confirm the invoice. Check PayPal before trying again.', array( 'status' => 502 ) );
		}
	}
	$list   = dwdi_list( $pid );
	$list[] = $rec;
	update_post_meta( (int) $pid, '_dwdc_invoices', $list );
	if ( $send ) {
		$s = dwdi_act( $pid, $rec['id'], 'send' );
		if ( is_wp_error( $s ) ) {
			return new WP_Error( 'dwdi', 'The invoice was saved as a draft but could not be sent. ' . $s->get_error_message(), array( 'status' => 400 ) );
		}
	}
	return dwdi_refresh( $pid, true );
}

/** Send a draft, or cancel an invoice that should not be paid. */
function dwdi_act( $pid, $iid, $act ) {
	$list = dwdi_list( $pid );
	$k    = null;
	foreach ( $list as $i => $v ) {
		if ( (string) $v['id'] === (string) $iid ) {
			$k = $i;
		}
	}
	if ( null === $k ) {
		return new WP_Error( 'dwdi', 'That invoice is not on this project.', array( 'status' => 404 ) );
	}
	$v  = $list[ $k ];
	$id = rawurlencode( (string) $v['id'] );
	if ( 'send' === $act ) {
		if ( 'draft' !== $v['status'] ) {
			return new WP_Error( 'dwdi', 'That invoice has already been sent.', array( 'status' => 400 ) );
		}
		if ( 'stripe' === $v['via'] ) {
			$f = dwdi_stripe( 'POST', 'invoices/' . $id . '/finalize', array( 'auto_advance' => 'false' ) );
			$r = is_wp_error( $f ) ? $f : dwdi_stripe( 'POST', 'invoices/' . $id . '/send' );
		} else {
			$r = dwdi_paypal( 'POST', '/v2/invoicing/invoices/' . $id . '/send', array( 'send_to_invoicer' => true ) );
		}
		if ( is_wp_error( $r ) ) {
			return $r;
		}
		$list[ $k ]['status'] = 'sent';
		$list[ $k ]['sent']   = current_time( 'Y-m-d' );
	} elseif ( 'cancel' === $act ) {
		if ( in_array( $v['status'], array( 'paid', 'part paid', 'refunded' ), true ) ) {
			return new WP_Error( 'dwdi', 'That invoice has money on it, so it can’t be cancelled here. Refund it in ' . ( 'stripe' === $v['via'] ? 'Stripe' : 'PayPal' ) . ' instead.', array( 'status' => 400 ) );
		}
		if ( 'draft' === $v['status'] ) {
			$r = 'stripe' === $v['via'] ? dwdi_stripe( 'DELETE', 'invoices/' . $id ) : dwdi_paypal( 'DELETE', '/v2/invoicing/invoices/' . $id );
		} else {
			$r = 'stripe' === $v['via'] ? dwdi_stripe( 'POST', 'invoices/' . $id . '/void' ) : dwdi_paypal( 'POST', '/v2/invoicing/invoices/' . $id . '/cancel', array( 'send_to_invoicer' => true, 'send_to_recipient' => true ) );
		}
		if ( is_wp_error( $r ) ) {
			return $r;
		}
		if ( 'draft' === $v['status'] ) {
			unset( $list[ $k ] ); // a draft nobody saw: just gone
		} else {
			$list[ $k ]['status'] = 'cancelled';
		}
	} else {
		return new WP_Error( 'dwdi', 'Unknown action', array( 'status' => 400 ) );
	}
	update_post_meta( (int) $pid, '_dwdc_invoices', array_values( $list ) );
	return dwdi_list( $pid );
}

add_filter( 'dwdc_contact_full', function ( $c, $pid ) {
	$c['invoices'] = dwdi_refresh( $pid );
	return $c;
}, 10, 2 );

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/invoices', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function ( $r ) { return array( 'invoices' => dwdi_refresh( (int) $r['id'], true ) ); } ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$pid = (int) $r['id'];
			if ( ! get_post( $pid ) || DWDC_CONTACT !== get_post_type( $pid ) ) {
				return new WP_Error( 'dwdi', 'Project not found.', array( 'status' => 404 ) );
			}
			$p   = (array) $r->get_json_params();
			$out = isset( $p['act'], $p['invoice'] ) ? dwdi_act( $pid, (string) $p['invoice'], (string) $p['act'] ) : dwdi_create( $pid, $p );
			return is_wp_error( $out ) ? $out : array( 'invoices' => $out );
		} ),
	) );
	// Which services can make invoices right now (reads only; nothing is created).
	register_rest_route( 'dwd/v1', '/crm/invoice-status', array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () {
		$pp = dwds_paypal_token() ? dwdi_paypal( 'GET', '/v2/invoicing/invoices?page_size=1&total_required=false' ) : null;
		$st = get_option( 'dwds_stripe_key', '' ) ? dwdi_stripe( 'GET', 'invoices?limit=1' ) : null;
		return array(
			'stripe' => array( 'connected' => null !== $st, 'reads' => null !== $st && ! is_wp_error( $st ), 'note' => is_wp_error( $st ) ? $st->get_error_message() : '', 'key' => preg_match( '/^(rk|sk)_/', (string) get_option( 'dwds_stripe_key', '' ), $m ) ? ( 'rk' === $m[1] ? 'restricted' : 'full' ) : '' ),
			'paypal' => array( 'connected' => null !== $pp, 'invoicing' => null !== $pp && ! is_wp_error( $pp ), 'note' => is_wp_error( $pp ) ? $pp->get_error_message() : '' ),
		);
	} ) );
} );


/* ---------------------------------------------------------------- Texting clients through Quo (formerly OpenPhone)
 * Uses your own Quo API key (saved under Connections, never sent to the browser). Texts go out from your Quo
 * number and show in Quo as usual; the project page reads the conversation back from Quo.
 */
function dwdq_call( $method, $path, $body = null ) {
	$key = (string) get_option( 'dwds_quo_key', '' );
	if ( '' === $key ) {
		return new WP_Error( 'dwdq_off', 'Quo is not connected yet. Paste your Quo API key under Settings → Connections.', array( 'status' => 400 ) );
	}
	$args = array( 'method' => $method, 'timeout' => 25, 'headers' => array( 'Authorization' => $key, 'Content-Type' => 'application/json' ) );
	if ( null !== $body ) {
		$args['body'] = wp_json_encode( $body );
	}
	$r = wp_remote_request( 'https://api.openphone.com/v1' . $path, $args );
	if ( is_wp_error( $r ) ) {
		return new WP_Error( 'dwdq', 'Could not reach Quo. Try again in a minute.', array( 'status' => 502 ) );
	}
	$code = (int) wp_remote_retrieve_response_code( $r );
	$j    = json_decode( wp_remote_retrieve_body( $r ), true );
	if ( $code >= 300 ) {
		$msg = (string) ( $j['message'] ?? $j['errors'][0]['message'] ?? 'request failed' );
		if ( in_array( $code, array( 401, 403 ), true ) ) {
			$msg = 'Quo did not accept the saved API key. Paste a new one under Settings → Connections.';
		} elseif ( 402 === $code ) {
			$msg = 'Quo says the account has no credit for this text. Add credit in Quo, then try again.';
		} else {
			$msg = 'Quo: ' . $msg;
		}
		return new WP_Error( 'dwdq', $msg, array( 'status' => 400 ) );
	}
	return is_array( $j ) ? $j : array();
}

/** Your Quo phone numbers: [ { id, number, name } ]. */
function dwdq_numbers( $fresh = false ) {
	$n = get_option( 'dwds_quo_numbers', array() );
	if ( ! $fresh && is_array( $n ) && $n ) {
		return $n;
	}
	$j = dwdq_call( 'GET', '/phone-numbers' );
	if ( is_wp_error( $j ) ) {
		return $j;
	}
	$n = array();
	foreach ( (array) ( $j['data'] ?? array() ) as $x ) {
		if ( ! empty( $x['id'] ) && ! empty( $x['number'] ) ) {
			$n[] = array( 'id' => (string) $x['id'], 'number' => (string) $x['number'], 'name' => sanitize_text_field( (string) ( $x['name'] ?? '' ) ) );
		}
	}
	update_option( 'dwds_quo_numbers', $n, false );
	if ( $n && ! in_array( get_option( 'dwds_quo_from', '' ), array_column( $n, 'number' ), true ) ) {
		update_option( 'dwds_quo_from', $n[0]['number'], false );
	}
	return $n;
}

/** The number texts are sent from: [ id, number ] or WP_Error. */
function dwdq_from() {
	$n = dwdq_numbers();
	if ( is_wp_error( $n ) ) {
		return $n;
	}
	$from = (string) get_option( 'dwds_quo_from', '' );
	foreach ( $n as $x ) {
		if ( $x['number'] === $from ) {
			return $x;
		}
	}
	return $n ? $n[0] : new WP_Error( 'dwdq', 'No phone number was found in your Quo account.', array( 'status' => 400 ) );
}

/** "(704) 555-0100" → "+17045550100". Empty string when it is not a usable number. */
function dwdq_e164( $p ) {
	$p    = trim( (string) $p );
	$plus = 0 === strpos( $p, '+' );
	$d    = preg_replace( '/\D/', '', $p );
	if ( $plus && strlen( $d ) >= 8 && strlen( $d ) <= 15 ) {
		return '+' . $d;
	}
	if ( 10 === strlen( $d ) ) {
		return '+1' . $d;
	}
	if ( 11 === strlen( $d ) && '1' === $d[0] ) {
		return '+' . $d;
	}
	return '';
}

/** The text conversation with one number, oldest first. */
function dwdq_thread( $phone ) {
	$to   = dwdq_e164( $phone );
	$from = dwdq_from();
	if ( is_wp_error( $from ) ) {
		return $from;
	}
	if ( '' === $to ) {
		return new WP_Error( 'dwdq', 'That phone number doesn’t look complete. Use the full number with area code.', array( 'status' => 400 ) );
	}
	$j = dwdq_call( 'GET', '/messages?phoneNumberId=' . rawurlencode( $from['id'] ) . '&participants=' . rawurlencode( $to ) . '&maxResults=50' );
	if ( is_wp_error( $j ) ) {
		return $j;
	}
	$out = array();
	foreach ( (array) ( $j['data'] ?? array() ) as $m ) {
		$out[] = array( 'id' => (string) ( $m['id'] ?? '' ), 'in' => 'incoming' === ( $m['direction'] ?? '' ), 'text' => (string) ( $m['text'] ?? '' ), 'at' => (string) ( $m['createdAt'] ?? '' ), 'status' => (string) ( $m['status'] ?? '' ) );
	}
	usort( $out, function ( $a, $b ) { return strcmp( $a['at'], $b['at'] ); } );
	return array( 'phone' => $to, 'from' => $from['number'], 'list' => $out );
}

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	register_rest_route( 'dwd/v1', '/crm/quo', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () {
			$n = get_option( 'dwds_quo_key', '' ) ? dwdq_numbers( true ) : array();
			return is_wp_error( $n ) ? $n : array( 'ready' => (bool) get_option( 'dwds_quo_key', '' ), 'from' => (string) get_option( 'dwds_quo_from', '' ), 'numbers' => $n );
		} ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$p = (array) $r->get_json_params();
			$n = dwdq_numbers();
			if ( is_wp_error( $n ) ) {
				return $n;
			}
			if ( ! in_array( (string) ( $p['from'] ?? '' ), array_column( $n, 'number' ), true ) ) {
				return new WP_Error( 'dwdq', 'That number is not in your Quo account.', array( 'status' => 400 ) );
			}
			update_option( 'dwds_quo_from', (string) $p['from'], false );
			return array( 'ready' => true, 'from' => (string) $p['from'], 'numbers' => $n );
		} ),
	) );
	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/texts', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function ( $r ) {
			if ( ! get_option( 'dwds_quo_key', '' ) ) {
				return array( 'connected' => false, 'list' => array() );
			}
			$t = dwdq_thread( (string) $r->get_param( 'phone' ) );
			return is_wp_error( $t ) ? array( 'connected' => true, 'error' => $t->get_error_message(), 'list' => array() ) : array_merge( array( 'connected' => true ), $t );
		} ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$p    = (array) $r->get_json_params();
			$to   = dwdq_e164( (string) ( $p['to'] ?? '' ) );
			$text = trim( sanitize_textarea_field( (string) ( $p['text'] ?? '' ) ) );
			$from = dwdq_from();
			if ( is_wp_error( $from ) ) {
				return $from;
			}
			if ( '' === $to ) {
				return new WP_Error( 'dwdq', 'That phone number doesn’t look complete. Use the full number with area code.', array( 'status' => 400 ) );
			}
			if ( '' === $text ) {
				return new WP_Error( 'dwdq', 'Type a message first.', array( 'status' => 400 ) );
			}
			$j = dwdq_call( 'POST', '/messages', array( 'content' => mb_substr( $text, 0, 1600 ), 'from' => $from['number'], 'to' => array( $to ) ) );
			if ( is_wp_error( $j ) ) {
				return $j;
			}
			return array( 'ok' => true, 'message' => array( 'id' => (string) ( $j['data']['id'] ?? '' ), 'in' => false, 'text' => $text, 'at' => gmdate( 'c' ), 'status' => (string) ( $j['data']['status'] ?? 'sent' ) ), 'phone' => $to );
		} ),
	) );
} );

/* ---------- Quo contacts: people you have already texted or called, matched to Dream Desk clients ---------- */

/** Every phone number Dream Desk knows: e164 => [ name, company, email, id ]. Clients first, then projects, then extra contacts. */
function dwdq_people() {
	$out = array();
	$put = function ( $phone, $name, $company, $email, $id ) use ( &$out ) {
		$e = dwdq_e164( $phone );
		$name = trim( (string) $name );
		if ( '' === $e || isset( $out[ $e ] ) || '' === $name ) {
			return;
		}
		$out[ $e ] = array( 'phone' => $e, 'name' => $name, 'company' => trim( (string) $company ), 'email' => strtolower( trim( (string) $email ) ), 'id' => (int) $id );
	};
	foreach ( get_posts( array( 'post_type' => DWDC_CLIENT, 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $id ) {
		$name = html_entity_decode( (string) get_the_title( $id ), ENT_QUOTES, 'UTF-8' );
		$put( get_post_meta( $id, '_dwdcl_phone', true ), $name, get_post_meta( $id, '_dwdcl_company', true ), get_post_meta( $id, '_dwdcl_email', true ), $id );
	}
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $id ) {
		$title  = html_entity_decode( (string) get_the_title( $id ), ENT_QUOTES, 'UTF-8' );
		$person = (string) get_post_meta( $id, '_dwdc_person', true );
		$put( get_post_meta( $id, '_dwdc_phone', true ), '' !== trim( $person ) ? $person : $title, '' !== trim( $person ) ? $title : '', get_post_meta( $id, '_dwdc_email', true ), $id );
		foreach ( (array) get_post_meta( $id, '_dwdc_contacts', true ) as $x ) {
			if ( is_array( $x ) ) {
				$put( $x['phone'] ?? '', $x['name'] ?? '', $title, $x['email'] ?? '', $id );
			}
		}
	}
	return $out;
}

/** Numbers you have a Quo conversation with, who is already a Quo contact, and which of the rest are Dream Desk clients. */
function dwdq_match() {
	$own = dwdq_numbers();
	if ( is_wp_error( $own ) ) {
		return $own;
	}
	$mine = array_column( $own, 'number' );
	$line = dwdq_from(); // only the Dream Web Digital line: Mojo's and Tax Pro Design numbers are other businesses
	$line = is_wp_error( $line ) ? '' : (string) $line['id'];
	$seen = array();
	$tok  = '';
	for ( $i = 0; $i < 15; $i++ ) {
		$j = dwdq_call( 'GET', '/conversations?maxResults=100' . ( $tok ? '&pageToken=' . rawurlencode( $tok ) : '' ) );
		if ( is_wp_error( $j ) ) {
			return $j;
		}
		foreach ( (array) ( $j['data'] ?? array() ) as $c ) {
			if ( '' !== $line && ! empty( $c['phoneNumberId'] ) && (string) $c['phoneNumberId'] !== $line ) {
				continue;
			}
			foreach ( (array) ( $c['participants'] ?? array() ) as $n ) {
				$n = dwdq_e164( (string) $n );
				if ( '' !== $n && ! in_array( $n, $mine, true ) ) {
					$seen[ $n ] = max( (string) ( $seen[ $n ] ?? '' ), (string) ( $c['lastActivityAt'] ?? $c['updatedAt'] ?? '' ) );
				}
			}
		}
		$tok = (string) ( $j['nextPageToken'] ?? '' );
		if ( '' === $tok ) {
			break;
		}
	}
	$have  = array();
	$tok   = '';
	$known = true;
	for ( $i = 0; $i < 40; $i++ ) {
		$j = dwdq_call( 'GET', '/contacts?maxResults=50' . ( $tok ? '&pageToken=' . rawurlencode( $tok ) : '' ) );
		if ( is_wp_error( $j ) ) {
			$known = false; // can't tell who is already a contact: nothing gets added
			break;
		}
		foreach ( (array) ( $j['data'] ?? array() ) as $c ) {
			foreach ( (array) ( $c['defaultFields']['phoneNumbers'] ?? array() ) as $ph ) {
				$n = dwdq_e164( (string) ( $ph['value'] ?? '' ) );
				if ( '' !== $n ) {
					$have[ $n ] = 1;
				}
			}
		}
		$tok = (string) ( $j['nextPageToken'] ?? '' );
		if ( '' === $tok ) {
			break;
		}
	}
	$people = dwdq_people();
	$add    = array();
	$none   = array();
	$already = 0;
	foreach ( $seen as $n => $last ) {
		if ( isset( $have[ $n ] ) ) {
			$already++;
		} elseif ( isset( $people[ $n ] ) ) {
			$add[] = array_merge( $people[ $n ], array( 'last' => substr( $last, 0, 10 ) ) );
		} else {
			$none[] = array( 'phone' => $n, 'last' => substr( $last, 0, 10 ) );
		}
	}
	return array( 'conversations' => count( $seen ), 'already_contacts' => $already, 'contacts_readable' => $known, 'add' => $add, 'no_match' => $none, 'dream_desk_numbers' => count( $people ) );
}

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	register_rest_route( 'dwd/v1', '/crm/quo/contacts', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () { return dwdq_match(); } ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function () {
			$m = dwdq_match();
			if ( is_wp_error( $m ) ) {
				return $m;
			}
			if ( empty( $m['contacts_readable'] ) ) {
				return new WP_Error( 'dwdq', 'Quo would not list your existing contacts, so nothing was added (to avoid doubles).', array( 'status' => 400 ) );
			}
			$done = array();
			$fail = array();
			foreach ( $m['add'] as $p ) {
				$parts  = preg_split( '/\s+/', $p['name'], 2 );
				$fields = array( 'firstName' => (string) $parts[0], 'phoneNumbers' => array( array( 'name' => 'mobile', 'value' => $p['phone'] ) ) );
				if ( ! empty( $parts[1] ) ) {
					$fields['lastName'] = (string) $parts[1];
				}
				if ( '' !== $p['company'] ) {
					$fields['company'] = $p['company'];
				}
				if ( is_email( $p['email'] ) ) {
					$fields['emails'] = array( array( 'name' => 'email', 'value' => $p['email'] ) );
				}
				$r = dwdq_call( 'POST', '/contacts', array( 'defaultFields' => $fields, 'source' => 'dream-desk', 'externalId' => 'dreamdesk-' . $p['id'] . '-' . preg_replace( '/\D/', '', $p['phone'] ) ) );
				if ( is_wp_error( $r ) ) {
					$fail[] = array( 'name' => $p['name'], 'phone' => $p['phone'], 'why' => $r->get_error_message() );
				} else {
					$done[] = array( 'name' => $p['name'], 'phone' => $p['phone'], 'company' => $p['company'] );
				}
			}
			return array( 'added' => $done, 'failed' => $fail, 'no_match' => $m['no_match'], 'already_contacts' => $m['already_contacts'] );
		} ),
	) );
} );


/* ---------- New lead -> Quo contact, automatically ----------
 * Every new lead in Dream Desk that has a phone number becomes a contact in Quo, so their calls and texts show
 * with a name. Runs 5 minutes after the lead is created (spam is weeded out first), only once per lead, and never
 * adds a number that is already a Quo contact.
 */
function dwdq_contact_numbers( $fresh = false ) {
	$have = $fresh ? false : get_transient( 'dwdq_have_numbers' );
	if ( is_array( $have ) ) {
		return $have;
	}
	$have = array();
	$tok  = '';
	for ( $i = 0; $i < 60; $i++ ) {
		$j = dwdq_call( 'GET', '/contacts?maxResults=50' . ( $tok ? '&pageToken=' . rawurlencode( $tok ) : '' ) );
		if ( is_wp_error( $j ) ) {
			return $j; // can't tell who is already a contact: add nobody
		}
		foreach ( (array) ( $j['data'] ?? array() ) as $c ) {
			foreach ( (array) ( $c['defaultFields']['phoneNumbers'] ?? array() ) as $ph ) {
				$n = dwdq_e164( (string) ( $ph['value'] ?? '' ) );
				if ( '' !== $n ) {
					$have[ $n ] = 1;
				}
			}
		}
		$tok = (string) ( $j['nextPageToken'] ?? '' );
		if ( '' === $tok ) {
			break;
		}
	}
	set_transient( 'dwdq_have_numbers', $have, HOUR_IN_SECONDS );
	return $have;
}

function dwdq_lead_to_quo( $id, $dry = false ) {
	$id = (int) $id;
	if ( ! get_option( 'dwds_quo_key', '' ) || DWDC_CONTACT !== get_post_type( $id ) || 'trash' === get_post_status( $id ) || get_post_meta( $id, '_dwdq_contact', true ) ) {
		return 'skipped';
	}
	if ( 'leads' !== get_post_meta( $id, '_dwdc_list', true ) ) {
		return 'not a lead';
	}
	$phone = dwdq_e164( (string) get_post_meta( $id, '_dwdc_phone', true ) );
	if ( '' === $phone ) {
		$dry || update_post_meta( $id, '_dwdq_contact', 'no phone' );
		return 'no phone';
	}
	$have = dwdq_contact_numbers();
	if ( is_wp_error( $have ) ) {
		$dry || wp_schedule_single_event( time() + HOUR_IN_SECONDS, 'dwdq_lead_contact', array( $id ) ); // Quo didn't answer: try again later
		return 'retry';
	}
	if ( isset( $have[ $phone ] ) ) {
		$dry || update_post_meta( $id, '_dwdq_contact', 'already in Quo' );
		return 'already in Quo';
	}
	$title  = html_entity_decode( (string) get_the_title( $id ), ENT_QUOTES, 'UTF-8' );
	$person = trim( (string) get_post_meta( $id, '_dwdc_person', true ) );
	$name   = '' !== $person ? $person : $title;
	$parts  = preg_split( '/\s+/', $name, 2 );
	$fields = array( 'firstName' => (string) $parts[0], 'phoneNumbers' => array( array( 'name' => 'mobile', 'value' => $phone ) ) );
	if ( ! empty( $parts[1] ) ) {
		$fields['lastName'] = (string) $parts[1];
	}
	$company = trim( (string) get_post_meta( $id, '_dwdc_company', true ) ) ?: ( '' !== $person && $title !== $person ? $title : '' );
	if ( '' !== $company ) {
		$fields['company'] = $company;
	}
	$email = strtolower( trim( (string) get_post_meta( $id, '_dwdc_email', true ) ) );
	if ( is_email( $email ) ) {
		$fields['emails'] = array( array( 'name' => 'email', 'value' => $email ) );
	}
	if ( $dry ) {
		return array( 'would_add' => $fields );
	}
	$r = dwdq_call( 'POST', '/contacts', array( 'defaultFields' => $fields, 'source' => 'dream-desk', 'externalId' => 'dreamdesk-' . $id . '-' . preg_replace( '/\D/', '', $phone ) ) );
	if ( is_wp_error( $r ) ) {
		update_post_meta( $id, '_dwdq_contact', 'failed: ' . $r->get_error_message() );
		return 'failed';
	}
	$have[ $phone ] = 1;
	set_transient( 'dwdq_have_numbers', $have, HOUR_IN_SECONDS );
	update_post_meta( $id, '_dwdq_contact', current_time( 'mysql' ) );
	$notes   = (array) get_post_meta( $id, '_dwdc_notes', true );
	$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => 'Added to Quo contacts as ' . $name . ' (' . $phone . ').' );
	update_post_meta( $id, '_dwdc_notes', array_values( array_filter( $notes ) ) );
	return 'added';
}
add_action( 'dwdq_lead_contact', 'dwdq_lead_to_quo' );
add_action( 'rest_api_init', function () {
	// What the rule would do for one lead, without adding anything (GET ?id=).
	register_rest_route( 'dwd/v1', '/crm/quo/lead-check', array( 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function ( $r ) {
		return array( 'result' => dwdq_lead_to_quo( (int) $r->get_param( 'id' ), true ), 'marked' => get_post_meta( (int) $r->get_param( 'id' ), '_dwdq_contact', true ) );
	} ) );
} );
// A new project/lead post: check it in 5 minutes (by then the form's fields are saved and spam is filtered out).
add_action( 'wp_insert_post', function ( $id, $post, $update ) {
	if ( ! $update && DWDC_CONTACT === $post->post_type && ! wp_next_scheduled( 'dwdq_lead_contact', array( (int) $id ) ) ) {
		wp_schedule_single_event( time() + 5 * MINUTE_IN_SECONDS, 'dwdq_lead_contact', array( (int) $id ) );
	}
}, 10, 3 );

/* ---------------------------------------------------------------- Meeting transcripts (Fireflies)
 * Fireflies records the Zoom / Meet calls. With your Fireflies API key (Connections) Dream Desk pulls each
 * meeting's summary and action items every hour, files it on the client's project (matched by the guest's
 * email, or the name in the meeting title), and fetches the full transcript when you open or export it.
 */
function dwdff_call( $query, $vars = array() ) {
	$key = (string) get_option( 'dwds_fireflies_key', '' );
	if ( '' === $key ) {
		return new WP_Error( 'dwdff_off', 'Fireflies is not connected yet. Paste your Fireflies API key under Settings → Connections.', array( 'status' => 400 ) );
	}
	$r = wp_remote_post( 'https://api.fireflies.ai/graphql', array( 'timeout' => 45, 'headers' => array( 'Authorization' => 'Bearer ' . $key, 'Content-Type' => 'application/json' ), 'body' => wp_json_encode( array_filter( array( 'query' => $query, 'variables' => $vars ? $vars : null ) ) ) ) );
	if ( is_wp_error( $r ) ) {
		return new WP_Error( 'dwdff', 'Could not reach Fireflies. Try again in a minute.', array( 'status' => 502 ) );
	}
	$j = json_decode( wp_remote_retrieve_body( $r ), true );
	if ( wp_remote_retrieve_response_code( $r ) >= 300 || ! empty( $j['errors'] ) || ! isset( $j['data'] ) ) {
		return new WP_Error( 'dwdff', 'Fireflies: ' . (string) ( $j['errors'][0]['message'] ?? 'request failed' ), array( 'status' => 400 ) );
	}
	return (array) $j['data'];
}

/** Pull the latest meetings (summaries only) and file each on a project. */
function dwdff_sync() {
	$all = (array) get_option( 'dwdff_data', array() );
	$me  = strtolower( (string) get_option( 'admin_email', '' ) );
	$new = 0;
	for ( $skip = 0; $skip < 150; $skip += 50 ) {
		$d = dwdff_call( 'query($limit:Int,$skip:Int){ transcripts(limit:$limit, skip:$skip){ id title date duration participants organizer_email transcript_url summary { short_summary overview action_items keywords } } }', array( 'limit' => 50, 'skip' => $skip ) );
		if ( is_wp_error( $d ) ) {
			return $d;
		}
		$rows = (array) ( $d['transcripts'] ?? array() );
		$hit  = 0;
		foreach ( $rows as $t ) {
			$id = (string) ( $t['id'] ?? '' );
			if ( '' === $id ) {
				continue;
			}
			$old    = $all[ $id ] ?? null;
			$guests = array();
			foreach ( (array) ( $t['participants'] ?? array() ) as $e ) {
				$e = strtolower( trim( (string) $e ) );
				if ( is_email( $e ) && $e !== $me && $e !== strtolower( (string) ( $t['organizer_email'] ?? '' ) ) && false === strpos( $e, 'fireflies.ai' ) ) {
					$guests[] = $e;
				}
			}
			$title = sanitize_text_field( (string) ( $t['title'] ?? '' ) );
			$pid   = (int) ( $old['pid'] ?? 0 );
			$how   = (string) ( $old['how'] ?? '' );
			if ( empty( $old['fixed'] ) ) {
				$pid = 0;
				$how = '';
				foreach ( $guests as $e ) {
					$pid = $pid ? $pid : dwds_project_for( $e );
				}
				if ( ! $pid && preg_match( '/^(.+?)\s+and\s+Dream Web Digital/i', $title, $m ) ) { // "Blake Reynolds and Dream Web Digital"
					$pid = dwdff_by_name( $m[1] );
				}
				if ( ! $pid ) { // no guest or name to go on: the calendar call happening at the same time
					$pid = dwdff_cal_match( gmdate( 'c', (int) ( (float) ( $t['date'] ?? 0 ) / 1000 ) ), (float) ( $t['duration'] ?? 0 ) );
					$how = $pid ? 'calendar' : '';
				}
			}
			$sum = (array) ( $t['summary'] ?? array() );
			$all[ $id ] = array(
				'id'      => $id,
				'title'   => $title,
				'date'    => gmdate( 'c', (int) ( (float) ( $t['date'] ?? 0 ) / 1000 ) ),
				'mins'    => (int) round( (float) ( $t['duration'] ?? 0 ) ),
				'guests'  => $guests,
				'url'     => esc_url_raw( (string) ( $t['transcript_url'] ?? '' ) ) ?: 'https://app.fireflies.ai/view/' . rawurlencode( $id ),
				'summary' => sanitize_textarea_field( (string) ( $sum['short_summary'] ?? $sum['overview'] ?? '' ) ),
				'actions' => sanitize_textarea_field( (string) ( $sum['action_items'] ?? '' ) ),
				'pid'     => (int) $pid,
				'fixed'   => ! empty( $old['fixed'] ),
				'how'     => $how,
			);
			if ( ! $old ) {
				$new++;
			} else {
				$hit++;
			}
		}
		if ( count( $rows ) < 50 || $hit >= 45 ) { // reached meetings already on file
			break;
		}
	}
	// Older recordings still not filed: try the calendar again (calls are added to the log as the calendar syncs).
	foreach ( $all as $id => $x ) {
		if ( empty( $x['pid'] ) && empty( $x['fixed'] ) ) {
			$p = dwdff_cal_match( $x['date'], (float) ( $x['mins'] ?? 0 ) );
			if ( $p ) {
				$all[ $id ]['pid'] = $p;
				$all[ $id ]['how'] = 'calendar';
			}
		}
	}
	uasort( $all, function ( $a, $b ) { return strcmp( $b['date'], $a['date'] ); } );
	$all = array_slice( $all, 0, 400, true );
	update_option( 'dwdff_data', $all, false );
	update_option( 'dwdff_last', current_time( 'mysql' ), false );
	return array( 'new' => $new, 'total' => count( $all ) );
}

/**
 * Calendar calls kept for matching recordings (6 months): event id => start, end, title, who, guests, pid.
 * Fed by the Google Calendar sync every 15 minutes (meetings.php), and seeded with the booked calls already on file.
 */
function dwdff_cal_log( $meetings ) {
	$log   = (array) get_option( 'dwdff_cal', array() );
	$known = (array) get_option( 'dwdin_meets', array() );
	if ( ! $log ) {
		foreach ( $known as $id => $k ) {
			if ( ! empty( $k['start'] ) && ! empty( $k['pid'] ) ) {
				$log[ $id ] = array( 'start' => gmdate( 'c', strtotime( $k['start'] ) ), 'end' => gmdate( 'c', strtotime( $k['start'] ) + HOUR_IN_SECONDS ), 'title' => '', 'who' => '', 'guests' => array(), 'pid' => (int) $k['pid'] );
			}
		}
	}
	foreach ( (array) $meetings as $m ) {
		if ( empty( $m['id'] ) || empty( $m['start'] ) ) {
			continue;
		}
		$ext = array_values( array_filter( (array) ( $m['guests'] ?? array() ), function ( $g ) { return false === stripos( (string) $g, 'dreamwebdigital.com' ); } ) );
		$log[ $m['id'] ] = array(
			'start'  => gmdate( 'c', strtotime( $m['start'] ) ),
			'end'    => gmdate( 'c', strtotime( $m['end'] ?? $m['start'] ) ),
			'title'  => (string) ( $m['title'] ?? '' ),
			'who'    => (string) ( $m['who'] ?? '' ),
			'guests' => array_slice( $ext, 0, 5 ),
			'pid'    => (int) ( $known[ $m['id'] ]['pid'] ?? ( $log[ $m['id'] ]['pid'] ?? 0 ) ),
		);
	}
	$cut = gmdate( 'c', time() - 180 * DAY_IN_SECONDS );
	$log = array_filter( $log, function ( $x ) use ( $cut ) { return (string) $x['start'] >= $cut; } );
	update_option( 'dwdff_cal', $log, false );
	return count( $log );
}

/** The project of a calendar call: its booked-call link, then a guest's email, then the name in the title. */
function dwdff_cal_pid( $ev ) {
	if ( ! empty( $ev['pid'] ) && DWDC_CONTACT === get_post_type( (int) $ev['pid'] ) ) {
		return (int) $ev['pid'];
	}
	foreach ( (array) ( $ev['guests'] ?? array() ) as $g ) {
		$p = dwds_project_for( $g );
		if ( $p ) {
			return $p;
		}
	}
	$name = (string) ( $ev['who'] ?? '' );
	if ( '' === $name && preg_match( '/\bwith\s+([A-Z][\w\'-]+(?:\s+[A-Z][\w\'-]*)?)/', (string) ( $ev['title'] ?? '' ), $m ) ) {
		$name = $m[1];
	}
	return '' !== trim( $name ) ? dwdff_by_name( $name ) : 0;
}

/** The project of the calendar call that was on at this time (recording start within the call, 20 minutes either side). */
function dwdff_cal_match( $start, $mins = 0 ) {
	$t = strtotime( (string) $start );
	if ( ! $t ) {
		return 0;
	}
	$best = array( 0, PHP_INT_MAX );
	foreach ( (array) get_option( 'dwdff_cal', array() ) as $ev ) {
		$s = strtotime( (string) $ev['start'] );
		$e = max( $s + 15 * MINUTE_IN_SECONDS, (int) strtotime( (string) $ev['end'] ) );
		if ( $t < $s - 20 * MINUTE_IN_SECONDS || $t > $e + 5 * MINUTE_IN_SECONDS ) {
			continue;
		}
		$gap = abs( $t - $s );
		if ( $gap < $best[1] ) {
			$p = dwdff_cal_pid( $ev );
			if ( $p ) {
				$best = array( $p, $gap );
			}
		}
	}
	return $best[0];
}

/** Recordings not filed on any project, newest first, for filing by hand. */
function dwdff_unfiled() {
	$out = array();
	foreach ( (array) get_option( 'dwdff_data', array() ) as $x ) {
		if ( empty( $x['pid'] ) && empty( $x['fixed'] ) ) {
			$out[] = array( 'id' => $x['id'], 'title' => $x['title'], 'date' => $x['date'], 'mins' => (int) ( $x['mins'] ?? 0 ), 'summary' => mb_substr( (string) ( $x['summary'] ?? '' ), 0, 220 ) );
		}
	}
	return array_slice( $out, 0, 80 );
}

/** A project whose contact person or client is called this (exact, then first name). */
function dwdff_by_name( $name ) {
	$name = strtolower( trim( (string) $name ) );
	if ( strlen( $name ) < 3 ) {
		return 0;
	}
	$rank = array( 'active' => 0, 'hold' => 1, 'limbo' => 2, 'leads' => 3, 'complete' => 4, 'archive' => 5 );
	$best = array( 0, 99 );
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $id ) {
		$person = strtolower( trim( (string) get_post_meta( $id, '_dwdc_person', true ) ) );
		$cl     = (int) get_post_meta( $id, '_dwdc_client', true );
		$client = $cl ? strtolower( trim( html_entity_decode( (string) get_the_title( $cl ), ENT_QUOTES, 'UTF-8' ) ) ) : '';
		$score  = ( $person === $name || $client === $name ) ? 0 : ( ( '' !== $person && 0 === strpos( $name, $person . ' ' ) ) || ( '' !== $client && 0 === strpos( $name, $client . ' ' ) ) || 0 === strpos( $person . ' ', $name . ' ' ) || 0 === strpos( $client . ' ', $name . ' ' ) ? 10 : 99 );
		if ( 99 === $score && preg_match( '/^([a-z\'-]{2,})\s+([a-z])\.?$/', $name, $ini ) ) { // "Nicolla E" → Nicolla Eddy
			foreach ( array( $person, $client ) as $full ) {
				if ( preg_match( '/^' . preg_quote( $ini[1], '/' ) . '\s+' . $ini[2] . '/', $full ) ) {
					$score = 15;
				}
			}
		}
		$score += $rank[ get_post_meta( $id, '_dwdc_list', true ) ] ?? 9;
		if ( $score < 50 && $score < $best[1] ) {
			$best = array( (int) $id, $score );
		}
	}
	return $best[0];
}

/** Meetings filed on a project, newest first. */
function dwdff_for( $pid ) {
	if ( get_option( 'dwds_fireflies_key', '' ) && time() - (int) strtotime( (string) get_option( 'dwdff_last', '2000-01-01' ) . ' ' . wp_timezone_string() ) > 20 * MINUTE_IN_SECONDS && ! get_transient( 'dwdff_lock' ) ) {
		set_transient( 'dwdff_lock', 1, 5 * MINUTE_IN_SECONDS );
		dwdff_sync();
	}
	return array_values( array_filter( (array) get_option( 'dwdff_data', array() ), function ( $t ) use ( $pid ) { return (int) $t['pid'] === (int) $pid; } ) );
}

/** The whole transcript of one meeting as plain text: "Speaker: words". Kept for a day. */
function dwdff_text( $id ) {
	$k = 'dwdff_t_' . md5( (string) $id );
	$c = get_transient( $k );
	if ( is_string( $c ) && '' !== $c ) {
		return $c;
	}
	$d = dwdff_call( 'query($id:String!){ transcript(id:$id){ sentences { speaker_name text } } }', array( 'id' => (string) $id ) );
	if ( is_wp_error( $d ) ) {
		return $d;
	}
	$out  = array();
	$last = '';
	foreach ( (array) ( $d['transcript']['sentences'] ?? array() ) as $s ) {
		$sp = trim( (string) ( $s['speaker_name'] ?? '' ) ) ?: 'Speaker';
		if ( $sp === $last && $out ) {
			$out[ count( $out ) - 1 ] .= ' ' . trim( (string) $s['text'] );
		} else {
			$out[] = $sp . ': ' . trim( (string) $s['text'] );
		}
		$last = $sp;
	}
	$txt = $out ? implode( "\n\n", $out ) : 'Fireflies has no transcript text for this meeting (it may have been silent or too short).';
	set_transient( $k, $txt, DAY_IN_SECONDS );
	return $txt;
}

add_filter( 'dwdc_contact_full', function ( $c, $pid ) {
	$c['meetings'] = dwdff_for( $pid );
	return $c;
}, 11, 2 );
add_action( 'dwdff_hourly', function () { if ( get_option( 'dwds_fireflies_key', '' ) ) { dwdff_sync(); } } );
add_action( 'init', function () {
	if ( ! wp_next_scheduled( 'dwdff_hourly' ) ) {
		wp_schedule_event( time() + 600, 'hourly', 'dwdff_hourly' );
	}
} );

/* ---------------------------------------------------------------- Export a project for Claude Code
 * One zip with everything needed to start the build: instructions, the brief, onboarding answers, meeting
 * transcripts, emails, texts, the files you uploaded and the client's Google Drive files.
 */
function dwdx_slug( $s, $max = 60 ) {
	$s = sanitize_title( (string) $s );
	return '' !== $s ? substr( $s, 0, $max ) : 'file';
}

function dwdx_build( $pid ) {
	if ( ! class_exists( 'ZipArchive' ) ) {
		return new WP_Error( 'dwdx', 'This server cannot make zip files (ZipArchive is missing).', array( 'status' => 500 ) );
	}
	$c = dwdc_contact( $pid, true );
	if ( ! $c ) {
		return new WP_Error( 'dwdx', 'Project not found.', array( 'status' => 404 ) );
	}
	if ( function_exists( 'set_time_limit' ) ) {
		@set_time_limit( 300 );
	}
	require_once ABSPATH . 'wp-admin/includes/file.php'; // wp_tempnam()
	$up  = wp_upload_dir();
	$dir = trailingslashit( $up['basedir'] ) . 'dwd-exports';
	wp_mkdir_p( $dir );
	if ( ! file_exists( $dir . '/index.html' ) ) {
		file_put_contents( $dir . '/index.html', '' ); // phpcs:ignore
	}
	foreach ( (array) glob( $dir . '/*.zip' ) as $old ) { // exports are kept for an hour
		if ( filemtime( $old ) < time() - HOUR_IN_SECONDS ) {
			@unlink( $old ); // phpcs:ignore
		}
	}
	$name = dwdx_slug( $c['name'] ) . '-claude-code';
	$file = $name . '-' . wp_generate_password( 20, false ) . '.zip';
	$zip  = new ZipArchive();
	if ( true !== $zip->open( $dir . '/' . $file, ZipArchive::CREATE | ZipArchive::OVERWRITE ) ) {
		return new WP_Error( 'dwdx', 'Could not create the zip file on the server.', array( 'status' => 500 ) );
	}
	$R      = $name . '/';
	$client = $c['client'] ? dwdc_client( $c['client'] ) : null;
	$person = trim( (string) ( $c['person'] ?: ( $client['name'] ?? '' ) ) );
	$email  = (string) ( $c['email'] ?: ( $client['email'] ?? '' ) );
	$phone  = (string) ( $c['phone'] ?: ( $client['phone'] ?? '' ) );
	$has    = array();
	$tmp    = array();

	// 1. Onboarding and every other form they sent.
	$forms = '';
	foreach ( array_reverse( (array) ( $c['files'] ?? array() ) ) as $e ) {
		if ( ! is_array( $e ) ) {
			continue;
		}
		$forms .= '## ' . ( $e['form'] ?? 'Form' ) . ' (' . substr( (string) ( $e['date'] ?? '' ), 0, 10 ) . ")\n\n";
		foreach ( (array) ( $e['fields'] ?? array() ) as $f ) {
			$v = trim( (string) ( $f['value'] ?? '' ) );
			if ( '' !== $v ) {
				$forms .= '**' . trim( (string) ( $f['label'] ?? $f['id'] ?? 'Answer' ) ) . "**\n\n" . $v . "\n\n";
			}
		}
	}
	if ( '' !== $forms ) {
		$zip->addFromString( $R . '02-onboarding-answers.md', '# What ' . ( $person ?: 'the client' ) . " told us in the forms\n\n" . $forms );
		$has[] = '`02-onboarding-answers.md`: the client\'s own answers (onboarding form and any quote or contact forms). Treat these as the source of truth for what they want.';
	}

	// 2. Meetings.
	$meet = (array) ( $c['meetings'] ?? array() );
	$mlist = '';
	$mtext = '';
	$etext = '';
	$ttext = '';
	foreach ( array_reverse( $meet ) as $i => $m ) {
		$txt = dwdff_text( $m['id'] );
		$fn  = sprintf( '03-meetings/%02d-%s-%s.md', $i + 1, substr( $m['date'], 0, 10 ), dwdx_slug( $m['title'], 40 ) );
		$zip->addFromString( $R . $fn, '# ' . $m['title'] . "\n\n" . substr( $m['date'], 0, 10 ) . ' · ' . $m['mins'] . " minutes\n\n" . ( $m['summary'] ? "## Summary\n\n" . $m['summary'] . "\n\n" : '' ) . ( $m['actions'] ? "## Action items\n\n" . $m['actions'] . "\n\n" : '' ) . "## Transcript\n\n" . ( is_wp_error( $txt ) ? 'Could not fetch the transcript: ' . $txt->get_error_message() : $txt ) . "\n" );
		$mtext .= "\n\n=== CALL " . substr( $m['date'], 0, 10 ) . ': ' . $m['title'] . " ===\n" . ( $m['summary'] ? 'Summary: ' . $m['summary'] . "\n" : '' ) . ( $m['actions'] ? 'Action items: ' . $m['actions'] . "\n" : '' ) . ( is_wp_error( $txt ) ? '' : mb_substr( $txt, 0, 60000 ) );
		$mlist .= '- ' . substr( $m['date'], 0, 10 ) . ': ' . $m['title'] . ' → `' . $fn . "`\n";
	}
	if ( $meet ) {
		$has[] = '`03-meetings/`: ' . count( $meet ) . ' recorded call' . ( 1 === count( $meet ) ? '' : 's' ) . ' with summary, action items and full transcript, oldest first. Decisions made on a later call override earlier ones and the forms.';
	}

	// 3. Emails and texts.
	$mail = function_exists( 'dwdcm_for' ) ? (array) ( dwdcm_for( $pid, true )['list'] ?? array() ) : array();
	if ( $mail ) {
		usort( $mail, function ( $a, $b ) { return strcmp( (string) ( $a['date'] ?? '' ), (string) ( $b['date'] ?? '' ) ); } );
		$t = "# Emails with the client (oldest first)\n\n";
		foreach ( $mail as $x ) {
			$t .= '## ' . ( $x['subject'] ?? '(no subject)' ) . "\n\n" . substr( (string) ( $x['date'] ?? '' ), 0, 16 ) . ' · from ' . ( $x['from'] ?? '' ) . "\n\n" . trim( (string) ( $x['body'] ?? '' ) ) . "\n\n---\n\n";
		}
		$zip->addFromString( $R . '04-emails.md', $t );
		$etext = $t;
		$has[] = '`04-emails.md`: ' . count( $mail ) . ' emails to and from the client, oldest first.';
	}
	if ( '' !== $phone && get_option( 'dwds_quo_key', '' ) ) {
		$th = dwdq_thread( $phone );
		if ( ! is_wp_error( $th ) && ! empty( $th['list'] ) ) {
			$t = "# Texts with the client (oldest first)\n\n";
			foreach ( $th['list'] as $x ) {
				$t .= '**' . ( $x['in'] ? ( $person ?: 'Client' ) : 'Michael' ) . '** (' . substr( $x['at'], 0, 16 ) . '): ' . $x['text'] . "\n\n";
			}
			$zip->addFromString( $R . '05-texts.md', $t );
			$ttext = $t;
			$has[] = '`05-texts.md`: the text message thread with the client.';
		}
	}

	// 4. Files: uploaded in Dream Desk, then the client's Google Drive folder.
	$files = '';
	$total = 0;
	$used  = array();
	$uniq  = function ( $path ) use ( &$used ) {
		$p = $path;
		for ( $n = 2; isset( $used[ strtolower( $p ) ] ); $n++ ) {
			$p = preg_replace( '/(\.[^.\/]+)?$/', '-' . $n . '$1', $path, 1 );
		}
		$used[ strtolower( $p ) ] = 1;
		return $p;
	};
	foreach ( function_exists( 'dwda_list' ) ? dwda_list( $pid ) : array() as $a ) {
		$f = get_attached_file( $a['id'] );
		if ( $f && file_exists( $f ) && $total + filesize( $f ) < 400 * MB_IN_BYTES ) {
			$p = $uniq( 'assets/uploaded/' . sanitize_file_name( $a['name'] ) );
			$zip->addFile( $f, $R . $p );
			$total += filesize( $f );
			$files .= '- `' . $p . "` (added in Dream Desk)\n";
		}
	}
	foreach ( dwdx_form_files( $pid ) as $a ) {
		if ( $a['file'] && $total + $a['size'] < 400 * MB_IN_BYTES ) {
			$p = $uniq( 'assets/onboarding-form/' . sanitize_file_name( $a['name'] ) );
			$zip->addFile( $a['file'], $R . $p );
			$total += $a['size'];
			$files .= '- `' . $p . '` (uploaded by the client in the form: ' . $a['label'] . ")\n";
		}
	}
	$drive = function_exists( 'dwddr_files' ) ? dwddr_files( $pid, true ) : array( 'files' => array() );
	foreach ( (array) ( $drive['files'] ?? array() ) as $d ) {
		$p    = $uniq( 'assets/drive/' . ( '' !== (string) $d['path'] ? trim( preg_replace( '/[^A-Za-z0-9 _\-\/]/', '', (string) $d['path'] ), '/' ) . '/' : '' ) . sanitize_file_name( $d['name'] ) );
		$note = '';
		$got = (int) $d['size'] <= 20 * MB_IN_BYTES && $total + (int) $d['size'] <= 400 * MB_IN_BYTES && function_exists( 'dwddr_get' ) ? dwddr_get( $d['id'] ) : null;
		if ( is_array( $got ) ) { // through the Drive script: private files too, Google Docs / Sheets / Slides as PDF
			if ( preg_match( '/\.pdf$/i', $got['name'] ) && ! preg_match( '/\.pdf$/i', $p ) ) {
				$p = $uniq( $p . '.pdf' );
			}
			$zip->addFromString( $R . $p, $got['bytes'] );
			$total += strlen( $got['bytes'] );
		} elseif ( (int) $d['size'] > 80 * MB_IN_BYTES || $total + (int) $d['size'] > 400 * MB_IN_BYTES ) {
			$note = 'too large to include';
		} else {
			$t = wp_tempnam( 'dwdx' );
			$r = wp_remote_get( $d['dl'], array( 'timeout' => 120, 'redirection' => 5, 'stream' => true, 'filename' => $t ) );
			$ct = is_wp_error( $r ) ? '' : (string) wp_remote_retrieve_header( $r, 'content-type' );
			if ( is_wp_error( $r ) || 200 !== (int) wp_remote_retrieve_response_code( $r ) || 0 === strpos( $ct, 'text/html' ) || ! filesize( $t ) ) {
				$note = 'could not be downloaded automatically';
				@unlink( $t ); // phpcs:ignore
			} else {
				$zip->addFile( $t, $R . $p );
				$tmp[]  = $t;
				$total += filesize( $t );
			}
		}
		$files .= '- ' . ( $note ? $d['name'] . ' (' . $note . ', open it here: ' . $d['url'] . ')' : '`' . $p . '` (from the client\'s Google Drive folder)' ) . "\n";
	}
	if ( '' !== $files ) {
		$zip->addFromString( $R . '06-files.md', "# Files from the client\n\n" . $files );
		$has[] = '`assets/` and `06-files.md`: logos, photos and documents the client supplied, with a list of what each one is. Use these real assets before any placeholder.';
	}

	// 5. The brief.
	$ai      = get_post_meta( $pid, '_dwdc_ai_summary', true );
	$summary = is_array( $ai ) ? (string) ( $ai['text'] ?? '' ) : '';
	$insp    = '';
	foreach ( is_array( $ai ) ? (array) ( $ai['sites'] ?? array() ) : array() as $x ) {
		$insp .= '- ' . ( $x['url'] ?? '' ) . ( ! empty( $x['note'] ) ? ' (' . $x['note'] . ')' : '' ) . "\n";
	}
	$todos   = array();
	foreach ( get_posts( array( 'post_type' => DWDC_TASK, 'post_status' => 'private', 'posts_per_page' => -1 ) ) as $tp ) {
		$t = dwdc_task( $tp );
		if ( is_array( $t ) && (int) ( $t['contact'] ?? 0 ) === (int) $pid && empty( $t['done'] ) ) {
			$todos[] = '- ' . $t['text'] . ( ! empty( $t['due'] ) ? ' (due ' . $t['due'] . ')' : '' );
		}
	}
	// Michael's own notes from the Notes box (marked 'by' => 'me'; older ones are every note that isn't one of
	// Dream Desk's automatic log lines). These are his instructions for the build, oldest first.
	$notes = array();
	$auto  = '/^(payment of|payment link|stripe payment|upwork payment|removed the \$|google drive folder|drive upload link|onboarding form (emailed|sent|link)|call booked|email check|undid |client replied to open|\d+ open questions? answered|hosting (renew|payment)|marked (paid|complete|done)|markup review|quote (sent|emailed)|invoice|zoom (meeting|invite)|email sent|review request|re-hired|duplicate client|ai instructions|exported|reminder sent|contract (ended|started))|(emailed|sent) to [^\s@]+@|link emailed/i';
	foreach ( array_reverse( (array) ( $c['notes'] ?? array() ) ) as $n ) {
		$tx = trim( (string) ( is_array( $n ) ? ( $n['text'] ?? '' ) : $n ) );
		if ( '' === $tx || ( 'me' !== ( is_array( $n ) ? ( $n['by'] ?? '' ) : '' ) && preg_match( $auto, $tx ) ) ) {
			continue;
		}
		$notes[] = '- ' . substr( (string) ( is_array( $n ) ? ( $n['date'] ?? '' ) : '' ), 0, 10 ) . ': ' . $tx;
	}
	if ( $notes ) {
		$zip->addFromString( $R . '00-michaels-notes.md', "# Michael's notes for this build\n\nWritten by Michael in Dream Desk, oldest first. These are his instructions and decisions: follow them. Where a note conflicts with the client material, Michael's note wins unless the client said otherwise later.\n\n" . implode( "\n", $notes ) . "\n" );
		$has[] = '`00-michaels-notes.md`: Michael\'s own notes on this project, his instructions and decisions for the build. Read these first and follow them.';
	}
	$row   = function ( $k, $v ) { return '' !== trim( (string) $v ) ? '- **' . $k . ':** ' . trim( (string) $v ) . "\n" : ''; };
	$brief = '# ' . $c['name'] . "\n\n"
		. $row( 'Client', $person ) . $row( 'Company', (string) ( $client['company'] ?? '' ) ) . $row( 'Email', $email ) . $row( 'Phone', $phone )
		. $row( 'Current website', (string) ( $c['website'] ?? '' ) ) . $row( 'Staging site', (string) ( $c['staging'] ?? '' ) ) . $row( 'Markup review link', (string) ( $c['markup'] ?? '' ) )
		. $row( 'Deadline', (string) ( $c['deadline'] ?? '' ) ) . $row( 'Next step', (string) ( $c['next'] ?? '' ) ) . $row( 'Google Drive folder', (string) get_post_meta( $pid, '_dwdc_drive', true ) )
		. ( '' !== trim( $summary ) ? "\n## What they want (summary)\n\n" . trim( wp_strip_all_tags( $summary ) ) . "\n" : '' )
		. ( '' !== $insp ? "\n## Websites they like\n\n" . $insp : '' )
		. ( $meet ? "\n## Calls so far\n\n" . $mlist : '' )
		. ( $todos ? "\n## Open to-dos\n\n" . implode( "\n", $todos ) . "\n" : '' )
		. ( $notes ? "\n## Michael's notes (his instructions for the build: follow these)\n\n" . implode( "\n", $notes ) . "\n" : '' );
	$zip->addFromString( $R . '01-project-brief.md', $brief );
	array_unshift( $has, '`01-project-brief.md`: who the client is, their current site, the staging site, deadline, a short summary of what they want, my notes and open to-dos.' );

	// Custom job (not a new website or a redesign, see kickoff.php): the brief and CLAUDE.md are written around the work and its phases.
	$custom = function_exists( 'dwdc_ptype' ) && 'custom' === dwdc_ptype( $pid );

	// 6. Design brief for Claude Design, written by Claude from everything above.
	$design = '';
	$derr   = '';
	if ( function_exists( 'dwdc_ai_key' ) && dwdc_ai_key() ) {
		$pack = ( $custom ? "PROJECT TYPE: a custom job, NOT a new website or a redesign (fixing, finishing or taking over an existing site, adding features or integrations). Write the brief around the work requested: add a \"Scope and phases\" section near the top that lists every task from the Project Kickoff answers, Michael's notes, calls and emails, grouped by phase in the order to do them, each with what done looks like. Only give design direction for the parts that need new design, and keep it consistent with the existing site's look. Note the live site, the staging site, and any access, handoff notes or people to contact.\n\n" : '' ) . "MICHAEL'S HOUSE RULES (the design must follow these)\n" . dwdrb_rules() . "\n\n" . dwdrb_export_status( $pid ) . "PROJECT BRIEF\n" . $brief . "\n\nFORM ANSWERS\n" . mb_substr( $forms, 0, 40000 ) . "\n\nCALLS (oldest first)" . mb_substr( $mtext, 0, 150000 ) . "\n\nEMAILS\n" . mb_substr( $etext, 0, 40000 ) . "\n\nTEXTS\n" . mb_substr( $ttext, 0, 10000 ) . "\n\nFILES SUPPLIED\n" . $files;
		$res  = wp_remote_post( 'https://api.anthropic.com/v1/messages', array(
			'timeout' => 180,
			'headers' => array( 'x-api-key' => dwdc_ai_key(), 'anthropic-version' => '2026-10-21', 'content-type' => 'application/json' ),
			'body'    => wp_json_encode( array(
				'model'         => 'claude-opus-5-5',
				'max_tokens'    => 8000,
				'output_config' => array( 'effort' => 'medium' ),
				'system'        => 'You write the design brief that a freelance web designer hands to Claude Design (an AI design tool that produces website page designs) for a website project. You are given everything known about the project: the brief, the form answers, call transcripts, emails, texts and the list of files supplied. '
					. 'Write the brief in Markdown, addressed directly to Claude Design, telling it exactly what to design. Use these sections: "The business" (who they are, what they sell, who their customers are); "Goal of the site" (new build or redesign, what it must achieve, the main action a visitor should take); "Pages to design" (each page, and for each the sections in order with what each section says and shows, using the real wording from the material where it exists); "Look and feel" (colours, fonts, mood, the websites they like and what to take from each, what they dislike); "Content and assets" (which supplied logos, photos and documents to use and where, and what is missing); "Must-haves and constraints" (features, integrations, things they insisted on, deadline); "Open questions" (what is unclear or contradictory, to settle before designing). '
					. 'Rules: the "Michael\'s notes" section of the project brief is the designer\'s own instructions and decisions, so follow them and reflect them in the brief; use only what the material says and never invent facts about the business; where sources disagree the most recent call or message wins, and say so; be specific enough that a designer could start without reading anything else; design mobile first; the site will be built in WordPress with Elementor, so keep layouts buildable with standard sections; in side-by-side layouts keep headings to the same number of lines on both sides. No preamble and no closing remarks.',
				'messages'      => array( array( 'role' => 'user', 'content' => $pack ) ),
			) ),
		) );
		$body = is_wp_error( $res ) ? array() : (array) json_decode( wp_remote_retrieve_body( $res ), true );
		if ( is_wp_error( $res ) || 200 !== (int) wp_remote_retrieve_response_code( $res ) ) {
			$derr = is_wp_error( $res ) ? 'Claude could not be reached in time.' : (string) ( $body['error']['message'] ?? 'Claude returned an error.' );
		} else {
			foreach ( (array) ( $body['content'] ?? array() ) as $b ) {
				if ( 'text' === ( $b['type'] ?? '' ) ) {
					$design .= $b['text'];
				}
			}
			$design = trim( $design );
		}
	} else {
		$derr = 'No Claude API key saved in Dream Desk (open Ask AI and paste it).';
	}
	if ( '' !== $design ) {
		$zip->addFromString( $R . '00-design-brief-for-claude-design.md', '# Design brief for Claude Design: ' . $c['name'] . "\n\n" . $design . "\n" );
		array_unshift( $has, '`00-design-brief-for-claude-design.md`: the design brief, written from all the material here. Give this file to Claude Design to produce the page designs, and follow it as the plan for the build. If it disagrees with a source file, the source file wins.' );
	}

	// 7. Instructions for Claude Code.
	$claude = ( $custom ? ( '# ' . $c['name'] . ": project\n\n"
		. 'You are helping Michael Tarr of Dream Web Digital with this client project. It is a custom job, not a new website or a redesign: fixing, finishing or taking over an existing site, or adding features. Everything known about the project is in this folder. Read it all before changing anything.' . "\n\n"
		. "## What is in this folder\n\n- " . implode( "\n- ", $has ) . "\n\n"
		. "## How to start\n\n"
		. ( $notes ? "1. Read `00-michaels-notes.md` first: Michael's own instructions for this job. Then `01-project-brief.md`, the Project Kickoff answers in `02-onboarding-answers.md` (scope, phases, handoff notes, access, people), the meetings in date order, and the emails and texts.\n" : "1. Read `01-project-brief.md`, then the Project Kickoff answers in `02-onboarding-answers.md` (scope, phases, handoff notes, access, people), then the meetings in date order, and the emails and texts.\n" )
		. "2. Look through `assets/` so you know which documents, designs and screenshots exist.\n"
		. "3. Write a plan first: every task in the scope, grouped by phase in the order to do them, what done looks like for each, what access or files are still needed, and anything that could break the live site. Show Michael the plan before changing anything.\n"
		. "4. Work on the staging site (or a copy) first and take a backup before changes. Never change the live site without Michael's go-ahead.\n\n"
		) : ( '# ' . $c['name'] . ": website build\n\n"
		. 'You are helping Michael Tarr of Dream Web Digital build this client\'s website. Everything known about the project is in this folder. Read it all before writing anything.' . "\n\n"
		. "## What is in this folder\n\n- " . implode( "\n- ", $has ) . "\n\n"
		. "## How to start\n\n"
		. ( $notes ? "1. Read `00-michaels-notes.md` first: Michael's own instructions for this build. Then `01-project-brief.md`, the onboarding answers, the meetings in date order, and the emails and texts.\n" : "1. Read `01-project-brief.md`, then the onboarding answers, then the meetings in date order, then the emails and texts.\n" )
		. "2. Look through `assets/` so you know which logos, photos and documents exist.\n"
		. "3. Write a short plan first: sitemap, the sections on each page, what content is still missing, and questions for the client. Show Michael the plan before building.\n"
		. "4. Build the homepage first and show it before the inner pages.\n\n" ) )
		. "## How Michael builds (his house rules)\n\n" . dwdrb_rules() . "\n\n"
		. dwdrb_export_status( $pid )
		. "## Rules\n\n"
		. "- Where sources disagree, the most recent call or message wins. Say so when it happens.\n"
		. "- Do not guess facts about the business (prices, addresses, licence numbers, claims). List them as questions instead.\n"
		. "- This folder contains private client information. Keep it out of any public repository.\n\n"
		. 'Exported from Dream Desk on ' . current_time( 'Y-m-d' ) . ".\n";
	$zip->addFromString( $R . 'CLAUDE.md', $claude );
	$zip->close();
	foreach ( $tmp as $t ) {
		@unlink( $t ); // phpcs:ignore
	}
	dwdx_mark_exported( $pid );
	// Put a to-do on the project to review the export (one open copy at a time).
	$task = null;
	if ( function_exists( 'dwdc_add_task' ) ) {
		$ttext = 'Review the AI Instructions zip';
		$has_t = false;
		foreach ( get_posts( array( 'post_type' => DWDC_TASK, 'post_status' => 'private', 'posts_per_page' => -1, 'meta_key' => '_dwdc_contact', 'meta_value' => $pid ) ) as $tp ) { // phpcs:ignore
			$t0 = dwdc_task( $tp );
			if ( is_array( $t0 ) && empty( $t0['done'] ) && $t0['text'] === $ttext ) {
				$has_t = true;
			}
		}
		if ( ! $has_t ) {
			$task = dwdc_task( dwdc_add_task( $ttext, (int) $pid, '' ) );
		}
	}
	return array( 'task' => $task, 'url' => trailingslashit( $up['baseurl'] ) . 'dwd-exports/' . $file, 'name' => $name . '.zip', 'size' => filesize( $dir . '/' . $file ), 'meetings' => count( $meet ), 'emails' => count( $mail ), 'forms' => '' !== $forms, 'design' => '' !== $design, 'design_error' => $derr, 'files' => substr_count( $files, "\n" ), 'skipped' => substr_count( $files, 'open it here' ) );
}

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/export', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) { return dwdx_build( (int) $r['id'] ); } ) );
	// Past calendar events (same shape the calendar script sends), to file older recordings by their call.
	register_rest_route( 'dwd/v1', '/crm/fireflies/calendar', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$n   = dwdff_cal_log( dwdmt_parse( (array) $r->get_param( 'events' ) ) );
		$all = (array) get_option( 'dwdff_data', array() );
		$hit = 0;
		foreach ( $all as $id => $x ) {
			if ( empty( $x['pid'] ) && empty( $x['fixed'] ) ) {
				$p = dwdff_cal_match( $x['date'], (float) ( $x['mins'] ?? 0 ) );
				if ( $p ) {
					$all[ $id ]['pid'] = $p;
					$all[ $id ]['how'] = 'calendar';
					$hit++;
				}
			}
		}
		update_option( 'dwdff_data', $all, false );
		return array( 'calendar_calls' => $n, 'filed' => $hit, 'unfiled' => count( dwdff_unfiled() ) );
	} ) );
	register_rest_route( 'dwd/v1', '/crm/fireflies', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function ( $r ) {
			if ( $r->get_param( 'transcript' ) ) {
				$t = dwdff_text( sanitize_text_field( (string) $r->get_param( 'transcript' ) ) );
				return is_wp_error( $t ) ? $t : array( 'text' => $t );
			}
			$s = dwdff_sync();
			return is_wp_error( $s ) ? $s : array_merge( $s, array( 'unmatched' => array_values( array_map( function ( $t ) { return array( 'id' => $t['id'], 'title' => $t['title'], 'date' => substr( $t['date'], 0, 10 ), 'guests' => count( $t['guests'] ) ); }, array_filter( (array) get_option( 'dwdff_data', array() ), function ( $t ) { return ! $t['pid']; } ) ) ) ) );
		} ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) { // file a meeting on a project by hand (pid 0 = take it off)
			$p   = (array) $r->get_json_params();
			$all = (array) get_option( 'dwdff_data', array() );
			$id  = (string) ( $p['id'] ?? '' );
			if ( ! isset( $all[ $id ] ) ) {
				return new WP_Error( 'dwdff', 'Meeting not found.', array( 'status' => 404 ) );
			}
			$all[ $id ]['pid']   = (int) ( $p['pid'] ?? 0 );
			$all[ $id ]['fixed'] = true;
			update_option( 'dwdff_data', $all, false );
			return array( 'ok' => true );
		} ),
	) );
} );

/* ---------------------------------------------------------------- Download all assets of a project as one zip
 * Files uploaded in Dream Desk plus the files in the client's Google Drive folder. Kept for an hour.
 */
function dwdx_assets_zip( $pid, $only_new = false ) {
	if ( ! class_exists( 'ZipArchive' ) ) {
		return new WP_Error( 'dwdx', 'This server cannot make zip files (ZipArchive is missing).', array( 'status' => 500 ) );
	}
	if ( ! get_post( $pid ) ) {
		return new WP_Error( 'dwdx', 'Project not found.', array( 'status' => 404 ) );
	}
	require_once ABSPATH . 'wp-admin/includes/file.php';
	if ( function_exists( 'set_time_limit' ) ) {
		@set_time_limit( 300 );
	}
	$up  = wp_upload_dir();
	$dir = trailingslashit( $up['basedir'] ) . 'dwd-exports';
	wp_mkdir_p( $dir );
	if ( ! file_exists( $dir . '/index.html' ) ) {
		file_put_contents( $dir . '/index.html', '' ); // phpcs:ignore
	}
	foreach ( (array) glob( $dir . '/*.zip' ) as $old ) {
		if ( filemtime( $old ) < time() - HOUR_IN_SECONDS ) {
			@unlink( $old ); // phpcs:ignore
		}
	}
	$only = $only_new ? dwdx_new_files( $pid, true ) : null;
	$name = dwdx_slug( html_entity_decode( get_the_title( $pid ), ENT_QUOTES ) ) . ( $only_new ? '-new-files-' . current_time( 'Y-m-d' ) : '-assets' );
	$file = $name . '-' . wp_generate_password( 20, false ) . '.zip';
	$zip  = new ZipArchive();
	if ( true !== $zip->open( $dir . '/' . $file, ZipArchive::CREATE | ZipArchive::OVERWRITE ) ) {
		return new WP_Error( 'dwdx', 'Could not create the zip file on the server.', array( 'status' => 500 ) );
	}
	$R     = $name . '/';
	$tmp   = array();
	$used  = array();
	$total = 0;
	$n     = 0;
	$skip  = array();
	$uniq  = function ( $path ) use ( &$used ) {
		$p = $path;
		for ( $i = 2; isset( $used[ strtolower( $p ) ] ); $i++ ) {
			$p = preg_replace( '/(\.[^.\/]+)?$/', '-' . $i . '$1', $path, 1 );
		}
		$used[ strtolower( $p ) ] = 1;
		return $p;
	};
	foreach ( function_exists( 'dwda_list' ) ? dwda_list( $pid ) : array() as $a ) {
		if ( null !== $only && ! isset( $only[ 'a:' . $a['id'] ] ) ) {
			continue;
		}
		$f = get_attached_file( $a['id'] );
		if ( $f && file_exists( $f ) && $total + filesize( $f ) < 450 * MB_IN_BYTES ) {
			$zip->addFile( $f, $R . $uniq( sanitize_file_name( $a['name'] ) ) );
			$total += filesize( $f );
			$n++;
		} else {
			$skip[] = $a['name'] . ' | ' . $a['url'];
		}
	}
	foreach ( dwdx_form_files( $pid ) as $a ) {
		if ( null !== $only && ! isset( $only[ 'f:' . md5( $a['url'] ) ] ) ) {
			continue;
		}
		if ( $a['file'] && $total + $a['size'] < 450 * MB_IN_BYTES ) {
			$zip->addFile( $a['file'], $R . $uniq( 'onboarding-form/' . sanitize_file_name( $a['name'] ) ) );
			$total += $a['size'];
			$n++;
		} else {
			$skip[] = $a['name'] . ' | ' . $a['url'];
		}
	}
	$drive = function_exists( 'dwddr_files' ) ? dwddr_files( $pid, true ) : array( 'files' => array() );
	foreach ( (array) ( $drive['files'] ?? array() ) as $d ) {
		if ( null !== $only && ! isset( $only[ 'd:' . $d['id'] ] ) ) {
			continue;
		}
		$ok = false;
		if ( (int) $d['size'] <= 100 * MB_IN_BYTES && $total + (int) $d['size'] <= 450 * MB_IN_BYTES ) {
			$t  = wp_tempnam( 'dwdx' );
			$r  = wp_remote_get( $d['dl'], array( 'timeout' => 120, 'redirection' => 5, 'stream' => true, 'filename' => $t ) );
			$ct = is_wp_error( $r ) ? '' : (string) wp_remote_retrieve_header( $r, 'content-type' );
			if ( ! is_wp_error( $r ) && 200 === (int) wp_remote_retrieve_response_code( $r ) && 0 !== strpos( $ct, 'text/html' ) && filesize( $t ) ) {
				$zip->addFile( $t, $R . $uniq( 'drive/' . ( '' !== (string) $d['path'] ? trim( preg_replace( '/[^A-Za-z0-9 _\-\/]/', '', (string) $d['path'] ), '/' ) . '/' : '' ) . sanitize_file_name( $d['name'] ) ) );
				$tmp[]  = $t;
				$total += filesize( $t );
				$n++;
				$ok = true;
			} else {
				@unlink( $t ); // phpcs:ignore
			}
		}
		if ( ! $ok ) {
			$skip[] = $d['name'] . ' | ' . $d['url'];
		}
	}
	if ( $skip ) {
		$zip->addFromString( $R . 'not-included.txt', "These files could not be added automatically. Open each link to download it:\n\n" . implode( "\n", $skip ) . "\n" );
	}
	if ( ! $n && ! $skip ) {
		$zip->addFromString( $R . 'empty.txt', "No files on this project yet.\n" );
	}
	if ( null !== $only && $only ) {
		$note = '# New files from the client (' . current_time( 'Y-m-d' ) . ")\n\nThe client added these after the last export. Add them to the project's assets folder and use them in the build where they fit.\n\n";
		foreach ( $only as $x ) {
			$note .= '- ' . $x['name'] . ' (' . $x['from'] . ")\n";
		}
		$zip->addFromString( $R . 'NEW-FILES.md', $note );
	}
	$zip->close();
	dwdx_mark_exported( $pid );
	foreach ( $tmp as $t ) {
		@unlink( $t ); // phpcs:ignore
	}
	return array( 'url' => trailingslashit( $up['baseurl'] ) . 'dwd-exports/' . $file, 'name' => $name . '.zip', 'files' => $n, 'skipped' => count( $skip ) );
}
add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/assets-zip', array( 'methods' => 'POST', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function ( $r ) { return dwdx_assets_zip( (int) $r['id'], (bool) $r->get_param( 'new' ) ); } ) );
} );

/* ---------------------------------------------------------------- Files clients upload in the onboarding form
 * The form's upload boxes (logo, brand files, website content, photos) save into uploads/elementor/forms and the
 * answer holds the links. This lists them for the project's Assets box and the zips.
 */
function dwdx_form_files( $pid ) {
	$up   = wp_upload_dir();
	$base = trailingslashit( $up['baseurl'] );
	$out  = array();
	$seen = array();
	foreach ( (array) get_post_meta( $pid, '_dwdc_entries', true ) as $e ) {
		foreach ( is_array( $e ) ? (array) ( $e['fields'] ?? array() ) : array() as $f ) {
			$v = (string) ( $f['value'] ?? '' );
			if ( false === strpos( $v, '/uploads/elementor/forms/' ) ) {
				continue;
			}
			foreach ( preg_split( '/\s*,\s*|\s+/', $v ) as $u ) {
				$u = esc_url_raw( trim( $u ) );
				if ( '' === $u || isset( $seen[ $u ] ) || false === strpos( $u, '/uploads/elementor/forms/' ) ) {
					continue;
				}
				$seen[ $u ] = 1;
				$rel  = preg_replace( '#^https?://[^/]+#', '', $u );
				$brel = preg_replace( '#^https?://[^/]+#', '', $base );
				$file = 0 === strpos( $rel, $brel ) ? trailingslashit( $up['basedir'] ) . rawurldecode( substr( $rel, strlen( $brel ) ) ) : '';
				$file = $file && false === strpos( $file, '..' ) && file_exists( $file ) ? $file : '';
				$name = rawurldecode( wp_basename( $rel ) );
				$out[] = array(
					'name'  => $name,
					'url'   => $u,
					'size'  => $file ? filesize( $file ) : 0,
					'label' => sanitize_text_field( preg_replace( '/^Upload( your)?\s*/i', '', (string) ( $f['label'] ?? '' ) ) ),
					'img'   => (bool) preg_match( '/\.(png|jpe?g|gif|webp|svg|avif)$/i', $name ),
					'file'  => $file,
				);
			}
		}
	}
	return $out;
}
add_filter( 'dwdc_contact_full', function ( $c, $pid ) {
	$c['form_files'] = array_map( function ( $x ) { unset( $x['file'] ); return $x; }, dwdx_form_files( $pid ) );
	return $c;
}, 12, 2 );

/* ---------------------------------------------------------------- New files since the last export
 * Every export remembers which files it held. Files the client adds later (form, Drive folder, uploads) count as
 * new until the next export: a badge on the project, a to-do, and a "new files only" zip.
 */
function dwdx_file_keys( $pid, $fresh = false ) {
	$out = array();
	foreach ( function_exists( 'dwda_list' ) ? dwda_list( $pid ) : array() as $a ) {
		$out[ 'a:' . $a['id'] ] = array( 'name' => (string) $a['name'], 'from' => 'Uploaded in Dream Desk' );
	}
	foreach ( dwdx_form_files( $pid ) as $a ) {
		$out[ 'f:' . md5( $a['url'] ) ] = array( 'name' => (string) $a['name'], 'from' => 'Onboarding form' );
	}
	if ( $fresh && function_exists( 'dwddr_files' ) ) {
		$df = (array) ( dwddr_files( $pid, true )['files'] ?? array() );
	} else {
		$m  = get_post_meta( $pid, '_dwdc_drive_files', true );
		$df = is_array( $m ) ? (array) ( $m['files'] ?? array() ) : array();
	}
	foreach ( $df as $x ) {
		$out[ 'd:' . $x['id'] ] = array( 'name' => ( '' !== (string) ( $x['path'] ?? '' ) ? $x['path'] . ' / ' : '' ) . $x['name'], 'from' => 'Drive folder' );
	}
	return $out;
}
function dwdx_mark_exported( $pid ) {
	update_post_meta( $pid, '_dwdx_exported', array( 'at' => current_time( 'mysql' ), 'keys' => array_keys( dwdx_file_keys( $pid ) ) ) );
	update_post_meta( $pid, '_dwdx_newn', 0 );
}
function dwdx_new_files( $pid, $fresh = false ) {
	$e = get_post_meta( $pid, '_dwdx_exported', true );
	if ( ! is_array( $e ) || ! isset( $e['keys'] ) ) {
		return array(); // never exported: nothing to compare with
	}
	return array_diff_key( dwdx_file_keys( $pid, $fresh ), array_flip( (array) $e['keys'] ) );
}
add_filter( 'dwdc_contact_full', function ( $c, $pid ) {
	$new = dwdx_new_files( $pid );
	if ( count( $new ) !== (int) get_post_meta( $pid, '_dwdx_newn', true ) ) {
		update_post_meta( $pid, '_dwdx_newn', count( $new ) );
	}
	$e                 = get_post_meta( $pid, '_dwdx_exported', true );
	$c['new_assets']   = array_values( $new );
	$c['new_assets_n'] = count( $new );
	$c['exported_at']  = is_array( $e ) ? (string) ( $e['at'] ?? '' ) : '';
	return $c;
}, 13, 2 );

/** Hourly: look in the Drive folder of every exported, still-open project; flag and add a to-do when files arrived. */
add_action( 'dwdx_hourly', function () {
	$ids = get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdx_exported' ) ); // phpcs:ignore
	foreach ( $ids as $id ) {
		if ( in_array( get_post_meta( $id, '_dwdc_list', true ), array( 'complete', 'archive' ), true ) ) {
			continue;
		}
		$n   = count( dwdx_new_files( $id, '' !== (string) get_post_meta( $id, '_dwdc_drive', true ) ) );
		$old = (int) get_post_meta( $id, '_dwdx_newn', true );
		update_post_meta( $id, '_dwdx_newn', $n );
		if ( $n > $old && function_exists( 'dwdc_add_task' ) ) {
			$text = 'New assets from client: add to the build';
			$open = false;
			foreach ( get_posts( array( 'post_type' => DWDC_TASK, 'post_status' => 'private', 'posts_per_page' => -1, 'meta_key' => '_dwdc_contact', 'meta_value' => $id ) ) as $tp ) { // phpcs:ignore
				$t = dwdc_task( $tp );
				$open = $open || ( is_array( $t ) && empty( $t['done'] ) && $t['text'] === $text );
			}
			if ( ! $open ) {
				dwdc_add_task( $text, (int) $id, '' );
			}
		}
	}
} );
add_action( 'init', function () {
	if ( ! wp_next_scheduled( 'dwdx_hourly' ) ) {
		wp_schedule_event( time() + 900, 'hourly', 'dwdx_hourly' );
	}
} );

/* ---------------------------------------------------------------- Open questions answered by email
 * When a client's email arrives after the open questions were listed, Claude reads it and pulls out the answers.
 * Answered questions leave the open list, the answers are filed with the form answers (so the next AI Instructions
 * zip and its design brief include them), and a to-do says so.
 */
function dwdqa_check( $pid ) {
	$q = get_post_meta( $pid, '_dwdrb_q', true );
	if ( ! is_array( $q ) || empty( $q['list'] ) || ! function_exists( 'dwdc_ai_key' ) || ! dwdc_ai_key() || ! function_exists( 'dwdcm_owner' ) ) {
		return 0;
	}
	$since = (int) strtotime( get_gmt_from_date( (string) ( $q['at'] ?? '' ) ) . ' UTC' );
	$seen  = (array) get_post_meta( $pid, '_dwdqa_seen', true );
	$mails = array();
	foreach ( (array) get_post_meta( dwdcm_owner( $pid ), '_dwdcm_mail', true ) as $x ) {
		if ( is_array( $x ) && ! empty( $x['in'] ) && ! in_array( (string) $x['id'], $seen, true ) && (int) strtotime( (string) ( $x['date'] ?? '' ) ) > $since ) {
			$mails[] = $x;
		}
	}
	if ( ! $mails ) {
		return 0;
	}
	usort( $mails, function ( $a, $b ) { return strcmp( (string) $a['date'], (string) $b['date'] ); } );
	$mails = array_slice( $mails, -6 );
	$pack  = "OPEN QUESTIONS\n";
	foreach ( array_values( (array) $q['list'] ) as $i => $t ) {
		$pack .= ( $i + 1 ) . '. ' . $t . "\n";
	}
	$pack .= "\nEMAILS FROM THE CLIENT (oldest first)\n";
	foreach ( $mails as $x ) {
		$pack .= '--- ' . substr( (string) $x['date'], 0, 16 ) . ': ' . ( $x['subject'] ?? '' ) . "\n" . mb_substr( (string) ( $x['body'] ?? '' ), 0, 8000 ) . "\n";
	}
	$res = wp_remote_post( 'https://api.anthropic.com/v1/messages', array(
		'timeout' => 90,
		'headers' => array( 'x-api-key' => dwdc_ai_key(), 'anthropic-version' => '2026-10-21', 'content-type' => 'application/json' ),
		'body'    => wp_json_encode( array(
			'model'         => 'claude-opus-5-5',
			'max_tokens'    => 3000,
			'output_config' => array( 'effort' => 'low' ),
			'system'        => 'A web designer asked a client some open questions before building their website. You are given the numbered questions and the client\'s newest emails. '
				. 'For each question the emails address, give the answer in the client\'s own meaning, complete but short, keeping names, links, dates and numbers exactly, '
				. 'and say whether it is a FULL answer: "full": true only when the client clearly and completely answers everything the question asks (a yes/no, a confirmation, a choice, the requested details). '
				. 'Use "full": false when the reply only covers part of the question, says it is not confirmed or decided yet, asks a question back, defers (I will check, later), or is unclear. '
				. 'Do not include a question the emails do not address, and never guess. Ignore quoted text from earlier emails unless the client wrote their answer inside it. '
				. 'Reply with JSON only: {"answers":[{"n":1,"answer":"...","full":true}]}. If none are addressed, reply {"answers":[]}.',
			'messages'      => array( array( 'role' => 'user', 'content' => $pack ) ),
		) ),
	) );
	if ( is_wp_error( $res ) || 200 !== (int) wp_remote_retrieve_response_code( $res ) ) {
		return 0; // try again on the next email sync
	}
	$body = json_decode( wp_remote_retrieve_body( $res ), true );
	$text = '';
	foreach ( (array) ( $body['content'] ?? array() ) as $b ) {
		$text .= 'text' === ( $b['type'] ?? '' ) ? $b['text'] : '';
	}
	$j = preg_match( '/\{[\s\S]*\}/', $text, $mm ) ? json_decode( $mm[0], true ) : null;
	update_post_meta( $pid, '_dwdqa_seen', array_slice( array_merge( $seen, array_map( function ( $x ) { return (string) $x['id']; }, $mails ) ), -200 ) );
	if ( ! is_array( $j ) || empty( $j['answers'] ) ) {
		return 0;
	}
	$list   = array_values( (array) $q['list'] );
	$fields = array();
	$done   = array();
	$partial = array();
	foreach ( (array) $j['answers'] as $a ) {
		$n   = (int) ( $a['n'] ?? 0 ) - 1;
		$ans = sanitize_textarea_field( (string) ( $a['answer'] ?? '' ) );
		if ( ! isset( $list[ $n ] ) || '' === $ans || isset( $done[ $n ] ) ) {
			continue;
		}
		if ( true !== ( $a['full'] ?? false ) ) { // not fully answered: the question stays open
			$partial[] = 'Q' . ( $n + 1 ) . ' (' . mb_substr( $list[ $n ], 0, 80 ) . '): ' . $ans;
			continue;
		}
		$done[ $n ] = 1;
		$fields[]   = array( 'id' => 'qa_' . ( $n + 1 ), 'label' => $list[ $n ], 'value' => $ans );
	}
	if ( $partial ) {
		$pn   = get_post_meta( $pid, '_dwdc_notes', true );
		$pn   = is_array( $pn ) ? $pn : array();
		$pn[] = array( 'date' => current_time( 'mysql', true ), 'text' => 'Client replied to open questions but did not fully answer (still open): ' . implode( ' | ', $partial ) );
		update_post_meta( $pid, '_dwdc_notes', $pn );
	}
	if ( ! $fields ) {
		return 0;
	}
	$entries   = get_post_meta( $pid, '_dwdc_entries', true );
	$entries   = is_array( $entries ) ? $entries : array();
	$entries[] = array( 'form' => 'Open questions answered by email', 'date' => current_time( 'mysql' ), 'fields' => $fields );
	update_post_meta( $pid, '_dwdc_entries', $entries );
	$q['list'] = array_values( array_diff_key( $list, $done ) );
	update_post_meta( $pid, '_dwdrb_q', $q );
	update_post_meta( $pid, '_dwdqa_at', current_time( 'mysql' ) );
	$notes   = get_post_meta( $pid, '_dwdc_notes', true );
	$notes   = is_array( $notes ) ? $notes : array();
	$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => count( $fields ) . ' open question' . ( 1 === count( $fields ) ? '' : 's' ) . ' answered by email and filed with the form answers. ' . count( $q['list'] ) . ' still open.' );
	update_post_meta( $pid, '_dwdc_notes', $notes );
	if ( function_exists( 'dwdc_add_task' ) ) {
		$text = 'Open questions answered: download the updated AI Instructions';
		$open = false;
		foreach ( get_posts( array( 'post_type' => DWDC_TASK, 'post_status' => 'private', 'posts_per_page' => -1, 'meta_key' => '_dwdc_contact', 'meta_value' => $pid ) ) as $tp ) { // phpcs:ignore
			$t    = dwdc_task( $tp );
			$open = $open || ( is_array( $t ) && empty( $t['done'] ) && $t['text'] === $text );
		}
		if ( ! $open ) {
			dwdc_add_task( $text, (int) $pid, '' );
		}
	}
	return count( $fields );
}
add_action( 'dwdqa_run', function () {
	if ( function_exists( 'set_time_limit' ) ) {
		@set_time_limit( 300 );
	}
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdrb_q' ) ) as $id ) { // phpcs:ignore
		if ( ! in_array( get_post_meta( $id, '_dwdc_list', true ), array( 'complete', 'archive' ), true ) ) {
			dwdqa_check( (int) $id );
		}
	}
} );
add_action( 'rest_api_init', function () {
	// Undo the latest "Open questions answered by email" filing (a reply that didn't really answer):
	// its questions go back on the open list, the filed answers are removed, and its to-do is closed.
	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/answers-undo', array( 'methods' => 'POST', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function ( $r ) {
		$pid     = (int) $r['id'];
		$entries = get_post_meta( $pid, '_dwdc_entries', true );
		$entries = is_array( $entries ) ? $entries : array();
		$at      = -1;
		foreach ( $entries as $i => $e ) {
			if ( 'Open questions answered by email' === ( $e['form'] ?? '' ) ) {
				$at = $i;
			}
		}
		if ( $at < 0 ) {
			return new WP_Error( 'dwdqa_none', 'No email answers to undo on this project.', array( 'status' => 404 ) );
		}
		$back = array();
		foreach ( (array) ( $entries[ $at ]['fields'] ?? array() ) as $f ) {
			$back[] = (string) ( $f['label'] ?? '' );
		}
		array_splice( $entries, $at, 1 );
		update_post_meta( $pid, '_dwdc_entries', $entries );
		$q         = get_post_meta( $pid, '_dwdrb_q', true );
		$q         = is_array( $q ) ? $q : array( 'list' => array() );
		$q['list'] = array_values( array_unique( array_merge( array_filter( $back ), (array) ( $q['list'] ?? array() ) ) ) );
		update_post_meta( $pid, '_dwdrb_q', $q );
		$closed = 0;
		foreach ( get_posts( array( 'post_type' => DWDC_TASK, 'post_status' => 'private', 'posts_per_page' => -1, 'meta_key' => '_dwdc_contact', 'meta_value' => $pid ) ) as $tp ) { // phpcs:ignore
			$t = function_exists( 'dwdc_task' ) ? dwdc_task( $tp ) : null;
			if ( is_array( $t ) && empty( $t['done'] ) && 0 === strpos( (string) $t['text'], 'Open questions answered' ) ) {
				wp_delete_post( $tp->ID, true );
				$closed++;
			}
		}
		$notes   = get_post_meta( $pid, '_dwdc_notes', true );
		$notes   = is_array( $notes ) ? $notes : array();
		$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => 'Undid "Open questions answered by email": the client had not fully answered. ' . count( $back ) . ' question' . ( 1 === count( $back ) ? '' : 's' ) . ' back on the open list.' );
		update_post_meta( $pid, '_dwdc_notes', $notes );
		return array( 'restored' => $back, 'open' => count( $q['list'] ), 'tasks_removed' => $closed );
	} ) );
	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/answers-check', array( 'methods' => 'POST', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function ( $r ) { return array( 'answered' => dwdqa_check( (int) $r['id'] ) ); } ) );
} );
