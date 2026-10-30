<?php
/**
 * Case-study page for a single project. Matches the existing project pages:
 * details on the left (sticky), section screenshots on the right, then the CTA band.
 * A theme can override this by adding single-dwd_project.php.
 */
defined( 'ABSPATH' ) || exit;

get_header();

while ( have_posts() ) :
	the_post();
	$id       = get_the_ID();
	$name     = get_the_title();
	$industry = dwdp_get( $id, 'industry' );
	$summary  = dwdp_get( $id, 'summary' );
	$together = dwdp_get( $id, 'together' );
	$review   = dwdp_get( $id, 'review' );
	$by       = dwdp_get( $id, 'review_by' );
	$sections = dwdp_ids( dwdp_get( $id, 'sections' ) );
	$mockup   = absint( dwdp_get( $id, 'mockup' ) );
	$video    = dwdp_video_embed( dwdp_get( $id, 'video' ) );
	$notes    = array(
		'Platform'   => dwdp_get( $id, 'platform' ),
		'Scope'      => dwdp_get( $id, 'scope' ),
		'Responsive' => dwdp_get( $id, 'responsive' ),
		'Aftercare'  => dwdp_get( $id, 'aftercare' ),
	);
	?>
	<main id="content" class="dwdp-single">
		<section class="dwdp-case dw-dots-light">
			<div class="dwdp-case-inner">
				<div class="dwdp-left dw-sticky">
					<div class="dwdp-eyebrow"><?php echo esc_html( dwdp_number( $id ) . ( $industry ? ' · ' . $industry : '' ) ); ?></div>
					<h1 class="dwdp-title"><?php echo esc_html( $name ); ?></h1>
					<?php if ( $summary ) : ?>
						<div class="dwdp-summary"><?php echo wpautop( esc_html( $summary ) ); ?></div>
					<?php endif; ?>
					<?php if ( $together ) : ?>
						<div class="dw-wt"><span>WORKING TOGETHER</span><?php echo wpautop( esc_html( $together ) ); ?></div>
					<?php endif; ?>
					<div class="dw-notes">
						<?php foreach ( $notes as $label => $value ) : ?>
							<?php if ( $value ) : ?>
								<div><span><?php echo esc_html( $label ); ?></span><span><?php echo esc_html( $value ); ?></span></div>
							<?php endif; ?>
						<?php endforeach; ?>
					</div>
					<?php if ( $review ) : ?>
						<div class="dw-review">
							<span class="dw-rl">CLIENT REVIEW</span>
							<span class="dw-stars"><i></i><i></i><i></i><i></i><i></i></span>
							<p>&ldquo;<?php echo esc_html( trim( $review, " \"“”" ) ); ?>&rdquo;</p>
							<span class="dw-rby">&mdash; <?php echo esc_html( $by ? $by : $name ); ?></span>
						</div>
					<?php endif; ?>
					<a class="dwdp-btn" href="<?php echo esc_url( home_url( dwdp_setting( 'portfolio_url' ) ) ); ?>">&larr; Back to portfolio</a>
				</div>
				<div class="dwdp-right">
					<?php if ( $video ) : ?>
						<div class="dw-video">
							<span class="dw-video-k">Video walkthrough</span>
							<div class="dw-video-frame"><iframe src="<?php echo esc_url( $video ); ?>" title="<?php echo esc_attr( $name . ' website walkthrough' ); ?>" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>
						</div>
					<?php endif; ?>
					<?php foreach ( $sections as $n => $img ) : ?>
						<div class="dw-shot"><?php echo dwdp_img( $img, sprintf( '%s website design, section %d', $name, $n + 1 ), array( 'loading' => $n ? 'lazy' : 'eager' ) ); ?></div>
					<?php endforeach; ?>
					<?php if ( $mockup ) : ?>
						<div class="dw-mob"><?php echo dwdp_img( $mockup, $name . ' website on mobile', array( 'loading' => 'lazy' ) ); ?></div>
					<?php endif; ?>
				</div>
			</div>
		</section>
		<?php echo dwdp_cta_html(); // phpcs:ignore WordPress.Security.EscapeOutput ?>
	</main>
	<?php
endwhile;

get_footer();
