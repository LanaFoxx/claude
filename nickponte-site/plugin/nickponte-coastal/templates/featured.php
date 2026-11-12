<?php
/** Featured Sales (preview). Videos load only when a visitor clicks play: nothing autoplays. */
if (!defined('ABSPATH')) exit;
$npc_active = '';
$home = npc_home_url();
// [address, town, price, status, image (media slug or ID), YouTube ID or '', hosted video URL or '']
$sales = [
	['98 Beach Hill Road', 'New Castle, NH', '$6,495,000', 'Sold', 'npc-sale-98-beach-hill', 'rmgyQWi17uk', ''],
	['805 Central Road', 'Rye Beach, NH', '$6,400,000', 'Sold', 'npc-sale-805-central', '2-t3YoOq3Rk', ''],
	['1026 Ocean Blvd', 'Hampton, NH', '$5,500,000', 'Sold', 7583, '', ''],
	['1 Franklin Street', 'Exeter, NH', '$3,400,000', 'Sold', 'npc-sale-1-franklin', 'FptW7er7H_E', ''],
	['82 Kings Highway', 'Hampton, NH', '$2,500,000', 'Featured listing', 7540, '', '/wp-content/uploads/2026/07/video-tour-1-2_wXSUUqoE.mp4'],
	['39 Chapel Road', 'North Hampton, NH', '$2,150,000', 'Sold', 'npc-sale-39-chapel', 'Tyc0Is1i2I4', ''],
];
include NPC_DIR . 'templates/header.php';
?>
<section class="npc-split">
	<div class="npc-split__txt">
		<nav class="npc-crumbs" aria-label="Breadcrumb"><a href="<?php echo esc_url($home); ?>">Home</a> / <span aria-current="page">Featured sales</span></nav>
		<p class="npc-eyebrow">Featured sales</p>
		<h1 class="npc-split__h1">Recent sales and listings</h1>
		<p class="npc-split__intro">A selection of homes Nick has represented on the New Hampshire Seacoast, from Rye Beach to New Castle. More than $110 million in total sales.</p>
		<div class="npc-actions">
			<a class="npc-btn npc-btn--lg" href="tel:6039187593">Call Nick</a>
			<a class="npc-btn npc-btn--ghost npc-btn--lg" href="<?php echo esc_url($home . '#valuation'); ?>">What's my home worth?</a>
		</div>
	</div>
	<div class="npc-split__photo">
		<?php echo npc_img('npc-seller-hero', 'full', ['alt' => 'Oceanfront homes on the New Hampshire Seacoast', 'loading' => 'eager', 'fetchpriority' => 'high', 'sizes' => '(max-width: 920px) 100vw, 50vw']); ?>
	</div>
</section>

<div class="npc-wrap">
	<section class="npc-section npc-fs">
		<?php foreach ($sales as $i => $s) : ?>
			<article class="npc-fs__card">
				<div class="npc-fs__media">
					<?php echo npc_img($s[4], 'large', ['alt' => $s[0] . ', ' . $s[1], 'sizes' => '(max-width: 900px) 100vw, 380px']); ?>
					<?php if ($s[5]) : ?>
						<button type="button" class="npc-fs__play" data-yt="<?php echo esc_attr($s[5]); ?>" aria-label="Play the video tour of <?php echo esc_attr($s[0]); ?>"><span aria-hidden="true"></span></button>
					<?php elseif ($s[6]) : ?>
						<button type="button" class="npc-fs__play" data-mp4="<?php echo esc_url(home_url($s[6])); ?>" aria-label="Play the video tour of <?php echo esc_attr($s[0]); ?>"><span aria-hidden="true"></span></button>
					<?php endif; ?>
					<span class="npc-fs__badge<?php echo $s[3] === 'Sold' ? '' : ' is-active'; ?>"><?php echo esc_html($s[3]); ?></span>
				</div>
				<div class="npc-fs__body">
					<h2 class="npc-fs__t"><?php echo esc_html($s[0]); ?></h2>
					<p class="npc-fs__town"><?php echo esc_html($s[1]); ?></p>
					<p class="npc-fs__price"><?php echo esc_html($s[2]); ?></p>
				</div>
			</article>
		<?php endforeach; ?>
	</section>

	<section class="npc-section npc-guidecta">
		<div class="npc-card npc-talk">
			<?php echo npc_img('npc-contact-seawall', 'large', ['class' => 'npc-talk__img', 'alt' => '', 'aria-hidden' => 'true']); ?>
			<div class="npc-talk__in">
				<h2 class="npc-card__t">Thinking about selling?</h2>
				<p>Nick prepares a confidential valuation from recent comparable sales and your home's specifics, at no cost.</p>
				<div class="npc-actions">
					<a class="npc-btn" href="<?php echo esc_url($home . '#valuation'); ?>">Get a free valuation</a>
					<a class="npc-btn npc-btn--ghost" href="<?php echo esc_url(npc_guide_url('sellers-guide')); ?>">Get the Seller Guide</a>
				</div>
			</div>
		</div>
	</section>
</div>
<?php include NPC_DIR . 'templates/footer.php';
