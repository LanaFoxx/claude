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
	$yt       = dwdp_youtube_id( dwdp_get( $id, 'video' ) );
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
					<?php if ( $video ) : ?>
						<div class="dw-video">
							<span class="dw-video-k">Video walkthrough</span>
							<?php if ( $yt ) : ?>
								<?php // A clean cover with our own play button; YouTube's player (and its overlays) only loads once someone presses play. ?>
								<button type="button" class="dw-video-frame dw-yt" style="aspect-ratio:<?php echo esc_attr( round( dwdp_youtube_ratio( $yt ), 4 ) ); ?>" data-yt="<?php echo esc_attr( $yt ); ?>" aria-label="<?php echo esc_attr( 'Play the ' . $name . ' website walkthrough' ); ?>">
									<?php $vcover = dwdp_get( $id, 'video_cover' ); if ( ! $vcover && ( $ytt = absint( dwdp_get( $id, 'thumb_youtube' ) ) ) ) { $vcover = dwdp_original_url( $ytt ); } ?>
									<?php if ( $vcover ) : ?>
										<img src="<?php echo esc_url( $vcover ); ?>" alt="<?php echo esc_attr( $name . ' website on laptop and phone' ); ?>" loading="lazy">
									<?php else : ?>
										<img src="https://i.ytimg.com/vi/<?php echo esc_attr( $yt ); ?>/maxresdefault.jpg" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/<?php echo esc_attr( $yt ); ?>/hqdefault.jpg'" alt="" loading="lazy">
									<?php endif; ?>
									<span class="dw-yt-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></span>
								</button>
							<?php else : ?>
							<div class="dw-video-frame"><iframe src="<?php echo esc_url( $video ); ?>" title="<?php echo esc_attr( $name . ' website walkthrough' ); ?>" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>
							<?php endif; ?>
						</div>
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
					<?php $lbl = dwdp_get( $id, 'link_label' ); $lbl = $lbl ? $lbl : 'View the live website'; $lurl = dwdp_get( $id, 'url' ); ?>
					<?php if ( $lurl && '1' !== (string) dwdp_get( $id, 'hide_link' ) ) : ?>
						<a class="dwdp-btn dw-site-link" href="<?php echo esc_url( $lurl ); ?>" target="_blank" rel="noopener"><?php echo esc_html( $lbl ); ?> ↗</a>
					<?php endif; ?>
					<?php $upw = dwdp_get( $id, 'upwork_url' ); ?>
					<a class="dw-upwork-link" href="<?php echo esc_url( $upw ? $upw : 'https://www.upwork.com/freelancers/dreamwebdigital' ); ?>" target="_blank" rel="noopener me"><span class="dw-upwork-ic" aria-hidden="true"></span><?php echo $upw ? 'View this project on Upwork' : 'See my Upwork profile · Top Rated Plus'; ?> <span aria-hidden="true">↗</span></a>
					<a class="dwdp-btn" href="<?php echo esc_url( home_url( dwdp_setting( 'portfolio_url' ) ) ); ?>">&larr; Back to portfolio</a>
				</div>
				<div class="dwdp-right">
					<?php foreach ( $sections as $n => $img ) : ?>
						<div class="dw-shot"><?php echo dwdp_img( $img, sprintf( '%s website design, section %d', $name, $n + 1 ), array( 'loading' => $n ? 'lazy' : 'eager' ) ); ?></div>
					<?php endforeach; ?>
					<?php if ( $mockup ) : ?>
						<div class="dw-mob"><?php echo dwdp_img( $mockup, $name . ' website on mobile', array( 'loading' => 'lazy' ) ); ?></div>
					<?php endif; ?>
				</div>
			</div>
		</section>
		<?php
		$screens = dwdp_ids( dwdp_get( $id, 'mobile_screens' ) );
		if ( $screens ) :
			?>
			<section class="dw-app dw-dots-dark">
				<div class="dw-app-in">
					<div class="dw-app-text">
						<div class="dw-app-k">On the phone</div>
						<h2 class="dwdp-cta-title"><span style="font-weight:200"><?php echo esc_html( $name ); ?></span><br><span style="font-weight:900;color:#4BA3DC">in your pocket</span></h2>
						<p class="dw-app-p">Tap a screen to see it on the phone.</p>
						<div class="dw-app-tabs" role="tablist">
							<?php foreach ( $screens as $n => $sid ) : ?>
								<button type="button" role="tab" class="dw-app-tab<?php echo $n ? '' : ' is-on'; ?>" data-i="<?php echo (int) $n; ?>" aria-selected="<?php echo $n ? 'false' : 'true'; ?>"><?php echo esc_html( get_the_title( $sid ) ); ?></button>
							<?php endforeach; ?>
						</div>
					</div>
					<div class="dw-app-phone">
						<button type="button" class="dw-app-nav is-prev" aria-label="Previous screen">‹</button>
						<div class="dw-app-device"><span class="dw-app-island"></span><div class="dw-app-screen">
							<?php foreach ( $screens as $n => $sid ) : ?>
								<?php echo dwdp_img( $sid, $name . ' app: ' . get_the_title( $sid ), array( 'loading' => $n ? 'lazy' : 'eager', 'class' => $n ? '' : 'is-on', 'data-i' => $n ) ); // phpcs:ignore ?>
							<?php endforeach; ?>
						</div></div>
						<button type="button" class="dw-app-nav is-next" aria-label="Next screen">›</button>
					</div>
				</div>
			</section>
			<script>(function(){var s=document.querySelector('.dw-app');if(!s)return;var tabs=[].slice.call(s.querySelectorAll('.dw-app-tab')),imgs=[].slice.call(s.querySelectorAll('.dw-app-screen img')),cur=0;
			function show(i){cur=(i+imgs.length)%imgs.length;imgs.forEach(function(m,k){m.classList.toggle('is-on',k===cur);if(k===cur&&m.loading==='lazy')m.loading='eager';});tabs.forEach(function(t,k){t.classList.toggle('is-on',k===cur);t.setAttribute('aria-selected',k===cur);});var on=tabs[cur];if(on&&on.parentNode.scrollWidth>on.parentNode.clientWidth){on.parentNode.scrollTo({left:on.offsetLeft-on.parentNode.clientWidth/2+on.clientWidth/2,behavior:'smooth'});}var sc=s.querySelector('.dw-app-screen');sc.scrollTop=0;}
			tabs.forEach(function(t){t.addEventListener('click',function(){show(+t.dataset.i);});});
			s.querySelector('.is-prev').addEventListener('click',function(){show(cur-1);});s.querySelector('.is-next').addEventListener('click',function(){show(cur+1);});})();</script>
		<?php endif; ?>
		<?php echo dwdp_cta_html(); // phpcs:ignore WordPress.Security.EscapeOutput ?>
	</main>
	<?php
endwhile;

get_footer();
