<?php
/**
 * Google Drive upload folders for client projects.
 *
 * A small Google Apps Script web app (deployed under Mike's Google account) makes the folders:
 * Dream Desk posts { token, name, email } and gets back the folder link. Each folder is named after
 * the client's company, lives inside "Dream Desk – Client folders", and anyone with the link can add files.
 * Folders are made from the project page (Create Drive folder) and automatically when an onboarding form
 * comes in; the client then gets an email asking them to upload their assets there.
 */
defined( 'ABSPATH' ) || exit;

function dwddr_token() {
	$t = (string) get_option( 'dwddr_token', '' );
	if ( '' === $t ) {
		$t = wp_generate_password( 32, false );
		update_option( 'dwddr_token', $t, false );
	}
	return $t;
}
function dwddr_url() { return (string) get_option( 'dwddr_url', '' ); }
function dwddr_ready() { return '' !== dwddr_url(); }

function dwddr_script() {
	$token = dwddr_token();
	return <<<JS
/**
 * Dream Desk – Drive folders. Makes a client upload folder when Dream Desk asks.
 * Deploy: Deploy → New deployment → type "Web app" → Execute as: Me → Who has access: Anyone → Deploy.
 * Copy the Web app URL into Dream Desk → Connections → Google Drive.
 */
var TOKEN = '{$token}';
var PARENT = 'Dream Desk – Client folders';

function doPost(e) {
  var b = {};
  try { b = JSON.parse(e.postData.contents || '{}'); } catch (err) { return out({ error: 'Bad request' }); }
  if (b.token !== TOKEN) { return out({ error: 'Wrong token' }); }
  if (b.ga) { return out(ga_(String(b.ga))); }
  if (b.list) { return out(list_(String(b.list))); }
  if (b.get) { return out(get_(String(b.get))); }
  if (b.ping) { return out({ ok: true, parent: parent_().getUrl() }); }
  var name = String(b.name || 'New client').replace(/[\\/\\\\]/g, '-').slice(0, 120);
  var p = parent_(), it = p.getFoldersByName(name), folder = it.hasNext() ? it.next() : p.createFolder(name);
  var shared = 'link';
  try { folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT); }
  catch (err) { shared = 'none'; }
  if (shared === 'none' && b.email) { try { folder.addEditor(String(b.email)); shared = 'email'; } catch (err2) {} }
  return out({ id: folder.getId(), url: folder.getUrl(), name: folder.getName(), shared: shared });
}
function parent_() { var it = DriveApp.getFoldersByName(PARENT); return it.hasNext() ? it.next() : DriveApp.createFolder(PARENT); }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
/** Files in a client folder and its sub-folders (two levels down), newest first: Dream Desk shows them in the project's Assets box. */
function list_(id) {
  var folder;
  try { folder = DriveApp.getFolderById(id); } catch (err) { return { error: 'That folder was not found' }; }
  var files = [];
  (function walk(f, path, depth) {
    var it = f.getFiles();
    while (it.hasNext() && files.length < 300) {
      var x = it.next();
      files.push({ id: x.getId(), name: x.getName(), path: path, size: x.getSize(), mime: x.getMimeType(), updated: x.getLastUpdated().toISOString(), url: x.getUrl() });
    }
    if (depth < 2) { var sub = f.getFolders(); while (sub.hasNext()) { var s = sub.next(); walk(s, (path ? path + ' / ' : '') + s.getName(), depth + 1); } }
  })(folder, '', 0);
  files.sort(function (a, b) { return a.updated < b.updated ? 1 : -1; });
  return { files: files, version: 3 };
}
/** One file's contents for the AI Instructions zip, even when it isn't shared by link. Google Docs, Sheets and Slides come as PDF. */
function get_(id) {
  var f;
  try { f = DriveApp.getFileById(id); } catch (err) { return { error: 'That file was not found' }; }
  if (f.getSize() > 20 * 1024 * 1024) { return { error: 'too large' }; }
  var mt = f.getMimeType(), google = mt.indexOf('application/vnd.google-apps.') === 0, blob;
  try { blob = google ? f.getAs('application/pdf') : f.getBlob(); } catch (err) { return { error: 'This kind of file can\\'t be downloaded' }; }
  return { name: f.getName() + (google ? '.pdf' : ''), mime: blob.getContentType(), b64: Utilities.base64Encode(blob.getBytes()), version: 3 };
}
/**
 * Google Analytics for the WordPress Dashboard (version 4). Needs the "Google Analytics Data API" service:
 * in this editor, Services (+) → Google Analytics Data API → Add.
 */
function ga_(id) {
  if (typeof AnalyticsData === 'undefined') { return { error: 'Add the Google Analytics Data API service to the script (Services +), then deploy a new version', version: 4 }; }
  var prop = 'properties/' + id.replace(/[^0-9]/g, ''), M = function (n) { return { name: n }; };
  var totals = function (start, end) {
    var r = AnalyticsData.Properties.runReport({ dateRanges: [{ startDate: start, endDate: end }], metrics: [M('activeUsers'), M('sessions'), M('screenPageViews'), M('newUsers'), M('averageSessionDuration')] }, prop);
    var v = r.rows && r.rows[0] ? r.rows[0].metricValues.map(function (x) { return Number(x.value); }) : [0, 0, 0, 0, 0];
    return { users: v[0], sessions: v[1], views: v[2], newUsers: v[3], avgSec: Math.round(v[4]) };
  };
  var top = function (dim, metric, start, n) {
    var r = AnalyticsData.Properties.runReport({ dateRanges: [{ startDate: start, endDate: 'today' }], dimensions: [{ name: dim }], metrics: [M(metric)], orderBys: [{ metric: { metricName: metric }, desc: true }], limit: n }, prop);
    return (r.rows || []).map(function (x) { return { k: x.dimensionValues[0].value, v: Number(x.metricValues[0].value) }; });
  };
  var now = 0;
  try { var rt = AnalyticsData.Properties.runRealtimeReport({ metrics: [M('activeUsers')] }, prop); now = rt.rows && rt.rows[0] ? Number(rt.rows[0].metricValues[0].value) : 0; } catch (e) {}
  var ev = top('eventName', 'eventCount', '30daysAgo', 50), evs = {};
  ev.forEach(function (x) { evs[x.k] = x.v; });
  var ev7 = top('eventName', 'eventCount', '7daysAgo', 50), evs7 = {};
  ev7.forEach(function (x) { evs7[x.k] = x.v; });
  return {
    version: 4, now: now,
    today: totals('today', 'today'), yesterday: totals('yesterday', 'yesterday'),
    d7: totals('7daysAgo', 'today'), p7: totals('14daysAgo', '8daysAgo'),
    d30: totals('30daysAgo', 'today'), p30: totals('60daysAgo', '31daysAgo'),
    pages: top('pagePath', 'screenPageViews', '7daysAgo', 8),
    sources: top('sessionDefaultChannelGroup', 'sessions', '7daysAgo', 6),
    cities: top('city', 'activeUsers', '7daysAgo', 6),
    leads7: evs7.generate_lead || 0, calls7: evs7.phone_call_click || 0,
    leads30: evs.generate_lead || 0, calls30: evs.phone_call_click || 0
  };
}
/** Run once from the editor so Google asks for Drive access. */
function setup() { Logger.log(parent_().getUrl()); }
JS;
}

/** Call the web app. */
function dwddr_call( $body ) {
	$url = dwddr_url();
	if ( ! $url ) {
		return new WP_Error( 'dwddr_off', 'Google Drive isn’t connected yet. Set it up in Connections.' );
	}
	$body['token'] = dwddr_token();
	$r = wp_remote_post( $url, array( 'timeout' => 45, 'redirection' => 5, 'headers' => array( 'Content-Type' => 'application/json' ), 'body' => wp_json_encode( $body ) ) );
	if ( is_wp_error( $r ) ) {
		return $r;
	}
	$j = json_decode( (string) wp_remote_retrieve_body( $r ), true );
	if ( ! is_array( $j ) ) {
		return new WP_Error( 'dwddr_bad', 'Google didn’t answer as expected. Check the web app is deployed with access set to “Anyone”.' );
	}
	if ( ! empty( $j['error'] ) ) {
		return new WP_Error( 'dwddr_err', 'Google Drive: ' . $j['error'] );
	}
	return $j;
}

function dwddr_note( $pid, $text ) {
	$notes   = get_post_meta( $pid, '_dwdc_notes', true );
	$notes   = is_array( $notes ) ? $notes : array();
	$notes[] = array( 'date' => current_time( 'mysql', true ), 'text' => $text );
	update_post_meta( $pid, '_dwdc_notes', $notes );
}

/** Folder name: the company, else the client, else the project. */
function dwddr_name( $pid ) {
	$co = trim( (string) get_post_meta( $pid, '_dwdc_company', true ) );
	if ( '' !== $co ) {
		return $co;
	}
	$cid = (int) get_post_meta( $pid, '_dwdc_client', true );
	$cn  = $cid ? trim( (string) get_the_title( $cid ) ) : '';
	$pn  = trim( (string) get_the_title( $pid ) );
	return $pn ? $pn : ( $cn ? $cn : 'New client' );
}
function dwddr_email_of( $pid ) {
	$em = (string) get_post_meta( $pid, '_dwdc_email', true );
	if ( ! is_email( $em ) ) {
		$cid = (int) get_post_meta( $pid, '_dwdc_client', true );
		$em  = $cid ? (string) get_post_meta( $cid, '_dwdcl_email', true ) : '';
	}
	return is_email( $em ) ? $em : '';
}

/** The folder id inside a Drive folder link. */
function dwddr_folder_id( $url ) {
	return preg_match( '#/folders/([A-Za-z0-9_-]{10,})#', (string) $url, $m ) ? $m[1] : '';
}

/**
 * What the client has put in the project's Drive folder, for the Assets box. Asked from the web app
 * (action "list") and kept for 5 minutes in _dwdc_drive_files. state: ok | none (no folder) |
 * update (the deployed script is the old one without "list") | error.
 */
function dwddr_files( $pid, $force = false ) {
	$fid = dwddr_folder_id( get_post_meta( $pid, '_dwdc_drive', true ) );
	if ( '' === $fid || ! dwddr_ready() ) {
		return array( 'state' => 'none', 'files' => array() );
	}
	$c = get_post_meta( $pid, '_dwdc_drive_files', true );
	$c = is_array( $c ) && isset( $c['files'] ) && ( $c['fid'] ?? '' ) === $fid ? $c : null;
	if ( $c && ! $force && time() - (int) $c['at'] < 5 * MINUTE_IN_SECONDS ) {
		return array( 'state' => 'ok', 'files' => $c['files'], 'at' => (int) $c['at'] );
	}
	$j = dwddr_call( array( 'list' => $fid, 'ping' => 1 ) ); // "ping" keeps an old script from doing anything but answer
	if ( is_wp_error( $j ) ) {
		return array( 'state' => 'error', 'error' => $j->get_error_message(), 'files' => $c ? $c['files'] : array(), 'at' => $c ? (int) $c['at'] : 0 );
	}
	if ( ! isset( $j['files'] ) || ! is_array( $j['files'] ) ) {
		return array( 'state' => 'update', 'files' => array() );
	}
	update_option( 'dwddr_ver', (int) ( $j['version'] ?? 2 ), false ); // 3+ can hand over private files and Google Docs
	$files = array();
	foreach ( $j['files'] as $x ) {
		$id = preg_replace( '/[^A-Za-z0-9_-]/', '', (string) ( $x['id'] ?? '' ) );
		if ( '' === $id ) {
			continue;
		}
		$mime    = sanitize_text_field( (string) ( $x['mime'] ?? '' ) );
		$files[] = array(
			'id'      => $id,
			'name'    => sanitize_text_field( (string) ( $x['name'] ?? '' ) ),
			'path'    => sanitize_text_field( (string) ( $x['path'] ?? '' ) ),
			'size'    => (int) ( $x['size'] ?? 0 ),
			'updated' => sanitize_text_field( (string) ( $x['updated'] ?? '' ) ),
			'url'     => esc_url_raw( (string) ( $x['url'] ?? '' ) ),
			'dl'      => 'https://drive.google.com/uc?export=download&id=' . $id,
			'thumb'   => 0 === strpos( $mime, 'image/' ) ? 'https://drive.google.com/thumbnail?id=' . $id . '&sz=w300' : '',
		);
	}
	$at = time();
	update_post_meta( $pid, '_dwdc_drive_files', array( 'fid' => $fid, 'at' => $at, 'files' => $files ) );
	return array( 'state' => 'ok', 'files' => $files, 'at' => $at );
}

/**
 * One Drive file's contents through the web app (works for private files; Google Docs, Sheets and Slides come
 * back as PDF). array( name, mime, bytes ) or WP_Error ('dwddr_update' when the deployed script is older).
 */
function dwddr_get( $file_id ) {
	$j = dwddr_call( array( 'get' => preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $file_id ), 'ping' => 1 ) );
	if ( is_wp_error( $j ) ) {
		return $j;
	}
	if ( ! isset( $j['b64'] ) ) {
		return new WP_Error( 'dwddr_update', ! empty( $j['error'] ) ? (string) $j['error'] : 'The Drive script needs updating to hand over files.' );
	}
	$bytes = base64_decode( (string) $j['b64'], true ); // phpcs:ignore
	if ( false === $bytes || '' === $bytes ) {
		return new WP_Error( 'dwddr_bad', 'The file came back empty.' );
	}
	return array( 'name' => sanitize_file_name( (string) ( $j['name'] ?? 'file' ) ), 'mime' => (string) ( $j['mime'] ?? '' ), 'bytes' => $bytes );
}

/** Make (or reuse) the project's folder. Returns the link or WP_Error. */
function dwddr_create( $pid ) {
	$have = (string) get_post_meta( $pid, '_dwdc_drive', true );
	if ( $have ) {
		return $have;
	}
	$j = dwddr_call( array( 'name' => dwddr_name( $pid ), 'email' => dwddr_email_of( $pid ) ) );
	if ( is_wp_error( $j ) ) {
		return $j;
	}
	$url = esc_url_raw( (string) ( $j['url'] ?? '' ) );
	if ( ! $url ) {
		return new WP_Error( 'dwddr_nourl', 'Google Drive didn’t return a folder link.' );
	}
	update_post_meta( $pid, '_dwdc_drive', $url );
	dwddr_note( $pid, 'Google Drive folder created: ' . ( $j['name'] ?? '' ) . ( 'link' === ( $j['shared'] ?? '' ) ? ' (anyone with the link can upload).' : ( 'email' === ( $j['shared'] ?? '' ) ? ' (shared with the client’s email).' : ' (sharing is limited by your Google settings; share it by hand).' ) ) );
	return $url;
}

/** Email the client their upload folder. */
function dwddr_send( $pid ) {
	$url   = (string) get_post_meta( $pid, '_dwdc_drive', true );
	$email = dwddr_email_of( $pid );
	if ( ! $url ) {
		return new WP_Error( 'dwddr_none', 'Create the Drive folder first.' );
	}
	if ( ! $email ) {
		return new WP_Error( 'dwddr_noemail', 'There’s no email on this project. Add one in Details first.' );
	}
	$person = trim( (string) get_post_meta( $pid, '_dwdc_person', true ) );
	$first  = $person ? strtok( $person, ' ' ) : '';
	$html   = dwdp_email_html( array(
		'eyebrow' => 'Your project folder',
		'title'   => 'Upload your files for ' . dwddr_name( $pid ),
		'intro'   => 'Hi' . ( $first ? ' ' . esc_html( $first ) : ' there' ) . ',<br><br>Thanks for sending over your details. This is your own Google Drive folder for the website. If you forgot any files, or need to add more later, upload them here any time and I’ll see them right away.<br><br>'
			. 'Things that help most:<br><br>• Your logo (the original files if you have them: AI, EPS, SVG or a large PNG)<br>• Photos of your work, team, location and products<br>• Brand colors, fonts or a brand guide<br>• Any text you’ve written: about us, services, bios, reviews<br><br>'
			. 'Click the button below and drag your files into the folder. If Google asks you to sign in, any Google account works.',
		'buttons' => array( array( 'Open your upload folder', $url ) ),
		'outro'   => 'Questions? Just reply to this email.<br>Michael Tarr, Dream Web Digital',
		'footer'  => 'Dream Web Digital ·',
	) );
	$html = str_replace( 'padding:14px 26px;border-radius:8px;font-size:13px', 'padding:20px 44px;border-radius:10px;font-size:16px', $html );
	$sent = wp_mail( $email, 'Your upload folder for your new website', $html, array( 'Content-Type: text/html; charset=UTF-8', 'Reply-To: Michael Tarr <mike@dreamwebdigital.com>', 'X-DWD-Own: 1' ) );
	if ( ! $sent ) {
		return new WP_Error( 'dwddr_mail', 'The email didn’t send.' );
	}
	update_post_meta( $pid, '_dwdc_drive_sent', current_time( 'Y-m-d' ) );
	dwddr_note( $pid, 'Drive upload link emailed to ' . $email . '.' );
	return $email;
}

/** Let Mike know a client's Drive folder is ready, with the link. */
function dwddr_tell_mike( $pid, $url, $sent_to = '' ) {
	$name = dwddr_name( $pid );
	$html = dwdp_email_html( array(
		'eyebrow' => 'Google Drive',
		'title'   => 'Drive folder ready: ' . $name,
		'intro'   => 'A Google Drive upload folder was made for <strong>' . esc_html( $name ) . '</strong> after their onboarding form came in.<br><br>'
			. ( $sent_to ? 'The upload link was emailed to ' . esc_html( $sent_to ) . '.' : 'The upload link was <strong>not</strong> emailed to the client (no email on the project). Copy it from the button below.' )
			. '<br><br>Folder link: <a href="' . esc_url( $url ) . '">' . esc_html( $url ) . '</a>',
		'buttons' => array( array( 'Open the folder', $url ), array( 'Open in Dream Desk', admin_url( 'admin.php?page=client-desk#client/' . $pid ) ) ),
		'footer'  => 'Dream Web Digital ·',
	) );
	wp_mail( 'mike@dreamwebdigital.com', 'Drive folder ready: ' . $name, $html, array( 'Content-Type: text/html; charset=UTF-8', 'X-DWD-Own: 1' ) );
}

/* Automatic: when an onboarding form comes in, make the folder and email the client (in the background). */
add_action( 'dwdc_entry_filed', function ( $cid, $form ) {
	if ( dwddr_ready() && $cid && false !== stripos( (string) $form, 'onboard' ) ) {
		wp_schedule_single_event( time() + 5, 'dwddr_auto', array( (int) $cid ) );
		spawn_cron();
	}
}, 10, 2 );
add_action( 'dwddr_auto', function ( $pid ) {
	if ( (string) get_post_meta( $pid, '_dwdc_drive_sent', true ) ) {
		return;
	}
	$u = dwddr_create( $pid );
	if ( is_wp_error( $u ) ) {
		dwddr_note( $pid, 'Couldn’t make the Google Drive folder automatically: ' . $u->get_error_message() );
		return;
	}
	$s = dwddr_send( $pid );
	if ( is_wp_error( $s ) ) {
		dwddr_note( $pid, 'Drive folder made, but the upload email wasn’t sent: ' . $s->get_error_message() );
	}
	dwddr_tell_mike( $pid, $u, is_wp_error( $s ) ? '' : $s );
} );

add_action( 'rest_api_init', function () {
	$can = function () { return current_user_can( 'edit_posts' ); };
	register_rest_route( 'dwd/v1', '/crm/drive', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () {
			return array( 'ready' => dwddr_ready(), 'url' => dwddr_url(), 'script' => dwddr_script(), 'ver' => (int) get_option( 'dwddr_ver', 0 ) );
		} ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
			$u = trim( (string) $r->get_param( 'url' ) );
			if ( '' === $u ) {
				delete_option( 'dwddr_url' );
				return array( 'ready' => false );
			}
			if ( ! preg_match( '#^https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec$#', $u ) ) {
				return new WP_Error( 'dwddr_url', 'That isn’t a web app link. It should look like https://script.google.com/macros/s/…/exec', array( 'status' => 400 ) );
			}
			update_option( 'dwddr_url', $u, false );
			$t = dwddr_call( array( 'ping' => 1 ) );
			if ( is_wp_error( $t ) ) {
				delete_option( 'dwddr_url' );
				return new WP_Error( 'dwddr_test', $t->get_error_message(), array( 'status' => 400 ) );
			}
			return array( 'ready' => true, 'parent' => $t['parent'] ?? '' );
		} ),
	) );
	// The Assets box: files the client added to the project's Drive folder (?fresh=1 skips the 5-minute cache).
	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/drive-files', array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function ( $r ) {
		return dwddr_files( (int) $r['id'], (bool) $r->get_param( 'fresh' ) );
	} ) );
	register_rest_route( 'dwd/v1', '/crm/contact/(?P<id>\d+)/drive', array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( $r ) {
		$pid = (int) $r['id'];
		$u   = dwddr_create( $pid );
		if ( is_wp_error( $u ) ) {
			return new WP_Error( 'dwddr', $u->get_error_message(), array( 'status' => 400 ) );
		}
		$sent = '';
		if ( $r->get_param( 'email' ) ) {
			$s = dwddr_send( $pid );
			if ( is_wp_error( $s ) ) {
				return array( 'project' => dwdc_contact( $pid, true ), 'warn' => $s->get_error_message() );
			}
			$sent = $s;
		}
		return array( 'project' => dwdc_contact( $pid, true ), 'sent' => $sent );
	} ) );
} );
