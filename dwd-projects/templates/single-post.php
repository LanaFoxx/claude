<?php
/**
 * Blog article laid out like a site page rather than a wall of text: a split hero with buttons,
 * an "in this guide" strip, each H2 as its own section (lists become check cards, H3s become
 * card grids), a call-to-action band halfway down, recent work, links to the main pages and the
 * closing call to action. Built from the post's own content, so every post (and future ones)
 * gets the same layout.
 * A theme can override this by adding single-post.php.
 */
defined( 'ABSPATH' ) || exit;

get_header();

/** Split the post content into intro paragraphs and H2 sections. */
function dwdp_bp_parse( $html ) {
	$out = array( 'intro' => array(), 'sections' => array() );
	if ( '' === trim( $html ) ) {
		return $out;
	}
	$dom = new DOMDocument();
	libxml_use_internal_errors( true );
	$dom->loadHTML( '<?xml encoding="utf-8"?><div id="dwbp-root">' . $html . '</div>' );
	libxml_clear_errors();
	$root = $dom->getElementById( 'dwbp-root' );
	$cur  = null;
	foreach ( iterator_to_array( $root->childNodes ) as $n ) {
		if ( XML_ELEMENT_NODE !== $n->nodeType ) {
			continue;
		}
		if ( 'h2' === strtolower( $n->nodeName ) ) {
			if ( $cur ) {
				$out['sections'][] = $cur;
			}
			$cur = array( 'title' => trim( $n->textContent ), 'nodes' => array() );
			continue;
		}
		if ( $cur ) {
			$cur['nodes'][] = $n;
		} else {
			$out['intro'][] = $n;
		}
	}
	if ( $cur ) {
		$out['sections'][] = $cur;
	}
	return $out;
}

/** Outer HTML of a node, with the first mention of a few phrases linked to the matching page. */
function dwdp_bp_html( $node, &$linked ) {
	$links = array(
		'managed WordPress hosting' => '/hosting/',
		'onboarding form'           => '/onboarding/',
		'custom WordPress website'  => '/portfolio/',
		'web design process'        => '/process/',
	);
	$html = $node->ownerDocument->saveHTML( $node );
	foreach ( $links as $phrase => $url ) {
		if ( isset( $linked[ $phrase ] ) || false !== stripos( $html, 'href="' . $url ) ) {
			continue;
		}
		$re = '~(?<![\w/">])(' . preg_quote( $phrase, '~' ) . 's?)(?![^<]*</a>)~i';
		if ( preg_match( $re, $html ) ) {
			$html             = preg_replace( $re, '<a href="' . esc_url( home_url( $url ) ) . '">$1</a>', $html, 1 );
			$linked[ $phrase ] = true;
		}
	}
	return $html;
}

/** Render a section's body: paragraphs as they are, lists as check cards, H3 groups as cards. */
function dwdp_bp_body( $nodes, &$linked ) {
	$check = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11"/><path d="M7 12.5l3.2 3.2L17 9"/></svg>';
	$out   = '';
	$cards = '';
	$card  = null;
	$flush = function () use ( &$card, &$cards ) {
		if ( $card ) {
			$cards .= '<div class="dwbp-card"><h3>' . esc_html( $card['t'] ) . '</h3>' . $card['b'] . '</div>';
			$card   = null;
		}
	};
	foreach ( $nodes as $n ) {
		$tag = strtolower( $n->nodeName );
		if ( 'h3' === $tag ) {
			$flush();
			$card = array( 't' => trim( $n->textContent ), 'b' => '' );
			continue;
		}
		if ( 'ul' === $tag ) {
			$items = '';
			foreach ( $n->getElementsByTagName( 'li' ) as $li ) {
				$inner = '';
				foreach ( iterator_to_array( $li->childNodes ) as $c ) {
					$inner .= $li->ownerDocument->saveHTML( $c );
				}
				$items .= '<li>' . $check . '<span>' . $inner . '</span></li>';
			}
			$html = '<ul class="dwbp-checks">' . $items . '</ul>';
		} elseif ( 'ol' === $tag ) {
			$items = '';
			$i     = 0;
			foreach ( $n->getElementsByTagName( 'li' ) as $li ) {
				$inner = '';
				foreach ( iterator_to_array( $li->childNodes ) as $c ) {
					$inner .= $li->ownerDocument->saveHTML( $c );
				}
				$items .= '<li><b>' . sprintf( '%02d', ++$i ) . '</b><span>' . $inner . '</span></li>';
			}
			$html = '<ol class="dwbp-steps">' . $items . '</ol>';
		} else {
			$html = dwdp_bp_html( $n, $linked );
		}
		if ( $card ) {
			$card['b'] .= $html;
		} else {
			if ( $cards ) {
				$out  .= '<div class="dwbp-cards">' . $cards . '</div>';
				$cards = '';
			}
			$out .= $html;
		}
	}
	$flush();
	if ( $cards ) {
		$out .= '<div class="dwbp-cards">' . $cards . '</div>';
	}
	return $out;
}

/** Call-to-action wording that fits the article's topic. */
function dwdp_bp_cta( $slug ) {
	$zoom = dwdp_setting( 'cta_url' );
	$map  = array(
		'hosting'  => array( 'Want your hosting', 'handled for you?', 'Managed WordPress hosting for one flat yearly rate, with updates, backups, security and same-day support from me.', 'See hosting', '/hosting/' ),
		'seo'      => array( 'Planning a', 'website redesign?', 'I keep your URLs and SEO settings in place so the rankings you’ve earned carry over. Here’s how a project runs, step by step.', 'See the process', '/process/' ),
		'template' => array( 'See what custom', 'looks like.', 'Every site I build is designed from scratch around the business it’s for. Browse a few recent projects.', 'See my work', '/portfolio/' ),
		'cost'     => array( 'Want an exact', 'quote?', 'A short Zoom call is all it takes to get a clear quote and timeline for your website, with no obligation.', 'See the process', '/process/' ),
		'prepare'  => array( 'Ready to', 'get started?', 'The kickoff form walks you through everything I need, and you can upload your logo, photos and files as you go.', 'Start the kickoff form', '/onboarding/' ),
		'ai'       => array( 'Want a site AI tools', 'understand?', 'Clear structure, real answers and proper schema are built into every website I make.', 'See the process', '/process/' ),
	);
	$keys = array( 'hosting' => 'hosting', 'seo' => 'seo', 'redesign' => 'seo', 'template' => 'template', 'cost' => 'cost', 'prepare' => 'prepare', 'hiring' => 'prepare', 'ai-search' => 'ai' );
	$pick = array( 'Want help with', 'your website?', 'Tell me what you have in mind. A short Zoom call gets you a clear quote and timeline.', 'See my work', '/portfolio/' );
	foreach ( $keys as $k => $v ) {
		if ( false !== strpos( $slug, $k ) ) {
			$pick = $map[ $v ];
			break;
		}
	}
	return '<section class="dwbp-band dw-dots-dark"><div class="dwbp-band-in"><h2 class="dwdp-cta-title"><span style="font-weight:200">' . esc_html( $pick[0] ) . '</span><br><span style="font-weight:900;color:#4BA3DC">' . esc_html( $pick[1] ) . '</span></h2><p>' . esc_html( $pick[2] ) . '</p>'
		. '<div class="dwbp-btns"><a class="dwdp-btn" href="' . esc_url( $zoom ) . '" target="_blank" rel="noopener">Schedule a Zoom</a><a class="dwbp-ghost" href="' . esc_url( home_url( $pick[4] ) ) . '">' . esc_html( $pick[3] ) . ' →</a></div></div></section>';
}

while ( have_posts() ) :
	the_post();
	$cats     = get_the_category();
	$cat      = $cats ? $cats[0] : null;
	$blog_url = home_url( '/blog/' );
	$slug     = get_post_field( 'post_name' );
	$parts    = dwdp_bp_parse( apply_filters( 'the_content', get_the_content() ) );
	$linked   = array();
	$lead     = '';
	$more     = '';
	foreach ( $parts['intro'] as $i => $n ) {
		if ( 0 === $i && 'p' === strtolower( $n->nodeName ) ) {
			$lead = trim( $n->textContent );
		} else {
			$more .= dwdp_bp_html( $n, $linked );
		}
	}
	$sections = $parts['sections'];
	$mid      = $sections ? (int) floor( ( count( $sections ) - 1 ) / 2 ) : -1;
	$title    = get_the_title();
	?>
	<main id="content" class="dwb-single dwbp">
		<section class="dwbp-hero dw-dots-dark">
			<div class="dwbp-hero-in">
				<div class="dwbp-hero-text">
					<nav class="dw-badge dwbp-crumbs" aria-label="Breadcrumb">
						<a href="<?php echo esc_url( $blog_url ); ?>">Blog</a><?php if ( $cat ) : ?> · <?php echo esc_html( $cat->name ); ?><?php endif; ?>
					</nav>
					<h1 class="dwbp-title"><?php echo dwdp_two_tone( $title, '#4BA3DC' ); // phpcs:ignore WordPress.Security.EscapeOutput ?></h1>
					<?php if ( $lead ) : ?>
						<p class="dwbp-lead"><?php echo esc_html( $lead ); ?></p>
					<?php endif; ?>
					<div class="dwbp-btns">
						<a class="dwdp-btn" href="<?php echo esc_url( dwdp_setting( 'cta_url' ) ); ?>" target="_blank" rel="noopener">Schedule a Zoom</a>
						<a class="dwbp-ghost" href="<?php echo esc_url( home_url( '/portfolio/' ) ); ?>">See my work →</a>
					</div>
					<div class="dwbp-meta">By <a href="<?php echo esc_url( home_url( '/#about' ) ); ?>">Michael</a> · <?php echo esc_html( get_the_date() ); ?> · <?php echo esc_html( dwdp_reading_time() ); ?> min read</div>
				</div>
				<?php if ( has_post_thumbnail() ) : ?>
					<figure class="dwbp-hero-img"><?php the_post_thumbnail( 'large', array( 'loading' => 'eager', 'alt' => $title ) ); ?></figure>
				<?php endif; ?>
			</div>
		</section>

		<?php if ( $sections ) : ?>
			<section class="dwbp-toc">
				<div class="dwbp-in">
					<div class="dwbp-eyebrow">In this guide</div>
					<div class="dwbp-toc-grid">
						<?php foreach ( $sections as $i => $s ) : ?>
							<a href="#part-<?php echo (int) ( $i + 1 ); ?>"><b><?php echo esc_html( sprintf( '%02d', $i + 1 ) ); ?></b><span><?php echo esc_html( preg_replace( '/^\d+[\.\)]\s*/', '', $s['title'] ) ); ?></span></a>
						<?php endforeach; ?>
					</div>
					<?php if ( $more ) : ?>
						<div class="dwbp-intro"><?php echo $more; // phpcs:ignore WordPress.Security.EscapeOutput ?></div>
					<?php endif; ?>
				</div>
			</section>
		<?php endif; ?>

		<?php foreach ( $sections as $i => $s ) : ?>
			<section class="dwbp-sec <?php echo $i % 2 ? 'is-alt dw-dots-light' : ''; ?>" id="part-<?php echo (int) ( $i + 1 ); ?>">
				<div class="dwbp-in dwbp-split">
					<div class="dwbp-head">
						<span class="dwbp-num"><?php echo esc_html( sprintf( '%02d', $i + 1 ) ); ?></span>
						<h2><?php echo esc_html( preg_replace( '/^\d+[\.\)]\s*/', '', $s['title'] ) ); ?></h2>
					</div>
					<div class="dwbp-body"><?php echo dwdp_bp_body( $s['nodes'], $linked ); // phpcs:ignore WordPress.Security.EscapeOutput ?></div>
				</div>
			</section>
			<?php
			if ( $i === $mid && count( $sections ) > 2 ) {
				echo dwdp_bp_cta( $slug ); // phpcs:ignore WordPress.Security.EscapeOutput
			}
			?>
		<?php endforeach; ?>

		<?php if ( ! $sections ) : ?>
			<section class="dwbp-sec"><div class="dwbp-in"><div class="dwbp-body"><?php the_content(); ?></div></div></section>
		<?php endif; ?>

		<?php
		$work = array_slice( dwdp_projects(), 0, 3 );
		if ( $work ) :
			?>
			<section class="dwbp-work dw-dots-dark">
				<div class="dwbp-in">
					<div class="dwbp-eyebrow is-light">Recent work</div>
					<h2 class="dwdp-cta-title"><span style="font-weight:200">Websites I’ve</span> <span style="font-weight:900;color:#4BA3DC">built recently</span></h2>
					<div class="dwbp-work-grid dwdp-grid"><?php foreach ( $work as $p ) { echo dwdp_card_html( $p ); } // phpcs:ignore ?></div>
				</div>
			</section>
		<?php endif; ?>

		<section class="dwbp-explore">
			<div class="dwbp-in">
				<div class="dwbp-eyebrow">Explore</div>
				<div class="dwbp-links">
					<a href="<?php echo esc_url( home_url( '/portfolio/' ) ); ?>"><b>Portfolio</b><span>Custom websites I’ve designed and built for small businesses.</span><i>See my work →</i></a>
					<a href="<?php echo esc_url( home_url( '/process/' ) ); ?>"><b>Process</b><span>How your website gets built, from the first call to launch.</span><i>See the process →</i></a>
					<a href="<?php echo esc_url( home_url( '/hosting/' ) ); ?>"><b>Hosting</b><span>Managed WordPress hosting with updates, backups and support.</span><i>See hosting →</i></a>
					<a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>"><b>Contact</b><span>Tell me about your project and I’ll respond the same day.</span><i>Get in touch →</i></a>
				</div>
				<aside class="dwbp-author">
					<img src="<?php echo esc_url( content_url( '/uploads/2026/08/photo-michael.jpg' ) ); ?>" alt="Michael, founder of Dream Web Digital" loading="lazy" width="72" height="72">
					<p><strong>Written by Michael, founder of Dream Web Digital.</strong> I’ve designed and built websites for more than 12 years, and I work with every client directly, from the first call through launch and beyond. <a href="<?php echo esc_url( home_url( '/#about' ) ); ?>">More about Michael →</a></p>
				</aside>
			</div>
		</section>

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
