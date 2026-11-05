<?php
/**
 * "Ask AI" on Money Stats: questions about income, projects and trends,
 * answered by Claude using a summary of the Dream Desk data.
 *
 * The API key is stored server-side (option dwdc_claude_key) or set with
 * define( 'DWDC_CLAUDE_KEY', '...' ) in wp-config.php. It is never sent to the browser.
 *
 * @package DWD_Projects
 */

defined( 'ABSPATH' ) || exit;

function dwdc_ai_key() {
	if ( defined( 'DWDC_CLAUDE_KEY' ) && DWDC_CLAUDE_KEY ) {
		return DWDC_CLAUDE_KEY;
	}
	return (string) get_option( 'dwdc_claude_key', '' );
}

/** A compact picture of the business for the model to answer from. */
function dwdc_ai_context() {
	$num      = function ( $v ) { return (float) preg_replace( '/[^\d.\-]/', '', (string) $v ); };
	$projects = array();
	$monthly  = array();
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1 ) ) as $p ) {
		$c = dwdc_contact( $p );
		if ( ! $c || 'archive' === $c['list'] ) {
			continue;
		}
		$pays   = get_post_meta( $p->ID, '_dwdc_payments', true );
		$first  = '';
		$last   = '';
		$byYear = array();
		foreach ( is_array( $pays ) ? $pays : array() as $x ) {
			$st = strtolower( (string) ( $x['status'] ?? 'paid' ) );
			if ( in_array( $st, array( 'open', 'void', 'draft', 'failed', 'uncollectible' ), true ) ) {
				continue;
			}
			$d = (string) ( $x['date'] ?? '' );
			$a = abs( $num( $x['amount'] ?? 0 ) ) * ( 'refunded' === $st ? -1 : 1 );
			if ( ! preg_match( '/^\d{4}-\d{2}/', $d ) ) {
				continue;
			}
			$src = in_array( $x['source'] ?? '', array( 'Upwork', 'Stripe', 'PayPal' ), true ) ? $x['source'] : 'Other';
			$ym  = substr( $d, 0, 7 );
			if ( ! isset( $monthly[ $ym ] ) ) {
				$monthly[ $ym ] = array( 'Upwork' => 0, 'Stripe' => 0, 'PayPal' => 0, 'Other' => 0 );
			}
			$monthly[ $ym ][ $src ] += $a;
			$y            = substr( $d, 0, 4 );
			$byYear[ $y ] = round( ( $byYear[ $y ] ?? 0 ) + $a, 2 );
			if ( $a > 0 ) {
				$first = $first ? min( $first, $d ) : $d;
				$last  = max( $last, $d );
			}
		}
		$k          = $c['client'] ? dwdc_client( $c['client'] ) : null;
		$received   = $num( $c['billed'] ) + $num( $c['stripe'] ) + $num( $c['paypal'] ) + $num( $c['manual'] );
		$projects[] = array_filter( array(
			'project'      => $c['name'],
			'client'       => $k ? $k['name'] : $c['person'],
			'status'       => $c['list'],
			'price'        => $num( $c['price'] ) ?: null,
			'received'     => round( $received, 2 ),
			'owed'         => $num( $c['balance'] ) ?: null,
			'received_by_year' => $byYear ?: null,
			'first_paid'   => $first ?: null,
			'last_paid'    => $last ?: null,
			'finished'     => $c['completed'] ?: null,
			'paid_via'     => $c['pay_method'] ?: null,
			'found_via'    => $c['lead_source'] ?: null,
			'hosting_yr'   => $num( $c['hosting'] ) ?: null,
			'website'      => $c['website'] ?: null,
		), function ( $v ) { return null !== $v && '' !== $v; } );
	}
	ksort( $monthly );
	foreach ( $monthly as $ym => $o ) {
		$monthly[ $ym ] = array_map( function ( $v ) { return round( $v, 2 ); }, $o );
	}
	return array(
		'today'               => current_time( 'Y-m-d' ),
		'business'            => 'Dream Web Digital (Michael Tarr) – websites, hosting and site work for small businesses.',
		'notes'               => array(
			'Money is what was actually received. Upwork amounts are after Upwork service fees and refunds.',
			'"Other" is Zelle, checks and payments logged by hand.',
			'Paychecks from a separate non-web-design job are NOT included.',
			'Project "status": active, hold (on hold), limbo (waiting on client), complete.',
		),
		'monthly_received_by_source' => $monthly,
		'upwork_connects_costs_by_year' => function_exists( 'dwdc_costs_by_year' ) ? array_map( function ( $o ) { unset( $o['mq'] ); return $o; }, dwdc_costs_by_year() ) : array(),
		'weekly_trends'       => function_exists( 'dwdt_get' ) ? dwdt_get() : null,
		'projects'            => $projects,
	);
}

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };

	register_rest_route( 'dwd/v1', '/crm/ask/key', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$key = trim( (string) $r->get_param( 'key' ) );
		if ( ! preg_match( '/^sk-ant-[A-Za-z0-9_\-]{20,}$/', $key ) ) {
			return new WP_Error( 'dwdc_key', 'That doesn’t look like a Claude API key (it starts with sk-ant-).', array( 'status' => 400 ) );
		}
		update_option( 'dwdc_claude_key', $key, false );
		return array( 'ok' => true );
	} ) );

	register_rest_route( 'dwd/v1', '/crm/ask', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$key = dwdc_ai_key();
		if ( ! $key ) {
			return new WP_Error( 'dwdc_nokey', 'Add your Claude API key first.', array( 'status' => 400, 'needs_key' => true ) );
		}
		$msgs = array();
		foreach ( array_slice( (array) $r->get_param( 'messages' ), -12 ) as $m ) {
			$m    = (array) $m;
			$role = 'assistant' === ( $m['role'] ?? '' ) ? 'assistant' : 'user';
			$text = trim( wp_strip_all_tags( (string) ( $m['content'] ?? '' ) ) );
			if ( '' !== $text ) {
				$msgs[] = array( 'role' => $role, 'content' => mb_substr( $text, 0, 4000 ) );
			}
		}
		if ( ! $msgs || 'user' !== end( $msgs )['role'] ) {
			return new WP_Error( 'dwdc_ask', 'Ask a question.', array( 'status' => 400 ) );
		}
		while ( $msgs && 'user' !== $msgs[0]['role'] ) {
			array_shift( $msgs );
		}

		$personal = 'personal' === $r->get_param( 'scope' ) && function_exists( 'dwdbk_ai_context' );
		$system = $personal ? array(
			array(
				'type' => 'text',
				'text' => "You are Michael Tarr's private personal-finance assistant inside Dream Desk (his own money, not his business). You work like a smart budgeting app: you spot where his money goes, spending trends month to month, recurring charges and subscriptions (including ones that stopped, got more expensive, or look forgotten), bills coming up, and simple ways to save. Answer using only the data below: bank transactions imported from his Bank of America downloads (negative amounts are money out; category 'Transfers' are moves between his own accounts or card payments and are not spending), detected recurring charges, his manual money log and bills. Lead with the answer and the numbers (rounded to the nearest dollar), then one or two practical suggestions when useful. Be honest when the data can't answer something (e.g. no bank file uploaded yet, or the months don't cover what was asked) and say which download would fix it. Never invent transactions.\n\nDATA (JSON):\n" . wp_json_encode( dwdbk_ai_context() ),
				'cache_control' => array( 'type' => 'ephemeral' ),
			),
		) : array(
			array(
				'type' => 'text',
				'text' => "You are the money and trends assistant inside Dream Desk, the private business dashboard of Michael Tarr (Dream Web Digital). Answer Michael's questions about his income, projects, clients, Upwork Connects spending and trends, using only the data below. Be direct and specific: lead with the answer and the numbers, then one or two sentences of insight when useful. Use plain language, dollar amounts rounded to the nearest dollar, and short bullet lists only when comparing several items. Do the arithmetic carefully from the monthly and per-project figures. If the data can't answer the question, say what's missing instead of guessing.\n\nDATA (JSON):\n" . wp_json_encode( dwdc_ai_context() ),
				'cache_control' => array( 'type' => 'ephemeral' ),
			),
		);
		$res = wp_remote_post( 'https://api.anthropic.com/v1/messages', array(
			'timeout' => 90,
			'headers' => array(
				'x-api-key'         => $key,
				'anthropic-version' => '2026-10-21',
				'anthropic-beta'    => 'server-side-fallback-2026-07-01',
				'content-type'      => 'application/json',
			),
			'body'    => wp_json_encode( array(
				'model'         => 'claude-opus-5-5',
				'max_tokens'    => 16000,
				'output_config' => array( 'effort' => 'medium' ),
				'fallbacks'     => 'default',
				'system'        => $system,
				'messages'      => $msgs,
			) ),
		) );
		if ( is_wp_error( $res ) ) {
			return new WP_Error( 'dwdc_ai', 'Couldn’t reach Claude: ' . $res->get_error_message(), array( 'status' => 502 ) );
		}
		$code = wp_remote_retrieve_response_code( $res );
		$body = json_decode( wp_remote_retrieve_body( $res ), true );
		if ( 200 !== $code ) {
			$msg = $body['error']['message'] ?? 'Claude returned an error.';
			if ( 401 === $code ) {
				$msg = 'Your Claude API key was rejected. Paste a new one.';
				return new WP_Error( 'dwdc_ai', $msg, array( 'status' => 400, 'needs_key' => true ) );
			}
			return new WP_Error( 'dwdc_ai', $msg, array( 'status' => 502 ) );
		}
		if ( 'refusal' === ( $body['stop_reason'] ?? '' ) ) {
			return array( 'answer' => 'I can’t answer that one. Try asking it a different way.' );
		}
		$text = '';
		foreach ( (array) ( $body['content'] ?? array() ) as $b ) {
			if ( 'text' === ( $b['type'] ?? '' ) ) {
				$text .= $b['text'];
			}
		}
		return array( 'answer' => trim( $text ) ?: 'I didn’t get an answer back. Try again.' );
	} ) );
} );
