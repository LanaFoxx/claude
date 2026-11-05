<?php
/**
 * WordPress admin clean-up:
 * - Dream Desk replaces the WordPress Dashboard.
 * - Trimmed top bar (keeps site name, Performance and account).
 * - Left menu grouped into Development / E-commerce / Settings sections.
 *
 * @package DWD_Projects
 */

defined( 'ABSPATH' ) || exit;

/* ---------- Dashboard → Dream Desk ---------- */
add_action( 'load-index.php', function () {
	if ( current_user_can( 'manage_options' ) ) {
		wp_safe_redirect( admin_url( 'admin.php?page=client-desk' ) );
		exit;
	}
} );
add_filter( 'login_redirect', function ( $to, $requested, $user ) {
	if ( $user instanceof WP_User && user_can( $user, 'manage_options' ) && ( ! $requested || false !== strpos( $requested, 'wp-admin/' ) && preg_match( '#wp-admin/?(index\.php)?$#', $requested ) ) ) {
		return admin_url( 'admin.php?page=client-desk' );
	}
	return $to;
}, 20, 3 );

/* ---------- Top bar ---------- */
$dwda_bar = function ( $bar = null ) {
	if ( ! $bar instanceof WP_Admin_Bar ) {
		global $wp_admin_bar;
		$bar = $wp_admin_bar;
	}
	if ( ! $bar ) {
		return;
	}
	foreach ( array( 'wpseo-menu', 'new-content', 'comments', 'command-palette', 'updates', 'SG_CachePress_Supercacher_Purge' ) as $id ) {
		$bar->remove_node( $id );
	}
};
add_action( 'admin_bar_menu', $dwda_bar, PHP_INT_MAX );
add_action( 'wp_before_admin_bar_render', $dwda_bar, PHP_INT_MAX );

/* ---------- Left menu sections ---------- */
function dwda_menu_group( $slug ) {
	$s = strtolower( $slug );
	$map = array(
		'top'         => array( 'client-desk' ),
		'portfolio'   => array( 'edit.php?post_type=dwd_project' ),
		'development' => array( 'elementor-home', 'edit.php?post_type=elementor_library', 'edit.php?post_type=page', 'edit.php', 'upload.php', 'themes.php' ),
		'ecommerce'   => array( 'woocommerce', 'edit.php?post_type=product', 'payments_menu_item', 'woocommerce-marketing', 'wps-plugins', 'subscriptions_for_woocommerce' ),
		'settings'    => array( 'plugins.php', 'users.php', 'tools.php', 'options-general.php', 'wpseo_dashboard', 'sg-cachepress', 'w3tc_dashboard', 'ai1wm_export', '/analytics/overview', 'wp-mail-smtp', 'elementor' ),
	);
	foreach ( $map as $g => $list ) {
		foreach ( $list as $i => $needle ) {
			if ( $s === $needle || ( strlen( $needle ) > 12 && false !== strpos( $s, $needle ) ) ) {
				return array( $g, $i );
			}
		}
	}
	return array( 'settings', 99 );
}

add_action( 'admin_menu', function () {
	if ( current_user_can( 'manage_options' ) ) {
		remove_menu_page( 'index.php' );
		remove_menu_page( 'edit-comments.php' );
		remove_menu_page( 'hello-elementor' );
	}
}, PHP_INT_MAX );

/*
 * Rebuild the menu inside the menu_order filter: it runs after every plugin
 * (Elementor, WooCommerce) has registered its items, so nothing is missed.
 */
add_filter( 'custom_menu_order', '__return_true', PHP_INT_MAX );
add_filter( 'menu_order', function ( $order ) {
	global $menu;
	if ( ! current_user_can( 'manage_options' ) ) {
		return $order;
	}
	$groups = array( 'top' => array(), 'projects' => array(), 'clients' => array(), 'finances' => array(), 'portfolio' => array(), 'development' => array(), 'ecommerce' => array(), 'settings' => array() );
	// Dream Desk pages as their own sections (they open the Dream Desk app at that page).
	$dd = array(
		'projects' => array( array( 'projects/active', 'Active', 'dashicons-controls-play' ), array( 'projects/hold', 'On Hold', 'dashicons-controls-pause' ), array( 'projects/limbo', 'Limbo', 'dashicons-clock' ), array( 'projects/complete', 'Completed', 'dashicons-yes-alt' ) ),
		'clients'  => array( array( 'onboarding', 'Onboarding', 'dashicons-feedback' ), array( 'hosting', 'Hosting', 'dashicons-cloud' ), array( 'clients', 'All Clients', 'dashicons-groups' ), array( 'reviews', 'Get Reviews', 'dashicons-star-filled' ) ),
		'finances' => array( array( 'money', 'Money Stats', 'dashicons-chart-bar' ) ),
	);
	foreach ( $dd as $g => $list ) {
		foreach ( $list as $i => $x ) {
			$groups[ $g ][] = array( $i, array( $x[1], 'manage_options', 'admin.php?page=client-desk#' . $x[0], '', 'menu-top dwd-dd', 'dwd-dd-' . str_replace( '/', '-', $x[0] ), $x[2] ) );
		}
	}
	foreach ( (array) $menu as $item ) {
		if ( empty( $item[2] ) || false !== strpos( (string) ( $item[4] ?? '' ), 'wp-menu-separator' ) || in_array( $item[2], array( 'index.php', 'edit-comments.php', 'hello-elementor' ), true ) ) {
			continue;
		}
		list( $g, $rank ) = dwda_menu_group( $item[2] );
		$groups[ $g ][] = array( $rank, $item );
	}
	$labels = array( 'projects' => 'Projects', 'clients' => 'Clients', 'finances' => 'Finances', 'portfolio' => 'Portfolio', 'development' => 'Development', 'ecommerce' => 'E-commerce', 'settings' => 'Settings' );
	$new    = array();
	$out    = array();
	$pos    = 1;
	foreach ( $groups as $g => $items ) {
		if ( ! $items ) {
			continue;
		}
		usort( $items, function ( $a, $b ) { return $a[0] - $b[0]; } );
		if ( isset( $labels[ $g ] ) ) {
			$new[ $pos++ ] = array( $labels[ $g ], 'read', 'dwd-sec-' . $g, '', 'dwd-msec menu-top', 'dwd-msec-' . $g, 'none' );
			$out[]         = 'dwd-sec-' . $g;
		}
		foreach ( $items as $it ) {
			$new[ $pos++ ] = $it[1];
			$out[]         = $it[1][2];
		}
	}
	$menu = $new; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
	return $out;
}, PHP_INT_MAX );

add_action( 'admin_head', function () {
	?>
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap">
	<style id="dwd-admin-clean">
	/* WordPress side menu styled like the Dream Desk sidebar */
	#adminmenuback, #adminmenuwrap, #adminmenu { background: #0B203D !important; }
	#adminmenu, #adminmenu .wp-submenu, #adminmenu .wp-menu-name { font-family: Poppins, -apple-system, sans-serif; }
	@media (min-width: 961px) {
		body:not(.folded) #adminmenuback, body:not(.folded) #adminmenuwrap, body:not(.folded) #adminmenu { width: 252px; }
		body:not(.folded) #wpcontent, body:not(.folded) #wpfooter { margin-left: 252px; }
		/* the menu scrolls on its own when it's taller than the screen */
		body:not(.folded) #adminmenuwrap { position: fixed !important; top: 32px !important; bottom: 0; left: 0; overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.18) transparent; }
		body:not(.folded) #adminmenuwrap::-webkit-scrollbar { width: 6px; }
		body:not(.folded) #adminmenuwrap::-webkit-scrollbar-thumb { background: rgba(255,255,255,.18); border-radius: 3px; }
		body:not(.folded) #adminmenu .wp-not-current-submenu .wp-submenu { display: none !important; }
	}
	#adminmenuwrap { padding-bottom: 12px; }
	#adminmenu > li, #adminmenu > li:hover, #adminmenu > li.opensub, #adminmenu > li.wp-has-current-submenu, #adminmenu > li.menu-top:hover, #adminmenu li.menu-top.opensub { background: transparent !important; }
	#adminmenu { margin: 0; padding: 6px 0 12px; }
	body:not(.folded) #adminmenu > li { padding: 0 12px; margin: 1px 0; }
	#adminmenu > li > a.menu-top { display: flex; align-items: center; min-height: 42px; border-radius: 8px; color: rgba(255,255,255,.85) !important; font-size: 14.5px; font-weight: 500; background: transparent !important; transition: background .15s ease; }
	#adminmenu > li > a.menu-top .wp-menu-name { padding: 10px 8px 10px 4px; line-height: 1.25; }
	#adminmenu > li > a.menu-top .wp-menu-image::before { color: rgba(255,255,255,.7) !important; }
	#adminmenu > li > a.menu-top .wp-menu-image img { opacity: .75; }
	#adminmenu > li:hover > a.menu-top, #adminmenu > li > a.menu-top:focus { background: rgba(255,255,255,.08) !important; color: #fff !important; box-shadow: none !important; }
	#adminmenu > li:hover > a.menu-top .wp-menu-image::before { color: #fff !important; }
	#adminmenu > li.wp-has-current-submenu > a.menu-top, #adminmenu > li.current > a.menu-top, #adminmenu > li > a.menu-top.current { background: #fff !important; color: #0B203D !important; font-weight: 700; }
	#adminmenu > li.wp-has-current-submenu > a.menu-top .wp-menu-image::before, #adminmenu > li.current > a.menu-top .wp-menu-image::before { color: #0B203D !important; }
	#adminmenu > li.wp-has-current-submenu > a.menu-top .wp-menu-image img, #adminmenu > li.current > a.menu-top .wp-menu-image img { opacity: 1; filter: brightness(0) saturate(100%) invert(10%) sepia(35%) saturate(2000%) hue-rotate(195deg); }
	#adminmenu li.wp-has-current-submenu div.wp-menu-image::before, #adminmenu .current div.wp-menu-image::before { color: #0B203D !important; }
	#adminmenu li.menu-top .wp-menu-arrow, #adminmenu li.wp-has-current-submenu .wp-menu-arrow, #adminmenu .wp-has-current-submenu > a::after, #adminmenu > li.current > a.current::after, #adminmenu li.wp-has-submenu.wp-not-current-submenu.opensub:hover::after, #adminmenu li.wp-has-submenu.wp-not-current-submenu:focus-within::after { display: none !important; border: 0 !important; }
	/* open submenu (current section) */
	#adminmenu .wp-has-current-submenu .wp-submenu, #adminmenu .wp-has-current-submenu.opensub .wp-submenu { background: transparent !important; padding: 6px 0 8px !important; box-shadow: none !important; }
	#adminmenu .wp-submenu a { display: flex !important; align-items: center; gap: 8px; min-height: 36px; padding: 6px 12px 6px 40px !important; border-radius: 8px; font-size: 14px !important; font-weight: 500; color: rgba(255,255,255,.72) !important; line-height: 1.3; }
	#adminmenu .wp-submenu a:hover, #adminmenu .wp-submenu a:focus { background: rgba(255,255,255,.08); color: #fff !important; box-shadow: none !important; }
	#adminmenu .wp-submenu li.current a, #adminmenu .wp-submenu li.current a:hover { color: #fff !important; font-weight: 700; background: rgba(255,255,255,.1); }
	#adminmenu .wp-submenu-head { display: none !important; }
	body:not(.folded) #adminmenu .wp-has-current-submenu .wp-submenu, body:not(.folded) #adminmenu .wp-has-current-submenu .wp-submenu li { width: auto !important; min-width: 0 !important; left: auto !important; position: static !important; margin: 0 !important; }
	#adminmenu .wp-submenu li a { white-space: nowrap; }
	#adminmenu .wp-submenu li { padding: 0 !important; margin: 1px 0 !important; }
	#adminmenu .wp-submenu a { min-height: 38px !important; padding-top: 4px !important; padding-bottom: 4px !important; }
	#adminmenu .wp-has-current-submenu .wp-submenu a { padding-left: 38px !important; }
	#adminmenu .wp-not-current-submenu .wp-submenu { min-width: 200px; }
	#adminmenu .wp-submenu a .dwdc-mcount, #adminmenu .awaiting-mod, #adminmenu .update-plugins { margin-left: auto; float: none !important; padding: 2px 9px !important; min-width: 0 !important; height: auto !important; border-radius: 999px !important; font: 700 11px/1.3 Poppins, sans-serif !important; background: rgba(255,255,255,.12) !important; color: #fff !important; }
	#adminmenu .wp-submenu li.current a .dwdc-mcount { background: #13A6EE !important; color: #fff !important; }
	/* flyout submenus on hover */
	#adminmenu .wp-not-current-submenu .wp-submenu, .folded #adminmenu .wp-has-current-submenu .wp-submenu { background: #13305A !important; border-radius: 10px; padding: 6px !important; box-shadow: 0 12px 30px rgba(0,0,0,.3) !important; }
	#adminmenu .wp-not-current-submenu .wp-submenu a { padding-left: 14px !important; }
	/* section headings: Development, E-commerce, Settings */
	#adminmenu li.dwd-msec { margin-top: 10px !important; }
	#adminmenu li.dwd-msec > a { cursor: pointer; min-height: 0 !important; background: none !important; box-shadow: none !important; }
	#adminmenu li.dwd-msec .wp-menu-image { display: none; }
	#adminmenu li.dwd-msec .wp-menu-name { position: relative; display: flex; align-items: center; gap: 8px; width: 100%; padding: 12px 30px 6px 14px !important; font-size: 11.5px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #13A6EE !important; }
	#adminmenu li.dwd-msec .wp-menu-name::before { content: ""; width: 7px; height: 7px; background: currentColor; flex: none; }
	#adminmenu li#dwd-msec-ecommerce .wp-menu-name, #adminmenu li#dwd-msec-clients .wp-menu-name { color: #6CC6F4 !important; }
	#adminmenu li#dwd-msec-finances .wp-menu-name { color: #FF8A6E !important; }
	#adminmenu li#dwd-msec-portfolio .wp-menu-name { color: #7FD48B !important; }
	#adminmenu li.dwd-dd > a .dwdc-mcount { margin-left: auto; padding: 2px 9px; border-radius: 999px; font: 700 11px/1.3 Poppins, sans-serif; background: rgba(255,255,255,.12); color: #fff; }
	#adminmenu li.dwd-dd.current > a .dwdc-mcount { background: #E3F4FD; color: #0B203D; }
	#adminmenu li.dwd-dd > a .wp-menu-name { flex: 1; display: flex; align-items: center; gap: 8px; }
	#adminmenu li#dwd-msec-settings .wp-menu-name { color: rgba(255,255,255,.6) !important; }
	#adminmenu li.dwd-msec .wp-menu-name::after { content: ""; position: absolute; right: 16px; top: 50%; width: 6px; height: 6px; margin-top: -2px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg); transition: transform .15s ease; }
	#adminmenu li.dwd-msec.dwd-closed .wp-menu-name::after { transform: rotate(-45deg); margin-top: 0; }
	#adminmenu li.dwd-msec:hover > a { background: none !important; }
	#adminmenu li.dwd-msec:hover .wp-menu-name { filter: brightness(1.25); }
	#adminmenu li.dwd-sec-hide { display: none !important; }
	.folded #adminmenu li.dwd-msec, .folded #adminmenu li.dwd-brand { display: none; }
	/* brand block at the top */
	#adminmenu li.dwd-brand { padding: 14px 16px 10px !important; }
	#adminmenu li.dwd-brand, #adminmenu li.dwd-brand:hover, #adminmenu li.dwd-brand a, #adminmenu li.dwd-brand a:hover, #adminmenu li.dwd-brand a:focus { background: transparent !important; box-shadow: none !important; outline: 0; }
	#adminmenu li.dwd-brand a { display: flex; align-items: center; gap: 12px; text-decoration: none; box-shadow: none !important; }
	#adminmenu li.dwd-brand .mk { width: 48px; height: 48px; border-radius: 12px; background: #fff; display: flex; align-items: center; justify-content: center; flex: none; }
	#adminmenu li.dwd-brand .mk img { width: 36px; height: 36px; }
	#adminmenu li.dwd-brand strong { display: block; font-size: 17px; font-weight: 700; text-transform: uppercase; color: #fff; line-height: 1.15; }
	#adminmenu li.dwd-brand small { display: block; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; color: #13A6EE; }
	#collapse-button { color: rgba(255,255,255,.55) !important; }
	#collapse-button:hover { color: #fff !important; background: none !important; }
	</style>
	<?php
} );

// Dream Desk logo at the top of the side menu.
add_action( 'admin_footer', function () {
	?>
	<script id="dwd-admin-brand">
	(function () {
		var m = document.getElementById('adminmenu'); if (!m || m.querySelector('.dwd-brand')) { return; }
		var li = document.createElement('li'); li.className = 'dwd-brand';
		li.innerHTML = '<a href="<?php echo esc_js( admin_url( 'admin.php?page=client-desk#home' ) ); ?>"><span class="mk"><img src="<?php echo esc_js( DWDP_URL . 'assets/db-mark.png' ); ?>" alt=""></span><span><strong>Dream Desk</strong><small>Dream Web Digital</small></span></a>';
		m.insertBefore(li, m.firstChild);
	})();
	</script>
	<?php
}, 5 );

// Sections start closed; click a heading to open it. The section holding the current page opens itself.
add_action( 'admin_footer', function () {
	?>
	<script id="dwd-admin-sections">
	(function () {
		var menu = document.getElementById('adminmenu'); if (!menu) { return; }
		var KEY = 'dwdMenuOpen2', open = {};
		try { open = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { open = {}; }
		var heads = menu.querySelectorAll(':scope > li.dwd-msec');
		function items(h) { var out = [], n = h.nextElementSibling; while (n && !n.classList.contains('dwd-msec')) { if (n.tagName === 'LI') { out.push(n); } n = n.nextElementSibling; } return out; }
		function set(h, isOpen) { h.classList.toggle('dwd-closed', !isOpen); items(h).forEach(function (li) { li.classList.toggle('dwd-sec-hide', !isOpen); }); }
		heads.forEach(function (h) {
			var hasCurrent = items(h).some(function (li) { return li.classList.contains('wp-has-current-submenu') || li.classList.contains('current') || li.classList.contains('wp-menu-open'); });
			var def = ['dwd-msec-projects', 'dwd-msec-clients', 'dwd-msec-finances', 'dwd-msec-portfolio'].indexOf(h.id) > -1;
			set(h, hasCurrent || (h.id in open ? !!open[h.id] : def));
			var a = h.querySelector('a');
			if (a) { a.removeAttribute('href'); }
			h.addEventListener('click', function (e) {
				e.preventDefault();
				var now = h.classList.contains('dwd-closed');
				set(h, now); open[h.id] = now;
				try { localStorage.setItem(KEY, JSON.stringify(open)); } catch (err) {}
			});
		});
	})();
	</script>
	<?php
} );
