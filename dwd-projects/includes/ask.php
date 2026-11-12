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
			if ( in_array( $st, array( 'open', 'void', 'draft', 'failed', 'uncollectible', 'held' ), true ) ) {
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
		'upwork_connects_costs_by_year' => function_exists( 'dwdc_costs_by_year' ) ? array_map( function ( $o ) { $o['connects_by_month'] = array_combine( array( 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ), $o['m'] ); $o['connects_bought_by_month'] = array_combine( array( 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ), $o['mq'] ); unset( $o['m'], $o['mq'] ); return $o; }, dwdc_costs_by_year() ) : array(),
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
		$row = $clean( array( 'todo_id' => $t['id'], 'todo' => $cut( $t['text'], 200 ), 'project' => $t['contact'] ? ( $names[ $t['contact'] ] ?? null ) : null, 'due' => $t['due'] ) );
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

/** Actions the Ask Dream Desk assistant can take when Michael asks. */
function dwdc_ai_tools() {
	$s = function ( $d ) { return array( 'type' => 'string', 'description' => $d ); };
	$n = function ( $d ) { return array( 'type' => 'number', 'description' => $d ); };
	$i = function ( $d ) { return array( 'type' => 'integer', 'description' => $d ); };
	return array(
		array( 'name' => 'add_connects_purchase', 'description' => 'Record an Upwork Connects purchase (or Upwork membership charge) in the Connects spending totals.', 'input_schema' => array( 'type' => 'object', 'properties' => array( 'amount' => $n( 'Dollars spent' ), 'date' => $s( 'YYYY-MM-DD, default today' ), 'qty' => $i( 'Number of Connects bought, if known' ), 'type' => array( 'type' => 'string', 'enum' => array( 'connects', 'membership' ) ) ), 'required' => array( 'amount' ) ) ),
		array( 'name' => 'log_payment', 'description' => 'Log a payment received on a project. Lowers what is owed and counts toward money made.', 'input_schema' => array( 'type' => 'object', 'properties' => array( 'project_id' => $i( 'Project id' ), 'amount' => $n( 'Dollars received' ), 'method' => array( 'type' => 'string', 'enum' => array( 'Upwork', 'Stripe', 'PayPal', 'Zelle', 'Check', 'Cash', 'Other' ) ), 'date' => $s( 'YYYY-MM-DD, default today' ), 'note' => $s( 'Optional note' ) ), 'required' => array( 'project_id', 'amount', 'method' ) ) ),
		array( 'name' => 'add_note', 'description' => 'Add a note to a project or lead.', 'input_schema' => array( 'type' => 'object', 'properties' => array( 'project_id' => $i( 'Project id' ), 'text' => $s( 'Note text' ) ), 'required' => array( 'project_id', 'text' ) ) ),
		array( 'name' => 'add_todo', 'description' => 'Add a to-do, optionally tied to a project, optionally with a due date.', 'input_schema' => array( 'type' => 'object', 'properties' => array( 'text' => $s( 'To-do text' ), 'project_id' => $i( 'Project id, or 0 for none' ), 'due' => $s( 'YYYY-MM-DD or empty' ) ), 'required' => array( 'text' ) ) ),
		array( 'name' => 'update_todo', 'description' => 'Mark a to-do done or not done, change its text or due date.', 'input_schema' => array( 'type' => 'object', 'properties' => array( 'todo_id' => $i( 'To-do id' ), 'done' => array( 'type' => 'boolean' ), 'text' => $s( 'New text' ), 'due' => $s( 'YYYY-MM-DD, or empty string to clear' ) ), 'required' => array( 'todo_id' ) ) ),
		array( 'name' => 'update_project', 'description' => 'Change fields on a project or lead. list: leads, active, hold, limbo, complete, archive. stage (leads): new, contacted, lost. Dates YYYY-MM-DD. Money as plain numbers. pending "1" marks owed money as paid in Upwork but not deposited, "" clears it.', 'input_schema' => array( 'type' => 'object', 'properties' => array( 'project_id' => $i( 'Project id' ), 'fields' => array( 'type' => 'object', 'description' => 'Only the fields to change', 'properties' => array( 'name' => $s( 'Project name' ), 'list' => $s( 'list' ), 'stage' => $s( 'lead stage' ), 'followup' => $s( 'follow-up date' ), 'deadline' => $s( 'deadline' ), 'next' => $s( 'next step' ), 'price' => $s( 'project total' ), 'balance' => $s( 'amount still owed' ), 'pending' => $s( '"1" or ""' ), 'person' => $s( 'contact person' ), 'email' => $s( 'email' ), 'phone' => $s( 'phone' ), 'company' => $s( 'company' ), 'website' => $s( 'website' ), 'lead_source' => $s( 'where the lead came from' ), 'pay_method' => $s( 'how they pay' ), 'job' => $s( 'job description' ), 'hosting' => $s( 'yearly hosting fee' ), 'renewal' => $s( 'hosting renewal date' ) ), 'additionalProperties' => false ) ), 'required' => array( 'project_id', 'fields' ) ) ),
		array( 'name' => 'create_lead', 'description' => 'Create a new lead.', 'input_schema' => array( 'type' => 'object', 'properties' => array( 'name' => $s( 'Lead / project name' ), 'person' => $s( 'Contact person' ), 'email' => $s( 'Email' ), 'phone' => $s( 'Phone' ), 'company' => $s( 'Company' ), 'price' => $s( 'Estimated price' ), 'lead_source' => $s( 'Source, e.g. Upwork Proposal, Referral, Google Ads' ), 'followup' => $s( 'Follow-up date YYYY-MM-DD' ), 'job' => $s( 'What they need' ) ), 'required' => array( 'name' ) ) ),
	);
}

/** Run one assistant action. Returns a short result string for the model. */
function dwdc_ai_run_tool( $name, $in ) {
	$in   = (array) $in;
	$rest = function ( $method, $route, $body ) {
		$q = new WP_REST_Request( $method, '/dwd/v1/crm' . $route );
		$q->set_header( 'content-type', 'application/json' );
		$q->set_body( wp_json_encode( $body ) );
		$q->set_body_params( $body );
		$res = rest_do_request( $q );
		if ( $res->is_error() ) {
			return new WP_Error( 'x', $res->as_error()->get_error_message() );
		}
		return $res->get_data();
	};
	$proj = function ( $id ) {
		$id = (int) $id;
		return $id && DWDC_CONTACT === get_post_type( $id ) ? $id : 0;
	};
	$date = function ( $d ) { return preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) $d ) ? $d : current_time( 'Y-m-d' ); };
	switch ( $name ) {
		case 'add_connects_purchase':
			$amt = round( (float) ( $in['amount'] ?? 0 ), 2 );
			if ( $amt <= 0 ) {
				return 'Error: amount must be more than 0.';
			}
			$costs   = (array) get_option( 'dwdc_upwork_costs', array() );
			$costs[] = array( 'date' => $date( $in['date'] ?? '' ), 'amount' => $amt, 'type' => 'membership' === ( $in['type'] ?? '' ) ? 'membership' : 'connects', 'qty' => absint( $in['qty'] ?? 0 ), 'ref' => 'manual' );
			update_option( 'dwdc_upwork_costs', $costs, false );
			return 'OK: $' . $amt . ' ' . ( 'membership' === ( $in['type'] ?? '' ) ? 'membership charge' : 'Connects purchase' ) . ' recorded for ' . $date( $in['date'] ?? '' ) . '.';
		case 'log_payment':
			$id = $proj( $in['project_id'] ?? 0 );
			if ( ! $id ) {
				return 'Error: no project with that id.';
			}
			$r = $rest( 'POST', '/contact/' . $id . '/payment', array( 'amount' => $in['amount'] ?? 0, 'method' => $in['method'] ?? 'Other', 'date' => $date( $in['date'] ?? '' ), 'note' => (string) ( $in['note'] ?? '' ) ) );
			return is_wp_error( $r ) ? 'Error: ' . $r->get_error_message() : 'OK: payment logged on ' . $r['name'] . '. Owed now: ' . ( $r['balance'] ?: '0' ) . '.';
		case 'add_note':
			$id = $proj( $in['project_id'] ?? 0 );
			if ( ! $id || '' === trim( (string) ( $in['text'] ?? '' ) ) ) {
				return 'Error: need a valid project id and note text.';
			}
			$r = $rest( 'POST', '/contact/' . $id . '/note', array( 'text' => (string) $in['text'] ) );
			return is_wp_error( $r ) ? 'Error: ' . $r->get_error_message() : 'OK: note added to ' . $r['name'] . '.';
		case 'add_todo':
			$pid = $proj( $in['project_id'] ?? 0 );
			$r   = $rest( 'POST', '/task', array( 'text' => (string) ( $in['text'] ?? '' ), 'contact' => $pid, 'due' => preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) ( $in['due'] ?? '' ) ) ? $in['due'] : '' ) );
			return is_wp_error( $r ) || empty( $r['id'] ) ? 'Error: couldn’t add the to-do.' : 'OK: to-do #' . $r['id'] . ' added' . ( $pid ? ' to ' . get_the_title( $pid ) : '' ) . ( $r['due'] ? ', due ' . $r['due'] : '' ) . '.';
		case 'update_todo':
			$tid = (int) ( $in['todo_id'] ?? 0 );
			if ( ! $tid || DWDC_TASK !== get_post_type( $tid ) ) {
				return 'Error: no to-do with that id.';
			}
			$body = array_intersect_key( $in, array_flip( array( 'done', 'text', 'due' ) ) );
			$r    = $rest( 'POST', '/task/' . $tid, $body );
			return is_wp_error( $r ) ? 'Error: ' . $r->get_error_message() : 'OK: to-do updated (' . $r['text'] . ( $r['done'] ? ', done' : '' ) . ( $r['due'] ? ', due ' . $r['due'] : '' ) . ').';
		case 'update_project':
			$id = $proj( $in['project_id'] ?? 0 );
			if ( ! $id ) {
				return 'Error: no project with that id.';
			}
			$ok = array( 'name', 'list', 'stage', 'followup', 'deadline', 'next', 'price', 'balance', 'pending', 'person', 'email', 'phone', 'company', 'website', 'lead_source', 'pay_method', 'job', 'hosting', 'renewal' );
			$f  = array_map( 'strval', array_intersect_key( (array) ( $in['fields'] ?? array() ), array_flip( $ok ) ) );
			if ( isset( $f['list'] ) && ! in_array( $f['list'], array( 'leads', 'active', 'hold', 'limbo', 'complete', 'archive' ), true ) ) {
				return 'Error: list must be leads, active, hold, limbo, complete or archive.';
			}
			if ( ! $f ) {
				return 'Error: nothing to change.';
			}
			$r = $rest( 'POST', '/contact/' . $id, $f );
			return is_wp_error( $r ) ? 'Error: ' . $r->get_error_message() : 'OK: updated ' . $r['name'] . ' (' . implode( ', ', array_map( function ( $k, $v ) { return $k . ' = ' . ( '' === $v ? '(cleared)' : $v ); }, array_keys( $f ), $f ) ) . ').';
		case 'create_lead':
			$d         = array_map( 'strval', array_intersect_key( $in, array_flip( array( 'name', 'person', 'email', 'phone', 'company', 'price', 'lead_source', 'followup', 'job' ) ) ) );
			$d['list'] = 'leads';
			$d['stage'] = 'new';
			$d['source'] = 'Added by Ask Dream Desk';
			$r = $rest( 'POST', '/contact', $d );
			return is_wp_error( $r ) ? 'Error: ' . $r->get_error_message() : 'OK: lead "' . $r['name'] . '" created (id ' . $r['id'] . ').';
	}
	return 'Error: unknown action.';
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
		$claude = 'claude' === $r->get_param( 'scope' ); // the full-page Claude in Dream Desk: anything, plus the business data
		$msgs   = array();
		foreach ( array_slice( (array) $r->get_param( 'messages' ), $claude ? -30 : -12 ) as $m ) {
			$m    = (array) $m;
			$role = 'assistant' === ( $m['role'] ?? '' ) ? 'assistant' : 'user';
			$text = trim( wp_strip_all_tags( (string) ( $m['content'] ?? '' ) ) );
			if ( '' !== $text ) {
				$msgs[] = array( 'role' => $role, 'content' => mb_substr( $text, 0, $claude ? 16000 : 4000 ) );
			}
		}
		if ( ! $msgs || 'user' !== end( $msgs )['role'] ) {
			return new WP_Error( 'dwdc_ask', 'Ask a question.', array( 'status' => 400 ) );
		}
		while ( $msgs && 'user' !== $msgs[0]['role'] ) {
			array_shift( $msgs );
		}

		$personal = 'personal' === $r->get_param( 'scope' ) && function_exists( 'dwdbk_ai_context' );
		$desk = 'desk' === $r->get_param( 'scope' ) || $claude;
		if ( $claude ) {
			$system = array( array(
				'type' => 'text',
				'text' => "You are Claude, built into Dream Desk, the private CRM and business dashboard of Michael Tarr (Dream Web Digital: custom WordPress and Webflow websites and hosting for small businesses, based in Stuart, Florida). Michael uses this page like the Claude app: ask anything. Help with general questions, web design and development, WordPress, Elementor, SEO, writing emails, quotes and proposals in his voice, pricing ideas, and research. Use web search for anything current or that you aren't sure of, and mention where the information came from. You also have his Dream Desk data below, so you can answer questions about his clients, leads, projects, money and to-dos; name projects exactly as they appear and never invent clients, amounts or events. You can make changes with your tools when he asks (log Connects purchases, log payments, add notes and to-dos, check off or reschedule to-dos, update project and lead fields, create leads); just do it with the right tool, then confirm in a line or two what changed, and only say it was done if the tool returned OK. You can't delete anything or send emails; say where in Dream Desk to do that. Today is " . current_time( 'l, F j, Y' ) . ". Write in plain, friendly English. Lead with the answer. Use short paragraphs, **bold** for key points, and bullet or numbered lists where they help.\n\nDREAM DESK DATA (JSON):\n" . wp_json_encode( dwdc_ai_desk_context() ),
				'cache_control' => array( 'type' => 'ephemeral' ),
			) );
		} elseif ( $desk && ! $personal ) {
			$system = array( array(
				'type' => 'text',
				'text' => "You are the assistant built into Dream Desk, the private CRM and business dashboard of Michael Tarr (Dream Web Digital, websites and hosting for small businesses). Michael asks quick questions about anything in it: how the workflow works, clients, leads, projects, amounts owed and paid, to-dos, and what was done or noted before. Answer only from the data below; today is " . current_time( 'l, F j, Y' ) . ". Lead with the direct answer (names, dates, dollar amounts rounded to the nearest dollar), then add a line of context only when it helps. Keep it short; use a short bullet list when listing several items. When a project is relevant, name it exactly as it appears. If the data can't answer the question, say so plainly and say where in Dream Desk he could check. Never invent clients, amounts or events. You can also make changes with your tools when he asks (log Connects purchases, log payments, add notes and to-dos, check off or reschedule to-dos, update project and lead fields, create leads). When he asks for a change, just do it with the right tool, no need to ask permission first; only ask a short question if it's genuinely unclear which project he means or a required amount is missing. Use the ids from the data. After acting, confirm in one or two lines exactly what changed (and new totals when relevant). Only say something was done if the tool returned OK. You can't delete anything or send emails; for those, tell him where in Dream Desk to do it.\n\nDATA (JSON):\n" . wp_json_encode( dwdc_ai_desk_context() ),
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
		$changed = false;
		for ( $turn = 0; $turn < 8; $turn++ ) {
			$req = array(
				'model'         => 'claude-opus-5-5',
				'max_tokens'    => 16000,
				'output_config' => array( 'effort' => 'medium' ),
				'fallbacks'     => 'default',
				'system'        => $system,
				'messages'      => $msgs,
			);
			if ( ! empty( $desk ) && ! $personal ) {
				$req['tools'] = dwdc_ai_tools();
			}
			if ( $claude ) {
				$req['tools'][] = array( 'type' => 'web_search_20260209', 'name' => 'web_search', 'max_uses' => 5 );
			}
			$res = wp_remote_post( 'https://api.anthropic.com/v1/messages', array(
				'timeout' => $claude ? 150 : 90,
				'headers' => array(
					'x-api-key'         => $key,
					'anthropic-version' => '2026-10-21',
					'anthropic-beta'    => 'server-side-fallback-2026-07-01',
					'content-type'      => 'application/json',
				),
				'body'    => wp_json_encode( $req ),
			) );
			if ( is_wp_error( $res ) ) {
				return new WP_Error( 'dwdc_ai', 'Couldn’t reach Claude: ' . $res->get_error_message(), array( 'status' => 502 ) );
			}
			$code = wp_remote_retrieve_response_code( $res );
			$body = json_decode( wp_remote_retrieve_body( $res ), true );
			if ( 200 !== $code ) {
				$msg = $body['error']['message'] ?? 'Claude returned an error.';
				if ( 401 === $code ) {
					return new WP_Error( 'dwdc_ai', 'Your Claude API key was rejected. Paste a new one.', array( 'status' => 400, 'needs_key' => true ) );
				}
				return new WP_Error( 'dwdc_ai', $msg, array( 'status' => 502 ) );
			}
			if ( 'refusal' === ( $body['stop_reason'] ?? '' ) ) {
				return array( 'answer' => 'I can’t answer that one. Try asking it a different way.', 'changed' => $changed );
			}
			if ( 'pause_turn' === ( $body['stop_reason'] ?? '' ) ) { // a long web search: let Claude carry on where it paused
				$msgs[] = array( 'role' => 'assistant', 'content' => $body['content'] );
				continue;
			}
			if ( 'tool_use' !== ( $body['stop_reason'] ?? '' ) ) {
				break;
			}
			$msgs[]  = array( 'role' => 'assistant', 'content' => $body['content'] );
			$results = array();
			foreach ( (array) $body['content'] as $b ) {
				if ( 'tool_use' === ( $b['type'] ?? '' ) ) {
					$out       = dwdc_ai_run_tool( (string) $b['name'], $b['input'] ?? array() );
					$changed   = $changed || 0 === strpos( $out, 'OK' );
					$results[] = array( 'type' => 'tool_result', 'tool_use_id' => $b['id'], 'content' => $out, 'is_error' => 0 !== strpos( $out, 'OK' ) );
				}
			}
			$msgs[] = array( 'role' => 'user', 'content' => $results );
		}
		$text = '';
		foreach ( (array) ( $body['content'] ?? array() ) as $b ) {
			if ( 'text' === ( $b['type'] ?? '' ) ) {
				$text .= $b['text'];
			}
		}
		return array( 'answer' => trim( $text ) ?: ( $changed ? 'Done.' : 'I didn’t get an answer back. Try again.' ), 'changed' => $changed );
	} ) );
} );
