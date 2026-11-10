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

/** Everything in Dream Desk (projects, leads, notes, to-dos, clients) for the floating Ask assistant. */
function dwdc_ai_desk_context() {
	$cut   = function ( $t, $n ) { $t = trim( preg_replace( '/\s+/', ' ', (string) $t ) ); return mb_strlen( $t ) > $n ? mb_substr( $t, 0, $n ) . '…' : $t; };
	$clean = function ( $a ) { return array_filter( $a, function ( $v ) { return null !== $v && '' !== $v && array() !== $v && false !== $v; } ); };
	$names = array();
	$items = array();
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1 ) ) as $p ) {
		$c = dwdc_contact( $p, true );
		if ( ! $c ) {
			continue;
		}
		$names[ $c['id'] ] = $c['name'];
		$arch  = 'archive' === $c['list'];
		$notes = array();
		foreach ( array_slice( $c['notes'], 0, $arch ? 1 : 6 ) as $n ) {
			$notes[] = substr( (string) ( $n['date'] ?? '' ), 0, 10 ) . ': ' . $cut( $n['text'] ?? '', 260 );
		}
		$pays = array();
		foreach ( $c['payments'] as $x ) {
			$pays[] = trim( ( $x['date'] ?? '' ) . ' $' . ( $x['amount'] ?? '' ) . ' ' . ( $x['source'] ?? '' ) . ( ( $x['status'] ?? 'paid' ) !== 'paid' ? ' [' . $x['status'] . ']' : '' ) );
		}
		$k       = $c['client'] ? dwdc_client( $c['client'] ) : null;
		$items[] = $clean( array(
			'id'          => $c['id'],
			'project'     => $c['name'],
			'list'        => $c['list'],
			'lead_stage'  => 'leads' === $c['list'] ? ( $c['stage'] ?: 'new' ) : null,
			'onboarding'  => ( 'onboarding' === $c['stage'] && 'leads' !== $c['list'] ) ? 'waiting on onboarding form' : null,
			'onboarded'   => $c['onboarded'] ? substr( $c['onboarded'], 0, 10 ) : null,
			'client'      => $k ? $k['name'] : null,
			'person'      => $c['person'],
			'email'       => $c['email'],
			'phone'       => $c['phone'],
			'company'     => $c['company'],
			'website'     => $c['website'],
			'job'         => $cut( $c['job'], 200 ),
			'next_step'   => $c['next'],
			'followup'    => $c['followup'],
			'deadline'    => $c['deadline'],
			'price'       => $c['price'],
			'owed'        => $c['balance'],
			'owed_label'  => $c['pending'] ? 'Pending (paid in Upwork, not deposited yet)' : null,
			'pay_method'  => $c['pay_method'],
			'lead_source' => $c['lead_source'],
			'markup_link' => $c['markup'],
			'markup_sent' => $c['markup_sent'],
			'hosting_yr'  => $c['hosting'],
			'renewal'     => $c['renewal'],
			'created'     => substr( $c['created'], 0, 10 ),
			'completed'   => $c['completed'],
			'contacts'    => array_map( function ( $x ) { return trim( implode( ' · ', array_filter( array( $x['name'] ?? '', $x['role'] ?? '', $x['email'] ?? '', $x['phone'] ?? '' ) ) ) ); }, $c['contacts'] ),
			'payments'    => $arch ? null : $pays,
			'recent_notes_and_actions' => $notes,
		) );
	}
	$open = array();
	$done = array();
	$since = gmdate( 'Y-m-d', strtotime( '-45 days' ) );
	foreach ( get_posts( array( 'post_type' => DWDC_TASK, 'post_status' => 'private', 'posts_per_page' => -1 ) ) as $t ) {
		$t   = dwdc_task( $t );
		$row = $clean( array( 'todo' => $cut( $t['text'], 200 ), 'project' => $t['contact'] ? ( $names[ $t['contact'] ] ?? null ) : null, 'due' => $t['due'] ) );
		if ( ! $t['done'] ) {
			$open[] = $row;
		} elseif ( substr( $t['done_at'], 0, 10 ) >= $since ) {
			$row['done'] = substr( $t['done_at'], 0, 10 );
			$done[]      = $row;
		}
	}
	$clients = array();
	foreach ( get_posts( array( 'post_type' => DWDC_CLIENT, 'post_status' => 'private', 'posts_per_page' => -1 ) ) as $p ) {
		$k         = dwdc_client( $p );
		$clients[] = $clean( array( 'name' => $k['name'], 'email' => $k['email'], 'phone' => $k['phone'], 'company' => $k['company'], 'review_request_sent' => $k['review_sent'], 'notes' => $cut( $k['notes'], 200 ) ) );
	}
	return array(
		'workflow' => array(
			'Dream Desk is Michael\'s CRM inside his WordPress site. Every job is a "project" record with a list: leads, active, hold (on hold), limbo (waiting on client), complete, archive.',
			'Leads have a stage: new, contacted, active (won), lost. From a lead he can send the onboarding form; when the client submits it the answers attach to the project and it shows as onboarded.',
			'Active projects go: onboarding form → build → Markup review (a markup.io link emailed to the client for feedback, markup_sent is when) → Mark complete. Completed clients can be sent a Google review request from Get Reviews.',
			'Money: price is the project total, owed is the remaining balance. "Pending" on the Owed list means the client paid in Upwork but it has not been deposited yet (Upwork keeps a 10% fee). Clicking Paid logs a payment and clears owed. Payments come from Upwork, Stripe, PayPal or hand-logged (Zelle, check).',
			'Hosting clients pay a yearly hosting fee (hosting_yr) with a renewal date. To-dos can belong to a project or stand alone, with optional due dates.',
			'recent_notes_and_actions are the newest notes on each project, including automatic logs of actions taken (emails sent, payments logged or removed, forms sent). Use them to answer "what did I last do / say" questions.',
		),
		'projects_and_leads' => $items,
		'open_todos'         => $open,
		'todos_done_last_45_days' => $done,
		'clients'            => $clients,
		'money_summary'      => array_intersect_key( dwdc_ai_context(), array_flip( array( 'monthly_received_by_source', 'upwork_connects_costs_by_year', 'notes' ) ) ),
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
		$desk = 'desk' === $r->get_param( 'scope' );
		if ( $desk && ! $personal ) {
			$system = array( array(
				'type' => 'text',
				'text' => "You are the assistant built into Dream Desk, the private CRM and business dashboard of Michael Tarr (Dream Web Digital, websites and hosting for small businesses). Michael asks quick questions about anything in it: how the workflow works, clients, leads, projects, amounts owed and paid, to-dos, and what was done or noted before. Answer only from the data below; today is " . current_time( 'l, F j, Y' ) . ". Lead with the direct answer (names, dates, dollar amounts rounded to the nearest dollar), then add a line of context only when it helps. Keep it short; use a short bullet list when listing several items. When a project is relevant, name it exactly as it appears. If the data can't answer the question, say so plainly and say where in Dream Desk he could check. Never invent clients, amounts or events. You can't change anything; if he asks you to, tell him where to do it in Dream Desk.\n\nDATA (JSON):\n" . wp_json_encode( dwdc_ai_desk_context() ),
				'cache_control' => array( 'type' => 'ephemeral' ),
			) );
		} else
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
