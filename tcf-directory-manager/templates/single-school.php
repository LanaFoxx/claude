<?php
/** School page for a provider (see TCFD_School). Uses the theme's header and footer. */
defined('ABSPATH') || exit;
get_header();
echo TCFD_School::render((int) get_queried_object_id()); // phpcs:ignore WordPress.Security.EscapeOutput -- built from escaped data + plugin templates
get_footer();
