<?php
/**
 * Inbox → Dream Desk: Upwork invites and client messages become leads, and booked calls
 * (from Google Calendar: Calendly, Upwork, Google appointment pages, Zoom/Meet invites)
 * land on the lead, the Business to-do list and the Personal to-do list.
 *
 * Fed by the "Dream Desk inbox" Google Apps Script (see dwdmt_script), which posts calendar
 * events and recent Upwork emails to /meetings-sync every 15 minutes.
 */
defined( 'ABSPATH' ) || exit;

function dwdin_norm( $s ) {
	return preg_replace( '/[^a-z0-9]/', '', strtolower( html_entity_decode( (string) $s, ENT_QUOTES ) ) );
}

/** Upwork email → array( type: invite|message, job, person, desc, text ) or null. */
function dwdin_parse( $subject, $body ) {
	$subject = trim( (string) $subject );
	$body    = str_replace( "\r", '', (string) $body );
	$clean   = preg_replace( '/\(\s*https?:\/\/[^)]*\)/s', '', $body ); // drop "( https://… )" link blocks
	$clean   = preg_replace( '/https?:\/\/\S+/', '', $clean );
	if ( preg_match( '/^Invitation to Interview for:\s*(.+)$/i', $subject, $m ) ) {
		$r = array( 'type' => 'invite', 'job' => trim( $m[1] ), 'person' => '', 'desc' => '', 'text' => '' );
		if ( preg_match( '/Personal note\s*from client\s*(.+?)\n\s*View invite/is', $clean, $n ) ) {
			$lines = array_values( array_filter( array_map( 'trim', explode( "\n", $n[1] ) ) ) );
			$last  = end( $lines );
			if ( $last && mb_strlen( $last ) <= 40 && ( preg_match( '/^[A-Z][\w\'-]+(?:\s+[A-Z][\w\'-]*\.?){0,2}$/u', $last ) || ! preg_match( '/[.!?]$/', $last ) ) ) {
				$r['person'] = $last;
				array_pop( $lines );
			}
			$r['text'] = implode( ' ', $lines );
		}
		if ( preg_match( '/\n\s*(Hourly|Fixed[- ]price)[^\n]*\n(?:[^\n]*\n){0,4}?\s*([A-Z][^\n]{40,})/', $clean, $d ) ) {
			$r['desc'] = trim( $d[1] . ' · ' . preg_replace( '/\s*more\s*$/', '', $d[2] ) );
		}
		return $r;
	}
	if ( preg_match( '/^(.+?) sent you a message$/i', $subject, $m ) ) {
		$r = array( 'type' => 'message', 'job' => '', 'person' => trim( $m[1] ), 'desc' => '', 'text' => '' );
		if ( preg_match( '/Unread message from\s*(.+?)\s*about\s*(.+?)\s*\n\s*\n/s', $clean, $j ) ) {
			$r['job'] = trim( preg_replace( '/\s+/', ' ', $j[2] ) );
		}
		if ( preg_match( '/\d{1,2}:\d{2}\s*[AP]M[^\n]*\d{4}\s*\n(.+?)\n\s*View on Upwork/s', $clean, $t ) ) {
			$lines     = array_filter( array_map( 'trim', explode( "\n", $t[1] ) ), function ( $l ) { return '' !== $l && ! preg_match( '/^[A-Z]{1,3}$/', $l ); } );
			$r['text'] = mb_substr( implode( ' ', $lines ), 0, 500 );
		}
		return $r;
	}
	return null;
}

/** Open project or lead for a job title / person (Upwork shows "Duncan M."). */
function dwdin_find( $job, $person, $email = '' ) {
	$j     = dwdin_norm( $job );
	$p     = strtolower( trim( (string) $person ) );
	$first = $p ? dwdin_norm( strtok( $p, ' ' ) ) : '';
	$li    = $p && preg_match( '/\s([a-z])[a-z]*\.?$/', $p, $m ) ? $m[1] : '';
	$hits  = array( 'job' => array(), 'email' => array(), 'person' => array() );
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_query' => array( array( 'key' => '_dwdc_list', 'value' => array( 'active', 'hold', 'limbo', 'leads' ), 'compare' => 'IN' ) ) ) ) as $pid ) { // phpcs:ignore
		if ( strlen( $j ) >= 6 && ( dwdin_norm( get_the_title( $pid ) ) === $j || dwdin_norm( get_post_meta( $pid, '_dwdc_job', true ) ) === $j ) ) {
			$hits['job'][] = $pid;
		}
		if ( $email && strtolower( (string) get_post_meta( $pid, '_dwdc_email', true ) ) === strtolower( $email ) ) {
			$hits['email'][] = $pid;
		}
		if ( strlen( $first ) >= 3 ) {
			$cp = strtolower( trim( (string) get_post_meta( $pid, '_dwdc_person', true ) ) );
			if ( $cp && dwdin_norm( strtok( $cp, ' ' ) ) === $first ) {
				$cl = preg_match( '/\s([a-z])[a-z]*\.?$/', $cp, $m2 ) ? $m2[1] : '';
				if ( ! $li || ! $cl || $li === $cl ) {
					$hits['person'][] = $pid;
				}
			}
		}
	}
	foreach ( array( 'email', 'job', 'person' ) as $k ) {
		if ( 1 === count( $hits[ $k ] ) ) {
			return (int) $hits[ $k ][0];
		}
	}
	return 0;
}

function dwdin_note( $pid, $text ) {
	$notes   = get_post_meta( $pid, '_dwdc_notes', true );
	$notes   = is_array( $notes ) ? $notes : array();
	$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => $text );
	update_post_meta( $pid, '_dwdc_notes', $notes );
	wp_update_post( array( 'ID' => $pid ) );
}

/** Upwork invites and client messages → leads (once per email). */
function dwdin_apply_mail( $messages ) {
	$seen = (array) get_option( 'dwdin_seen', array() );
	$out  = array( 'leads' => array(), 'notes' => 0 );
	usort( $messages, function ( $a, $b ) { return strcmp( (string) ( $a['date'] ?? '' ), (string) ( $b['date'] ?? '' ) ); } );
	foreach ( $messages as $msg ) {
		$id = (string) ( $msg['id'] ?? '' );
		if ( '' === $id || isset( $seen[ $id ] ) ) {
			continue;
		}
		$x = dwdin_parse( $msg['subject'] ?? '', $msg['body'] ?? '' );
		if ( ! $x ) {
			continue;
		}
		$seen[ $id ] = substr( (string) ( $msg['date'] ?? '' ), 0, 10 ) ?: current_time( 'Y-m-d' );
		$x['job']    = html_entity_decode( $x['job'], ENT_QUOTES );
		// A job invite alone is NOT a lead (Mike gets lots of them). Just remember its details, so that if
		// the client later messages or books a call, the lead gets the job description.
		if ( 'invite' === $x['type'] ) {
			$inv = (array) get_option( 'dwdin_invites', array() );
			$inv[ dwdin_norm( $x['job'] ) ] = array( 'job' => $x['job'], 'person' => $x['person'], 'desc' => $x['desc'], 'date' => $seen[ $id ] );
			update_option( 'dwdin_invites', array_slice( $inv, -100, null, true ), false );
			continue;
		}
		$inv = (array) get_option( 'dwdin_invites', array() );
		$ix  = $inv[ dwdin_norm( $x['job'] ) ] ?? array();
		$pid = dwdin_find( $x['job'], $x['person'] );
		if ( ! $pid && $x['job'] ) {
			$pid = dwdc_save_contact( 0, array(
				'name'        => $x['job'],
				'person'      => $x['person'],
				'list'        => 'leads',
				'stage'       => 'new',
				'lead_source' => $ix ? 'Upwork Invite' : 'Upwork Message',
				'source'      => 'Upwork message email',
				'job'         => $ix['desc'] ?? '',
				'followup'    => wp_date( 'Y-m-d', time(), new DateTimeZone( 'America/New_York' ) ),
			) );
			$out['leads'][] = $x['job'];
			dwdin_note( $pid, 'Lead added automatically: ' . ( $x['person'] ? $x['person'] : 'the client' ) . ' messaged you on Upwork' . ( $ix ? ' (after inviting you to this job on ' . $ix['date'] . ')' : '' ) . '.' );
		} elseif ( $pid && $x['person'] && ! get_post_meta( $pid, '_dwdc_person', true ) ) {
			update_post_meta( $pid, '_dwdc_person', sanitize_text_field( $x['person'] ) );
		}
		if ( $pid && $x['text'] ) {
			dwdin_note( $pid, 'Upwork message' . ( $x['person'] ? ' from ' . $x['person'] : '' ) . ': ' . sanitize_text_field( $x['text'] ) );
			$out['notes']++;
		}
	}
	$cut = gmdate( 'Y-m-d', strtotime( '-60 days' ) );
	update_option( 'dwdin_seen', array_filter( $seen, function ( $d ) use ( $cut ) { return $d >= $cut; } ), false );
	return $out;
}

/** Is this calendar event a call with a (possible) client? */
function dwdin_is_client_call( $m ) {
	$ext = array_filter( (array) ( $m['guests'] ?? array() ), function ( $g ) { return false === stripos( $g, '@dreamwebdigital.com' ); } );
	return ( $ext || in_array( $m['source'] ?? '', array( 'Calendly', 'Upwork' ), true ) )
		&& preg_match( '/\b(call|meeting|meet|chat|consult|consultation|intro|discovery|interview|zoom|talk|appointment)\b/i', ( $m['title'] ?? '' ) . ' ' . ( $m['kind'] ?? '' ) );
}

/** Booked calls → note on the lead, a Business to-do and a Personal to-do (once per event; moved if rescheduled). */
function dwdin_apply_meetings( $meetings ) {
	$done = (array) get_option( 'dwdin_meets', array() );
	$tz   = new DateTimeZone( 'America/New_York' ); // Mike's time, not the server's (UTC)
	$now  = time();
	$out  = 0;
	foreach ( (array) $meetings as $m ) {
		$s = strtotime( $m['start'] ?? '' );
		if ( ! $s || $s < $now - HOUR_IN_SECONDS || empty( $m['id'] ) || ! dwdin_is_client_call( $m ) ) {
			continue;
		}
		$day  = wp_date( 'Y-m-d', $s, $tz );
		$time = wp_date( 'g:i A', $s, $tz );
		$key  = $m['id'];
		$prev = $done[ $key ] ?? null;
		if ( $prev && $prev['start'] === $m['start'] ) {
			continue;
		}
		$ext   = array_values( array_filter( (array) ( $m['guests'] ?? array() ), function ( $g ) { return false === stripos( $g, '@dreamwebdigital.com' ); } ) );
		$email = $ext ? $ext[0] : '';
		// "30 min call with Duncan about Brightside (Michael Tarr)" → Duncan
		$name = '';
		if ( preg_match( '/\bwith\s+([A-Z][a-zA-Z\'-]+(?:\s+[A-Z][a-zA-Z\'-]*\.?)?)/', $m['title'], $nm ) ) {
			$name = $nm[1];
		} elseif ( ! empty( $m['who'] ) && $m['who'] !== $m['title'] ) {
			$name = $m['who'];
		}
		$pid = $prev['pid'] ?? 0;
		if ( ! $pid ) {
			$pid = dwdin_find( '', $name, $email );
		}
		if ( ! $pid && ( $name || $email ) ) {
			$about = $m['about'] ? $m['about'] : ( preg_match( '/\babout\s+(.+?)(?:\s*\(|$)/i', $m['title'], $ab ) ? $ab[1] : '' );
			$pid   = dwdc_save_contact( 0, array(
				'name'        => $about ? $about : ( $name ? $name : $email ),
				'person'      => $name,
				'email'       => $email,
				'list'        => 'leads',
				'stage'       => 'new',
				'lead_source' => $m['source'] ? $m['source'] : 'Booked call',
				'source'      => 'Booked call on Google Calendar',
				'followup'    => $day,
			) );
			dwdin_note( $pid, 'Lead added automatically from a booked call.' );
		}
		$label = 'Call: ' . ( $name ? $name : $m['title'] ) . ' at ' . $time . ( $m['kind'] && 'Meeting' !== $m['kind'] ? ' (' . $m['kind'] . ')' : '' );
		if ( $pid ) {
			if ( $email && ! get_post_meta( $pid, '_dwdc_email', true ) ) {
				update_post_meta( $pid, '_dwdc_email', strtolower( $email ) );
			}
			update_post_meta( $pid, '_dwdc_followup', $day );
			dwdin_note( $pid, ( $prev ? 'Call moved to ' : 'Call booked: ' ) . wp_date( 'D M j', $s, $tz ) . ' at ' . $time . ( $m['link'] ? ' · ' . $m['link'] : '' ) . '.' );
		}
		// Business to-do
		$tid = (int) ( $prev['task'] ?? 0 );
		if ( $tid && get_post( $tid ) ) {
			wp_update_post( array( 'ID' => $tid, 'post_title' => $label ) );
			update_post_meta( $tid, '_dwdc_due', $day );
		} else {
			$tid = dwdc_add_task( $label, $pid, $day );
		}
		// Personal to-do
		// (linked to the calendar event, so the Personal Google sync updates this one instead of adding a copy)
		$all   = dwdpe_get();
		$gev   = preg_replace( '/@google\.com$/', '', $key );
		$ptid  = $prev['ptodo'] ?? ( 'mt' . substr( md5( $key ), 0, 14 ) );
		$found = false;
		foreach ( $all['todos'] as $i => $t ) {
			if ( ( $t['id'] ?? '' ) === $ptid || ( $t['gevent'] ?? '' ) === $gev ) {
				$ptid = $t['id'];
				$all['todos'][ $i ] = dwdpe_clean( 'todos', array( 'text' => $label, 'due' => $day, 'time' => $time, 'tag' => 'work', 'dirty' => false ), $t );
				$found              = true;
			}
		}
		if ( ! $found ) {
			$all['todos'][] = dwdpe_clean( 'todos', array( 'id' => $ptid, 'text' => $label, 'due' => $day, 'time' => $time, 'tag' => 'work', 'source' => 'Google Calendar', 'gevent' => $gev, 'note' => $m['link'], 'dirty' => false ) );
		}
		update_option( 'dwdpe_data', $all, false );
		$done[ $key ] = array( 'start' => $m['start'], 'pid' => $pid, 'task' => $tid, 'ptodo' => $ptid, 'day' => $day );
		$out++;
	}
	$cut = gmdate( 'Y-m-d', strtotime( '-30 days' ) );
	update_option( 'dwdin_meets', array_filter( $done, function ( $d ) use ( $cut ) { return ( $d['day'] ?? '' ) >= $cut; } ), false );
	return $out;
}
