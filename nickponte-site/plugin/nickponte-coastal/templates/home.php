<?php
/** Coastal Light homepage (preview). */
if (!defined('ABSPATH')) exit;
$npc_active = 'home';
include NPC_DIR . 'templates/header.php';
$towns = array_map('npc_town_data', npc_towns());
$tiles = array_slice($towns, 0, 3);
$more = array_slice($towns, 3);
$updated = $towns ? $towns[0]['updated'] : date_i18n('F Y');
?>
<section class="npc-hero">
	<?php echo npc_img('npc-hero-hampton', 'full', ['class' => 'npc-hero__img', 'alt' => 'Hampton Beach, NH from above', 'loading' => 'eager', 'fetchpriority' => 'high', 'sizes' => '100vw']); ?>
	<div class="npc-hero__veil" aria-hidden="true"></div>
	<div class="npc-wrap npc-hero__in">
		<p class="npc-eyebrow">Rye · Portsmouth · Hampton · The New Hampshire Seacoast</p>
		<h1 class="npc-hero__h1">Find your home on the New Hampshire Seacoast.</h1>
		<p class="npc-hero__lede">Nick Ponte is a Managing Broker at Carey &amp; Giampa Realtors, representing buyers and sellers from Rye to Portsmouth to Hampton Beach.</p>
		<div class="npc-actions">
			<a class="npc-btn npc-btn--lg" href="tel:6039187593">Call Nick</a>
			<a class="npc-btn npc-btn--ghost npc-btn--lg" href="sms:6039187593">Text me</a>
			<a class="npc-link" href="#valuation">Free home valuation</a>
		</div>
	</div>
</section>

<div class="npc-wrap">
	<section class="npc-stats" aria-label="Nick Ponte by the numbers">
		<?php foreach ([['Five-star reviews', '32+', 'Verified on Google and Zillow'], ['Sold', '$110M+', 'Total transaction volume'], ['Properties', '60+', 'Active and sold'], ['Price range', '$150K–$18M', 'Condos to oceanfront estates']] as $s) : ?>
			<div class="npc-stats__cell">
				<p class="npc-label"><?php echo esc_html($s[0]); ?></p>
				<p class="npc-stats__v"><?php echo esc_html($s[1]); ?></p>
				<p class="npc-stats__c"><?php echo esc_html($s[2]); ?></p>
			</div>
		<?php endforeach; ?>
	</section>

	<section class="npc-section npc-towns">
		<div class="npc-towns__head">
			<div>
				<p class="npc-eyebrow">Town markets</p>
				<h2 class="npc-h2">Twelve Seacoast towns, one page each.</h2>
			</div>
			<p class="npc-towns__note">Median price, days on market and Nick's recent sales for every town, updated monthly. Last update: <?php echo esc_html($updated); ?>.</p>
		</div>
		<div class="npc-tiles">
			<?php foreach ($tiles as $t) : ?>
				<a class="npc-tile" href="<?php echo esc_url($t['url']); ?>">
					<?php echo npc_img($t['img'] ?: 'npc-rye-coast', 'large', ['class' => 'npc-tile__img', 'alt' => '', 'sizes' => '(max-width: 900px) 100vw, 380px']); ?>
					<span class="npc-tile__txt">
						<span class="npc-tile__name"><?php echo esc_html($t['name']); ?></span>
						<span class="npc-tile__tag"><?php echo esc_html($t['tag']); ?></span>
						<span class="npc-tile__row"><span>Median <?php echo esc_html(npc_short($t['median'])); ?></span><span>View market →</span></span>
					</span>
				</a>
			<?php endforeach; ?>
		</div>
		<?php if ($more) : ?>
			<div class="npc-more">
				<?php foreach ($more as $t) : ?>
					<a class="npc-more__row" href="<?php echo esc_url($t['url']); ?>">
						<span><span class="npc-more__name"><?php echo esc_html($t['name']); ?></span> <span class="npc-more__tag"><?php echo esc_html($t['tag']); ?></span></span>
						<span class="npc-more__price"><?php echo esc_html(npc_short($t['median'])); ?> →</span>
					</a>
				<?php endforeach; ?>
			</div>
		<?php endif; ?>
	</section>

	<section class="npc-section npc-res" id="resources">
		<div class="npc-towns__head">
			<div>
				<p class="npc-eyebrow">Resources</p>
				<h2 class="npc-h2">Guides and market news.</h2>
			</div>
			<a class="npc-link" href="<?php echo esc_url(home_url('/seacoast-nh-real-estate-blog/')); ?>">All market news →</a>
		</div>
		<div class="npc-res__guides">
			<a class="npc-guide" href="<?php echo esc_url(npc_guide_url('buyers-guide')); ?>">
				<span class="npc-label">For buyers</span>
				<span class="npc-guide__t">Buyer Guide</span>
				<span class="npc-guide__p">How buying on the Seacoast works, from pre-approval and offers to inspections and closing.</span>
				<span class="npc-guide__go">Read the Buyer Guide →</span>
			</a>
			<a class="npc-guide" href="<?php echo esc_url(npc_guide_url('sellers-guide')); ?>">
				<span class="npc-label">For sellers</span>
				<span class="npc-guide__t">Seller Guide</span>
				<span class="npc-guide__p">Pricing, preparing and marketing your home, and what to expect from listing to closing.</span>
				<span class="npc-guide__go">Read the Seller Guide →</span>
			</a>
		</div>
		<?php $posts = get_posts(['post_type' => 'post', 'post_status' => 'publish', 'numberposts' => 3]); if ($posts) : ?>
			<div class="npc-posts">
				<?php foreach ($posts as $post_item) : ?>
					<a class="npc-post" href="<?php echo esc_url(get_permalink($post_item)); ?>">
						<span class="npc-post__img"><?php echo has_post_thumbnail($post_item) ? get_the_post_thumbnail($post_item, 'medium_large', ['alt' => '']) : npc_img('npc-rye-coast', 'medium_large', ['alt' => '']); ?></span>
						<span class="npc-post__date"><?php echo esc_html(get_the_date('F j, Y', $post_item)); ?></span>
						<span class="npc-post__t"><?php echo esc_html(get_the_title($post_item)); ?></span>
					</a>
				<?php endforeach; ?>
			</div>
		<?php endif; ?>
	</section>
</div>

<section class="npc-band npc-about" id="about">
	<div class="npc-wrap npc-about__in">
		<div class="npc-portrait">
			<span class="npc-portrait__plate" aria-hidden="true"></span>
			<?php echo npc_img('npc-nick-ponte', 'full', ['class' => 'npc-portrait__img', 'alt' => 'Nick Ponte', 'loading' => 'eager']); ?>
		</div>
		<div>
			<p class="npc-eyebrow">About</p>
			<h2 class="npc-h2">Nick Ponte, Managing Broker</h2>
			<p class="npc-about__p1">Nick Ponte is a Managing Broker at Carey &amp; Giampa Realtors and one of the top-producing agents on the NH Seacoast. He joined the firm in 2014 and rose from agent to Associate Broker to Managing Broker.</p>
			<p class="npc-about__p2">Born and raised on the Seacoast, with a business and economics degree from Plymouth State University and a prior career as an IT analyst that drives a data-first approach to pricing. First-time buyers to $5M+ waterfront estates.</p>
			<div class="npc-about__stats">
				<?php foreach ([['12+', 'Years at the firm'], ['$10M+', 'Annual sales volume'], ['$3B+', 'Firm career volume']] as $s) : ?>
					<div><p class="npc-about__v"><?php echo esc_html($s[0]); ?></p><p class="npc-about__c"><?php echo esc_html($s[1]); ?></p></div>
				<?php endforeach; ?>
			</div>
			<div class="npc-actions">
				<a class="npc-btn" href="#contact">Work with Nick</a>
				<a class="npc-btn npc-btn--ghost" href="<?php echo esc_url(home_url('/featured-properties/')); ?>">Featured sales</a>
			</div>
		</div>
	</div>
</section>

<section class="npc-ocean">
	<?php echo npc_img('npc-387-ocean', 'full', ['class' => 'npc-ocean__img', 'alt' => 'Rendering of 387 Ocean, Hampton', 'sizes' => '100vw']); ?>
	<div class="npc-ocean__scrim" aria-hidden="true"></div>
	<div class="npc-wrap npc-ocean__in">
		<div class="npc-ocean__card">
			<p class="npc-eyebrow">Current project</p>
			<h2 class="npc-h2 npc-ocean__h">387 Ocean, Hampton</h2>
			<p>Two boutique luxury condominium buildings with ocean and marsh views, direct-entry elevators, floor-to-ceiling windows and premium modern finishes. Breaking ground this spring, from $1,500,000, with completion expected in late 2027.</p>
			<a class="npc-btn" href="http://www.387oceanboulevard.com" target="_blank" rel="noopener">Explore 387 Ocean →</a>
		</div>
	</div>
</section>

<?php
$quotes = [
	["I can't say enough about what a great job Nick did on our behalf. He knew that we really loved this house and worked tirelessly to ensure that our dream came true. Highly recommend Nick Ponte whether you are buying or selling.", 'Mark & Vivian L.'],
	['Nick was extremely helpful and honest about the home buying process. He made himself available to answer all of my questions and spent ample time getting to know me and the features I was looking for. I would recommend Nick to anyone looking to buy or sell their home.', 'Kathryn B.'],
	['Could not recommend Nick enough. He was a great broker and partner, keeping us up to speed on progress and guiding us through every step of the journey. Very professional, prompt and transparent.', 'Emily & Peter J.'],
];
?>
<section class="npc-quote" aria-roledescription="carousel" aria-label="Client reviews">
	<?php echo npc_img('npc-quote-rye', 'full', ['class' => 'npc-quote__img', 'alt' => '', 'aria-hidden' => 'true', 'sizes' => '100vw']); ?>
	<div class="npc-quote__veil" aria-hidden="true"></div>
	<div class="npc-wrap npc-quote__in">
		<p class="npc-quote__mark" aria-hidden="true">“</p>
		<div class="npc-quote__slides">
			<?php foreach ($quotes as $i => $q) : ?>
				<blockquote class="npc-quote__slide<?php echo $i === 0 ? ' is-on' : ''; ?>" aria-roledescription="slide" aria-label="<?php echo esc_attr(($i + 1) . ' of ' . count($quotes)); ?>" <?php if ($i) echo 'hidden'; ?>>
					<p><?php echo esc_html($q[0]); ?></p>
					<footer><?php echo esc_html($q[1]); ?></footer>
				</blockquote>
			<?php endforeach; ?>
		</div>
		<div class="npc-quote__nav">
			<?php foreach ($quotes as $i => $q) : ?>
				<button type="button" class="npc-quote__dot" aria-label="Show review <?php echo $i + 1; ?>" aria-current="<?php echo $i === 0 ? 'true' : 'false'; ?>"></button>
			<?php endforeach; ?>
		</div>
	</div>
</section>

<?php if (shortcode_exists('instagram-feed')) : ?>
	<section class="npc-wrap npc-section npc-insta">
		<div class="npc-towns__head">
			<div>
				<p class="npc-eyebrow">Instagram</p>
				<h2 class="npc-h2">On the Seacoast this week.</h2>
			</div>
		</div>
		<div class="npc-insta__feed"><?php echo do_shortcode('[instagram-feed feed=1 num=6 cols=6 colsmobile=3 showheader=false showbutton=false showfollow=true imagepadding=6]'); ?></div>
	</section>
<?php endif; ?>

<section class="npc-wrap npc-section" id="valuation">
	<div class="npc-val">
		<div class="npc-val__photo"><?php echo npc_img('npc-estate-dusk', 'large', ['alt' => 'Oceanfront home on the Seacoast at dusk', 'sizes' => '(max-width: 900px) 100vw, 560px']); ?></div>
		<div class="npc-val__body">
			<p class="npc-eyebrow">Free home valuation</p>
			<h2 class="npc-h2">What is your home worth?</h2>
			<p class="npc-val__p">Nick prepares a confidential valuation from recent comparable sales and your home's specifics, at no cost.</p>
			<?php /* Posts to the site's existing Elementor Pro valuation form (page 5644, form 4acdcf3): same email action as the live Home Valuation page. */ ?>
			<form class="npc-val__form npc-eform" data-post-id="5644" data-form-id="4acdcf3" data-queried-id="<?php echo (int) get_queried_object_id(); ?>" novalidate>
				<div class="npc-field npc-field--wide"><label for="npc-val-address">Property address</label><input id="npc-val-address" data-field="name" type="text" required autocomplete="street-address"></div>
				<div class="npc-field"><label for="npc-val-name">Full name</label><input id="npc-val-name" data-field="field_365fb37" type="text" required autocomplete="name"></div>
				<div class="npc-field"><label for="npc-val-email">Email</label><input id="npc-val-email" data-field="email" type="email" required autocomplete="email"></div>
				<div class="npc-field"><label for="npc-val-phone">Phone</label><input id="npc-val-phone" data-field="message" type="tel" required autocomplete="tel"></div>
				<div class="npc-field npc-field--btn"><button class="npc-btn npc-btn--lg" type="submit">Request my valuation</button></div>
				<p class="npc-eform__msg" role="status" aria-live="polite"></p>
			</form>
		</div>
	</div>
</section>

<section class="npc-wrap npc-contact-wrap" id="contact" style="padding-top:40px">
	<div class="npc-contact">
		<?php echo npc_img('npc-contact-seawall', 'large', ['class' => 'npc-contact__photo', 'alt' => '', 'aria-hidden' => 'true']); ?>
		<svg class="npc-contact__waves" viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true">
			<path d="M0 300 C 200 250, 400 350, 600 300 S 1000 250, 1200 300"/>
			<path d="M0 325 C 200 275, 400 375, 600 325 S 1000 275, 1200 325"/>
			<path d="M0 350 C 200 300, 400 400, 600 350 S 1000 300, 1200 350"/>
			<path d="M0 275 C 200 225, 400 325, 600 275 S 1000 225, 1200 275"/>
		</svg>
		<div class="npc-contact__in">
			<div>
				<p class="npc-eyebrow npc-eyebrow--light">Contact</p>
				<h2 class="npc-h2 npc-h2--light">We look forward to connecting.</h2>
				<p class="npc-contact__p">Whether you're looking to buy, sell, or relocate, Nick Ponte is here to deliver tailored support and professional expertise.</p>
				<dl class="npc-contact__dl">
					<div><dt>Email</dt><dd><a href="mailto:nponte@careyandgiampa.com">nponte@careyandgiampa.com</a></dd></div>
					<div><dt>Phone</dt><dd><a href="tel:6039187593">603-918-7593</a></dd></div>
					<div><dt>Office</dt><dd>655 Wallis Road, Rye, NH 03870</dd></div>
				</dl>
			</div>
			<div class="npc-offmarket">
				<h3>Off-market properties</h3>
				<p>Enter your email to find out about off-market properties before they reach the MLS.</p>
				<?php /* Posts to the site's existing Elementor Pro off-market form (footer template 295, form bd8b8a8): same email action and submissions log as the live site. */ ?>
				<form class="npc-offmarket__form npc-eform" data-post-id="295" data-form-id="bd8b8a8" data-queried-id="<?php echo (int) get_queried_object_id(); ?>" novalidate>
					<label class="npc-sr" for="npc-email">Email</label>
					<input id="npc-email" data-field="email" type="email" required placeholder="you@example.com" autocomplete="email">
					<button class="npc-btn" type="submit">Send</button>
					<p class="npc-eform__msg" role="status" aria-live="polite"></p>
				</form>
			</div>
		</div>
	</div>
</section>
<?php include NPC_DIR . 'templates/footer.php';
