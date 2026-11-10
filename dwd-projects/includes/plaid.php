<?php
/**
 * Plaid: live bank connection (e.g. Bank of America) for the Personal finances.
 * Mike's own Plaid keys are stored server-side and never sent to the browser. Transactions sync
 * daily into the same store as the CSV imports (dwdbk_data), de-duplicated by Plaid's id.
 */
defined( 'ABSPATH' ) || exit;

function dwdpl_env() {
	$e = (string) get_option( 'dwdpl_env', 'production' );
	return in_array( $e, array( 'sandbox', 'production' ), true ) ? $e : 'production';
}
function dwdpl_ready() {
	return '' !== (string) get_option( 'dwdpl_client_id', '' ) && '' !== (string) get_option( 'dwdpl_secret', '' );
}
function dwdpl_items() {
	$i = get_option( 'dwdpl_items', array() );
	return is_array( $i ) ? $i : array();
}

function dwdpl_call( $path, $body ) {
	$res = wp_remote_post( 'https://' . dwdpl_env() . '.plaid.com' . $path, array(
		'timeout' => 45,
		'headers' => array( 'Content-Type' => 'application/json' ),
		'body'    => wp_json_encode( array_merge( array( 'client_id' => get_option( 'dwdpl_client_id' ), 'secret' => get_option( 'dwdpl_secret' ) ), $body ) ),
	) );
	if ( is_wp_error( $res ) ) {
		return $res;
	}
	$d = json_decode( wp_remote_retrieve_body( $res ), true );
	if ( wp_remote_retrieve_response_code( $res ) >= 300 ) {
		return new WP_Error( 'dwdpl', 'Plaid: ' . ( $d['display_message'] ?? $d['error_message'] ?? 'request failed' ), array( 'status' => 400, 'code' => $d['error_code'] ?? '' ) );
	}
	return $d;
}

function dwdpl_cat( $t ) {
	$p = strtoupper( (string) ( $t['personal_finance_category']['primary'] ?? '' ) );
	$map = array(
		'INCOME' => 'Income', 'TRANSFER_IN' => 'Transfers', 'TRANSFER_OUT' => 'Transfers', 'LOAN_PAYMENTS' => 'Bills & Utilities',
		'BANK_FEES' => 'Fees', 'ENTERTAINMENT' => 'Fun', 'FOOD_AND_DRINK' => 'Dining', 'GENERAL_MERCHANDISE' => 'Shopping',
		'HOME_IMPROVEMENT' => 'Home', 'MEDICAL' => 'Health', 'PERSONAL_CARE' => 'Health', 'GENERAL_SERVICES' => 'Services',
		'GOVERNMENT_AND_NON_PROFIT' => 'Taxes & Gov', 'TRANSPORTATION' => 'Gas & Car', 'TRAVEL' => 'Travel', 'RENT_AND_UTILITIES' => 'Bills & Utilities',
	);
	$det = strtoupper( (string) ( $t['personal_finance_category']['detailed'] ?? '' ) );
	if ( false !== strpos( $det, 'GROCER' ) ) {
		return 'Groceries';
	}
	$guess = dwdbk_category( ( $t['merchant_name'] ?? '' ) . ' ' . ( $t['name'] ?? '' ), -(float) $t['amount'] );
	if ( 'Subscriptions' === $guess || 'Business' === $guess ) {
		return $guess;
	}
	return $map[ $p ] ?? $guess;
}

/** Pull new/changed/removed transactions for every connected bank. */
function dwdpl_sync() {
	if ( ! dwdpl_ready() ) {
		return array( 'skipped' => 'Plaid keys not added' );
	}
	$items = dwdpl_items();
	$d     = dwdbk_get();
	$index = array();
	foreach ( $d['tx'] as $i => $t ) {
		$index[ $t['id'] ] = $i;
	}
	$added = 0;
	$errors = array();
	foreach ( $items as $k => $it ) {
		$cursor = (string) ( $it['cursor'] ?? '' );
		$accts  = array();
		for ( $page = 0; $page < 30; $page++ ) {
			$r = dwdpl_call( '/transactions/sync', array_filter( array( 'access_token' => $it['token'], 'cursor' => $cursor, 'count' => 500 ) ) );
			if ( is_wp_error( $r ) ) {
				$errors[] = $it['institution'] . ': ' . $r->get_error_message();
				$items[ $k ]['error'] = $r->get_error_message();
				break;
			}
			foreach ( (array) ( $r['accounts'] ?? array() ) as $a ) {
				$accts[ $a['account_id'] ] = trim( ( $a['name'] ?? 'Account' ) . ( ! empty( $a['mask'] ) ? ' ••' . $a['mask'] : '' ) );
			}
			foreach ( array_merge( (array) $r['added'], (array) $r['modified'] ) as $t ) {
				if ( ! empty( $t['pending'] ) ) {
					continue;
				}
				$row = array(
					'id'   => 'p' . substr( md5( $t['transaction_id'] ), 0, 15 ),
					'date' => (string) $t['date'],
					'desc' => mb_substr( sanitize_text_field( (string) ( $t['merchant_name'] ?? $t['name'] ) ), 0, 160 ),
					'amt'  => round( -(float) $t['amount'], 2 ), // Plaid: positive = money out
					'm'    => dwdbk_merchant( (string) ( $t['merchant_name'] ?? $t['name'] ) ),
					'cat'  => dwdpl_cat( $t ),
					'acct' => $it['institution'] . ( isset( $accts[ $t['account_id'] ] ) ? ' · ' . $accts[ $t['account_id'] ] : '' ),
				);
				if ( isset( $index[ $row['id'] ] ) ) {
					$d['tx'][ $index[ $row['id'] ] ] = $row;
				} else {
					$index[ $row['id'] ] = count( $d['tx'] );
					$d['tx'][]          = $row;
					$added++;
				}
			}
			$gone = array();
			foreach ( (array) $r['removed'] as $t ) {
				$gone[ 'p' . substr( md5( $t['transaction_id'] ), 0, 15 ) ] = 1;
			}
			if ( $gone ) {
				$d['tx'] = array_values( array_filter( $d['tx'], function ( $t ) use ( $gone ) { return ! isset( $gone[ $t['id'] ] ); } ) );
				$index   = array();
				foreach ( $d['tx'] as $i => $t ) {
					$index[ $t['id'] ] = $i;
				}
			}
			$cursor = (string) $r['next_cursor'];
			if ( empty( $r['has_more'] ) ) {
				break;
			}
		}
		$items[ $k ]['cursor']   = $cursor;
		$items[ $k ]['accounts'] = array_values( $accts ) ? array_values( $accts ) : ( $it['accounts'] ?? array() );
		$items[ $k ]['synced']   = current_time( 'mysql' );
		if ( empty( $errors ) ) {
			unset( $items[ $k ]['error'] );
		}
	}
	dwdbk_put( $d );
	update_option( 'dwdpl_items', $items, false );
	return array( 'added' => $added, 'errors' => $errors );
}

add_action( 'dwdpl_daily', 'dwdpl_sync' );
add_action( 'init', function () {
	if ( ! wp_next_scheduled( 'dwdpl_daily' ) ) {
		wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'dwdpl_daily' );
	}
} );

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	$status = function () {
		return array(
			'ready' => dwdpl_ready(),
			'env'   => dwdpl_env(),
			'banks' => array_values( array_map( function ( $i ) { return array( 'id' => $i['id'], 'institution' => $i['institution'], 'accounts' => $i['accounts'] ?? array(), 'synced' => $i['synced'] ?? '', 'error' => $i['error'] ?? '' ); }, dwdpl_items() ) ),
		);
	};
	register_rest_route( 'dwd/v1', '/crm/plaid', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => $status ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) use ( $status ) {
			$p = (array) $r->get_json_params();
			$a = (string) ( $p['action'] ?? '' );
			if ( 'keys' === $a ) {
				$id  = trim( (string) ( $p['client_id'] ?? '' ) );
				$sec = trim( (string) ( $p['secret'] ?? '' ) );
				if ( ! preg_match( '/^[a-f0-9]{24}$/', $id ) || ! preg_match( '/^[a-f0-9]{30}$/', $sec ) ) {
					return new WP_Error( 'dwdpl_keys', 'Those don’t look like Plaid keys. The Client ID is 24 characters and the Secret is 30 (letters a–f and numbers).', array( 'status' => 400 ) );
				}
				update_option( 'dwdpl_client_id', $id, false );
				update_option( 'dwdpl_secret', $sec, false );
				update_option( 'dwdpl_env', 'sandbox' === ( $p['env'] ?? '' ) ? 'sandbox' : 'production', false );
				return $status();
			}
			if ( 'link' === $a ) {
				$t = dwdpl_call( '/link/token/create', array(
					'user'          => array( 'client_user_id' => 'dwd-' . get_current_user_id() ),
					'client_name'   => 'Dream Desk',
					'products'      => array( 'transactions' ),
					'transactions'  => array( 'days_requested' => 730 ),
					'country_codes' => array( 'US' ),
					'language'      => 'en',
				) );
				return is_wp_error( $t ) ? $t : array( 'link_token' => $t['link_token'] );
			}
			if ( 'exchange' === $a ) {
				$x = dwdpl_call( '/item/public_token/exchange', array( 'public_token' => (string) ( $p['public_token'] ?? '' ) ) );
				if ( is_wp_error( $x ) ) {
					return $x;
				}
				$items   = dwdpl_items();
				$items[] = array( 'id' => $x['item_id'], 'token' => $x['access_token'], 'institution' => sanitize_text_field( (string) ( $p['institution'] ?? 'Bank' ) ), 'cursor' => '', 'accounts' => array() );
				update_option( 'dwdpl_items', $items, false );
				$s           = $status();
				$s['sync']   = dwdpl_sync();
				return $s;
			}
			if ( 'sync' === $a ) {
				$s         = $status();
				$s['sync'] = dwdpl_sync();
				$s         = array_merge( $s, $status() );
				return $s;
			}
			if ( 'remove' === $a ) {
				$items = array();
				foreach ( dwdpl_items() as $i ) {
					if ( $i['id'] === (string) ( $p['id'] ?? '' ) ) {
						dwdpl_call( '/item/remove', array( 'access_token' => $i['token'] ) );
					} else {
						$items[] = $i;
					}
				}
				update_option( 'dwdpl_items', $items, false );
				return $status();
			}
			return new WP_Error( 'dwdpl', 'Unknown action', array( 'status' => 400 ) );
		} ),
	) );
} );

/* ---------------------------------------------------------------- Account balances
 * /accounts/get returns each account's balance as of Plaid's last update (no extra Balance charge).
 * Checked once a day at 5 AM Eastern (and the first time, if nothing is saved yet), keyed by the account's last 4 digits.
 */
function dwdpl_balances( $force = false ) {
	$saved = get_option( 'dwdpl_balances', array() );
	$saved = is_array( $saved ) ? $saved : array();
	if ( ! dwdpl_ready() || ( ! $force && ! empty( $saved['at'] ) ) ) { // checked once a day (5 AM Eastern), not on page load
		return $saved;
	}
	$accts = array();
	foreach ( dwdpl_items() as $it ) {
		$r = dwdpl_call( '/accounts/get', array( 'access_token' => $it['token'] ) );
		if ( is_wp_error( $r ) ) {
			continue;
		}
		foreach ( (array) ( $r['accounts'] ?? array() ) as $a ) {
			$mask = (string) ( $a['mask'] ?? '' );
			$name = (string) ( $a['official_name'] ?? '' ) ?: (string) ( $a['name'] ?? '' );
			$accts[ $mask ? $mask : md5( $name ) ] = array(
				'name'      => sanitize_text_field( (string) ( $a['name'] ?? $name ) ),
				'mask'      => $mask,
				'type'      => sanitize_text_field( (string) ( $a['subtype'] ?? $a['type'] ?? '' ) ),
				'business'  => (bool) preg_match( '/business/i', $name . ' ' . ( $a['name'] ?? '' ) ),
				'current'   => isset( $a['balances']['current'] ) ? round( (float) $a['balances']['current'], 2 ) : null,
				'available' => isset( $a['balances']['available'] ) ? round( (float) $a['balances']['available'], 2 ) : null,
			);
		}
	}
	if ( ! $accts ) {
		return $saved;
	}
	$saved = array( 'at' => current_time( 'mysql' ), 'ts' => time(), 'accounts' => array_values( $accts ) );
	update_option( 'dwdpl_balances', $saved, false );
	return $saved;
}


/* Daily balance check at 5:00 AM Eastern. A single event that re-schedules itself, so it stays at 5 AM through daylight saving changes. */
function dwdpl_next_5am() {
	$tz  = new DateTimeZone( 'America/New_York' );
	$now = new DateTime( 'now', $tz );
	$at  = new DateTime( 'today 05:00', $tz );
	if ( $at <= $now ) {
		$at->modify( '+1 day' );
	}
	return $at->getTimestamp();
}
add_action( 'dwdpl_balance_check', function () {
	dwdpl_balances( true );
	wp_schedule_single_event( dwdpl_next_5am(), 'dwdpl_balance_check' );
} );
add_action( 'init', function () {
	if ( ! wp_next_scheduled( 'dwdpl_balance_check' ) ) {
		wp_schedule_single_event( dwdpl_next_5am(), 'dwdpl_balance_check' );
	}
} );
