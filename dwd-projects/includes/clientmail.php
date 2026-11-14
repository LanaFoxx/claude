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

/** New = from the client, unread in Gmail and not opened in Dream Desk yet. */
function dwdcm_is_new( $x ) {
	return ! empty( $x['unread'] ) && empty( $x['seen'] );
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
