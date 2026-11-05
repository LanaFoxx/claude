<?php
/**
 * Personal: Mike's own to-do list, money log and bills — kept apart from the business CRM.
 * Stored in one private option (never autoloaded, never shown on the site).
 */
defined( 'ABSPATH' ) || exit;

function dwdpe_get() {
	$d = get_option( 'dwdpe_data', array() );
	$d = is_array( $d ) ? $d : array();
	foreach ( array( 'todos', 'money', 'bills' ) as $k ) {
		$d[ $k ] = isset( $d[ $k ] ) && is_array( $d[ $k ] ) ? array_values( $d[ $k ] ) : array();
	}
	return $d;
}

/** Clean one item of a given kind. */
function dwdpe_clean( $kind, $x, $old = array() ) {
	$x   = array_merge( (array) $old, (array) $x );
	$txt = function ( $v, $n = 200 ) { return mb_substr( sanitize_text_field( (string) $v ), 0, $n ); };
	$day = function ( $v ) { return preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) $v ) ? (string) $v : ''; };
	$amt = function ( $v ) { return round( (float) str_replace( array( '$', ',' ), '', (string) $v ), 2 ); };
	$out = array( 'id' => preg_replace( '/[^a-z0-9]/', '', (string) ( $x['id'] ?? '' ) ) );
	if ( 'todos' === $kind ) {
		$out += array(
			'text'    => $txt( $x['text'] ?? '', 300 ),
			'note'    => mb_substr( sanitize_textarea_field( (string) ( $x['note'] ?? '' ) ), 0, 4000 ),
			'due'     => $day( $x['due'] ?? '' ),
			'done'    => ! empty( $x['done'] ),
			'done_at' => ! empty( $x['done'] ) ? ( $txt( $x['done_at'] ?? '' ) ? $txt( $x['done_at'] ) : current_time( 'mysql' ) ) : '',
			'created' => $txt( $x['created'] ?? '' ) ? $txt( $x['created'] ) : current_time( 'mysql' ),
			'gtask'   => $txt( $x['gtask'] ?? '', 120 ),
			'gevent'  => $txt( $x['gevent'] ?? '', 200 ),
			'source'  => $txt( $x['source'] ?? '', 40 ),
			'time'    => $txt( $x['time'] ?? '', 40 ),
			'updated' => gmdate( 'c' ),
			'dirty'   => array_key_exists( 'dirty', (array) $x ) ? ! empty( $x['dirty'] ) : true,
		);
	} elseif ( 'money' === $kind ) {
		$out += array(
			'date'  => $day( $x['date'] ?? '' ) ? $day( $x['date'] ) : current_time( 'Y-m-d' ),
			'label' => $txt( $x['label'] ?? '' ),
			'amount' => abs( $amt( $x['amount'] ?? 0 ) ),
			'type'  => 'income' === ( $x['type'] ?? '' ) ? 'income' : 'expense',
			'cat'   => $txt( $x['cat'] ?? '', 60 ),
		);
	} else {
		$freq  = in_array( $x['freq'] ?? '', array( 'monthly', 'yearly', 'weekly' ), true ) ? $x['freq'] : 'monthly';
		$paid  = array();
		foreach ( (array) ( $x['paid'] ?? array() ) as $k => $v ) {
			if ( preg_match( '/^\d{4}-\d{2}(-\d{2})?$/', (string) $k ) ) {
				$paid[ $k ] = $day( $v ) ? $day( $v ) : current_time( 'Y-m-d' );
			}
		}
		$out += array(
			'name'    => $txt( $x['name'] ?? '' ),
			'amount'  => abs( $amt( $x['amount'] ?? 0 ) ),
			'day'     => max( 1, min( 31, (int) ( $x['day'] ?? 1 ) ) ),
			'month'   => max( 1, min( 12, (int) ( $x['month'] ?? 1 ) ) ),
			'freq'    => $freq,
			'autopay' => ! empty( $x['autopay'] ),
			'cat'     => $txt( $x['cat'] ?? '', 60 ),
			'paid'    => array_slice( $paid, -36, null, true ),
		);
	}
	return $out;
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/crm/personal', array(
		array(
			'methods'             => 'GET',
			'permission_callback' => function () { return current_user_can( 'manage_options' ); },
			'callback'            => 'dwdpe_get',
		),
		array(
			'methods'             => 'POST',
			'permission_callback' => function () { return current_user_can( 'manage_options' ); },
			'callback'            => function ( $r ) {
				$d    = (array) $r->get_json_params();
				$kind = in_array( $d['kind'] ?? '', array( 'todos', 'money', 'bills' ), true ) ? $d['kind'] : '';
				if ( ! $kind ) {
					return new WP_Error( 'dwdpe_kind', 'Unknown list', array( 'status' => 400 ) );
				}
				$all  = dwdpe_get();
				$list = $all[ $kind ];
				if ( ! empty( $d['delete'] ) ) {
					foreach ( $list as $x ) {
						if ( 'todos' === $kind && ( $x['id'] ?? '' ) === (string) $d['delete'] && ! empty( $x['gevent'] ) ) {
							$ge   = (array) get_option( 'dwdpe_gone_ev', array() );
							$ge[] = $x['gevent'];
							update_option( 'dwdpe_gone_ev', array_slice( $ge, -200 ), false );
						}
						if ( 'todos' === $kind && ( $x['id'] ?? '' ) === (string) $d['delete'] && ! empty( $x['gtask'] ) ) {
							$gone   = (array) get_option( 'dwdpe_gone', array() );
							$gone[] = $x['gtask'];
							update_option( 'dwdpe_gone', array_slice( $gone, -200 ), false );
						}
					}
					$list = array_values( array_filter( $list, function ( $x ) use ( $d ) { return ( $x['id'] ?? '' ) !== (string) $d['delete']; } ) );
				} else {
					$item = (array) ( $d['item'] ?? array() );
					$id   = preg_replace( '/[^a-z0-9]/', '', (string) ( $item['id'] ?? '' ) );
					$hit  = -1;
					foreach ( $list as $i => $x ) {
						if ( $id && ( $x['id'] ?? '' ) === $id ) {
							$hit = $i;
						}
					}
					unset( $item['gtask'], $item['gevent'], $item['source'] );
					$item['dirty'] = true;
					$clean         = dwdpe_clean( $kind, $item, $hit > -1 ? $list[ $hit ] : array() );
					if ( '' === $clean['id'] ) {
						$clean['id'] = strtolower( wp_generate_password( 10, false ) );
					}
					if ( ( 'todos' === $kind && '' === $clean['text'] ) || ( 'bills' === $kind && '' === $clean['name'] ) || ( 'money' === $kind && ! $clean['amount'] ) ) {
						return new WP_Error( 'dwdpe_empty', 'Fill in the details first.', array( 'status' => 400 ) );
					}
					if ( $hit > -1 ) {
						$list[ $hit ] = $clean;
					} else {
						$list[] = $clean;
					}
				}
				$all[ $kind ] = array_values( $list );
				update_option( 'dwdpe_data', $all, false );
				return $all;
			},
		),
	) );
} );

/* ---------------------------------------------------------------- Google Tasks & Calendar sync
 * A Google Apps Script in Mike's account runs every 15 minutes. It sends his Google Tasks and the
 * next two weeks of calendar events here; Dream Desk merges them into the personal to-do list and
 * answers with what to create, update or delete on the Google Tasks side.
 */
function dwdpe_token() {
	$t = (string) get_option( 'dwdpe_token', '' );
	if ( '' === $t ) {
		$t = wp_generate_password( 40, false );
		update_option( 'dwdpe_token', $t, false );
	}
	return $t;
}

function dwdpe_ts( $s ) {
	$t = strtotime( (string) $s );
	return $t ? $t : 0;
}

function dwdpe_sync( $d ) {
	$all    = dwdpe_get();
	$todos  = $all['todos'];
	$byg    = array();
	$bye    = array();
	foreach ( $todos as $i => $t ) {
		if ( ! empty( $t['gtask'] ) ) {
			$byg[ $t['gtask'] ] = $i;
		}
		if ( ! empty( $t['gevent'] ) ) {
			$bye[ $t['gevent'] ] = $i;
		}
	}
	$gone    = (array) get_option( 'dwdpe_gone', array() );
	$seen_g  = array();
	$added   = 0;
	// 1. Google Tasks → Dream Desk.
	foreach ( (array) ( $d['tasks'] ?? array() ) as $g ) {
		$gid = sanitize_text_field( (string) ( $g['id'] ?? '' ) );
		if ( '' === $gid || in_array( $gid, $gone, true ) ) {
			continue;
		}
		$seen_g[ $gid ] = 1;
		$gdone = ! empty( $g['done'] );
		$gdue  = substr( (string) ( $g['due'] ?? '' ), 0, 10 );
		if ( isset( $byg[ $gid ] ) ) {
			$i = $byg[ $gid ];
			$t = $todos[ $i ];
			// Whichever side changed last wins.
			if ( empty( $t['dirty'] ) || dwdpe_ts( $g['updated'] ?? '' ) > dwdpe_ts( $t['updated'] ?? '' ) ) {
				$todos[ $i ] = dwdpe_clean( 'todos', array( 'text' => $g['title'] ?? $t['text'], 'note' => $g['notes'] ?? $t['note'], 'due' => $gdue, 'done' => $gdone, 'done_at' => $gdone ? ( $t['done_at'] ?: current_time( 'mysql' ) ) : '', 'dirty' => false ), $t );
			}
		} elseif ( '' !== trim( (string) ( $g['title'] ?? '' ) ) && ! $gdone ) {
			$todos[] = dwdpe_clean( 'todos', array( 'id' => strtolower( wp_generate_password( 10, false ) ), 'text' => $g['title'], 'note' => $g['notes'] ?? '', 'due' => $gdue, 'done' => false, 'gtask' => $gid, 'source' => 'Google Tasks', 'dirty' => false ) );
			$added++;
		}
	}
	// Deleted in Google Tasks → delete here (only for tasks that were linked).
	if ( ! empty( $d['tasks_complete'] ) ) {
		$todos = array_values( array_filter( $todos, function ( $t ) use ( $seen_g ) {
			return empty( $t['gtask'] ) || isset( $seen_g[ $t['gtask'] ] ) || ! empty( $t['dirty'] );
		} ) );
	}
	// 2. Calendar events (next 14 days) → Dream Desk to-dos on that day.
	$seen_e = array();
	foreach ( (array) ( $d['events'] ?? array() ) as $e ) {
		$eid = sanitize_text_field( (string) ( $e['id'] ?? '' ) );
		if ( '' === $eid ) {
			continue;
		}
		$seen_e[ $eid ] = 1;
		$fields = array( 'text' => $e['title'] ?? '', 'due' => substr( (string) ( $e['date'] ?? '' ), 0, 10 ), 'time' => $e['time'] ?? '', 'note' => $e['notes'] ?? '' );
		if ( in_array( $eid, (array) get_option( 'dwdpe_gone_ev', array() ), true ) ) {
			continue;
		}
		$idx    = array_search( $eid, array_column( $todos, 'gevent' ), true );
		if ( false !== $idx && ! empty( $todos[ $idx ]['dirty'] ) ) {
			// Edited in Dream Desk and not pushed yet: Dream Desk wins.
		} elseif ( false !== $idx ) {
			$todos[ $idx ] = dwdpe_clean( 'todos', $fields + array( 'dirty' => false ), $todos[ $idx ] );
		} elseif ( '' !== trim( (string) $fields['text'] ) ) {
			$todos[] = dwdpe_clean( 'todos', $fields + array( 'id' => strtolower( wp_generate_password( 10, false ) ), 'done' => false, 'gevent' => $eid, 'source' => 'Google Calendar', 'dirty' => false ) );
			$added++;
		}
	}
	// Events that were cancelled (still in the window, not done) drop off.
	if ( isset( $d['events'] ) ) {
		$from  = (string) ( $d['from'] ?? '' );
		$todos = array_values( array_filter( $todos, function ( $t ) use ( $seen_e, $from ) {
			return empty( $t['gevent'] ) || isset( $seen_e[ $t['gevent'] ] ) || ! empty( $t['done'] ) || ( $from && (string) $t['due'] < $from );
		} ) );
	}
	// 3. Dream Desk → Google Tasks: what the script should do.
	$create = array();
	$update = array();
	$evup   = array();
	foreach ( $todos as $i => $t ) {
		if ( ! empty( $t['gevent'] ) ) {
			if ( ! empty( $t['dirty'] ) ) {
				$evup[]               = array( 'eid' => $t['gevent'], 'title' => preg_replace( '/^🎂\s*/u', '', $t['text'] ), 'date' => $t['due'], 'time' => $t['time'] );
				$todos[ $i ]['dirty'] = false;
			}
			continue; // calendar items stay on the calendar
		}
		if ( empty( $t['gtask'] ) && empty( $t['done'] ) ) {
			$create[] = array( 'id' => $t['id'], 'title' => $t['text'], 'notes' => $t['note'], 'due' => $t['due'] );
		} elseif ( ! empty( $t['gtask'] ) && ! empty( $t['dirty'] ) ) {
			$update[]            = array( 'gid' => $t['gtask'], 'title' => $t['text'], 'notes' => $t['note'], 'due' => $t['due'], 'done' => ! empty( $t['done'] ) );
			$todos[ $i ]['dirty'] = false;
		}
	}
	$all['todos'] = array_values( $todos );
	update_option( 'dwdpe_data', $all, false );
	$del = array_values( array_unique( $gone ) );
	update_option( 'dwdpe_gone', array(), false );
	$evdel = array_values( array_unique( (array) get_option( 'dwdpe_gone_ev', array() ) ) );
	update_option( 'dwdpe_gone_ev', array(), false );
	update_option( 'dwdpe_last_sync', array( 'at' => current_time( 'mysql' ), 'added' => $added, 'sent' => count( $create ) + count( $update ) ), false );
	return array( 'create' => $create, 'update' => $update, 'delete' => $del, 'event_update' => $evup, 'event_delete' => $evdel );
}

/** After the script creates Google Tasks it reports their ids back. */
function dwdpe_link( $links ) {
	$all = dwdpe_get();
	foreach ( (array) $links as $l ) {
		foreach ( $all['todos'] as $i => $t ) {
			if ( $t['id'] === (string) ( $l['id'] ?? '' ) ) {
				$all['todos'][ $i ]['gtask'] = sanitize_text_field( (string) ( $l['gid'] ?? '' ) );
				$all['todos'][ $i ]['dirty'] = false;
			}
		}
	}
	update_option( 'dwdpe_data', $all, false );
	return array( 'ok' => true );
}

function dwdpe_script() {
	$url = rest_url( 'dwd/v1/personal-sync' );
	$tok = dwdpe_token();
	return <<<JS
// Dream Desk · Personal to-dos <-> Google Tasks & Google Calendar (two-way).
// Before running: click "Services +" on the left and add BOTH "Google Tasks API" and "Google Calendar API".
var DREAM_DESK = '{$url}';
var TOKEN = '{$tok}';

function syncDreamDesk() {
  var tz = Session.getScriptTimeZone();
  var list = Tasks.Tasklists.list().items[0].id, tasks = [], page;
  do {
    var r = Tasks.Tasks.list(list, { showCompleted: true, showHidden: true, maxResults: 100, pageToken: page });
    (r.items || []).forEach(function (t) { tasks.push({ id: t.id, title: t.title, notes: t.notes || '', due: t.due || '', done: t.status === 'completed', updated: t.updated }); });
    page = r.nextPageToken;
  } while (page);
  var now = new Date(), from = Utilities.formatDate(now, tz, 'yyyy-MM-dd'), end = new Date(now.getTime() + 365 * 864e5), events = [];
  page = null;
  do {
    var ev = Calendar.Events.list('primary', { timeMin: new Date(from + 'T00:00:00').toISOString(), timeMax: end.toISOString(), singleEvents: true, orderBy: 'startTime', maxResults: 250, pageToken: page });
    (ev.items || []).forEach(function (e) {
      if (e.status === 'cancelled' || !e.summary) { return; }
      var allDay = !!e.start.date, s = allDay ? null : new Date(e.start.dateTime);
      events.push({ id: e.id, title: e.summary, date: allDay ? e.start.date : Utilities.formatDate(s, tz, 'yyyy-MM-dd'), time: allDay ? '' : Utilities.formatDate(s, tz, 'h:mm a'), notes: e.location || '' });
    });
    page = ev.nextPageToken;
  } while (page);
  var res = call({ tasks: tasks, tasks_complete: true, events: events, from: from });
  var links = [];
  (res.create || []).forEach(function (t) {
    var body = { title: t.title, notes: t.notes || '' };
    if (t.due) { body.due = t.due + 'T00:00:00.000Z'; }
    links.push({ id: t.id, gid: Tasks.Tasks.insert(body, list).id });
  });
  (res.update || []).forEach(function (t) {
    try {
      var g = Tasks.Tasks.get(list, t.gid);
      g.title = t.title; g.notes = t.notes || ''; g.due = t.due ? t.due + 'T00:00:00.000Z' : null;
      g.status = t.done ? 'completed' : 'needsAction'; if (!t.done) { g.completed = null; }
      Tasks.Tasks.update(g, list, t.gid);
    } catch (e) {}
  });
  (res['delete'] || []).forEach(function (gid) { try { Tasks.Tasks.remove(list, gid); } catch (e) {} });
  // Calendar events edited or deleted in Dream Desk.
  (res.event_update || []).forEach(function (u) {
    try {
      var e = Calendar.Events.get('primary', u.eid), patch = { summary: u.title };
      if (e.start.date) {
        var len = (new Date(e.end.date) - new Date(e.start.date)) || 864e5;
        patch.start = { date: u.date }; patch.end = { date: Utilities.formatDate(new Date(new Date(u.date + 'T12:00:00').getTime() + len), tz, 'yyyy-MM-dd') };
      } else {
        var dur = new Date(e.end.dateTime) - new Date(e.start.dateTime), oldStart = new Date(e.start.dateTime);
        var hm = Utilities.formatDate(oldStart, tz, 'HH:mm');
        var m = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/.exec((u.time || '').trim());
        if (m) { var h = +m[1] % 12 + (m[3] && /p/i.test(m[3]) ? 12 : (!m[3] && +m[1] === 12 ? 12 : 0)); hm = ('0' + h).slice(-2) + ':' + m[2]; }
        var ns = new Date(Utilities.formatDate(new Date(u.date + 'T12:00:00'), tz, 'yyyy-MM-dd') + 'T' + hm + ':00' + Utilities.formatDate(new Date(u.date + 'T12:00:00'), tz, 'XXX'));
        patch.start = { dateTime: ns.toISOString(), timeZone: e.start.timeZone || tz }; patch.end = { dateTime: new Date(ns.getTime() + dur).toISOString(), timeZone: e.end.timeZone || tz };
      }
      Calendar.Events.patch(patch, 'primary', u.eid);
    } catch (err) { Logger.log('event update failed ' + u.eid + ' ' + err); }
  });
  (res.event_delete || []).forEach(function (eid) { try { Calendar.Events.remove('primary', eid); } catch (err) {} });
  if (links.length) { call({ links: links }); }
}

function call(payload) {
  var r = UrlFetchApp.fetch(DREAM_DESK, { method: 'post', contentType: 'application/json', headers: { 'X-DWD-Token': TOKEN }, payload: JSON.stringify(payload), muteHttpExceptions: true });
  Logger.log(r.getResponseCode() + ' ' + r.getContentText().slice(0, 500));
  return JSON.parse(r.getContentText() || '{}');
}

// Run this once: it syncs now and then every 15 minutes.
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('syncDreamDesk').timeBased().everyMinutes(15).create();
  syncDreamDesk();
}
JS;
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/personal-sync', array(
		'methods'             => 'POST',
		'permission_callback' => function ( $r ) {
			$t = (string) $r->get_header( 'x_dwd_token' );
			return '' !== $t && hash_equals( dwdpe_token(), $t );
		},
		'callback'            => function ( $r ) {
			$d = (array) $r->get_json_params();
			return isset( $d['links'] ) ? dwdpe_link( $d['links'] ) : dwdpe_sync( $d );
		},
	) );
	register_rest_route( 'dwd/v1', '/crm/personal/google', array(
		'methods'             => 'GET',
		'permission_callback' => function () { return current_user_can( 'manage_options' ); },
		'callback'            => function () { return array( 'script' => dwdpe_script(), 'last' => get_option( 'dwdpe_last_sync', null ) ); },
	) );
} );

/** One-time import of calendar events (admin only): keeps the Google link so the sync won't duplicate them. */
add_action( 'rest_api_init', function () {
	register_rest_route( 'dwd/v1', '/crm/personal/import', array(
		'methods'             => 'POST',
		'permission_callback' => function () { return current_user_can( 'manage_options' ); },
		'callback'            => function ( $r ) {
			$all  = dwdpe_get();
			$have = array();
			foreach ( $all['todos'] as $t ) {
				$have[ $t['gevent'] ? 'e:' . $t['gevent'] : 'x' ] = 1;
				$have[ 't:' . strtolower( trim( $t['text'] ) ) . '|' . $t['due'] ] = 1;
			}
			$n = 0;
			foreach ( (array) ( $r->get_json_params()['items'] ?? array() ) as $x ) {
				$k1 = 'e:' . ( $x['gevent'] ?? '' );
				$k2 = 't:' . strtolower( trim( (string) ( $x['text'] ?? '' ) ) ) . '|' . ( $x['due'] ?? '' );
				if ( isset( $have[ $k1 ] ) || isset( $have[ $k2 ] ) ) {
					continue;
				}
				$have[ $k1 ] = $have[ $k2 ] = 1;
				$all['todos'][] = dwdpe_clean( 'todos', array( 'text' => $x['text'] ?? '', 'due' => $x['due'] ?? '', 'time' => $x['time'] ?? '', 'note' => $x['note'] ?? '', 'gevent' => $x['gevent'] ?? '', 'source' => $x['source'] ?? 'Google Calendar', 'done' => false, 'dirty' => false, 'id' => strtolower( wp_generate_password( 10, false ) ) ) );
				$n++;
			}
			update_option( 'dwdpe_data', $all, false );
			return array( 'added' => $n, 'total' => count( $all['todos'] ) );
		},
	) );
} );
