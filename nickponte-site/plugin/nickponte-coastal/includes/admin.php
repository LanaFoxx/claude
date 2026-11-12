<?php
/**
 * Simple WordPress admin for Nick: a clean dashboard with quick links, no plugin nags, and a short menu.
 * Everything is still installed and reachable; "Show all menus" (under Users > Profile) brings the full menu back.
 * Mike's account (and anyone who ticks the box) keeps the full admin.
 */
if (!defined('ABSPATH')) exit;

function npc_simple_admin() {
	$u = wp_get_current_user();
	if (!$u || !$u->ID) return false;
	if (isset($_GET['npc_simple']) && current_user_can('manage_options')) return true; // preview Nick's view
	if (get_user_meta($u->ID, 'npc_full_admin', true)) return false;
	return stripos((string) $u->user_email, '@dreamwebdigital.com') === false;
}

// Profile toggle
add_action('show_user_profile', 'npc_admin_profile_field');
add_action('edit_user_profile', 'npc_admin_profile_field');
function npc_admin_profile_field($user) {
	if (!current_user_can('manage_options')) return; ?>
	<h2>Simple admin</h2>
	<table class="form-table" role="presentation"><tr><th scope="row">Menus</th><td>
		<label><input type="checkbox" name="npc_full_admin" value="1" <?php checked((bool) get_user_meta($user->ID, 'npc_full_admin', true)); ?>> Show all menus and plugin notices</label>
		<p class="description">Leave unticked for the simple Nick Ponte Realty dashboard and menu.</p>
	</td></tr></table>
<?php }
add_action('personal_options_update', 'npc_admin_profile_save');
add_action('edit_user_profile_update', 'npc_admin_profile_save');
function npc_admin_profile_save($id) {
	if (current_user_can('manage_options')) update_user_meta($id, 'npc_full_admin', !empty($_POST['npc_full_admin']));
}

// Dashboard: remove every widget, add one "Your website" panel.
add_action('wp_dashboard_setup', function () {
	global $wp_meta_boxes;
	if (npc_simple_admin()) $wp_meta_boxes['dashboard'] = [];
	else foreach (['dashboard_primary', 'dashboard_quick_press', 'wp-dashboard-widget-news', 'sb_dashboard_widget', 'simply_static_dashboard_widget', 'e-dashboard-overview'] as $w) {
		foreach (['normal', 'side', 'column3', 'column4'] as $ctx) foreach (['high', 'core', 'default', 'low'] as $pr) unset($wp_meta_boxes['dashboard'][$ctx][$pr][$w]);
	}
	wp_add_dashboard_widget('npc_dashboard', 'Nick Ponte Realty', 'npc_dashboard_widget');
}, 999);

function npc_dashboard_widget() {
	$towns = get_posts(['post_type' => 'np_town', 'numberposts' => 50, 'orderby' => 'menu_order', 'order' => 'ASC']);
	$posts = get_posts(['post_type' => 'post', 'numberposts' => 3, 'post_status' => ['publish', 'draft']]);
	$q = function ($icon, $label, $sub, $url) {
		return '<a class="npc-dq" href="' . esc_url($url) . '"><span class="dashicons ' . esc_attr($icon) . '"></span><span><b>' . esc_html($label) . '</b><em>' . esc_html($sub) . '</em></span></a>';
	};
	echo '<div class="npc-dash">';
	echo '<p class="npc-dash__hi">Welcome back. Here are the things you update most.</p>';
	echo '<div class="npc-dash__grid">';
	echo $q('dashicons-admin-home', 'View website', 'See the live site', home_url('/'));
	echo $q('dashicons-edit', 'Write a blog post', 'Market news and listings', admin_url('post-new.php'));
	echo $q('dashicons-location-alt', 'Update town numbers', 'Monthly market snapshot', admin_url('edit.php?post_type=np_town'));
	echo $q('dashicons-format-image', 'Photos', 'Upload and manage images', admin_url('upload.php'));
	echo $q('dashicons-email-alt', 'Form submissions', 'Leads from the website', admin_url('admin.php?page=e-form-submissions'));
	echo $q('dashicons-admin-page', 'Pages', 'About, FAQ, guides, contact', admin_url('edit.php?post_type=page'));
	echo '</div>';
	if ($towns) {
		echo '<h3 class="npc-dash__h">Town pages</h3><p class="npc-dash__p">Click a town to update its numbers, photo or text.</p><div class="npc-dash__towns">';
		foreach ($towns as $t) {
			$sample = get_post_meta($t->ID, '_npc_sample', true);
			echo '<a href="' . esc_url(get_edit_post_link($t->ID)) . '">' . esc_html(get_the_title($t)) . ($sample ? ' <span title="Still showing sample figures">•</span>' : '') . '</a>';
		}
		echo '</div><p class="npc-dash__p npc-dash__key"><span>•</span> = still showing sample figures</p>';
	}
	if ($posts) {
		echo '<h3 class="npc-dash__h">Recent blog posts</h3><ul class="npc-dash__posts">';
		foreach ($posts as $p) echo '<li><a href="' . esc_url(get_edit_post_link($p->ID)) . '">' . esc_html(get_the_title($p)) . '</a> <span>' . esc_html(get_the_date('M j, Y', $p)) . ($p->post_status === 'draft' ? ' · Draft' : '') . '</span></li>';
		echo '</ul>';
	}
	echo '<p class="npc-dash__help">Need a hand? Email Dream Web Digital.</p></div>';
}

// One column so the panel is full width.
add_filter('screen_layout_columns', function ($c) { $c['dashboard'] = 1; return $c; });
add_filter('get_user_option_screen_layout_dashboard', function ($v) { return npc_simple_admin() ? 1 : $v; });

// Hide plugin nags, review requests and promos (all admin screens) for the simple admin; WordPress core errors still show on their own screens.
add_action('admin_head', function () {
	$simple = npc_simple_admin();
	echo '<style>
	#npc_dashboard .inside{margin:0;padding:0}
	.npc-dash{padding:20px 22px 24px;font-size:14px}
	.npc-dash__hi{font-size:15px;margin:0 0 16px;color:#243447}
	.npc-dash__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
	.npc-dq{display:flex;gap:12px;align-items:center;padding:16px;border:1px solid #D7E3EC;border-radius:12px;background:#F3F7FA;text-decoration:none;color:#1F3A5F;transition:border-color .15s,background .15s}
	.npc-dq:hover{border-color:#3F6E99;background:#fff;color:#1F3A5F}
	.npc-dq .dashicons{width:40px;height:40px;font-size:22px;line-height:40px;text-align:center;border-radius:50%;background:#fff;color:#3F6E99;flex:none}
	.npc-dq b{display:block;font-size:14px}.npc-dq em{display:block;font-style:normal;color:#5A6B7D;font-size:12.5px}
	.npc-dash__h{margin:26px 0 4px;font-size:14px;color:#1F3A5F}.npc-dash__p{margin:0 0 10px;color:#5A6B7D}
	.npc-dash__towns{display:flex;flex-wrap:wrap;gap:8px}
	.npc-dash__towns a{padding:7px 14px;border:1px solid #B9CCDC;border-radius:999px;text-decoration:none;color:#1F3A5F;background:#fff}
	.npc-dash__towns a:hover{background:#3F6E99;color:#fff;border-color:#3F6E99}
	.npc-dash__towns span,.npc-dash__key span{color:#C77A1A;font-weight:700}.npc-dash__key{margin-top:8px;font-size:12px}
	.npc-dash__posts{margin:0}.npc-dash__posts li{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #E3ECF3;margin:0}.npc-dash__posts span{color:#7A8A9A;white-space:nowrap}
	.npc-dash__help{margin:22px 0 0;color:#7A8A9A;font-size:12.5px}';
	if ($simple) echo '
	#wpbody-content .notice:not(#message):not(.settings-error):not(.inline), #wpbody-content > .updated:not(#message), #wpbody-content > .error:not(.settings-error), #wpbody-content .update-nag,
	#wpbody-content > div[class*="notice"], .mwp-notice-container, .sbi_notice, .sbi_review_notice_step_1, .llms-vk-banner, .webpcContent--notice,
	.quadlayers_insta-gallery_notice_delay, .e-notice, .elementor-message, .rank-math-notice, .ai1wm-message, .wpcode-admin-notice { display:none !important; }
	.index-php #wpbody-content > .wrap > h1 { display:none; }
	#welcome-panel, #screen-meta-links { display:none !important; }
	#dashboard-widgets .postbox-container { width:100% !important; max-width:980px; }';
	echo '</style>';
});

// Short menu: keep what Nick uses, tuck the rest away (still reachable by URL or "Show all menus").
add_action('admin_menu', function () {
	if (!npc_simple_admin()) return;
	foreach (['googlesitekit-dashboard', 'elementor-home', 'edit-comments.php', 'edit.php?post_type=rem_property', 'wpcf7', 'wpcf7-dashboard',
		'rank-math', 'astra', 'themes.php', 'plugins.php', 'tools.php', 'ai1wm_export', 'options-general.php', 'wpcode', 'qligg_backend',
		'simply-static-generate', 'simply-static', 'wp_file_manager', 'crisp/crisp.php', 'smush', 'sb-instagram-feed', 'sbi-feed-builder', 'users.php'] as $slug) {
		remove_menu_page($slug);
	}
	add_menu_page('Form submissions', 'Leads', 'edit_posts', 'admin.php?page=e-form-submissions', '', 'dashicons-email-alt', 4);
}, 999);
add_filter('custom_menu_order', '__return_true');
add_filter('menu_order', function ($order) {
	if (!npc_simple_admin()) return $order;
	$first = ['index.php', 'edit.php?post_type=np_town', 'edit.php', 'edit.php?post_type=page', 'upload.php', 'admin.php?page=e-form-submissions', 'elementor-home', 'elementor', 'edit.php?post_type=elementor_library'];
	return array_values(array_unique(array_merge(array_intersect($first, $order), $order)));
});
// Friendlier names
add_action('admin_menu', function () {
	global $menu;
	if (!npc_simple_admin() || !is_array($menu)) return;
	foreach ($menu as &$m) {
		if (($m[2] ?? '') === 'edit.php') $m[0] = 'Blog posts';
		if (($m[2] ?? '') === 'edit.php?post_type=np_town') $m[0] = 'Towns';
		if (($m[2] ?? '') === 'upload.php') $m[0] = 'Photos';
	}
}, 1000);
// Admin bar: drop plugin clutter
add_action('admin_bar_menu', function ($bar) {
	if (!npc_simple_admin()) return;
	foreach (['wp-logo', 'comments', 'new-content', 'rank-math', 'elementor_inspector', 'elementor_edit_page', 'google-site-kit', 'wpseo-menu', 'litespeed-menu', 'simply-static', 'wpcode-admin-bar-info', 'wpcode', 'updates', 'search'] as $id) $bar->remove_node($id);
}, 999);
