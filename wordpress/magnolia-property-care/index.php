<?php
/**
 * Fallback template (posts, archives, 404).
 *
 * @package Magnolia
 */

get_header();
?>
<div class="mpc-default-content">
	<?php if ( have_posts() ) : ?>
		<?php
		while ( have_posts() ) :
			the_post();
			?>
			<article>
				<h1><?php is_singular() ? the_title() : printf( '<a href="%s">%s</a>', esc_url( get_permalink() ), esc_html( get_the_title() ) ); ?></h1>
				<?php is_singular() ? the_content() : the_excerpt(); ?>
			</article>
		<?php endwhile; ?>
	<?php else : ?>
		<h1>Page not found</h1>
		<p><a href="<?php echo esc_url( home_url( '/' ) ); ?>">Back to Home</a></p>
	<?php endif; ?>
</div>
<?php
get_footer();
