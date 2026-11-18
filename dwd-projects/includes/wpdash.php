<?php
/**
 * The WordPress Dashboard (wp-admin/index.php) as an at-a-glance page: Google Analytics, new leads, recent sales,
 * money, today's to-dos and connection health, in standard WordPress boxes. WordPress's own boxes (News, Quick
 * Draft, Welcome…) are removed.
 *
 * Getting there: /wp-admin/ (and logging in) still opens Dream Desk; the Dashboard item in the WordPress menu and
 * "WordPress admin" in Dream Desk open this page (admin-clean.php).
 *
 * Google Analytics: read through the Dream Desk Drive script (drive.php, version 4+) with the GA4 property ID saved
 * here. Cached for 15 minutes.
 */
defined( 'ABSPATH' ) || exit;

/** GA4 property ID (numbers only, e.g. 412345678): Admin → Property settings in Google Analytics. */
function dwdga_property() {
	return preg_replace( '/[^0-9]/', '', (string) get_option( 'dwdga_property', '' ) );
}

/** Analytics numbers: [ 'state' => ok | setup | update | error, 'data' => …, 'msg' => … ]. */
function dwdga_data( $force = false ) {
	$prop = dwdga_property();
	if ( ! $prop ) {
		return array( 'state' => 'setup' );
	}
	if ( ! function_exists( 'dwddr_ready' ) || ! dwddr_ready() ) {
		return array( 'state' => 'error', 'msg' => 'Google Drive (the Dream Desk script) isn’t connected yet. Set it up in Dream Desk → Connections.' );
	}
	$c = get_transient( 'dwdga_cache' );
	if ( ! $force && is_array( $c ) && ( $c['prop'] ?? '' ) === $prop ) {
		return $c['res'];
	}
	$j = dwddr_call( array( 'ga' => $prop, 'ping' => 1 ) ); // "ping": an older script only answers, it never makes a folder
	if ( is_wp_error( $j ) ) {
		$res = array( 'state' => 'error', 'msg' => $j->get_error_message() );
	} elseif ( ! isset( $j['today'] ) ) {
		$res = array( 'state' => 'update', 'msg' => (string) ( $j['error'] ?? '' ) );
	} else {
		$res = array( 'state' => 'ok', 'data' => $j, 'at' => time() );
	}
	set_transient( 'dwdga_cache', array( 'prop' => $prop, 'res' => $res ), 'ok' === $res['state'] ? 15 * MINUTE_IN_SECONDS : 2 * MINUTE_IN_SECONDS );
	return $res;
}

/** Save the property ID / refresh (from the Analytics box). The form posts to the Dashboard itself: this server answers admin-post.php with a 404. */
add_action( 'admin_init', function () {
	if ( 'POST' !== ( $_SERVER['REQUEST_METHOD'] ?? '' ) || 'dwdga_save' !== ( $_POST['action'] ?? '' ) ) { // phpcs:ignore WordPress.Security
		return;
	}
	if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'dwdga' ) ) {
		wp_die( 'Not allowed.' );
	}
	if ( isset( $_POST['dwdga_property'] ) ) {
		update_option( 'dwdga_property', preg_replace( '/[^0-9]/', '', (string) wp_unslash( $_POST['dwdga_property'] ) ), false );
	}
	delete_transient( 'dwdga_cache' );
	wp_safe_redirect( admin_url( 'index.php' ) );
	exit;
} );

/** Money in $ with no cents unless needed. */
function dwdwd_money( $n ) {
	$n = (float) $n;
	return '$' . number_format( $n, abs( $n - round( $n ) ) > 0.004 ? 2 : 0 );
}
function dwdwd_desk( $hash ) {
	return esc_url( admin_url( 'admin.php?page=client-desk#' . $hash ) );
}

/** Dream Desk projects in some lists, with the meta the boxes need. */
function dwdwd_projects( $lists ) {
	$out = array();
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'meta_query' => array( array( 'key' => '_dwdc_list', 'value' => $lists, 'compare' => 'IN' ) ) ) ) as $p ) {
		$out[] = $p;
	}
	return $out;
}

/** Owed, the same as Dream Desk's Home: open projects (active, on hold, limbo), plus completed ones still marked owed. */
function dwdwd_owed() {
	$t = 0;
	foreach ( dwdwd_projects( array( 'active', 'hold', 'limbo', 'complete' ) ) as $p ) {
		if ( 'complete' === get_post_meta( $p->ID, '_dwdc_list', true ) && ! get_post_meta( $p->ID, '_dwdc_owedopen', true ) ) {
			continue;
		}
		$t += max( 0, (float) preg_replace( '/[^\d.]/', '', (string) get_post_meta( $p->ID, '_dwdc_balance', true ) ) );
	}
	return $t;
}

/** Pending in Upwork, the same as Dream Desk's Home: Upwork's own list, plus payments put "in Upwork" since that list. */
function dwdwd_upwork_pending() {
	$s = function_exists( 'dwduf_snap' ) ? dwduf_snap() : array();
	if ( ! $s ) {
		return 0;
	}
	$day   = substr( (string) ( $s['checked'] ?? '' ), 0, 10 );
	$total = (float) ( $s['pending'] ?? 0 );
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $id ) {
		foreach ( (array) get_post_meta( $id, '_dwdc_payments', true ) as $x ) {
			if ( ! is_array( $x ) || 'held' !== ( $x['status'] ?? '' ) || (string) ( $x['date'] ?? '' ) < $day ) {
				continue;
			}
			$on = false;
			foreach ( (array) ( $s['items'] ?? array() ) as $it ) {
				$on = $on || abs( (float) ( $it['amount'] ?? 0 ) - (float) $x['amount'] ) < 1;
			}
			$total += $on ? 0 : (float) $x['amount'];
		}
	}
	return $total;
}

/* ---------- the boxes ---------- */

function dwdwd_box_ga() {
	$r    = dwdga_data( isset( $_GET['dwdga_refresh'] ) ); // phpcs:ignore WordPress.Security.NonceVerification
	$form = '<form method="post" action="' . esc_url( admin_url( 'index.php' ) ) . '" class="dwdwd-gaf">' . wp_nonce_field( 'dwdga', '_wpnonce', true, false ) . '<input type="hidden" name="action" value="dwdga_save">';
	if ( 'setup' === $r['state'] ) {
		echo '<p>Connect Google Analytics to see your website visitors here.</p><ol class="dwdwd-steps">'
			. '<li>In Google Analytics, open <b>Admin → Property settings</b> and copy the <b>Property ID</b> (numbers only).</li>'
			. '<li>Paste it here and save.</li></ol>'
			. $form . '<input type="text" name="dwdga_property" placeholder="e.g. 412345678" class="regular-text"> <button class="button button-primary">Save</button></form>';
		return;
	}
	if ( 'update' === $r['state'] || 'error' === $r['state'] ) {
		$drive = function_exists( 'dwddr_script' ) ? dwddr_script() : '';
		echo '<p><b>' . ( 'update' === $r['state'] ? 'One-time setup: update the Dream Desk script so it can read Google Analytics.' : 'Google Analytics couldn’t be read.' ) . '</b>' . ( ! empty( $r['msg'] ) ? '<br><span class="dwdwd-mut">' . esc_html( $r['msg'] ) . '</span>' : '' ) . '</p>'
			. '<ol class="dwdwd-steps"><li>Open your <b>Dream Desk – Drive folders</b> script at <a href="https://script.google.com" target="_blank" rel="noopener">script.google.com</a>.</li>'
			. '<li>Replace all of its code with the code below.</li>'
			. '<li>In the left column click <b>Services +</b>, pick <b>Google Analytics Data API</b>, then <b>Add</b>.</li>'
			. '<li><b>Deploy → Manage deployments</b>, edit (pencil), Version: <b>New version</b>, <b>Deploy</b>. Approve Google’s permission screen if it asks.</li>'
			. '<li>Come back here and click <a href="' . esc_url( admin_url( 'index.php?dwdga_refresh=1' ) ) . '">Refresh</a>.</li></ol>'
			. ( $drive ? '<details><summary>Show the script code</summary><textarea readonly rows="8" class="large-text code" onclick="this.select()">' . esc_textarea( $drive ) . '</textarea></details>' : '' )
			. '<p class="dwdwd-mut">Property ID: ' . esc_html( dwdga_property() ) . '</p>' . $form . '<input type="text" name="dwdga_property" value="' . esc_attr( dwdga_property() ) . '" class="regular-text"> <button class="button">Change</button></form>';
		return;
	}
	$d    = $r['data'];
	$pct  = function ( $a, $b ) {
		if ( ! $b ) {
			return '';
		}
		$p = round( ( $a - $b ) / $b * 100 );
		return '<span class="dwdwd-chg ' . ( $p >= 0 ? 'up' : 'dn' ) . '">' . ( $p >= 0 ? '▲ ' : '▼ ' ) . abs( $p ) . '%</span>';
	};
	$tile = function ( $label, $v, $sub = '' ) {
		return '<div class="dwdwd-tile"><span>' . $label . '</span><b>' . $v . '</b>' . ( $sub ? '<small>' . $sub . '</small>' : '' ) . '</div>';
	};
	echo '<div class="dwdwd-tiles">'
		. $tile( 'Right now', '<i class="dwdwd-live"></i>' . (int) $d['now'], 'people on the site' )
		. $tile( 'Today', number_format( (int) $d['today']['users'] ), 'visitors · yesterday ' . number_format( (int) $d['yesterday']['users'] ) )
		. $tile( 'Last 7 days', number_format( (int) $d['d7']['users'] ), 'visitors ' . $pct( $d['d7']['users'], $d['p7']['users'] ) )
		. $tile( 'Last 30 days', number_format( (int) $d['d30']['users'] ), 'visitors ' . $pct( $d['d30']['users'], $d['p30']['users'] ) )
		. '</div><div class="dwdwd-tiles">'
		. $tile( 'Page views (7 days)', number_format( (int) $d['d7']['views'] ), number_format( (int) $d['d7']['sessions'] ) . ' visits' )
		. $tile( 'New visitors (7 days)', number_format( (int) $d['d7']['newUsers'] ), 'avg visit ' . floor( $d['d7']['avgSec'] / 60 ) . 'm ' . ( $d['d7']['avgSec'] % 60 ) . 's' )
		. $tile( 'Form leads', (int) $d['leads7'] . ' <em>/ ' . (int) $d['leads30'] . '</em>', '7 days / 30 days' )
		. $tile( 'Phone taps', (int) $d['calls7'] . ' <em>/ ' . (int) $d['calls30'] . '</em>', '7 days / 30 days' )
		. '</div>';
	$list = function ( $title, $rows, $fmt = null ) {
		$h = '<div class="dwdwd-col"><h4>' . $title . '</h4><table class="dwdwd-t">';
		foreach ( (array) $rows as $x ) {
			$h .= '<tr><td>' . esc_html( $fmt ? $fmt( $x['k'] ) : $x['k'] ) . '</td><td>' . number_format( (int) $x['v'] ) . '</td></tr>';
		}
		return $h . ( $rows ? '' : '<tr><td class="dwdwd-mut">Nothing yet</td></tr>' ) . '</table></div>';
	};
	echo '<div class="dwdwd-cols">' . $list( 'Top pages (7 days)', $d['pages'] ) . $list( 'Where visitors came from', $d['sources'] ) . $list( 'Top cities', $d['cities'] ) . '</div>';
	echo '<p class="dwdwd-foot">Google Analytics · updated ' . esc_html( human_time_diff( (int) $r['at'] ) ) . ' ago · <a href="' . esc_url( admin_url( 'index.php?dwdga_refresh=1' ) ) . '">Refresh</a> · <a href="https://analytics.google.com/" target="_blank" rel="noopener">Open Google Analytics ↗</a></p>';
}

function dwdwd_box_leads() {
	$ps = get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => 8, 'orderby' => 'date', 'order' => 'DESC', 'meta_key' => '_dwdc_list', 'meta_value' => 'leads' ) );
	$n7 = count( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids', 'date_query' => array( array( 'after' => '7 days ago' ) ) ) ) );
	echo '<p class="dwdwd-sum"><b>' . (int) $n7 . '</b> new in the last 7 days</p><table class="dwdwd-t">';
	foreach ( $ps as $p ) {
		$src   = (string) ( get_post_meta( $p->ID, '_dwdc_lead_source', true ) ?: get_post_meta( $p->ID, '_dwdc_source', true ) );
		$price = (float) get_post_meta( $p->ID, '_dwdc_price', true );
		echo '<tr><td><a href="' . dwdwd_desk( 'client/' . $p->ID ) . '">' . esc_html( $p->post_title ) . '</a><small>' . esc_html( trim( $src . ( $price ? ' · ' . dwdwd_money( $price ) : '' ), ' ·' ) ) . '</small></td><td class="dwdwd-mut">' . esc_html( human_time_diff( get_post_time( 'U', true, $p ) ) ) . ' ago</td></tr>';
	}
	echo ( $ps ? '' : '<tr><td class="dwdwd-mut">No open leads.</td></tr>' ) . '</table><p class="dwdwd-foot"><a href="' . dwdwd_desk( 'leads' ) . '">All leads in Dream Desk →</a></p>';
}

function dwdwd_box_sales() {
	$pays  = array();
	$month = current_time( 'Y-m' );
	$made  = 0;
	$held  = 0;
	foreach ( get_posts( array( 'post_type' => DWDC_CONTACT, 'post_status' => 'private', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $id ) {
		foreach ( (array) get_post_meta( $id, '_dwdc_payments', true ) as $x ) {
			if ( ! is_array( $x ) || empty( $x['amount'] ) ) {
				continue;
			}
			$st = (string) ( $x['status'] ?? 'paid' );
			if ( 'held' === $st ) {
				$held += (float) $x['amount'];
			} elseif ( 0 === strpos( (string) ( $x['bank'] ?? $x['date'] ?? '' ), $month ) || ( empty( $x['bank'] ) && 0 === strpos( (string) ( $x['date'] ?? '' ), $month ) ) ) {
				$made += (float) $x['amount'];
			}
			$pays[] = array( 'id' => $id, 'date' => (string) ( $x['date'] ?? '' ), 'amount' => (float) $x['amount'], 'src' => (string) ( $x['source'] ?? '' ), 'st' => $st );
		}
	}
	usort( $pays, function ( $a, $b ) { return strcmp( $b['date'], $a['date'] ); } );
	echo '<div class="dwdwd-tiles three">'
		. '<div class="dwdwd-tile"><span>Made this month</span><b class="green">' . dwdwd_money( $made ) . '</b></div>'
		. '<div class="dwdwd-tile"><span>Pending in Upwork</span><b>' . dwdwd_money( dwdwd_upwork_pending() ) . '</b></div>'
		. '<div class="dwdwd-tile"><span>Owed by clients</span><b>' . dwdwd_money( dwdwd_owed() ) . '</b></div></div>';
	echo '<table class="dwdwd-t">';
	foreach ( array_slice( $pays, 0, 8 ) as $x ) {
		echo '<tr><td><a href="' . dwdwd_desk( 'client/' . $x['id'] ) . '">' . esc_html( get_the_title( $x['id'] ) ) . '</a><small>' . esc_html( mysql2date( 'M j', $x['date'] ) . ' · ' . ( $x['src'] ?: 'Payment' ) . ( 'held' === $x['st'] ? ' · in Upwork' : '' ) ) . '</small></td><td class="dwdwd-amt">' . dwdwd_money( $x['amount'] ) . '</td></tr>';
	}
	echo ( $pays ? '' : '<tr><td class="dwdwd-mut">No payments yet.</td></tr>' ) . '</table><p class="dwdwd-foot"><a href="' . dwdwd_desk( 'money' ) . '">Business revenue →</a></p>';
}

function dwdwd_box_today() {
	$today = current_time( 'Y-m-d' );
	$late  = array();
	$due   = array();
	foreach ( get_posts( array( 'post_type' => DWDC_TASK, 'post_status' => 'private', 'posts_per_page' => -1, 'meta_key' => '_dwdc_done', 'meta_value' => '0' ) ) as $t ) {
		$d = (string) get_post_meta( $t->ID, '_dwdc_due', true );
		if ( '' === $d || $d > $today ) {
			continue;
		}
		$row = array( 't' => $t, 'd' => $d, 'c' => (int) get_post_meta( $t->ID, '_dwdc_contact', true ) );
		if ( $d < $today ) {
			$late[] = $row;
		} else {
			$due[] = $row;
		}
	}
	$active = count( dwdwd_projects( array( 'active' ) ) );
	echo '<div class="dwdwd-tiles three"><div class="dwdwd-tile"><span>Due today</span><b>' . count( $due ) . '</b></div><div class="dwdwd-tile"><span>Overdue</span><b class="' . ( $late ? 'red' : '' ) . '">' . count( $late ) . '</b></div><div class="dwdwd-tile"><span>Active projects</span><b>' . (int) $active . '</b></div></div><table class="dwdwd-t">';
	foreach ( array_slice( array_merge( $late, $due ), 0, 8 ) as $x ) {
		echo '<tr><td>' . esc_html( $x['t']->post_title ) . '<small>' . esc_html( ( $x['c'] ? get_the_title( $x['c'] ) . ' · ' : '' ) . ( $x['d'] < $today ? 'Overdue · ' . mysql2date( 'M j', $x['d'] ) : 'Today' ) ) . '</small></td></tr>';
	}
	echo ( $late || $due ? '' : '<tr><td class="dwdwd-mut">Nothing due. Nice.</td></tr>' ) . '</table><p class="dwdwd-foot"><a href="' . dwdwd_desk( 'todos' ) . '">All to-dos →</a></p>';
}

function dwdwd_box_health() {
	$items = function_exists( 'dwdh_items' ) ? dwdh_items() : array();
	$bad   = array_filter( $items, function ( $x ) { return 'ok' !== $x['state']; } );
	echo '<p class="dwdwd-sum">' . ( $bad ? '<b class="red">' . count( $bad ) . ' need attention</b>' : '<b class="green">All ' . count( $items ) . ' connections syncing</b>' ) . '</p><table class="dwdwd-t">';
	foreach ( $items as $x ) {
		echo '<tr><td><i class="dwdwd-dot ' . esc_attr( 'ok' === $x['state'] ? 'ok' : ( 'setup' === $x['state'] ? 'setup' : 'bad' ) ) . '"></i>' . esc_html( $x['name'] ) . ( 'ok' === $x['state'] ? '' : '<small>' . esc_html( (string) $x['note'] ) . '</small>' ) . '</td><td class="dwdwd-mut">' . esc_html( $x['at'] ? human_time_diff( strtotime( $x['at'] ) ) . ' ago' : '' ) . '</td></tr>';
	}
	$gb = get_option( 'dwdgb_meta', array() );
	echo '</table><p class="dwdwd-foot">Ban list: ' . count( (array) get_option( 'dwdgb_ips', array() ) ) . ' IPs, ' . count( (array) ( $gb['countries'] ?? array() ) ) . ' countries blocked</p>';
}

/* ---------- the page ---------- */

add_action( 'wp_dashboard_setup', function () {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	global $wp_meta_boxes;
	$wp_meta_boxes['dashboard'] = array(); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- WordPress's own boxes (News, Quick Draft, Welcome…) go
	remove_action( 'welcome_panel', 'wp_welcome_panel' );
	wp_add_dashboard_widget( 'dwdwd_ga', 'Website visitors · Google Analytics', 'dwdwd_box_ga', null, null, 'normal', 'high' );
	wp_add_dashboard_widget( 'dwdwd_leads', 'New leads', 'dwdwd_box_leads', null, null, 'normal' );
	wp_add_dashboard_widget( 'dwdwd_sales', 'Recent sales', 'dwdwd_box_sales', null, null, 'side', 'high' );
	wp_add_dashboard_widget( 'dwdwd_today', 'Today', 'dwdwd_box_today', null, null, 'side' );
	wp_add_dashboard_widget( 'dwdwd_health', 'Connections', 'dwdwd_box_health', null, null, 'column3' );
}, 999 );

add_action( 'admin_head-index.php', function () {
	echo '<style id="dwdwd">'
		. '.dwdwd-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:4px 0 12px}.dwdwd-tiles.three{grid-template-columns:repeat(3,minmax(0,1fr))}'
		. '.dwdwd-tile{border:1px solid #dcdcde;border-radius:4px;padding:10px 12px;background:#f6f7f7}.dwdwd-tile span{display:block;font-size:12px;color:#50575e}.dwdwd-tile b{display:block;font-size:22px;line-height:1.3;color:#1d2327}.dwdwd-tile b em{font-size:14px;font-style:normal;color:#646970}.dwdwd-tile small{display:block;color:#646970;font-size:12px}'
		. '.dwdwd-tile b.green,.dwdwd-sum .green{color:#008a20}.dwdwd-tile b.red,.dwdwd-sum .red{color:#d63638}'
		. '.dwdwd-live{display:inline-block;width:8px;height:8px;border-radius:50%;background:#00a32a;margin:0 6px 3px 0;box-shadow:0 0 0 3px rgba(0,163,42,.2)}'
		. '.dwdwd-chg{font-weight:600}.dwdwd-chg.up{color:#008a20}.dwdwd-chg.dn{color:#d63638}'
		. '.dwdwd-cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.dwdwd-col h4{margin:6px 0}'
		. '.dwdwd-t{width:100%;border-collapse:collapse}.dwdwd-t td{padding:7px 4px;border-top:1px solid #f0f0f1;vertical-align:top}.dwdwd-t td:last-child{text-align:right;white-space:nowrap}.dwdwd-t td small{display:block;color:#646970}.dwdwd-col .dwdwd-t td:first-child{max-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:80%}'
		. '.dwdwd-amt{font-weight:600}.dwdwd-mut{color:#646970}.dwdwd-sum{margin:0 0 8px}.dwdwd-foot{margin:10px 0 0;color:#646970}.dwdwd-steps{margin-left:18px}'
		. '.dwdwd-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:7px;background:#00a32a}.dwdwd-dot.bad{background:#d63638}.dwdwd-dot.setup{background:#dba617}'
		. '@media(max-width:782px){.dwdwd-tiles,.dwdwd-cols{grid-template-columns:repeat(2,minmax(0,1fr))}}'
		. '</style>';
} );
