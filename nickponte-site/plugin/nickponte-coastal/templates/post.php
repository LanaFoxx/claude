<?php
/** Coastal Light blog post. */
if (!defined('ABSPATH')) exit;
$npc_active = '';
the_post();
$home = npc_home_url();
$blog = get_permalink(627);
$content = apply_filters('the_content', get_the_content());
// The article's own "By Nick Ponte ..." line and the rule under it are shown in the header instead.
$content = preg_replace('#^\s*<p[^>]*>\s*<strong>\s*By Nick Ponte[^<]*</strong>\s*</p>\s*(<hr[^>]*>)?#i', '', $content, 1);
include NPC_DIR . 'templates/header.php';
?>
<section class="npc-pagehero npc-posthero">
	<div class="npc-wrap npc-posthero__in">
		<nav class="npc-crumbs" aria-label="Breadcrumb"><a href="<?php echo esc_url($home); ?>">Home</a> / <a href="<?php echo esc_url($blog); ?>">Market news</a></nav>
		<p class="npc-eyebrow"><?php echo esc_html(get_the_date('F j, Y')); ?></p>
		<h1 class="npc-post__h1"><?php the_title(); ?></h1>
		<p class="npc-posthero__by">By Nick Ponte · Managing Broker, Carey &amp; Giampa Realtors</p>
	</div>
	<?php if (has_post_thumbnail()) : ?>
		<div class="npc-wrap"><div class="npc-posthero__img"><?php the_post_thumbnail('full', ['alt' => '', 'loading' => 'eager', 'fetchpriority' => 'high', 'sizes' => '(max-width: 1180px) 100vw, 1180px']); ?></div></div>
	<?php endif; ?>
</section>

<div class="npc-wrap">
	<div class="npc-layout">
		<article class="npc-article npc-article--post">
			<div class="npc-article__body"><?php echo $content; ?></div>
		</article>
		<?php echo npc_aside(); ?>
	</div>

	<?php $rel = get_posts(['post_type' => 'post', 'numberposts' => 3, 'post__not_in' => [get_the_ID()], 'post_status' => 'publish']); if ($rel) : ?>
		<section class="npc-section">
			<div class="npc-towns__head"><div><p class="npc-eyebrow">Keep reading</p><h2 class="npc-h2">More <b>market news</b></h2></div></div>
			<div class="npc-posts">
				<?php foreach ($rel as $r) : ?>
					<a class="npc-post" href="<?php echo esc_url(get_permalink($r)); ?>">
						<span class="npc-post__img"><?php echo has_post_thumbnail($r) ? get_the_post_thumbnail($r, 'medium_large', ['alt' => '']) : npc_post_fallback($r->ID, 'medium_large'); ?></span>
						<span class="npc-post__date"><?php echo esc_html(get_the_date('F j, Y', $r)); ?></span>
						<span class="npc-post__t"><?php echo esc_html(get_the_title($r)); ?></span>
					</a>
				<?php endforeach; ?>
			</div>
		</section>
	<?php endif; ?>
</div>
<?php include NPC_DIR . 'templates/footer.php';
