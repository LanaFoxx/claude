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
		'development' => array( 'elementor-home', 'edit.php?post_type=elementor_library', 'edit.php?post_type=page', 'edit.php', 'upload.php', 'edit.php?post_type=dwd_project', 'themes.php' ),
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
	$groups = array( 'top' => array(), 'development' => array(), 'ecommerce' => array(), 'settings' => array() );
	foreach ( (array) $menu as $item ) {
		if ( empty( $item[2] ) || false !== strpos( (string) ( $item[4] ?? '' ), 'wp-menu-separator' ) || in_array( $item[2], array( 'index.php', 'edit-comments.php', 'hello-elementor' ), true ) ) {
			continue;
		}
		list( $g, $rank ) = dwda_menu_group( $item[2] );
		$groups[ $g ][] = array( $rank, $item );
	}
	$labels = array( 'development' => 'Development', 'ecommerce' => 'E-commerce', 'settings' => 'Settings' );
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
	<style id="dwd-admin-clean">
	#adminmenu li.dwd-msec { margin-top: 6px; }
	#adminmenu li.dwd-msec > a { cursor: pointer; background: none !important; box-shadow: none !important; }
	#adminmenu li.dwd-msec .wp-menu-image { display: none; }
	#adminmenu li.dwd-msec .wp-menu-name { position: relative; padding: 12px 30px 10px 12px !important; font-size: 10.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #8C9AAE !important; border-top: 1px solid rgba(255,255,255,.08); }
	#adminmenu li.dwd-msec .wp-menu-name::after { content: ""; position: absolute; right: 14px; top: 50%; width: 6px; height: 6px; margin-top: -5px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg); transition: transform .15s ease; }
	#adminmenu li.dwd-msec.dwd-closed .wp-menu-name::after { transform: rotate(-45deg); margin-top: -3px; }
	#adminmenu li.dwd-msec:hover .wp-menu-name { color: #fff !important; }
	#adminmenu li.dwd-sec-hide { display: none !important; }
	.folded #adminmenu li.dwd-msec { display: none; }
	</style>
	<?php
} );

// Sections start closed; click a heading to open it. The section holding the current page opens itself.
add_action( 'admin_footer', function () {
	?>
	<script id="dwd-admin-sections">
	(function () {
		var menu = document.getElementById('adminmenu'); if (!menu) { return; }
		var KEY = 'dwdMenuOpen', open = {};
		try { open = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { open = {}; }
		var heads = menu.querySelectorAll(':scope > li.dwd-msec');
		function items(h) { var out = [], n = h.nextElementSibling; while (n && !n.classList.contains('dwd-msec')) { if (n.tagName === 'LI') { out.push(n); } n = n.nextElementSibling; } return out; }
		function set(h, isOpen) { h.classList.toggle('dwd-closed', !isOpen); items(h).forEach(function (li) { li.classList.toggle('dwd-sec-hide', !isOpen); }); }
		heads.forEach(function (h) {
			var hasCurrent = items(h).some(function (li) { return li.classList.contains('wp-has-current-submenu') || li.classList.contains('current') || li.classList.contains('wp-menu-open'); });
			set(h, hasCurrent || !!open[h.id]);
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
