<?php
/** Preview footer (light variant). */
if (!defined('ABSPATH')) exit;
$home = npc_home_url();
?>
</main>
<footer class="npc-footer npc-footer--min">
	<div class="npc-wrap">
		<div class="npc-fmin__top">
			<a class="npc-fmin__logo" href="<?php echo esc_url($home); ?>" aria-label="Nick Ponte Realty, home"><?php echo npc_img('npc-logo-navy', 'medium', ['alt' => 'Nick Ponte Realty', 'class' => 'npc-footer__logo']); ?></a>
			<nav class="npc-fmin__nav" aria-label="Footer">
				<a href="<?php echo esc_url(npc_default_town_url()); ?>">Town markets</a>
				<a href="<?php echo esc_url(npc_featured_url()); ?>">Featured sales</a>
				<a href="<?php echo esc_url(npc_guide_url('buyers-guide')); ?>">Buyer Guide</a>
				<a href="<?php echo esc_url(npc_guide_url('sellers-guide')); ?>">Seller Guide</a>
				<a href="<?php echo esc_url(get_permalink(6182)); ?>">Cost to sell</a>
				<a href="<?php echo esc_url($home . '#valuation'); ?>">Home valuation</a>
				<a href="<?php echo esc_url(npc_live() ? get_permalink(25) : $home . '#about'); ?>">About</a>
			</nav>
		</div>
		<div class="npc-fmin__contact">
			<a href="tel:6039187593"><?php echo npc_icon('phone'); ?>603-918-7593</a>
			<a href="mailto:nponte@careyandgiampa.com"><?php echo npc_icon('mail'); ?>nponte@careyandgiampa.com</a>
			<span><?php echo npc_icon('pin'); ?>655 Wallis Road, Rye, NH 03870</span>
		</div>
		<div class="npc-fmin__legal">
			<p>Nick Ponte Realty is the personal website of Nick Ponte, affiliated with Carey &amp; Giampa Realtors LLC. Carey &amp; Giampa does not own or operate this website. License 069268 · NRDS ID 600502199 · Office License 060587</p>
			<p>© <?php echo esc_html(date_i18n('Y')); ?> Nick Ponte Realty · <a href="<?php echo esc_url(home_url('/privacy-policy/')); ?>">Privacy Policy</a></p>
		</div>
	</div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
