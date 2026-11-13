<?php
/**
 * Full-page template for the Denninger Resolutions site: own header, content, own footer.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$o      = dr_opt();
$active = dr_active_nav();
$mark   = DR_SITE_URL . 'assets/img/logo-mark.png';
$markr  = DR_SITE_URL . 'assets/img/logo-mark-reversed.png';
$ico    = array(
	'phone' => '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',
	'mail'  => '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
);
$maps = 'https://maps.google.com/?q=' . rawurlencode( $o['address'] );
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="dr-skip" href="#dr-main">Skip to content</a>

<header class="dr-header">
	<div class="dr-hd-desktop">
		<div class="dr-utility">
			<div class="dr-utility-in">
				<a href="<?php echo esc_attr( dr_tel( $o['phone'] ) ); ?>"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DCE5DF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><?php echo $ico['phone']; // phpcs:ignore ?></svg><?php echo esc_html( $o['phone'] ); ?></a>
				<a href="mailto:<?php echo esc_attr( $o['public_email'] ); ?>"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DCE5DF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><?php echo $ico['mail']; // phpcs:ignore ?></svg><?php echo esc_html( $o['public_email'] ); ?></a>
			</div>
		</div>
		<div class="dr-wrap">
			<div class="dr-hd-row">
				<a class="dr-lockup" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="Denninger Resolutions, home">
					<img src="<?php echo esc_url( $mark ); ?>" alt="" width="68" height="40">
					<span class="dr-lockup-text"><span class="dr-wordmark">Denninger Resolutions</span><span class="dr-descriptor">Superior Court Trial Mediation</span></span>
				</a>
				<nav class="dr-nav" aria-label="Primary">
					<?php foreach ( dr_nav_items() as $n ) : ?>
						<a href="<?php echo esc_url( $n[2] ); ?>"<?php echo $active === $n[0] ? ' class="is-active" aria-current="page"' : ''; ?>><?php echo esc_html( $n[1] ); ?></a>
					<?php endforeach; ?>
					<a class="dr-btn dr-btn-primary dr-btn-sm" href="<?php echo esc_url( home_url( '/schedule/' ) ); ?>">Check available dates</a>
				</nav>
			</div>
		</div>
	</div>
	<div class="dr-hd-mobile">
		<a class="dr-lockup dr-lockup-sm" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="Denninger Resolutions, home">
			<img src="<?php echo esc_url( $mark ); ?>" alt="" width="58" height="34">
			<span class="dr-lockup-text"><span class="dr-wordmark">Denninger Resolutions</span><span class="dr-descriptor">Superior Court Trial Mediation</span></span>
		</a>
		<button type="button" class="dr-iconbtn" aria-label="Open menu" aria-controls="dr-menu" aria-expanded="false" data-dr-menu-open><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#24394A" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 12h16M4 6h16M4 18h16"/></svg></button>
	</div>
	<div class="dr-menu" id="dr-menu" role="dialog" aria-modal="true" aria-label="Menu" hidden>
		<div class="dr-menu-top">
			<span class="dr-menu-title">Denninger Resolutions</span>
			<button type="button" class="dr-iconbtn" aria-label="Close menu" data-dr-menu-close><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#24394A" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
		</div>
		<a class="dr-btn dr-btn-primary dr-btn-block" href="<?php echo esc_url( home_url( '/schedule/' ) ); ?>">Check available dates</a>
		<?php foreach ( dr_nav_items() as $n ) : ?>
			<a class="dr-menu-link" href="<?php echo esc_url( $n[2] ); ?>" data-dr-menu-link><?php echo esc_html( $n[1] ); ?></a>
		<?php endforeach; ?>
		<div class="dr-menu-contact">
			<span>Phone: <a href="<?php echo esc_attr( dr_tel( $o['phone'] ) ); ?>"><?php echo esc_html( $o['phone'] ); ?></a></span>
			<a href="mailto:<?php echo esc_attr( $o['public_email'] ); ?>"><?php echo esc_html( $o['public_email'] ); ?></a>
			<span><?php echo esc_html( $o['address'] ); ?></span>
		</div>
	</div>
</header>

<main id="dr-main" tabindex="-1">
<?php
if ( is_404() ) :
	?>
	<section style="background:#F7F5F0">
		<div class="dr-wrap" style="padding-top:clamp(56px,8vw,112px);padding-bottom:clamp(56px,8vw,112px);display:flex;flex-direction:column;gap:20px;max-width:760px;margin:0 auto">
			<p class="dr-eyebrow">Page not found</p>
			<h1 class="dr-h1">That page is not here.</h1>
			<p class="dr-lead">The link may be old, or the address may have a typo. These are the pages counsel use most.</p>
			<div style="display:flex;flex-wrap:wrap;gap:12px">
				<a class="dr-btn dr-btn-primary" href="<?php echo esc_url( home_url( '/schedule/' ) ); ?>">Check available dates</a>
				<a class="dr-btn dr-btn-secondary" href="<?php echo esc_url( home_url( '/' ) ); ?>">Go to the home page</a>
			</div>
		</div>
	</section>
	<?php
else :
	while ( have_posts() ) :
		the_post();
		the_content();
	endwhile;
endif;
?>
</main>

<footer class="dr-footer">
	<div class="dr-footer-in">
		<div class="dr-ft-row1">
			<a class="dr-lockup" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="Denninger Resolutions, home">
				<img src="<?php echo esc_url( $markr ); ?>" alt="" width="68" height="40">
				<span class="dr-lockup-text"><span class="dr-wordmark">Denninger Resolutions</span><?php if ( $o['credential'] ) : ?><span id="dr-credential"><?php echo esc_html( $o['credential'] ); ?></span><?php endif; ?></span>
			</a>
			<nav class="dr-ft-nav" aria-label="Footer">
				<a href="<?php echo esc_url( home_url( '/#about' ) ); ?>">About</a>
				<a href="<?php echo esc_url( home_url( '/schedule/' ) ); ?>">Schedule</a>
				<a href="<?php echo esc_url( home_url( '/mediation-center/' ) ); ?>">Mediation center</a>
				<a href="<?php echo esc_url( home_url( '/payments/' ) ); ?>">Payments</a>
				<a href="<?php echo esc_url( home_url( '/schedule/#kit' ) ); ?>">Paralegal kit</a>
			</nav>
		</div>
		<div class="dr-ft-row2">
			<div>
				<a href="<?php echo esc_url( $maps ); ?>" target="_blank" rel="noopener"><?php echo esc_html( $o['address'] ); ?></a>
				<a href="mailto:<?php echo esc_attr( $o['public_email'] ); ?>"><?php echo esc_html( $o['public_email'] ); ?></a>
				<a href="<?php echo esc_attr( dr_tel( $o['phone'] ) ); ?>"><?php echo esc_html( $o['phone'] ); ?></a>
			</div>
			<div>
				<a href="<?php echo esc_url( home_url( '/privacy-policy/' ) ); ?>">Privacy</a>
				<a href="<?php echo esc_url( home_url( '/terms/' ) ); ?>">Terms</a>
				<a href="<?php echo esc_url( home_url( '/accessibility/' ) ); ?>">Accessibility</a>
				<span>&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> Denninger Resolutions</span>
			</div>
		</div>
		<p class="dr-ft-note">I serve as a neutral: I do not represent any party or decide the case, and the conference is confidential and never recorded.</p>
	</div>
</footer>
<nav class="dr-bottombar" aria-label="Quick actions">
	<a class="dr-btn dr-btn-primary" href="<?php echo esc_url( home_url( '/schedule/' ) ); ?>">Check dates</a>
	<a class="dr-btn dr-btn-secondary" href="<?php echo esc_attr( dr_tel( $o['phone'] ) ); ?>"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#24394A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><?php echo $ico['phone']; // phpcs:ignore ?></svg>Call</a>
</nav>
<?php wp_footer(); ?>
</body>
</html>
