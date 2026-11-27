<?php
/**
 * Travel (Dream Desk → Plan → Travel): trips with a day-by-day itinerary and a to-do list.
 * Paste an itinerary or packing / to-do list and Claude sorts it into the trip (simple line split if no Claude key).
 * Upcoming flights are also read from the synced calendars (Personal to-dos that came from Google Calendar).
 */
defined( 'ABSPATH' ) || exit;

function dwdtr_trips() {
	$t = get_option( 'dwdtr_trips', null );
	if ( null === $t ) {
		$t = dwdtr_seed();
		update_option( 'dwdtr_trips', $t, false );
	}
	$t = is_array( $t ) ? array_values( $t ) : array();
	usort( $t, function ( $a, $b ) { return strcmp( (string) ( $a['start'] ?? '' ), (string) ( $b['start'] ?? '' ) ); } );
	return $t;
}

function dwdtr_save( $trips ) {
	update_option( 'dwdtr_trips', array_values( $trips ), false );
}

function dwdtr_id() {
	return substr( md5( uniqid( '', true ) ), 0, 10 );
}

/** First run: the Norway trip found in Gmail (Icelandair BPWAMF) and the hotels and plans on the calendar. */
function dwdtr_seed() {
	$i = function ( $date, $time, $title, $detail, $kind ) {
		return array( 'id' => dwdtr_id(), 'date' => $date, 'time' => $time, 'title' => $title, 'detail' => $detail, 'kind' => $kind );
	};
	$todo = function ( $text, $due = '' ) {
		return array( 'id' => dwdtr_id(), 'text' => $text, 'done' => false, 'due' => $due );
	};
	$rec = function ( $place, $text ) {
		return array( 'id' => dwdtr_id(), 'place' => $place, 'text' => $text, 'done' => false );
	};
	return array(
		array(
			'id'    => dwdtr_id(),
			'name'  => 'Norway (via Iceland)',
			'start' => '2026-11-29',
			'end'   => '2026-12-19',
			'notes' => "Icelandair booking reference BPWAMF · Economy Light: 1 carry-on (10 kg) + 1 personal item, no checked bags.\nBodø is off the route. Entur confirmed the train refund.\nTrains: your Interrail pass covers the fare on the Bergen Railway (Oslo–Myrdal–Bergen) but not the seat, so the Entur bookings for Dec 1 and Dec 4 are the required seat reservations (Premium was optional). Myrdal–Flåm isn't covered by the pass; you bought tickets at the 30% Interrail discount. Nothing else to buy for those four trains: on Dec 1 and Dec 4 have your active Interrail pass and the Entur PDFs ready.",
			'items' => array(
				$i( '2026-11-29', '7:35 PM', 'Flight FI820 Raleigh-Durham (RDU) → Keflavík (KEF)', 'Icelandair · Terminal 2 · Seat 28F · arrives 6:40 AM next day · ref BPWAMF', 'flight' ),
				$i( '2026-11-30', '7:50 AM', 'Flight FI318 Keflavík (KEF) → Oslo (OSL)', 'Icelandair · Seat 34F · arrives in Oslo at 11:35 · 1h 10m connection', 'flight' ),
				$i( '2026-11-30', '', 'Stay: Comfort Hotel Xpress Central Station, Oslo', 'Fred Olsens Gate 11, Oslo · 1 night', 'hotel' ),
				$i( '2026-12-01', '', 'Train Oslo → Myrdal → Flåm', 'Bergen Railway to Myrdal (Interrail pass + Entur seat reservation), then the Flåm Railway (Entur ticket at Interrail discount)', 'transport' ),
				$i( '2026-12-01', '', 'Stay: three nights in Flåm', 'Gudvangen Budget Hotel, Fetagata 17, Aurland (from your calendar) · Dec 1–4', 'hotel' ),
				$i( '2026-12-04', '', 'Train Flåm → Myrdal → Bergen', 'Arrive in Bergen at 15:00 · Interrail pass + Entur PDFs', 'transport' ),
				$i( '2026-12-07', '8:30 PM', 'Havila Castor departs Bergen', 'Two nights aboard', 'transport' ),
				$i( '2026-12-08', '', 'Havila Castor stops in Ålesund', '', 'transport' ),
				$i( '2026-12-09', '9:45 AM', 'Arrive in Trondheim on Havila Castor', 'Stay in Trondheim Dec 9–13', 'hotel' ),
				$i( '2026-12-12', '9:00 PM', 'Kalandra concert', 'HAVET, Trondheim', 'activity' ),
				$i( '2026-12-13', '2:50 PM', 'Flight Trondheim → Tromsø', 'Arrives 4:35 PM · two nights in Tromsø', 'flight' ),
				$i( '2026-12-14', '', 'Open day in Tromsø', 'Explore; optional northern lights tour in the evening', 'activity' ),
				$i( '2026-12-15', '2:55 PM', 'Flight Tromsø → Oslo', 'Arrives 4:55 PM · overnight near Oslo Airport', 'flight' ),
				$i( '2026-12-16', '1:10 PM', 'Flight FI319 Oslo (OSL) → Keflavík (KEF)', 'Icelandair · Seat 34F · arrives 3:20 PM · three nights in Iceland', 'flight' ),
				$i( '2026-12-19', '4:45 PM', 'Flight FI821 Keflavík (KEF) → Raleigh-Durham (RDU)', 'Icelandair · Terminal 2 · Seat 28F · arrives 6:35 PM', 'flight' ),
			),
			'todos' => array(
				$todo( 'Check in online for FI820 (opens 24 hours before)', '2026-11-28' ),
				$todo( 'Pack carry-on only (10 kg) + personal item', '2026-11-29' ),
				$todo( 'Check in Widerøe that the old Dec 14 Bodø → Tromsø flight is cancelled', '2026-11-29' ),
				$todo( 'Have your active Interrail pass + Entur PDFs ready for the trains', '2026-12-01' ),
				$todo( 'Interrail pass + Entur PDFs again for Flåm → Myrdal → Bergen', '2026-12-04' ),
				$todo( 'Book the optional northern lights tour for Dec 14', '2026-12-10' ),
			),
			'recs'  => array(
				$rec( 'Oslo', 'Walk up onto the roof of the Opera House for views over the fjord' ),
				$rec( 'Oslo', 'Vigeland Sculpture Park in Frogner Park' ),
				$rec( 'Oslo', 'Munch Museum (The Scream) on the waterfront' ),
				$rec( 'Oslo', 'Christmas market at Spikersuppa on Karl Johans gate' ),
				$rec( 'Flåm', 'Fjord cruise on the Nærøyfjord (UNESCO-listed), which runs year-round' ),
				$rec( 'Flåm', 'Stegastein viewpoint high above the Aurlandsfjord' ),
				$rec( 'Flåm', 'Dinner and local beer at Ægir Brewery' ),
				$rec( 'Bergen', 'Bryggen, the old wooden Hanseatic wharf' ),
				$rec( 'Bergen', 'Fløibanen funicular up Mount Fløyen for the city view' ),
				$rec( 'Bergen', 'The Fish Market by the harbor' ),
				$rec( 'Bergen', 'Pepperkakebyen, the giant gingerbread town that runs in December' ),
				$rec( 'Ålesund', 'Climb the 418 steps up Aksla to the Fjellstua viewpoint' ),
				$rec( 'Ålesund', 'Walk the Art Nouveau town center' ),
				$rec( 'Trondheim', 'Nidaros Cathedral' ),
				$rec( 'Trondheim', 'Old Town Bridge and the colorful Bakklandet neighborhood' ),
				$rec( 'Trondheim', 'Christmas market in Torvet, the main square' ),
				$rec( 'Tromsø', 'Northern lights tour on Dec 14 (best on a clear night, away from city lights)' ),
				$rec( 'Tromsø', 'Fjellheisen cable car to Mount Storsteinen' ),
				$rec( 'Tromsø', 'The Arctic Cathedral' ),
				$rec( 'Tromsø', 'Dog sledding or a reindeer visit' ),
				$rec( 'Iceland', 'Golden Circle: Þingvellir, Geysir and Gullfoss' ),
				$rec( 'Iceland', 'Sky Lagoon or the Blue Lagoon (the Blue Lagoon is near Keflavík airport, handy on Dec 19)' ),
				$rec( 'Iceland', 'Hallgrímskirkja and downtown Reykjavík' ),
			),
		),
	);
}


function tm24k( $s ) {
	return preg_match( '/(\d{1,2}):?(\d{2})?\s*([AaPp])/', (string) $s, $m ) ? sprintf( '%02d%02d', ( (int) $m[1] % 12 ) + ( 'p' === strtolower( $m[3] ) ? 12 : 0 ), (int) ( $m[2] ?? 0 ) ) : '9999';
}

/** IATA airport → time zone, so flight times show in the departure airport's local time. */
function dwdtr_tz( $text ) {
	$map = array(
		'America/Los_Angeles' => array( 'ONT', 'LAX', 'SFO', 'SJC', 'SAN', 'OAK', 'SMF', 'BUR', 'SNA', 'LAS', 'SEA', 'PDX', 'PHX' ),
		'America/Denver'      => array( 'DEN', 'SLC' ),
		'America/Chicago'     => array( 'DFW', 'DAL', 'ORD', 'MDW', 'IAH', 'HOU', 'AUS', 'MSP', 'STL', 'MSY', 'BNA' ),
		'America/New_York'    => array( 'CLT', 'RDU', 'MIA', 'PBI', 'FLL', 'MCO', 'TPA', 'ATL', 'JFK', 'LGA', 'EWR', 'BOS', 'DCA', 'IAD', 'PHL', 'DTW', 'BWI' ),
		'Atlantic/Reykjavik'  => array( 'KEF', 'RKV' ),
		'Europe/Oslo'         => array( 'OSL', 'TRD', 'TOS', 'BOO', 'BGO', 'AES', 'SVG', 'EVE' ),
		'Europe/London'       => array( 'LHR', 'LGW', 'MAN', 'EDI' ),
		'Europe/Paris'        => array( 'CDG', 'ORY' ),
		'Europe/Copenhagen'   => array( 'CPH' ),
		'Europe/Stockholm'    => array( 'ARN' ),
		'Europe/Amsterdam'    => array( 'AMS' ),
	);
	if ( preg_match_all( '/\b([A-Z]{3})\b/', (string) $text, $m ) ) {
		foreach ( $m[1] as $code ) {
			foreach ( $map as $tz => $codes ) {
				if ( in_array( $code, $codes, true ) ) {
					return array( $tz, $code );
				}
			}
		}
	}
	return array( '', '' );
}

/** A calendar time (stored in Eastern) → [local date, local time, airport] at the departure airport. */
function dwdtr_local( $date, $time, $where ) {
	list( $tz, $code ) = dwdtr_tz( $where );
	if ( ! $tz || ! $date || ! preg_match( '/^\s*(\d{1,2})(?::(\d{2}))?\s*([AaPp])/', (string) $time ) ) {
		return array( $date, $time, '' );
	}
	try {
		$dt = new DateTime( $date . ' ' . $time, new DateTimeZone( 'America/New_York' ) );
		$dt->setTimezone( new DateTimeZone( $tz ) );
		return array( $dt->format( 'Y-m-d' ), $dt->format( 'g:i A' ), $code );
	} catch ( Exception $e ) {
		return array( $date, $time, '' );
	}
}


/**
 * Verified flight details (from the booking emails and Michael's itinerary): depart / arrive in local time,
 * seat, booking ref and which Gmail holds the booking. Keyed by flight number.
 */
function dwdtr_flight_info() {
	$f = function ( $air, $from, $fromc, $to, $toc, $dep, $arr, $seat, $ref, $acct, $q ) {
		return compact( 'air', 'from', 'fromc', 'to', 'toc', 'dep', 'arr', 'seat', 'ref', 'acct', 'q' );
	};
	$base = array(
		'AA1920' => $f( 'American Airlines', 'ONT', 'Ontario, CA', 'CLT', 'Charlotte', 'Fri, Nov 27 · 10:30 PM', '', '', '', 'personal', '"AA 1920" OR "1920" american' ),
		'FI820'  => $f( 'Icelandair', 'RDU', 'Raleigh-Durham', 'KEF', 'Keflavík', 'Sun, Nov 29 · 7:35 PM', 'Mon, Nov 30 · 6:40 AM', '28F', 'BPWAMF', 'work', 'BPWAMF' ),
		'FI318'  => $f( 'Icelandair', 'KEF', 'Keflavík', 'OSL', 'Oslo', 'Mon, Nov 30 · 7:50 AM', 'Mon, Nov 30 · 11:35 AM', '34F', 'BPWAMF', 'work', 'BPWAMF' ),
		'WF1355' => $f( 'Widerøe', 'TRD', 'Trondheim', 'TOS', 'Tromsø', 'Sun, Dec 13 · 2:50 PM', 'Sun, Dec 13 · 4:35 PM', '', '', 'personal', '"WF 1355" OR WF1355 OR widerøe OR wideroe' ),
		'DY381'  => $f( 'Norwegian', 'TOS', 'Tromsø', 'OSL', 'Oslo', 'Tue, Dec 15 · 2:55 PM', 'Tue, Dec 15 · 4:55 PM', '', '', 'personal', '"DY 381" OR DY381 OR norwegian' ),
		'FI319'  => $f( 'Icelandair', 'OSL', 'Oslo', 'KEF', 'Keflavík', 'Wed, Dec 16 · 1:10 PM', 'Wed, Dec 16 · 3:20 PM', '34F', 'BPWAMF', 'work', 'BPWAMF' ),
		'FI821'  => $f( 'Icelandair', 'KEF', 'Keflavík', 'RDU', 'Raleigh-Durham', 'Sat, Dec 19 · 4:45 PM', 'Sat, Dec 19 · 6:35 PM', '28F', 'BPWAMF', 'work', 'BPWAMF' ),
	);
	return array_merge( $base, (array) get_option( 'dwdtr_flight_info', array() ) );
}

function dwdtr_code( $s ) {
	return preg_match( '/\b([A-Z]{2})\s?(\d{2,4})\b/', (string) $s, $m ) ? $m[1] . $m[2] : '';
}

/** Upcoming flights from the synced calendars (anything that reads like a flight, today or later). */
function dwdtr_cal_flights() {
	$out   = array();
	$today = wp_date( 'Y-m-d' );
	$d     = function_exists( 'dwdpe_get' ) ? dwdpe_get() : array();
	$seen  = array();
	foreach ( (array) ( $d['todos'] ?? array() ) as $t ) {
		$txt = (string) ( $t['text'] ?? '' );
		if ( empty( $t['gevent'] ) || ( $t['due'] ?? '' ) < $today || ! preg_match( '/flight|✈|\b[A-Z]{2}\s?\d{2,4}\b/u', $txt ) || preg_match( '/flight school|flight desk/i', $txt ) ) {
			continue;
		}
		$key = strtolower( preg_replace( '/\s+/', ' ', $txt ) ) . '|' . ( $t['due'] ?? '' );
		if ( isset( $seen[ $key ] ) ) {
			continue;
		}
		$seen[ $key ] = 1;
		list( $ld, $lt, $ap ) = dwdtr_local( (string) $t['due'], (string) ( $t['time'] ?? '' ), $txt . ' ' . ( $t['note'] ?? '' ) );
		$out[] = array( 'date' => $ld, 'time' => $lt . ( $ap ? ' ' . $ap . ' time' : '' ), 'title' => trim( $txt ), 'detail' => trim( (string) ( $t['note'] ?? '' ) ), 'source' => 'calendar', 'personal' => 'personal' === ( $t['gacct'] ?? '' ) || 'personal' === ( $t['gowner'] ?? '' ) ? 1 : 0 );
	}
	// During a trip, the trip's itinerary is the truth: a calendar flight only shows if that trip lists it
	// (same flight number, or the same from → to cities). Dropped or cancelled flights never show.
	$trips = get_option( 'dwdtr_trips', array() );
	$out   = array_values( array_filter( $out, function ( $f ) use ( $trips ) {
		foreach ( (array) $trips as $tr ) {
			$s = (string) ( $tr['start'] ?? '' );
			$e = (string) ( $tr['end'] ?? '' );
			if ( ! $s || ! $e || $f['date'] < gmdate( 'Y-m-d', strtotime( $s ) - DAY_IN_SECONDS ) || $f['date'] > gmdate( 'Y-m-d', strtotime( $e ) + DAY_IN_SECONDS ) ) {
				continue;
			}
			$hay = '';
			foreach ( (array) ( $tr['items'] ?? array() ) as $it ) {
				if ( 'flight' === ( $it['kind'] ?? '' ) ) {
					$hay .= ' ' . $it['title'] . ' ' . $it['detail'];
				}
			}
			$norm = function ( $s ) { return strtolower( preg_replace( '/\s+/', '', remove_accents( (string) $s ) ) ); };
			if ( preg_match( '/\b([A-Z]{2})\s?(\d{2,4})\b/', $f['title'] . ' ' . $f['detail'], $m ) && false !== strpos( $norm( $hay ), strtolower( $m[1] . $m[2] ) ) ) {
				return true;
			}
			// No flight number match: keep it only if the trip has a flight to the same place.
			$to = preg_match( '/(?:to|→)\s*([\p{L} .-]+?)(?:\s*\(|$)/u', $f['title'], $mm ) ? trim( $mm[1] ) : '';
			return $to && false !== strpos( $norm( $hay ), $norm( $to ) ) && ! preg_match( '/\b[A-Z]{2}\s?\d{2,4}\b/', $f['title'] );
		}
		return true; // not during a trip: show it
	} ) );
	// One entry per flight: the same flight number within a day of itself is a copy (Gmail adds its own).
	// Keep the work-calendar copy over the personal one, then the first seen.
	usort( $out, function ( $a, $b ) { return ( $a['personal'] <=> $b['personal'] ) ?: strcmp( $a['date'], $b['date'] ); } );
	$keep = array();
	foreach ( $out as $f ) {
		$code = preg_match( '/\b([A-Z]{2})\s?(\d{2,4})\b/', $f['title'] . ' ' . $f['detail'], $m ) ? $m[1] . $m[2] : '';
		if ( ! $code && preg_match( '/icelandair\s*(\d{2,4})/i', $f['title'], $m ) ) {
			$code = 'FI' . $m[1];
		}
		$dup = false;
		foreach ( $keep as $k ) {
			if ( $code && $k['code'] === $code && abs( strtotime( $k['date'] ) - strtotime( $f['date'] ) ) <= DAY_IN_SECONDS ) {
				$dup = true;
				break;
			}
		}
		if ( ! $dup ) {
			$f['code'] = $code;
			$keep[]    = $f;
		}
	}
	usort( $keep, function ( $a, $b ) { return strcmp( $a['date'] . tm24k( $a['time'] ), $b['date'] . tm24k( $b['time'] ) ); } );
	$info = dwdtr_flight_info();
	foreach ( $keep as &$k ) {
		$k['info'] = $k['code'] && isset( $info[ $k['code'] ] ) ? $info[ $k['code'] ] : null;
	}
	unset( $k );
	return array_slice( $keep, 0, 20 );
}

/** Pasted text → itinerary items and to-dos (Claude when a key is set, else a simple line split). */
function dwdtr_parse( $text, $trip ) {
	$text = trim( (string) $text );
	$key  = function_exists( 'dwdc_ai_key' ) ? dwdc_ai_key() : '';
	if ( $key ) {
		$sys = 'You sort travel text for a personal trip planner. Today is ' . wp_date( 'Y-m-d' ) . '. The trip is "' . ( $trip['name'] ?? '' ) . '" (' . ( $trip['start'] ?? '' ) . ' to ' . ( $trip['end'] ?? '' ) . '). '
			. 'Split the pasted text into itinerary items (things that happen at a time or on a day: flights, trains, hotel stays, tours, reservations, plans) and to-dos (things to do or pack). '
			. 'Reply with JSON only, no prose: {"items":[{"date":"YYYY-MM-DD or empty","time":"e.g. 7:35 PM or empty","title":"short","detail":"booking refs, addresses, seats, notes","kind":"flight|hotel|transport|activity|food|other"}],"todos":[{"text":"...","due":"YYYY-MM-DD or empty"}]}. '
			. 'Skip anything the text says was dropped, cancelled or refunded. Keep it short: titles like "FI820 RDU → Keflavík", details a few words (seat, arrival time, booking ref). To-dos short too. Use the trip dates to fill in missing years. Do not invent anything.';
		$res = wp_remote_post( 'https://api.anthropic.com/v1/messages', array(
			'timeout' => 90,
			'headers' => array( 'x-api-key' => $key, 'anthropic-version' => '2026-10-21', 'anthropic-beta' => 'server-side-fallback-2026-07-01', 'content-type' => 'application/json' ),
			'body'    => wp_json_encode( array( 'model' => 'claude-opus-5-5', 'max_tokens' => 8000, 'fallbacks' => 'default', 'system' => $sys, 'messages' => array( array( 'role' => 'user', 'content' => mb_substr( $text, 0, 20000 ) ) ) ) ),
		) );
		if ( ! is_wp_error( $res ) && 200 === wp_remote_retrieve_response_code( $res ) ) {
			$body = json_decode( wp_remote_retrieve_body( $res ), true );
			$out  = '';
			foreach ( (array) ( $body['content'] ?? array() ) as $b ) {
				if ( 'text' === ( $b['type'] ?? '' ) ) {
					$out .= $b['text'];
				}
			}
			$a = strpos( $out, '{' );
			$z = strrpos( $out, '}' );
			$j = false !== $a && false !== $z ? json_decode( substr( $out, $a, $z - $a + 1 ), true ) : null;
			if ( is_array( $j ) ) {
				return array( 'items' => (array) ( $j['items'] ?? array() ), 'todos' => (array) ( $j['todos'] ?? array() ), 'by' => 'claude' );
			}
		}
	}
	// Fallback: bullet / checkbox lines become to-dos, everything else goes into the itinerary notes.
	$todos = array();
	$rest  = array();
	foreach ( preg_split( '/\r?\n/', $text ) as $line ) {
		if ( preg_match( '/^\s*(?:[-*•▢☐□]|\[\s?[xX ]?\]|\d+[.)])\s+(.+)$/u', $line, $m ) ) {
			$todos[] = array( 'text' => trim( preg_replace( '/^\[\s?[xX ]?\]\s*/', '', $m[1] ) ), 'due' => '' );
		} elseif ( '' !== trim( $line ) ) {
			$rest[] = trim( $line );
		}
	}
	return array( 'items' => array(), 'todos' => $todos, 'notes' => implode( "\n", $rest ), 'by' => 'lines' );
}

function dwdtr_clean_item( $x ) {
	$x    = (array) $x;
	$date = (string) ( $x['date'] ?? '' );
	$kind = (string) ( $x['kind'] ?? 'other' );
	return array(
		'id'     => ! empty( $x['id'] ) ? sanitize_key( $x['id'] ) : dwdtr_id(),
		'date'   => preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) ? $date : '',
		'time'   => sanitize_text_field( (string) ( $x['time'] ?? '' ) ),
		'title'  => sanitize_text_field( (string) ( $x['title'] ?? '' ) ),
		'detail' => sanitize_textarea_field( (string) ( $x['detail'] ?? '' ) ),
		'kind'   => in_array( $kind, array( 'flight', 'hotel', 'transport', 'activity', 'food', 'other' ), true ) ? $kind : 'other',
	);
}

// Once: the wrong Gmail-made copies on the personal calendar (wrong times, or the dropped Bodø flight) are hidden.
add_action( 'init', function () {
	if ( get_option( 'dwdtr_hid2' ) || ! function_exists( 'dwdpe_get' ) ) {
		return;
	}
	update_option( 'dwdtr_hid1', 1, false );
	update_option( 'dwdtr_hid2', 1, false );
	// hid2: the dropped Widerøe WF 1326 (Bodø → Tromsø, Dec 14) copy too.
	$bad  = array( 'g5oontcegdcrbvcf9apfqeafc0', 'd7gc506e8b25l2bsmfe11v0sdg', '4ijkbtv3ecacd56hlvv82garjg', 'v57k60aaungl5s64iakuafg9ts', 'g3vfnmtvqppvlrqhfa82upsa2o' );
	$hide = array_values( array_unique( array_merge( (array) get_option( 'dwdpe_hide_ev', array() ), $bad ) ) );
	update_option( 'dwdpe_hide_ev', $hide, false );
	$d = get_option( 'dwdpe_data', array() );
	if ( is_array( $d ) && ! empty( $d['todos'] ) ) {
		$d['todos'] = array_values( array_filter( $d['todos'], function ( $x ) use ( $bad ) { return ! in_array( (string) ( $x['gevent'] ?? '' ), $bad, true ); } ) );
		update_option( 'dwdpe_data', $d, false );
	}
}, 30 );

add_action( 'rest_api_init', function () {
	$can  = function () { return current_user_can( 'manage_options' ); };
	$resp = function () { return array( 'trips' => dwdtr_trips(), 'finfo' => dwdtr_flight_info(), 'flights' => dwdtr_cal_flights(), 'ai' => function_exists( 'dwdc_ai_key' ) && (bool) dwdc_ai_key() ); };
	register_rest_route( 'dwd/v1', '/crm/travel', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => $resp ),
		// Save a whole trip (new or edited).
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) use ( $resp ) {
			$in    = (array) $r->get_param( 'trip' );
			$trips = dwdtr_trips();
			$id    = sanitize_key( (string) ( $in['id'] ?? '' ) );
			$trip  = array(
				'id'    => $id ? $id : dwdtr_id(),
				'name'  => sanitize_text_field( (string) ( $in['name'] ?? 'New trip' ) ),
				'start' => preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) ( $in['start'] ?? '' ) ) ? $in['start'] : '',
				'end'   => preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) ( $in['end'] ?? '' ) ) ? $in['end'] : '',
				'notes' => sanitize_textarea_field( (string) ( $in['notes'] ?? '' ) ),
				'items' => array_map( 'dwdtr_clean_item', (array) ( $in['items'] ?? array() ) ),
				'recs'  => array_map( function ( $x ) {
					$x = (array) $x;
					return array( 'id' => ! empty( $x['id'] ) ? sanitize_key( $x['id'] ) : dwdtr_id(), 'place' => sanitize_text_field( (string) ( $x['place'] ?? '' ) ), 'text' => sanitize_text_field( (string) ( $x['text'] ?? '' ) ), 'done' => ! empty( $x['done'] ) );
				}, (array) ( $in['recs'] ?? array() ) ),
				'todos' => array_map( function ( $t ) {
					$t = (array) $t;
					return array( 'id' => ! empty( $t['id'] ) ? sanitize_key( $t['id'] ) : dwdtr_id(), 'text' => sanitize_text_field( (string) ( $t['text'] ?? '' ) ), 'done' => ! empty( $t['done'] ), 'due' => preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) ( $t['due'] ?? '' ) ) ? $t['due'] : '' );
				}, (array) ( $in['todos'] ?? array() ) ),
			);
			$found = false;
			foreach ( $trips as $k => $t ) {
				if ( $t['id'] === $trip['id'] ) {
					$trips[ $k ] = $trip;
					$found       = true;
				}
			}
			if ( ! $found ) {
				$trips[] = $trip;
			}
			dwdtr_save( $trips );
			$out         = $resp();
			$out['trip'] = $trip['id'];
			return $out;
		} ),
	) );
	register_rest_route( 'dwd/v1', '/crm/travel/(?P<id>[a-z0-9]+)', array( 'methods' => 'DELETE', 'permission_callback' => $can, 'callback' => function ( $r ) use ( $resp ) {
		dwdtr_save( array_filter( dwdtr_trips(), function ( $t ) use ( $r ) { return $t['id'] !== $r['id']; } ) );
		return $resp();
	} ) );
	// Paste → sorted into the trip (items and to-dos appended).
	register_rest_route( 'dwd/v1', '/crm/travel/(?P<id>[a-z0-9]+)/paste', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) use ( $resp ) {
		$trips = dwdtr_trips();
		foreach ( $trips as $k => $t ) {
			if ( $t['id'] !== $r['id'] ) {
				continue;
			}
			$p = dwdtr_parse( (string) $r->get_param( 'text' ), $t );
			foreach ( $p['items'] as $x ) {
				$x = dwdtr_clean_item( $x );
				if ( '' !== $x['title'] ) {
					$trips[ $k ]['items'][] = $x;
				}
			}
			foreach ( $p['todos'] as $x ) {
				$x   = (array) $x;
				$txt = sanitize_text_field( (string) ( $x['text'] ?? '' ) );
				if ( '' !== $txt ) {
					$trips[ $k ]['todos'][] = array( 'id' => dwdtr_id(), 'text' => $txt, 'done' => false, 'due' => preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) ( $x['due'] ?? '' ) ) ? $x['due'] : '' );
				}
			}
			if ( ! empty( $p['notes'] ) ) {
				$trips[ $k ]['notes'] = trim( (string) ( $t['notes'] ?? '' ) . "\n" . sanitize_textarea_field( $p['notes'] ) );
			}
			dwdtr_save( $trips );
			$out          = $resp();
			$out['added'] = array( 'items' => count( $p['items'] ), 'todos' => count( $p['todos'] ), 'by' => $p['by'] );
			return $out;
		}
		return new WP_Error( 'dwdtr', 'Trip not found.', array( 'status' => 404 ) );
	} ) );
} );
