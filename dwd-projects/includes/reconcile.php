<?php
/**
 * Read-only reconciliation: compares the payments logged in Dream Desk with PayPal's and Stripe's own records,
 * and lists bank deposits from PayPal / Stripe / Upwork by year. Changes nothing.
 * GET /dwd/v1/crm/reconcile  (cached for an hour; ?fresh=1 to pull again)
 */
defined( 'ABSPATH' ) || exit;

function dwdrc_paypal() {
	$token = function_exists( 'dwds_paypal_token' ) ? dwds_paypal_token() : '';
	if ( ! $token ) {
		return array( 'error' => 'PayPal not connected' );
	}
	$rows = array();
	$end  = time();
	for ( $i = 0; $i < 37; $i++ ) {
		$start = $end - 30 * DAY_IN_SECONDS;
		$page  = 1;
		do {
			$r = wp_remote_get( 'https://api-m.paypal.com/v1/reporting/transactions?fields=transaction_info,payer_info&page_size=500&page=' . $page . '&start_date=' . rawurlencode( gmdate( 'Y-m-d\TH:i:s\Z', $start ) ) . '&end_date=' . rawurlencode( gmdate( 'Y-m-d\TH:i:s\Z', $end ) ), array( 'timeout' => 30, 'headers' => array( 'Authorization' => 'Bearer ' . $token ) ) );
			$j = json_decode( wp_remote_retrieve_body( $r ), true );
			if ( ! empty( $j['name'] ) && empty( $j['transaction_details'] ) ) {
				return array( 'error' => 'PayPal: ' . $j['name'], 'rows' => $rows );
			}
			foreach ( (array) ( $j['transaction_details'] ?? array() ) as $t ) {
				$ti  = $t['transaction_info'] ?? array();
				$amt = (float) ( $ti['transaction_amount']['value'] ?? 0 );
				$ev  = (string) ( $ti['transaction_event_code'] ?? '' );
				$st  = (string) ( $ti['transaction_status'] ?? 'S' );
				$in  = $amt > 0 && 'S' === $st && preg_match( '/^T0(0|1)/', $ev );
				$ref = $amt < 0 && in_array( $ev, array( 'T1106', 'T1107' ), true ); // a client refund or chargeback (T1104 etc. are bank-funding reversals for your own purchases, not client money)
				if ( ! $in && ! $ref ) {
					continue;
				}
				$rows[] = array(
					'ref'    => (string) ( $ti['transaction_id'] ?? '' ),
					'date'   => substr( (string) ( $ti['transaction_initiation_date'] ?? '' ), 0, 10 ),
					'amount' => round( $amt, 2 ),
					'fee'    => round( (float) ( $ti['fee_amount']['value'] ?? 0 ), 2 ),
					'who'    => (string) ( $t['payer_info']['payer_name']['alternate_full_name'] ?? '' ),
					'email'  => strtolower( (string) ( $t['payer_info']['email_address'] ?? '' ) ),
					'invoice'=> (string) ( $ti['invoice_id'] ?? '' ),
					'orig'   => (string) ( $ti['paypal_reference_id'] ?? '' ), // a refund: the payment it sent money back on
					'event'  => $ev,
					'subject'=> (string) ( $ti['transaction_subject'] ?? ( $ti['transaction_note'] ?? '' ) ),
					'kind'   => $in ? 'payment' : 'refund',
				);
			}
			$page++;
		} while ( ! empty( $j['total_pages'] ) && $page <= (int) $j['total_pages'] );
		$end = $start;
	}
	return array( 'rows' => $rows, 'from' => gmdate( 'Y-m-d', $end ) );
}

function dwdrc_stripe() {
	$key = (string) get_option( 'dwds_stripe_key', '' );
	if ( ! $key ) {
		return array( 'error' => 'Stripe not connected' );
	}
	$get  = function ( $path ) use ( $key ) {
		$r = wp_remote_get( 'https://api.stripe.com/v1/' . $path, array( 'timeout' => 30, 'headers' => array( 'Authorization' => 'Bearer ' . $key ) ) );
		return json_decode( wp_remote_retrieve_body( $r ), true );
	};
	$rows = array();
	$after = '';
	for ( $i = 0; $i < 50; $i++ ) {
		$j = $get( 'charges?limit=100&expand[]=data.invoice' . ( $after ? '&starting_after=' . $after : '' ) );
		if ( empty( $j['data'] ) ) {
			if ( ! empty( $j['error'] ) ) {
				return array( 'error' => 'Stripe: ' . ( $j['error']['message'] ?? 'error' ) );
			}
			break;
		}
		foreach ( $j['data'] as $o ) {
			$after = $o['id'];
			if ( empty( $o['paid'] ) || 'succeeded' !== ( $o['status'] ?? '' ) ) {
				continue;
			}
			$inv    = is_array( $o['invoice'] ?? null ) ? $o['invoice'] : null;
			$rows[] = array(
				'ref'      => $inv ? (string) ( $inv['number'] ?? $inv['id'] ) : (string) $o['id'],
				'charge'   => (string) $o['id'],
				'date'     => gmdate( 'Y-m-d', (int) $o['created'] ),
				'amount'   => round( ( $o['amount'] ?? 0 ) / 100, 2 ),
				'refunded' => round( ( $o['amount_refunded'] ?? 0 ) / 100, 2 ),
				'who'      => (string) ( $o['billing_details']['name'] ?? ( $inv['customer_name'] ?? '' ) ),
				'shop'     => ! empty( $o['metadata']['order_id'] ), // a WooCommerce shop order, not a Dream Desk project
			);
		}
		if ( empty( $j['has_more'] ) ) {
			break;
		}
	}
	return array( 'rows' => $rows );
}

/** Every PayPal / Stripe payment logged in Dream Desk. */
function dwdrc_crm( $source ) {
	$out = array();
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids', 'meta_key' => '_dwdc_payments' ) ) as $id ) {
		foreach ( (array) get_post_meta( $id, '_dwdc_payments', true ) as $k => $p ) {
			if ( ! is_array( $p ) || $source !== ( $p['source'] ?? '' ) ) {
				continue;
			}
			$st = strtolower( (string) ( $p['status'] ?? 'paid' ) );
			if ( in_array( $st, array( 'open', 'void', 'draft', 'failed', 'uncollectible', 'held' ), true ) ) {
				continue;
			}
			$out[] = array( 'pid' => (int) $id, 'project' => html_entity_decode( get_the_title( $id ), ENT_QUOTES, 'UTF-8' ), 'ref' => (string) ( $p['ref'] ?? '' ), 'date' => substr( (string) ( $p['date'] ?? '' ), 0, 10 ), 'amount' => round( (float) preg_replace( '/[^\d.]/', '', (string) ( $p['amount'] ?? 0 ) ), 2 ) * ( 'refunded' === $st ? -1 : 1 ), 'note' => (string) ( $p['note'] ?? '' ) );
		}
	}
	return $out;
}

/** Pair the provider's rows with Dream Desk's: by reference first, then same amount within 3 days. */
function dwdrc_match( $api, $crm ) {
	$used = array();
	$pair = array();
	$byRef = array();
	foreach ( $crm as $i => $c ) {
		if ( '' !== $c['ref'] ) {
			$byRef[ $c['ref'] ][] = $i;
		}
	}
	foreach ( $api as $a => $x ) {
		foreach ( array( $x['ref'], $x['charge'] ?? '' ) as $ref ) {
			foreach ( $byRef[ $ref ] ?? array() as $i ) {
				if ( '' !== $ref && ! isset( $used[ $i ] ) ) {
					$used[ $i ] = 1;
					$pair[ $a ] = $i;
					break 2;
				}
			}
		}
	}
	foreach ( $api as $a => $x ) {
		if ( isset( $pair[ $a ] ) ) {
			continue;
		}
		foreach ( $crm as $i => $c ) {
			if ( ! isset( $used[ $i ] ) && abs( $c['amount'] - $x['amount'] ) < 0.01 && abs( strtotime( $c['date'] ) - strtotime( $x['date'] ) ) <= 3 * DAY_IN_SECONDS ) {
				$used[ $i ] = 1;
				$pair[ $a ] = $i;
				break;
			}
		}
	}
	return array( $pair, $used );
}

function dwdrc_run() {
	$res = array( 'generated' => current_time( 'mysql' ) );
	$yr  = function ( $d ) { return substr( (string) $d, 0, 4 ); };
	foreach ( array( 'PayPal' => dwdrc_paypal(), 'Stripe' => dwdrc_stripe() ) as $src => $got ) {
		if ( ! empty( $got['error'] ) && empty( $got['rows'] ) ) {
			$res[ $src ] = array( 'error' => $got['error'] );
			continue;
		}
		$api = array_values( array_filter( $got['rows'], function ( $x ) { return empty( $x['shop'] ); } ) );
		$crm = dwdrc_crm( $src );
		$from = 'PayPal' === $src ? ( $got['from'] ?? '' ) : '';
		if ( $from ) { // PayPal only goes back 3 years: compare the same window
			$crm = array_values( array_filter( $crm, function ( $c ) use ( $from ) { return $c['date'] >= $from; } ) );
		}
		list( $pair, $used ) = dwdrc_match( $api, $crm );
		$years = array();
		foreach ( $api as $a => $x ) {
			$y = $yr( $x['date'] );
			$years[ $y ]['provider'] = round( ( $years[ $y ]['provider'] ?? 0 ) + $x['amount'] - ( $x['refunded'] ?? 0 ), 2 );
		}
		foreach ( $crm as $c ) {
			$y = $yr( $c['date'] );
			$years[ $y ]['crm'] = round( ( $years[ $y ]['crm'] ?? 0 ) + $c['amount'], 2 );
		}
		krsort( $years );
		$res[ $src ] = array(
			'from'          => $from,
			'provider_count'=> count( $api ),
			'crm_count'     => count( $crm ),
			'matched'       => count( $pair ),
			'years'         => $years,
			'not_in_crm'    => array_values( array_map( function ( $a ) use ( $api ) { return $api[ $a ]; }, array_diff( array_keys( $api ), array_keys( $pair ) ) ) ),
			'not_at_provider' => array_values( array_filter( $crm, function ( $c, $i ) use ( $used ) { return ! isset( $used[ $i ] ); }, ARRAY_FILTER_USE_BOTH ) ),
			'refunds'       => array_values( array_filter( $api, function ( $x ) { return ( $x['refunded'] ?? 0 ) > 0 || 'refund' === ( $x['kind'] ?? '' ); } ) ),
			'skipped_shop'  => count( $got['rows'] ) - count( $api ),
		);
	}
	// Bank: deposits that came from PayPal, Stripe or Upwork, by year (payouts are batched and after fees, so these are a cross-check only).
	if ( function_exists( 'dwdbk_get' ) ) {
		$bk = array();
		foreach ( (array) ( dwdbk_get()['tx'] ?? array() ) as $t ) {
			$d = strtolower( (string) ( $t['desc'] ?? '' ) );
			if ( (float) ( $t['amt'] ?? 0 ) <= 0 ) {
				continue;
			}
			$s = false !== strpos( $d, 'paypal' ) ? 'PayPal' : ( false !== strpos( $d, 'stripe' ) ? 'Stripe' : ( false !== strpos( $d, 'upwork' ) ? 'Upwork' : '' ) );
			if ( ! $s ) {
				continue;
			}
			$y = $yr( $t['date'] ?? '' );
			$bk[ $y ][ $s ] = round( ( $bk[ $y ][ $s ] ?? 0 ) + (float) $t['amt'], 2 );
			$bk[ $y ]['first'] = min( $bk[ $y ]['first'] ?? '9999', (string) $t['date'] );
		}
		krsort( $bk );
		$res['bank'] = $bk;
	}
	if ( function_exists( 'dwdc_money_by_year' ) ) {
		$res['crm_by_year'] = dwdc_money_by_year();
	}
	set_transient( 'dwdrc_last', $res, HOUR_IN_SECONDS );
	return $res;
}

/** The project a PayPal payer belongs to: by email first, then an exact name match on the project or its client. */
function dwdrc_project_for( $email, $who ) {
	$pid = function_exists( 'dwds_project_for' ) ? dwds_project_for( $email, $who ) : 0;
	if ( $pid ) {
		return array( $pid, 'email' );
	}
	$n = strtolower( trim( preg_replace( '/[,.]|\b(llc|inc)\b/i', '', (string) $who ) ) );
	$n = trim( preg_replace( '/\s+/', ' ', $n ) );
	if ( strlen( $n ) < 4 ) {
		return array( 0, '' );
	}
	$hits = array();
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'numberposts' => -1, 'fields' => 'ids' ) ) as $id ) {
		$k     = (int) get_post_meta( $id, '_dwdc_client', true );
		$names = array( get_the_title( $id ), get_post_meta( $id, '_dwdc_person', true ), get_post_meta( $id, '_dwdc_company', true ), $k ? get_the_title( $k ) : '' );
		foreach ( $names as $x ) {
			$x = strtolower( trim( preg_replace( '/\s+/', ' ', preg_replace( '/[,.]|\b(llc|inc)\b/i', '', html_entity_decode( (string) $x, ENT_QUOTES, 'UTF-8' ) ) ) ) );
			if ( $x && $x === $n ) {
				$hits[ $id ] = 1;
			}
		}
	}
	return 1 === count( $hits ) ? array( (int) key( $hits ), 'name' ) : array( 0, count( $hits ) > 1 ? 'several projects with that name' : '' );
}

/** PayPal payments missing from Dream Desk: which project each belongs to, and whether it would be a duplicate. */
function dwdrc_paypal_missing( $apply = false ) {
	$rc  = get_transient( 'dwdrc_last' ) ?: dwdrc_run();
	$out = array();
	foreach ( (array) ( $rc['PayPal']['not_in_crm'] ?? array() ) as $x ) {
		if ( 'payment' !== ( $x['kind'] ?? '' ) ) {
			continue;
		}
		list( $pid, $how ) = dwdrc_project_for( $x['email'] ?? '', $x['who'] );
		$row = array( 'date' => $x['date'], 'amount' => $x['amount'], 'who' => $x['who'], 'ref' => $x['ref'], 'project' => $pid ? html_entity_decode( get_the_title( $pid ), ENT_QUOTES, 'UTF-8' ) : '', 'pid' => $pid, 'matched_by' => $how, 'result' => '' );
		if ( ! $pid ) {
			$row['result'] = 'no project';
		} else {
			// Same money already on the project under any source (Upwork, Other...) within 14 days: don't add it again.
			foreach ( (array) get_post_meta( $pid, '_dwdc_payments', true ) as $p ) {
				if ( is_array( $p ) && abs( (float) preg_replace( '/[^\d.]/', '', (string) ( $p['amount'] ?? 0 ) ) - $x['amount'] ) < 0.01 && abs( strtotime( (string) $p['date'] ) - strtotime( $x['date'] ) ) <= 14 * DAY_IN_SECONDS ) {
					$row['result'] = 'already there (' . ( $p['source'] ?? '' ) . ' ' . $p['date'] . ')';
				}
			}
			if ( ! $row['result'] ) {
				$row['result'] = 'to add';
				if ( $apply ) {
					$bal  = get_post_meta( $pid, '_dwdc_balance', true ); // an old payment: what's owed today stays as it is
					$seen = (array) get_option( 'dwds_seen_refs', array() );
					unset( $seen[ 'PayPal:' . $x['ref'] ] ); // it was set aside as "unmatched" by the old sync
					update_option( 'dwds_seen_refs', $seen, false );
					$r = dwds_log_payment( 'PayPal', $x['email'] ?? '', $x['who'], $x['amount'], $x['date'], $x['ref'], 'PayPal payment (added from PayPal history)', $pid );
					update_post_meta( $pid, '_dwdc_balance', $bal );
					$row['result'] = 'added' === $r ? 'added' : $r;
				}
			}
		}
		$out[] = $row;
	}
	if ( $apply ) {
		delete_transient( 'dwdrc_last' );
	}
	return $out;
}

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	// Log a refund on a project: money sent back to the client. It comes off income; what's owed is left alone.
	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/refund', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$id  = (int) $r['id'];
		$amt = round( (float) preg_replace( '/[^\d.]/', '', (string) $r->get_param( 'amount' ) ), 2 );
		if ( $amt <= 0 || DWDC_CONTACT !== get_post_type( $id ) ) {
			return new WP_Error( 'dwdc_amt', 'Enter the amount refunded.', array( 'status' => 400 ) );
		}
		$src  = sanitize_text_field( (string) $r->get_param( 'source' ) ) ?: 'Other';
		$date = sanitize_text_field( (string) $r->get_param( 'date' ) ) ?: current_time( 'Y-m-d' );
		$pays = get_post_meta( $id, '_dwdc_payments', true );
		$pays = is_array( $pays ) ? $pays : array();
		$pays[] = array( 'date' => $date, 'amount' => (string) $amt, 'source' => $src, 'ref' => sanitize_text_field( (string) $r->get_param( 'ref' ) ) ?: 'Refund logged in Dream Desk', 'status' => 'refunded', 'note' => sanitize_text_field( (string) $r->get_param( 'note' ) ) ?: 'Refund' );
		usort( $pays, function ( $a, $b ) { return strcmp( (string) ( $b['date'] ?? '' ), (string) ( $a['date'] ?? '' ) ); } );
		update_post_meta( $id, '_dwdc_payments', $pays );
		$notes   = (array) get_post_meta( $id, '_dwdc_notes', true );
		$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => 'Refund of $' . number_format( $amt, 2 ) . ' (' . $src . ', ' . $date . ') logged.' );
		update_post_meta( $id, '_dwdc_notes', array_values( array_filter( $notes ) ) );
		wp_update_post( array( 'ID' => $id ) );
		return dwdc_contact( $id, true );
	} ) );
	// Correct how a logged payment was paid (e.g. it came by check, not Stripe). Amount, date and owed stay the same.
	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/payment/(?P<i>\d+)/source', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$id   = (int) $r['id'];
		$i    = (int) $r['i'];
		$pays = get_post_meta( $id, '_dwdc_payments', true );
		$src  = sanitize_text_field( (string) $r->get_param( 'source' ) );
		if ( ! $src || ! is_array( $pays ) || ! isset( $pays[ $i ] ) ) {
			return new WP_Error( 'dwdc_nf', 'Payment not found.', array( 'status' => 404 ) );
		}
		$old              = (string) ( $pays[ $i ]['source'] ?? '' );
		$pays[ $i ]['source'] = $src;
		$pays[ $i ]['ref']    = 'Logged in Dream Desk';
		if ( null !== $r->get_param( 'note' ) ) {
			$pays[ $i ]['note'] = sanitize_text_field( (string) $r->get_param( 'note' ) );
		}
		update_post_meta( $id, '_dwdc_payments', $pays );
		$notes   = (array) get_post_meta( $id, '_dwdc_notes', true );
		$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => 'Payment of $' . $pays[ $i ]['amount'] . ' (' . $pays[ $i ]['date'] . ') changed from ' . $old . ' to ' . $src . '.' );
		update_post_meta( $id, '_dwdc_notes', array_values( array_filter( $notes ) ) );
		wp_update_post( array( 'ID' => $id ) );
		return dwdc_contact( $id, true );
	} ) );
	// Look up PayPal transactions by id around a date (read-only), e.g. the payment a refund points back to.
	register_rest_route( 'dwd/v1', '/crm/reconcile/paypal-tx', array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$token = dwds_paypal_token();
		$d     = strtotime( (string) $r->get_param( 'date' ) ) ?: time();
		$out   = array();
		foreach ( array( -31, 0 ) as $o ) { // the 31 days before the date, then the 31 days after
			$st  = $d + $o * DAY_IN_SECONDS;
			$res = wp_remote_get( 'https://api-m.paypal.com/v1/reporting/transactions?fields=transaction_info,payer_info,cart_info&transaction_id=' . rawurlencode( (string) $r->get_param( 'id' ) ) . '&start_date=' . rawurlencode( gmdate( 'Y-m-d\TH:i:s\Z', $st ) ) . '&end_date=' . rawurlencode( gmdate( 'Y-m-d\TH:i:s\Z', $st + 31 * DAY_IN_SECONDS - 1 ) ), array( 'timeout' => 30, 'headers' => array( 'Authorization' => 'Bearer ' . $token ) ) );
			$j   = json_decode( wp_remote_retrieve_body( $res ), true );
			foreach ( (array) ( $j['transaction_details'] ?? array() ) as $t ) {
				$out[] = $t;
			}
		}
		return $out;
	} ) );
	// One PayPal invoice's status and recorded payments, straight from PayPal (read-only).
	register_rest_route( 'dwd/v1', '/crm/reconcile/paypal-invoice', array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$j = dwdi_paypal( 'GET', '/v2/invoicing/invoices/' . rawurlencode( (string) $r->get_param( 'id' ) ) );
		return is_wp_error( $j ) ? $j : array( 'status' => $j['status'] ?? '', 'payments' => $j['payments'] ?? null, 'amount' => $j['amount']['value'] ?? '', 'due_amount' => $j['due_amount']['value'] ?? '' );
	} ) );
	// Upwork Connects / membership costs: GET lists them; POST adds rows (by Upwork transaction id, never twice).
	register_rest_route( 'dwd/v1', '/crm/costs/add', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () { return array_values( (array) get_option( 'dwdc_upwork_costs', array() ) ); } ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$costs = (array) get_option( 'dwdc_upwork_costs', array() );
			$have  = array_flip( array_filter( array_map( function ( $x ) { return (string) ( $x['ref'] ?? '' ); }, $costs ) ) );
			$added = 0;
			foreach ( (array) $r->get_param( 'rows' ) as $x ) {
				$x   = (array) $x;
				$ref = sanitize_text_field( (string) ( $x['ref'] ?? '' ) );
				if ( '' === $ref || isset( $have[ $ref ] ) || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) ( $x['date'] ?? '' ) ) ) {
					continue;
				}
				$costs[]      = array( 'date' => $x['date'], 'amount' => round( (float) ( $x['amount'] ?? 0 ), 2 ), 'type' => 'membership' === ( $x['type'] ?? '' ) ? 'membership' : 'connects', 'qty' => absint( $x['qty'] ?? 0 ), 'ref' => $ref );
				$have[ $ref ] = 1;
				$added++;
			}
			update_option( 'dwdc_upwork_costs', $costs, false );
			return array( 'added' => $added );
		} ),
	) );
	register_rest_route( 'dwd/v1', '/crm/reconcile/paypal-missing', array( 'methods' => array( 'GET', 'POST' ), 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function ( $r ) {
		@set_time_limit( 300 );
		return dwdrc_paypal_missing( 'POST' === $r->get_method() && $r->get_param( 'apply' ) );
	} ) );
	register_rest_route( 'dwd/v1', '/crm/reconcile', array( 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function ( $r ) {
		@set_time_limit( 300 );
		$c = get_transient( 'dwdrc_last' );
		return ( $c && ! $r->get_param( 'fresh' ) ) ? $c : dwdrc_run();
	} ) );
} );
