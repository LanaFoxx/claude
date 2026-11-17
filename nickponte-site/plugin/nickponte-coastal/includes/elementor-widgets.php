<?php
/**
 * "Nick Ponte" Elementor widgets. Each reads the monthly data entered under Towns, so Nick updates numbers in one
 * place and every page follows. Headings and labels are editable in the widget's Content tab.
 */
if (!defined('ABSPATH')) exit;

abstract class NPC_W_Base extends \Elementor\Widget_Base {
	public function get_categories() { return ['nick-ponte']; }
	public function get_icon() { return 'eicon-site-identity'; }
	protected function town_control($label = 'Town') {
		$opts = ['0' => "This page's town"];
		foreach (npc_towns() as $p) $opts[(string) $p->ID] = get_the_title($p);
		$this->add_control('town', ['label' => $label, 'type' => \Elementor\Controls_Manager::SELECT, 'default' => '0', 'options' => $opts,
			'description' => 'Numbers come from Dashboard › Towns.']);
	}
	protected function text_control($key, $label, $default, $type = 'TEXT') {
		$this->add_control($key, ['label' => $label, 'type' => constant('\Elementor\Controls_Manager::' . $type), 'default' => $default, 'label_block' => true]);
	}
	protected function town() { $s = $this->get_settings_for_display(); $p = npc_el_town((int) ($s['town'] ?? 0)); return $p ? npc_town_data($p) : null; }
}

/* Homepage: photo tiles for the first towns + list of the rest */
class NPC_W_Town_Tiles extends NPC_W_Base {
	public function get_name() { return 'npc-town-tiles'; }
	public function get_title() { return 'Town markets (tiles)'; }
	public function get_icon() { return 'eicon-gallery-grid'; }
	protected function register_controls() {
		$this->start_controls_section('c', ['label' => 'Town markets']);
		$this->add_control('tiles', ['label' => 'Photo tiles', 'type' => \Elementor\Controls_Manager::NUMBER, 'default' => 3, 'min' => 0, 'max' => 6]);
		$this->text_control('cta', 'Tile link text', 'View market →');
		$this->add_control('note', ['type' => \Elementor\Controls_Manager::RAW_HTML, 'raw' => 'Order, photos and medians come from Dashboard › Towns (Order field).']);
		$this->end_controls_section();
	}
	protected function render() {
		$s = $this->get_settings_for_display();
		$towns = array_map('npc_town_data', npc_towns()); $n = max(0, (int) $s['tiles']);
		echo '<div class="npc-tiles">';
		foreach (array_slice($towns, 0, $n) as $t) {
			echo '<a class="npc-tile" href="' . esc_url($t['url']) . '">' . npc_town_photo($t, 'large', ['class' => 'npc-tile__img', 'alt' => '', 'sizes' => '(max-width: 900px) 100vw, 380px'])
				. '<span class="npc-tile__txt"><span class="npc-tile__name">' . esc_html($t['name']) . '</span><span class="npc-tile__tag">' . esc_html($t['tag']) . '</span>'
				. '<span class="npc-tile__row"><span>Median ' . esc_html(npc_short($t['median'])) . '</span><span>' . esc_html($s['cta']) . '</span></span></span></a>';
		}
		echo '</div>';
		$more = array_slice($towns, $n);
		if ($more) {
			echo '<div class="npc-more">';
			foreach ($more as $t) echo '<a class="npc-more__row" href="' . esc_url($t['url']) . '"><span><span class="npc-more__name">' . esc_html($t['name']) . '</span> <span class="npc-more__tag">' . esc_html($t['tag']) . '</span></span><span class="npc-more__price">' . esc_html(npc_short($t['median'])) . ' →</span></a>';
			echo '</div>';
		}
	}
}

/* Town pages: buttons to every town */
class NPC_W_Town_Pills extends NPC_W_Base {
	public function get_name() { return 'npc-town-pills'; }
	public function get_title() { return 'Town buttons'; }
	public function get_icon() { return 'eicon-tags'; }
	protected function register_controls() { $this->start_controls_section('c', ['label' => 'Town buttons']); $this->town_control('Highlight'); $this->end_controls_section(); }
	protected function render() {
		$t = $this->town(); $cur = $t ? $t['id'] : 0;
		echo '<nav class="npc-pills" aria-label="Seacoast towns">';
		foreach (npc_towns() as $p) { $on = $p->ID === $cur; echo '<a class="npc-pill' . ($on ? ' is-on' : '') . '" href="' . esc_url(npc_town_url($p)) . '"' . ($on ? ' aria-current="page"' : '') . '>' . esc_html(get_the_title($p)) . '</a>'; }
		echo '</nav>';
	}
}

/* Market snapshot card */
class NPC_W_Town_Snapshot extends NPC_W_Base {
	public function get_name() { return 'npc-town-snapshot'; }
	public function get_title() { return 'Town market snapshot'; }
	public function get_icon() { return 'eicon-number-field'; }
	protected function register_controls() {
		$this->start_controls_section('c', ['label' => 'Market snapshot']);
		$this->town_control();
		$this->text_control('title', 'Title', 'Market snapshot');
		$this->text_control('sub', 'Subtitle (after town name)', 'Last 90 days of closed sales');
		$this->end_controls_section();
	}
	protected function render() {
		$t = $this->town(); if (!$t) return; $s = $this->get_settings_for_display(); ?>
		<section class="npc-card npc-snap">
			<div class="npc-card__head"><h2 class="npc-card__t"><?php echo esc_html($s['title']); ?></h2><p class="npc-muted">Updated <?php echo esc_html($t['updated']); ?></p></div>
			<p class="npc-card__sub"><?php echo esc_html($t['name'] . ' · ' . $s['sub']); ?></p>
			<dl class="npc-metrics"><?php foreach ($t['metrics'] as $m) : ?><div class="npc-metric"><dt><?php echo esc_html($m[0]); ?> <span><?php echo esc_html($m[2]); ?></span></dt><dd><?php echo esc_html($m[1]); ?></dd></div><?php endforeach; ?></dl>
			<?php if ($t['spark']) : ?>
				<div class="npc-trend"><div class="npc-trend__head"><span>Median price, 12 months</span><strong><?php echo esc_html($t['spark']['delta']); ?></strong></div>
				<svg class="npc-trend__svg" viewBox="0 0 240 64" preserveAspectRatio="none" role="img" aria-label="Median sale price over the last 12 months, <?php echo esc_attr($t['spark']['delta']); ?>"><polygon points="<?php echo esc_attr($t['spark']['area']); ?>" fill="rgba(63,110,153,.18)"/><polyline points="<?php echo esc_attr($t['spark']['line']); ?>" fill="none" stroke="#3F6E99" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg></div>
			<?php endif; ?>
			<?php if ($t['read']) : ?><p class="npc-read"><strong>Nick's read.</strong> <?php echo esc_html($t['read']); ?></p><?php endif; ?>
			<p class="npc-foot"><?php if ($t['sample']) : ?>Sample figures shown for layout; replace with the current month before publishing. <?php endif; ?><?php if ($t['zillow']) : ?><a href="<?php echo esc_url('https://www.zillow.com/' . $t['slug'] . '-nh/sold/'); ?>" target="_blank" rel="noopener nofollow">All <?php echo esc_html($t['name']); ?> sales on Zillow ↗</a><?php endif; ?></p>
		</section>
	<?php }
}

/* Neighborhoods card */
class NPC_W_Town_Areas extends NPC_W_Base {
	public function get_name() { return 'npc-town-areas'; }
	public function get_title() { return 'Town neighborhoods'; }
	public function get_icon() { return 'eicon-bullet-list'; }
	protected function register_controls() {
		$this->start_controls_section('c', ['label' => 'Neighborhoods']);
		$this->town_control(); $this->text_control('title', 'Title', 'Neighborhoods'); $this->text_control('sub', 'Subtitle (before town name)', 'Where people buy in');
		$this->end_controls_section();
	}
	protected function render() {
		$t = $this->town(); if (!$t) return; $s = $this->get_settings_for_display();
		echo '<section class="npc-card"><h2 class="npc-card__t">' . esc_html($s['title']) . '</h2><p class="npc-card__sub">' . esc_html($s['sub'] . ' ' . $t['name']) . '</p><ol class="npc-areas">';
		foreach ($t['areas'] as $i => $a) echo '<li><span class="npc-areas__n">' . esc_html(str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT)) . '</span><span><strong>' . esc_html($a[0]) . '</strong><span>' . esc_html($a[1] ?? '') . '</span></span></li>';
		echo '</ol></section>';
	}
}

/* Recent sales list */
class NPC_W_Town_Sales extends NPC_W_Base {
	public function get_name() { return 'npc-town-sales'; }
	public function get_title() { return 'Town recent sales'; }
	public function get_icon() { return 'eicon-price-list'; }
	protected function register_controls() {
		$this->start_controls_section('c', ['label' => 'Recent sales']);
		$this->town_control(); $this->text_control('title', 'Title', 'Recent sales'); $this->text_control('sub', 'Subtitle', 'Closed transactions where Nick represented the buyer, the seller, or both');
		$this->text_control('link', 'Link text', 'All featured sales →');
		$this->end_controls_section();
	}
	protected function render() {
		$t = $this->town(); if (!$t || !$t['sales']) return; $s = $this->get_settings_for_display(); ?>
		<section class="npc-card npc-sales"><div class="npc-sales__head"><div><h2 class="npc-card__t"><?php echo esc_html($s['title']); ?></h2><p class="npc-card__sub"><?php echo esc_html($s['sub']); ?></p></div><a class="npc-link" href="<?php echo esc_url(npc_featured_url()); ?>"><?php echo esc_html($s['link']); ?></a></div>
		<ul class="npc-sales__list"><?php foreach ($t['sales'] as $x) : ?><li class="npc-sale"><?php if (!empty($x[5])) : ?><img class="npc-sale__img" src="<?php echo esc_url($x[5]); ?>" alt="" loading="lazy" width="96" height="72"><?php else : echo npc_town_photo($t, 'thumbnail', ['class' => 'npc-sale__img', 'alt' => '']); endif; ?>
			<div class="npc-sale__main"><p class="npc-sale__st"><?php echo esc_html($x[0]); ?></p><p class="npc-sale__meta"><?php echo esc_html($x[1]); ?></p></div>
			<div class="npc-sale__right"><p class="npc-sale__price"><?php echo esc_html($x[2]); ?></p><?php if (!empty($x[3])) : ?><p class="npc-sale__side"><?php echo esc_html($x[3]); ?></p><?php endif; ?><?php if (!empty($x[4])) : ?><p class="npc-sale__date"><?php echo esc_html($x[4]); ?></p><?php endif; ?></div></li><?php endforeach; ?></ul></section>
	<?php }
}

/* Long-form town guide as tabs + cards */
class NPC_W_Town_Guide extends NPC_W_Base {
	public function get_name() { return 'npc-town-guide'; }
	public function get_title() { return 'Town guide (tabs)'; }
	public function get_icon() { return 'eicon-tabs'; }
	protected function register_controls() { $this->start_controls_section('c', ['label' => 'Town guide']); $this->town_control(); $this->add_control('note', ['type' => \Elementor\Controls_Manager::RAW_HTML, 'raw' => 'The text is edited in Dashboard › Towns › "Town guide (long text)". Each H2 becomes a tab.']); $this->end_controls_section(); }
	protected function render() { $t = $this->town(); if ($t && trim(wp_strip_all_tags($t['body']))) echo npc_town_guide($t['body'], $t['name']); }
}

/* FAQ with FAQPage schema (answers use the town's current numbers) */
class NPC_W_Town_FAQ extends NPC_W_Base {
	public function get_name() { return 'npc-town-faq'; }
	public function get_title() { return 'Town FAQ'; }
	public function get_icon() { return 'eicon-accordion'; }
	protected function register_controls() { $this->start_controls_section('c', ['label' => 'FAQ']); $this->town_control(); $this->end_controls_section(); }
	protected function render() {
		$t = $this->town(); if (!$t) return;
		echo '<div class="npc-faq__list">';
		foreach ($t['faqs'] as $i => $f) {
			$id = 'npc-faq-' . $this->get_id() . '-' . $i;
			echo '<div class="npc-faq__item"><h3><button type="button" aria-expanded="' . ($i ? 'false' : 'true') . '" aria-controls="' . esc_attr($id) . '"><span>' . esc_html($f[0]) . '</span><span class="npc-faq__sign" aria-hidden="true">' . ($i ? '+' : '−') . '</span></button></h3>'
				. '<div class="npc-faq__a" id="' . esc_attr($id) . '"' . ($i ? ' hidden' : '') . '><p>' . esc_html($f[1]) . '</p></div></div>';
		}
		echo '</div>';
		$q = array_map(function ($f) { return ['@type' => 'Question', 'name' => $f[0], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f[1]]]; }, $t['faqs']);
		echo '<script type="application/ld+json">' . wp_json_encode(['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => $q], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>';
	}
}

/* Seller net sheet calculator */
class NPC_W_Net_Sheet extends NPC_W_Base {
	public function get_name() { return 'npc-net-sheet'; }
	public function get_title() { return 'Seller net sheet calculator'; }
	public function get_icon() { return 'eicon-calculator'; }
	protected function register_controls() { $this->start_controls_section('c', ['label' => 'Calculator']); $this->add_control('note', ['type' => \Elementor\Controls_Manager::RAW_HTML, 'raw' => 'Commission, NH transfer tax ($0.75 per $100, seller half) and deed preparation.']); $this->end_controls_section(); }
	protected function render() { echo npc_netsheet(); }
}
