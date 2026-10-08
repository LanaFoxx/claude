<?php
/**
 * Pages built from the design render their content full width; any other page
 * gets a simple readable layout.
 *
 * @package Magnolia
 */

get_header();

while ( have_posts() ) :
	the_post();
	if ( get_post_meta( get_the_ID(), '_magnolia_screen', true ) ) :
		the_content();
	else :
		?>
		<article class="mpc-default-content">
			<h1><?php the_title(); ?></h1>
			<?php the_content(); ?>
		</article>
		<?php
	endif;
endwhile;

get_footer();
