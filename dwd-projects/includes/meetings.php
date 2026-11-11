<?php
/**
 * Client meetings for the top of Dream Desk Home: today's Zoom, Upwork and Google Meet calls with their times
 * and join links.
 *
 * Calendly and Upwork both put every booked call on Mike's Google Calendar, so a small Google Apps Script
 * (calendar read-only, no extra services to enable) sends the next 14 days of events here every 15 minutes.
 * Only real meetings are kept: events with a Zoom/Meet/Teams/Upwork link or another guest.
 */
defined( 'ABSPATH' ) || exit;

function dwdmt_token() {
	$t = (string) get_option( 'dwdmt_token', '' );
	if ( '' === $t ) {
		$t = wp_generate_password( 40, false );
		update_option( 'dwdmt_token', $t, false );
	}
	return $t;
}

function dwdmt_script() {
	$url = rest_url( 'dwd/v1/meetings-sync' );
	$tok = dwdmt_token();
	return <<<JS
// Dream Desk · Inbox. Read-only: every 15 minutes it sends the next 14 days of your Google Calendar
// (Calendly, Upwork, Zoom and Meet calls) and the last 3 days of Upwork emails (invites, client
// messages, hires) to Dream Desk. It never changes your calendar or your email.
// Click Run on "setup" once; it then updates every 15 minutes.
var DREAM_DESK = '{$url}';
var TOKEN = '{$tok}';

function syncMeetings() {
  var me = Session.getEffectiveUser().getEmail().toLowerCase();
  var now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), now.getDate()), end = new Date(start.getTime() + 14 * 864e5);
  var events = CalendarApp.getDefaultCalendar().getEvents(start, end).filter(function (e) { return !e.isAllDayEvent(); }).map(function (e) {
    return { id: e.getId(), title: e.getTitle(), start: e.getStartTime().toISOString(), end: e.getEndTime().toISOString(), location: e.getLocation() || '',
      desc: (e.getDescription() || '').slice(0, 3000), guests: e.getGuestList().map(function (g) { return g.getEmail(); }).filter(function (m) { return m.toLowerCase() !== me; }),
      mine: e.getMyStatus() !== CalendarApp.GuestStatus.NO };
  });
  // Upwork emails from the last 3 days: interview invites, client messages, hires, offers, ended contracts.
  var q = 'from:upwork.com newer_than:3d (subject:"Invitation to Interview" OR subject:"sent you a message" OR subject:"hired you" OR subject:offer OR subject:"contract has ended" OR subject:"contract ended")';
  var messages = [];
  GmailApp.search(q, 0, 60).forEach(function (t) {
    t.getMessages().forEach(function (m) {
      if (m.getDate() < new Date(now.getTime() - 3 * 864e5)) { return; }
      messages.push({ id: m.getId(), date: Utilities.formatDate(m.getDate(), 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'"), subject: m.getSubject(), body: m.getPlainBody().slice(0, 20000) });
    });
  });
  var r = UrlFetchApp.fetch(DREAM_DESK, { method: 'post', contentType: 'application/json', headers: { 'X-DWD-Token': TOKEN }, payload: JSON.stringify({ events: events, messages: messages }), muteHttpExceptions: true });
  Logger.log(r.getResponseCode() + ' ' + r.getContentText().slice(0, 300));
}

function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'syncMeetings') { ScriptApp.deleteTrigger(t); } });
  ScriptApp.newTrigger('syncMeetings').timeBased().everyMinutes(15).create();
  syncMeetings();
}
JS;
}

/** Turn raw calendar events into meetings (or nothing, for flights, reminders and the like). */
function dwdmt_parse( $events ) {
	$out = array();
	foreach ( array_slice( (array) $events, 0, 300 ) as $e ) {
		$e     = (array) $e;
		$title = trim( sanitize_text_field( (string) ( $e['title'] ?? '' ) ) );
		$loc   = (string) ( $e['location'] ?? '' );
		$desc  = (string) ( $e['desc'] ?? '' );
		$s     = strtotime( (string) ( $e['start'] ?? '' ) );
		if ( ! $s || '' === $title || ( isset( $e['mine'] ) && ! $e['mine'] ) ) {
			continue;
		}
		$hay  = $loc . ' ' . $desc;
		$link = '';
		$kind = '';
		foreach ( array(
			'Zoom'        => '#https://[\w.-]*zoom\.us/(?:j|my|w)/[^\s"<>]+#i',
			'Upwork'      => '#https://www\.upwork\.com/(?:ab/)?messages/rooms/[^\s"<>?]+(?:\?uvm=true)?#i',
			'Google Meet' => '#https://meet\.google\.com/[a-z0-9-]+#i',
			'Teams'       => '#https://teams\.microsoft\.com/[^\s"<>]+#i',
		) as $k => $re ) {
			if ( preg_match( $re, $hay, $m ) ) {
				$link = $m[0];
				$kind = $k;
				break;
			}
		}
		// Upwork puts the join link last; prefer that one over the plain room link.
		if ( 'Upwork' === $kind && preg_match( '#https://www\.upwork\.com/ab/messages/rooms/[^\s"<>]+\?uvm=true#i', $hay, $m ) ) {
			$link = $m[0];
		}
		$guests = array_values( array_filter( array_map( 'sanitize_email', (array) ( $e['guests'] ?? array() ) ) ) );
		if ( '' === $link && ! $guests ) {
			continue;
		}
		$src = stripos( $hay, 'calendly.com' ) !== false ? 'Calendly' : ( stripos( $hay, 'upwork.com' ) !== false ? 'Upwork' : '' );
		// Who: "Aliny and Dream Web Digital" → Aliny; "Sherry / Michael" → Sherry.
		$who = preg_replace( '/\s+(?:and|&|\/|-|with|x)\s+(?:Dream Web Digital|Michael(?: Tarr)?|Mike)\s*$/i', '', $title );
		$who = preg_replace( '/^(?:Dream Web Digital|Michael(?: Tarr)?|Mike)\s+(?:and|&|\/|-|with|x)\s+/i', '', $who );
		$about = '';
		if ( preg_match( '/meeting with .+? about <a[^>]*>([^<]+)</i', $desc, $m ) ) {
			$about = html_entity_decode( $m[1], ENT_QUOTES );
		} elseif ( preg_match( '/Event Name\s*\n\s*([^\n]+)/', $desc, $m ) ) {
			$about = $m[1];
		}
		$out[] = array(
			'id'     => substr( sanitize_text_field( (string) ( $e['id'] ?? '' ) ), 0, 120 ),
			'title'  => $title,
			'who'    => $who,
			'about'  => sanitize_text_field( $about ),
			'start'  => gmdate( 'c', $s ),
			'end'    => gmdate( 'c', strtotime( (string) ( $e['end'] ?? '' ) ) ?: $s + 1800 ),
			'kind'   => $kind ? $kind : 'Meeting',
			'source' => $src,
			'link'   => esc_url_raw( $link ),
			'guests' => array_slice( $guests, 0, 5 ),
		);
	}
	usort( $out, function ( $a, $b ) { return strcmp( $a['start'], $b['start'] ); } );
	return $out;
}

function dwdmt_store( $events, $via ) {
	$m = dwdmt_parse( $events );
	update_option( 'dwdmt_data', array( 'at' => current_time( 'mysql' ), 'via' => $via, 'meetings' => $m ), false );
	return array( 'ok' => true, 'meetings' => count( $m ) );
}

/** Today's meetings plus the next few, with times in the site's time zone (for the Home bar). */
function dwdmt_summary() {
	$d = get_option( 'dwdmt_data', array() );
	if ( empty( $d['at'] ) ) {
		return null;
	}
	$tz    = wp_timezone();
	$today = current_time( 'Y-m-d' );
	$now   = time();
	$list  = array();
	foreach ( (array) ( $d['meetings'] ?? array() ) as $m ) {
		$s = strtotime( $m['start'] );
		$e = strtotime( $m['end'] );
		if ( $e < $now - DAY_IN_SECONDS ) {
			continue; // the browser shows dates and times in Mike's own time zone and drops past days
		}
		$m['date'] = wp_date( 'Y-m-d', $s, $tz );
		$m['time'] = wp_date( 'g:i A', $s, $tz );
		$m['ts']   = $s;
		$m['te']   = $e;
		$list[]    = $m;
	}
	$fresh = 'script' === ( $d['via'] ?? '' ) && current_time( 'timestamp' ) - strtotime( $d['at'] ) < 2 * HOUR_IN_SECONDS;
	return array( 'at' => $d['at'], 'via' => $d['via'] ?? '', 'fresh' => $fresh, 'today' => $today, 'list' => array_slice( $list, 0, 40 ) );
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/meetings-sync', array(
		'methods'             => 'POST',
		'permission_callback' => function ( $r ) {
			$t = (string) $r->get_header( 'x_dwd_token' );
			return '' !== $t && hash_equals( dwdmt_token(), $t );
		},
		'callback'            => function ( $r ) {
			$d   = (array) $r->get_json_params();
			$res = dwdmt_store( (array) ( $d['events'] ?? array() ), 'script' );
			$msg = array_slice( (array) ( $d['messages'] ?? array() ), 0, 200 );
			if ( $msg ) {
				$res['inbox'] = dwdin_apply_mail( $msg );
				if ( function_exists( 'dwdm_apply' ) ) {
					$res['upwork'] = dwdm_apply( $msg );
				}
			}
			$res['calls'] = dwdin_apply_meetings( dwdmt_parse( (array) ( $d['events'] ?? array() ) ) );
			update_option( 'dwdin_last', current_time( 'mysql' ), false );
			return $res;
		},
	) );
	$admin = function () { return current_user_can( 'manage_options' ); };
	register_rest_route( 'dwd/v1', '/crm/meetings', array(
		array( 'methods' => 'GET', 'permission_callback' => $admin, 'callback' => function () { return array( 'meetings' => dwdmt_summary(), 'script' => dwdmt_script() ); } ),
		// Admin load (used once to fill today in before the script is set up).
		array( 'methods' => 'POST', 'permission_callback' => $admin, 'callback' => function ( $r ) {
			$d = get_option( 'dwdmt_data', array() );
			if ( 'script' === ( $d['via'] ?? '' ) ) {
				return array( 'ok' => false, 'reason' => 'The calendar script is already sending meetings.' );
			}
			return dwdmt_store( (array) ( $r->get_json_params()['events'] ?? array() ), 'manual' );
		} ),
	) );
} );
