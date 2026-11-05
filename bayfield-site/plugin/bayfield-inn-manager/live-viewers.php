<?php
/**
 * Live visitor counter + simple daily stats.
 * Visitors send a small "still here" ping every 25 seconds while the tab is visible (every page,
 * plus a webcam flag on the Webcam page). Anyone who pinged in the last 70 seconds counts as
 * "on the website now" / "watching the webcam now". Daily totals (visits, page views, webcam
 * viewers, peak watching at once) go into a small table for the dashboard.
 * Logged-in team members are not counted (the script is only printed for visitors).
 */
defined( 'ABSPATH' ) || exit;

const BI_LIVE_KEY      = 'bi_live_viewers'; // webcam
const BI_LIVE_SITE_KEY = 'bi_live_site';    // whole website
const BI_LIVE_WINDOW   = 70;   // seconds a ping stays "active"
const BI_LIVE_PAGE     = 'webcam';
const BI_STATS_DB      = '1';

function bi_live_list( $key ) {
	$list = get_transient( $key );
	$list = is_array( $list ) ? $list : array();
	$cut  = time() - BI_LIVE_WINDOW;
	return array_filter( $list, function ( $t ) use ( $cut ) { return $t >= $cut; } );
}
function bi_live_viewers() { return bi_live_list( BI_LIVE_KEY ); }
function bi_live_site() { return bi_live_list( BI_LIVE_SITE_KEY ); }

function bi_live_touch( $key, $id, $leave ) {
	$list = bi_live_list( $key );
	if ( $leave ) {
		unset( $list[ $id ] );
	} elseif ( isset( $list[ $id ] ) || count( $list ) < 5000 ) {
		$list[ $id ] = time();
	}
	set_transient( $key, $list, 10 * MINUTE_IN_SECONDS );
	return count( $list );
}

/* ---------------------------------------------------------- daily stats */
function bi_stats_table() {
	global $wpdb;
	return $wpdb->prefix . 'bi_stats';
}
add_action( 'init', function () {
	if ( get_option( 'bi_stats_db' ) === BI_STATS_DB ) {
		return;
	}
	global $wpdb;
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
	dbDelta( 'CREATE TABLE ' . bi_stats_table() . " (
		day date NOT NULL,
		metric varchar(20) NOT NULL,
		n int unsigned NOT NULL DEFAULT 0,
		PRIMARY KEY  (day,metric)
	) " . $wpdb->get_charset_collate() . ';' );
	update_option( 'bi_stats_db', BI_STATS_DB );
	if ( ! get_option( 'bi_stats_since' ) ) {
		update_option( 'bi_stats_since', wp_date( 'Y-m-d' ), false );
	}
} );
/** Add 1 to a metric for today, or (with $max) keep the highest value seen today. */
function bi_stat( $metric, $max = null ) {
	global $wpdb;
	$t = bi_stats_table();
	if ( null === $max ) {
		$wpdb->query( $wpdb->prepare( "INSERT INTO $t (day, metric, n) VALUES (%s, %s, 1) ON DUPLICATE KEY UPDATE n = n + 1", wp_date( 'Y-m-d' ), $metric ) ); // phpcs:ignore
	} else {
		$wpdb->query( $wpdb->prepare( "INSERT INTO $t (day, metric, n) VALUES (%s, %s, %d) ON DUPLICATE KEY UPDATE n = GREATEST(n, VALUES(n))", wp_date( 'Y-m-d' ), $metric, (int) $max ) ); // phpcs:ignore
	}
}
/** Daily rows for the last $days days: [ 'Y-m-d' => [ metric => n ] ]. */
function bi_stats_days( $days = 400 ) {
	global $wpdb;
	$t    = bi_stats_table();
	$from = wp_date( 'Y-m-d', time() - $days * DAY_IN_SECONDS );
	$rows = $wpdb->get_results( $wpdb->prepare( "SELECT day, metric, n FROM $t WHERE day >= %s", $from ), ARRAY_A ); // phpcs:ignore
	$out  = array();
	foreach ( (array) $rows as $r ) {
		$out[ $r['day'] ][ $r['metric'] ] = (int) $r['n'];
	}
	return $out;
}

add_action( 'rest_api_init', function () {
	// Public ping (no nonce: pages are served from cache). Only stores a random tab id + time.
	register_rest_route( 'bayfield/v1', '/live/ping', array(
		'methods'             => 'POST',
		'permission_callback' => '__return_true',
		'callback'            => function ( WP_REST_Request $req ) {
			$id = (string) $req->get_param( 'id' );
			if ( ! preg_match( '/^[a-z0-9]{12,40}$/', $id ) ) {
				return new WP_Error( 'bad_id', 'Bad id', array( 'status' => 400 ) );
			}
			$leave = 'leave' === $req->get_param( 'state' );
			$cam   = (bool) $req->get_param( 'cam' );
			bi_live_touch( BI_LIVE_SITE_KEY, $id, $leave );
			if ( $cam ) {
				$watching = bi_live_touch( BI_LIVE_KEY, $id, $leave );
				if ( ! $leave ) {
					bi_stat( 'cam_peak', $watching );
				}
			}
			if ( ! $leave ) {
				if ( $req->get_param( 'visit' ) ) {
					bi_stat( 'visits' );
				}
				if ( $req->get_param( 'view' ) ) {
					bi_stat( 'views' );
				}
				if ( $req->get_param( 'camvisit' ) ) {
					bi_stat( 'cam_viewers' );
				}
			}
			return array( 'ok' => true );
		},
	) );
	register_rest_route( 'bayfield/v1', '/live/count', array(
		'methods'             => 'GET',
		'permission_callback' => function () { return current_user_can( 'edit_pages' ); },
		'callback'            => function () { return array( 'count' => count( bi_live_viewers() ), 'site' => count( bi_live_site() ) ); },
	) );
} );

/* Ping script on every page for visitors (logged-in pages are never cached, so the team is not counted). */
add_action( 'wp_footer', function () {
	if ( is_user_logged_in() || is_404() ) {
		return;
	}
	?>
	<script>
	(function () {
		var url = <?php echo wp_json_encode( esc_url_raw( rest_url( 'bayfield/v1/live/ping' ) ) ); ?>, cam = <?php echo is_page( BI_LIVE_PAGE ) ? 1 : 0; ?>, id, ss = {}, first = true;
		try { ss = window.sessionStorage; id = ss.getItem('bi-live-id'); } catch (e) { ss = {}; }
		var newVisit = !id;
		if (!id) { id = (Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/[^a-z0-9]/g, '').slice(0, 24); try { ss.setItem('bi-live-id', id); } catch (e) {} }
		var camVisit = false;
		if (cam) { try { camVisit = !ss.getItem('bi-cam-seen'); ss.setItem('bi-cam-seen', '1'); } catch (e) {} }
		function send(state) {
			var body = 'id=' + id + (cam ? '&cam=1' : '') + (state ? '&state=' + state : '');
			if (first && !state) { body += '&view=1' + (newVisit ? '&visit=1' : '') + (camVisit ? '&camvisit=1' : ''); first = false; }
			if (state === 'leave' && navigator.sendBeacon) { navigator.sendBeacon(url, new Blob([body], { type: 'application/x-www-form-urlencoded' })); return; }
			fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body, keepalive: true, credentials: 'omit' }).catch(function () {});
		}
		function tick() { if (document.visibilityState === 'visible') send(); }
		function start() { tick(); setInterval(tick, 25000); document.addEventListener('visibilitychange', tick); window.addEventListener('pagehide', function () { send('leave'); }); }
		if (document.readyState === 'complete') setTimeout(start, 1500); else window.addEventListener('load', function () { setTimeout(start, 1500); });
	})();
	</script>
	<?php
} );

/* Admin bar counter (administrators only), refreshed every 20 seconds. */
add_action( 'admin_bar_menu', function ( $bar ) {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$n = count( bi_live_viewers() );
	$bar->add_node( array(
		'id'    => 'bi-live-viewers',
		'title' => '<span class="bi-live-dot"></span><span class="bi-live-n">' . $n . '</span> watching webcam',
		'href'  => home_url( '/' . BI_LIVE_PAGE . '/' ),
		'meta'  => array( 'title' => 'People on the Webcam page right now (updates every 20 seconds; admins not counted)' ),
	) );
}, 100 );

function bi_live_bar_assets() {
	if ( ! is_admin_bar_showing() || ! current_user_can( 'manage_options' ) ) {
		return;
	}
	?>
	<style>
	#wp-admin-bar-bi-live-viewers .bi-live-dot { display: inline-block; width: 8px; height: 8px; margin-right: 7px; border-radius: 50%; background: #E74C3C; vertical-align: 1px; animation: bi-live-pulse 1.6s ease-in-out infinite; }
	#wp-admin-bar-bi-live-viewers .bi-live-n { font-weight: 600; }
	@keyframes bi-live-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
	</style>
	<script>
	(function () {
		var url = <?php echo wp_json_encode( esc_url_raw( rest_url( 'bayfield/v1/live/count' ) ) ); ?>;
		var nonce = <?php echo wp_json_encode( wp_create_nonce( 'wp_rest' ) ); ?>;
		function update() {
			var el = document.querySelector('#wp-admin-bar-bi-live-viewers .bi-live-n'); if (!el) return;
			fetch(url, { headers: { 'X-WP-Nonce': nonce }, credentials: 'same-origin', cache: 'no-store' })
				.then(function (r) { return r.ok ? r.json() : null; })
				.then(function (d) { if (d && typeof d.count === 'number') el.textContent = d.count; })
				.catch(function () {});
		}
		setInterval(update, 20000);
	})();
	</script>
	<?php
}
add_action( 'wp_footer', 'bi_live_bar_assets', 100 );
add_action( 'admin_footer', 'bi_live_bar_assets', 100 );
