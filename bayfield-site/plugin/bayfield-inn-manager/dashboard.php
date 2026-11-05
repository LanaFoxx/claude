<?php
/**
 * WordPress admin made simple for the Bayfield Inn team:
 * - Dashboard: live "on the website / watching the webcam" numbers, visitor stats with
 *   Today / 7 days / 30 days / 12 months, and quick links. WordPress's default boxes are removed.
 * - Left menu: the everyday items first; everything else folds under "More tools".
 * - Add / edit user: a plain-English list of what each role can do.
 */
defined( 'ABSPATH' ) || exit;

/* ============================================================ dashboard */
add_action( 'wp_dashboard_setup', function () {
	global $wp_meta_boxes;
	$wp_meta_boxes['dashboard'] = array(); // phpcs:ignore -- drop WordPress / plugin default boxes
	remove_action( 'welcome_panel', 'wp_welcome_panel' );
	wp_add_dashboard_widget( 'bi_dash_live', 'Right now', 'bi_dash_live' );
	wp_add_dashboard_widget( 'bi_dash_stats', 'Visitors', 'bi_dash_stats' );
	wp_add_dashboard_widget( 'bi_dash_links', 'Quick links', 'bi_dash_links' );
	// Stats on the left, live + links on the right.
	$wp_meta_boxes['dashboard']['side']['core']['bi_dash_live'] = $wp_meta_boxes['dashboard']['normal']['core']['bi_dash_live']; // phpcs:ignore
	$wp_meta_boxes['dashboard']['side']['core']['bi_dash_links'] = $wp_meta_boxes['dashboard']['normal']['core']['bi_dash_links']; // phpcs:ignore
	unset( $wp_meta_boxes['dashboard']['normal']['core']['bi_dash_live'], $wp_meta_boxes['dashboard']['normal']['core']['bi_dash_links'] );
}, 9999 );
// Fresh layout for everyone (ignores box positions saved before this dashboard existed).
add_filter( 'get_user_option_meta-box-order_dashboard', '__return_false' );
add_filter( 'get_user_option_closedpostboxes_dashboard', '__return_false' );

function bi_dash_live() {
	?>
	<div class="bi-live">
		<a class="bi-live__box" href="<?php echo esc_url( home_url( '/' ) ); ?>" target="_blank">
			<span class="bi-live__n" data-live="site"><?php echo (int) count( bi_live_site() ); ?></span>
			<span class="bi-live__label">on the website now</span>
		</a>
		<a class="bi-live__box" href="<?php echo esc_url( home_url( '/' . BI_LIVE_PAGE . '/' ) ); ?>" target="_blank">
			<span class="bi-live__n" data-live="cam"><span class="bi-live__dot"></span><?php echo (int) count( bi_live_viewers() ); ?></span>
			<span class="bi-live__label">watching the webcam now</span>
		</a>
	</div>
	<p class="bi-dash-note">Updates every 20 seconds. Logged-in team members aren't counted.</p>
	<?php
}

function bi_dash_stats() {
	$days  = bi_stats_days( 400 );
	$since = get_option( 'bi_stats_since' );
	?>
	<div class="bi-stats">
		<div class="bi-range" role="tablist" aria-label="Time range">
			<button type="button" class="button" data-range="1">Today</button>
			<button type="button" class="button button-primary" data-range="7">Last 7 days</button>
			<button type="button" class="button" data-range="30">Last 30 days</button>
			<button type="button" class="button" data-range="365">Last 12 months</button>
		</div>
		<div class="bi-tiles">
			<div class="bi-tile"><span class="bi-tile__n" data-k="visits">0</span><span class="bi-tile__l">Website visits</span></div>
			<div class="bi-tile"><span class="bi-tile__n" data-k="views">0</span><span class="bi-tile__l">Pages viewed</span></div>
			<div class="bi-tile"><span class="bi-tile__n" data-k="cam_viewers">0</span><span class="bi-tile__l">Webcam viewers</span></div>
			<div class="bi-tile"><span class="bi-tile__n" data-k="cam_peak">0</span><span class="bi-tile__l">Most watching at once</span></div>
		</div>
		<h4 class="bi-chart-title">Website visits <span data-unit>per day</span></h4>
		<div class="bi-chart" data-chart="visits"></div>
		<h4 class="bi-chart-title">Webcam viewers <span data-unit>per day</span></h4>
		<div class="bi-chart" data-chart="cam_viewers"></div>
		<p class="bi-dash-note">
			Counted by the website itself<?php echo $since ? ' since ' . esc_html( wp_date( 'F j, Y', strtotime( $since ) ) ) : ''; ?>. A visit is one person's session, however many pages they look at.
			<strong>Google Analytics</strong> (history from before the new site, traffic sources and more) will appear here once access is connected.
		</p>
	</div>
	<script type="application/json" id="bi-stats-data"><?php echo wp_json_encode( array( 'days' => (object) $days, 'today' => wp_date( 'Y-m-d' ) ) ); ?></script>
	<?php
}

function bi_dash_links() {
	$links = array(
		array( 'edit.php?post_type=page', 'admin-page', 'Edit pages', 'Hover a page, then click "Edit with Elementor". Switch pages on or off.' ),
		array( 'admin.php?page=bi-menus', 'food', 'Restaurant menus', 'Dishes, prices, and switching a menu on or off.' ),
		array( 'admin.php?page=bi-gallery', 'format-gallery', 'Gallery', 'Photos and sections on the Gallery page.' ),
		array( 'admin.php?page=bi-merch', 'cart', 'Merchandise', 'Items, Square payment links, sold out.' ),
	);
	if ( current_user_can( 'list_users' ) ) {
		$links[] = array( 'users.php', 'admin-users', 'Users', 'Add people who can log in, and choose what they can do.' );
	}
	echo '<ul class="bi-links">';
	foreach ( $links as $l ) {
		printf( '<li><a href="%s"><span class="dashicons dashicons-%s"></span><span><strong>%s</strong><small>%s</small></span></a></li>',
			esc_url( admin_url( $l[0] ) ), esc_attr( $l[1] ), esc_html( $l[2] ), esc_html( $l[3] ) );
	}
	echo '</ul>';
}

add_action( 'admin_head-index.php', function () {
	?>
	<style>
	#dashboard-widgets .postbox-header .hndle { font-size: 15px; }
	.bi-live { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
	.bi-live__box { display: flex; flex-direction: column; gap: 4px; padding: 16px; border: 1px solid #dcdcde; border-radius: 6px; text-decoration: none; color: #1d2327; }
	.bi-live__box:hover { border-color: #17301B; }
	.bi-live__n { font-size: 36px; line-height: 1; font-weight: 600; color: #17301B; display: flex; align-items: center; gap: 8px; }
	.bi-live__label { font-size: 13px; color: #50575e; }
	.bi-live__dot { width: 10px; height: 10px; border-radius: 50%; background: #E74C3C; animation: bi-live-pulse 1.6s ease-in-out infinite; }
	@keyframes bi-live-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
	.bi-dash-note { color: #646970; font-size: 12px; margin: 12px 0 0; }
	.bi-range { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 14px; }
	.bi-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 0 0 18px; }
	.bi-tile { padding: 12px; background: #f6f7f7; border-radius: 6px; display: flex; flex-direction: column; gap: 4px; }
	.bi-tile__n { font-size: 26px; line-height: 1.1; font-weight: 600; color: #1d2327; font-variant-numeric: tabular-nums; }
	.bi-tile__l { font-size: 12px; color: #50575e; }
	.bi-chart-title { margin: 6px 0 6px; font-size: 13px; }
	.bi-chart-title span { font-weight: 400; color: #646970; }
	.bi-chart { position: relative; height: 120px; margin: 0 0 14px; }
	.bi-chart svg { display: block; width: 100%; height: 100%; overflow: visible; }
	.bi-chart .bi-bar { fill: #17301B; }
	.bi-chart .bi-hit { fill: transparent; cursor: default; }
	.bi-chart .bi-hit:hover + .bi-bar, .bi-chart g:hover .bi-bar { fill: #2f5a35; }
	.bi-chart .bi-grid { stroke: #e0e0e0; stroke-width: 1; }
	.bi-chart .bi-axis { font-size: 10px; fill: #646970; }
	.bi-tip { position: absolute; pointer-events: none; background: #1d2327; color: #fff; font-size: 12px; padding: 4px 8px; border-radius: 4px; white-space: nowrap; transform: translate(-50%, -100%); margin-top: -6px; display: none; }
	.bi-empty-chart { color: #646970; font-size: 12px; padding: 40px 0; text-align: center; background: #f6f7f7; border-radius: 6px; }
	.bi-links { margin: 0; }
	.bi-links li { margin: 0; border-top: 1px solid #f0f0f1; }
	.bi-links li:first-child { border-top: 0; }
	.bi-links a { display: flex; gap: 10px; padding: 10px 2px; text-decoration: none; color: #1d2327; }
	.bi-links a:hover strong { color: #2271b1; }
	.bi-links .dashicons { color: #17301B; margin-top: 2px; }
	.bi-links small { display: block; color: #646970; }
	@media (max-width: 600px) { .bi-tiles { grid-template-columns: 1fr 1fr; } }
	</style>
	<?php
} );

add_action( 'admin_footer-index.php', function () {
	?>
	<script>
	(function () {
		// Live numbers.
		var url = <?php echo wp_json_encode( esc_url_raw( rest_url( 'bayfield/v1/live/count' ) ) ); ?>;
		var nonce = <?php echo wp_json_encode( wp_create_nonce( 'wp_rest' ) ); ?>;
		function setN(sel, n) { var el = document.querySelector(sel); if (!el) return; var dot = el.querySelector('.bi-live__dot'); el.textContent = n; if (dot) el.prepend(dot); }
		setInterval(function () {
			fetch(url, { headers: { 'X-WP-Nonce': nonce }, credentials: 'same-origin', cache: 'no-store' })
				.then(function (r) { return r.ok ? r.json() : null; })
				.then(function (d) { if (!d) return; setN('[data-live=site]', d.site); setN('[data-live=cam]', d.count); })
				.catch(function () {});
		}, 20000);

		// Stats.
		var raw = document.getElementById('bi-stats-data'); if (!raw) return;
		var data = JSON.parse(raw.textContent), days = data.days || {};
		var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
		function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
		var p = data.today.split('-'), today = new Date(+p[0], +p[1] - 1, +p[2]);
		function buckets(range) {
			var out = [];
			if (range === 365) { // 12 monthly bars
				for (var m = 11; m >= 0; m--) {
					var d = new Date(today.getFullYear(), today.getMonth() - m, 1), key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
					out.push({ label: MON[d.getMonth()], tip: MON[d.getMonth()] + ' ' + d.getFullYear(), match: function (k) { return function (day) { return day.slice(0, 7) === k; }; }(key) });
				}
			} else {
				var n = range === 1 ? 1 : range;
				for (var i = n - 1; i >= 0; i--) {
					var dd = new Date(today); dd.setDate(today.getDate() - i); var k2 = ymd(dd);
					out.push({ label: dd.getDate() === 1 || i === n - 1 || n <= 7 ? MON[dd.getMonth()] + ' ' + dd.getDate() : '', tip: dd.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), match: function (k) { return function (day) { return day === k; }; }(k2) });
				}
			}
			return out;
		}
		function sum(bs, metric, peak) {
			var t = 0;
			Object.keys(days).forEach(function (day) { if (bs.some(function (b) { return b.match(day); })) { var v = days[day][metric] || 0; t = peak ? Math.max(t, v) : t + v; } });
			return t;
		}
		function chart(el, bs, metric) {
			var vals = bs.map(function (b) { return Object.keys(days).filter(b.match).reduce(function (a, day) { return a + (days[day][metric] || 0); }, 0); });
			var max = Math.max.apply(null, vals);
			if (!max) { el.innerHTML = '<div class="bi-empty-chart">No visits counted yet for this period.</div>'; return; }
			var W = el.clientWidth || 600, H = 120, top = 8, bottom = 18, ph = H - top - bottom, n = vals.length;
			var slot = W / n, bw = Math.max(2, Math.min(28, slot - 2)), nice = Math.pow(10, Math.floor(Math.log10(max))), step = Math.ceil(max / nice) * nice, svg = '';
			svg += '<line class="bi-grid" x1="0" x2="' + W + '" y1="' + top + '" y2="' + top + '"/><text class="bi-axis" x="0" y="' + (top - 1) + '">' + step.toLocaleString() + '</text>';
			svg += '<line class="bi-grid" x1="0" x2="' + W + '" y1="' + (top + ph) + '" y2="' + (top + ph) + '"/>';
			vals.forEach(function (v, i) {
				var h = v ? Math.max(2, v / step * ph) : 0, x = i * slot + (slot - bw) / 2, y = top + ph - h, r = Math.min(4, bw / 2, h);
				var path = h ? 'M' + x + ',' + (top + ph) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + y + ' ' + (x + bw) + ',' + (y + r) + 'V' + (top + ph) + 'Z' : '';
				svg += '<g data-tip="' + bs[i].tip + ': ' + v.toLocaleString() + '" data-x="' + (x + bw / 2) + '" data-y="' + y + '"><rect class="bi-hit" x="' + (i * slot) + '" y="0" width="' + slot + '" height="' + (top + ph) + '"/>' + (path ? '<path class="bi-bar" d="' + path + '"/>' : '') + '</g>';
				if (bs[i].label) svg += '<text class="bi-axis" x="' + (x + bw / 2) + '" y="' + H + '" text-anchor="middle">' + bs[i].label + '</text>';
			});
			el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + vals.length + ' bars, highest ' + max + '">' + svg + '</svg><div class="bi-tip"></div>';
			var tip = el.querySelector('.bi-tip');
			el.querySelectorAll('g[data-tip]').forEach(function (g) {
				g.addEventListener('mouseenter', function () { tip.textContent = g.dataset.tip; tip.style.left = g.dataset.x + 'px'; tip.style.top = g.dataset.y + 'px'; tip.style.display = 'block'; });
				g.addEventListener('mouseleave', function () { tip.style.display = 'none'; });
			});
		}
		function render(range) {
			var bs = buckets(range);
			['visits', 'views', 'cam_viewers'].forEach(function (k) { document.querySelector('[data-k=' + k + ']').textContent = sum(bs, k).toLocaleString(); });
			document.querySelector('[data-k=cam_peak]').textContent = sum(bs, 'cam_peak', true).toLocaleString();
			document.querySelectorAll('[data-unit]').forEach(function (u) { u.textContent = range === 365 ? 'per month' : 'per day'; });
			document.querySelectorAll('.bi-chart').forEach(function (el) { chart(el, bs, el.dataset.chart); });
			document.querySelectorAll('.bi-range button').forEach(function (b) { b.classList.toggle('button-primary', +b.dataset.range === range); });
			try { localStorage.setItem('bi-range', range); } catch (e) {}
		}
		var start = 7; try { start = +localStorage.getItem('bi-range') || 7; } catch (e) {}
		document.querySelectorAll('.bi-range button').forEach(function (b) { b.addEventListener('click', function () { render(+b.dataset.range); }); });
		render([1, 7, 30, 365].indexOf(start) > -1 ? start : 7);
		var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { var a = document.querySelector('.bi-range .button-primary'); render(a ? +a.dataset.range : 7); }, 200); });
	})();
	</script>
	<?php
} );

/* ============================================================ left menu */
// Everyday items first; the rest fold under "More tools" (click to open, remembered per browser).
const BI_MENU_MAIN = array( 'index.php', 'bi-menus', 'edit.php?post_type=page', 'upload.php', 'users.php', 'profile.php' );

add_filter( 'custom_menu_order', '__return_true' );
add_filter( 'menu_order', function ( $order ) {
	$main = array_values( array_intersect( BI_MENU_MAIN, $order ) );
	$rest = array_values( array_filter( $order, function ( $s ) use ( $main ) { return ! in_array( $s, $main, true ); } ) );
	return array_merge( $main, $rest );
}, 9999 );

add_action( 'admin_menu', function () {
	global $menu;
	foreach ( (array) $menu as $i => $item ) {
		if ( ! in_array( $item[2] ?? '', BI_MENU_MAIN, true ) ) {
			$menu[ $i ][4] = trim( ( $item[4] ?? '' ) . ' bi-more' ); // phpcs:ignore
		}
	}
}, 99999 );

add_action( 'admin_head', function () {
	?>
	<style>
	#adminmenu li.bi-more { display: none; }
	#adminmenu.bi-more-open li.bi-more:not(.wp-menu-separator) { display: block; }
	#adminmenu li.bi-more.wp-has-current-submenu, #adminmenu li.bi-more.current { display: block; }
	#adminmenu li.bi-more-toggle a { color: #a7aaad; font-size: 13px; }
	#adminmenu li.bi-more-toggle .wp-menu-image::before { content: "\f347"; }
	#adminmenu.bi-more-open li.bi-more-toggle .wp-menu-image::before { content: "\f343"; }
	#adminmenu li.bi-more-toggle { border-top: 1px solid rgba(255,255,255,.12); margin-top: 8px; padding-top: 4px; }
	</style>
	<script>
	document.addEventListener('DOMContentLoaded', function () {
		var menu = document.getElementById('adminmenu'); if (!menu) return;
		var first = menu.querySelector('li.bi-more:not(.wp-menu-separator)'); if (!first) return;
		var li = document.createElement('li');
		li.className = 'menu-top bi-more-toggle';
		li.innerHTML = '<a href="#" class="menu-top" aria-expanded="false"><div class="wp-menu-arrow"><div></div></div><div class="wp-menu-image dashicons-before" aria-hidden="true"><br></div><div class="wp-menu-name">More tools</div></a>';
		var firstMore = menu.querySelector('li.bi-more');
		menu.insertBefore(li, firstMore);
		var a = li.querySelector('a');
		function set(open) { menu.classList.toggle('bi-more-open', open); a.setAttribute('aria-expanded', open ? 'true' : 'false'); a.querySelector('.wp-menu-name').textContent = open ? 'Fewer tools' : 'More tools'; }
		var open = false; try { open = localStorage.getItem('bi-more-open') === '1'; } catch (e) {}
		set(open);
		a.addEventListener('click', function (e) { e.preventDefault(); open = !open; set(open); try { localStorage.setItem('bi-more-open', open ? '1' : '0'); } catch (e2) {} });
	});
	</script>
	<?php
} );

/* ========================================================== user roles */
function bi_role_help() {
	$roles = array(
		'administrator' => array( 'Administrator', 'Everything: all pages, menus, gallery and merchandise, plus adding and removing users, plugins and site settings. Give this only to owners and the web team.' ),
		'editor'        => array( 'Editor', 'Recommended for staff. Can edit every page with Elementor, update restaurant menus, the gallery and merchandise, switch pages on or off, and upload photos. Cannot add users, change plugins or site settings.' ),
		'author'        => array( 'Author', 'Can write and publish their own blog posts and upload photos. Cannot edit pages, menus, the gallery or merchandise.' ),
		'contributor'   => array( 'Contributor', 'Can write blog posts but not publish them (an Editor or Administrator has to approve). Cannot upload photos or edit pages.' ),
		'subscriber'    => array( 'Subscriber', 'Can only log in and edit their own profile. No access to the website content.' ),
	);
	$wp_roles = wp_roles()->get_names();
	echo '<div class="bi-role-help"><h3>What each role can do</h3><table class="widefat striped"><tbody>';
	foreach ( $roles as $key => $r ) {
		if ( isset( $wp_roles[ $key ] ) ) {
			printf( '<tr><th scope="row">%s</th><td>%s</td></tr>', esc_html( $r[0] ), esc_html( $r[1] ) );
		}
	}
	foreach ( $wp_roles as $key => $name ) { // roles added by plugins
		if ( ! isset( $roles[ $key ] ) ) {
			printf( '<tr><th scope="row">%s</th><td>Added by a plugin for its own tools. Usually not needed for the team.</td></tr>', esc_html( translate_user_role( $name ) ) );
		}
	}
	echo '</tbody></table><p class="description">Tip: use the person\'s email address as their username so they can\'t forget it. They log in at <strong>' . esc_html( home_url( '/binnlogin' ) ) . '</strong>.</p></div>';
}
add_action( 'user_new_form', function () { bi_role_help(); } );
add_action( 'edit_user_profile', function () { if ( current_user_can( 'promote_users' ) ) { bi_role_help(); } } );
add_action( 'admin_head', function () {
	$screen = get_current_screen();
	if ( ! $screen || ! in_array( $screen->id, array( 'user', 'user-edit', 'users' ), true ) ) {
		return;
	}
	echo '<style>.bi-role-help{max-width:820px;margin:24px 0}.bi-role-help th{width:140px;font-weight:600}.bi-role-help td,.bi-role-help th{padding:10px 12px}</style>';
} );
// Same table on the Users list, under a "What can each role do?" toggle.
add_action( 'admin_notices', function () {
	$screen = get_current_screen();
	if ( ! $screen || 'users' !== $screen->id || ! current_user_can( 'promote_users' ) ) {
		return;
	}
	echo '<details class="bi-role-details" style="margin:12px 0"><summary style="cursor:pointer;font-weight:600">What can each role do?</summary>';
	bi_role_help();
	echo '</details>';
} );
