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
	// Left column: Google Analytics, then the site's own visitor counts. Right: live webcam, add a product, quick links.
	wp_add_dashboard_widget( 'bi_dash_ga', 'Google Analytics', 'bi_dash_ga' );
	wp_add_dashboard_widget( 'bi_dash_stats', 'Website & webcam visitors (counted by the site)', 'bi_dash_stats' );
	wp_add_dashboard_widget( 'bi_dash_cam', 'Live webcam', 'bi_dash_cam' );
	wp_add_dashboard_widget( 'bi_dash_product', 'Add a product', 'bi_dash_product' );
	wp_add_dashboard_widget( 'bi_dash_links', 'Quick links', 'bi_dash_links' );
	foreach ( array( 'bi_dash_cam', 'bi_dash_product', 'bi_dash_links' ) as $w ) {
		$wp_meta_boxes['dashboard']['side']['core'][ $w ] = $wp_meta_boxes['dashboard']['normal']['core'][ $w ]; // phpcs:ignore
		unset( $wp_meta_boxes['dashboard']['normal']['core'][ $w ] );
	}
}, 9999 );
// Fresh layout for everyone (ignores box positions saved before this dashboard existed).
add_filter( 'get_user_option_meta-box-order_dashboard', '__return_false' );
add_filter( 'get_user_option_closedpostboxes_dashboard', '__return_false' );

function bi_dash_cam() {
	?>
	<div class="bi-cam">
		<div class="bi-cam__player"><div id="player_bayfieldlive"></div></div>
		<div class="bi-live">
			<a class="bi-live__box" href="<?php echo esc_url( home_url( '/' . BI_LIVE_PAGE . '/' ) ); ?>" target="_blank">
				<span class="bi-live__n" data-live="cam"><span class="bi-live__dot"></span><?php echo (int) count( bi_live_viewers() ); ?></span>
				<span class="bi-live__label">watching the webcam page now</span>
			</a>
			<a class="bi-live__box" href="<?php echo esc_url( home_url( '/' ) ); ?>" target="_blank">
				<span class="bi-live__n" data-live="site"><?php echo (int) count( bi_live_site() ); ?></span>
				<span class="bi-live__label">on the website now</span>
			</a>
		</div>
	</div>
	<p class="bi-dash-note">Counts update every 20 seconds. Logged-in team members aren't counted.</p>
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
		array( 'admin.php?page=bi-hours', 'clock', 'Restaurant hours', 'Opening hours shown on each restaurant page.', 'hours' ),
		array( 'admin.php?page=bi-menus', 'food', 'Restaurant menus', 'Dishes, prices, and switching a menu on or off.' ),
		array( 'admin.php?page=bi-gallery', 'format-gallery', 'Gallery', 'Photos and sections on the Gallery page.' ),
		bi_store_on()
			? array( 'admin.php?page=wc-orders', 'cart', 'Orders', 'See and fulfill store orders (merchandise and gift cards).' )
			: array( 'admin.php?page=bi-merch', 'cart', 'Merchandise', 'All items: edit, reorder, sold out.' ),
	);
	if ( bi_store_on() ) {
		$links[] = array( 'edit.php?post_type=product', 'products', 'Products', 'All merchandise: photos, sizes, prices, stock.' );
	}
	if ( current_user_can( 'list_users' ) ) {
		$links[] = array( 'users.php', 'admin-users', 'Users', 'Add people who can log in, and choose what they can do.' );
	}
	echo '<ul class="bi-links">';
	foreach ( $links as $l ) {
		$sub = '';
		if ( 'hours' === ( $l[4] ?? '' ) ) {
			// One-click links straight to each restaurant's hours.
			$sub = '<span class="bi-links__sub">' . implode( '', array_map( function ( $slug, $name ) {
				return sprintf( '<a href="%s">%s</a>', esc_url( admin_url( 'admin.php?page=bi-hours#' . $slug ) ), esc_html( $name ) );
			}, array_keys( bi_hours_restaurants() ), bi_hours_restaurants() ) ) . '</span>';
		}
		printf( '<li><a href="%s"><span class="dashicons dashicons-%s"></span><span><strong>%s</strong><small>%s</small></span></a>%s</li>',
			esc_url( admin_url( $l[0] ) ), esc_attr( $l[1] ), esc_html( $l[2] ), esc_html( $l[3] ), $sub ); // phpcs:ignore -- $sub escaped above
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
	.bi-links__sub { display: flex; flex-wrap: wrap; gap: 6px; margin: -4px 0 10px 30px; }
	.bi-links__sub a { display: inline-block; padding: 3px 9px; border: 1px solid #c3c4c7; border-radius: 999px; font-size: 12px; text-decoration: none; color: #17301B; }
	.bi-links__sub a:hover { border-color: #17301B; background: #f0f6f2; }
	.bi-cam__player { position: relative; aspect-ratio: 16 / 9; background: #0F2113; border-radius: 6px; overflow: hidden; margin: 0 0 12px; }
	.bi-cam__player > div, .bi-cam__player iframe, .bi-cam__player video { position: absolute; inset: 0; width: 100% !important; height: 100% !important; padding: 0 !important; border: 0; }
	.bi-tiles--ga { grid-template-columns: repeat(3, 1fr); }
	.bi-tile__d { font-size: 11px; color: #646970; min-height: 14px; }
	.bi-tile__d.is-up { color: #1a7f37; } .bi-tile__d.is-down { color: #b32d2e; }
	.bi-range .bi-ga__rt { margin-left: auto; align-self: center; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }
	.bi-range .bi-ga__rt[hidden] { display: none; }
	.bi-ga__top { margin: 0 0 14px 18px; }
	.bi-ga__top li { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; border-bottom: 1px solid #f0f0f1; }
	.bi-ga__top li span:last-child { font-variant-numeric: tabular-nums; color: #50575e; }
	.bi-ga__foot { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 0; }
	.bi-ga__err { color: #b32d2e; }
	.bi-ga-setup summary { cursor: pointer; font-weight: 600; margin: 4px 0 8px; }
	.bi-ga-steps { margin-left: 18px; } .bi-ga-steps li { margin-bottom: 6px; }
	.bi-ga-form label, .bi-quick label { display: flex; flex-direction: column; gap: 4px; margin: 0 0 10px; font-size: 12px; color: #50575e; }
	.bi-ga-form input, .bi-quick input[type=text], .bi-quick input[type=url], .bi-quick textarea { width: 100%; max-width: none; }
	.bi-quick__row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
	.bi-quick__photos { display: flex; flex-wrap: wrap; gap: 8px; }
	.bi-quick__photos figure { position: relative; margin: 0; width: 64px; height: 64px; border-radius: 4px; overflow: hidden; background: #f0f0f1; }
	.bi-quick__photos img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.bi-quick__photos button { position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; border-radius: 50%; border: 0; background: rgba(0,0,0,.65); color: #fff; line-height: 18px; cursor: pointer; padding: 0; }
	.bi-quick .button .dashicons { vertical-align: text-bottom; font-size: 17px; margin-right: 2px; }
	label.bi-quick__check { flex-direction: row; align-items: center; gap: 6px; font-size: 13px; color: #1d2327; }
	.bi-quick__actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 0; }
	@media (max-width: 600px) { .bi-tiles--ga { grid-template-columns: 1fr 1fr; } }
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

		var REST = <?php echo wp_json_encode( esc_url_raw( rest_url( 'bayfield/v1/' ) ) ); ?>;
		function api(path, opts) {
			opts = opts || {}; opts.headers = Object.assign({ 'X-WP-Nonce': nonce }, opts.headers || {}); opts.credentials = 'same-origin';
			return fetch(REST + path, opts).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j && j.message || 'Something went wrong.'); return j; }); });
		}
		function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }

		// Live webcam player (same Angelcam camera as the Webcam page).
		if (document.getElementById('player_bayfieldlive')) {
			var sdk = document.createElement('script'); sdk.src = 'https://v.angelcam.com/js_sdk';
			sdk.onload = function () { try { new Angelcam.player('player_bayfieldlive', { id: 'v8ypjjj8y6' }); } catch (e) {} };
			document.head.appendChild(sdk);
		}

		// Google Analytics summary.
		var ga = document.querySelector('[data-ga]');
		function fmtDur(s) { s = Math.round(s); return Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's'; }
		function loadGA(days) {
			ga.querySelectorAll('[data-days]').forEach(function (b) { b.classList.toggle('button-primary', +b.dataset.days === days); });
			ga.querySelector('[data-err]').hidden = true;
			api('ga/summary?days=' + days).then(function (d) {
				var n = d.now, b = d.before, v = {
					screenPageViews: [n.screenPageViews, b.screenPageViews, 'n'], totalUsers: [n.totalUsers, b.totalUsers, 'n'], sessions: [n.sessions, b.sessions, 'n'],
					returning: [Math.max(0, n.totalUsers - n.newUsers), Math.max(0, b.totalUsers - b.newUsers), 'n'],
					bounceRate: [n.bounceRate, b.bounceRate, 'pct'], averageSessionDuration: [n.averageSessionDuration, b.averageSessionDuration, 'dur'] };
				Object.keys(v).forEach(function (k) {
					var cur = v[k][0], prev = v[k][1], kind = v[k][2];
					ga.querySelector('[data-m=' + k + ']').textContent = kind === 'pct' ? (cur * 100).toFixed(1) + '%' : kind === 'dur' ? fmtDur(cur) : Math.round(cur).toLocaleString();
					var el = ga.querySelector('[data-d=' + k + ']'), ch = prev ? (cur - prev) / prev * 100 : null;
					el.className = 'bi-tile__d';
					if (ch === null || !isFinite(ch)) { el.textContent = ''; return; }
					var good = k === 'bounceRate' ? ch < 0 : ch > 0;
					el.textContent = (ch > 0 ? '▲ ' : ch < 0 ? '▼ ' : '') + Math.abs(ch).toFixed(0) + '% vs previous ' + days + ' days';
					if (Math.abs(ch) >= 1) el.classList.add(good ? 'is-up' : 'is-down');
				});
				ga.querySelector('[data-top]').innerHTML = (d.top || []).length ? d.top.map(function (t) { return '<li><span>' + esc(t.title || t.path) + '</span><span>' + t.views.toLocaleString() + '</span></li>'; }).join('') : '<li class="bi-dash-note">No page views yet for this period.</li>';
				var rt = ga.querySelector('.bi-ga__rt'); if (d.realtime !== null) { rt.hidden = false; rt.querySelector('[data-rt]').textContent = d.realtime; }
				ga.querySelector('[data-at]').textContent = 'Updated ' + new Date(d.at * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' (refreshes every 30 minutes)';
			}).catch(function (e) { var er = ga.querySelector('[data-err]'); er.textContent = 'Google Analytics: ' + e.message; er.hidden = false; ga.querySelector('[data-top]').innerHTML = ''; });
		}
		if (ga) { ga.querySelectorAll('[data-days]').forEach(function (b) { b.addEventListener('click', function () { loadGA(+b.dataset.days); }); }); loadGA(28); }

		// Connect Google Analytics (administrators).
		var gaForm = document.querySelector('[data-ga-form]');
		if (gaForm) gaForm.addEventListener('submit', function (e) {
			e.preventDefault(); var msg = gaForm.querySelector('[data-ga-msg]'); msg.textContent = 'Saving…';
			var f = new FormData(gaForm);
			api('ga/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ measurement_id: f.get('measurement_id'), property_id: f.get('property_id'), key: f.get('key') }) })
				.then(function (r) { if (r.connected && !r.error) { msg.textContent = 'Connected. Loading your numbers…'; location.reload(); } else msg.textContent = r.error ? 'Saved, but: ' + r.error : 'Saved. Add the Property ID and key to show reports here.'; })
				.catch(function (er) { msg.textContent = er.message; });
		});

		// Add a product.
		var qp = document.querySelector('[data-quick-product]');
		if (qp) {
			var photos = [], box = qp.querySelector('[data-photos]'), frame;
			function drawPhotos() {
				box.innerHTML = photos.map(function (p, i) { return '<figure><img src="' + esc(p.url) + '" alt=""><button type="button" data-rm="' + i + '" aria-label="Remove photo">×</button></figure>'; }).join('');
			}
			box.addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (b) { photos.splice(+b.dataset.rm, 1); drawPhotos(); } });
			qp.querySelector('[data-pick]').addEventListener('click', function () {
				if (!frame) {
					frame = wp.media({ title: 'Product photos (the first one is the cover)', button: { text: 'Use these photos' }, library: { type: 'image' }, multiple: 'add' });
					frame.on('select', function () {
						frame.state().get('selection').each(function (a) { a = a.toJSON(); if (!photos.some(function (p) { return p.id === a.id; })) photos.push({ id: a.id, url: (a.sizes && a.sizes.thumbnail || a).url }); });
						drawPhotos();
					});
				}
				frame.open();
			});
			qp.addEventListener('submit', function (e) {
				e.preventDefault(); var msg = qp.querySelector('[data-msg]'), btn = qp.querySelector('[type=submit]'), f = new FormData(qp);
				btn.disabled = true; msg.textContent = 'Adding…';
				api('products/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
					name: f.get('name'), price: f.get('price'), badge: f.get('badge'), link: f.get('link'), desc: f.get('desc'), first: !!f.get('first'), images: photos.map(function (p) { return p.id; }) }) })
					.then(function () {
						msg.innerHTML = 'Added. <a href="<?php echo esc_url( home_url( '/merchandise/' ) ); ?>" target="_blank">View the Merchandise page</a> · <a href="<?php echo esc_url( admin_url( 'admin.php?page=bi-merch' ) ); ?>">Edit items</a>';
						qp.reset(); photos = []; drawPhotos();
					})
					.catch(function (er) { msg.textContent = er.message; })
					.then(function () { btn.disabled = false; });
			});
		}

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

function bi_dash_ga() {
	$s = bi_ga_settings();
	if ( bi_ga_connected() ) {
		?>
		<div class="bi-ga" data-ga>
			<div class="bi-range" role="tablist" aria-label="Time range">
				<button type="button" class="button" data-days="7">Last 7 days</button>
				<button type="button" class="button button-primary" data-days="28">Last 28 days</button>
				<button type="button" class="button" data-days="90">Last 90 days</button>
				<span class="bi-ga__rt" hidden><span class="bi-live__dot"></span><b data-rt>0</b> on the site right now</span>
			</div>
			<div class="bi-tiles bi-tiles--ga">
				<?php
				foreach ( array(
					'screenPageViews'        => 'Page views',
					'totalUsers'             => 'Visitors',
					'sessions'               => 'Visits (sessions)',
					'returning'              => 'Returning visitors',
					'bounceRate'             => 'Bounce rate',
					'averageSessionDuration' => 'Avg. time on site',
				) as $k => $label ) {
					printf( '<div class="bi-tile"><span class="bi-tile__n" data-m="%s">–</span><span class="bi-tile__l">%s</span><span class="bi-tile__d" data-d="%s"></span></div>', esc_attr( $k ), esc_html( $label ), esc_attr( $k ) );
				}
				?>
			</div>
			<h4 class="bi-chart-title">Most viewed pages</h4>
			<ol class="bi-ga__top" data-top><li class="bi-dash-note">Loading…</li></ol>
			<p class="bi-ga__err" data-err hidden></p>
			<p class="bi-ga__foot">
				<a class="button button-primary" href="<?php echo esc_url( bi_ga_report_url() ); ?>" target="_blank" rel="noopener">View full reports in Google Analytics <span aria-hidden="true">&#8599;</span></a>
				<span class="bi-dash-note" data-at></span>
			</p>
		</div>
		<?php
	} else {
		?>
		<div class="bi-ga-setup">
			<p><strong>Not connected yet.</strong> Once Google Analytics is connected, this box shows page views, visitors, returning visitors, bounce rate, time on site and the most viewed pages, with a button straight into Google Analytics.</p>
			<?php if ( ! current_user_can( 'manage_options' ) ) : ?>
				<p class="bi-dash-note">An administrator can connect it here.</p>
			<?php else : ?>
				<details<?php echo ( $s['measurement_id'] || $s['property_id'] ) ? ' open' : ''; ?>>
					<summary>Connect Google Analytics</summary>
					<ol class="bi-ga-steps">
						<li><b>Tracking:</b> in Google Analytics, Admin › Data streams › the website stream, copy the <b>Measurement ID</b> (G-…). This starts recording visits.</li>
						<li><b>Property ID:</b> Admin › Property details (a number like 123456789).</li>
						<li><b>Read access for this dashboard:</b> in Google Cloud Console create a service account, enable the "Google Analytics Data API", create a JSON key and paste the file below. Then in Google Analytics, Admin › Property access management, add the service account's email as a <b>Viewer</b>.</li>
					</ol>
					<form class="bi-ga-form" data-ga-form>
						<label>Measurement ID<input type="text" name="measurement_id" class="regular-text" placeholder="G-ABC123XYZ" value="<?php echo esc_attr( $s['measurement_id'] ); ?>"></label>
						<label>Property ID<input type="text" name="property_id" class="regular-text" placeholder="123456789" value="<?php echo esc_attr( $s['property_id'] ); ?>"></label>
						<label>Service-account key (JSON)
							<?php if ( bi_ga_key() ) : ?><span class="bi-dash-note">Saved for <?php echo esc_html( bi_ga_key()['client_email'] ); ?>. Paste a new one to replace it.</span><?php endif; ?>
							<textarea name="key" rows="4" class="large-text code" placeholder='{"type": "service_account", ...}' autocomplete="off"></textarea>
						</label>
						<p><button type="submit" class="button button-primary">Save &amp; connect</button> <span class="bi-dash-note" data-ga-msg></span></p>
					</form>
				</details>
			<?php endif; ?>
		</div>
		<?php
	}
}

function bi_dash_product() {
	?>
	<form class="bi-quick" data-quick-product>
		<label>Item name<input type="text" name="name" required placeholder="e.g. Sweatshirt – The Deck (Pink)"></label>
		<div class="bi-quick__row">
			<label>Price<input type="text" name="price" inputmode="decimal" placeholder="45"></label>
			<label>Label (optional)<input type="text" name="badge" placeholder="New"></label>
		</div>
		<label>Square payment link<input type="url" name="link" placeholder="https://square.link/u/…"></label>
		<label>Short description (optional)<textarea name="desc" rows="2" placeholder="Cozy fleece hoodie with The Deck logo. Sizes S–XXL."></textarea></label>
		<div class="bi-quick__photos" data-photos></div>
		<p><button type="button" class="button" data-pick><span class="dashicons dashicons-format-image"></span> Add photos</button></p>
		<label class="bi-quick__check"><input type="checkbox" name="first" checked> Show it first on the Merchandise page</label>
		<p class="bi-quick__actions"><button type="submit" class="button button-primary">Add product</button> <span class="bi-dash-note" data-msg></span></p>
	</form>
	<?php
}

// Quick add from the dashboard: appends one item to Bayfield Inn › Merchandise.
add_action( 'rest_api_init', function () {
	register_rest_route( 'bayfield/v1', '/products/add', array(
		'methods'             => 'POST',
		'permission_callback' => function () { return current_user_can( BI_MANAGER_CAP ); },
		'callback'            => function ( WP_REST_Request $req ) {
			$name = sanitize_text_field( (string) $req->get_param( 'name' ) );
			if ( '' === $name ) {
				return new WP_Error( 'bi_name', 'Give the item a name.', array( 'status' => 400 ) );
			}
			$item = array(
				'name'    => $name,
				'price'   => ltrim( sanitize_text_field( (string) $req->get_param( 'price' ) ), '$' ),
				'badge'   => sanitize_text_field( (string) $req->get_param( 'badge' ) ),
				'link'    => esc_url_raw( (string) $req->get_param( 'link' ) ),
				'desc'    => sanitize_textarea_field( (string) $req->get_param( 'desc' ) ),
				'images'  => array_values( array_filter( array_map( 'absint', (array) $req->get_param( 'images' ) ), function ( $id ) { return 'attachment' === get_post_type( $id ); } ) ),
				'soldout' => false,
			);
			$data          = bi_get_data( 'products' );
			$data['items'] = $data['items'] ?? array();
			if ( $req->get_param( 'first' ) ) {
				array_unshift( $data['items'], $item );
			} else {
				$data['items'][] = $item;
			}
			bi_save_data( 'products', $data );
			return array( 'ok' => true, 'count' => count( $data['items'] ) );
		},
	) );
} );

add_action( 'admin_enqueue_scripts', function ( $hook ) {
	if ( 'index.php' === $hook ) {
		wp_enqueue_media(); // photo picker for "Add a product"
	}
} );

/* ============================================================ left menu */
// Everyday items first; the rest fold under "More tools" (click to open, remembered per browser).
const BI_MENU_MAIN = array( 'index.php', 'bi-menus', 'woocommerce', 'edit.php?post_type=product', 'edit.php?post_type=page', 'upload.php', 'users.php', 'profile.php' );

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
