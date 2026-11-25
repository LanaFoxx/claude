<?php
/**
 * GLEC mega navigation: desktop hover panels with image cards + mobile drill-down.
 * Edit the menu in glec_mega_config(). Prices are read live from WooCommerce by SKU.
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

function glec_media_url( $slug ) {
	static $cache = [];
	if ( isset( $cache[ $slug ] ) ) { return $cache[ $slug ]; }
	$p = get_posts( [ 'post_type' => 'attachment', 'name' => $slug, 'posts_per_page' => 1, 'post_status' => 'inherit', 'fields' => 'ids' ] );
	return $cache[ $slug ] = $p ? wp_get_attachment_url( $p[0] ) : '';
}

function glec_sku_price( $sku ) {
	if ( ! function_exists( 'wc_get_product_id_by_sku' ) ) { return ''; }
	$id = wc_get_product_id_by_sku( $sku );
	$p  = $id ? wc_get_product( $id ) : null;
	return $p ? wp_strip_all_tags( wc_price( $p->get_price(), [ 'decimals' => 0 ] ) ) : '';
}

function glec_mega_config() {
	$h = home_url( '/' );
	$cfg = [
		[
			'id' => 'license', 'label' => 'License classes', 'url' => $h . 'license-classes/',
			'cards' => [
				[ 'title' => 'Residential Design Class', 'meta' => 'Required in both licenses', 'sku' => 'HLG-DD-R-OL', 'img' => 'thumb-study', 'url' => $h . 'license-classes/residential-design/' ],
				[ 'title' => 'Commercial Design Class', 'meta' => 'Non-Restricted only', 'sku' => 'HLG-DD-C-OL', 'img' => 'thumb-mentor', 'url' => $h . 'license-classes/commercial-design/' ],
				[ 'title' => 'Exam Prep Review Class', 'meta' => 'After Board approval', 'sku' => 'CA-OL', 'img' => 'thumb-exam', 'url' => $h . 'license-classes/exam-prep-review/' ],
			],
			'links' => [
				[ 'label' => 'Permanent Reference TABs', 'url' => $h . 'license-classes/reference-tabs/' ],
				[ 'label' => 'Application Overview Videos', 'url' => $h . 'license-classes/application-overview/' ],
				[ 'label' => 'Order the Reference Books', 'url' => 'https://sebookstore.com/glec.html', 'ext' => true ],
				[ 'label' => 'All license classes', 'url' => $h . 'license-classes/' ],
			],
		],
		[
			'id' => 'ceu', 'label' => 'CEU classes', 'url' => $h . 'ceu-classes/',
			'cards' => [
				[ 'title' => 'Board-approved CEUs', 'meta' => '4 hours a year, all online', 'img' => 'thumb-workshop', 'url' => $h . 'ceu-classes/' ],
				[ 'title' => 'Code Changes, IFGC & IMC', 'meta' => '2018, 2021 or 2024 · 4 hours · $50', 'img' => 'thumb-classroom', 'url' => $h . 'ceu-classes/' ],
			],
			'links' => [
				[ 'label' => 'Carrier System Design Manuals 1, 2, 3', 'url' => $h . 'ceu-classes/' ],
				[ 'label' => 'EPA Mold Remediation', 'url' => $h . 'ceu-classes/' ],
				[ 'label' => 'Wire Helix Trunk & Branch Duct Sizing', 'url' => $h . 'ceu-classes/' ],
				[ 'label' => 'Code changes: 2018, 2021, 2024', 'url' => $h . 'ceu-classes/' ],
				[ 'label' => 'Technician certifications', 'url' => $h . 'technician-certifications/' ],
				[ 'label' => 'All CEU classes', 'url' => $h . 'ceu-classes/' ],
			],
		],
		[
			'id' => 'steps', 'label' => 'How to get licensed', 'url' => $h . 'how-to-get-licensed/',
			'cards' => [
				[ 'title' => 'Check which license fits', 'meta' => 'Restricted or Non-Restricted', 'num' => '01', 'icon' => 'clip', 'url' => $h . 'how-to-get-licensed/' ],
				[ 'title' => 'Take the Design Classes', 'meta' => 'Then apply to the Board in GOALS', 'num' => '02', 'icon' => 'play', 'url' => $h . 'how-to-get-licensed/' ],
				[ 'title' => 'Prep for the exam and pass', 'meta' => 'Tab your books, schedule PSI', 'num' => '03', 'icon' => 'award', 'url' => $h . 'how-to-get-licensed/' ],
			],
			'links' => [
				[ 'label' => 'See the step-by-step process', 'url' => $h . 'how-to-get-licensed/' ],
				[ 'label' => 'Board application and meeting dates', 'url' => $h . 'board-application/' ],
				[ 'label' => 'Ask us a question', 'url' => $h . 'contact/' ],
			],
		],
		[
			'id' => 'about', 'label' => 'About', 'url' => $h . 'about/',
			'cards' => [
				[ 'title' => 'Garrison Michael', 'meta' => 'Owner and instructor since 2006', 'img' => 'thumb-garrison', 'url' => $h . 'about/' ],
				[ 'title' => 'Student stories', 'meta' => '82% exam pass rate', 'img' => 'thumb-classroom', 'url' => $h . 'testimonials/' ],
				[ 'title' => 'Years in business', 'meta' => 'Founded 2006 · 5,400+ student members', 'num' => '20', 'icon' => 'award', 'navy' => true, 'url' => $h . 'about/' ],
			],
			'links' => [
				[ 'label' => 'About GLEC', 'url' => $h . 'about/' ],
				[ 'label' => 'Policies', 'url' => $h . 'policies/' ],
				[ 'label' => 'Contact', 'url' => $h . 'contact/' ],
			],
		],
		[ 'id' => 'contact', 'label' => 'Contact', 'url' => $h . 'contact/' ],
	];
	return apply_filters( 'glec_mega_config', $cfg );
}

function glec_mega_icon( $name, $size = 24 ) {
	$p = [
		'clip'  => '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
		'play'  => '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
		'award' => '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
		'arrow' => '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
		'ext'   => '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
		'right' => '<path d="m9 18 6-6-6-6"/>',
		'left'  => '<path d="m15 18-6-6 6-6"/>',
		'down'  => '<path d="m6 9 6 6 6-6"/>',
	];
	return sprintf( '<svg width="%1$d" height="%1$d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">%2$s</svg>', $size, $p[ $name ] ?? '' );
}

function glec_mega_card( $c, $variant = 'card' ) {
	$meta = $c['meta'] ?? '';
	if ( ! empty( $c['sku'] ) && ( $price = glec_sku_price( $c['sku'] ) ) ) { $meta .= ' · ' . $price; }
	if ( ! empty( $c['num'] ) ) {
		$media = '<span class="gm-card__media gm-card__media--num' . ( ! empty( $c['navy'] ) ? ' gm-card__media--navy' : '' ) . '"><b>' . esc_html( $c['num'] ) . '</b>' . glec_mega_icon( $c['icon'] ?? 'arrow', 30 ) . '</span>';
	} else {
		$src   = glec_media_url( $c['img'] ?? '' );
		$media = '<span class="gm-card__media">' . ( $src ? '<img src="' . esc_url( $src ) . '" alt="" loading="lazy" decoding="async" width="720" height="450">' : '' ) . '</span>';
	}
	return '<li><a class="gm-card gm-card--' . esc_attr( $variant ) . '" href="' . esc_url( $c['url'] ) . '">' . $media
		. '<span class="gm-card__body"><span class="gm-card__title">' . esc_html( $c['title'] ) . '</span>'
		. '<span class="gm-card__meta">' . esc_html( $meta ) . '</span></span></a></li>';
}

function glec_mega_links( $links ) {
	$out = '';
	foreach ( $links as $l ) {
		$ext  = ! empty( $l['ext'] );
		$out .= '<li><a href="' . esc_url( $l['url'] ) . '"' . ( $ext ? ' target="_blank" rel="noopener"' : '' ) . '>' . esc_html( $l['label'] )
			. ( $ext ? '<span class="screen-reader-text"> (opens in a new tab)</span>' . glec_mega_icon( 'ext', 16 ) : '' ) . '</a></li>';
	}
	return $out;
}

/* Desktop: [glec_mega_nav] */
add_shortcode( 'glec_mega_nav', function () {
	$cfg   = glec_mega_config();
	$bar   = '';
	$panes = '';
	foreach ( $cfg as $item ) {
		if ( empty( $item['cards'] ) ) {
			$bar .= '<li><a class="gm__top" href="' . esc_url( $item['url'] ) . '">' . esc_html( $item['label'] ) . '</a></li>';
			continue;
		}
		$id    = 'gm-' . sanitize_key( $item['id'] );
		$bar  .= '<li><a class="gm__top gm__trigger" href="' . esc_url( $item['url'] ) . '" aria-expanded="false" aria-controls="' . esc_attr( $id ) . '" data-gm="' . esc_attr( $id ) . '">' . esc_html( $item['label'] ) . '</a></li>';
		$cards = '';
		foreach ( $item['cards'] as $c ) { $cards .= glec_mega_card( $c ); }
		$panes .= '<section class="gm__pane" id="' . esc_attr( $id ) . '" aria-label="' . esc_attr( $item['label'] ) . '" hidden>'
			. '<ul class="gm__cards gm__cards--' . count( $item['cards'] ) . '">' . $cards . '</ul>'
			. '<div class="gm__side"><ul class="gm__links">' . glec_mega_links( $item['links'] ?? [] ) . '</ul></div></section>';
	}
	return '<nav class="gm" aria-label="Main"><ul class="gm__bar">' . $bar . '</ul>'
		. '<div class="gm__panel"><div class="gm__inner">' . $panes . '</div></div><div class="gm__backdrop" aria-hidden="true"></div></nav>';
} );

/* Mobile: [glec_mobile_menu] with drill-down sub-panels (focus trap + Escape in glec.js / mega.js) */
remove_shortcode( 'glec_mobile_menu' );
add_shortcode( 'glec_mobile_menu', function () {
	$cfg   = glec_mega_config();
	$logo  = get_stylesheet_directory_uri() . '/assets/glec-logo.png';
	$phone = esc_html( get_option( 'glec_phone', '(470) 264-5134' ) );
	$start = esc_url( home_url( '/how-to-get-licensed/' ) );
	$root  = '';
	$subs  = '';
	foreach ( $cfg as $item ) {
		if ( empty( $item['cards'] ) ) {
			$root .= '<li><a class="glec-mm__item" href="' . esc_url( $item['url'] ) . '">' . esc_html( $item['label'] ) . '</a></li>';
			continue;
		}
		$id    = 'gmm-' . sanitize_key( $item['id'] );
		$root .= '<li><button type="button" class="glec-mm__item glec-mm__drill" data-gmm="' . esc_attr( $id ) . '" aria-controls="' . esc_attr( $id ) . '" aria-expanded="false">' . esc_html( $item['label'] ) . glec_mega_icon( 'right', 24 ) . '</button></li>';
		$cards = '';
		foreach ( $item['cards'] as $c ) { $cards .= glec_mega_card( $c, 'row' ); }
		$subs .= '<div class="glec-mm__sub" id="' . esc_attr( $id ) . '" hidden>'
			. '<button type="button" class="glec-mm__back">' . glec_mega_icon( 'left', 20 ) . 'Back</button>'
			. '<p class="glec-mm__subtitle">' . esc_html( $item['label'] ) . '</p>'
			. '<ul class="gm__cards gm__cards--mobile">' . $cards . '</ul>'
			. '<ul class="gm__links gm__links--mobile">' . glec_mega_links( $item['links'] ?? [] ) . '</ul></div>';
	}
	ob_start(); ?>
	<button type="button" class="glec-burger" aria-label="Open menu" aria-expanded="false" aria-controls="glec-mm"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
	<div id="glec-mm" class="glec-mm" role="dialog" aria-modal="true" aria-label="Menu" aria-hidden="true">
		<div class="glec-mm__top"><a href="<?php echo esc_url( home_url( '/' ) ); ?>"><img src="<?php echo esc_url( $logo ); ?>" alt="GLEC, Georgia License Exam Company"></a>
		<button type="button" class="glec-mm__close glec-burger-x" aria-label="Close menu" style="display:inline-flex"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
		<div class="glec-mm__stage">
			<div class="glec-mm__root">
				<nav aria-label="Main"><ul class="glec-mm__nav"><?php echo $root; // phpcs:ignore ?></ul></nav>
				<div class="glec-mm__small"><?php echo do_shortcode( '[glec_account_links]' ); ?></div>
				<div class="glec-mm__foot"><span><?php echo $phone; ?></span><a href="mailto:Info@GeorgiaLicenseExam.com">Info@GeorgiaLicenseExam.com</a><a class="glec-mm-btn" href="<?php echo $start; ?>">Start here</a></div>
			</div>
			<?php echo $subs; // phpcs:ignore ?>
		</div>
	</div>
	<?php return ob_get_clean();
} );
