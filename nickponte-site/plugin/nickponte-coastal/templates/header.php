<?php
/** Preview header (used only by the Coastal Light preview templates). $npc_active: 'home' | 'town' */
if (!defined('ABSPATH')) exit;
$home = npc_home_url();
$tel = 'tel:6039187593';
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class('npc'); ?>>
<?php wp_body_open(); ?>
<a class="npc-skip" href="#npc-main">Skip to content</a>
<header class="npc-header">
	<div class="npc-wrap npc-header__in">
		<a class="npc-logo" href="<?php echo esc_url($home); ?>" aria-label="Nick Ponte Realty, home">
			<?php echo npc_img('npc-logo-navy', 'medium', ['alt' => 'Nick Ponte Realty', 'loading' => 'eager', 'class' => 'npc-logo__img']); ?>
		</a>
		<button type="button" class="npc-menubtn" aria-expanded="false" aria-controls="npc-nav" aria-label="Open menu"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path class="npc-menubtn__a" d="M4 8h16"/><path class="npc-menubtn__b" d="M4 16h16"/></svg></button>
		<nav class="npc-nav" id="npc-nav" aria-label="Main">
			<a href="<?php echo esc_url($home); ?>" <?php if ($npc_active === 'home') echo 'aria-current="page"'; ?>>Home</a>
			<a href="<?php echo esc_url(npc_default_town_url()); ?>" <?php if ($npc_active === 'town') echo 'aria-current="page"'; ?>>Towns</a>
			<a href="<?php echo esc_url($home . '#valuation'); ?>">Free Home Valuation</a>
			<a href="<?php echo esc_url(npc_live() ? get_permalink(25) : $home . '#about'); ?>" <?php if (npc_live() && is_page(25)) echo 'aria-current="page"'; ?>>About</a>
			<a class="npc-nav__extra" href="<?php echo esc_url(npc_featured_url()); ?>">Featured sales</a>
			<a class="npc-nav__extra" href="<?php echo esc_url(get_permalink(627)); ?>">Market news</a>
			<a class="npc-nav__extra" href="<?php echo esc_url(get_permalink(31)); ?>">Contact</a>
			<a class="npc-btn npc-btn--sm" href="<?php echo esc_url($tel); ?>">Call 603-918-7593</a>
		</nav>
	</div>
</header>
<main id="npc-main">
