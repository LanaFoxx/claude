<?php
defined( 'ABSPATH' ) || exit;

add_action( 'wp_enqueue_scripts', function () {
	// Same fonts as the rest of the site (Elementor only loads them on Elementor-built pages).
	wp_register_style( 'dwdp-fonts', 'https://fonts.googleapis.com/css2?family=Archivo:wght@700;900&family=Poppins:ital,wght@0,400;0,500;0,600;1,400&display=swap', array(), null );
	wp_register_style( 'dwdp-front', DWDP_URL . 'assets/front.css', array( 'dwdp-fonts' ), DWDP_VERSION );
	wp_register_script( 'dwdp-front', DWDP_URL . 'assets/front.js', array(), DWDP_VERSION, true );
	if ( is_singular( DWDP_CPT ) ) {
		wp_enqueue_style( 'dwdp-front' );
	}
} );

function dwdp_enqueue_front() {
	wp_enqueue_style( 'dwdp-front' );
	wp_enqueue_script( 'dwdp-front' );
}

/** Case-study pages use the plugin template (inside the site's header/footer). */
add_filter( 'template_include', function ( $template ) {
	if ( is_singular( DWDP_CPT ) ) {
		$theme = locate_template( array( 'single-' . DWDP_CPT . '.php' ) );
		return $theme ? $theme : DWDP_DIR . 'templates/single-project.php';
	}
	return $template;
} );

/**
 * /portfolio/<slug>/ belongs to projects, but keep any real child page of the
 * Portfolio page working if no project has that slug.
 */
add_filter( 'request', function ( $vars ) {
	if ( empty( $vars[ DWDP_CPT ] ) || ! empty( $vars['post_type'] ) && DWDP_CPT !== $vars['post_type'] ) {
		return $vars;
	}
	$slug  = $vars[ DWDP_CPT ];
	$found = get_posts(
		array(
			'post_type'      => DWDP_CPT,
			'name'           => $slug,
			'post_status'    => is_user_logged_in() ? 'any' : 'publish',
			'posts_per_page' => 1,
			'fields'         => 'ids',
		)
	);
	if ( $found ) {
		return $vars;
	}
	$path = dwdp_base_slug() . '/' . $slug;
	$page = get_page_by_path( $path );
	return ( $page && 'publish' === $page->post_status ) ? array( 'pagename' => $path ) : $vars;
} );

/** Browser-framed card used on the Portfolio page. */
function dwdp_card_html( $p ) {
	$label = dwdp_number( $p->ID ) . ' · ' . dwdp_get( $p->ID, 'industry' );
	$name  = get_the_title( $p );
	$img   = dwdp_img( dwdp_get( $p->ID, 'cover' ), $name . ' website', array( 'loading' => 'lazy' ) );
	return sprintf(
		'<a class="dw-pcard" href="%1$s"><span class="dw-pbar"><span class="dw-bdots"><i></i><i></i><i></i></span><span class="dw-pburl">%2$s</span></span><span class="dw-pshot">%3$s</span><span class="dw-pfoot"><span class="dw-pmeta"><b>%2$s</b><em>%4$s</em></span><span class="dw-pbtn">View project →</span></span></a>',
		esc_url( get_permalink( $p ) ),
		esc_html( $name ),
		$img,
		esc_html( $label )
	);
}

/** [dwd_portfolio] — grid of every published project. Optional: limit="4". */
add_shortcode( 'dwd_portfolio', function ( $atts ) {
	$atts     = shortcode_atts( array( 'limit' => 0 ), $atts );
	$projects = dwdp_projects();
	if ( $atts['limit'] ) {
		$projects = array_slice( $projects, 0, absint( $atts['limit'] ) );
	}
	if ( ! $projects ) {
		return '';
	}
	dwdp_enqueue_front();
	$out = '<div class="dw-pgrid dwdp-grid">';
	foreach ( $projects as $p ) {
		$out .= dwdp_card_html( $p );
	}
	return $out . '</div>';
} );

/**
 * [dwd_project_slider] — homepage showcase of every project's full hero (projects marked
 * "Show on homepage"). One design at a time; up/down buttons slide vertically between them.
 * Each hero links to its project. Use style="classic" for the older one-at-a-time slider.
 */
add_shortcode( 'dwd_project_slider', function ( $atts ) {
	$atts     = shortcode_atts( array( 'style' => 'vertical' ), $atts );
	$projects = dwdp_projects( true );
	if ( ! $projects ) {
		return '';
	}
	dwdp_enqueue_front();
	if ( 'classic' === $atts['style'] ) {
		return dwdp_classic_slider( $projects );
	}
	$items = '';
	$count = 0;
	$ratio = 0; // every design shares one frame, shaped to fit the tallest hero
	foreach ( $projects as $p ) {
		$hero = absint( dwdp_get( $p->ID, 'cover' ) );
		if ( ! $hero ) {
			continue;
		}
		$meta = wp_get_attachment_metadata( $hero );
		if ( ! empty( $meta['width'] ) && ! empty( $meta['height'] ) ) {
			$ratio = max( $ratio, $meta['height'] / $meta['width'] );
		}
		$items .= sprintf(
			'<a class="dwdp-vitem" href="%1$s" aria-label="%2$s">%3$s</a>',
			esc_url( get_permalink( $p ) ),
			esc_attr( 'View the ' . get_the_title( $p ) . ' project' ),
			dwdp_img( $hero, get_the_title( $p ) . ' website design', array( 'loading' => $count < 2 ? 'eager' : 'lazy' ) )
		);
		$count++;
	}
	if ( ! $count ) {
		return '';
	}
	$chev = '<svg viewBox="0 0 22 22" aria-hidden="true"><path d="%s"></path></svg>';
	return '<div class="dwdp-vslider">'
		. '<div class="dwdp-vnav">'
		. '<button type="button" class="dwdp-vbtn dwdp-up" aria-label="Previous design">' . sprintf( $chev, 'M4 14 L11 7 L18 14' ) . '</button>'
		. '<button type="button" class="dwdp-vbtn dwdp-down" aria-label="Next design">' . sprintf( $chev, 'M4 8 L11 15 L18 8' ) . '</button>'
		. '</div>'
		. '<div class="dwdp-vview" style="--dwdp-ratio:' . esc_attr( round( $ratio ? $ratio : 0.6, 4 ) ) . '"><div class="dwdp-vtrack">' . $items . '</div></div>'
		. '</div>';
} );

/** The original one-at-a-time browser slider. */
function dwdp_classic_slider( $projects ) {
	$imgs = '';
	foreach ( $projects as $i => $p ) {
		$cover = absint( dwdp_get( $p->ID, 'cover' ) );
		if ( ! $cover ) {
			continue;
		}
		$imgs .= sprintf(
			'<a href="%1$s" class="%2$s" data-url="%3$s" aria-label="%4$s">%5$s</a>',
			esc_url( get_permalink( $p ) ),
			'' === $imgs ? 'on' : '',
			esc_attr( dwdp_domain( $p->ID ) ),
			esc_attr( 'View the ' . get_the_title( $p ) . ' project' ),
			dwdp_img( $cover, get_the_title( $p ) . ' website', array( 'loading' => 0 === $i ? 'eager' : 'lazy' ) )
		);
	}
	if ( '' === $imgs ) {
		return '';
	}
	$arrow = '<svg style="width:20px;height:20px" viewBox="0 0 22 22"><path d="%s"></path></svg>';
	return '<div class="dw-slider dwdp-slider">'
		. '<div class="dw-snavcol">'
		. '<button type="button" class="dw-snav dw-prev" aria-label="Previous site">' . sprintf( $arrow, 'M14 4 L7 11 L14 18' ) . '</button>'
		. '<button type="button" class="dw-snav dw-next" aria-label="Next site">' . sprintf( $arrow, 'M8 4 L15 11 L8 18' ) . '</button>'
		. '</div>'
		. '<div class="dw-browser"><div class="dw-bscreen">' . $imgs . '</div></div>'
		. '</div>';
}

/** Shared "Yours could be next" call to action. */
function dwdp_cta_html() {
	$s     = dwdp_settings();
	$phone = trim( $s['cta_phone'] );
	$tel   = preg_replace( '/[^0-9+]/', '', $phone );
	ob_start();
	?>
	<section class="dwdp-cta dw-dots-dark">
		<div class="dwdp-cta-inner">
			<h2 class="dwdp-cta-title"><?php echo esc_html( $s['cta_title'] ); ?></h2>
			<p class="dwdp-cta-text"><?php echo esc_html( $s['cta_text'] ); ?></p>
			<div class="dwdp-cta-row">
				<a class="dwdp-btn" href="<?php echo esc_url( $s['cta_url'] ); ?>" target="_blank" rel="noopener"><?php echo esc_html( $s['cta_button'] ); ?></a>
				<?php if ( $phone ) : ?>
					<span class="dwdp-cta-call">or call <a href="tel:<?php echo esc_attr( $tel ); ?>"><?php echo esc_html( $phone ); ?></a></span>
				<?php endif; ?>
			</div>
		</div>
	</section>
	<?php
	return ob_get_clean();
}
add_shortcode( 'dwd_projects_cta', function () {
	dwdp_enqueue_front();
	return dwdp_cta_html();
} );
