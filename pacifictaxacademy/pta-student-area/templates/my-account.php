<?php
/**
 * My Account wrapper. The student-area layout (shell.php) draws the menu, so this only prints
 * notices and the current tab.
 *
 * @package PTA_Student_Area
 */

defined('ABSPATH') || exit;
?>
<div class="woocommerce-MyAccount-content pta-sa-tab">
    <?php
    do_action('woocommerce_account_content'); // phpcs:ignore
    ?>
</div>
