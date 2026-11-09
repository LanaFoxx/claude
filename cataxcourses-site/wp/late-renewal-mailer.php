/**
 * CTC late-renewal mailer (Code Snippets, scope: global).
 *
 * Every day until Jan 15, 2027 (10:00 am Pacific): tags anyone who bought the 2026 CTEC 20 Hour course as
 * "Renewed 2026" in Mailchimp, then copies the late-renewal campaign and sends it to the audience minus that tag.
 * Uses the Mailchimp connection of the Mailchimp for WooCommerce plugin. WooCommerce > Late-Renewal Emails shows the
 * log and has Pause / Resume.
 */
function ctc_lr_mc_conn() {
	$o    = get_option( 'mailchimp-woocommerce', array() );
	$key  = function_exists( 'mailchimp_get_api_key' ) ? mailchimp_get_api_key() : ( $o['mailchimp_api_key'] ?? '' );
	$list = function_exists( 'mailchimp_get_list_id' ) ? mailchimp_get_list_id() : ( $o['mailchimp_list'] ?? '' );
	if ( ! $key || false === strpos( $key, '-' ) ) return null;
	return array( 'key' => $key, 'list' => $list, 'base' => 'https://' . substr( $key, strrpos( $key, '-' ) + 1 ) . '.api.mailchimp.com/3.0/' );
}
function ctc_lr_mc( $method, $path, $body = null ) {
	$c = ctc_lr_mc_conn();
	if ( ! $c ) return array( 'error' => 'Mailchimp is not connected' );
	$args = array( 'method' => $method, 'timeout' => 45, 'headers' => array( 'Authorization' => 'Basic ' . base64_encode( 'ctc:' . $c['key'] ), 'Content-Type' => 'application/json' ) );
	if ( null !== $body ) $args['body'] = wp_json_encode( $body );
	$r = wp_remote_request( $c['base'] . ltrim( $path, '/' ), $args );
	if ( is_wp_error( $r ) ) return array( 'error' => $r->get_error_message() );
	$code = wp_remote_retrieve_response_code( $r );
	$j    = json_decode( wp_remote_retrieve_body( $r ), true );
	if ( $code >= 300 ) return array( 'error' => ( $j['title'] ?? 'HTTP ' . $code ) . ': ' . ( $j['detail'] ?? '' ), 'status' => $code, 'errors' => $j['errors'] ?? null );
	return is_array( $j ) ? $j : array( 'ok' => true, 'status' => $code );
}

// Read-only look (site admins): /wp-admin/?ctc_lr=probe
add_action( 'admin_init', function () {
	if ( 'probe' !== ( $_GET['ctc_lr'] ?? '' ) || ! current_user_can( 'manage_options' ) ) return;
	$c   = ctc_lr_mc_conn();
	$out = array( 'connected' => (bool) $c, 'list' => $c['list'] ?? '' );
	$camps = ctc_lr_mc( 'GET', 'campaigns?count=12&sort_field=create_time&sort_dir=DESC&fields=campaigns.id,campaigns.web_id,campaigns.status,campaigns.create_time,campaigns.send_time,campaigns.emails_sent,campaigns.recipients.list_id,campaigns.recipients.list_name,campaigns.recipients.segment_text,campaigns.recipients.recipient_count,campaigns.settings.title,campaigns.settings.subject_line,campaigns.settings.preview_text,campaigns.settings.from_name,campaigns.settings.reply_to,campaigns.content_type' );
	$out['campaigns'] = $camps['campaigns'] ?? $camps;
	$lists = ctc_lr_mc( 'GET', 'lists?fields=lists.id,lists.name,lists.stats.member_count,lists.stats.unsubscribe_count' );
	$out['lists'] = $lists['lists'] ?? $lists;
	if ( ! empty( $c['list'] ) ) {
		$tags = ctc_lr_mc( 'GET', 'lists/' . $c['list'] . '/segments?type=static&count=60&fields=segments.id,segments.name,segments.member_count' );
		$out['tags'] = $tags['segments'] ?? $tags;
	}
	wp_send_json( $out );
} );
// Read-only details (site admins): /wp-admin/?ctc_lr=detail&id=CAMPAIGN_ID
add_action( 'admin_init', function () {
	if ( 'detail' !== ( $_GET['ctc_lr'] ?? '' ) || ! current_user_can( 'manage_options' ) ) return;
	$id  = sanitize_key( $_GET['id'] ?? '' );
	$c   = ctc_lr_mc( 'GET', 'campaigns/' . $id );
	$out = array( 'status' => $c['status'] ?? '', 'send_time' => $c['send_time'] ?? '', 'settings' => array_intersect_key( (array) ( $c['settings'] ?? array() ), array_flip( array( 'title', 'subject_line', 'preview_text', 'from_name', 'reply_to', 'template_id' ) ) ),
		'recipients' => $c['recipients'] ?? null, 'error' => $c['error'] ?? null );
	$html = ctc_lr_mc( 'GET', 'campaigns/' . $id . '/content?fields=html' );
	$h    = (string) ( $html['html'] ?? '' );
	$out['content'] = array( 'length' => strlen( $h ), 'has_jan15' => false !== strpos( $h, 'January 15, 2027' ), 'has_early2026' => false !== strpos( $h, 'EARLY2026' ), 'title_tag' => preg_match( '#<title>(.*?)</title>#', $h, $m ) ? $m[1] : '' );
	if ( 'sent' === ( $c['status'] ?? '' ) ) {
		$r = ctc_lr_mc( 'GET', 'reports/' . $id . '?fields=emails_sent,unsubscribed,abuse_reports,bounces,opens.unique_opens,opens.open_rate,clicks.unique_subscriber_clicks' );
		$out['report'] = $r;
	}
	wp_send_json( $out );
} );

/* ---------------------------------------------------------------- settings */
define( 'CTC_LR_TEMPLATE', 'bf9bd88718' );          // the late-renewal campaign (Jan 15 deadline) that is copied each time
define( 'CTC_LR_FIRST', '2026-11-11' );             // first automated send (Pacific); then every other day
define( 'CTC_LR_LAST', '2027-01-15' );              // last send (always included)
define( 'CTC_LR_HOUR', 13 );                        // send at 1 pm Pacific
define( 'CTC_LR_REPLY_TO', 'help@cataxcourses.com' );
define( 'CTC_LR_TAG_RENEWED', 'Renewed 2026' );
define( 'CTC_LR_TAG_OPENED', 'Opened late-renewal (5 days)' );
define( 'CTC_LR_OPEN_WINDOW', 5 * DAY_IN_SECONDS );
define( 'CTC_LR_MAX_UNSUB', 0.01 );                 // stop when a send gets 1% unsubscribes
define( 'CTC_LR_MAX_ABUSE', 0.0008 );               // ... or 0.08% spam complaints (Mailchimp warns around 0.1%)
define( 'CTC_LR_MAX_HARD', 0.02 );                  // ... or 2% hard bounces

function ctc_lr_tz() { return new DateTimeZone( 'America/Los_Angeles' ); }
function ctc_lr_send_days() {
	$days = array();
	$d    = new DateTime( CTC_LR_FIRST, ctc_lr_tz() );
	$last = new DateTime( CTC_LR_LAST, ctc_lr_tz() );
	while ( $d <= $last ) { $days[] = $d->format( 'Y-m-d' ); $d->modify( '+2 days' ); }
	if ( ! in_array( CTC_LR_LAST, $days, true ) ) $days[] = CTC_LR_LAST;
	return $days;
}
function ctc_lr_state() { return wp_parse_args( get_option( 'ctc_lr_state', array() ), array( 'paused' => false, 'paused_reason' => '', 'sent' => array(), 'log' => array() ) ); }
function ctc_lr_save( $s ) { $s['log'] = array_slice( $s['log'], -120 ); update_option( 'ctc_lr_state', $s, false ); }
function ctc_lr_log( &$s, $msg ) { $s['log'][] = wp_date( 'M j g:i a', null, ctc_lr_tz() ) . ' — ' . $msg; }

/* ---------------------------------------------------------------- tags */
function ctc_lr_tag_id( $name ) {
	$c = ctc_lr_mc_conn();
	foreach ( (array) ( ctc_lr_mc( 'GET', 'lists/' . $c['list'] . '/segments?type=static&count=200&fields=segments.id,segments.name' )['segments'] ?? array() ) as $seg ) {
		if ( $seg['name'] === $name ) return (int) $seg['id'];
	}
	$new = ctc_lr_mc( 'POST', 'lists/' . $c['list'] . '/segments', array( 'name' => $name, 'static_segment' => array() ) );
	return (int) ( $new['id'] ?? 0 );
}
function ctc_lr_tag_members( $tag ) {
	$c = ctc_lr_mc_conn(); $out = array(); $offset = 0;
	do {
		$r = ctc_lr_mc( 'GET', 'lists/' . $c['list'] . '/segments/' . $tag . '/members?count=1000&offset=' . $offset . '&fields=members.email_address,total_items' );
		foreach ( (array) ( $r['members'] ?? array() ) as $m ) $out[ strtolower( $m['email_address'] ) ] = true;
		$offset += 1000;
	} while ( ! empty( $r['members'] ) && $offset < (int) ( $r['total_items'] ?? 0 ) && $offset < 100000 );
	return $out;
}
function ctc_lr_tag_change( $tag, $add, $remove ) {
	$c = ctc_lr_mc_conn(); $n = 0;
	foreach ( array_chunk( array_values( $add ), 500 ) as $chunk ) { ctc_lr_mc( 'POST', 'lists/' . $c['list'] . '/segments/' . $tag, array( 'members_to_add' => $chunk ) ); $n += count( $chunk ); }
	foreach ( array_chunk( array_values( $remove ), 500 ) as $chunk ) ctc_lr_mc( 'POST', 'lists/' . $c['list'] . '/segments/' . $tag, array( 'members_to_remove' => $chunk ) );
	return $n;
}
// Everyone who bought the 2026 CTEC 20 Hour course (or the auto-renewal plan) since Jan 15, 2026.
function ctc_lr_renewed_emails() {
	$emails = array();
	$ids = wc_get_orders( array( 'limit' => -1, 'return' => 'ids', 'type' => 'shop_order', 'status' => array( 'processing', 'completed' ), 'date_created' => '>=' . strtotime( '2026-01-15' ) ) );
	foreach ( $ids as $id ) {
		$o = wc_get_order( $id );
		if ( ! $o ) continue;
		foreach ( $o->get_items() as $it ) {
			if ( in_array( (int) $it->get_product_id(), array( 48, 30511 ), true ) ) { $emails[ strtolower( $o->get_billing_email() ) ] = true; break; }
		}
	}
	return array_keys( array_filter( $emails ) );
}
// Everyone who opened a late-renewal / renewal email in the last 5 days.
function ctc_lr_recent_openers() {
	$c = ctc_lr_mc_conn(); $since = time() - CTC_LR_OPEN_WINDOW; $out = array();
	$camps = ctc_lr_mc( 'GET', 'campaigns?status=sent&list_id=' . $c['list'] . '&since_send_time=' . rawurlencode( gmdate( 'c', $since - 2 * DAY_IN_SECONDS ) ) . '&count=50&fields=campaigns.id,campaigns.send_time' );
	foreach ( (array) ( $camps['campaigns'] ?? array() ) as $cp ) {
		$offset = 0;
		do {
			$r = ctc_lr_mc( 'GET', 'reports/' . $cp['id'] . '/open-details?count=1000&offset=' . $offset . '&since=' . rawurlencode( gmdate( 'c', $since ) ) . '&fields=members.email_address,total_items' );
			foreach ( (array) ( $r['members'] ?? array() ) as $m ) $out[ strtolower( $m['email_address'] ) ] = true;
			$offset += 1000;
		} while ( ! empty( $r['members'] ) && $offset < (int) ( $r['total_items'] ?? 0 ) && $offset < 100000 );
	}
	return $out;
}

/* ---------------------------------------------------------------- one run */
// $dry = true builds the tags and a draft copy (not sent) and reports how many people it would go to.
function ctc_lr_run( $dry = false ) {
	@set_time_limit( 900 );
	$s   = ctc_lr_state();
	$c   = ctc_lr_mc_conn();
	if ( ! $c ) return 'Mailchimp is not connected';
	// 1. Safety check on the previous automated send.
	$last = end( $s['sent'] );
	if ( $last && ! $dry ) {
		$r = ctc_lr_mc( 'GET', 'reports/' . $last['id'] . '?fields=emails_sent,unsubscribed,abuse_reports,bounces' );
		$n = max( 1, (int) ( $r['emails_sent'] ?? 0 ) );
		$u = (int) ( $r['unsubscribed'] ?? 0 ) / $n; $a = (int) ( $r['abuse_reports'] ?? 0 ) / $n; $h = (int) ( $r['bounces']['hard_bounces'] ?? 0 ) / $n;
		ctc_lr_log( $s, sprintf( 'Previous send %s: %d sent, %.2f%% unsubscribed, %.3f%% spam complaints, %.2f%% hard bounces.', $last['date'], $n, $u * 100, $a * 100, $h * 100 ) );
		if ( $u >= CTC_LR_MAX_UNSUB || $a >= CTC_LR_MAX_ABUSE || $h >= CTC_LR_MAX_HARD ) {
			$s['paused'] = true;
			$s['paused_reason'] = sprintf( 'Stopped automatically after the %s send: %.2f%% unsubscribed, %.3f%% spam complaints, %.2f%% hard bounces.', $last['date'], $u * 100, $a * 100, $h * 100 );
			ctc_lr_log( $s, $s['paused_reason'] ); ctc_lr_save( $s );
			wp_mail( get_option( 'admin_email' ), 'Late-renewal emails STOPPED automatically', $s['paused_reason'] . "\n\nNothing more will be sent until you click Resume: " . admin_url( 'admin.php?page=ctc-late-renewal' ) );
			return $s['paused_reason'];
		}
	}
	// 2. Tags: renewed students, recent openers.
	$renewed_tag = ctc_lr_tag_id( CTC_LR_TAG_RENEWED );
	$opened_tag  = ctc_lr_tag_id( CTC_LR_TAG_OPENED );
	if ( ! $renewed_tag || ! $opened_tag ) { ctc_lr_log( $s, 'Could not create the Mailchimp tags; nothing sent.' ); ctc_lr_save( $s ); return 'tag error'; }
	$have = ctc_lr_tag_members( $renewed_tag );
	$add  = array_diff( ctc_lr_renewed_emails(), array_keys( $have ) );
	$added_renewed = ctc_lr_tag_change( $renewed_tag, $add, array() );
	$open_now  = ctc_lr_recent_openers();
	$open_have = ctc_lr_tag_members( $opened_tag );
	ctc_lr_tag_change( $opened_tag, array_keys( array_diff_key( $open_now, $open_have ) ), array_keys( array_diff_key( $open_have, $open_now ) ) );
	// 3. Copy the campaign, set its audience (list minus both tags) and reply-to.
	$copy = ctc_lr_mc( 'POST', 'campaigns/' . CTC_LR_TEMPLATE . '/actions/replicate' );
	if ( empty( $copy['id'] ) ) { ctc_lr_log( $s, 'Could not copy the campaign: ' . ( $copy['error'] ?? '' ) ); ctc_lr_save( $s ); return 'replicate error'; }
	$today = wp_date( 'Y-m-d', null, ctc_lr_tz() );
	$upd = ctc_lr_mc( 'PATCH', 'campaigns/' . $copy['id'], array(
		'settings'   => array( 'title' => 'Late renewal reminder ' . $today . ( $dry ? ' (test draft)' : '' ), 'reply_to' => CTC_LR_REPLY_TO,
			'subject_line' => 'Missed the CTEC Deadline? You Can Still Renew', 'preview_text' => 'Late renewals are open through January 15, 2027. A late fee applies.', 'from_name' => 'California Tax Courses' ),
		'recipients' => array( 'list_id' => $c['list'], 'segment_opts' => array( 'match' => 'all', 'conditions' => array(
			array( 'condition_type' => 'StaticSegment', 'field' => 'static_segment', 'op' => 'static_not', 'value' => $renewed_tag ),
			array( 'condition_type' => 'StaticSegment', 'field' => 'static_segment', 'op' => 'static_not', 'value' => $opened_tag ),
		) ) ),
	) );
	if ( ! empty( $upd['error'] ) ) { ctc_lr_log( $s, 'Could not set up the copy: ' . $upd['error'] ); ctc_lr_save( $s ); return 'update error'; }
	$count = (int) ( $upd['recipients']['recipient_count'] ?? 0 );
	$summary = sprintf( '%d recipients (renewed tagged: %d, %d newly; opened in last 5 days: %d)', $count, count( $have ) + $added_renewed, $added_renewed, count( $open_now ) );
	if ( $dry ) { ctc_lr_log( $s, 'Test draft created, not sent: ' . $summary ); ctc_lr_save( $s ); return array( 'draft' => $copy['id'], 'summary' => $summary ); }
	$check = ctc_lr_mc( 'GET', 'campaigns/' . $copy['id'] . '/send-checklist' );
	if ( empty( $check['is_ready'] ) ) { ctc_lr_log( $s, 'Copy not ready to send: ' . wp_json_encode( $check['items'] ?? $check ) ); ctc_lr_save( $s ); return 'not ready'; }
	$sent = ctc_lr_mc( 'POST', 'campaigns/' . $copy['id'] . '/actions/send' );
	if ( ! empty( $sent['error'] ) ) { ctc_lr_log( $s, 'Send failed: ' . $sent['error'] ); ctc_lr_save( $s ); return 'send error'; }
	$s['sent'][] = array( 'date' => $today, 'id' => $copy['id'], 'recipients' => $count );
	ctc_lr_log( $s, 'Sent: ' . $summary );
	ctc_lr_save( $s );
	return $summary;
}

/* ---------------------------------------------------------------- schedule (checked hourly) */
add_action( 'init', function () {
	if ( ! wp_next_scheduled( 'ctc_lr_tick' ) && time() < strtotime( CTC_LR_LAST . ' 23:59 America/Los_Angeles' ) ) wp_schedule_event( time() + 300, 'hourly', 'ctc_lr_tick' );
} );
add_action( 'ctc_lr_tick', function () {
	$s = ctc_lr_state();
	if ( $s['paused'] ) return;
	$now   = new DateTime( 'now', ctc_lr_tz() );
	$today = $now->format( 'Y-m-d' );
	if ( $today > CTC_LR_LAST ) { wp_clear_scheduled_hook( 'ctc_lr_tick' ); return; }
	if ( ! in_array( $today, ctc_lr_send_days(), true ) || (int) $now->format( 'G' ) < CTC_LR_HOUR ) return;
	foreach ( $s['sent'] as $x ) if ( $x['date'] === $today ) return; // already sent today
	if ( get_transient( 'ctc_lr_running' ) ) return;
	set_transient( 'ctc_lr_running', 1, HOUR_IN_SECONDS );
	ctc_lr_run();
	delete_transient( 'ctc_lr_running' );
} );

/* ---------------------------------------------------------------- admin page */
add_action( 'admin_menu', function () {
	add_submenu_page( 'woocommerce', 'Late-Renewal Emails', 'Late-Renewal Emails', 'manage_woocommerce', 'ctc-late-renewal', function () {
		$s = ctc_lr_state();
		if ( isset( $_POST['ctc_lr_act'] ) && check_admin_referer( 'ctc_lr' ) ) {
			$a = sanitize_key( $_POST['ctc_lr_act'] );
			if ( 'pause' === $a ) { $s['paused'] = true; $s['paused_reason'] = 'Paused by ' . wp_get_current_user()->display_name . '.'; ctc_lr_log( $s, $s['paused_reason'] ); }
			if ( 'resume' === $a ) { $s['paused'] = false; $s['paused_reason'] = ''; ctc_lr_log( $s, 'Resumed by ' . wp_get_current_user()->display_name . '.' ); }
			ctc_lr_save( $s );
		}
		$days = ctc_lr_send_days(); $today = wp_date( 'Y-m-d', null, ctc_lr_tz() );
		$next = ''; foreach ( $days as $d ) if ( $d >= $today && ! in_array( $d, wp_list_pluck( $s['sent'], 'date' ), true ) ) { $next = $d; break; }
		echo '<div class="wrap"><h1>Late-Renewal Emails</h1><p>Every other day at 1 pm Pacific until January 15, 2027, Mailchimp sends "Missed the CTEC Deadline? You Can Still Renew" to the CTEC list, '
			. 'except students who already bought the 2026 20 Hour course (tag <em>' . esc_html( CTC_LR_TAG_RENEWED ) . '</em>) and anyone who opened one of these emails in the last 5 days (tag <em>' . esc_html( CTC_LR_TAG_OPENED ) . '</em>). '
			. 'It stops by itself if a send reaches 1% unsubscribes, 0.08% spam complaints or 2% hard bounces.</p>';
		echo '<p><strong>Status:</strong> ' . ( $s['paused'] ? '<span style="color:#b32d2e">Paused</span> — ' . esc_html( $s['paused_reason'] ) : '<span style="color:#1a7f37">Running</span> · next send ' . esc_html( $next ? wp_date( 'D, M j', strtotime( $next ) ) . ' at 1 pm Pacific' : 'none (finished)' ) ) . '</p>';
		echo '<form method="post">'; wp_nonce_field( 'ctc_lr' ); echo '<button class="button button-primary" name="ctc_lr_act" value="' . ( $s['paused'] ? 'resume' : 'pause' ) . '">' . ( $s['paused'] ? 'Resume' : 'Pause' ) . '</button></form>';
		echo '<h2>Sends</h2><table class="widefat striped"><thead><tr><th>Date</th><th>Recipients</th><th>Mailchimp</th></tr></thead><tbody>';
		foreach ( array_reverse( $s['sent'] ) as $x ) echo '<tr><td>' . esc_html( $x['date'] ) . '</td><td>' . (int) $x['recipients'] . '</td><td><a target="_blank" href="https://us1.admin.mailchimp.com/campaigns/">' . esc_html( $x['id'] ) . '</a></td></tr>';
		if ( ! $s['sent'] ) echo '<tr><td colspan="3">No automated sends yet. First send: ' . esc_html( wp_date( 'D, M j', strtotime( CTC_LR_FIRST ) ) ) . '.</td></tr>';
		echo '</tbody></table><h2>Log</h2><pre style="background:#fff;padding:12px;max-height:400px;overflow:auto">' . esc_html( implode( "\n", array_reverse( $s['log'] ) ) ) . '</pre></div>';
	} );
}, 60 );

// Test run (site admins): /wp-admin/?ctc_lr=dry builds the tags and a draft copy without sending.
add_action( 'admin_init', function () {
	if ( 'dry' !== ( $_GET['ctc_lr'] ?? '' ) || ! current_user_can( 'manage_options' ) ) return;
	wp_send_json( ctc_lr_run( true ) );
} );
// Delete a test draft (site admins): /wp-admin/?ctc_lr=deldraft&id=ID — only drafts titled "(test draft)".
add_action( 'admin_init', function () {
	if ( 'deldraft' !== ( $_GET['ctc_lr'] ?? '' ) || ! current_user_can( 'manage_options' ) ) return;
	$id = sanitize_key( $_GET['id'] ?? '' );
	$c  = ctc_lr_mc( 'GET', 'campaigns/' . $id . '?fields=status,settings.title' );
	if ( 'save' !== ( $c['status'] ?? '' ) || false === strpos( $c['settings']['title'] ?? '', '(test draft)' ) ) wp_send_json( array( 'error' => 'not a test draft' ) );
	wp_send_json( ctc_lr_mc( 'DELETE', 'campaigns/' . $id ) );
} );
