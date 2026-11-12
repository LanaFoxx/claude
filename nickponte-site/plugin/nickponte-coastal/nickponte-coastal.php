<?php
/**
 * Plugin Name: Nick Ponte Coastal Light (preview)
 * Description: "Coastal Light" redesign preview: a homepage template (/home-preview/) and a Town post type (/town-preview/<town>/) with monthly market fields, FAQ and JSON-LD. Preview pages are noindex and use their own header and footer, so live pages are not affected. Deactivate to remove everything from the front end.
 * Version: 1.6.1
 * Author: Dream Web Digital
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) exit;

define('NPC_VER', '1.6.1');
define('NPC_DIR', plugin_dir_path(__FILE__));
define('NPC_URL', plugin_dir_url(__FILE__));
const NPC_HOME_TEMPLATE = 'npc-home';
const NPC_REVIEW_TEMPLATE = 'npc-review';
const NPC_GUIDE_TEMPLATE = 'npc-guide';
const NPC_FEATURED_TEMPLATE = 'npc-featured';

/* ------------------------------------------------------------------ */
/* Go-live switch                                                      */
/* ------------------------------------------------------------------ */
// Off (default): everything is a noindex preview under its own URLs.
// On: the design takes over the EXISTING pages below, keeping their URLs and Rank Math SEO; the preview URLs 301
// to them. Turning it off restores the old pages exactly (their Elementor content is never edited).
// Toggle: Settings > Reading > "Coastal Light design is live", or REST POST /wp/v2/settings {"npc_live": true}.
const NPC_LIVE_PAGES = ['home' => 2579, 'featured' => 590, 'buyers-guide' => 5725, 'sellers-guide' => 5742];
const NPC_LIVE_TOWNS = ['rye' => 4300, 'portsmouth' => 4302, 'hampton' => 4459, 'north-hampton' => 4304, 'new-castle' => 4927,
	'exeter' => 4325, 'stratham' => 4952, 'greenland' => 4706, 'newington' => 4936, 'dover' => 432];

function npc_live() { return (bool) get_option('npc_live', false); }

add_action('init', function () {
	register_setting('reading', 'npc_live', ['type' => 'boolean', 'default' => false, 'show_in_rest' => true, 'sanitize_callback' => 'rest_sanitize_boolean']);
});
add_action('admin_init', function () {
	add_settings_field('npc_live', 'Coastal Light design is live', function () {
		echo '<label><input type="checkbox" name="npc_live" value="1" ' . checked(npc_live(), true, false) . '> Show the new design on the real homepage, town, guide and Featured Sales pages</label>';
		echo '<p class="description">Untick to go back to the old pages instantly. Their content is never changed.</p>';
	}, 'reading');
});
add_action('update_option_npc_live', function () { update_option('npc_flush_rewrite', 1); });
add_action('add_option_npc_live', function () { update_option('npc_flush_rewrite', 1); });
add_action('init', function () { if (get_option('npc_flush_rewrite')) { delete_option('npc_flush_rewrite'); flush_rewrite_rules(); } }, 99);

/* ------------------------------------------------------------------ */
/* Town post type and fields                                          */
/* ------------------------------------------------------------------ */

function npc_fields() {
	// key => [label, type, help]
	return [
		'tag'           => ['Short description (homepage list)', 'text', 'One line, e.g. "Oceanfront estates, Wallis Sands and Jenness beaches."'],
		'intro'         => ['Intro paragraph', 'textarea', 'Shown under the town name. Also used as the meta description.'],
		'updated'       => ['Snapshot month', 'text', 'e.g. "November 2026". Shown as "Updated …".'],
		'median'        => ['Median sale price ($)', 'number', 'Whole dollars, no commas.'],
		'dom'           => ['Avg. days on market', 'number', ''],
		'active'        => ['Active listings', 'number', ''],
		'ratio'         => ['Sale-to-list ratio (%)', 'number', 'e.g. 98.2'],
		'sold'          => ['Homes sold (last 90 days)', 'number', ''],
		'trend'         => ['Median price, last 12 months', 'text', '12 numbers, oldest first, separated by commas. Drives the sparkline and the YoY figure.'],
		'read'          => ["Nick's read", 'textarea', '2–3 sentences of commentary.'],
		'neighborhoods' => ['Neighborhoods', 'textarea', 'One per line: Name | short note'],
		'sales'         => ['Recent sales', 'textarea', 'One per line: Street | Town, NH · 4 bd · 3 ba | $1,250,000 | Represented the seller | Closed Sep 2026 | optional image URL'],
		'body'          => ['Town guide (long text)', 'html', 'Shown below Recent sales: the in-depth guide to the town (neighborhoods, market, schools, things to do). Carried over from the current town page.'],
		'sample'        => ['Figures are sample data', 'checkbox', 'Shows a "sample figures" note on the page. Untick once real numbers are entered.'],
		'zillow'        => ['Show "All sales on Zillow" link', 'checkbox', ''],
	];
}

function npc_register() {
	register_post_type('np_town', [
		'label'               => 'Towns',
		'labels'              => ['name' => 'Towns', 'singular_name' => 'Town', 'add_new_item' => 'Add town', 'edit_item' => 'Edit town', 'menu_name' => 'Towns (preview)'],
		'public'              => true,
		'exclude_from_search' => true,
		'show_in_rest'        => true,
		'rest_base'           => 'np-towns',
		'menu_icon'           => 'dashicons-location-alt',
		'menu_position'       => 21,
		'supports'            => ['title', 'thumbnail', 'page-attributes', 'custom-fields'],
		'has_archive'         => false,
		'rewrite'             => ['slug' => npc_live() ? 'nh-towns' : 'town-preview', 'with_front' => false],
	]);
	foreach (npc_fields() as $k => $f) {
		register_post_meta('np_town', "_npc_$k", [
			'type'          => $f[1] === 'number' ? 'number' : ($f[1] === 'checkbox' ? 'boolean' : 'string'),
			'single'        => true,
			'show_in_rest'  => true,
			'auth_callback' => function () { return current_user_can('edit_posts'); },
			'sanitize_callback' => $f[1] === 'html' ? 'wp_kses_post' : null,
		]);
	}
}
add_action('init', 'npc_register');

register_activation_hook(__FILE__, function () {
	npc_register();
	flush_rewrite_rules();
});
register_deactivation_hook(__FILE__, 'flush_rewrite_rules');

function npc_meta($id, $k, $default = '') {
	$v = get_post_meta($id, "_npc_$k", true);
	return ($v === '' || $v === null) ? $default : $v;
}

add_action('add_meta_boxes', function () {
	add_meta_box('npc_town_fields', 'Monthly market snapshot', 'npc_render_metabox', 'np_town', 'normal', 'high');
});

function npc_render_metabox($post) {
	wp_nonce_field('npc_save', 'npc_nonce');
	echo '<p style="margin-top:0">Update these each month. The featured image is the town photo. Order on the homepage and in the town pills follows <em>Order</em> under Page Attributes (the first three are the photo tiles).</p><table class="form-table" role="presentation">';
	foreach (npc_fields() as $k => $f) {
		[$label, $type, $help] = $f;
		$v = get_post_meta($post->ID, "_npc_$k", true);
		$id = "npc_$k";
		echo '<tr><th scope="row"><label for="' . esc_attr($id) . '">' . esc_html($label) . '</label></th><td>';
		if ($type === 'html') {
			wp_editor((string) $v, $id, ['textarea_name' => $id, 'textarea_rows' => 14, 'media_buttons' => false, 'teeny' => true]);
		} elseif ($type === 'textarea') {
			echo '<textarea class="large-text" rows="' . (in_array($k, ['sales', 'neighborhoods'], true) ? 6 : 4) . '" id="' . esc_attr($id) . '" name="' . esc_attr($id) . '">' . esc_textarea($v) . '</textarea>';
		} elseif ($type === 'checkbox') {
			echo '<label><input type="checkbox" id="' . esc_attr($id) . '" name="' . esc_attr($id) . '" value="1" ' . checked((bool) $v, true, false) . '> Yes</label>';
		} else {
			echo '<input class="' . ($type === 'number' ? 'small-text' : 'large-text') . '" type="' . ($type === 'number' ? 'number' : 'text') . '" step="any" id="' . esc_attr($id) . '" name="' . esc_attr($id) . '" value="' . esc_attr($v) . '">';
		}
		if ($help) echo '<p class="description">' . esc_html($help) . '</p>';
		echo '</td></tr>';
	}
	echo '</table>';
}

add_action('save_post_np_town', function ($id) {
	if (!isset($_POST['npc_nonce']) || !wp_verify_nonce($_POST['npc_nonce'], 'npc_save')) return;
	if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
	if (!current_user_can('edit_post', $id)) return;
	foreach (npc_fields() as $k => $f) {
		$name = "npc_$k";
		if ($f[1] === 'checkbox') {
			update_post_meta($id, "_npc_$k", !empty($_POST[$name]));
			continue;
		}
		if (!isset($_POST[$name])) continue;
		$raw = wp_unslash($_POST[$name]);
		$val = $f[1] === 'html' ? wp_kses_post($raw) : ($f[1] === 'textarea' ? sanitize_textarea_field($raw) : ($f[1] === 'number' ? ($raw === '' ? '' : (float) $raw) : sanitize_text_field($raw)));
		update_post_meta($id, "_npc_$k", $val);
	}
});

/* ------------------------------------------------------------------ */
/* Data helpers                                                        */
/* ------------------------------------------------------------------ */

function npc_money($n) { return '$' . number_format((float) $n, 0, '.', ','); }
function npc_short($n) {
	$n = (float) $n;
	if ($n >= 1e6) return '$' . preg_replace('/0$/', '', number_format($n / 1e6, 2)) . 'M';
	return '$' . round($n / 1000) . 'K';
}
function npc_lines($text, $min = 2) {
	$rows = [];
	foreach (preg_split('/\r\n|\r|\n/', (string) $text) as $line) {
		if (trim($line) === '') continue;
		$parts = array_map('trim', explode('|', $line));
		if (count($parts) >= $min) $rows[] = $parts;
	}
	return $rows;
}

function npc_towns() {
	static $towns = null;
	if ($towns === null) {
		$towns = get_posts(['post_type' => 'np_town', 'post_status' => 'publish', 'numberposts' => 50, 'orderby' => ['menu_order' => 'ASC', 'title' => 'ASC']]);
	}
	return $towns;
}

function npc_town_data($post) {
	$id = $post->ID;
	$name = get_the_title($post);
	$median = (float) npc_meta($id, 'median', 0);
	$dom = (float) npc_meta($id, 'dom', 0);
	$ratio = (float) npc_meta($id, 'ratio', 0);
	$updated = npc_meta($id, 'updated', date_i18n('F Y'));
	$trend = array_values(array_filter(array_map('floatval', explode(',', (string) npc_meta($id, 'trend', ''))), function ($v) { return $v > 0; }));
	$spark = null;
	if (count($trend) >= 2) {
		$mn = min($trend); $mx = max($trend); $span = max($mx - $mn, 1); $last = count($trend) - 1;
		$pts = [];
		foreach ($trend as $i => $v) $pts[] = round($i * 240 / $last, 1) . ',' . round(58 - ($v - $mn) / $span * 50, 1);
		$line = implode(' ', $pts);
		$delta = ($trend[$last] / $trend[0] - 1) * 100;
		$spark = ['line' => $line, 'area' => '0,64 ' . $line . ' 240,64', 'delta' => ($delta >= 0 ? '+' : '') . number_format($delta, 1) . '% YoY'];
	}
	$sold = (int) npc_meta($id, 'sold', 0);
	$active = (int) npc_meta($id, 'active', 0);
	$ratio_s = number_format($ratio, 1) . '%';
	$faqs = [
		["What is the median home price in $name, NH?", npc_money($median) . ", based on closed sales over the last 90 days, updated $updated. $sold homes sold in that window and $active are active today."],
		["How long do homes in $name take to sell?", "About " . (int) $dom . " days from listing to accepted offer on average. Homes are closing at $ratio_s of their last list price, so pricing correctly on day one still matters more than anything else."],
		["How do I find out what my $name home is worth?", "Automated estimates struggle in $name because of the price spread between neighborhoods and the small number of annual sales. Nick prepares a confidential valuation from comparable closed sales, absorption rate and your property's specifics, at no cost."],
	];
	return [
		'id' => $id, 'name' => $name, 'slug' => $post->post_name, 'url' => npc_town_url($post),
		'tag' => npc_meta($id, 'tag'), 'intro' => npc_meta($id, 'intro'), 'updated' => $updated,
		'median' => $median, 'img' => get_post_thumbnail_id($post),
		'metrics' => [
			['Median sale price', npc_money($median), 'Last 90 days'],
			['Avg. days on market', (int) $dom . ' days', 'List to accepted offer'],
			['Active listings', (string) $active, 'Single-family and condo'],
			['Sale-to-list ratio', $ratio_s, 'Sale price vs. last list'],
			['Homes sold', (string) $sold, 'Last 90 days'],
		],
		'spark' => $spark, 'read' => npc_meta($id, 'read'),
		'areas' => npc_lines(npc_meta($id, 'neighborhoods')), 'sales' => npc_lines(npc_meta($id, 'sales'), 3),
		'body' => npc_meta($id, 'body'),
		'sample' => (bool) npc_meta($id, 'sample', false), 'zillow' => (bool) npc_meta($id, 'zillow', false),
		'faqs' => $faqs,
	];
}

function npc_media_id($slug) {
	static $cache = [];
	if (!isset($cache[$slug])) {
		$a = get_posts(['post_type' => 'attachment', 'name' => $slug, 'numberposts' => 1, 'post_status' => 'inherit']);
		$cache[$slug] = $a ? $a[0]->ID : 0;
	}
	return $cache[$slug];
}
function npc_img($id_or_slug, $size, $attrs = []) {
	$id = is_numeric($id_or_slug) ? (int) $id_or_slug : npc_media_id($id_or_slug);
	if (!$id) $id = npc_media_id('npc-rye-coast');
	return $id ? wp_get_attachment_image($id, $size, false, $attrs) : '';
}

// The town's public URL: its existing page once live, otherwise the preview.
function npc_town_url($post) {
	if (npc_live() && isset(NPC_LIVE_TOWNS[$post->post_name])) return get_permalink(NPC_LIVE_TOWNS[$post->post_name]);
	return get_permalink($post);
}
// The Town post shown on this request: a /town-preview/ page, or (once live) an existing town page.
function npc_current_town() {
	if (is_singular('np_town')) return get_queried_object();
	if (npc_live() && is_page() && ($slug = array_search(get_queried_object_id(), NPC_LIVE_TOWNS, true)) !== false) {
		$p = get_posts(['post_type' => 'np_town', 'name' => $slug, 'numberposts' => 1, 'post_status' => 'publish']);
		return $p ? $p[0] : null;
	}
	return null;
}
// Minimal 24px line icons (stroke uses currentColor).
function npc_icon($name) {
	$paths = [
		'mail'  => '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
		'phone' => '<path d="M6.6 3.5h2.6l1.4 4-2 1.3a12 12 0 0 0 6.6 6.6l1.3-2 4 1.4v2.6a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z"/>',
		'pin'   => '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/>',
	];
	return '<svg class="npc-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . ($paths[$name] ?? '') . '</svg>';
}
function npc_home_url() {
	if (npc_live()) return home_url('/');
	$p = get_posts(['post_type' => 'page', 'name' => 'home-preview', 'numberposts' => 1, 'post_status' => 'publish']);
	return $p ? get_permalink($p[0]) : home_url('/home-preview/');
}
// The restyled guide preview if it exists (e.g. /buyers-guide-preview/), otherwise the live guide page.
function npc_guide_url($slug) {
	if (npc_live()) return get_permalink(NPC_LIVE_PAGES[$slug]);
	$p = get_posts(['post_type' => 'page', 'name' => $slug . '-preview', 'numberposts' => 1, 'post_status' => 'publish']);
	return $p ? get_permalink($p[0]) : home_url('/' . $slug . '/');
}
function npc_featured_url() {
	if (npc_live()) return get_permalink(NPC_LIVE_PAGES['featured']);
	$p = get_posts(['post_type' => 'page', 'name' => 'featured-sales-preview', 'numberposts' => 1, 'post_status' => 'publish']);
	return $p ? get_permalink($p[0]) : home_url('/featured-properties/');
}
function npc_default_town_url() {
	$t = npc_towns();
	return $t ? npc_town_url($t[0]) : home_url('/town-preview/rye/');
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

add_filter('theme_page_templates', function ($templates) {
	$templates[NPC_HOME_TEMPLATE] = 'Coastal Light – Home (preview)';
	$templates[NPC_REVIEW_TEMPLATE] = 'Coastal Light – Review hub';
	$templates[NPC_GUIDE_TEMPLATE] = 'Coastal Light – Buyer/Seller Guide (preview)';
	$templates[NPC_FEATURED_TEMPLATE] = 'Coastal Light – Featured Sales (preview)';
	return $templates;
});

function npc_is_preview() {
	if (is_singular('np_town')) return 'town';
	if (npc_live() && is_page()) {
		$id = get_queried_object_id();
		if ($id === NPC_LIVE_PAGES['home'] || is_front_page()) return 'home';
		if ($id === NPC_LIVE_PAGES['featured']) return 'featured';
		if ($id === NPC_LIVE_PAGES['buyers-guide'] || $id === NPC_LIVE_PAGES['sellers-guide']) return 'guide';
		if (in_array($id, NPC_LIVE_TOWNS, true) && npc_current_town()) return 'town';
	}
	if (is_page() && get_page_template_slug(get_queried_object_id()) === NPC_HOME_TEMPLATE) return 'home';
	if (is_page() && get_page_template_slug(get_queried_object_id()) === NPC_REVIEW_TEMPLATE) return 'review';
	if (is_page() && get_page_template_slug(get_queried_object_id()) === NPC_GUIDE_TEMPLATE) return 'guide';
	if (is_page() && get_page_template_slug(get_queried_object_id()) === NPC_FEATURED_TEMPLATE) return 'featured';
	return false;
}

add_filter('template_include', function ($template) {
	$k = npc_is_preview();
	if ($k === 'town') return NPC_DIR . 'templates/town.php';
	if ($k === 'home') return NPC_DIR . 'templates/home.php';
	if ($k === 'review') return NPC_DIR . 'templates/review.php';
	if ($k === 'guide') return NPC_DIR . 'templates/guide.php';
	if ($k === 'featured') return NPC_DIR . 'templates/featured.php';
	return $template;
}, 99);

add_action('wp_enqueue_scripts', function () {
	if (!npc_is_preview()) return;
	wp_enqueue_style('npc-fonts', 'https://fonts.googleapis.com/css2?family=Manrope:wght@300;600;700;800&family=EB+Garamond:ital,wght@1,500&family=Figtree:wght@400;500;600&display=swap', [], null);
	wp_enqueue_style('npc', NPC_URL . 'assets/coastal.css', [], NPC_VER);
	wp_enqueue_script('npc', NPC_URL . 'assets/coastal.js', [], NPC_VER, true);
	wp_localize_script('npc', 'npcForm', ['ajax' => admin_url('admin-ajax.php')]);
}, 20);

// The preview pages carry their own header, footer and styles: drop the theme's and Elementor's page CSS there.
add_action('wp_print_styles', function () {
	if (!npc_is_preview()) return;
	global $wp_styles;
	foreach ((array) $wp_styles->queue as $h) {
		$src = isset($wp_styles->registered[$h]) ? (string) $wp_styles->registered[$h]->src : '';
		if (preg_match('/^(astra|elementor|e-|swiper|font-awesome|google-fonts-1|wp-block-library|global-styles|classic-theme)/', $h)
			|| preg_match('#/(elementor|elementor-pro|mortgage-calculator-free|real-estate-manager-pro|rem-[a-z-]+|astra[a-z-]*)/#', $src)
			|| strpos($src, 'sb-elementor') !== false) {
			wp_dequeue_style($h);
		}
	}
}, 100);

// Site icon: Nick's NP Realty square on the preview pages (the live site keeps its own until launch).
add_action('template_redirect', function () {
	if (npc_is_preview() && npc_media_id('npc-icon')) remove_action('wp_head', 'wp_site_icon', 99);
});
add_action('wp_head', function () {
	if (!npc_is_preview() || !($id = npc_media_id('npc-icon'))) return;
	foreach ([[32, 'icon'], [192, 'icon'], [180, 'apple-touch-icon']] as $s) {
		$src = wp_get_attachment_image_src($id, [$s[0], $s[0]]);
		if ($src) echo '<link rel="' . $s[1] . '" sizes="' . $s[0] . 'x' . $s[0] . '" href="' . esc_url($src[0]) . '">' . "\n";
	}
	echo '<meta name="theme-color" content="#1F3A5F">' . "\n";
}, 2);

// Speed: connect to the font host early and fetch the page's main photo first (largest contentful paint).
add_action('wp_head', function () {
	$k = npc_is_preview();
	if (!$k) return;
	echo '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' . "\n";
	$id = 0;
	if ($k === 'home') $id = npc_media_id('npc-hero-hampton');
	elseif ($k === 'town') $id = (npc_current_town() ? get_post_thumbnail_id(npc_current_town()) : 0) ?: npc_media_id('npc-rye-coast');
	elseif ($k === 'featured') $id = npc_media_id('npc-seller-hero');
	elseif ($k === 'guide') $id = npc_media_id(strpos((string) get_post_field('post_name', get_queried_object_id()), 'seller') !== false ? 'npc-seller-hero' : 'npc-buyer-hero');
	if ($id && ($src = wp_get_attachment_image_src($id, 'full'))) {
		$srcset = wp_get_attachment_image_srcset($id, 'full');
		$sizes = $k === 'home' ? '100vw' : '(max-width: 920px) 100vw, 50vw';
		echo '<link rel="preload" as="image" href="' . esc_url($src[0]) . '"' . ($srcset ? ' imagesrcset="' . esc_attr($srcset) . '" imagesizes="' . esc_attr($sizes) . '"' : '') . ' fetchpriority="high">' . "\n";
	}
}, 1);

/* ------------------------------------------------------------------ */
/* SEO: noindex previews, titles, schema                               */
/* ------------------------------------------------------------------ */

// Noindex: every page while previewing. Once live, only the leftover preview copies and the review hub.
function npc_is_noindex() {
	$k = npc_is_preview();
	if (!$k) return false;
	if (!npc_live()) return true;
	if ($k === 'review') return true;
	if (is_page() && !is_front_page() && !in_array(get_queried_object_id(), array_merge(array_values(NPC_LIVE_PAGES), array_values(NPC_LIVE_TOWNS)), true)) return true;
	return false;
}
// Once live, the preview URLs send visitors (and Google) to the real pages.
add_action('template_redirect', function () {
	if (!npc_live()) return;
	if (is_singular('np_town') && isset(NPC_LIVE_TOWNS[get_queried_object()->post_name])) { wp_safe_redirect(get_permalink(NPC_LIVE_TOWNS[get_queried_object()->post_name]), 301); exit; }
	if (is_page()) {
		$slug = get_post_field('post_name', get_queried_object_id());
		$to = ['home-preview' => home_url('/'), 'buyers-guide-preview' => get_permalink(NPC_LIVE_PAGES['buyers-guide']), 'sellers-guide-preview' => get_permalink(NPC_LIVE_PAGES['sellers-guide']), 'featured-sales-preview' => get_permalink(NPC_LIVE_PAGES['featured'])];
		if (isset($to[$slug])) { wp_safe_redirect($to[$slug], 301); exit; }
	}
});

add_filter('rank_math/frontend/robots', function ($robots) {
	if (npc_is_noindex()) { $robots['index'] = 'noindex'; $robots['follow'] = 'nofollow'; }
	return $robots;
});
add_filter('wp_robots', function ($robots) {
	if (npc_is_noindex()) { $robots['noindex'] = true; $robots['nofollow'] = true; unset($robots['index'], $robots['follow']); }
	return $robots;
});
add_filter('rank_math/sitemap/exclude_post_type', function ($exclude, $type) { return ($type === 'np_town' && !npc_live()) ? true : $exclude; }, 10, 2);
add_filter('rank_math/sitemap/entry', function ($url, $type, $object) {
	if ($type === 'post' && isset($object->ID) && in_array(get_page_template_slug($object->ID), [NPC_HOME_TEMPLATE, NPC_REVIEW_TEMPLATE, NPC_GUIDE_TEMPLATE, NPC_FEATURED_TEMPLATE], true)) return false;
	if ($type === 'post' && isset($object->post_type, $object->post_name) && $object->post_type === 'np_town' && isset(NPC_LIVE_TOWNS[$object->post_name])) return false;
	return $url;
}, 10, 3);
add_filter('wp_sitemaps_post_types', function ($types) { if (!npc_live()) unset($types['np_town']); return $types; });

add_filter('rank_math/frontend/title', function ($title) {
	if (is_singular('np_town')) return 'Top Realtor in ' . get_the_title() . ' NH | Nick Ponte';
	return $title;
});
add_filter('rank_math/frontend/description', function ($d) {
	if (is_singular('np_town')) return wp_trim_words(npc_meta(get_queried_object_id(), 'intro'), 28, '…');
	return $d;
});
add_filter('pre_get_document_title', function ($t) {
	if (is_singular('np_town')) return 'Top Realtor in ' . get_the_title() . ' NH | Nick Ponte';
	return $t;
}, 20);

function npc_agent_schema($area = null) {
	$s = [
		'@type'     => ['RealEstateAgent', 'LocalBusiness'],
		'@id'       => home_url('/#nick-ponte'),
		'name'      => 'Nick Ponte Realty',
		'url'       => home_url('/'),
		'telephone' => '+1-603-918-7593',
		'email'     => 'nponte@careyandgiampa.com',
		'image'     => wp_get_attachment_image_url(npc_media_id('npc-nick-ponte'), 'full') ?: '',
		'address'   => ['@type' => 'PostalAddress', 'streetAddress' => '655 Wallis Road', 'addressLocality' => 'Rye', 'addressRegion' => 'NH', 'postalCode' => '03870', 'addressCountry' => 'US'],
		'employee'  => ['@type' => 'Person', 'name' => 'Nick Ponte', 'jobTitle' => 'Managing Broker'],
		'parentOrganization' => ['@type' => 'Organization', 'name' => 'Carey & Giampa Realtors'],
		'areaServed' => $area ? ['@type' => 'City', 'name' => "$area, NH"] : array_map(function ($t) { return ['@type' => 'City', 'name' => get_the_title($t) . ', NH']; }, npc_towns()),
	];
	return $s;
}

add_action('wp_head', function () {
	$k = npc_is_preview();
	if (!$k) return;
	$graph = [];
	if ($k === 'town') {
		$t = npc_town_data(npc_current_town());
		$graph[] = npc_agent_schema($t['name']);
		$graph[] = ['@type' => 'FAQPage', 'mainEntity' => array_map(function ($f) {
			return ['@type' => 'Question', 'name' => $f[0], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f[1]]];
		}, $t['faqs'])];
	} elseif ($k === 'home') {
		$graph[] = npc_agent_schema();
	} else {
		return;
	}
	echo '<script type="application/ld+json">' . wp_json_encode(['@context' => 'https://schema.org', '@graph' => $graph], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "</script>\n";
}, 30);

/* ------------------------------------------------------------------ */
/* Admin notice                                                        */
/* ------------------------------------------------------------------ */

add_filter('display_post_states', function ($states, $post) {
	if ($post->post_type === 'page' && in_array(get_page_template_slug($post->ID), [NPC_HOME_TEMPLATE, NPC_REVIEW_TEMPLATE, NPC_GUIDE_TEMPLATE, NPC_FEATURED_TEMPLATE], true)) $states['npc'] = 'Coastal Light preview (noindex)';
	return $states;
}, 10, 2);
