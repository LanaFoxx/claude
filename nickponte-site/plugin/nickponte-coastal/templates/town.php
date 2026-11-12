<?php
/** Coastal Light town page (preview). */
if (!defined('ABSPATH')) exit;
$npc_active = 'town';
$t = npc_town_data(npc_current_town());
$home = npc_home_url();
include NPC_DIR . 'templates/header.php';
?>
<section class="npc-split">
	<div class="npc-split__txt">
		<nav class="npc-crumbs" aria-label="Breadcrumb"><a href="<?php echo esc_url($home); ?>">Home</a> / <a href="<?php echo esc_url(npc_default_town_url()); ?>">Towns</a> / <span aria-current="page"><?php echo esc_html($t['name']); ?></span></nav>
		<p class="npc-eyebrow">Seacoast New Hampshire</p>
		<h1 class="npc-split__h1"><b><?php echo esc_html($t['name']); ?></b><span class="npc-sr">, NH real estate</span></h1>
		<p class="npc-split__intro"><?php echo esc_html($t['intro']); ?></p>
		<div class="npc-actions">
			<a class="npc-btn npc-btn--lg" href="tel:6039187593">Call Nick</a>
			<a class="npc-btn npc-btn--ghost npc-btn--lg" href="sms:6039187593">Text me</a>
		</div>
	</div>
	<div class="npc-split__photo">
		<?php echo npc_town_photo($t, 'full', ['alt' => $t['name'] . ', New Hampshire', 'loading' => 'eager', 'fetchpriority' => 'high', 'sizes' => '(max-width: 920px) 100vw, 50vw']); ?>
	</div>
</section>

<div class="npc-wrap">
	<nav class="npc-pills" aria-label="Seacoast towns">
		<?php foreach (npc_towns() as $p) : $on = $p->ID === $t['id']; ?>
			<a class="npc-pill<?php echo $on ? ' is-on' : ''; ?>" href="<?php echo esc_url(npc_town_url($p)); ?>" <?php if ($on) echo 'aria-current="page"'; ?>><?php echo esc_html(get_the_title($p)); ?></a>
		<?php endforeach; ?>
	</nav>

	<div class="npc-grid">
		<section class="npc-card npc-snap">
			<div class="npc-card__head">
				<h2 class="npc-card__t">Market snapshot</h2>
				<p class="npc-muted">Updated <?php echo esc_html($t['updated']); ?></p>
			</div>
			<p class="npc-card__sub"><?php echo esc_html($t['name']); ?> · Last 90 days of closed sales</p>
			<dl class="npc-metrics">
				<?php foreach ($t['metrics'] as $m) : ?>
					<div class="npc-metric">
						<dt><?php echo esc_html($m[0]); ?> <span><?php echo esc_html($m[2]); ?></span></dt>
						<dd><?php echo esc_html($m[1]); ?></dd>
					</div>
				<?php endforeach; ?>
			</dl>
			<?php if ($t['spark']) : ?>
				<div class="npc-trend">
					<div class="npc-trend__head"><span>Median price, 12 months</span><strong><?php echo esc_html($t['spark']['delta']); ?></strong></div>
					<svg class="npc-trend__svg" viewBox="0 0 240 64" preserveAspectRatio="none" role="img" aria-label="Median sale price over the last 12 months, <?php echo esc_attr($t['spark']['delta']); ?>">
						<polygon points="<?php echo esc_attr($t['spark']['area']); ?>" fill="rgba(63,110,153,.18)"/>
						<polyline points="<?php echo esc_attr($t['spark']['line']); ?>" fill="none" stroke="#3F6E99" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
					</svg>
				</div>
			<?php endif; ?>
			<?php if ($t['read']) : ?><p class="npc-read"><strong>Nick's read.</strong> <?php echo esc_html($t['read']); ?></p><?php endif; ?>
			<p class="npc-foot">
				<?php if ($t['sample']) : ?>Sample figures shown for layout; replace with the current month before publishing. <?php endif; ?>
				<?php if ($t['zillow']) : ?><a href="<?php echo esc_url('https://www.zillow.com/' . $t['slug'] . '-nh/sold/'); ?>" target="_blank" rel="noopener nofollow">All <?php echo esc_html($t['name']); ?> sales on Zillow ↗</a><?php endif; ?>
			</p>
		</section>

		<div class="npc-stack">
			<section class="npc-card">
				<h2 class="npc-card__t">Neighborhoods</h2>
				<p class="npc-card__sub">Where people buy in <?php echo esc_html($t['name']); ?></p>
				<ol class="npc-areas">
					<?php foreach ($t['areas'] as $i => $a) : ?>
						<li><span class="npc-areas__n"><?php echo esc_html(str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT)); ?></span><span><strong><?php echo esc_html($a[0]); ?></strong><span><?php echo esc_html($a[1]); ?></span></span></li>
					<?php endforeach; ?>
				</ol>
			</section>
			<section class="npc-card npc-talk">
				<?php echo npc_town_photo($t, 'large', ['class' => 'npc-talk__img', 'alt' => '', 'aria-hidden' => 'true']); ?>
				<div class="npc-talk__in">
					<h2 class="npc-card__t">Talk to Nick</h2>
					<p>Questions about <?php echo esc_html($t['name']); ?>? A candid read on the market, a valuation of your home, or an off-market introduction.</p>
					<div class="npc-actions">
						<a class="npc-btn" href="tel:6039187593">Call</a>
						<a class="npc-btn npc-btn--ghost" href="sms:6039187593">Text me</a>
					</div>
				</div>
			</section>
		</div>
	</div>

	<?php if ($t['sales']) : ?>
		<section class="npc-card npc-sales">
			<div class="npc-sales__head">
				<div>
					<h2 class="npc-card__t">Recent sales</h2>
					<p class="npc-card__sub">Closed transactions where Nick represented the buyer, the seller, or both</p>
				</div>
				<a class="npc-link" href="<?php echo esc_url(npc_featured_url()); ?>">All featured sales →</a>
			</div>
			<ul class="npc-sales__list">
				<?php foreach ($t['sales'] as $s) : ?>
					<li class="npc-sale">
						<?php if (!empty($s[5])) : ?><img class="npc-sale__img" src="<?php echo esc_url($s[5]); ?>" alt="" loading="lazy" width="96" height="72"><?php else : echo npc_town_photo($t, 'thumbnail', ['class' => 'npc-sale__img', 'alt' => '']); endif; ?>
						<div class="npc-sale__main"><p class="npc-sale__st"><?php echo esc_html($s[0]); ?></p><p class="npc-sale__meta"><?php echo esc_html($s[1]); ?></p></div>
						<div class="npc-sale__right"><p class="npc-sale__price"><?php echo esc_html($s[2]); ?></p><?php if (!empty($s[3])) : ?><p class="npc-sale__side"><?php echo esc_html($s[3]); ?></p><?php endif; ?><?php if (!empty($s[4])) : ?><p class="npc-sale__date"><?php echo esc_html($s[4]); ?></p><?php endif; ?></div>
					</li>
				<?php endforeach; ?>
			</ul>
		</section>
	<?php endif; ?>

	<?php if (trim(wp_strip_all_tags($t['body']))) : ?>
		<section class="npc-section npc-article">
			<p class="npc-eyebrow">Town guide</p>
			<div class="npc-article__body"><?php echo wp_kses_post(wpautop($t['body'])); ?></div>
		</section>
	<?php endif; ?>

	<section class="npc-faq npc-section">
		<div>
			<p class="npc-eyebrow">Questions</p>
			<h2 class="npc-h2">Buying and selling in <b><?php echo esc_html($t['name']); ?></b></h2>
		</div>
		<div class="npc-faq__list">
			<?php foreach ($t['faqs'] as $i => $f) : ?>
				<div class="npc-faq__item">
					<h3><button type="button" aria-expanded="<?php echo $i === 0 ? 'true' : 'false'; ?>" aria-controls="npc-faq-<?php echo $i; ?>"><span><?php echo esc_html($f[0]); ?></span><span class="npc-faq__sign" aria-hidden="true"><?php echo $i === 0 ? '−' : '+'; ?></span></button></h3>
					<div class="npc-faq__a" id="npc-faq-<?php echo $i; ?>" <?php if ($i !== 0) echo 'hidden'; ?>><p><?php echo esc_html($f[1]); ?></p></div>
				</div>
			<?php endforeach; ?>
		</div>
	</section>
</div>
<?php include NPC_DIR . 'templates/footer.php';
