<?php
/**
 * Local landing page ("Charlotte Web Design"). Uses the blog/project styles (dwbp-*) so it matches
 * the rest of the site. Content is written for local searchers and Google Ads visitors.
 */
defined( 'ABSPATH' ) || exit;

$L     = dwdp_local_current();
$city  = $L['city'];
$st    = $L['state'];
$zoom  = dwdp_setting( 'cta_url' );
$phone = dwdp_setting( 'cta_phone' );
$tel   = preg_replace( '/\D/', '', (string) $phone );
$hero  = absint( dwdp_get( 3877, 'thumb_upwork' ) );
$work  = array_slice( dwdp_projects(), 0, 3 );

$services = array(
	array( 'Custom website design', 'A website designed from scratch around your brand and your customers. No pre-made themes or recycled templates.' ),
	array( 'Website redesign', 'A modern rebuild of your current site that keeps your URLs and SEO settings, so your Google rankings carry over.' ),
	array( 'WordPress development', 'Fast, secure WordPress sites you can update yourself, with a one-on-one training session on Zoom after launch.' ),
	array( 'Managed WordPress hosting', 'Hosting, updates, backups, security and monitoring for one flat rate of $500 a year, with same-day support directly from me.' ),
	array( 'Built for Google', 'Mobile-friendly, fast-loading pages with clean SEO setup, so customers in ' . $city . ' can find you on Google.' ),
	array( 'Landing pages', 'Focused pages for your Google Ads and promotions, built to turn visitors into calls and form leads.' ),
);
$why = array(
	'You work directly with me, Michael, from the first call through launch. No sales team, no handoffs.',
	'5.0★ on Google, 100% Job Success and Top Rated Plus on Upwork.',
	'500+ websites built over 12+ years for small businesses, law firms, contractors, consultants and more.',
	'A flat quote up front, unlimited revisions and nothing goes live until you approve it.',
	'Same-day replies by phone, text or email.',
	'Two months of free support after launch and a lifetime workmanship warranty.',
);
$steps = array(
	array( 'Free call', 'We talk about your business, your goals and what your website needs to do. You get a flat quote and a clear plan.' ),
	array( 'Onboarding', 'One short form covers your branding, content and files, instead of a long email thread.' ),
	array( 'Design & build', 'I design your home page first. Once you approve it, I build each remaining page and you review every one.' ),
	array( 'Launch & training', 'We test everything on phones, tablets and desktops, launch together, and I train you to update your site.' ),
);
$faq = array(
	array( 'How much does a website cost in ' . $city . '?', 'Every website is custom, so I give you a flat quote after a short call, based on the pages and features you need. There is no hourly billing and no surprise invoices. My guide to <a href="' . esc_url( home_url( '/how-much-does-a-small-business-website-cost/' ) ) . '">what a small business website costs</a> explains what drives the price.' ),
	array( 'Do you work with businesses in ' . $city . ' and nearby towns?', 'Yes. I work with businesses across the ' . $city . ' area, including ' . implode( ', ', array_slice( $L['towns'], 0, 8 ) ) . ' and the rest of the region, as well as clients across the country.' ),
	array( 'How do we work together?', 'Projects run over Zoom, phone, text and email, so they are quick and easy to fit around your schedule. You always deal with me directly.' ),
	array( 'How long does a new website take?', 'It depends on the size of the site and how quickly content comes together. You get a clear timeline with your quote, and I reply the same day throughout the project.' ),
	array( 'Will a redesign hurt my Google rankings?', 'Not when it is done carefully. I keep your existing URLs and SEO settings (or redirect them properly), so the rankings you have built carry over to the new site.' ),
	array( 'Do you offer hosting and ongoing help?', 'Yes. Managed WordPress hosting is $500 a year and includes updates, backups, security, monitoring and same-day support. Every new site also includes two months of free support.' ),
);

get_header();
?>
<main id="content" class="dwbp dwlp">
	<section class="dwbp-hero dw-dots-dark">
		<div class="dwbp-hero-in">
			<div class="dwbp-hero-text">
				<div class="dwbp-eyebrow is-light"><?php echo esc_html( $city . ', ' . $st ); ?> · Web Designer</div>
				<h1 class="dwbp-title"><?php echo dwdp_two_tone( $city . ' Web Design', '#4BA3DC' ); // phpcs:ignore WordPress.Security.EscapeOutput ?></h1>
				<p class="dwbp-lead">Custom WordPress websites for <?php echo esc_html( $city ); ?> small businesses, designed and built by one experienced designer you work with directly. Websites that look great, load fast and bring in customers.</p>
				<div class="dwbp-btns">
					<a class="dwdp-btn" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">Get a free quote</a>
					<?php if ( $tel ) : ?><a class="dwbp-ghost" href="tel:+1<?php echo esc_attr( $tel ); ?>">Call <?php echo esc_html( $phone ); ?></a><?php endif; ?>
				</div>
				<div class="dwlp-proof"><span>★★★★★ 5.0 on Google</span><span>100% Job Success · Upwork</span><span>Top Rated Plus</span><span>500+ websites built</span></div>
			</div>
			<?php if ( $hero ) : ?>
				<figure class="dwbp-hero-img dwlp-hero-img"><?php echo wp_get_attachment_image( $hero, 'full', false, array( 'alt' => 'Custom website designed by Dream Web Digital, shown on a laptop and phone', 'loading' => 'eager', 'fetchpriority' => 'high', 'sizes' => '(max-width: 900px) 92vw, 560px' ) ); // phpcs:ignore ?></figure>
			<?php endif; ?>
		</div>
	</section>

	<section class="dwbp-sec dw-dots-light">
		<div class="dwbp-in dwbp-split">
			<div class="dwbp-head"><span class="dwbp-num">01</span><h2>A <?php echo esc_html( $city ); ?> web designer you can actually reach</h2></div>
			<div class="dwbp-body">
				<p>Hi, I’m Michael Tarr, the founder of Dream Web Digital. For more than 12 years I’ve designed and built custom websites for small businesses, and I work with every client one-on-one. When you call, you reach me. When you need a change, I make it.</p>
				<p>If your website looks dated, is hard to update, or simply isn’t bringing in calls and leads, I’ll build you a site that represents your business properly and is set up to be found on Google by customers in <?php echo esc_html( $city ); ?>.</p>
			</div>
		</div>
	</section>

	<section class="dwbp-sec">
		<div class="dwbp-in dwbp-split">
			<div class="dwbp-head"><span class="dwbp-num">02</span><h2>Web design services</h2></div>
			<div class="dwbp-body"><div class="dwbp-cards">
				<?php foreach ( $services as $s ) : ?>
					<div class="dwbp-card"><h3><?php echo esc_html( $s[0] ); ?></h3><p><?php echo esc_html( $s[1] ); ?></p></div>
				<?php endforeach; ?>
			</div></div>
		</div>
	</section>

	<?php if ( $work ) : ?>
	<section class="dwbp-work dw-dots-dark">
		<div class="dwbp-in">
			<div class="dwbp-eyebrow is-light">Recent work</div>
			<h2 class="dwbp-work-title">Websites I’ve built recently</h2>
			<div class="dwbp-work-grid dwdp-grid"><?php foreach ( $work as $p ) { echo dwdp_card_html( $p ); } // phpcs:ignore ?></div>
			<div class="dwbp-btns"><a class="dwdp-btn" href="<?php echo esc_url( home_url( '/portfolio/' ) ); ?>">See the full portfolio</a></div>
		</div>
	</section>
	<?php endif; ?>

	<section class="dwbp-sec dw-dots-light">
		<div class="dwbp-in dwbp-split">
			<div class="dwbp-head"><span class="dwbp-num">03</span><h2>Why <?php echo esc_html( $city ); ?> businesses choose me</h2></div>
			<div class="dwbp-body"><ul class="dwbp-checks">
				<?php foreach ( $why as $w ) : ?><li><?php echo esc_html( $w ); ?></li><?php endforeach; ?>
			</ul></div>
		</div>
	</section>

	<section class="dwbp-sec">
		<div class="dwbp-in dwbp-split">
			<div class="dwbp-head"><span class="dwbp-num">04</span><h2>How it works</h2></div>
			<div class="dwbp-body"><ol class="dwbp-steps">
				<?php foreach ( $steps as $i => $s ) : ?><li><b><?php echo esc_html( sprintf( '%02d', $i + 1 ) ); ?></b><span><strong><?php echo esc_html( $s[0] ); ?>.</strong> <?php echo esc_html( $s[1] ); ?></span></li><?php endforeach; ?>
			</ol><p><a href="<?php echo esc_url( home_url( '/process/' ) ); ?>">See the full process →</a></p></div>
		</div>
	</section>

	<section class="dwbp-sec dw-dots-light">
		<div class="dwbp-in dwbp-split">
			<div class="dwbp-head"><span class="dwbp-num">05</span><h2>Areas I serve</h2></div>
			<div class="dwbp-body">
				<p>Websites for businesses across <?php echo esc_html( $city ); ?> and the surrounding area, including:</p>
				<ul class="dwlp-areas">
					<?php foreach ( array_merge( array_map( function ( $h ) use ( $city ) { return $h . ', ' . $city; }, $L['hoods'] ), $L['towns'] ) as $a ) : ?><li><?php echo esc_html( $a ); ?></li><?php endforeach; ?>
				</ul>
			</div>
		</div>
	</section>

	<section class="dwbp-sec">
		<div class="dwbp-in dwbp-split">
			<div class="dwbp-head"><span class="dwbp-num">06</span><h2>Questions</h2></div>
			<div class="dwbp-body dwlp-faq">
				<?php foreach ( $faq as $f ) : ?>
					<details><summary><?php echo esc_html( $f[0] ); ?></summary><p><?php echo wp_kses_post( $f[1] ); ?></p></details>
				<?php endforeach; ?>
			</div>
		</div>
	</section>

	<section class="dwbp-band dw-dots-dark">
		<div class="dwbp-band-in">
			<h2 class="dwdp-cta-title"><span style="font-weight:200">Ready for a website</span><br><span style="font-weight:900;color:#4BA3DC">that brings in customers?</span></h2>
			<p>Tell me about your business and I’ll reply the same day with next steps and a flat quote.</p>
			<div class="dwbp-btns">
				<a class="dwdp-btn" href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">Get a free quote</a>
				<?php if ( $zoom ) : ?><a class="dwbp-ghost" href="<?php echo esc_url( $zoom ); ?>" target="_blank" rel="noopener">Schedule a Zoom</a><?php endif; ?>
				<?php if ( $tel ) : ?><a class="dwbp-ghost" href="tel:+1<?php echo esc_attr( $tel ); ?>">Call <?php echo esc_html( $phone ); ?></a><?php endif; ?>
			</div>
		</div>
	</section>
</main>
<?php
$areas = array_merge( array( $city . ', ' . $st ), $L['towns'] );
$schema = array(
	'@context' => 'https://schema.org',
	'@graph'   => array(
		array(
			'@type'       => 'Service',
			'@id'         => get_permalink() . '#service',
			'name'        => $city . ' Web Design',
			'serviceType' => 'Website design',
			'url'         => get_permalink(),
			'description' => $L['desc'],
			'provider'    => array( '@id' => trailingslashit( home_url() ) . '#organization' ),
			'areaServed'  => array_map( function ( $a ) { return array( '@type' => 'City', 'name' => $a ); }, $areas ),
		),
		array(
			'@type'      => 'FAQPage',
			'mainEntity' => array_map( function ( $f ) { return array( '@type' => 'Question', 'name' => $f[0], 'acceptedAnswer' => array( '@type' => 'Answer', 'text' => wp_strip_all_tags( $f[1] ) ) ); }, $faq ),
		),
	),
);
echo '<script type="application/ld+json">' . wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . '</script>'; // phpcs:ignore
get_footer();
