<?php
/**
 * Elementor integration.
 *  - Pages listed in the "npc_elementor" option are drawn by Elementor (Hello theme + Theme Builder header/footer),
 *    not by this plugin's templates. Keys: page IDs, 'towns' (all town pages), 'posts' (blog posts + archive).
 *  - "Nick Ponte" widgets: the parts that read the monthly data Nick enters under Towns (snapshot, sales, tiles...).
 *  - Dynamic tags: Town name / intro / photo / updated, for headings and images in the Town template.
 * Everything else on the rebuilt pages is native Elementor widgets.
 */
if (!defined('ABSPATH')) exit;

function npc_el_on($key) {
	$on = (array) get_option('npc_elementor', []);
	return in_array($key, $on, true) || in_array((string) $key, array_map('strval', $on), true);
}

// The town shown in a widget: the page's town, or (in the Elementor editor / a template preview) the first town.
function npc_el_town($id = 0) {
	if ($id) { $p = get_post((int) $id); if ($p && $p->post_type === 'np_town') return $p; }
	if ($t = npc_current_town()) return $t;
	$all = npc_towns();
	return $all ? $all[0] : null;
}

// Brand styles + fonts on Elementor pages too (the widgets use the same classes as the design).
add_action('wp_enqueue_scripts', function () {
	if (!npc_live() || npc_is_preview()) return;
	wp_enqueue_style('npc-fonts', 'https://fonts.googleapis.com/css2?family=Manrope:wght@300;600;700;800&family=EB+Garamond:ital,wght@1,500&family=Figtree:wght@400;500;600;700;800&display=swap', [], null);
	wp_enqueue_style('npc', NPC_URL . 'assets/coastal.css', [], NPC_VER);
	wp_enqueue_script('npc', NPC_URL . 'assets/coastal.js', [], NPC_VER, true);
	wp_localize_script('npc', 'npcForm', ['ajax' => admin_url('admin-ajax.php')]);
}, 30);
add_filter('body_class', function ($c) { if (npc_live()) $c[] = 'npc'; return $c; });

add_action('elementor/elements/categories_registered', function ($m) {
	$m->add_category('nick-ponte', ['title' => 'Nick Ponte', 'icon' => 'fa fa-home']);
});

add_action('elementor/widgets/register', function ($wm) {
	if (!class_exists('\Elementor\Widget_Base')) return;
	require_once NPC_DIR . 'includes/elementor-widgets.php';
	foreach (['NPC_W_Town_Tiles', 'NPC_W_Town_Pills', 'NPC_W_Town_Snapshot', 'NPC_W_Town_Areas', 'NPC_W_Town_Sales', 'NPC_W_Town_Guide', 'NPC_W_Town_FAQ', 'NPC_W_Net_Sheet'] as $c) $wm->register(new $c());
});

add_action('elementor/dynamic_tags/register', function ($dt) {
	if (!class_exists('\Elementor\Core\DynamicTags\Tag')) return;
	require_once NPC_DIR . 'includes/elementor-tags.php';
	$dt->register_group('nick-ponte', ['title' => 'Nick Ponte']);
	foreach (['NPC_Tag_Town_Name', 'NPC_Tag_Town_Intro', 'NPC_Tag_Town_Updated', 'NPC_Tag_Town_Photo'] as $c) $dt->register(new $c());
});

// Blog posts drawn by Elementor: one H1 per page (headings typed as H1 in an article become H2), and the article's
// own "By Nick Ponte ..." line is dropped because the template header already shows it.
add_filter('the_content', function ($c) {
	if (!npc_live() || !npc_el_on('posts') || !is_singular('post') || !in_the_loop() || is_admin()) return $c;
	$c = preg_replace(['#<h1(\s|>)#i', '#</h1>#i'], ['<h2$1', '</h2>'], $c);
	return preg_replace('#^\s*<p[^>]*>\s*<strong>\s*By Nick Ponte[^<]*</strong>\s*</p>\s*(<hr[^>]*>)?#i', '', $c, 1);
}, 20);

// Posts without a featured image show one of Nick's photos in the blog cards and post header.
add_filter('get_post_metadata', function ($v, $id, $key) {
	if ($key !== '_thumbnail_id' || is_admin() || !npc_live() || !npc_el_on('posts') || get_post_type($id) !== 'post') return $v;
	static $busy = false; if ($busy) return $v;
	$busy = true; $real = get_post_meta($id, '_thumbnail_id', true); $busy = false;
	if ($real) return $v;
	$pool = ['npc-hero-hampton', 'npc-town-new-castle', 'npc-town-seabrook', 'npc-estate-dusk', 'npc-town-hampton', 'npc-town-newington', 'npc-exeter-downtown', 'npc-contact-seawall', 'npc-town-hampton-falls', 'npc-portsmouth'];
	$m = npc_media_id($pool[$id % count($pool)]);
	return $m ? [$m] : $v;
}, 10, 3);
