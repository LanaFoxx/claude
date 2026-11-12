<?php
/** Coastal Light blog index (Market News). */
if (!defined('ABSPATH')) exit;
$npc_active = '';
$pid = (int) (is_page() ? get_queried_object_id() : get_option('page_for_posts'));
[$layout, $eyebrow, $title] = NPC_CONTENT_PAGES[627];
$intro = (string) get_post_meta(627, '_npc_page_intro', true);
$paged = max(1, (int) get_query_var('paged'), (int) get_query_var('page'));
$q = new WP_Query(['post_type' => 'post', 'post_status' => 'publish', 'posts_per_page' => 12, 'paged' => $paged, 'ignore_sticky_posts' => true]);
$home = npc_home_url();
include NPC_DIR . 'templates/header.php';
?>
<section class="npc-pagehero npc-pagehero--plain">
	<div class="npc-wrap">
		<nav class="npc-crumbs" aria-label="Breadcrumb"><a href="<?php echo esc_url($home); ?>">Home</a> / <span aria-current="page">Market news</span></nav>
		<p class="npc-eyebrow"><?php echo esc_html($eyebrow); ?></p>
		<h1 class="npc-split__h1"><?php echo wp_kses($title, ['b' => []]); ?></h1>
		<p class="npc-split__intro"><?php echo esc_html($intro ?: 'Market updates, home buying and selling tips, new listings and local news from the New Hampshire Seacoast.'); ?></p>
	</div>
</section>

<div class="npc-wrap">
	<?php if ($q->have_posts()) : ?>
		<div class="npc-bloggrid">
			<?php $i = 0; while ($q->have_posts()) : $q->the_post(); $i++; $feature = ($paged === 1 && $i === 1); ?>
				<a class="npc-blogcard<?php echo $feature ? ' is-feature' : ''; ?>" href="<?php the_permalink(); ?>">
					<span class="npc-blogcard__img"><?php echo has_post_thumbnail() ? get_the_post_thumbnail(null, $feature ? 'large' : 'medium_large', ['alt' => '']) : npc_post_fallback(get_the_ID(), 'medium_large'); ?></span>
					<span class="npc-blogcard__body">
						<span class="npc-blogcard__date"><?php echo esc_html(get_the_date('F j, Y')); ?></span>
						<span class="npc-blogcard__t"><?php the_title(); ?></span>
						<?php if ($feature) : ?><span class="npc-blogcard__ex"><?php echo esc_html(wp_trim_words(preg_replace('/^\s*By Nick Ponte[^.]*?Realtors\s*/i', '', get_the_excerpt()), 32, '…')); ?></span><?php endif; ?>
						<span class="npc-blogcard__go">Read article →</span>
					</span>
				</a>
			<?php endwhile; wp_reset_postdata(); ?>
		</div>
		<?php if ($q->max_num_pages > 1) : ?>
			<nav class="npc-pager" aria-label="More articles">
				<?php echo paginate_links(['base' => trailingslashit(get_permalink(627)) . 'page/%#%/', 'format' => '', 'current' => $paged, 'total' => $q->max_num_pages, 'prev_text' => '← Newer', 'next_text' => 'Older →', 'mid_size' => 1]); ?>
			</nav>
		<?php endif; ?>
	<?php endif; ?>
</div>
<?php include NPC_DIR . 'templates/footer.php';
