<?php
/**
 * Zoom invites: pick a lead or client, Dream Desk makes a Zoom meeting, emails them the invite
 * and hands back the join link.
 *
 * Two ways to connect (Connections → Zoom):
 * 1. A Zoom "Server-to-Server OAuth" app (Account ID, Client ID, Client Secret): a new meeting is created each time.
 * 2. Just your personal meeting link (zoom.us/j/…): that link is sent each time.
 */
defined( 'ABSPATH' ) || exit;

function dwdz_cfg() {
	$c = (array) get_option( 'dwdz_cfg', array() );
	return array( 'account' => (string) ( $c['account'] ?? '' ), 'client' => (string) ( $c['client'] ?? '' ), 'secret' => (string) ( $c['secret'] ?? '' ), 'pmi' => (string) ( $c['pmi'] ?? '' ) );
}
function dwdz_api_ready() { $c = dwdz_cfg(); return $c['account'] && $c['client'] && $c['secret']; }
function dwdz_ready() { $c = dwdz_cfg(); return dwdz_api_ready() || '' !== $c['pmi']; }

function dwdz_token( $force = false ) {
	$t = get_transient( 'dwdz_token' );
	if ( $t && ! $force ) {
		return $t;
	}
	$c = dwdz_cfg();
	$r = wp_remote_post( 'https://zoom.us/oauth/token?grant_type=account_credentials&account_id=' . rawurlencode( $c['account'] ), array(
		'timeout' => 20,
		'headers' => array( 'Authorization' => 'Basic ' . base64_encode( $c['client'] . ':' . $c['secret'] ) ),
	) );
	if ( is_wp_error( $r ) ) {
		return $r;
	}
	$j = json_decode( (string) wp_remote_retrieve_body( $r ), true );
	if ( empty( $j['access_token'] ) ) {
		$why = (string) ( $j['reason'] ?? ( $j['error'] ?? '' ) );
		if ( false !== stripos( $why, 'account_credential' ) ) {
			return new WP_Error( 'dwdz_auth', 'These keys are from a Zoom “General App”. Dream Desk needs a “Server-to-Server OAuth” app: in marketplace.zoom.us go to Develop → Build App → Server-to-Server OAuth App, then paste its Account ID, Client ID and Client Secret here. (Or use Option 2, your personal meeting link.)' );
		}
		if ( false !== stripos( $why, 'invalid client' ) || false !== stripos( $why, 'invalid_client' ) ) {
			return new WP_Error( 'dwdz_auth', 'Zoom doesn’t recognise that Client ID / Client Secret. Copy both again from the app’s App Credentials page.' );
		}
		return new WP_Error( 'dwdz_auth', 'Zoom didn’t accept the app keys' . ( $why ? ': ' . $why : '.' ) . ' Make sure the app is a Server-to-Server OAuth app and that it’s activated.' );
	}
	set_transient( 'dwdz_token', $j['access_token'], max( 60, (int) ( $j['expires_in'] ?? 3600 ) - 120 ) );
	return $j['access_token'];
}

/** Create a meeting. $when = 'YYYY-MM-DDTHH:MM' (New York time) or '' for right now. */
/**
 * The Zoom link Mike pastes to clients: his saved personal link, else one reusable Dream Web Digital meeting
 * (a "no fixed time" meeting, so the link never expires), made once and kept.
 */
function dwdz_personal_link( $make = false ) {
	$c = dwdz_cfg();
	if ( '' !== $c['pmi'] ) {
		return $c['pmi'];
	}
	$saved = (string) get_option( 'dwdz_room_link', '' );
	if ( '' !== $saved || ! $make || ! dwdz_api_ready() ) {
		return $saved;
	}
	$tok = dwdz_token();
	if ( is_wp_error( $tok ) ) {
		return $tok;
	}
	$body = array( 'topic' => 'Meeting with Michael Tarr · Dream Web Digital', 'type' => 3, 'timezone' => 'America/New_York', 'settings' => array( 'join_before_host' => true, 'waiting_room' => false, 'jbh_time' => 0 ) );
	$r    = wp_remote_post( 'https://api.zoom.us/v2/users/me/meetings', array( 'timeout' => 20, 'headers' => array( 'Authorization' => 'Bearer ' . $tok, 'Content-Type' => 'application/json' ), 'body' => wp_json_encode( $body ) ) );
	if ( is_wp_error( $r ) ) {
		return $r;
	}
	$j = json_decode( (string) wp_remote_retrieve_body( $r ), true );
	if ( empty( $j['join_url'] ) ) {
		return new WP_Error( 'dwdz_room', 'Zoom didn’t make the meeting link' . ( ! empty( $j['message'] ) ? ': ' . $j['message'] : '.' ) );
	}
	update_option( 'dwdz_room_link', esc_url_raw( $j['join_url'] ), false );
	return esc_url_raw( $j['join_url'] );
}

function dwdz_create( $topic, $when = '', $minutes = 30 ) {
	$tok = dwdz_token();
	if ( is_wp_error( $tok ) ) {
		return $tok;
	}
	$body = array( 'topic' => mb_substr( $topic, 0, 190 ), 'type' => $when ? 2 : 1, 'duration' => $minutes, 'timezone' => 'America/New_York', 'settings' => array( 'join_before_host' => true, 'waiting_room' => false, 'jbh_time' => 0 ) );
	if ( $when ) {
		$body['start_time'] = substr( $when, 0, 16 ) . ':00';
	}
	$r = wp_remote_post( 'https://api.zoom.us/v2/users/me/meetings', array( 'timeout' => 20, 'headers' => array( 'Authorization' => 'Bearer ' . $tok, 'Content-Type' => 'application/json' ), 'body' => wp_json_encode( $body ) ) );
	if ( is_wp_error( $r ) ) {
		return $r;
	}
	$j = json_decode( (string) wp_remote_retrieve_body( $r ), true );
	if ( empty( $j['join_url'] ) ) {
		return new WP_Error( 'dwdz_create', 'Zoom didn’t create the meeting' . ( ! empty( $j['message'] ) ? ': ' . $j['message'] : '.' ) );
	}
	return array( 'join' => $j['join_url'], 'start' => $j['start_url'] ?? $j['join_url'], 'id' => (string) ( $j['id'] ?? '' ), 'password' => (string) ( $j['password'] ?? '' ) );
}

function dwdz_note( $pid, $text ) {
	$notes   = get_post_meta( $pid, '_dwdc_notes', true );
	$notes   = is_array( $notes ) ? $notes : array();
	$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => $text );
	update_post_meta( $pid, '_dwdc_notes', $notes );
}

/** Make the meeting (or use the personal link) and email the invite. */
function dwdz_invite( $pid, $when = '', $send = true ) {
	if ( ! dwdz_ready() ) {
		return new WP_Error( 'dwdz_off', 'Zoom isn’t connected yet. Add it in Connections → Zoom.' );
	}
	$name   = html_entity_decode( get_the_title( $pid ), ENT_QUOTES );
	$person = trim( (string) get_post_meta( $pid, '_dwdc_person', true ) );
	$email  = (string) get_post_meta( $pid, '_dwdc_email', true );
	if ( ! is_email( $email ) ) {
		$cid   = (int) get_post_meta( $pid, '_dwdc_client', true );
		$email = $cid ? (string) get_post_meta( $cid, '_dwdcl_email', true ) : '';
		if ( ! $person && $cid ) {
			$person = html_entity_decode( get_the_title( $cid ), ENT_QUOTES );
		}
	}
	$when = preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/', (string) $when ) ? substr( $when, 0, 16 ) : '';
	if ( dwdz_api_ready() ) {
		$m = dwdz_create( 'Dream Web Digital × ' . ( $person ? $person : $name ), $when );
		if ( is_wp_error( $m ) ) {
			return $m;
		}
	} else {
		$c = dwdz_cfg();
		$m = array( 'join' => $c['pmi'], 'start' => $c['pmi'], 'id' => '', 'password' => '' );
	}
	$whenTxt = $when ? wp_date( 'l, F j \a\t g:i A', strtotime( $when . ':00 America/New_York' ), new DateTimeZone( 'America/New_York' ) ) . ' Eastern' : 'right now';
	$sent    = '';
	if ( $send && is_email( $email ) ) {
		$first = $person ? strtok( $person, ' ' ) : '';
		$html  = dwdp_email_html( array(
			'eyebrow' => 'Zoom meeting',
			'title'   => $when ? 'Let’s meet on Zoom' : 'Join me on Zoom now',
			'intro'   => 'Hi' . ( $first ? ' ' . esc_html( $first ) : ' there' ) . ',<br><br>' . ( $when ? 'Here’s the Zoom link for our meeting on <strong>' . esc_html( $whenTxt ) . '</strong>.' : 'I’m ready on Zoom now. Click the button below to join.' )
				. '<br><br>Meeting link: <a href="' . esc_url( $m['join'] ) . '">' . esc_html( $m['join'] ) . '</a>' . ( $m['password'] ? '<br>Passcode: ' . esc_html( $m['password'] ) : '' ),
			'buttons' => array( array( 'Join the Zoom meeting', $m['join'] ) ),
			'outro'   => 'Talk soon,<br>Michael Tarr, Dream Web Digital',
			'footer'  => 'Dream Web Digital ·',
		) );
		$html = str_replace( 'padding:14px 26px;border-radius:8px;font-size:13px', 'padding:20px 44px;border-radius:10px;font-size:16px', $html );
		if ( wp_mail( $email, $when ? 'Zoom meeting with Dream Web Digital · ' . $whenTxt : 'Join me on Zoom now · Dream Web Digital', $html, array( 'Content-Type: text/html; charset=UTF-8', 'Reply-To: Michael Tarr <mike@dreamwebdigital.com>', 'X-DWD-Own: 1' ) ) ) {
			$sent = $email;
		}
	}
	dwdz_note( $pid, 'Zoom meeting ' . ( $when ? 'for ' . $whenTxt : 'started now' ) . ': ' . $m['join'] . ( $sent ? ' (invite emailed to ' . $sent . ')' : ( $send ? ' (no email on file, invite not sent)' : '' ) ) );
	update_post_meta( $pid, '_dwdc_zoom', $m['join'] );
	return array( 'join' => $m['join'], 'start' => $m['start'], 'sent' => $sent, 'email' => $email, 'when' => $when ? $whenTxt : '', 'project' => function_exists( 'dwdc_contact' ) ? dwdc_contact( $pid, true ) : null );
}

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'edit_posts' ); };
	register_rest_route( 'dwd/v1', '/crm/zoom', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () {
			$c = dwdz_cfg();
			return array( 'ready' => dwdz_ready(), 'api' => dwdz_api_ready(), 'account' => $c['account'], 'client' => $c['client'], 'has_secret' => '' !== $c['secret'], 'pmi' => $c['pmi'] );
		} ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$p = (array) $r->get_json_params();
			$c = dwdz_cfg();
			foreach ( array( 'account', 'client', 'secret' ) as $k ) {
				if ( isset( $p[ $k ] ) && ( 'secret' !== $k || '' !== trim( (string) $p[ $k ] ) ) ) {
					$c[ $k ] = preg_replace( '/[^A-Za-z0-9_\-]/', '', (string) $p[ $k ] );
				}
			}
			if ( isset( $p['pmi'] ) ) {
				$u = esc_url_raw( trim( (string) $p['pmi'] ) );
				if ( '' !== $u && ! preg_match( '#^https://([a-z0-9-]+\.)?zoom\.us/#i', $u ) ) {
					return new WP_Error( 'dwdz_pmi', 'That doesn’t look like a Zoom link (it should start with https://zoom.us/j/…).', array( 'status' => 400 ) );
				}
				$c['pmi'] = $u;
			}
			if ( ! empty( $p['disconnect'] ) ) {
				$c = array( 'account' => '', 'client' => '', 'secret' => '', 'pmi' => $c['pmi'] );
			}
			update_option( 'dwdz_cfg', $c, false );
			delete_transient( 'dwdz_token' );
			if ( dwdz_api_ready() ) {
				$t = dwdz_token( true );
				if ( is_wp_error( $t ) ) {
					return new WP_Error( 'dwdz_test', $t->get_error_message(), array( 'status' => 400 ) );
				}
			}
			return array( 'ready' => dwdz_ready(), 'api' => dwdz_api_ready() );
		} ),
	) );
	register_rest_route( 'dwd/v1', '/crm/zoom/link', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function () {
		$u = dwdz_personal_link( true );
		return is_wp_error( $u ) ? new WP_Error( 'dwdz_room', $u->get_error_message(), array( 'status' => 400 ) ) : array( 'link' => $u );
	} ) );
	register_rest_route( 'dwd/v1', '/crm/zoom/invite', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$pid = (int) $r->get_param( 'project' );
		if ( ! $pid || DWDC_CONTACT !== get_post_type( $pid ) ) {
			return new WP_Error( 'dwdz_pid', 'Pick a lead or client first.', array( 'status' => 400 ) );
		}
		$res = dwdz_invite( $pid, (string) $r->get_param( 'when' ), false !== $r->get_param( 'send' ) );
		return is_wp_error( $res ) ? new WP_Error( 'dwdz', $res->get_error_message(), array( 'status' => 400 ) ) : $res;
	} ) );
} );
