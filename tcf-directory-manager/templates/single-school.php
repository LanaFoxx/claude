<?php
/** School page for a provider (see TCFD_School). Uses the theme's header and footer. */
defined('ABSPATH') || exit;
get_header();
echo '<main id="content" tabindex="-1" style="outline:none">'; // target of the theme's "Skip to content" link
echo TCFD_School::render((int) get_queried_object_id()); // phpcs:ignore WordPress.Security.EscapeOutput -- built from escaped data + plugin templates
echo '</main>';
get_footer();
