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

/**
 * Dotted backgrounds only on the dark sections, so a dotted section never sits directly
 * against another one. The light sections (dw-dots-light, plus the Elementor sections that
 * got the same dots by ID) become plain.
 */
add_action( 'wp_head', function () {
	$ids = array( '9e67fb33', '89a6760f', '7d8e8aa3', '7f41de1b', '969108eb', '9ec54d3c', 'b8fbd2ba', '51ae0a9b', 'a5de6e96', '8fc7c8a7', 'c33bf56b', '28747d18', 'f5415e51', 'bbaddbd9', '8b5f9ec2', 'a1ecfee3', '96459fde' );
	$sel = array( 'html body .dw-dots-light' );
	foreach ( $ids as $id ) {
		$sel[] = 'html body .elementor-element-' . $id;
	}
	echo '<style id="dwdp-no-light-dots">' . implode( ',', $sel ) . '{background-image:none!important}'
		// Anything marked dark gets the white dots, even if an old rule lists it as a light section.
		. 'html body .dw-dots-dark.dw-dots-dark{background-image:radial-gradient(rgba(255,255,255,0.12) 1px,transparent 1px)!important;background-size:22px 22px!important}</style>' . "\n";
}, 99 );

/**
 * Tablet and small-laptop layout fixes for the Elementor header and homepage hero:
 * - 1025-1280px: tighter menu so it never wraps onto two lines; buttons never wrap.
 * - up to 1180px: the hero stacks, text centred on top and the laptop underneath at full width.
 */
add_action( 'wp_head', function () {
	echo '<style id="dwdp-tablet">'
		. '.elementor-location-header .elementor-button,.elementor-location-header .elementor-button-text{white-space:nowrap}'
		. '.elementor-location-header .elementor-menu-toggle{background:transparent!important;border:0!important}'
		. '@media(min-width:1025px) and (max-width:1280px){'
		. '.elementor-element-0df6828 .elementor-nav-menu{flex-wrap:nowrap!important}'
		. '.elementor-element-0df6828 .elementor-nav-menu .elementor-item{padding-left:11px!important;padding-right:11px!important;font-size:15.5px!important;white-space:nowrap}'
		. '.elementor-location-header .elementor-button{padding-left:18px!important;padding-right:18px!important}}'
		. '@media(min-width:768px) and (max-width:1180px){'
		. '.elementor-element-dw0000a{flex-direction:column!important;align-items:center!important;gap:46px!important}'
		. '.elementor-element-dw00007{width:100%!important;max-width:680px;align-items:center!important;text-align:center}'
		. '.elementor-element-dw00007 .elementor-heading-title,.elementor-element-dw00007 .elementor-widget-text-editor{text-align:center!important}'
		. '.elementor-element-dw00009{width:100%!important;max-width:860px}'
		. '.elementor-element-dw00009 .dwdp-laptop{width:90%}}'
		. '</style>' . "\n";
	// Reusable hero glow for dark sections (class "dw-glow" on an Elementor container).
	echo '<style id="dwdp-glow">.dw-glow{position:relative;overflow:hidden}.dw-glow::before{content:"";position:absolute;top:-180px;left:50%;transform:translateX(-50%);width:820px;max-width:120%;height:620px;background:radial-gradient(circle,rgba(27,126,195,.32),transparent 65%);pointer-events:none}.dw-glow>.e-con-inner,.dw-glow>.elementor-widget{position:relative;z-index:1}</style>' . "\n";
}, 99 );

/** The About page was retired; its content lives in the homepage "Why Dream Web" section. */
add_action( 'template_redirect', function () {
	$path = trim( (string) wp_parse_url( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '', PHP_URL_PATH ), '/' ); // phpcs:ignore
	if ( 'about' === $path ) {
		wp_safe_redirect( home_url( '/#about' ), 301 );
		exit;
	}
}, 1 );

/**
 * Buttons: all caps with wide letter spacing, for a more upscale feel. Covers Elementor
 * buttons and form submits plus the plugin's own buttons.
 */
add_action( 'wp_head', function () {
	// One button style everywhere: same thin uppercase type, same height, padding and minimum width.
	$btn = 'a.elementor-button,button.elementor-button,.elementor-button[type=submit],.dwdp-btn,.dwf-zoom,.dw-pbtn,.dw-form button';
	$txt = '.elementor-button .elementor-button-text,.elementor-button .elementor-button-content-wrapper';
	echo '<style id="dwdp-buttons">'
		. $btn . ',' . $txt . '{text-transform:uppercase!important;letter-spacing:.16em!important;font-family:Poppins,sans-serif!important;font-size:14px!important;font-weight:300!important;line-height:1.2!important}'
		. $btn . '{display:inline-flex!important;align-items:center;justify-content:center;box-sizing:border-box;height:52px!important;padding:0 32px!important;min-width:232px;border-radius:8px!important;white-space:nowrap}'
		. '@media(max-width:480px){' . $btn . '{min-width:0;padding:0 26px!important}}'
		// Shared closing band: dark, dots, glow, even spacing (class dw-cta-band on an Elementor container).
		. '.dw-cta-band{border-top:1px solid rgba(255,255,255,.07)}.dw-cta-band>.e-con-inner{gap:0!important}'
		. '.dw-cta-band>.e-con-inner>.elementor-widget-heading{margin-bottom:16px!important}.dw-cta-band>.e-con-inner>.elementor-widget-text-editor{margin-bottom:32px!important}.dw-cta-band .elementor-widget-text-editor p{margin:0}'
		. '</style>' . "\n";
}, 99 );

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

/** Project card used on the Portfolio page: the hero on a laptop with the phone view beside it, then name and industry. */
function dwdp_card_html( $p ) {
	$mock  = absint( dwdp_get( $p->ID, 'mockup' ) );
	$phone = $mock ? '<span class="dw-pphone">' . dwdp_img( $mock, get_the_title( $p ) . ' website on mobile', array( 'loading' => 'lazy' ) ) . '</span>' : '';
	$label = dwdp_number( $p->ID ) . ' · ' . dwdp_get( $p->ID, 'industry' );
	$name  = get_the_title( $p );
	$img   = dwdp_img( dwdp_get( $p->ID, 'cover' ), $name . ' website', array( 'loading' => 'lazy' ) );
	return sprintf(
		'<a class="dw-pcard" href="%1$s"><span class="dw-pshot"><span class="dwdp-laptop"><span class="dwdp-lid"><i class="dwdp-cam"></i><span class="dwdp-lscreen">%3$s</span></span><span class="dwdp-base"></span></span>%5$s</span><span class="dw-pfoot"><span class="dw-pmeta"><b>%2$s</b><em>%4$s</em></span><span class="dw-pbtn">View project →</span></span></a>',
		esc_url( get_permalink( $p ) ),
		esc_html( $name ),
		$img,
		esc_html( $label ),
		$phone
	);
}

/**
 * [dwd_portfolio] — grid of every published project. Optional: limit="4", and style="carousel"
 * for a sliding row (three cards on desktop, two on tablets, one on phones) with buttons above.
 */
add_shortcode( 'dwd_portfolio', function ( $atts ) {
	$atts     = shortcode_atts( array( 'limit' => 0, 'style' => 'grid' ), $atts );
	$projects = dwdp_projects();
	if ( $atts['limit'] ) {
		$projects = array_slice( $projects, 0, absint( $atts['limit'] ) );
	}
	if ( ! $projects ) {
		return '';
	}
	dwdp_enqueue_front();
	$cards = '';
	foreach ( $projects as $p ) {
		$cards .= dwdp_card_html( $p );
	}
	if ( 'carousel' !== $atts['style'] ) {
		return '<div class="dw-pgrid dwdp-grid">' . $cards . '</div>';
	}
	$arrow = '<svg viewBox="0 0 22 22" aria-hidden="true"><path d="%s"></path></svg>';
	return '<div class="dwdp-pcarousel">'
		. '<div class="dwdp-pnav">'
		. '<button type="button" class="dwdp-pbtn dwdp-prev" aria-label="Previous projects">' . sprintf( $arrow, 'M14 4 L7 11 L14 18' ) . '</button>'
		. '<button type="button" class="dwdp-pbtn dwdp-next" aria-label="Next projects">' . sprintf( $arrow, 'M8 4 L15 11 L8 18' ) . '</button>'
		. '</div>'
		. '<div class="dwdp-ptrack" tabindex="0" aria-label="Projects">' . $cards . '</div>'
		. '</div>';
} );

/**
 * [dwd_project_slider] — homepage showcase of every project's full hero (projects marked
 * "Show on homepage"). One design at a time; up/down buttons slide vertically between them.
 * Each hero links to its project. The heroes sit on a large laptop screen that runs off the
 * right edge of the section; use frame="none" for a plain screen, or style="classic" for the
 * older one-at-a-time slider.
 */
add_shortcode( 'dwd_project_slider', function ( $atts ) {
	$atts     = shortcode_atts( array( 'style' => 'vertical', 'frame' => 'laptop' ), $atts );
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
	foreach ( $projects as $p ) {
		$hero = absint( dwdp_get( $p->ID, 'cover' ) );
		if ( ! $hero ) {
			continue;
		}
		// One shared frame; each hero fills it from the top (short heroes lose a little of their
		// empty side margins, tall ones a sliver of their bottom edge).
		$lazy   = $count < 2 ? 'eager' : 'lazy';
		$items .= sprintf(
			'<a class="dwdp-vitem" href="%1$s" aria-label="%2$s">%3$s</a>',
			esc_url( get_permalink( $p ) ),
			esc_attr( 'View the ' . get_the_title( $p ) . ' project' ),
			dwdp_img( $hero, get_the_title( $p ) . ' website design', array( 'loading' => $lazy ) )
		);
		$count++;
	}
	if ( ! $count ) {
		return '';
	}
	$chev   = '<svg viewBox="0 0 22 22" aria-hidden="true"><path d="%s"></path></svg>';
	$screen = '<div class="dwdp-vview"><div class="dwdp-vtrack">' . $items . '</div></div>';
	if ( 'laptop' === $atts['frame'] ) {
		$screen = '<div class="dwdp-laptop"><div class="dwdp-lid"><i class="dwdp-cam"></i>' . $screen . '</div><div class="dwdp-base"></div></div>';
	}
	return '<div class="dwdp-vslider' . ( 'laptop' === $atts['frame'] ? ' is-laptop' : '' ) . '">'
		. '<div class="dwdp-vnav">'
		. '<button type="button" class="dwdp-vbtn dwdp-up" aria-label="Previous design">' . sprintf( $chev, 'M4 14 L11 7 L18 14' ) . '</button>'
		. '<button type="button" class="dwdp-vbtn dwdp-down" aria-label="Next design">' . sprintf( $chev, 'M4 8 L11 15 L18 8' ) . '</button>'
		. '</div>'
		. $screen
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
	<section class="dwdp-cta dw-dots-dark dw-glow">
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
