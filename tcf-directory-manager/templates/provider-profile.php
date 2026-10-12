<?php
/** Private provider profile form (see TCFD_Profile). Theme header/footer load the site runtime; the page hides them. */
defined('ABSPATH') || exit;
get_header();
echo TCFD_Profile::render(); // phpcs:ignore WordPress.Security.EscapeOutput -- plugin template + JSON-encoded data
get_footer();
