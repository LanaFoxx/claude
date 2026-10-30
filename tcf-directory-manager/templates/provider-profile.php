<?php
/** Private provider profile form (see TCFD_Profile). Theme header/footer load the site runtime; the page hides them. */
defined('ABSPATH') || exit;
get_header();
echo '<main id="content" tabindex="-1" style="outline:none">'; // target of the theme's "Skip to content" link
echo TCFD_Profile::render(); // phpcs:ignore WordPress.Security.EscapeOutput -- plugin template + JSON-encoded data
echo '</main>';
get_footer();
