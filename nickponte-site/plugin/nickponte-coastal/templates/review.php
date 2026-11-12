<?php
/** Review hub: one page linking every Coastal Light preview, for the client. */
if (!defined('ABSPATH')) exit;
$npc_active = '';
include NPC_DIR . 'templates/header.php';
$towns = array_map('npc_town_data', npc_towns());
?>
<div class="npc-wrap npc-review">
	<p class="npc-eyebrow">Website redesign · Preview for review</p>
	<h1 class="npc-h2">Nick, here's the <b>new website design.</b></h1>
	<p class="npc-review__intro">These are private preview pages built on your live site. They are hidden from Google and nothing on your current website has changed. Click through the new homepage and any town page, then send your notes or approval to Mike.</p>
	<ul class="npc-review__notes">
		<li>Market figures (median price, days on market, listings, sale-to-list, homes sold, the 12-month chart) are sample numbers for layout. Real numbers go in before launch, and you can update them each month in WordPress under <em>Towns</em>.</li>
		<li>On each town page, sales marked "Sample row" are placeholders. The featured sales (805 Central Road, 1026 Ocean Blvd, 39 Chapel Road, 98 Beach Hill Road, 1 Franklin Street) are real.</li>
		<li>Nine towns use the Rye photo for now. Send a photo for each town to replace it.</li>
		<li>Call, text and email links go to your real number and email.</li>
	</ul>

	<section class="npc-review__home">
		<a class="npc-review__shot" href="<?php echo esc_url(npc_home_url()); ?>"><?php echo npc_img('npc-hero-hampton', 'large', ['alt' => '']); ?></a>
		<div>
			<h2 class="npc-review__h3">New homepage</h2>
			<p>Hero, your numbers, the town markets, About, 387 Ocean, a testimonial and the contact and off-market sign-up.</p>
			<div class="npc-actions"><a class="npc-btn npc-btn--lg" href="<?php echo esc_url(npc_home_url()); ?>">Open the homepage</a></div>
		</div>
	</section>

	<h2 class="npc-review__h3" style="margin-top:56px">Buyer and Seller Guide pages</h2>
	<p class="npc-muted" style="margin-top:8px;font-size:15px">The guide download pages in the new style. The download forms work the same way as today.</p>
	<div class="npc-review__towns">
		<?php foreach ([['buyers-guide', 'Buyer Guide', 'npc-buyer-hero'], ['sellers-guide', 'Seller Guide', 'npc-seller-hero']] as $gd) : ?>
			<a class="npc-review__town" href="<?php echo esc_url(npc_guide_url($gd[0])); ?>"><?php echo npc_img($gd[2], 'thumbnail', ['alt' => '']); ?><span><strong><?php echo esc_html($gd[1]); ?></strong><span>Free download page</span></span></a>
		<?php endforeach; ?>
	</div>

	<h2 class="npc-review__h3" style="margin-top:56px">Featured sales</h2>
	<div class="npc-review__towns">
		<a class="npc-review__town" href="<?php echo esc_url(npc_featured_url()); ?>"><?php echo npc_img('npc-sale-805-central', 'thumbnail', ['alt' => '']); ?><span><strong>Featured sales</strong><span>Sold homes and video tours</span></span></a>
	</div>

	<h2 class="npc-review__h3" style="margin-top:56px">Town pages</h2>
	<p class="npc-muted" style="margin-top:8px;font-size:15px">One page per town with a monthly market snapshot, neighborhoods, recent sales and FAQ.</p>
	<div class="npc-review__towns">
		<?php foreach ($towns as $t) : ?>
			<a class="npc-review__town" href="<?php echo esc_url($t['url']); ?>">
				<?php echo npc_town_photo($t, 'thumbnail', ['alt' => '']); ?>
				<span><strong><?php echo esc_html($t['name']); ?></strong><span>Median <?php echo esc_html(npc_short($t['median'])); ?> (sample)</span></span>
			</a>
		<?php endforeach; ?>
	</div>
</div>
<?php include NPC_DIR . 'templates/footer.php';
