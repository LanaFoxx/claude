<?php
/**
 * Student-area page layout for every My Account page when logged in: left menu, slim top bar,
 * content, slim footer. Replaces the marketing header and footer.
 *
 * @package PTA_Student_Area
 */

defined('ABSPATH') || exit;

$pta_user = wp_get_current_user();
$pta_profile = PTA_SA_Student::profile($pta_user);
$pta_items = wc_get_account_menu_items();
$pta_is_dashboard = !is_wc_endpoint_url() || is_wc_endpoint_url('dashboard');
$pta_logo = PTA_SA_Account::logo_url();
$pta_phone = PTA_SA_Settings::get('phone');
$pta_tel = 'tel:' . preg_replace('/[^0-9+]/', '', $pta_phone);
$pta_years = $pta_is_dashboard ? PTA_SA_Account::model()['renewals'] : [];
$pta_selected_year = isset($_GET['year']) ? absint($_GET['year']) : (int) array_key_first($pta_years ?: [0 => 0]); // phpcs:ignore WordPress.Security.NonceVerification
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <?php wp_head(); ?>
</head>
<body <?php body_class('pta-sa-body'); ?>>
<?php wp_body_open(); ?>
<a class="pta-sa-skip" href="#pta-sa-content">Skip to content</a>
<div class="pta-sa">
    <aside class="pta-sa-side">
        <a class="pta-sa-logo" href="<?php echo esc_url(wc_get_account_endpoint_url('dashboard')); ?>" aria-label="Pacific Tax Academy dashboard">
            <?php if ($pta_logo) : ?>
                <img src="<?php echo esc_url($pta_logo); ?>" alt="Pacific Tax Academy" width="160" height="53">
            <?php else : ?>
                <span class="pta-sa-wordmark">Pacific Tax Academy</span>
            <?php endif; ?>
        </a>
        <nav class="pta-sa-nav" aria-label="Student menu">
            <?php foreach ($pta_items as $pta_endpoint => $pta_label) :
                $pta_active = wc_is_current_account_menu_item($pta_endpoint); ?>
                <a class="pta-sa-nav-link<?php echo $pta_active ? ' is-active' : ''; ?><?php echo $pta_endpoint === 'customer-logout' ? ' is-logout' : ''; ?>"
                   href="<?php echo esc_url(wc_get_account_endpoint_url($pta_endpoint)); ?>"<?php echo $pta_active ? ' aria-current="page"' : ''; ?>>
                    <?php echo esc_html($pta_label); ?>
                </a>
            <?php endforeach; ?>
        </nav>
        <div class="pta-sa-side-bottom">
            <?php if (count($pta_years) > 0) : ?>
                <p class="pta-sa-eyebrow">Renewal years</p>
                <div class="pta-sa-years">
                    <?php foreach ($pta_years as $pta_y) : ?>
                        <a class="pta-sa-year<?php echo $pta_y['year'] === $pta_selected_year ? ' is-active' : ''; ?>"
                           href="<?php echo esc_url(add_query_arg('year', $pta_y['year'], wc_get_account_endpoint_url('dashboard'))); ?>">
                            <span class="pta-sa-year-num"><?php echo esc_html($pta_y['year']); ?></span>
                            <span class="pta-sa-year-status <?php echo $pta_y['complete'] ? 'is-done' : 'is-progress'; ?>">
                                <?php echo $pta_y['complete'] ? 'Complete' : 'In progress'; ?>
                            </span>
                        </a>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
            <a class="pta-sa-browse" href="<?php echo esc_url(PTA_SA_Settings::url('browse_url')); ?>">Browse courses &rsaquo;</a>
            <p class="pta-sa-side-help">
                Need help? <a href="<?php echo esc_attr($pta_tel); ?>"><?php echo esc_html($pta_phone); ?></a><br>
                <?php echo esc_html(PTA_SA_Settings::get('hours')); ?>
            </p>
        </div>
    </aside>

    <div class="pta-sa-main">
        <header class="pta-sa-top">
            <p class="pta-sa-crumb"><?php echo esc_html(PTA_SA_Account::page_title()); ?></p>
            <div class="pta-sa-top-right">
                <details class="pta-sa-menu pta-sa-help-menu">
                    <summary>Help</summary>
                    <div class="pta-sa-menu-panel">
                        <a href="<?php echo esc_attr($pta_tel); ?>">Call <?php echo esc_html($pta_phone); ?></a>
                        <a href="mailto:<?php echo esc_attr(PTA_SA_Settings::get('email')); ?>">Email <?php echo esc_html(PTA_SA_Settings::get('email')); ?></a>
                        <span class="pta-sa-menu-note"><?php echo esc_html(PTA_SA_Settings::get('hours')); ?></span>
                        <a href="<?php echo esc_url(PTA_SA_Settings::url('questions_url')); ?>">Common questions</a>
                    </div>
                </details>
                <details class="pta-sa-menu pta-sa-account-menu">
                    <summary>
                        <span class="pta-sa-avatar" aria-hidden="true"><?php echo esc_html($pta_profile['initials']); ?></span>
                        <span class="pta-sa-who">
                            <?php echo esc_html($pta_profile['name']); ?>
                            <?php if ($pta_profile['ptin_masked']) : ?>
                                <span class="pta-sa-who-ptin">&middot; PTIN <?php echo esc_html($pta_profile['ptin_masked']); ?></span>
                            <?php endif; ?>
                        </span>
                    </summary>
                    <div class="pta-sa-menu-panel">
                        <a href="<?php echo esc_url(wc_get_account_endpoint_url('edit-account')); ?>">Account Settings</a>
                        <a href="<?php echo esc_url(wc_get_account_endpoint_url('orders')); ?>">Order History</a>
                        <a href="<?php echo esc_url(wc_logout_url()); ?>">Log out</a>
                    </div>
                </details>
            </div>
        </header>

        <?php if (PTA_SA_Student::is_preview()) : ?>
            <div class="pta-sa-preview">
                You're seeing sample data so you can review the design. Students only see their own courses.
                <a href="<?php echo esc_url(add_query_arg('pta_preview', '0', wc_get_page_permalink('myaccount'))); ?>">Turn off preview</a>
            </div>
        <?php endif; ?>

        <main class="pta-sa-content" id="pta-sa-content">
            <?php echo do_shortcode('[woocommerce_my_account]'); // phpcs:ignore WordPress.Security.EscapeOutput ?>
        </main>

        <footer class="pta-sa-foot">
            <span>&copy; <?php echo esc_html(wp_date('Y')); ?> Pacific Tax Academy</span>
            <nav aria-label="Policies">
                <a href="<?php echo esc_url(PTA_SA_Settings::url('refund_url')); ?>">Refund Policy</a>
                <a href="<?php echo esc_url(PTA_SA_Settings::url('terms_url')); ?>">Terms</a>
                <a href="<?php echo esc_url(PTA_SA_Settings::url('privacy_url')); ?>">Privacy</a>
            </nav>
        </footer>
    </div>
</div>
<?php wp_footer(); ?>
</body>
</html>
