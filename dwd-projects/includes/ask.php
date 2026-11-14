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
		$clients[] = $clean( array( 'client_id' => $k['id'], 'name' => $k['name'], 'email' => $k['email'], 'phone' => $k['phone'], 'company' => $k['company'], 'review_request_sent' => $k['review_sent'], 'notes' => $cut( $k['notes'], 200 ) ) );
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

/** Read tools: let the assistant look up anything in Dream Desk in full (the context above is only a summary). */
function dwdc_ai_read_tools() {
	$s = function ( $d ) { return array( 'type' => 'string', 'description' => $d ); };
	$i = function ( $d ) { return array( 'type' => 'integer', 'description' => $d ); };
	return array(
		array( 'name' => 'get_project_details', 'description' => 'Everything Dream Desk holds on one project or lead: all fields, every onboarding/form answer in full, all notes, every payment, to-dos, staging and Markup links, uploaded assets, files in the client\'s Google Drive folder, and how many emails there are. Use it for any detailed question about a project.', 'input_schema' => array( 'type' => 'object', 'properties' => array( 'project_id' => $i( 'Project id' ) ), 'required' => array( 'project_id' ) ) ),
		array( 'name' => 'get_client_details', 'description' => 'Everything on one client record (contact details, notes, hosting, review request) and the ids of their projects.', 'input_schema' => array( 'type' => 'object', 'properties' => array( 'client_id' => $i( 'Client id' ) ), 'required' => array( 'client_id' ) ) ),
		array( 'name' => 'get_emails', 'description' => 'Emails exchanged with clients (synced from Gmail), newest first, with their text. Give a project_id or client_id to read one client\'s emails, a search phrase to search every client\'s emails, or unread_only for emails that have not been opened yet. With nothing set it returns the newest emails across all clients.', 'input_schema' => array( 'type' => 'object', 'properties' => array( 'project_id' => $i( 'Project id (optional)' ), 'client_id' => $i( 'Client id (optional)' ), 'search' => $s( 'Words to look for in the sender, subject or text (optional)' ), 'unread_only' => array( 'type' => 'boolean' ), 'limit' => $i( 'How many to return, 1 to 40 (default 15)' ) ) ) ),
		array( 'name' => 'get_dashboard_data', 'description' => 'Other parts of Dream Desk. section: upwork_balances (pending and available in Upwork, and each pending payment), google_ads (the Google Ads account as synced every hour: spend, clicks, impressions and conversions for each of the last ~75 days, and this month\'s campaigns with status, daily budget, spend and results), bank (bank balances, spending summary, monthly ad spend), spending_insights (the Money > Suggestions page: last 12 months of spending by category and merchant, habits and what stopping them would save in a year, every person paid by Zelle with totals, repeating charges, biggest purchases, month by month), meetings (upcoming and recent meetings), personal (personal money log and bills; for calendar items use get_calendar).', 'input_schema' => array( 'type' => 'object', 'properties' => array( 'section' => array( 'type' => 'string', 'enum' => array( 'upwork_balances', 'google_ads', 'bank', 'spending_insights', 'meetings', 'personal' ) ) ), 'required' => array( 'section' ) ) ),
		array( 'name' => 'get_calendar', 'description' => 'Michael\'s calendar, work and personal together, for a date range: Google Calendar events from both his work and personal Google accounts, Google Tasks, reminders and personal to-dos, birthdays that are on his calendars, work meetings (with Zoom/Meet links), and business to-dos with due dates. Defaults to today through the next 30 days. Use it for anything about his schedule: what is on a day, when something is, what is coming up, what is overdue.', 'input_schema' => array( 'type' => 'object', 'properties' => array( 'from' => $s( 'First day, YYYY-MM-DD (default today)' ), 'to' => $s( 'Last day, YYYY-MM-DD (default 30 days after from)' ), 'search' => $s( 'Only items containing these words (optional)' ), 'include_done' => array( 'type' => 'boolean' ) ) ) ),
	);
}

/** Never hand keys, tokens or setup scripts to the model. */
function dwdc_ai_scrub( $v, $depth = 0 ) {
	if ( ! is_array( $v ) || $depth > 12 ) {
		return is_object( $v ) ? dwdc_ai_scrub( (array) $v, $depth + 1 ) : $v;
	}
	$out = array();
	foreach ( $v as $k => $x ) {
		if ( is_string( $k ) && preg_match( '/token|secret|passw|api_?key|^key$|authorization|script|nonce/i', $k ) ) {
			continue;
		}
		$out[ $k ] = dwdc_ai_scrub( $x, $depth + 1 );
	}
	return $out;
}

/** Form answers that are passwords stay in Dream Desk: the assistant is told one was given, not what it is. */
function dwdc_ai_hide_passwords( $v, $depth = 0 ) {
	if ( ! is_array( $v ) || $depth > 12 ) {
		return $v;
	}
	if ( isset( $v['value'] ) && is_string( $v['value'] ) && '' !== $v['value'] && preg_match( '/passw|pass code|passcode|\\bpwd\\b|\\bpin\\b/i', (string) ( $v['label'] ?? $v['id'] ?? '' ) ) ) {
		$v['value'] = '(a password was given; it is only shown on the project page)';
	}
	foreach ( $v as $k => $x ) {
		$v[ $k ] = dwdc_ai_hide_passwords( $x, $depth + 1 );
	}
	return $v;
}

/** JSON for the model, cut to a sensible size. */
function dwdc_ai_data( $v, $max = 60000 ) {
	$j = (string) wp_json_encode( dwdc_ai_scrub( $v ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
	return 'DATA: ' . ( strlen( $j ) > $max ? mb_strcut( $j, 0, $max ) . ' …(cut: ask for something narrower to see the rest)' : $j );
}

/** One read tool. Returns "DATA: …" or "Error: …". */
function dwdc_ai_read( $name, $in ) {
	$proj = function ( $id ) {
		$id = (int) $id;
		return $id && DWDC_CONTACT === get_post_type( $id ) ? $id : 0;
	};
	switch ( $name ) {
		case 'get_project_details':
			$id = $proj( $in['project_id'] ?? 0 );
			if ( ! $id ) {
				return 'Error: no project with that id.';
			}
			$c = dwdc_contact( $id, true );
			if ( ! is_array( $c ) ) {
				return 'Error: that project could not be read.';
			}
			if ( function_exists( 'dwddr_files' ) && ! empty( $c['drive'] ) ) {
				$c['drive_folder_files'] = dwddr_files( $id );
			}
			foreach ( array( '_dwdc_entries', '_dwdc_notes', '_dwdc_payments' ) as $mk ) { // the full lists, in case the page view shortens them
				$mv = get_post_meta( $id, $mk, true );
				if ( is_array( $mv ) && $mv ) {
					$c[ 'all' . substr( $mk, 5 ) ] = $mv;
				}
			}
			return dwdc_ai_data( dwdc_ai_hide_passwords( $c ), 90000 );
		case 'get_client_details':
			$kid = (int) ( $in['client_id'] ?? 0 );
			if ( ! $kid || DWDC_CLIENT !== get_post_type( $kid ) ) {
				return 'Error: no client with that id.';
			}
			$k        = dwdc_client( get_post( $kid ) );
			$projects = array();
			foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdc_client', 'meta_value' => $kid ) ) as $pid ) {
				$projects[] = array( 'project_id' => (int) $pid, 'name' => html_entity_decode( (string) get_the_title( $pid ), ENT_QUOTES, 'UTF-8' ) );
			}
			return dwdc_ai_data( array( 'client' => $k, 'projects' => $projects ) );
		case 'get_emails':
			if ( ! function_exists( 'dwdcm_get' ) ) {
				return 'Error: client emails are not set up.';
			}
			$owners = array();
			if ( ! empty( $in['project_id'] ) && $proj( $in['project_id'] ) ) {
				$owners[] = (int) dwdcm_owner( $proj( $in['project_id'] ) );
			} elseif ( ! empty( $in['client_id'] ) && DWDC_CLIENT === get_post_type( (int) $in['client_id'] ) ) {
				$owners[] = (int) $in['client_id'];
			} else {
				$owners = get_posts( array( 'post_type' => array( DWDC_CLIENT, DWDC_CONTACT ), 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdcm_mail' ) );
			}
			$q     = strtolower( trim( (string) ( $in['search'] ?? '' ) ) );
			$limit = max( 1, min( 40, (int) ( $in['limit'] ?? 15 ) ) );
			$rows  = array();
			foreach ( $owners as $o ) {
				$who = html_entity_decode( (string) get_the_title( $o ), ENT_QUOTES, 'UTF-8' );
				foreach ( (array) get_post_meta( $o, '_dwdcm_mail', true ) as $x ) {
					if ( ! is_array( $x ) ) {
						continue;
					}
					$new = dwdcm_is_new( $x );
					if ( ! empty( $in['unread_only'] ) && ! ( $new && ! empty( $x['in'] ) ) ) {
						continue;
					}
					if ( '' !== $q && false === strpos( strtolower( ( $x['from'] ?? '' ) . ' ' . ( $x['to'] ?? '' ) . ' ' . ( $x['subject'] ?? '' ) . ' ' . ( $x['body'] ?? '' ) ), $q ) ) {
						continue;
					}
					$body   = trim( (string) preg_replace( '/[ \t]+/', ' ', (string) ( $x['body'] ?? '' ) ) );
					$rows[] = array(
						'client_or_project' => $who,
						'owner_id'          => (int) $o,
						'direction'         => ! empty( $x['in'] ) ? 'received from client' : 'sent by Michael',
						'date'              => (string) ( $x['date'] ?? '' ),
						'from'              => (string) ( $x['from'] ?? '' ),
						'to'                => (string) ( $x['to'] ?? '' ),
						'subject'           => (string) ( $x['subject'] ?? '' ),
						'unread'            => $new && ! empty( $x['in'] ),
						'text'              => mb_strlen( $body ) > 3000 ? mb_substr( $body, 0, 3000 ) . '…' : $body,
					);
				}
			}
			usort( $rows, function ( $a, $b ) { return strtotime( $b['date'] ) <=> strtotime( $a['date'] ); } );
			return dwdc_ai_data( array( 'found' => count( $rows ), 'showing' => min( $limit, count( $rows ) ), 'last_gmail_sync' => (string) get_option( 'dwdcm_last', '' ), 'emails' => array_slice( $rows, 0, $limit ) ), 90000 );
		case 'get_calendar':
			$ok   = function ( $d ) { return preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) $d ); };
			$from = $ok( $in['from'] ?? '' ) ? (string) $in['from'] : current_time( 'Y-m-d' );
			$to   = $ok( $in['to'] ?? '' ) ? (string) $in['to'] : gmdate( 'Y-m-d', strtotime( $from . ' +30 days' ) );
			$q    = strtolower( trim( (string) ( $in['search'] ?? '' ) ) );
			$done = ! empty( $in['include_done'] );
			$cut  = function ( $t, $n ) { $t = trim( (string) preg_replace( '/\s+/', ' ', (string) $t ) ); return mb_strlen( $t ) > $n ? mb_substr( $t, 0, $n ) . '…' : $t; };
			$rows = array();
			if ( function_exists( 'dwdpe_get' ) ) {
				$p = dwdpe_get();
				foreach ( (array) ( $p['todos'] ?? array() ) as $t ) {
					$due = (string) ( $t['due'] ?? '' );
					if ( '' === $due || $due < $from || $due > $to || ( ! $done && ! empty( $t['done'] ) ) ) {
						continue;
					}
					$text = (string) ( $t['text'] ?? '' );
					$bday = 'birthday' === ( $t['tag'] ?? '' ) || false !== stripos( $text, 'birthday' );
					$rows[] = array(
						'date'    => $due,
						'time'    => (string) ( $t['time'] ?? '' ),
						'what'    => $text,
						'kind'    => $bday ? 'birthday' : ( ! empty( $t['gevent'] ) ? 'Google Calendar event' : ( ! empty( $t['gtask'] ) ? 'Google Task' : 'personal to-do / reminder' ) ),
						'account' => (string) ( $t['gacct'] ?? '' ),
						'tag'     => (string) ( $t['tag'] ?? '' ),
						'details' => $cut( $t['note'] ?? '', 300 ),
						'done'    => ! empty( $t['done'] ),
					);
				}
			}
			if ( function_exists( 'dwdmt_summary' ) ) {
				$m = dwdmt_summary();
				foreach ( (array) ( $m['list'] ?? array() ) as $x ) {
					$d = (string) ( $x['date'] ?? '' );
					if ( '' === $d || $d < $from || $d > $to ) {
						continue;
					}
					$rows[] = array(
						'date'    => $d,
						'time'    => (string) ( $x['time'] ?? '' ),
						'what'    => (string) ( $x['title'] ?? $x['name'] ?? $x['summary'] ?? 'Meeting' ),
						'kind'    => 'work meeting' . ( ! empty( $x['kind'] ) ? ' (' . $x['kind'] . ')' : '' ),
						'account' => 'work calendar',
						'details' => $cut( ( $x['with'] ?? '' ) . ' ' . ( $x['link'] ?? '' ), 300 ),
						'done'    => false,
					);
				}
			}
			foreach ( get_posts( array( 'post_type' => DWDC_TASK, 'post_status' => 'private', 'posts_per_page' => -1 ) ) as $tp ) {
				$t = dwdc_task( $tp );
				if ( ! is_array( $t ) || '' === (string) ( $t['due'] ?? '' ) || $t['due'] < $from || $t['due'] > $to || ( ! $done && ! empty( $t['done'] ) ) ) {
					continue;
				}
				$rows[] = array(
					'date'    => (string) $t['due'],
					'time'    => (string) ( $t['time'] ?? '' ),
					'what'    => (string) $t['text'],
					'kind'    => 'business to-do' . ( ! empty( $t['contact'] ) ? ' for ' . html_entity_decode( (string) get_the_title( (int) $t['contact'] ), ENT_QUOTES, 'UTF-8' ) : '' ),
					'account' => 'Dream Desk',
					'done'    => ! empty( $t['done'] ),
				);
			}
			if ( '' !== $q ) {
				$rows = array_values( array_filter( $rows, function ( $r ) use ( $q ) { return false !== strpos( strtolower( $r['what'] . ' ' . ( $r['details'] ?? '' ) . ' ' . $r['kind'] ), $q ); } ) );
			}
			usort( $rows, function ( $a, $b ) { return strcmp( $a['date'] . ' ' . gmdate( 'H:i', (int) strtotime( '2000-01-01 ' . ( $a['time'] ?: '00:00' ) ) ), $b['date'] . ' ' . gmdate( 'H:i', (int) strtotime( '2000-01-01 ' . ( $b['time'] ?: '00:00' ) ) ) ); } );
			$rows = array_map( function ( $r ) { return array_filter( $r, function ( $v ) { return '' !== $v && false !== $v; } ); }, $rows );
			return dwdc_ai_data( array( 'from' => $from, 'to' => $to, 'today' => current_time( 'Y-m-d' ), 'count' => count( $rows ), 'note' => 'The same meeting can appear twice (once from the personal calendar sync, once as a work meeting): treat same day and time as one. Birthdays only appear if they are on one of the synced Google calendars.', 'items' => array_slice( $rows, 0, 250 ) ), 90000 );
		case 'get_dashboard_data':
			switch ( (string) ( $in['section'] ?? '' ) ) {
				case 'upwork_balances':
					$u = get_option( 'dwd_upwork_snap', array() );
					return is_array( $u ) && $u ? dwdc_ai_data( $u ) : 'DATA: {"note":"No Upwork balances have been saved yet."}';
				case 'google_ads':
					$g = get_option( 'dwdads_data', array() );
					if ( ! is_array( $g ) || empty( $g['at'] ) ) {
						return 'DATA: {"note":"Google Ads has not sent any numbers to Dream Desk yet."}';
					}
					return dwdc_ai_data( array( 'note' => 'Read-only numbers sent by the Google Ads script (last sync is "at"). days: one row per day with cost in dollars, clicks, impr (impressions) and conv (conversions). campaigns: this month so far. Dream Desk does not hold keywords, search terms, ads or the change history; for those Michael asks Claude in the Claude app.', 'google_ads' => $g ), 90000 );
				case 'spending_insights':
					return function_exists( 'dwdbk_insights' ) ? dwdc_ai_data( dwdbk_insights(), 90000 ) : 'Error: bank data is not available.';
				case 'bank':
					if ( ! function_exists( 'dwdbk_summary' ) ) {
						return 'Error: the bank section is not set up.';
					}
					$b             = dwdbk_summary();
					$b['balances'] = function_exists( 'dwdpl_balances' ) ? dwdpl_balances() : null;
					$b['adspend']  = function_exists( 'dwdbk_adspend' ) ? dwdbk_adspend() : null;
					return dwdc_ai_data( $b );
				case 'meetings':
					return function_exists( 'dwdmt_summary' ) ? dwdc_ai_data( dwdmt_summary() ) : 'Error: meetings are not set up.';
				case 'personal':
					return function_exists( 'dwdpe_get' ) ? dwdc_ai_data( dwdpe_get() ) : 'Error: the personal section is not set up.';
			}
			return 'Error: section must be upwork_balances, google_ads, bank, spending_insights, meetings or personal.';
	}
	return 'Error: unknown lookup.';
}

/** Run one assistant action. Returns a short result string for the model. */
function dwdc_ai_run_tool( $name, $in ) {
	$in   = (array) $in;
	if ( in_array( $name, array( 'get_project_details', 'get_client_details', 'get_emails', 'get_dashboard_data', 'get_calendar' ), true ) ) {
		try {
			return dwdc_ai_read( $name, $in );
		} catch ( \Throwable $e ) {
			return 'Error: that could not be read (' . $e->getMessage() . ').';
		}
	}
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
		if ( ! empty( $desk ) && ! $personal ) {
			$system[] = array(
				'type' => 'text',
				'text' => "Looking things up: the data above is a summary. For anything it does not show in full, use the read tools before answering, and never guess: get_project_details (everything on one project: every onboarding and form answer, all notes, every payment, to-dos, staging and Markup links, files in the Assets box and in the client's Google Drive folder), get_client_details, get_emails (the emails exchanged with clients, with their text; filter by project, client, a search phrase, or unread only; use it for 'did an email come in', 'what did X say'), get_calendar (his whole schedule, work and personal: Google Calendar events from both accounts, Google Tasks, reminders, birthdays, meetings and to-dos with due dates, for any date range), and get_dashboard_data (Upwork pending and available balances, the Google Ads account's daily spend, clicks, impressions, conversions and campaigns, bank balances and spending, meetings, personal money and bills). Use the project id or client_id from the data above. Quote figures and wording exactly as the tools return them, and say so plainly when Dream Desk does not have something.",
			);
		}
		$changed = false;
		for ( $turn = 0; $turn < 12; $turn++ ) {
			$req = array(
				'model'         => 'claude-opus-5-5',
				'max_tokens'    => 16000,
				'output_config' => array( 'effort' => 'medium' ),
				'fallbacks'     => 'default',
				'system'        => $system,
				'messages'      => $msgs,
			);
			if ( ! empty( $desk ) && ! $personal ) {
				$req['tools'] = array_merge( dwdc_ai_tools(), dwdc_ai_read_tools() );
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
					$results[] = array( 'type' => 'tool_result', 'tool_use_id' => $b['id'], 'content' => $out, 'is_error' => 0 !== strpos( $out, 'OK' ) && 0 !== strpos( $out, 'DATA' ) );
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
