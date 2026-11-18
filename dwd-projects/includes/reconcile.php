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
				$ref = $amt < 0 && preg_match( '/^T11/', $ev ); // refund sent back to a buyer
				if ( ! $in && ! $ref ) {
					continue;
				}
				$rows[] = array(
					'ref'    => (string) ( $ti['transaction_id'] ?? '' ),
					'date'   => substr( (string) ( $ti['transaction_initiation_date'] ?? '' ), 0, 10 ),
					'amount' => round( $amt, 2 ),
					'fee'    => round( (float) ( $ti['fee_amount']['value'] ?? 0 ), 2 ),
					'who'    => (string) ( $t['payer_info']['payer_name']['alternate_full_name'] ?? '' ),
					'invoice'=> (string) ( $ti['invoice_id'] ?? '' ),
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

add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/crm/reconcile', array( 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'manage_options' ); }, 'callback' => function ( $r ) {
		@set_time_limit( 300 );
		$c = get_transient( 'dwdrc_last' );
		return ( $c && ! $r->get_param( 'fresh' ) ) ? $c : dwdrc_run();
	} ) );
} );
