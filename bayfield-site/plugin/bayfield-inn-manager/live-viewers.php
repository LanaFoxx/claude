<?php
/**
 * Live viewer counter for the Webcam page.
 * Visitors on /webcam/ send a small "still here" ping every 25 seconds while the tab is visible.
 * Anyone who pinged in the last 70 seconds counts as watching. Logged-in administrators are not
 * counted. Only administrators see the number, in the WordPress admin bar.
 */
defined( 'ABSPATH' ) || exit;

const BI_LIVE_KEY    = 'bi_live_viewers';
const BI_LIVE_WINDOW = 70;   // seconds a ping stays "active"
const BI_LIVE_PAGE   = 'webcam';

function bi_live_viewers() {
	$list = get_transient( BI_LIVE_KEY );
	$list = is_array( $list ) ? $list : array();
	$cut  = time() - BI_LIVE_WINDOW;
	return array_filter( $list, function ( $t ) use ( $cut ) { return $t >= $cut; } );
}

add_action( 'rest_api_init', function () {
	// Public ping (no nonce: the page may be served from cache). Only stores a random tab id + time.
	register_rest_route( 'bayfield/v1', '/live/ping', array(
		'methods'             => 'POST',
		'permission_callback' => '__return_true',
		'callback'            => function ( WP_REST_Request $req ) {
			$id = (string) $req->get_param( 'id' );
			if ( ! preg_match( '/^[a-z0-9]{12,40}$/', $id ) ) {
				return new WP_Error( 'bad_id', 'Bad id', array( 'status' => 400 ) );
			}
			if ( current_user_can( 'manage_options' ) ) {
				return array( 'ok' => true, 'counted' => false );
			}
			$list = bi_live_viewers();
			if ( 'leave' === $req->get_param( 'state' ) ) {
				unset( $list[ $id ] );
			} elseif ( isset( $list[ $id ] ) || count( $list ) < 5000 ) {
				$list[ $id ] = time();
			}
			set_transient( BI_LIVE_KEY, $list, 10 * MINUTE_IN_SECONDS );
			return array( 'ok' => true );
		},
	) );
	register_rest_route( 'bayfield/v1', '/live/count', array(
		'methods'             => 'GET',
		'permission_callback' => function () { return current_user_can( 'manage_options' ); },
		'callback'            => function () { return array( 'count' => count( bi_live_viewers() ) ); },
	) );
} );

/* Ping script, only on the Webcam page. */
add_action( 'wp_footer', function () {
	if ( ! is_page( BI_LIVE_PAGE ) ) {
		return;
	}
	?>
	<script>
	(function () {
		var url = <?php echo wp_json_encode( esc_url_raw( rest_url( 'bayfield/v1/live/ping' ) ) ); ?>, id;
		try { id = sessionStorage.getItem('bi-live-id'); } catch (e) {}
		if (!id) { id = (Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/[^a-z0-9]/g, '').slice(0, 24); try { sessionStorage.setItem('bi-live-id', id); } catch (e) {} }
		function send(state) {
			var body = 'id=' + id + (state ? '&state=' + state : '');
			if (state === 'leave' && navigator.sendBeacon) { navigator.sendBeacon(url, new Blob([body], { type: 'application/x-www-form-urlencoded' })); return; }
			fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body, keepalive: true, credentials: 'same-origin' }).catch(function () {});
		}
		function tick() { if (document.visibilityState === 'visible') send(); }
		tick(); setInterval(tick, 25000);
		document.addEventListener('visibilitychange', tick);
		window.addEventListener('pagehide', function () { send('leave'); });
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
