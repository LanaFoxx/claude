<?php
/** Buyer / Seller Guide download page (preview). The page slug picks the guide. */
if (!defined('ABSPATH')) exit;
$npc_active = '';
$seller = strpos((string) get_post_field('post_name', get_queried_object_id()), 'seller') !== false;
$g = $seller ? [
	'name'    => 'Seller Guide',
	'lede'    => 'Everything you need to sell your home for maximum value, from pricing strategy and staging to closing day.',
	'intro'   => "If you're getting ready to sell, download Nick's free seller guide. It draws on years of experience on the Seacoast to walk you through the process.",
	'inside'  => ['Hiring the right real estate agent', 'Pricing your property', 'Staging and photography', 'Marketing your home', 'Receiving and negotiating offers', 'Home inspections and appraisals', 'What to expect on closing day'],
	'cover'   => '/wp-content/uploads/2026/03/CG_Sellers_Guide_2023-R5_2.48.08_PM_PREP_3-1_1_page-0001.webp',
	'photo'   => 'npc-seller-hero',
	'form'    => ['5742', 'eb8b9a0'],
	'button'  => "Send me the Seller Guide",
	'other'   => ['Buyer Guide', 'buyers-guide'],
] : [
	'name'    => 'Buyer Guide',
	'lede'    => 'Ready to start your home buying journey and have some questions? Let the buyer guide lead the way.',
	'intro'   => "If you're in the market for a new home, download Nick's free buyer guide. Learn about the costs of buying, inspections, appraisals, the under-contract process, what to expect on closing day and more.",
	'inside'  => ['Costs associated with buying a home in NH', 'How to evaluate and make competitive offers', 'Inspection and appraisal walkthrough', 'Understanding the under-contract process', 'What to expect on closing day', 'Post-closing checklist'],
	'cover'   => '/wp-content/uploads/2026/03/CG_Buying-Guide-2023-R1_PREP_3_1_page-0001.webp',
	'photo'   => 'npc-buyer-hero',
	'form'    => ['5725', '969c00c'],
	'button'  => "Send me the Buyer Guide",
	'other'   => ['Seller Guide', 'sellers-guide'],
];
$home = npc_home_url();
include NPC_DIR . 'templates/header.php';
?>
<section class="npc-split">
	<div class="npc-split__txt">
		<nav class="npc-crumbs" aria-label="Breadcrumb"><a href="<?php echo esc_url($home); ?>">Home</a> / <a href="<?php echo esc_url($home . '#resources'); ?>">Resources</a> / <span aria-current="page"><?php echo esc_html($g['name']); ?></span></nav>
		<p class="npc-eyebrow">Free download</p>
		<h1 class="npc-split__h1"><?php echo esc_html($g['name']); ?></h1>
		<p class="npc-split__intro"><?php echo esc_html($g['lede']); ?></p>
		<div class="npc-actions">
			<a class="npc-btn npc-btn--lg" href="#get-guide">Get the free guide</a>
			<a class="npc-btn npc-btn--ghost npc-btn--lg" href="tel:6039187593">Call Nick</a>
		</div>
	</div>
	<div class="npc-split__photo">
		<?php echo npc_img($g['photo'], 'full', ['alt' => 'Oceanfront homes on the New Hampshire Seacoast', 'loading' => 'eager', 'fetchpriority' => 'high', 'sizes' => '(max-width: 920px) 100vw, 50vw']); ?>
	</div>
</section>

<div class="npc-wrap">
	<section class="npc-section npc-guidepage" id="get-guide">
		<div class="npc-guidepage__cover">
			<span class="npc-guidepage__plate" aria-hidden="true"></span>
			<img src="<?php echo esc_url(home_url($g['cover'])); ?>" alt="Cover of the <?php echo esc_attr($g['name']); ?>" width="600" height="776" loading="lazy">
		</div>
		<div class="npc-card npc-guidepage__card">
			<p class="npc-eyebrow">Download your free</p>
			<h2 class="npc-h2"><?php echo esc_html($g['name']); ?></h2>
			<p class="npc-guidepage__intro"><?php echo esc_html($g['intro']); ?></p>
			<h3 class="npc-guidepage__h3">What's inside</h3>
			<ul class="npc-checks">
				<?php foreach ($g['inside'] as $item) : ?><li><?php echo esc_html($item); ?></li><?php endforeach; ?>
			</ul>
			<?php /* Posts to the live guide page's existing Elementor Pro form, so the guide is delivered by the same email action. */ ?>
			<form class="npc-val__form npc-eform" data-post-id="<?php echo esc_attr($g['form'][0]); ?>" data-form-id="<?php echo esc_attr($g['form'][1]); ?>" data-queried-id="<?php echo (int) $g['form'][0]; ?>" data-success="Thanks. Your <?php echo esc_attr($g['name']); ?> is on its way to your inbox." novalidate>
				<div class="npc-field"><label for="npc-g-first">First name</label><input id="npc-g-first" data-field="name" type="text" autocomplete="given-name"></div>
				<div class="npc-field"><label for="npc-g-last">Last name</label><input id="npc-g-last" data-field="field_a940a1f" type="text" autocomplete="family-name"></div>
				<div class="npc-field npc-field--wide"><label for="npc-g-email">Email</label><input id="npc-g-email" data-field="email" type="email" required autocomplete="email"></div>
				<label class="npc-consent npc-field--wide"><input type="checkbox" data-field="field_34e7cc5"> <span>I agree to receive marketing communication via voice call, AI voice call, text message or similar automated means from Nick Ponte Realty. Consent is not a condition of purchase. Msg/data rates may apply. Reply STOP to unsubscribe. <a href="<?php echo esc_url(home_url('/privacy-policy/')); ?>">Privacy Policy</a></span></label>
				<div class="npc-field npc-field--btn"><button class="npc-btn npc-btn--lg" type="submit"><?php echo esc_html($g['button']); ?></button></div>
				<p class="npc-eform__msg" role="status" aria-live="polite"></p>
			</form>
		</div>
	</section>

	<section class="npc-section npc-guidecta">
		<div class="npc-card npc-talk">
			<?php echo npc_img('npc-contact-seawall', 'large', ['class' => 'npc-talk__img', 'alt' => '', 'aria-hidden' => 'true']); ?>
			<div class="npc-talk__in">
				<h2 class="npc-card__t">We look forward to connecting.</h2>
				<p>Whether you're looking to buy, sell, or relocate, Nick Ponte is here to deliver tailored support and professional expertise.</p>
				<div class="npc-actions">
					<a class="npc-btn" href="tel:6039187593">Call 603-918-7593</a>
					<a class="npc-btn npc-btn--ghost" href="<?php echo esc_url(npc_guide_url($g['other'][1])); ?>">Get the <?php echo esc_html($g['other'][0]); ?></a>
					<a class="npc-link" href="<?php echo esc_url($home . '#valuation'); ?>">Free home valuation</a>
				</div>
			</div>
		</div>
	</section>
</div>
<?php include NPC_DIR . 'templates/footer.php';
