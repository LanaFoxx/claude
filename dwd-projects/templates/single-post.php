<?php
/**
 * Blog article, styled to match the Dream Web Digital site.
 * A theme can override this by adding single-post.php.
 */
defined( 'ABSPATH' ) || exit;

get_header();

while ( have_posts() ) :
	the_post();
	$cats     = get_the_category();
	$cat      = $cats ? $cats[0] : null;
	$blog_url = home_url( '/blog/' );
	?>
	<main id="content" class="dwb-single">
		<section class="dwb-hero dw-dots-dark">
			<div class="dwb-hero-inner">
				<nav class="dwb-crumbs" aria-label="Breadcrumb">
					<a href="<?php echo esc_url( $blog_url ); ?>">Blog</a>
					<?php if ( $cat ) : ?>
						<span>/</span><span><?php echo esc_html( $cat->name ); ?></span>
					<?php endif; ?>
				</nav>
				<h1 class="dwb-title"><?php the_title(); ?></h1>
				<div class="dwb-meta">
					By <a href="<?php echo esc_url( home_url( '/#about' ) ); ?>">Michael Tarr</a>
					<span>·</span><time datetime="<?php echo esc_attr( get_the_date( 'c' ) ); ?>"><?php echo esc_html( get_the_date() ); ?></time>
					<span>·</span><?php echo esc_html( dwdp_reading_time() ); ?> min read
				</div>
			</div>
		</section>

		<div class="dwb-body dw-dots-light">
			<?php if ( has_post_thumbnail() ) : ?>
				<figure class="dwb-feature"><?php the_post_thumbnail( 'full', array( 'loading' => 'eager', 'alt' => get_the_title() ) ); ?></figure>
			<?php endif; ?>

			<article class="dwb-article">
				<?php the_content(); ?>

				<aside class="dwb-author">
					<img src="<?php echo esc_url( content_url( '/uploads/2026/08/photo-michael.jpg' ) ); ?>" alt="Michael, founder of Dream Web Digital" loading="lazy" width="96" height="96">
					<div>
						<span class="dwb-author-k">Written by</span>
						<strong>Michael Tarr, founder of Dream Web Digital</strong>
						<p>Michael has been designing and building websites for 12+ years. He builds and hosts custom WordPress websites for small businesses and works with every client directly, from the first call through launch and after.</p>
						<a href="<?php echo esc_url( home_url( '/#about' ) ); ?>">More about Michael →</a>
					</div>
				</aside>
			</article>
		</div>

		<?php echo dwdp_cta_html( 'blog' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>

		<?php
		$related = get_posts( array( 'post_type' => 'post', 'post_status' => 'publish', 'posts_per_page' => 3, 'post__not_in' => array( get_the_ID() ) ) );
		if ( $related ) :
			?>
			<section class="dwb-related dw-dots-light">
				<div class="dwb-related-inner">
					<div class="dwb-eyebrow">Keep reading</div>
					<h2 class="dwb-related-title">More from the blog</h2>
					<div class="dwb-grid">
						<?php foreach ( $related as $p ) { echo dwdp_post_card( $p ); } // phpcs:ignore ?>
					</div>
				</div>
			</section>
		<?php endif; ?>
	</main>
	<?php
endwhile;

get_footer();
