<?php
/**
 * Coastal Light design for the rest of the site: content pages (About, Contact, Services, FAQ, guides, Privacy...),
 * the blog index and every blog post. Each page keeps its URL and Rank Math SEO; its text lives in the page's
 * "Coastal Light page" box (moved over from the old Elementor layout, which is left untouched underneath).
 * A page uses the new design only when the site-wide switch is on AND its own "Use the new design" box is ticked.
 */
if (!defined('ABSPATH')) exit;

// Page ID => [layout, eyebrow, title (words in <b> are bold), photo (media slug/ID or '')]
const NPC_CONTENT_PAGES = [
	25   => ['about',    'About',                 '<b>Nick Ponte,</b> Managing Broker',              'npc-nick-ponte'],
	31   => ['contact',  'Contact',               'We look forward <b>to connecting.</b>',           ''],
	370  => ['article',  'How we work',           'Seacoast NH <b>real estate services</b>',         'npc-seller-hero'],
	6103 => ['article',  'Knowledge center',      'Seacoast NH real estate <b>FAQ</b>',              'npc-contact-seawall'],
	6082 => ['article',  'Q1 2026 market report', 'Seacoast NH <b>market data &amp; trends</b>',     'npc-hero-hampton'],
	7513 => ['article',  'NH Seacoast communities', '<b>Hampton Beach,</b> NH real estate',          7581],
	4268 => ['article',  'Buyer resources',       'Home financing <b>on the Seacoast</b>',           'npc-buyer-hero'],
	6182 => ['article',  'Seller resources',      'How much does it cost <b>to sell a home?</b>',    'npc-estate-dusk'],
	3455 => ['article',  'Buyer resources',       'Understanding <b>home sale contingencies</b>',    'npc-town-new-castle'],
	5531 => ['article',  'Careers',               'Thinking about a <b>real estate career?</b>',     'npc-portsmouth'],
	627  => ['blog',     'Market news',           'Seacoast NH <b>real estate blog</b>',             ''],
	1145 => ['legal',    'Legal',                 '<b>Privacy</b> Policy',                           ''],
];

function npc_page_fields() {
	return [
		'enabled' => ['Use the new design for this page', 'checkbox', 'Untick to show the old page again.'],
		'intro'   => ['Intro (under the title)', 'textarea', ''],
		'body'    => ['Page text', 'html', 'Headings, paragraphs, lists, links. FAQ items: one <details><summary>Question</summary><p>Answer</p></details> each. [npc_netsheet] inserts the seller net sheet calculator.'],
		'form'    => ['Form (advanced)', 'textarea', 'Set up automatically from the old page\'s form. JSON: {post, id, fields:[{name,type,label,required}]}'],
	];
}

add_action('init', function () {
	foreach (npc_page_fields() as $k => $f) {
		register_post_meta('page', "_npc_page_$k", [
			'type' => $f[1] === 'checkbox' ? 'boolean' : 'string', 'single' => true, 'show_in_rest' => true,
			'auth_callback' => function () { return current_user_can('edit_pages'); },
			'sanitize_callback' => $f[1] === 'html' ? 'wp_kses_post' : null,
		]);
	}
});

add_action('add_meta_boxes_page', function ($post) {
	if (!isset(NPC_CONTENT_PAGES[$post->ID])) return;
	add_meta_box('npc_page_fields', 'Coastal Light page (new design)', function ($post) {
		wp_nonce_field('npc_page_save', 'npc_page_nonce');
		echo '<p style="margin-top:0">This text is what visitors see in the new design. The Elementor layout above is the old page, kept as a backup.</p><table class="form-table" role="presentation">';
		foreach (npc_page_fields() as $k => $f) {
			$v = get_post_meta($post->ID, "_npc_page_$k", true); $id = "npc_page_$k";
			echo '<tr><th scope="row"><label for="' . esc_attr($id) . '">' . esc_html($f[0]) . '</label></th><td>';
			if ($f[1] === 'html') wp_editor((string) $v, $id, ['textarea_name' => $id, 'textarea_rows' => 18, 'media_buttons' => true]);
			elseif ($f[1] === 'checkbox') echo '<label><input type="checkbox" id="' . esc_attr($id) . '" name="' . esc_attr($id) . '" value="1" ' . checked((bool) $v, true, false) . '> Yes</label>';
			else echo '<textarea class="large-text" rows="3" id="' . esc_attr($id) . '" name="' . esc_attr($id) . '">' . esc_textarea($v) . '</textarea>';
			if ($f[2]) echo '<p class="description">' . esc_html($f[2]) . '</p>';
			echo '</td></tr>';
		}
		echo '</table>';
	}, 'page', 'normal', 'high');
});

add_action('save_post_page', function ($id) {
	if (!isset($_POST['npc_page_nonce']) || !wp_verify_nonce($_POST['npc_page_nonce'], 'npc_page_save')) return;
	if ((defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || !current_user_can('edit_page', $id)) return;
	foreach (npc_page_fields() as $k => $f) {
		$name = "npc_page_$k";
		if ($f[1] === 'checkbox') { update_post_meta($id, "_npc_page_$k", !empty($_POST[$name])); continue; }
		if (!isset($_POST[$name])) continue;
		$raw = wp_unslash($_POST[$name]);
		update_post_meta($id, "_npc_page_$k", $f[1] === 'html' ? wp_kses_post($raw) : ($k === 'form' ? $raw : sanitize_textarea_field($raw)));
	}
});

// Which new-design layout (if any) applies to this request.
function npc_content_kind() {
	if (!npc_live()) return false;
	if (is_singular('post')) return (get_post_meta(627, '_npc_page_enabled', true) || (isset($_GET['npc_preview']) && current_user_can('edit_posts'))) ? 'post' : false; // posts follow the blog page's switch
	if (is_page()) {
		$id = get_queried_object_id();
		$try = isset($_GET['npc_preview']) && current_user_can('edit_pages'); // editors can preview before switching a page on
		if (isset(NPC_CONTENT_PAGES[$id]) && ($try || get_post_meta($id, '_npc_page_enabled', true))) return NPC_CONTENT_PAGES[$id][0];
	}
	if (is_home() && get_option('page_for_posts') && get_post_meta((int) get_option('page_for_posts'), '_npc_page_enabled', true)) return 'blog';
	return false;
}

// Generic form (same fields as the old Elementor form, posted to it so emails/submissions are unchanged).
function npc_render_form($json, $button = 'Send', $success = '') {
	$f = json_decode((string) $json, true);
	if (!$f || empty($f['id'])) return '';
	$h = '<form class="npc-val__form npc-eform" data-post-id="' . esc_attr($f['post']) . '" data-form-id="' . esc_attr($f['id']) . '" data-queried-id="' . (int) $f['post'] . '"' . ($success ? ' data-success="' . esc_attr($success) . '"' : '') . ' novalidate>';
	foreach ($f['fields'] as $i => $fl) {
		$id = 'npc-f-' . $f['id'] . '-' . $i;
		$wide = in_array($fl['type'], ['textarea', 'email'], true) || count($f['fields']) <= 3 ? ' npc-field--wide' : '';
		$req = !empty($fl['required']) ? ' required' : '';
		$h .= '<div class="npc-field' . $wide . '"><label for="' . esc_attr($id) . '">' . esc_html($fl['label'] ?: ucfirst($fl['name'])) . (!empty($fl['required']) ? '' : ' <span class="npc-opt">(optional)</span>') . '</label>';
		if ($fl['type'] === 'textarea') $h .= '<textarea id="' . esc_attr($id) . '" data-field="' . esc_attr($fl['name']) . '" rows="5"' . $req . '></textarea>';
		else $h .= '<input id="' . esc_attr($id) . '" data-field="' . esc_attr($fl['name']) . '" type="' . esc_attr(in_array($fl['type'], ['email', 'tel'], true) ? $fl['type'] : 'text') . '"' . $req . ' autocomplete="' . ($fl['type'] === 'email' ? 'email' : ($fl['type'] === 'tel' ? 'tel' : ($fl['name'] === 'name' ? 'name' : 'on'))) . '">';
		$h .= '</div>';
	}
	return $h . '<div class="npc-field npc-field--btn"><button class="npc-btn npc-btn--lg" type="submit">' . esc_html($button) . '</button></div><p class="npc-eform__msg" role="status" aria-live="polite"></p></form>';
}

// Seller net sheet calculator ([npc_netsheet] in the page text).
function npc_netsheet() {
	return '<div class="npc-net" data-npc-net>'
		. '<div class="npc-net__in"><label for="npc-net-price">Sale price</label><div class="npc-net__price"><span>$</span><input id="npc-net-price" type="text" inputmode="numeric" value="800,000"></div>'
		. '<label for="npc-net-comm">Total commission</label><div class="npc-net__price npc-net__pct"><input id="npc-net-comm" type="text" inputmode="decimal" value="5"><span>%</span></div></div>'
		. '<dl class="npc-net__rows">'
		. '<div><dt>Commission</dt><dd data-net="comm"></dd></div>'
		. '<div><dt>NH transfer tax, seller\'s half <span>$0.75 per $100</span></dt><dd data-net="tax"></dd></div>'
		. '<div><dt>Deed preparation</dt><dd data-net="deed">− $175</dd></div>'
		. '<div class="npc-net__total"><dt>Estimated net proceeds <span>Before mortgage payoff</span></dt><dd data-net="net"></dd></div>'
		. '</dl><p class="npc-net__note">Estimate only. Does not include mortgage payoff, prorated taxes, seller concessions or pre-sale preparation costs.</p></div>';
}

function npc_content_body($id) {
	$html = (string) get_post_meta($id, '_npc_page_body', true);
	$html = wp_kses_post($html);
	if (strpos($html, '[npc_netsheet]') !== false) $html = str_replace(['<p>[npc_netsheet]</p>', '[npc_netsheet]'], npc_netsheet(), $html);
	return $html;
}

// Stand-in photo for posts without a featured image: one of Nick's photos, varied by post.
function npc_post_fallback($post_id, $size) {
	$pool = ['npc-hero-hampton', 'npc-town-new-castle', 'npc-town-seabrook', 'npc-estate-dusk', 'npc-town-hampton', 'npc-town-newington', 'npc-exeter-downtown', 'npc-contact-seawall', 'npc-town-hampton-falls', 'npc-portsmouth'];
	return npc_img($pool[$post_id % count($pool)], $size, ['alt' => '']);
}

// Sidebar on content pages and posts.
function npc_aside() {
	$home = npc_home_url();
	ob_start(); ?>
	<aside class="npc-aside">
		<div class="npc-card npc-aside__card">
			<p class="npc-eyebrow">Talk to Nick</p>
			<p class="npc-aside__t">Questions about buying or selling on the Seacoast?</p>
			<div class="npc-aside__links">
				<a href="tel:6039187593"><?php echo npc_icon('phone'); ?>603-918-7593</a>
				<a href="sms:6039187593"><?php echo npc_icon('mail'); ?>Text Nick</a>
				<a href="mailto:nponte@careyandgiampa.com"><?php echo npc_icon('mail'); ?>nponte@careyandgiampa.com</a>
			</div>
			<a class="npc-btn" href="<?php echo esc_url($home . '#valuation'); ?>">Free home valuation</a>
		</div>
		<nav class="npc-card npc-aside__card npc-aside__nav" aria-label="Resources">
			<p class="npc-eyebrow">Resources</p>
			<a href="<?php echo esc_url(npc_guide_url('buyers-guide')); ?>">Buyer Guide →</a>
			<a href="<?php echo esc_url(npc_guide_url('sellers-guide')); ?>">Seller Guide →</a>
			<a href="<?php echo esc_url(get_permalink(6182)); ?>">Cost to sell a home →</a>
			<a href="<?php echo esc_url(get_permalink(6082)); ?>">Market data &amp; trends →</a>
			<a href="<?php echo esc_url(get_permalink(6103)); ?>">Seacoast real estate FAQ →</a>
			<a href="<?php echo esc_url(get_permalink(627)); ?>">Market news →</a>
		</nav>
	</aside>
	<?php return ob_get_clean();
}

// Templates, assets, noindex, icon: hook the new kinds into the plugin's existing preview machinery.
add_filter('template_include', function ($template) {
	$k = npc_content_kind();
	if ($k) return NPC_DIR . 'templates/' . ($k === 'post' ? 'post' : ($k === 'blog' ? 'blog' : 'content')) . '.php';
	return $template;
}, 100);
