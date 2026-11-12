<?php
/** Coastal Light content page: About, Contact, Services, FAQ, resource pages, Privacy. */
if (!defined('ABSPATH')) exit;
$npc_active = '';
$pid = get_queried_object_id();
[$layout, $eyebrow, $title, $photo] = NPC_CONTENT_PAGES[$pid];
$intro = (string) get_post_meta($pid, '_npc_page_intro', true);
$form = (string) get_post_meta($pid, '_npc_page_form', true);
$home = npc_home_url();
include NPC_DIR . 'templates/header.php';
?>
<?php if ($layout === 'about') : ?>
	<section class="npc-band npc-about npc-about--page">
		<div class="npc-wrap npc-about__in">
			<div class="npc-portrait">
				<span class="npc-portrait__frame" aria-hidden="true"></span>
				<span class="npc-portrait__glow" aria-hidden="true"></span>
				<div class="npc-portrait__photo"><?php echo npc_img('npc-nick-ponte', 'full', ['class' => 'npc-portrait__img', 'alt' => 'Nick Ponte', 'loading' => 'eager', 'fetchpriority' => 'high']); ?></div>
				<div class="npc-portrait__badge">
					<span class="npc-portrait__badge-k">Managing Broker</span>
					<span class="npc-portrait__badge-v">Carey &amp; Giampa Realtors</span>
					<span class="npc-portrait__badge-row"><span><b>$110M+</b> sold</span><span><b>32+</b> five-star reviews</span></span>
				</div>
			</div>
			<div>
				<nav class="npc-crumbs" aria-label="Breadcrumb"><a href="<?php echo esc_url($home); ?>">Home</a> / <span aria-current="page">About</span></nav>
				<p class="npc-eyebrow"><?php echo esc_html($eyebrow); ?></p>
				<h1 class="npc-split__h1"><?php echo wp_kses($title, ['b' => []]); ?></h1>
				<?php if ($intro) : ?><p class="npc-split__intro"><?php echo nl2br(esc_html($intro)); ?></p><?php endif; ?>
				<div class="npc-about__stats">
					<?php foreach ([['12+', 'Years at the firm'], ['$10M+', 'Annual sales volume'], ['$3B+', 'Firm career volume']] as $s) : ?>
						<div><p class="npc-about__v"><?php echo esc_html($s[0]); ?></p><p class="npc-about__c"><?php echo esc_html($s[1]); ?></p></div>
					<?php endforeach; ?>
				</div>
				<div class="npc-actions">
					<a class="npc-btn npc-btn--lg" href="tel:6039187593">Call Nick</a>
					<a class="npc-btn npc-btn--ghost npc-btn--lg" href="<?php echo esc_url(npc_featured_url()); ?>">Featured sales</a>
				</div>
			</div>
		</div>
	</section>
<?php elseif ($layout === 'contact') : ?>
	<section class="npc-pagehero npc-pagehero--plain">
		<div class="npc-wrap">
			<nav class="npc-crumbs" aria-label="Breadcrumb"><a href="<?php echo esc_url($home); ?>">Home</a> / <span aria-current="page">Contact</span></nav>
			<p class="npc-eyebrow"><?php echo esc_html($eyebrow); ?></p>
			<h1 class="npc-split__h1"><?php echo wp_kses($title, ['b' => []]); ?></h1>
			<p class="npc-split__intro"><?php echo esc_html($intro ?: "Whether you're looking to buy, sell, or relocate, Nick Ponte is here to deliver tailored support and professional expertise."); ?></p>
		</div>
	</section>
<?php else : ?>
	<section class="npc-split<?php echo $photo ? '' : ' npc-split--plain'; ?>">
		<div class="npc-split__txt">
			<nav class="npc-crumbs" aria-label="Breadcrumb"><a href="<?php echo esc_url($home); ?>">Home</a> / <span aria-current="page"><?php echo esc_html(wp_strip_all_tags($title)); ?></span></nav>
			<p class="npc-eyebrow"><?php echo esc_html($eyebrow); ?></p>
			<h1 class="npc-split__h1"><?php echo wp_kses($title, ['b' => []]); ?></h1>
			<?php if ($intro) : ?><p class="npc-split__intro"><?php echo esc_html($intro); ?></p><?php endif; ?>
			<?php if ($layout !== 'legal') : ?>
				<div class="npc-actions">
					<a class="npc-btn npc-btn--lg" href="tel:6039187593">Call Nick</a>
					<a class="npc-btn npc-btn--ghost npc-btn--lg" href="<?php echo esc_url($home . '#valuation'); ?>">Free home valuation</a>
				</div>
			<?php endif; ?>
		</div>
		<?php if ($photo) : ?>
			<div class="npc-split__photo"><?php echo npc_img($photo, 'full', ['alt' => '', 'loading' => 'eager', 'fetchpriority' => 'high', 'sizes' => '(max-width: 920px) 100vw, 50vw']); ?></div>
		<?php endif; ?>
	</section>
<?php endif; ?>

<div class="npc-wrap">
	<?php if ($layout === 'contact') : ?>
		<section class="npc-contactpage">
			<ul class="npc-contactpage__cards">
				<li><span class="npc-contactpage__ic"><?php echo npc_icon('phone'); ?></span><span><b>Phone</b><a href="tel:6039187593">603-918-7593</a></span></li>
				<li><span class="npc-contactpage__ic"><?php echo npc_icon('mail'); ?></span><span><b>Email</b><a href="mailto:nponte@careyandgiampa.com">nponte@careyandgiampa.com</a></span></li>
				<li><span class="npc-contactpage__ic"><?php echo npc_icon('pin'); ?></span><span><b>Office</b>655 Wallis Road, Rye, NH 03870</span></li>
			</ul>
			<div class="npc-card npc-contactpage__form">
				<h2 class="npc-card__t">Send a message</h2>
				<p class="npc-muted">Nick usually replies the same day.</p>
				<?php echo npc_render_form($form, 'Send message', 'Thanks. Nick will be in touch soon.'); ?>
			</div>
		</section>
	<?php else : ?>
		<div class="npc-layout">
			<article class="npc-article npc-article--page">
				<div class="npc-article__body"><?php echo npc_content_body($pid); ?></div>
				<?php if ($form && $layout !== 'contact') : ?>
					<div class="npc-card npc-pageform">
						<h2 class="npc-card__t">Work with us</h2>
						<?php echo npc_render_form($form, 'Send', 'Thanks. Nick will be in touch soon.'); ?>
					</div>
				<?php endif; ?>
			</article>
			<?php if ($layout !== 'legal') echo npc_aside(); ?>
		</div>
	<?php endif; ?>
</div>

<?php if (!in_array($layout, ['legal', 'contact'], true)) : ?>
	<section class="npc-wrap npc-section npc-guidecta">
		<div class="npc-card npc-talk">
			<?php echo npc_img('npc-contact-seawall', 'large', ['class' => 'npc-talk__img', 'alt' => '', 'aria-hidden' => 'true']); ?>
			<div class="npc-talk__in">
				<h2 class="npc-card__t">We look forward to connecting.</h2>
				<p>Whether you're looking to buy, sell, or relocate, Nick Ponte is here to deliver tailored support and professional expertise.</p>
				<div class="npc-actions">
					<a class="npc-btn" href="tel:6039187593">Call 603-918-7593</a>
					<a class="npc-btn npc-btn--ghost" href="<?php echo esc_url(get_permalink(31)); ?>">Send a message</a>
				</div>
			</div>
		</div>
	</section>
<?php endif; ?>
<?php include NPC_DIR . 'templates/footer.php';
