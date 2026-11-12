<?php
/** Preview footer (light variant). */
if (!defined('ABSPATH')) exit;
$home = npc_home_url();
?>
</main>
<footer class="npc-footer">
	<div class="npc-wrap">
		<div class="npc-footer__cols">
			<div>
				<?php echo npc_img('npc-logo-navy', 'medium', ['alt' => 'Nick Ponte Realty', 'class' => 'npc-footer__logo']); ?>
				<p class="npc-footer__tag">Your dream home is just a click away.</p>
			</div>
			<div>
				<h2 class="npc-footer__h">Explore</h2>
				<ul>
					<li><a href="<?php echo esc_url(npc_default_town_url()); ?>">Town markets</a></li>
					<li><a href="<?php echo esc_url($home . '#valuation'); ?>">Free home valuation</a></li>
					<li><a href="<?php echo esc_url($home . '#about'); ?>">About Nick</a></li>
					<li><a href="<?php echo esc_url(npc_featured_url()); ?>">Featured sales</a></li>
				</ul>
			</div>
			<div>
				<h2 class="npc-footer__h">Office</h2>
				<ul>
					<li>655 Wallis Road<br>Rye, NH 03870</li>
					<li><a href="tel:6039187593">603-918-7593</a></li>
					<li><a href="mailto:nponte@careyandgiampa.com">nponte@careyandgiampa.com</a></li>
				</ul>
			</div>
		</div>
		<div class="npc-footer__bar">
			<p>Nick Ponte Realty is the personal website of Nick Ponte, affiliated with Carey &amp; Giampa Realtors LLC. Carey &amp; Giampa does not own or operate this website. License: 069268 · NRDS ID: 600502199 · Office License: 060587</p>
			<p>© <?php echo esc_html(date_i18n('Y')); ?> Nick Ponte Realty · <a href="<?php echo esc_url(home_url('/privacy-policy/')); ?>">Privacy Policy</a></p>
		</div>
	</div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
