<?php
/**
 * Town guide: turns the long town text into a short intro + tabbed sections with card grids,
 * so visitors read one topic at a time. All text stays in the page (good for search).
 */
if (!defined('ABSPATH')) exit;

// Split HTML into top-level nodes: [['tag'=>'h2'|'h3'|'p'|'ul'|..., 'html'=>..., 'text'=>...], ...]
function npc_guide_nodes($html) {
	$doc = new DOMDocument();
	libxml_use_internal_errors(true);
	$doc->loadHTML('<?xml encoding="utf-8"?><div id="r">' . $html . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
	libxml_clear_errors();
	$root = $doc->getElementById('r');
	$out = [];
	if (!$root) return $out;
	foreach ($root->childNodes as $n) {
		if ($n->nodeType === XML_TEXT_NODE) {
			$t = trim($n->textContent);
			if ($t !== '') $out[] = ['tag' => 'p', 'html' => '<p>' . esc_html($t) . '</p>', 'text' => $t];
			continue;
		}
		if ($n->nodeType !== XML_ELEMENT_NODE) continue;
		$out[] = ['tag' => strtolower($n->nodeName), 'html' => $doc->saveHTML($n), 'text' => trim($n->textContent), 'class' => $n->getAttribute('class')];
	}
	return $out;
}

// Shorter tab labels: "The Neighborhoods of Rye, NH" -> "Neighborhoods"
function npc_guide_label($title, $town) {
	$t = html_entity_decode($title, ENT_QUOTES);
	$map = [
		'/neighborhood/i' => 'Neighborhoods', '/market data|market report|market snapshot/i' => 'The market',
		'/top .*sales|recent sales|notable sales/i' => 'Top sales', '/worth|valuation|home value/i' => 'Home values',
		'/things to do|lifestyle|around /i' => 'Things to do', '/school|education/i' => 'Schools',
		'/why work|top realtor|work with/i' => 'Working with Nick', '/history/i' => 'History', '/commut|getting around/i' => 'Getting around',
		'/tax/i' => 'Taxes', '/condo/i' => 'Condos', '/invest|rental/i' => 'Investing', '/waterfront|beach/i' => 'Waterfront',
	];
	foreach ($map as $re => $label) if (preg_match($re, $t)) return $label;
	$t = preg_replace('/\b(in|of)\s+' . preg_quote($town, '/') . '(,?\s*NH)?\b/i', '', $t);
	$t = preg_replace('/\s*\(\d{4}\)\s*/', '', $t);
	return trim($t, " ,:?-") ?: $title;
}

function npc_title_case_caps($s) {
	if (strtoupper($s) !== $s) return $s;
	$s = ucwords(strtolower($s));
	return preg_replace_callback('/\b(Nh|Mls|Fema|Hoa|Unh|Sau)\b/', function ($m) { return strtoupper($m[1]); }, $s);
}

function npc_town_guide($html, $town) {
	$nodes = npc_guide_nodes($html);
	if (!$nodes) return '';
	// Intro = everything before the first h2
	$intro = []; $sections = []; $cur = null;
	foreach ($nodes as $n) {
		if ($n['tag'] === 'h2') { if ($cur) $sections[] = $cur; $cur = ['title' => $n['text'], 'items' => []]; continue; }
		if ($cur) $cur['items'][] = $n; else $intro[] = $n;
	}
	if ($cur) $sections[] = $cur;
	$sections = array_values(array_filter($sections, function ($s) { return $s['items']; }));

	$uid = 'npc-g-' . substr(md5($town), 0, 6);
	ob_start(); ?>
	<section class="npc-section npc-guide2" aria-labelledby="<?php echo esc_attr($uid); ?>-h">
		<div class="npc-guide2__head">
			<p class="npc-eyebrow">Town guide</p>
			<h2 class="npc-h2" id="<?php echo esc_attr($uid); ?>-h">Living in <b><?php echo esc_html($town); ?></b></h2>
		</div>
		<?php if ($intro) : ?>
			<div class="npc-guide2__intro">
				<?php echo wp_kses_post($intro[0]['html']); ?>
				<?php if (count($intro) > 1) : ?>
					<div class="npc-more-txt" hidden id="<?php echo esc_attr($uid); ?>-more"><?php foreach (array_slice($intro, 1) as $n) echo wp_kses_post($n['html']); ?></div>
					<button type="button" class="npc-readmore" aria-expanded="false" aria-controls="<?php echo esc_attr($uid); ?>-more">Read more</button>
				<?php endif; ?>
			</div>
		<?php endif; ?>

		<?php if ($sections) : ?>
			<div class="npc-tabs" data-npc-tabs>
				<div class="npc-tabs__list" role="tablist" aria-label="<?php echo esc_attr($town); ?> town guide">
					<?php foreach ($sections as $i => $s) : ?>
						<button type="button" role="tab" id="<?php echo esc_attr("$uid-t$i"); ?>" aria-controls="<?php echo esc_attr("$uid-p$i"); ?>" aria-selected="<?php echo $i ? 'false' : 'true'; ?>" tabindex="<?php echo $i ? '-1' : '0'; ?>"><?php echo esc_html(npc_guide_label($s['title'], $town)); ?></button>
					<?php endforeach; ?>
				</div>
				<?php foreach ($sections as $i => $s) :
					// Lead text, stat tiles, and h3 + paragraph groups (cards)
					$lead = []; $rest = []; $cards = []; $stats = ''; $card = null;
					foreach ($s['items'] as $n) {
						if ($n['tag'] === 'h3') { if ($card) $cards[] = $card; $card = ['t' => $n['text'], 'b' => '']; continue; }
						if ($n['tag'] === 'ul' && strpos((string) $n['class'], 'npc-stats-list') !== false) { $stats = $n['html']; continue; }
						if ($card) { $card['b'] .= $n['html']; continue; }
						if (!$lead) $lead[] = $n; else $rest[] = $n;
					}
					if ($card) $cards[] = $card;
					// Text after the last card that isn't part of it (closing paragraphs) stays in the card; that's fine.
					?>
					<div class="npc-tabs__panel" role="tabpanel" id="<?php echo esc_attr("$uid-p$i"); ?>" aria-labelledby="<?php echo esc_attr("$uid-t$i"); ?>" <?php if ($i) echo 'hidden'; ?>>
						<h3 class="npc-tabs__h"><?php echo esc_html(html_entity_decode($s['title'], ENT_QUOTES)); ?></h3>
						<?php if ($stats) echo '<div class="npc-article__body">' . wp_kses_post($stats) . '</div>'; ?>
						<?php if ($lead) : ?>
							<div class="npc-tabs__lead">
								<?php echo wp_kses_post($lead[0]['html']); ?>
								<?php if ($rest) : ?>
									<div class="npc-more-txt" hidden id="<?php echo esc_attr("$uid-m$i"); ?>"><?php foreach ($rest as $n) echo wp_kses_post($n['html']); ?></div>
									<button type="button" class="npc-readmore" aria-expanded="false" aria-controls="<?php echo esc_attr("$uid-m$i"); ?>">Read more</button>
								<?php endif; ?>
							</div>
						<?php endif; ?>
						<?php if ($cards) : ?>
							<div class="npc-gcards">
								<?php foreach ($cards as $c) : ?>
									<div class="npc-gcard">
										<h4 class="npc-gcard__t"><?php echo esc_html(npc_title_case_caps(html_entity_decode($c['t'], ENT_QUOTES))); ?></h4>
										<div class="npc-gcard__b"><?php echo wp_kses_post($c['b']); ?></div>
									</div>
								<?php endforeach; ?>
							</div>
						<?php endif; ?>
					</div>
				<?php endforeach; ?>
			</div>
		<?php endif; ?>
	</section>
	<?php return ob_get_clean();
}
