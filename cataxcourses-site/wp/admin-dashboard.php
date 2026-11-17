/**
 * CTC Admin Dashboard (Code Snippets, scope: admin). Replaces the WordPress dashboard widgets with one stats panel:
 *  - Right now: visitors on the site (Google Analytics realtime), students in Moodle, today's orders and sales.
 *  - Sales (WooCommerce Analytics table): net sales, orders, average order, refunds, coupons — today, this week,
 *    this month, this year, each against the same stretch of last year. Last 30 days chart, top products this year.
 *  - Auto-renewal subscriptions: active / on hold / cancelled, new per period, renewals due in the next 30 days.
 *  - Website visitors (Google Analytics 4 Data API, read-only service account): users, sessions, page views.
 *  - Moodle (learn.cataxcourses.com/blocks/ctc_disputes/stats.php, shared token): enrollments, completions, CTEC
 *    reports per period; students enrolled / finished / working in the current 20 and 60 Hour courses.
 * Numbers are cached for 10 minutes ("Refresh" clears). Sales, refunds and subscriptions are hidden from the users in
 * ctc_hide_sales_users (CTC Hide Sales snippet).
 */

function ctc_db_can_sales() { return ! ( function_exists( 'ctc_hs_applies' ) && ctc_hs_applies() ); }
function ctc_db_tz() { return wp_timezone(); }

/** Period starts (site time) and the same stretch one year earlier: [key => [label, from, to, ly_from, ly_to]]. */
function ctc_db_periods() {
	$tz  = ctc_db_tz();
	$now = new DateTimeImmutable( 'now', $tz );
	$sow = (int) get_option( 'start_of_week', 1 );
	$dow = (int) $now->format( 'w' );
	$wk  = $now->setTime( 0, 0 )->modify( '-' . ( ( $dow - $sow + 7 ) % 7 ) . ' days' );
	$out = array(
		'today' => array( 'Today', $now->setTime( 0, 0 ) ),
		'week'  => array( 'This week', $wk ),
		'month' => array( 'This month', $now->modify( 'first day of this month' )->setTime( 0, 0 ) ),
		'year'  => array( 'This year', $now->setDate( (int) $now->format( 'Y' ), 1, 1 )->setTime( 0, 0 ) ),
	);
	foreach ( $out as $k => $p ) $out[ $k ] = array( $p[0], $p[1], $now, $p[1]->modify( '-1 year' ), $now->modify( '-1 year' ) );
	return $out;
}
function ctc_db_cache( $key, $fn, $ttl = 600 ) {
	$k = 'ctc_db_' . $key;
	if ( empty( $_GET['ctc_refresh'] ) && false !== ( $v = get_transient( $k ) ) ) return $v;
	$v = $fn();
	set_transient( $k, $v, $ttl );
	return $v;
}

/* ---------------------------------------------------------------- sales (WooCommerce Analytics table) */
function ctc_db_status_sql() {
	$ex = (array) get_option( 'woocommerce_excluded_report_order_statuses', array( 'pending', 'failed', 'cancelled' ) );
	$ex = array_merge( $ex, array( 'checkout-draft', 'trash', 'auto-draft' ) );
	return "status NOT IN ('" . implode( "','", array_map( 'esc_sql', array_map( function ( $s ) { return 'wc-' . $s; }, $ex ) ) ) . "')";
}
function ctc_db_sales_range( $from, $to ) {
	global $wpdb;
	$t = $wpdb->prefix . 'wc_order_stats';
	$r = $wpdb->get_row( $wpdb->prepare(
		"SELECT SUM(CASE WHEN parent_id = 0 THEN 1 ELSE 0 END) AS orders,
		        COALESCE(SUM(net_total), 0) AS net,
		        COALESCE(SUM(CASE WHEN parent_id = 0 THEN total_sales ELSE 0 END), 0) AS gross_total,
		        COALESCE(-SUM(CASE WHEN parent_id > 0 THEN total_sales ELSE 0 END), 0) AS refunds,
		        SUM(CASE WHEN parent_id > 0 THEN 1 ELSE 0 END) AS refund_count,
		        COUNT(DISTINCT CASE WHEN parent_id = 0 THEN customer_id END) AS customers,
		        COUNT(DISTINCT CASE WHEN parent_id = 0 AND returning_customer = 0 THEN customer_id END) AS new_customers
		 FROM $t WHERE " . ctc_db_status_sql() . ' AND date_created >= %s AND date_created < %s',
		$from->format( 'Y-m-d H:i:s' ), $to->format( 'Y-m-d H:i:s' ) ), ARRAY_A );
	$c = $wpdb->get_var( $wpdb->prepare(
		"SELECT COALESCE(SUM(l.discount_amount), 0) FROM {$wpdb->prefix}wc_order_coupon_lookup l JOIN $t s ON s.order_id = l.order_id
		 WHERE s." . ctc_db_status_sql() . ' AND s.date_created >= %s AND s.date_created < %s', $from->format( 'Y-m-d H:i:s' ), $to->format( 'Y-m-d H:i:s' ) ) );
	$o = (int) $r['orders'];
	return array( 'orders' => $o, 'net' => (float) $r['net'], 'refunds' => (float) $r['refunds'], 'refund_count' => (int) $r['refund_count'],
		'customers' => (int) $r['customers'], 'new_customers' => (int) $r['new_customers'],
		'coupons' => (float) $c, 'aov' => $o ? ( (float) $r['net'] + (float) $r['refunds'] ) / $o : 0 );
}
/** 20 Hour / 60 Hour courses sold (quantity, refunds netted) in a range, by product name; books and add-ons excluded. */
function ctc_db_course_sales( $from, $to ) {
	global $wpdb;
	$rows = $wpdb->get_results( $wpdb->prepare( "SELECT l.product_id, SUM(l.product_qty) qty FROM {$wpdb->prefix}wc_order_product_lookup l
		JOIN {$wpdb->prefix}wc_order_stats s ON s.order_id = l.order_id WHERE s." . ctc_db_status_sql() . ' AND s.date_created >= %s AND s.date_created < %s GROUP BY l.product_id',
		$from->format( 'Y-m-d H:i:s' ), $to->format( 'Y-m-d H:i:s' ) ) );
	$out = array( '20' => 0, '60' => 0 );
	foreach ( $rows as $r ) {
		$name = get_the_title( $r->product_id );
		if ( preg_match( '/book|addon|add-on|mug/i', $name ) ) continue;
		if ( preg_match( '/\b20\s*hour/i', $name ) ) $out['20'] += (int) $r->qty;
		elseif ( preg_match( '/\b60\s*hour/i', $name ) ) $out['60'] += (int) $r->qty;
	}
	return $out;
}
function ctc_db_sales() {
	return ctc_db_cache( 'sales', function () {
		$out = array();
		foreach ( ctc_db_periods() as $k => $p ) {
			$out[ $k ] = array( 'cur' => ctc_db_sales_range( $p[1], $p[2] ), 'ly' => ctc_db_sales_range( $p[3], $p[4] ) );
			$out[ $k ]['cur']['courses'] = ctc_db_course_sales( $p[1], $p[2] );
			$out[ $k ]['ly']['courses']  = ctc_db_course_sales( $p[3], $p[4] );
		}
		return $out;
	} );
}
function ctc_db_daily() {
	return ctc_db_cache( 'daily', function () {
		global $wpdb;
		$tz   = ctc_db_tz();
		$from = ( new DateTimeImmutable( 'today', $tz ) )->modify( '-29 days' );
		$rows = $wpdb->get_results( $wpdb->prepare( "SELECT DATE(date_created) d, SUM(net_total) n, SUM(CASE WHEN parent_id = 0 THEN 1 ELSE 0 END) o
			FROM {$wpdb->prefix}wc_order_stats WHERE " . ctc_db_status_sql() . ' AND date_created >= %s GROUP BY DATE(date_created)', $from->format( 'Y-m-d H:i:s' ) ), OBJECT_K );
		$out = array();
		for ( $i = 0; $i < 30; $i++ ) { $d = $from->modify( "+$i days" )->format( 'Y-m-d' ); $out[ $d ] = array( 'net' => isset( $rows[ $d ] ) ? (float) $rows[ $d ]->n : 0, 'orders' => isset( $rows[ $d ] ) ? (int) $rows[ $d ]->o : 0 ); }
		return $out;
	} );
}
function ctc_db_products() {
	return ctc_db_cache( 'products', function () {
		global $wpdb;
		$p    = ctc_db_periods()['year'];
		$rows = $wpdb->get_results( $wpdb->prepare( "SELECT l.product_id, SUM(l.product_qty) qty, SUM(l.product_net_revenue) net
			FROM {$wpdb->prefix}wc_order_product_lookup l JOIN {$wpdb->prefix}wc_order_stats s ON s.order_id = l.order_id
			WHERE s." . ctc_db_status_sql() . ' AND s.date_created >= %s GROUP BY l.product_id ORDER BY net DESC LIMIT 8', $p[1]->format( 'Y-m-d H:i:s' ) ) );
		return array_map( function ( $r ) { return array( 'name' => html_entity_decode( get_the_title( $r->product_id ) ?: ( '#' . $r->product_id ) ), 'qty' => (int) $r->qty, 'net' => (float) $r->net ); }, $rows );
	} );
}

/* ---------------------------------------------------------------- subscriptions */
function ctc_db_subs() {
	return ctc_db_cache( 'subs', function () {
		if ( ! function_exists( 'wcs_get_subscriptions' ) ) return null;
		$subs   = wcs_get_subscriptions( array( 'subscriptions_per_page' => -1, 'subscription_status' => 'any' ) );
		$status = array();
		$new    = array_fill_keys( array_keys( ctc_db_periods() ), 0 );
		$due30  = 0; $due_amt = 0; $cancel_year = 0;
		$per    = ctc_db_periods();
		$now    = time();
		foreach ( $subs as $s ) {
			$st = $s->get_status();
			$status[ $st ] = ( $status[ $st ] ?? 0 ) + 1;
			$c = $s->get_date_created();
			if ( $c ) foreach ( $per as $k => $p ) if ( $c->getTimestamp() >= $p[1]->getTimestamp() ) $new[ $k ]++;
			if ( 'active' === $st ) {
				$next = $s->get_time( 'next_payment' );
				if ( $next && $next <= $now + 30 * DAY_IN_SECONDS ) { $due30++; $due_amt += (float) $s->get_total(); }
			}
			$end = $s->get_time( 'cancelled' ) ?: $s->get_time( 'end' );
			if ( 'cancelled' === $st && $end && $end >= $per['year'][1]->getTimestamp() ) $cancel_year++;
		}
		return array( 'status' => $status, 'new' => $new, 'due30' => $due30, 'due_amt' => $due_amt, 'cancel_year' => $cancel_year, 'total' => count( $subs ) );
	} );
}

/* ---------------------------------------------------------------- Moodle */
function ctc_db_moodle() {
	return ctc_db_cache( 'moodle', function () {
		global $wpdb;
		$mdl = $wpdb->get_row( "SELECT moodleurl FROM {$wpdb->prefix}moodledetail WHERE id = 1" );
		$tok = (string) get_option( 'ctc_dp_token' );
		if ( ! $mdl || ! $mdl->moodleurl || ! $tok ) return array( 'error' => 'Moodle address or shared token missing' );
		$args = array( 'token' => rawurlencode( $tok ) );
		foreach ( ctc_db_periods() as $k => $p ) { $args[ $k ] = $p[1]->getTimestamp(); $args[ 'ly_' . $k ] = $p[3]->getTimestamp(); $args['ly_to'] = $p[4]->getTimestamp(); } // same periods as the sales numbers
		$r = wp_remote_get( add_query_arg( $args, rtrim( $mdl->moodleurl, '/' ) . '/blocks/ctc_disputes/stats.php' ), array( 'timeout' => 25 ) );
		if ( is_wp_error( $r ) ) return array( 'error' => $r->get_error_message() );
		$j = json_decode( wp_remote_retrieve_body( $r ), true );
		return ( 200 === (int) wp_remote_retrieve_response_code( $r ) && is_array( $j ) ) ? $j : array( 'error' => 'Moodle returned ' . wp_remote_retrieve_response_code( $r ) );
	}, 600 );
}

/* ---------------------------------------------------------------- Google Analytics 4 */
function ctc_db_ga_cfg() { $c = get_option( 'ctc_ga4', array() ); return is_array( $c ) ? $c : array(); }
function ctc_db_b64u( $s ) { return rtrim( strtr( base64_encode( $s ), '+/', '-_' ), '=' ); }
function ctc_db_ga_token() {
	$cfg = ctc_db_ga_cfg();
	$key = json_decode( $cfg['key'] ?? '', true );
	if ( empty( $key['client_email'] ) || empty( $key['private_key'] ) ) return new WP_Error( 'ga', 'No service account key saved' );
	$cached = get_transient( 'ctc_db_ga_token' );
	if ( $cached ) return $cached;
	$now = time();
	$jwt = ctc_db_b64u( wp_json_encode( array( 'alg' => 'RS256', 'typ' => 'JWT' ) ) ) . '.' . ctc_db_b64u( wp_json_encode( array(
		'iss' => $key['client_email'], 'scope' => 'https://www.googleapis.com/auth/analytics.readonly',
		'aud' => 'https://oauth2.googleapis.com/token', 'iat' => $now, 'exp' => $now + 3600 ) ) );
	if ( ! openssl_sign( $jwt, $sig, $key['private_key'], 'sha256WithRSAEncryption' ) ) return new WP_Error( 'ga', 'Could not sign with the saved key' );
	$r = wp_remote_post( 'https://oauth2.googleapis.com/token', array( 'timeout' => 20, 'body' => array( 'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $jwt . '.' . ctc_db_b64u( $sig ) ) ) );
	$j = is_wp_error( $r ) ? null : json_decode( wp_remote_retrieve_body( $r ), true );
	if ( empty( $j['access_token'] ) ) return new WP_Error( 'ga', 'Google sign-in failed: ' . ( $j['error_description'] ?? ( is_wp_error( $r ) ? $r->get_error_message() : 'unknown' ) ) );
	set_transient( 'ctc_db_ga_token', $j['access_token'], 3000 );
	return $j['access_token'];
}
function ctc_db_ga_call( $method, $body ) {
	$cfg = ctc_db_ga_cfg();
	$tok = ctc_db_ga_token();
	if ( is_wp_error( $tok ) ) return $tok;
	$r = wp_remote_post( 'https://analyticsdata.googleapis.com/v1beta/properties/' . rawurlencode( $cfg['property'] ?? '' ) . ':' . $method, array(
		'timeout' => 20, 'headers' => array( 'Authorization' => 'Bearer ' . $tok, 'Content-Type' => 'application/json' ), 'body' => wp_json_encode( $body ) ) );
	$j = is_wp_error( $r ) ? null : json_decode( wp_remote_retrieve_body( $r ), true );
	if ( is_wp_error( $r ) || 200 !== (int) wp_remote_retrieve_response_code( $r ) ) return new WP_Error( 'ga', 'Google Analytics: ' . ( $j['error']['message'] ?? ( is_wp_error( $r ) ? $r->get_error_message() : 'error' ) ) );
	return $j;
}
function ctc_db_ga() {
	$cfg = ctc_db_ga_cfg();
	if ( empty( $cfg['property'] ) || empty( $cfg['key'] ) ) return null;
	return ctc_db_cache( 'ga', function () {
		$ranges = array();
		foreach ( ctc_db_periods() as $k => $p ) $ranges[] = array( 'startDate' => $p[1]->format( 'Y-m-d' ), 'endDate' => 'today', 'name' => $k );
		$j = ctc_db_ga_call( 'runReport', array( 'dateRanges' => $ranges, 'metrics' => array( array( 'name' => 'activeUsers' ), array( 'name' => 'sessions' ), array( 'name' => 'screenPageViews' ) ) ) );
		if ( is_wp_error( $j ) ) return array( 'error' => $j->get_error_message() );
		$out = array();
		foreach ( $j['rows'] ?? array() as $row ) {
			$name = $row['dimensionValues'][0]['value'] ?? '';
			$out[ $name ] = array( 'users' => (int) $row['metricValues'][0]['value'], 'sessions' => (int) $row['metricValues'][1]['value'], 'views' => (int) $row['metricValues'][2]['value'] );
		}
		$src = ctc_db_ga_call( 'runReport', array( 'dateRanges' => array( array( 'startDate' => ctc_db_periods()['month'][1]->format( 'Y-m-d' ), 'endDate' => 'today' ) ),
			'dimensions' => array( array( 'name' => 'sessionDefaultChannelGroup' ) ), 'metrics' => array( array( 'name' => 'sessions' ) ),
			'orderBys' => array( array( 'metric' => array( 'metricName' => 'sessions' ), 'desc' => true ) ), 'limit' => 6 ) );
		$channels = array();
		if ( ! is_wp_error( $src ) ) foreach ( $src['rows'] ?? array() as $row ) $channels[ $row['dimensionValues'][0]['value'] ] = (int) $row['metricValues'][0]['value'];
		return array( 'periods' => $out, 'channels' => $channels );
	} );
}
function ctc_db_ga_live() {
	$cfg = ctc_db_ga_cfg();
	if ( empty( $cfg['property'] ) || empty( $cfg['key'] ) ) return null;
	return ctc_db_cache( 'ga_live', function () {
		$j = ctc_db_ga_call( 'runRealtimeReport', array( 'metrics' => array( array( 'name' => 'activeUsers' ) ) ) );
		if ( is_wp_error( $j ) ) return null;
		return (int) ( $j['rows'][0]['metricValues'][0]['value'] ?? 0 );
	}, 60 );
}
// Save the GA4 property id + service account key (site admins).
add_action( 'admin_post_ctc_db_ga4', function () {
	if ( ! current_user_can( 'manage_options' ) ) wp_die( 'Not allowed' );
	check_admin_referer( 'ctc_db_ga4' );
	$cfg = ctc_db_ga_cfg();
	$cfg['property'] = preg_replace( '/\D/', '', (string) wp_unslash( $_POST['property'] ?? '' ) );
	$key = trim( (string) wp_unslash( $_POST['key'] ?? '' ) );
	if ( '' !== $key ) {
		$k = json_decode( $key, true );
		if ( empty( $k['client_email'] ) || empty( $k['private_key'] ) ) { wp_safe_redirect( admin_url( '?ctc_ga=badkey' ) ); exit; }
		$cfg['key'] = $key;
	}
	update_option( 'ctc_ga4', $cfg, false );
	delete_transient( 'ctc_db_ga_token' ); delete_transient( 'ctc_db_ga' ); delete_transient( 'ctc_db_ga_live' );
	wp_safe_redirect( admin_url( '?ctc_ga=saved' ) );
	exit;
} );

/* ---------------------------------------------------------------- dashboard */
add_action( 'wp_dashboard_setup', function () {
	global $wp_meta_boxes;
	if ( ! current_user_can( 'manage_options' ) && ! current_user_can( 'manage_woocommerce' ) ) return;
	$wp_meta_boxes['dashboard'] = array();
	remove_action( 'welcome_panel', 'wp_welcome_panel' );
	wp_add_dashboard_widget( 'ctc_stats', 'California Tax Courses — business at a glance', 'ctc_db_render' );
}, 100000 );
add_action( 'admin_head-index.php', function () {
	echo '<style>
#welcome-panel{display:none}#dashboard-widgets .postbox-container{width:100%!important;float:none}#dashboard-widgets #postbox-container-2,#dashboard-widgets #postbox-container-3,#dashboard-widgets #postbox-container-4,#dashboard-widgets .empty-container{display:none!important}
#ctc_stats .postbox-header{display:none}#ctc_stats{border:0;box-shadow:none;background:transparent}#ctc_stats .inside{padding:0;margin:0}
.ctcd{font-size:14px;color:#1c2333}.ctcd h2.ctcd-h{font-size:15px!important;font-weight:700!important;letter-spacing:.06em;text-transform:uppercase;color:#8f6f14;margin:26px 0 10px!important;padding:0!important}
.ctcd-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.ctcd-top h1{font-size:22px;margin:0;padding:0}.ctcd-top small{color:#646970}
.ctcd-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.ctcd-tile{background:#fff;border:1px solid #e6e3da;border-radius:12px;padding:14px 16px}.ctcd-tile .l{font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#646970}.ctcd-tile .v{font-size:26px;font-weight:700;margin-top:4px;line-height:1.15}.ctcd-tile .s{font-size:12px;color:#646970;margin-top:3px}
.ctcd-tile.live{background:#1c2333;color:#fff;border-color:#1c2333}.ctcd-tile.live .l,.ctcd-tile.live .s{color:#d9dce1}.ctcd-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#2fbf71;margin-right:6px;animation:ctcp 1.6s infinite}@keyframes ctcp{50%{opacity:.35}}
.ctcd-card{background:#fff;border:1px solid #e6e3da;border-radius:12px;padding:6px 16px 10px;overflow-x:auto}
.ctcd table{width:100%;border-collapse:collapse}.ctcd th,.ctcd td{padding:9px 10px;text-align:right;border-bottom:1px solid #f0eee8;white-space:nowrap}.ctcd th:first-child,.ctcd td:first-child{text-align:left}.ctcd thead th{font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#646970;font-weight:600}.ctcd tr:last-child td{border-bottom:0}
.ctcd td b{font-size:15px}.ctcd .up{color:#1a7f4b;font-size:12px;display:block}.ctcd .dn{color:#b42318;font-size:12px;display:block}.ctcd .mut{color:#8c8f94;font-size:12px;display:block}
.ctcd-grid2{display:grid;grid-template-columns:2fr 1fr;gap:12px;align-items:start}@media(max-width:1100px){.ctcd-grid2{grid-template-columns:1fr}}
.ctcd-bars{display:flex;align-items:flex-end;gap:3px;height:120px;padding:12px 0 4px}.ctcd-bars span{flex:1;background:#d4a93a;border-radius:3px 3px 0 0;min-height:2px;position:relative}.ctcd-bars span:hover{background:#1c2333}
.ctcd-axis{display:flex;justify-content:space-between;font-size:11px;color:#8c8f94}
.ctcd-course{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.ctcd-course .ctcd-card{padding:14px 16px}.ctcd-course h3{margin:0 0 8px;font-size:15px}
.ctcd-meter{height:8px;background:#f0eee8;border-radius:6px;overflow:hidden;margin:8px 0}.ctcd-meter i{display:block;height:100%;background:#2fbf71}
.ctcd-note{color:#646970;font-size:12px;margin-top:8px}.ctcd-err{color:#b42318}
.ctcd-hl h3{margin:10px 0 6px;font-size:15px}.ctcd-hl.good h3{color:#1a7f4b}.ctcd-hl.bad h3{color:#b42318}.ctcd-hl ul{margin:0 0 6px 18px;list-style:disc}.ctcd-hl li{margin:6px 0;line-height:1.45}.ctcd-hl .mut{display:inline}
.ctcd details summary{cursor:pointer;color:#2271b1}.ctcd textarea{width:100%;min-height:90px;font-family:monospace;font-size:12px}
</style>';
} );

function ctc_db_money( $v, $dec = 0 ) { return ( $v < 0 ? '-' : '' ) . '$' . number_format( abs( $v ), $dec ); }
function ctc_db_cmp( $cur, $ly ) {
	if ( $ly <= 0 ) return $cur > 0 ? '<span class="mut">no data last year</span>' : '';
	$pct = ( $cur - $ly ) / $ly * 100;
	return '<span class="' . ( $pct >= 0 ? 'up' : 'dn' ) . '">' . ( $pct >= 0 ? '▲ ' : '▼ ' ) . number_format( abs( $pct ), 1 ) . '% vs last year</span>';
}

/**
 * Now-vs-last-year metrics per period: [period => [[label, group, cur, ly, good (+1 = up is good, -1 = down is good), fmt, floor]]].
 * floor = smallest last-year value worth calling out in Highlights (keeps tiny numbers out).
 */
function ctc_db_metrics( $S, $mdl ) {
	$out = array();
	foreach ( array_keys( ctc_db_periods() ) as $k ) {
		$m = array();
		if ( $S ) {
			$c = $S[ $k ]['cur']; $l = $S[ $k ]['ly'];
			$rate = function ( $x ) { return $x['orders'] ? $x['refund_count'] / $x['orders'] * 100 : 0; };
			$m[] = array( 'Net sales', 'Sales', $c['net'], $l['net'], 1, 'money', 2000 );
			$m[] = array( 'Orders', 'Sales', $c['orders'], $l['orders'], 1, 'int', 25 );
			$m[] = array( 'Paying customers', 'Sales', $c['customers'], $l['customers'], 1, 'int', 25 );
			$m[] = array( 'Average order', 'Sales', $c['aov'], $l['aov'], 1, 'money2', 50 );
			$m[] = array( 'Coupon discounts', 'Sales', $c['coupons'], $l['coupons'], -1, 'money', 300 );
			$m[] = array( 'Refunds (count)', 'Refunds', $c['refund_count'], $l['refund_count'], -1, 'int', 5 );
			$m[] = array( 'Refunds ($)', 'Refunds', $c['refunds'], $l['refunds'], -1, 'money', 300 );
			$m[] = array( 'Refund rate (refunds per 100 orders)', 'Refunds', $rate( $c ), $rate( $l ), -1, 'pct', 0.5 );
			$m[] = array( 'New customers (first-ever order)', 'Students', $c['new_customers'], $l['new_customers'], 1, 'int', 25 );
		}
		if ( isset( $mdl['compare'][ $k ] ) ) {
			$m[] = array( 'Brand-new students (new Moodle accounts)', 'Students', $mdl['compare'][ $k ]['cur']['accounts'], $mdl['compare'][ $k ]['ly']['accounts'], 1, 'int', 25 );
		}
		if ( $S ) {
			$c = $S[ $k ]['cur']; $l = $S[ $k ]['ly'];
			$m[] = array( '20 Hour courses sold', 'Students', $c['courses']['20'], $l['courses']['20'], 1, 'int', 20 );
			$m[] = array( '60 Hour courses sold', 'Students', $c['courses']['60'], $l['courses']['60'], 1, 'int', 20 );
			$m[] = array( 'All 20 + 60 Hour courses sold', 'Students', $c['courses']['20'] + $c['courses']['60'], $l['courses']['20'] + $l['courses']['60'], 1, 'int', 20 );
		}
		$out[ $k ] = $m;
	}
	return $out;
}
function ctc_db_fmt( $v, $fmt ) {
	if ( 'money' === $fmt ) return ctc_db_money( $v );
	if ( 'money2' === $fmt ) return ctc_db_money( $v, 2 );
	if ( 'pct' === $fmt ) return number_format( $v, 1 );
	return number_format( $v );
}
/** "+123 (+4.5%)" coloured green when the change is good, red when bad. */
function ctc_db_diff( $cur, $ly, $good, $fmt ) {
	$d = $cur - $ly;
	if ( abs( $d ) < 0.005 ) return '<span class="mut">no change</span>';
	$ok   = ( $d > 0 ) === ( $good > 0 );
	$abs  = 'pct' === $fmt ? number_format( abs( $d ), 1 ) . ' pts' : ctc_db_fmt( abs( $d ), $fmt );
	$pct  = $ly > 0 ? ' (' . ( $d > 0 ? '+' : '−' ) . number_format( abs( $d ) / $ly * 100, 1 ) . '%)' : '';
	return '<span class="' . ( $ok ? 'up' : 'dn' ) . '">' . ( $d > 0 ? '▲ +' : '▼ −' ) . $abs . ( 'pct' === $fmt ? '' : $pct ) . '</span>';
}
function ctc_db_highlights( $M ) {
	$labels = array( 'week' => 'this week', 'month' => 'this month', 'year' => 'this year' );
	$good = array(); $bad = array();
	foreach ( array( 'year', 'month', 'week' ) as $k ) {
		foreach ( $M[ $k ] ?? array() as $x ) {
			list( $label, , $cur, $ly, $dir, $fmt, $floor ) = $x;
			if ( $ly < $floor && $cur < $floor ) continue;
			$pct = $ly > 0 ? ( $cur - $ly ) / $ly * 100 : 100;
			$min = 'week' === $k ? 25 : 10; // weeks are noisy: only big swings
			if ( abs( $pct ) < $min ) continue;
			$item = array( 'score' => abs( $pct ) * ( 'year' === $k ? 1.5 : ( 'month' === $k ? 1.2 : 1 ) ), 'html' =>
				'<b>' . esc_html( $label ) . '</b> ' . ( $cur > $ly ? 'up' : 'down' ) . ' <b>' . number_format( abs( $pct ), 0 ) . '%</b> ' . $labels[ $k ] .
				' <span class="mut" style="display:inline">(' . ctc_db_fmt( $cur, $fmt ) . ' vs ' . ctc_db_fmt( $ly, $fmt ) . ' last year)</span>' );
			if ( ( $cur > $ly ) === ( $dir > 0 ) ) $good[] = $item; else $bad[] = $item;
		}
	}
	$sort = function ( $a, $b ) { return $b['score'] <=> $a['score']; };
	usort( $good, $sort ); usort( $bad, $sort );
	echo '<h2 class="ctcd-h">Highlights</h2><div class="ctcd-grid2" style="grid-template-columns:1fr 1fr">';
	echo '<div class="ctcd-card ctcd-hl good"><h3>▲ Significant improvements</h3><ul>';
	foreach ( array_slice( $good, 0, 8 ) as $i ) echo '<li>' . $i['html'] . '</li>'; // phpcs:ignore
	if ( ! $good ) echo '<li class="mut">Nothing up 10% or more vs last year.</li>';
	echo '</ul></div><div class="ctcd-card ctcd-hl bad"><h3>▼ Needs attention</h3><ul>';
	foreach ( array_slice( $bad, 0, 6 ) as $i ) echo '<li>' . $i['html'] . '</li>'; // phpcs:ignore
	if ( ! $bad ) echo '<li class="mut">Nothing down 10% or more vs last year.</li>';
	echo '</ul></div></div><div class="ctcd-note">Compared with the same days last year. "Up" for refunds and coupons counts as needing attention; "down" counts as an improvement.</div>';
}
function ctc_db_yoy_table( $M ) {
	$per = ctc_db_periods();
	echo '<h2 class="ctcd-h">This year vs last year</h2><div class="ctcd-card"><table><thead><tr><th></th>';
	foreach ( array( 'week', 'month', 'year' ) as $k ) echo '<th>' . esc_html( $per[ $k ][0] ) . ' <span class="mut" style="display:inline">vs same days last year</span></th>';
	echo '</tr></thead><tbody>';
	$group = '';
	foreach ( $M['year'] as $i => $x ) {
		if ( $x[1] !== $group ) { $group = $x[1]; echo '<tr><td colspan="4" style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8f6f14;padding-top:14px"><b>' . esc_html( $group ) . '</b></td></tr>'; }
		echo '<tr><td>' . esc_html( $x[0] ) . '</td>';
		foreach ( array( 'week', 'month', 'year' ) as $k ) {
			$y = $M[ $k ][ $i ] ?? null;
			if ( ! $y ) { echo '<td>—</td>'; continue; }
			echo '<td><b>' . ctc_db_fmt( $y[2], $y[5] ) . ( 'pct' === $y[5] ? '%' : '' ) . '</b> <span class="mut" style="display:inline">vs ' . ctc_db_fmt( $y[3], $y[5] ) . ( 'pct' === $y[5] ? '%' : '' ) . '</span>' . ctc_db_diff( $y[2], $y[3], $y[4], $y[5] ) . '</td>';
		}
		echo '</tr>';
	}
	echo '</tbody></table><div class="ctcd-note">Brand-new students = Moodle accounts created in the period. New customers = people whose first-ever order falls in the period. Courses sold come from store orders (refunds netted out): Moodle no longer keeps last year\'s 20 Hour enrollments, so its enrollment counts can\'t be compared year to year.</div></div>';
}

function ctc_db_render() {
	$per   = ctc_db_periods();
	$sales = ctc_db_can_sales();
	$mdl   = ctc_db_moodle();
	$ga    = ctc_db_ga();
	$live  = ctc_db_ga_live();
	$S     = $sales ? ctc_db_sales() : null;
	echo '<div class="ctcd">';
	echo '<div class="ctcd-top"><h1>Business at a glance</h1><small>Updated ' . esc_html( wp_date( 'M j, g:i a' ) ) . ' · cached 10 min · <a href="' . esc_url( admin_url( '?ctc_refresh=1' ) ) . '">Refresh now</a></small></div>';

	// Right now.
	echo '<h2 class="ctcd-h">Right now</h2><div class="ctcd-tiles">';
	echo '<div class="ctcd-tile live"><div class="l"><span class="ctcd-dot"></span>Visitors on the website</div><div class="v">' . ( null === $live ? '—' : number_format( $live ) ) . '</div><div class="s">' . ( null === $live ? 'Connect Google Analytics below' : 'Active in the last 30 minutes' ) . '</div></div>';
	echo '<div class="ctcd-tile live"><div class="l"><span class="ctcd-dot"></span>Students in Moodle</div><div class="v">' . ( isset( $mdl['online']['now'] ) ? number_format( $mdl['online']['now'] ) : '—' ) . '</div><div class="s">' . ( isset( $mdl['online'] ) ? number_format( $mdl['online']['today'] ) . ' today · ' . number_format( $mdl['online']['week'] ) . ' this week' : 'Moodle not reachable' ) . '</div></div>';
	if ( $sales ) {
		$t = $S['today']['cur'];
		echo '<div class="ctcd-tile"><div class="l">Sales today</div><div class="v">' . ctc_db_money( $t['net'] ) . '</div><div class="s">' . number_format( $t['orders'] ) . ' orders · ' . ctc_db_cmp( $t['net'], $S['today']['ly']['net'] ) . '</div></div>';
		$y = $S['year']['cur'];
		echo '<div class="ctcd-tile"><div class="l">Sales this year</div><div class="v">' . ctc_db_money( $y['net'] ) . '</div><div class="s">' . number_format( $y['orders'] ) . ' orders · ' . ctc_db_cmp( $y['net'], $S['year']['ly']['net'] ) . '</div></div>';
	}
	if ( isset( $mdl['completions'] ) ) echo '<div class="ctcd-tile"><div class="l">Course completions today</div><div class="v">' . number_format( $mdl['completions']['today']['all'] ) . '</div><div class="s">' . number_format( $mdl['completions']['year']['all'] ) . ' this year</div></div>';
	echo '</div>';
	$M = ctc_db_metrics( $S, isset( $mdl['compare'] ) ? $mdl : null );
	ctc_db_highlights( $M );
	ctc_db_yoy_table( $M );

	// Sales.
	if ( $sales ) {
		echo '<h2 class="ctcd-h">Sales</h2><div class="ctcd-card"><table><thead><tr><th></th>';
		foreach ( $per as $p ) echo '<th>' . esc_html( $p[0] ) . '</th>';
		echo '</tr></thead><tbody>';
		$rows = array(
			'Net sales'       => function ( $c, $l ) { return '<b>' . ctc_db_money( $c['net'] ) . '</b>' . ctc_db_cmp( $c['net'], $l['net'] ); },
			'Orders'          => function ( $c, $l ) { return '<b>' . number_format( $c['orders'] ) . '</b>' . ctc_db_cmp( $c['orders'], $l['orders'] ); },
			'Average order'   => function ( $c, $l ) { return ctc_db_money( $c['aov'], 2 ) . '<span class="mut">last year ' . ctc_db_money( $l['aov'], 2 ) . '</span>'; },
			'Refunds'         => function ( $c, $l ) { return '<b style="color:#b42318">' . ctc_db_money( $c['refunds'] ) . '</b><span class="mut">' . number_format( $c['refund_count'] ) . ' refunds · last year ' . ctc_db_money( $l['refunds'] ) . '</span>'; },
			'Coupon discounts' => function ( $c, $l ) { return ctc_db_money( $c['coupons'] ) . '<span class="mut">last year ' . ctc_db_money( $l['coupons'] ) . '</span>'; },
		);
		foreach ( $rows as $label => $fn ) {
			echo '<tr><td>' . esc_html( $label ) . '</td>';
			foreach ( array_keys( $per ) as $k ) echo '<td>' . $fn( $S[ $k ]['cur'], $S[ $k ]['ly'] ) . '</td>'; // phpcs:ignore
			echo '</tr>';
		}
		echo '</tbody></table><div class="ctcd-note">Net sales = order totals after coupons and refunds, before Stripe fees (WooCommerce Analytics). "vs last year" compares the same stretch of time one year earlier.</div></div>';

		// Chart + top products.
		$daily = ctc_db_daily();
		$max   = max( 1, max( array_column( $daily, 'net' ) ) );
		echo '<div class="ctcd-grid2" style="margin-top:12px"><div class="ctcd-card"><table><thead><tr><th>Net sales, last 30 days</th><th>' . ctc_db_money( array_sum( array_column( $daily, 'net' ) ) ) . ' · ' . number_format( array_sum( array_column( $daily, 'orders' ) ) ) . ' orders</th></tr></thead></table><div class="ctcd-bars">';
		foreach ( $daily as $d => $v ) echo '<span style="height:' . round( max( 0, $v['net'] ) / $max * 100, 1 ) . '%" title="' . esc_attr( wp_date( 'D M j', strtotime( $d . ' 12:00' ) ) . ': ' . ctc_db_money( $v['net'] ) . ', ' . $v['orders'] . ' orders' ) . '"></span>';
		$keys = array_keys( $daily );
		echo '</div><div class="ctcd-axis"><span>' . esc_html( wp_date( 'M j', strtotime( $keys[0] . ' 12:00' ) ) ) . '</span><span>Today</span></div></div>';
		echo '<div class="ctcd-card"><table><thead><tr><th>Top products this year</th><th>Sold</th><th>Net</th></tr></thead><tbody>';
		foreach ( ctc_db_products() as $pr ) echo '<tr><td style="white-space:normal">' . esc_html( $pr['name'] ) . '</td><td>' . number_format( $pr['qty'] ) . '</td><td>' . ctc_db_money( $pr['net'] ) . '</td></tr>';
		echo '</tbody></table></div></div>';

		// Subscriptions.
		$sub = ctc_db_subs();
		if ( $sub ) {
			$st = $sub['status'];
			echo '<h2 class="ctcd-h">Auto-renewal subscriptions</h2><div class="ctcd-tiles">';
			echo '<div class="ctcd-tile"><div class="l">Active plans</div><div class="v">' . number_format( $st['active'] ?? 0 ) . '</div><div class="s">' . number_format( $sub['total'] ) . ' plans all time</div></div>';
			echo '<div class="ctcd-tile"><div class="l">New plans</div><div class="v">' . number_format( $sub['new']['year'] ) . '</div><div class="s">this year · ' . number_format( $sub['new']['month'] ) . ' this month · ' . number_format( $sub['new']['week'] ) . ' this week · ' . number_format( $sub['new']['today'] ) . ' today</div></div>';
			echo '<div class="ctcd-tile"><div class="l">Renewals due, next 30 days</div><div class="v">' . number_format( $sub['due30'] ) . '</div><div class="s">' . ctc_db_money( $sub['due_amt'], 2 ) . ' to be charged</div></div>';
			echo '<div class="ctcd-tile"><div class="l">On hold / cancelling</div><div class="v">' . number_format( ( $st['on-hold'] ?? 0 ) + ( $st['pending-cancel'] ?? 0 ) ) . '</div><div class="s">' . number_format( $st['on-hold'] ?? 0 ) . ' on hold (payment failed) · ' . number_format( $st['pending-cancel'] ?? 0 ) . ' cancel at period end</div></div>';
			echo '<div class="ctcd-tile"><div class="l">Cancelled</div><div class="v">' . number_format( $st['cancelled'] ?? 0 ) . '</div><div class="s">' . number_format( $sub['cancel_year'] ) . ' this year · ' . number_format( $st['expired'] ?? 0 ) . ' expired</div></div>';
			echo '</div>';
		}
	}

	// Website visitors.
	echo '<h2 class="ctcd-h">Website visitors (Google Analytics)</h2>';
	if ( $ga && empty( $ga['error'] ) ) {
		echo '<div class="ctcd-grid2"><div class="ctcd-card"><table><thead><tr><th></th>';
		foreach ( $per as $p ) echo '<th>' . esc_html( $p[0] ) . '</th>';
		echo '</tr></thead><tbody>';
		foreach ( array( 'users' => 'Visitors', 'sessions' => 'Visits (sessions)', 'views' => 'Page views' ) as $m => $label ) {
			echo '<tr><td>' . esc_html( $label ) . '</td>';
			foreach ( array_keys( $per ) as $k ) echo '<td><b>' . number_format( $ga['periods'][ $k ][ $m ] ?? 0 ) . '</b></td>';
			echo '</tr>';
		}
		echo '</tbody></table></div><div class="ctcd-card"><table><thead><tr><th>Where visits came from (this month)</th><th></th></tr></thead><tbody>';
		foreach ( $ga['channels'] as $ch => $n ) echo '<tr><td>' . esc_html( $ch ) . '</td><td>' . number_format( $n ) . '</td></tr>';
		echo '</tbody></table></div></div>';
	} else {
		echo '<div class="ctcd-card" style="padding:14px 16px">' . ( ! empty( $ga['error'] ) ? '<p class="ctcd-err">' . esc_html( $ga['error'] ) . '</p>' : '<p>Not connected yet.</p>' );
	}
	if ( current_user_can( 'manage_options' ) ) {
		$cfg = ctc_db_ga_cfg();
		if ( $ga && empty( $ga['error'] ) ) echo '<div class="ctcd-card" style="padding:10px 16px;margin-top:12px">';
		echo '<details' . ( ( ! $ga || ! empty( $ga['error'] ) ) ? ' open' : '' ) . '><summary>Google Analytics connection</summary>';
		if ( isset( $_GET['ctc_ga'] ) ) echo '<p>' . ( 'saved' === $_GET['ctc_ga'] ? 'Saved.' : '<span class="ctcd-err">That key file is not a Google service account key (JSON).</span>' ) . '</p>';
		echo '<ol style="margin-left:18px"><li>Google Cloud console → APIs &amp; Services → enable <b>Google Analytics Data API</b>.</li><li>IAM &amp; Admin → Service accounts → create one → Keys → Add key → JSON (downloads a file).</li><li>Google Analytics → Admin → Property access management → add the service account email as <b>Viewer</b>.</li><li>Google Analytics → Admin → Property details: copy the <b>Property ID</b> (numbers only).</li></ol>';
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '"><input type="hidden" name="action" value="ctc_db_ga4">' . wp_nonce_field( 'ctc_db_ga4', '_wpnonce', true, false );
		echo '<p><label>Property ID<br><input name="property" value="' . esc_attr( $cfg['property'] ?? '' ) . '" placeholder="123456789"></label></p>';
		$em = json_decode( $cfg['key'] ?? '', true );
		echo '<p><label>Service account key (paste the whole JSON file)' . ( ! empty( $em['client_email'] ) ? ' — saved for <code>' . esc_html( $em['client_email'] ) . '</code>; leave empty to keep it' : '' ) . '<br><textarea name="key" placeholder="{ &quot;type&quot;: &quot;service_account&quot;, ... }"></textarea></label></p>';
		echo '<p><button class="button button-primary">Save</button></p></form></details>';
		if ( $ga && empty( $ga['error'] ) ) echo '</div>';
	}
	if ( ! $ga || ! empty( $ga['error'] ) ) echo '</div>';

	// Moodle.
	echo '<h2 class="ctcd-h">Courses (learn.cataxcourses.com)</h2>';
	if ( empty( $mdl ) || ! empty( $mdl['error'] ) ) {
		echo '<div class="ctcd-card" style="padding:14px 16px"><p class="ctcd-err">Moodle stats unavailable: ' . esc_html( $mdl['error'] ?? 'no response' ) . '</p></div>';
	} else {
		echo '<div class="ctcd-course">';
		foreach ( array( '20' => '20 Hour CE', '60' => '60 Hour QE' ) as $k => $label ) {
			$c = $mdl['current'][ $k ] ?? null;
			if ( ! $c ) continue;
			$pct = $c['enrolled'] ? round( $c['completed'] / $c['enrolled'] * 100 ) : 0;
			echo '<div class="ctcd-card"><h3>' . esc_html( $c['course'] ) . '</h3><div class="ctcd-tiles" style="grid-template-columns:repeat(3,1fr)">';
			echo '<div><div class="l" style="font-size:12px;color:#646970">ENROLLED</div><div style="font-size:24px;font-weight:700">' . number_format( $c['enrolled'] ) . '</div></div>';
			echo '<div><div class="l" style="font-size:12px;color:#646970">FINISHED</div><div style="font-size:24px;font-weight:700;color:#1a7f4b">' . number_format( $c['completed'] ) . '</div></div>';
			echo '<div><div class="l" style="font-size:12px;color:#646970">IN PROGRESS</div><div style="font-size:24px;font-weight:700;color:#8f6f14">' . number_format( $c['inprogress'] ) . '</div></div>';
			echo '</div><div class="ctcd-meter"><i style="width:' . (int) $pct . '%"></i></div><div class="ctcd-note">' . (int) $pct . '% of active students have finished · ' . esc_html( $label ) . '</div></div>';
		}
		echo '</div><div class="ctcd-card" style="margin-top:12px"><table><thead><tr><th></th>';
		foreach ( $per as $p ) echo '<th>' . esc_html( $p[0] ) . '</th>';
		echo '</tr></thead><tbody>';
		$line = function ( $label, $set, $k ) use ( $per ) {
			echo '<tr><td>' . esc_html( $label ) . '</td>';
			foreach ( array_keys( $per ) as $p ) echo '<td>' . ( 'all' === $k ? '<b>' : '' ) . number_format( $set[ $p ][ $k ] ?? 0 ) . ( 'all' === $k ? '</b>' : '' ) . '</td>';
			echo '</tr>';
		};
		$line( 'New enrollments — all courses', $mdl['enrollments'], 'all' );
		$line( '↳ 20 Hour', $mdl['enrollments'], '20' );
		$line( '↳ 60 Hour', $mdl['enrollments'], '60' );
		$line( 'Course completions — all courses', $mdl['completions'], 'all' );
		$line( '↳ 20 Hour', $mdl['completions'], '20' );
		$line( '↳ 60 Hour', $mdl['completions'], '60' );
		if ( ! empty( $mdl['ctec'] ) ) $line( 'Hours reported to CTEC', $mdl['ctec'], 'all' );
		echo '</tbody></table><div class="ctcd-note">' . number_format( $mdl['students_total'] ?? 0 ) . ' student accounts in Moodle. Enrolled / finished / in progress count active enrollments in the newest 20 and 60 Hour courses.</div></div>';
	}
	echo '</div>';
}
