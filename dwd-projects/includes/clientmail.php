<?php
/**
 * Client emails on the project page.
 *
 * The "Dream Desk · Inbox" Google Apps Script (meetings.php) already posts to Dream Desk every 15 minutes.
 * Its reply now also carries the list of client email addresses; the script then sends back:
 *  - every email from the last 2 days that is from, to or cc one of those addresses, and
 *  - the full history for a few clients per run (a slow backfill, active projects first).
 * Emails are kept on the client (or on the project when it has no client), newest first.
 * Read-only on the Gmail side: the script only reads mail.
 */
defined( 'ABSPATH' ) || exit;

const DWDCM_KEEP = 400; // emails kept per client

/** email (lowercase) => owner post id (the client, or the project when it has no client). */
function dwdcm_map() {
	static $map = null;
	if ( null !== $map ) {
		return $map;
	}
	$map = array();
	$add = function ( $email, $owner ) use ( &$map ) {
		$e = strtolower( trim( (string) $email ) );
		if ( is_email( $e ) && false === stripos( $e, '@dreamwebdigital.com' ) && ! isset( $map[ $e ] ) ) {
			$map[ $e ] = (int) $owner;
		}
	};
	foreach ( get_posts( array( 'post_type' => DWDC_CLIENT, 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $kid ) {
		$add( get_post_meta( $kid, '_dwdcl_email', true ), $kid );
	}
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $pid ) {
		$kid   = (int) get_post_meta( $pid, '_dwdc_client', true );
		$owner = $kid && get_post( $kid ) ? $kid : $pid;
		$add( get_post_meta( $pid, '_dwdc_email', true ), $owner );
		foreach ( (array) get_post_meta( $pid, '_dwdc_contacts', true ) as $x ) {
			if ( is_array( $x ) ) {
				$add( $x['email'] ?? '', $owner );
			}
		}
	}
	return $map;
}

/** The owner whose emails show on this project (its client, or itself). */
function dwdcm_owner( $pid ) {
	$kid = (int) get_post_meta( $pid, '_dwdc_client', true );
	return $kid && get_post( $kid ) ? $kid : (int) $pid;
}

/** Addresses in a From/To/Cc header. */
function dwdcm_addrs( $s ) {
	preg_match_all( '/[A-Z0-9._%+\'-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i', (string) $s, $m );
	return array_unique( array_map( 'strtolower', $m[0] ) );
}

/** Plain body without the quoted earlier emails, so each message reads on its own. */
function dwdcm_clean( $body, $subject = '' ) {
	$b = str_replace( "\r", '', (string) $body );
	if ( ! preg_match( '/^\s*(fw|fwd)\s*:/i', (string) $subject ) ) { // forwards keep the forwarded email; replies drop the quoted thread
		$b = preg_split( '/\n(?:On [^\n]{4,200}?wrote:|-{2,} ?Original Message ?-{2,}|_{10,}\s*\nFrom: |From: [^\n]+\nSent: )/i', $b )[0];
	}
	$b = implode( "\n", array_filter( explode( "\n", $b ), function ( $l ) { return 0 !== strpos( ltrim( $l ), '>' ); } ) );
	return trim( mb_substr( preg_replace( "/\n{3,}/", "\n\n", $b ), 0, 9000 ) );
}

/** File emails onto their clients. Returns how many were new. */
function dwdcm_apply( $messages ) {
	$map   = dwdcm_map();
	$by    = array();
	foreach ( (array) $messages as $m ) {
		if ( ! is_array( $m ) || empty( $m['id'] ) ) {
			continue;
		}
		$from   = dwdcm_addrs( $m['from'] ?? '' );
		$owners = array();
		foreach ( array_merge( $from, dwdcm_addrs( ( $m['to'] ?? '' ) . ' ' . ( $m['cc'] ?? '' ) ) ) as $a ) {
			if ( isset( $map[ $a ] ) ) {
				$owners[ $map[ $a ] ] = 1;
			}
		}
		$inbound = (bool) array_filter( $from, function ( $a ) use ( $map ) { return isset( $map[ $a ] ); } );
		foreach ( array_keys( $owners ) as $o ) {
			$by[ $o ][] = array(
				'id'      => sanitize_text_field( (string) $m['id'] ),
				'thread'  => sanitize_text_field( (string) ( $m['thread'] ?? '' ) ),
				'date'    => sanitize_text_field( (string) ( $m['date'] ?? '' ) ),
				'from'    => sanitize_text_field( strtr( (string) ( $m['from'] ?? '' ), '<>', '()' ) ), // keep the address: <…> would be stripped as a tag
				'to'      => sanitize_text_field( mb_substr( strtr( (string) ( $m['to'] ?? '' ), '<>', '()' ), 0, 400 ) ),
				'subject' => sanitize_text_field( (string) ( $m['subject'] ?? '' ) ),
				'body'    => wp_check_invalid_utf8( dwdcm_clean( $m['body'] ?? '', $m['subject'] ?? '' ), true ), // plain text, kept as written (code snippets too); escaped when shown
				'in'      => $inbound,
				'unread'  => $inbound && ! empty( $m['unread'] ), // unread in Gmail when it was synced
			);
		}
	}
	$new = 0;
	foreach ( $by as $o => $list ) {
		$have = get_post_meta( $o, '_dwdcm_mail', true );
		$have = is_array( $have ) ? $have : array();
		$ids  = array_flip( array_column( $have, 'id' ) );
		foreach ( $list as $x ) {
			if ( isset( $ids[ $x['id'] ] ) ) {
				$x['seen'] = ! empty( $have[ $ids[ $x['id'] ] ]['seen'] ); // keep "opened in Dream Desk"
				$have[ $ids[ $x['id'] ] ] = $x; // already filed: refresh it
				continue;
			}
			$have[] = $x;
			$ids[ $x['id'] ] = count( $have ) - 1;
			++$new;
		}
		usort( $have, function ( $a, $b ) { return strcmp( $b['date'], $a['date'] ); } );
		update_post_meta( $o, '_dwdcm_mail', array_slice( $have, 0, DWDCM_KEEP ) );
	}
	if ( $new && ! wp_next_scheduled( 'dwdqa_run' ) ) {
		wp_schedule_single_event( time() + 10, 'dwdqa_run' ); // sync.php: did a client just answer open questions?
	}
	return $new;
}

/** What the script should fetch next: all client addresses, plus a few to backfill (active work first). */
function dwdcm_plan() {
	$map  = dwdcm_map();
	$done = (array) get_option( 'dwdcm_done', array() );
	$hot  = array();
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdc_list', 'meta_value' => array( 'active', 'hold', 'limbo', 'leads' ), 'meta_compare' => 'IN' ) ) as $pid ) {
		$hot[ dwdcm_owner( $pid ) ] = 1;
	}
	$todo = array_keys( array_filter( $map, function ( $o, $e ) use ( $done ) { return ! isset( $done[ $e ] ); }, ARRAY_FILTER_USE_BOTH ) );
	usort( $todo, function ( $a, $b ) use ( $map, $hot ) { return (int) ! isset( $hot[ $map[ $a ] ] ) - (int) ! isset( $hot[ $map[ $b ] ] ); } );
	return array( 'emails' => array_keys( $map ), 'backfill' => array_slice( $todo, 0, 8 ), 'check' => dwdcm_unread_ids() );
}

/**
 * New = from the client, unread in Gmail, not opened in Dream Desk yet, AND a real recent email:
 * received in the last 7 days, not a calendar reply ("Accepted: …") and not a marketing email
 * (anything with an unsubscribe link). Old unread mail in Gmail never counts as new.
 */
function dwdcm_is_new( $x ) {
	if ( empty( $x['unread'] ) || ! empty( $x['seen'] ) ) {
		return false;
	}
	$t = strtotime( (string) ( $x['date'] ?? '' ) );
	if ( ! $t || $t < time() - 7 * DAY_IN_SECONDS ) {
		return false;
	}
	if ( preg_match( '/^\s*(accepted|declined|tentative(ly accepted)?|invitation|updated invitation|canceled event|cancelled event)\s*:/i', (string) ( $x['subject'] ?? '' ) ) ) {
		return false;
	}
	if ( false !== stripos( (string) ( $x['body'] ?? '' ), 'unsubscribe' ) ) {
		return false;
	}
	return true;
}

/** Emails for a client (owner id): the new ones, the total, and everything when $all. */
function dwdcm_get( $owner, $all = false ) {
	$list = get_post_meta( $owner, '_dwdcm_mail', true );
	$list = is_array( $list ) ? $list : array();
	return array( 'owner' => (int) $owner, 'total' => count( $list ), 'new' => array_values( array_filter( $list, 'dwdcm_is_new' ) ), 'list' => $all ? $list : array(), 'synced' => (string) get_option( 'dwdcm_last', '' ) );
}
function dwdcm_for( $pid, $all = false ) {
	return dwdcm_get( dwdcm_owner( $pid ), $all );
}

/** Update fields on stored emails by id: $changes = array( id => array( field => value ) ). */
function dwdcm_patch( $owner, $changes ) {
	$list = get_post_meta( $owner, '_dwdcm_mail', true );
	if ( ! is_array( $list ) || ! $changes ) {
		return;
	}
	foreach ( $list as $i => $x ) {
		if ( isset( $changes[ $x['id'] ] ) ) {
			$list[ $i ] = array_merge( $x, $changes[ $x['id'] ] );
		}
	}
	update_post_meta( $owner, '_dwdcm_mail', $list );
}

/** Ids of emails still shown as new, so the script can say which have been read in Gmail since. */
function dwdcm_unread_ids() {
	$ids = array();
	foreach ( get_posts( array( 'post_type' => array( DWDC_CLIENT, DWDC_CONTACT ), 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdcm_mail' ) ) as $o ) {
		foreach ( (array) get_post_meta( $o, '_dwdcm_mail', true ) as $x ) {
			if ( is_array( $x ) && dwdcm_is_new( $x ) ) {
				$ids[] = $x['id'];
			}
		}
	}
	return array_slice( $ids, 0, 150 );
}

add_filter( 'dwdc_contact_full', function ( $c, $id ) {
	$c['mail'] = dwdcm_for( $id ); // new emails + total; the rest loads on "Show all"
	return $c;
}, 12, 2 );

add_action( 'rest_api_init', function () {
	$ok = function ( $r ) {
		if ( current_user_can( 'manage_options' ) ) {
			return true;
		}
		$t = (string) $r->get_header( 'x_dwd_token' );
		return '' !== $t && function_exists( 'dwdmt_token' ) && hash_equals( dwdmt_token(), $t );
	};
	// From the Gmail script (or an admin): emails to file, and the addresses whose history is now loaded.
	register_rest_route( 'dwd/v1', '/client-mail', array( 'methods' => 'POST', 'permission_callback' => $ok, 'callback' => function ( $r ) {
		$d   = (array) $r->get_json_params();
		$new = dwdcm_apply( array_slice( (array) ( $d['messages'] ?? array() ), 0, 1500 ) );
		if ( ! empty( $d['done'] ) ) {
			$done = (array) get_option( 'dwdcm_done', array() );
			foreach ( (array) $d['done'] as $e ) {
				$done[ strtolower( sanitize_email( (string) $e ) ) ] = current_time( 'mysql' );
			}
			update_option( 'dwdcm_done', $done, false );
		}
		// Read in Gmail since: { id: still unread? }
		if ( ! empty( $d['state'] ) && is_array( $d['state'] ) ) {
			$read = array();
			foreach ( $d['state'] as $id => $un ) {
				if ( ! $un ) {
					$read[ sanitize_text_field( (string) $id ) ] = array( 'unread' => false );
				}
			}
			if ( $read ) {
				foreach ( get_posts( array( 'post_type' => array( DWDC_CLIENT, DWDC_CONTACT ), 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdcm_mail' ) ) as $o ) {
					dwdcm_patch( $o, $read );
				}
			}
		}
		update_option( 'dwdcm_last', current_time( 'mysql' ), false );
		return array( 'new' => $new );
	} ) );
	$can = function () { return current_user_can( 'edit_posts' ); };
	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/mail', array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function ( $r ) {
		return dwdcm_for( (int) $r['id'], (bool) $r->get_param( 'all' ) );
	} ) );
	register_rest_route( 'dwd/v1', '/crm/client/(?P<id>\d+)/mail', array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function ( $r ) {
		return dwdcm_get( (int) $r['id'], (bool) $r->get_param( 'all' ) );
	} ) );
	// Opened in Dream Desk → no longer new.
	register_rest_route( 'dwd/v1', '/crm/mail-seen', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$owner = (int) $r->get_param( 'owner' );
		$ch    = array();
		foreach ( (array) $r->get_param( 'ids' ) as $id ) {
			$ch[ sanitize_text_field( (string) $id ) ] = array( 'seen' => true );
		}
		if ( $owner && in_array( get_post_type( $owner ), array( DWDC_CLIENT, DWDC_CONTACT ), true ) ) {
			dwdcm_patch( $owner, $ch );
		}
		return array( 'ok' => true );
	} ) );
} );

/** Unread emails received from clients (newest first), across every client and project: the Home "Client emails" box. */
function dwdcm_recent( $n = 12 ) {
	$out = array();
	foreach ( get_posts( array( 'post_type' => array( DWDC_CLIENT, DWDC_CONTACT ), 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdcm_mail' ) ) as $o ) {
		$kind = DWDC_CLIENT === get_post_type( $o ) ? 'k' : 'p';
		$name = html_entity_decode( (string) get_the_title( $o ), ENT_QUOTES, 'UTF-8' );
		foreach ( (array) get_post_meta( $o, '_dwdcm_mail', true ) as $x ) {
			if ( ! is_array( $x ) || empty( $x['in'] ) || ! dwdcm_is_new( $x ) ) { // unread in Gmail and not opened in Dream Desk yet
				continue;
			}
			$body  = trim( (string) preg_replace( '/\s+/', ' ', (string) ( $x['body'] ?? '' ) ) );
			$out[] = array(
				'id'      => (string) ( $x['id'] ?? '' ),
				'owner'   => (int) $o,
				'kind'    => $kind,
				'name'    => $name,
				'from'    => (string) ( $x['from'] ?? '' ),
				'subject' => (string) ( $x['subject'] ?? '' ),
				'to'      => (string) ( $x['to'] ?? '' ),
				'thread'  => (string) ( $x['thread'] ?? '' ),
				'body'    => (string) ( $x['body'] ?? '' ),
				'date'    => (string) ( $x['date'] ?? '' ),
				'ts'      => (int) strtotime( (string) ( $x['date'] ?? '' ) ),
				'snip'    => function_exists( 'mb_substr' ) ? mb_substr( $body, 0, 160 ) : substr( $body, 0, 160 ),
				'new'     => dwdcm_is_new( $x ),
			);
		}
	}
	usort( $out, function ( $a, $b ) { return $b['ts'] <=> $a['ts']; } );
	return array_slice( $out, 0, max( 1, (int) $n ) );
}
add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/crm/mail-recent', array( 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'edit_posts' ); }, 'callback' => function () {
		return array( 'list' => dwdcm_recent( 25 ), 'synced' => (string) get_option( 'dwdcm_last', '' ) );
	} ) );
} );

/** How many new (unread, not opened here) client emails each client or project has: the red "New email" pill on the lists. */
function dwdcm_new_counts() {
	$out = array();
	foreach ( get_posts( array( 'post_type' => array( DWDC_CLIENT, DWDC_CONTACT ), 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => '_dwdcm_mail' ) ) as $o ) {
		$n = 0;
		foreach ( (array) get_post_meta( $o, '_dwdcm_mail', true ) as $x ) {
			if ( is_array( $x ) && ! empty( $x['in'] ) && dwdcm_is_new( $x ) ) {
				$n++;
			}
		}
		if ( $n ) {
			$out[ (int) $o ] = $n;
		}
	}
	return $out;
}
add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/crm/mail-new', array( 'methods' => 'GET', 'permission_callback' => function () { return current_user_can( 'edit_posts' ); }, 'callback' => function () {
		return array( 'owners' => (object) dwdcm_new_counts() );
	} ) );
} );

/**
 * Who is waiting on whom, for every open project and lead.
 *
 * The latest message either way decides:
 * - client emails (from the Gmail sync, calendar replies and newsletters left out),
 * - texts on the Dream Web Digital Quo line (checked hourly for open projects; Mojo's and Tax Pro Design lines are ignored),
 * - Upwork "sent you a message" emails (they arrive as notes on the project) count as the client writing,
 * - emails sent from Dream Desk (notes starting "Emailed …") count as you writing.
 * The client wrote last → "Waiting on you". You wrote last → "Waiting on client", with the number of days.
 * "No reply needed" closes the conversation until the client writes again (also the way to clear an Upwork
 * message you answered inside Upwork, since Dream Desk can't see your Upwork replies).
 */

/** Lists where a conversation can be open. */
function dwdw_lists() {
	return array( 'active', 'hold', 'limbo', 'leads' );
}

/** A real conversation email, not a calendar reply or a newsletter. */
function dwdw_real_mail( $x ) {
	if ( ! is_array( $x ) || empty( $x['date'] ) ) {
		return false;
	}
	if ( preg_match( '/^\s*(accepted|declined|tentative(ly accepted)?|invitation|updated invitation|canceled event|cancelled event)\s*:/i', (string) ( $x['subject'] ?? '' ) ) ) {
		return false;
	}
	if ( ! empty( $x['in'] ) && false !== stripos( (string) ( $x['body'] ?? '' ), 'unsubscribe' ) ) {
		return false;
	}
	return true;
}

/** Latest email in and out for a list of stored emails: array( in => ISO, out => ISO ). */
function dwdw_mail_last( $list ) {
	$res = array( 'in' => '', 'out' => '' );
	foreach ( is_array( $list ) ? $list : array() as $x ) {
		if ( ! dwdw_real_mail( $x ) ) {
			continue;
		}
		$t = strtotime( (string) $x['date'] );
		if ( ! $t ) {
			continue;
		}
		$k = ! empty( $x['in'] ) ? 'in' : 'out';
		$t = gmdate( 'Y-m-d\TH:i:s\Z', $t );
		if ( $t > $res[ $k ] ) {
			$res[ $k ] = $t;
		}
	}
	return $res;
}

// Keep a small summary next to the stored emails, so the lists never have to read every email.
foreach ( array( 'added_post_meta', 'updated_post_meta' ) as $dwdw_hook ) {
	add_action( $dwdw_hook, function ( $mid, $obj, $key, $val ) {
		if ( '_dwdcm_mail' === $key ) {
			update_post_meta( $obj, '_dwdw_mail', dwdw_mail_last( maybe_unserialize( $val ) ) );
		}
	}, 10, 4 );
}

function dwdw_mail_for( $pid ) {
	$owner = function_exists( 'dwdcm_owner' ) ? (int) dwdcm_owner( $pid ) : (int) $pid;
	$sum   = get_post_meta( $owner, '_dwdw_mail', true );
	if ( ! is_array( $sum ) ) {
		$sum = dwdw_mail_last( get_post_meta( $owner, '_dwdcm_mail', true ) ); // first time only
		update_post_meta( $owner, '_dwdw_mail', $sum );
	}
	return $sum;
}

/** Notes: Upwork messages from the client (in) and emails sent from Dream Desk (out). */
function dwdw_note_last( $pid ) {
	$res   = array( 'in' => '', 'out' => '' );
	$notes = get_post_meta( $pid, '_dwdc_notes', true );
	foreach ( is_array( $notes ) ? $notes : array() as $n ) {
		$txt = (string) ( $n['text'] ?? '' );
		$k   = 0 === strpos( $txt, 'Upwork message' ) ? 'in' : ( 0 === strpos( $txt, 'Emailed ' ) ? 'out' : '' );
		$t   = $k ? strtotime( (string) ( $n['date'] ?? '' ) . ' UTC' ) : 0;
		if ( $t ) {
			$t = gmdate( 'Y-m-d\TH:i:s\Z', $t );
			if ( $t > $res[ $k ] ) {
				$res[ $k ] = $t;
			}
		}
	}
	return $res;
}

/** Waiting state for one project: array( who => you|client|'', since, days, via ) or null when there is nothing to show. */
function dwdw_state( $pid ) {
	$list = (string) get_post_meta( $pid, '_dwdc_list', true );
	if ( ! in_array( $list, dwdw_lists(), true ) || ( 'leads' === $list && 'lost' === get_post_meta( $pid, '_dwdc_stage', true ) ) ) {
		return null;
	}
	$in    = array( '', '' );
	$out   = array( '', '' );
	$take  = function ( $t, $via, &$slot ) {
		if ( $t && $t > $slot[0] ) {
			$slot = array( $t, $via );
		}
	};
	$m = dwdw_mail_for( $pid );
	$take( $m['in'] ?? '', 'email', $in );
	$take( $m['out'] ?? '', 'email', $out );
	$x = get_post_meta( $pid, '_dwdw_txt', true );
	if ( is_array( $x ) ) {
		$take( $x['in'] ?? '', 'text', $in );
		$take( $x['out'] ?? '', 'text', $out );
	}
	$n = dwdw_note_last( $pid );
	$take( $n['in'], 'Upwork', $in );
	$take( $n['out'], 'email', $out );
	$clear = (string) get_post_meta( $pid, '_dwdw_clear', true );
	$take( $clear, 'closed', $out );
	if ( '' === $in[0] && '' === $out[0] ) {
		return null;
	}
	if ( $in[0] > $out[0] ) {
		$who   = 'you';
		$since = $in[0];
		$via   = $in[1];
	} else {
		$who   = 'closed' === $out[1] ? '' : 'client';
		$since = $out[0];
		$via   = $out[1];
	}
	return array( 'who' => $who, 'since' => $since, 'days' => max( 0, (int) floor( ( time() - strtotime( $since ) ) / DAY_IN_SECONDS ) ), 'via' => $via );
}

add_filter( 'dwdc_contact_row', function ( $c, $pid ) {
	$c['wait'] = dwdw_state( $pid );
	return $c;
}, 10, 2 );

/* ---------- Texts: latest message each way on the Dream Web Digital line, for open projects ---------- */

/** Every phone number on a project (its own, its client's, extra contacts). */
function dwdw_phones( $pid ) {
	$out = array( get_post_meta( $pid, '_dwdc_phone', true ) );
	$cl  = (int) get_post_meta( $pid, '_dwdc_client', true );
	if ( $cl ) {
		$out[] = get_post_meta( $cl, '_dwdcl_phone', true );
	}
	foreach ( (array) get_post_meta( $pid, '_dwdc_contacts', true ) as $x ) {
		if ( is_array( $x ) && ! empty( $x['phone'] ) ) {
			$out[] = $x['phone'];
		}
	}
	$out = array_filter( array_map( 'dwdq_e164', array_filter( $out ) ) );
	return array_values( array_unique( $out ) );
}

/** Store the latest text in and out from a list of messages [ { in, at } ]. */
function dwdw_txt_store( $pid, $msgs ) {
	$cur = get_post_meta( $pid, '_dwdw_txt', true );
	$cur = is_array( $cur ) ? $cur : array( 'in' => '', 'out' => '' );
	foreach ( (array) $msgs as $m ) {
		$t = strtotime( (string) ( $m['at'] ?? '' ) );
		if ( ! $t ) {
			continue;
		}
		$k = ! empty( $m['in'] ) ? 'in' : 'out';
		$t = gmdate( 'Y-m-d\TH:i:s\Z', $t );
		if ( $t > (string) ( $cur[ $k ] ?? '' ) ) {
			$cur[ $k ] = $t;
		}
	}
	update_post_meta( $pid, '_dwdw_txt', $cur );
}

function dwdw_txt_sync() {
	if ( ! get_option( 'dwds_quo_key', '' ) || ! function_exists( 'dwdq_from' ) ) {
		return array( 'skipped' => 'Quo not connected' );
	}
	$from = dwdq_from();
	if ( is_wp_error( $from ) ) {
		return array( 'error' => $from->get_error_message() );
	}
	$n = 0;
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => 60, 'fields' => 'ids', 'meta_key' => '_dwdc_list', 'meta_value' => dwdw_lists(), 'meta_compare' => 'IN', 'orderby' => 'modified', 'order' => 'DESC' ) ) as $pid ) { // phpcs:ignore
		foreach ( dwdw_phones( $pid ) as $ph ) {
			$j = dwdq_call( 'GET', '/messages?phoneNumberId=' . rawurlencode( $from['id'] ) . '&participants=' . rawurlencode( $ph ) . '&maxResults=20' );
			if ( is_wp_error( $j ) ) {
				continue;
			}
			$msgs = array();
			foreach ( (array) ( $j['data'] ?? array() ) as $m ) {
				$msgs[] = array( 'in' => 'incoming' === ( $m['direction'] ?? '' ), 'at' => (string) ( $m['createdAt'] ?? '' ) );
			}
			if ( $msgs ) {
				dwdw_txt_store( $pid, $msgs );
			}
			$n++;
		}
	}
	update_option( 'dwdw_txt_last', current_time( 'mysql' ), false );
	return array( 'checked' => $n );
}
add_action( 'dwdw_hourly', 'dwdw_txt_sync' );
add_action( 'init', function () {
	if ( ! wp_next_scheduled( 'dwdw_hourly' ) ) {
		wp_schedule_event( time() + 300, 'hourly', 'dwdw_hourly' );
	}
} );

// Opening a project's texts, or sending one from Dream Desk, updates its state straight away.
add_filter( 'rest_post_dispatch', function ( $res, $server, $req ) {
	if ( ! preg_match( '#^/dwd/v1/crm/contact/(\d+)/texts$#', (string) $req->get_route(), $m ) || ! ( $res instanceof WP_REST_Response ) || $res->get_status() >= 300 ) {
		return $res;
	}
	$d = $res->get_data();
	if ( 'GET' === $req->get_method() && ! empty( $d['list'] ) ) {
		dwdw_txt_store( (int) $m[1], $d['list'] );
	} elseif ( 'POST' === $req->get_method() && ! empty( $d['ok'] ) ) {
		dwdw_txt_store( (int) $m[1], array( array( 'in' => false, 'at' => gmdate( 'c' ) ) ) );
		delete_post_meta( (int) $m[1], '_dwdw_clear' );
	}
	return $res;
}, 10, 3 );

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'manage_options' ); };
	// "No reply needed" (act: clear) or undo it (act: undo).
	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/wait', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$pid = (int) $r['id'];
		if ( DWDC_CONTACT !== get_post_type( $pid ) ) {
			return new WP_Error( 'dwdw', 'Project not found.', array( 'status' => 404 ) );
		}
		if ( 'undo' === $r->get_param( 'act' ) ) {
			delete_post_meta( $pid, '_dwdw_clear' );
		} else {
			update_post_meta( $pid, '_dwdw_clear', gmdate( 'Y-m-d\TH:i:s\Z' ) );
		}
		return array( 'wait' => dwdw_state( $pid ) );
	} ) );
} );
