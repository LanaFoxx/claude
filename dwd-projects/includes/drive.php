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
		'intro'   => 'Hi' . ( $first ? ' ' . esc_html( $first ) : ' there' ) . ',<br><br>I made a Google Drive folder just for your website. Please upload everything you’d like me to use, for example:<br><br>'
			. '• Your logo (the original files if you have them: AI, EPS, SVG or a large PNG)<br>• Photos of your work, team, location and products<br>• Brand colors, fonts or a brand guide<br>• Any text you’ve written: about us, services, bios, reviews<br>• Anything else you’d like on the site<br><br>'
			. 'Click the button below and drag your files into the folder. If Google asks you to sign in, any Google account works. You can add more files any time.',
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
			return array( 'ready' => dwddr_ready(), 'url' => dwddr_url(), 'script' => dwddr_script() );
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
