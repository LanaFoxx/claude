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
	<?php echo npc_img('npc-rye-coast', 'full', ['class' => 'npc-hero__img', 'alt' => 'The Rye coastline from above', 'loading' => 'eager', 'fetchpriority' => 'high', 'sizes' => '100vw']); ?>
	<div class="npc-hero__veil" aria-hidden="true"></div>
	<div class="npc-wrap npc-hero__in">
		<p class="npc-eyebrow">Rye · Portsmouth · Hampton · The New Hampshire Seacoast</p>
		<h1 class="npc-hero__h1">Find your home on the New Hampshire Seacoast.</h1>
		<p class="npc-hero__lede">Nick Ponte is a Managing Broker at Carey &amp; Giampa Realtors, representing buyers and sellers from Rye to Portsmouth to Hampton Beach.</p>
		<div class="npc-actions">
			<a class="npc-btn npc-btn--lg" href="tel:6039187593">Call Nick</a>
			<a class="npc-btn npc-btn--ghost npc-btn--lg" href="sms:6039187593">Text me</a>
			<a class="npc-link" href="#contact">Free home valuation</a>
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
</div>

<section class="npc-band npc-about" id="about">
	<div class="npc-wrap npc-about__in">
		<div class="npc-portrait">
			<span class="npc-portrait__plate" aria-hidden="true"></span>
			<?php echo npc_img('npc-nick-ponte', 'full', ['class' => 'npc-portrait__img', 'alt' => 'Nick Ponte']); ?>
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

<section class="npc-wrap npc-section npc-quote">
	<p class="npc-quote__mark" aria-hidden="true">“</p>
	<blockquote>
		<p>I can't say enough about what a great job Nick did on our behalf. He knew that we really loved this house and worked tirelessly to ensure that our dream came true. Highly recommend Nick Ponte whether you are buying or selling.</p>
		<footer>Mark &amp; Vivian L.</footer>
	</blockquote>
</section>

<section class="npc-wrap npc-contact-wrap" id="contact">
	<div class="npc-contact">
		<?php echo npc_img('npc-portsmouth', 'large', ['class' => 'npc-contact__photo', 'alt' => '', 'aria-hidden' => 'true']); ?>
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
				<form class="npc-offmarket__form" data-post-id="295" data-form-id="bd8b8a8" data-queried-id="<?php echo (int) get_queried_object_id(); ?>" novalidate>
					<label class="npc-sr" for="npc-email">Email</label>
					<input id="npc-email" name="email" type="email" required placeholder="you@example.com" autocomplete="email">
					<button class="npc-btn" type="submit">Send</button>
					<p class="npc-offmarket__msg" role="status" aria-live="polite"></p>
				</form>
			</div>
		</div>
	</div>
</section>
<?php include NPC_DIR . 'templates/footer.php';
